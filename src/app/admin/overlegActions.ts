"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { sendOverlegNotulen, siteBasis } from "@/lib/mail";
import { datumOver } from "@/lib/offertes";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import {
  eindeVan, leesActiepunt, leesAgendapunt, leesBezetting, leesMoment, leesRitme, nlNaarIso, notulenVan, volgendeDatum, type Aanwezige, type Ritme,
} from "@/lib/overleg";
import { haalCollegas, haalEenOverleg, inbrengerNaam } from "@/lib/overlegDb";

/**
 * CM-overleg (0053, 0054). Inbrengen van agendapunten en de eigen actiepunten
 * afvinken: iedereen met het recht overleg. De notulist van een overleg
 * schrijft de check-in, de notulen per punt en de actiepunten. Plannen, de
 * notulist kiezen, afronden en het ritme: het recht omzet. De database
 * controleert hetzelfde (de policies); dit geeft een nette melding.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Hoe lang een veld van de notulen mag zijn (de checks in 0054 en 0056). */
const MAX_NOTULEN = { punt: 8000, checkin: 2000, dossiers: 4000 } as const;
const terug = (q: string, anker = "") => `/admin/overleg?${q}${anker ? `#${anker}` : ""}`;
const foutSleutel = (error: { code?: string; message: string }) =>
  isMissingTable(error) ? "migratie-0054" : /dossiers/.test(error.message) && (error.code === "42703" || error.code === "PGRST204") ? "migratie-0056" : "opslaan";

export type ZetUitkomst = { ok: true } | { ok: false; fout: string };

function ververs() {
  revalidatePath("/admin/overleg", "layout");
  revalidatePath("/admin");
}

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

/** Een overleg op een tijdstip, met de vaste punten uit het ritme erin en het einde uit de duur. */
async function maakOverleg(sb: Sb, datum: string, tijd: string, eind: string | null, locatie: string | null) {
  const { data: r } = await sb.from("cm_ritme").select("*").maybeSingle();
  const ritme = r as (Ritme & { duur_minuten?: number }) | null;
  const { data, error } = await sb
    .from("cm_overleggen")
    .insert({ datum: nlNaarIso(datum, tijd), einde: eindeVan(datum, tijd, eind, ritme?.duur_minuten ?? 60), locatie })
    .select("id")
    .single();
  if (error) return { error, id: null };
  const id = (data as { id: string }).id;
  const vaste = (ritme?.vaste_punten || []).map((titel, i) => ({ overleg_id: id, titel, vast: true, sort: i + 1 }));
  if (vaste.length) await sb.from("cm_agendapunten").insert(vaste);
  await aanwezigenOvernemen(sb, id);
  return { error: null, id };
}

/**
 * Wie er bij het vorige overleg was, staat ook bij het nieuwe klaar (zoals de
 * opzet van het team de vaste namen al heeft): alleen collega's die nog bij het
 * overleg horen, zonder check-in en dossiers. De notulist kiest het beheer per
 * overleg opnieuw; gasten zonder inlog komen niet vanzelf mee.
 */
async function aanwezigenOvernemen(sb: Sb, id: string) {
  const { data: vorige } = await sb.from("cm_overleggen").select("id").neq("id", id).order("datum", { ascending: false }).limit(1);
  const vorigId = (vorige as { id: string }[] | null)?.[0]?.id;
  if (!vorigId) return;
  const [{ data: rijen }, collegas] = await Promise.all([
    sb.from("cm_aanwezigen").select("user_id, naam, sort").eq("overleg_id", vorigId).not("user_id", "is", null).order("sort"),
    haalCollegas(sb),
  ]);
  const nog = new Set(collegas.map((c) => c.user_id));
  const mee = ((rijen as { user_id: string; naam: string; sort: number }[] | null) || [])
    .filter((a) => nog.has(a.user_id))
    .map((a, i) => ({ overleg_id: id, user_id: a.user_id, naam: a.naam, sort: i + 1 }));
  if (mee.length) await sb.from("cm_aanwezigen").insert(mee);
}

/* ---------- plannen en afronden (omzet) ---------- */

export async function overlegPlannen(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const moment = leesMoment(formData);
  if ("fout" in moment) redirect(terug(`fout=${moment.fout}`, "volgend"));
  const { data: open } = await sb.from("cm_overleggen").select("id").is("afgerond_at", null).limit(1);
  if (open?.length) redirect(terug("fout=overleg-al-gepland", "volgend"));
  const { error } = await maakOverleg(sb, moment.datum, moment.tijd, moment.eind, moment.locatie);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "volgend"));
  ververs();
  redirect(terug("opgeslagen=overleg-gepland", "volgend"));
}

export async function overlegVerzetten(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  const moment = leesMoment(formData);
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  if ("fout" in moment) redirect(terug(`fout=${moment.fout}`, "volgend"));
  // Verzet: de herinnering gaat dan opnieuw.
  const { error } = await sb
    .from("cm_overleggen")
    .update({ datum: nlNaarIso(moment.datum, moment.tijd), einde: eindeVan(moment.datum, moment.tijd, moment.eind), locatie: moment.locatie, herinnerd_at: null })
    .eq("id", id)
    .is("afgerond_at", null);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "volgend"));
  ververs();
  redirect(terug("opgeslagen=overleg-verzet", "volgend"));
}

/**
 * Wie er bij is en wie notuleert. Het beheer kiest de notulist; de notulist
 * zelf houdt de aanwezigen bij. De check-in van wie blijft, blijft staan.
 */
export async function overlegBezetting(formData: FormData) {
  const { sb, admin } = await requirePerm("overleg");
  const beheer = admin.permissions.includes("omzet");
  const id = String(formData.get("id") || "");
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  const [{ data: o }, collegas, { data: oud }] = await Promise.all([
    sb.from("cm_overleggen").select("notulist, afgerond_at").eq("id", id).maybeSingle(),
    haalCollegas(sb),
    sb.from("cm_aanwezigen").select("*").eq("overleg_id", id),
  ]);
  if (!o || (o as { afgerond_at: string | null }).afgerond_at) redirect(terug("fout=overleg-gesloten", "volgend"));
  if (!beheer) formData.set("notulist", (o as { notulist: string | null }).notulist || "");
  const b = leesBezetting(formData, collegas);
  if ("fout" in b) redirect(terug(`fout=${b.fout}`, "volgend"));

  const bestaand = (oud as Aanwezige[] | null) || [];
  const sleutel = (a: { user_id: string | null; naam: string }) => a.user_id || `naam:${a.naam.toLowerCase()}`;
  const nieuwSet = new Map(b.aanwezig.map((a, i) => [sleutel(a), { ...a, sort: i + 1 }]));
  const weg = bestaand.filter((a) => !nieuwSet.has(sleutel(a))).map((a) => a.id);
  if (weg.length) {
    const { error } = await sb.from("cm_aanwezigen").delete().in("id", weg);
    if (error) redirect(terug(`fout=${/row-level security|policy/i.test(error.message) ? "overleg-geen-notulist" : foutSleutel(error)}`, "volgend"));
  }
  for (const a of bestaand.filter((x) => nieuwSet.has(sleutel(x)))) {
    const sort = nieuwSet.get(sleutel(a))!.sort;
    if (a.sort !== sort) await sb.from("cm_aanwezigen").update({ sort }).eq("id", a.id);
  }
  const erbij = [...nieuwSet.entries()].filter(([k]) => !bestaand.some((a) => sleutel(a) === k)).map(([, a]) => ({ overleg_id: id, user_id: a.user_id, naam: a.naam, sort: a.sort }));
  if (erbij.length) {
    const { error } = await sb.from("cm_aanwezigen").insert(erbij);
    if (error) redirect(terug(`fout=${/row-level security|policy/i.test(error.message) ? "overleg-geen-notulist" : foutSleutel(error)}`, "volgend"));
  }
  if (beheer) {
    const notulist = collegas.find((c) => c.user_id === b.notulist);
    const { error } = await sb.from("cm_overleggen").update({ notulist: notulist?.user_id ?? null, notulist_naam: notulist?.naam ?? null }).eq("id", id);
    if (error) redirect(terug(`fout=${foutSleutel(error)}`, "volgend"));
  }
  ververs();
  redirect(terug("opgeslagen=overleg-bezetting", "volgend"));
}

/**
 * De notulen in één keer bewaren: per agendapunt (punt:<id>) en per aanwezige
 * de check-in (checkin:<id>) en de dossiers (dossiers:<id>, sinds 0056). Alleen
 * de notulist van een lopend overleg of het beheer; de policies weigeren de
 * rest, en dan zegt de melding dat.
 */
export async function overlegNotulenBewaren(formData: FormData) {
  const { sb } = await requirePerm("overleg");
  const id = String(formData.get("id") || "");
  const naarArchief = formData.get("naar") === "archief";
  const terugNaar = (q: string) => (naarArchief ? `/admin/overleg/${id}?${q}` : terug(q, "notulen"));
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  let gezien = 0;
  let bewaard = 0;
  for (const [sleutel, waarde] of formData.entries()) {
    if (typeof waarde !== "string") continue;
    const [soort, rij] = sleutel.split(":");
    if (!UUID.test(rij || "") || (soort !== "punt" && soort !== "checkin" && soort !== "dossiers")) continue;
    const tekst = waarde.trim();
    if (tekst.length > MAX_NOTULEN[soort]) redirect(terugNaar("fout=overleg-te-lang"));
    gezien++;
    const { data, error } = soort === "punt"
      ? await sb.from("cm_agendapunten").update({ notulen: tekst || null }).eq("id", rij).eq("overleg_id", id).select("id")
      : await sb.from("cm_aanwezigen").update({ [soort]: tekst || null }).eq("id", rij).eq("overleg_id", id).select("id");
    if (error && foutSleutel(error) !== "opslaan") redirect(terugNaar(`fout=${foutSleutel(error)}`));
    if (data?.length) bewaard++;
  }
  if (gezien && !bewaard) redirect(terugNaar("fout=overleg-geen-notulist"));
  ververs();
  redirect(terugNaar("opgeslagen=overleg-notulen"));
}

/** De notulen per mail aan de aanwezigen met een inlog, met hun eigen actiepunten bovenaan. */
async function mailNotulen(sb: Sb, id: string): Promise<number> {
  const uit = await haalEenOverleg(sb, id);
  if (!uit.ok || !uit.data) return 0;
  const { overleg, agenda, acties, aanwezigen, collegas } = uit.data;
  const notulen = notulenVan(overleg, agenda, aanwezigen, acties, inbrengerNaam(collegas));
  const { contact, certificaten } = await offerteHuisstijl();
  const link = `${siteBasis()}/admin/overleg/${id}`;
  let verstuurd = 0;
  for (const a of aanwezigen) {
    const collega = a.user_id ? collegas.find((c) => c.user_id === a.user_id) : null;
    if (!collega) continue;
    const mijn = acties.filter((x) => x.wie === collega.user_id && !x.gedaan_at).map((x) => x.wat);
    const res = await sendOverlegNotulen({ to: collega.email, voornaam: collega.naam.split(" ")[0], notulen, mijnActies: mijn, link, contact, certificaten });
    if (res.ok) verstuurd++;
    else console.error("[overleg] notulen mailen mislukt:", collega.email, res.reden);
  }
  if (verstuurd) await sb.from("cm_overleggen").update({ gemaild_at: new Date().toISOString() }).eq("id", id);
  return verstuurd;
}

/**
 * Na afloop: het overleg gaat het archief in, het volgende wordt volgens het
 * ritme gepland (met de vaste punten), wat collega's inbrachten maar niet
 * besproken is schuift door (als "uit vorig overleg"), net als de punten voor
 * het volgende overleg, en de aanwezigen krijgen de notulen per mail.
 */
export async function overlegAfronden(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  const [{ data: o }, { data: r }] = await Promise.all([
    sb.from("cm_overleggen").select("datum, afgerond_at").eq("id", id).maybeSingle(),
    sb.from("cm_ritme").select("*").maybeSingle(),
  ]);
  if (!o || (o as { afgerond_at: string | null }).afgerond_at) redirect(terug("fout=opslaan"));
  const { error } = await sb.from("cm_overleggen").update({ afgerond_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`));
  const ritme = r as Ritme | null;
  if (ritme) {
    const volgende = volgendeDatum(ritme, datumOver(0), (o as { datum: string }).datum);
    const nieuw = await maakOverleg(sb, volgende.datum, volgende.tijd, null, ritme.locatie);
    if (nieuw.id) {
      // De punten voor het volgende overleg horen bij de notulen van dit overleg (zoals in het
      // format van het team): ze blijven hier staan en komen als kopie op de nieuwe agenda.
      const { data: volgend } = await sb.from("cm_agendapunten").select("titel, toelichting, door, door_email").eq("overleg_id", id).eq("voor_volgend", true);
      const kopieen = ((volgend as { titel: string; toelichting: string | null; door: string | null; door_email: string | null }[] | null) || [])
        .map((p) => ({ ...p, overleg_id: nieuw.id, doorgeschoven: true, voor_volgend: false, sort: 100 }));
      if (kopieen.length) await sb.from("cm_agendapunten").insert(kopieen);
      // Wat niet besproken en niet genotuleerd is, schuift zelf door.
      await sb
        .from("cm_agendapunten")
        .update({ overleg_id: nieuw.id, doorgeschoven: true })
        .eq("overleg_id", id)
        .eq("vast", false)
        .eq("voor_volgend", false)
        .eq("besproken", false)
        // Lege notulen bewaren we als null (overlegNotulenBewaren), dus null is: niets genoteerd.
        .is("notulen", null);
    }
  }
  const gemaild = await mailNotulen(sb, id);
  ververs();
  redirect(terug(`opgeslagen=${gemaild ? "overleg-afgerond" : "overleg-afgerond-geen-mail"}`));
}

export async function overlegVerwijderen(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  const { error } = await sb.from("cm_overleggen").delete().eq("id", id);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`));
  ververs();
  redirect(terug("opgeslagen=overleg-weg"));
}

export async function ritmeOpslaan(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const ritme = leesRitme(formData);
  if ("fout" in ritme) redirect(terug(`fout=${ritme.fout}`, "ritme"));
  const { error } = await sb.from("cm_ritme").update(ritme).eq("id", 1);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "ritme"));
  ververs();
  redirect(terug("opgeslagen=overleg-ritme", "ritme"));
}

/* ---------- agenda ---------- */

export async function agendapuntInbrengen(formData: FormData) {
  const { sb } = await requirePerm("overleg");
  const overleg = String(formData.get("overleg_id") || "");
  const punt = leesAgendapunt(formData);
  const voorVolgend = formData.get("voor_volgend") === "on";
  if (!UUID.test(overleg)) redirect(terug("fout=opslaan", "agenda"));
  if ("fout" in punt) redirect(terug(`fout=${punt.fout}`, "agenda"));
  const { error } = await sb.from("cm_agendapunten").insert({ overleg_id: overleg, ...punt, voor_volgend: voorVolgend, sort: 100 });
  if (error) redirect(terug(`fout=${/row-level security|policy/i.test(error.message) ? "overleg-gesloten" : foutSleutel(error)}`, "agenda"));
  ververs();
  redirect(terug(`opgeslagen=${voorVolgend ? "agendapunt-volgend" : "agendapunt"}`, voorVolgend ? "volgend-overleg" : "agenda"));
}

export async function agendapuntWeg(id: string) {
  const { sb } = await requireAdmin();
  if (!UUID.test(id)) redirect(terug("fout=opslaan", "agenda"));
  const { data, error } = await sb.from("cm_agendapunten").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(terug("fout=overleg-niet-van-jou", "agenda"));
  ververs();
  redirect(terug("opgeslagen=agendapunt-weg", "agenda"));
}

/** Tijdens het overleg een punt als besproken markeren: de notulist of het beheer. */
export async function agendapuntBesproken(id: string, besproken: boolean): Promise<ZetUitkomst> {
  const { sb } = await requirePerm("overleg");
  if (!UUID.test(id)) return { ok: false, fout: "Dat lukte niet." };
  const { data, error } = await sb.from("cm_agendapunten").update({ besproken }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, fout: "Alleen de notulist vinkt af wat besproken is." };
  ververs();
  return { ok: true };
}

/* ---------- actiepunten ---------- */

/** Een actiepunt maken: de notulist van dit overleg of het beheer. */
export async function actiepuntMaken(formData: FormData) {
  const { sb } = await requirePerm("overleg");
  const overleg = String(formData.get("overleg_id") || "");
  const actie = leesActiepunt(formData);
  if (!UUID.test(overleg)) redirect(terug("fout=opslaan", "acties"));
  if ("fout" in actie) redirect(terug(`fout=${actie.fout}`, "acties"));
  const collega = (await haalCollegas(sb)).find((c) => c.user_id === actie.wie);
  if (!collega) redirect(terug("fout=overleg-actie", "acties"));
  const { error } = await sb.from("cm_actiepunten").insert({ overleg_id: overleg, wat: actie.wat, wie: actie.wie, wie_naam: collega.naam, wanneer: actie.wanneer });
  if (error) redirect(terug(`fout=${/row-level security|policy/i.test(error.message) ? "overleg-geen-notulist" : foutSleutel(error)}`, "acties"));
  ververs();
  redirect(terug("opgeslagen=actiepunt", "acties"));
}

/** Gedaan of weer open: de eigen actiepunten, of alles met het recht omzet (cm_actiepunt_zetten in 0053). */
export async function actiepuntZetten(id: string, gedaan: boolean): Promise<ZetUitkomst> {
  const { sb } = await requireAdmin();
  if (!UUID.test(id)) return { ok: false, fout: "Dat lukte niet." };
  const { data, error } = await sb.rpc("cm_actiepunt_zetten", { actie: id, gedaan });
  if (error) return { ok: false, fout: "Dat lukte niet. Probeer het nog eens." };
  if (!data) return { ok: false, fout: "Alleen je eigen actiepunten vink je af." };
  ververs();
  return { ok: true };
}

export async function actiepuntWeg(id: string) {
  const { sb } = await requirePerm("overleg");
  if (!UUID.test(id)) redirect(terug("fout=opslaan", "acties"));
  const { data, error } = await sb.from("cm_actiepunten").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(terug("fout=overleg-geen-notulist", "acties"));
  ververs();
  redirect(terug("opgeslagen=actiepunt-weg", "acties"));
}
