"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { haalCollegas } from "@/lib/inwerkreisDb";
import { datumOver } from "@/lib/offertes";
import { leesActiepunt, leesAgendapunt, leesMoment, leesRitme, nlNaarIso, volgendeDatum, type Ritme } from "@/lib/overleg";

/**
 * CM-overleg (0053). Inbrengen van agendapunten en de eigen actiepunten
 * afvinken: iedereen met het recht overleg. Plannen, notulen, actiepunten
 * maken, afronden en het ritme: het recht omzet. De database controleert
 * hetzelfde (de policies); dit geeft een nette melding.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const terug = (q: string, anker = "") => `/admin/overleg?${q}${anker ? `#${anker}` : ""}`;
const foutSleutel = (error: { code?: string; message: string }) => (isMissingTable(error) ? "migratie-0053" : "opslaan");

export type ZetUitkomst = { ok: true } | { ok: false; fout: string };

function ververs() {
  revalidatePath("/admin/overleg", "layout");
  revalidatePath("/admin");
}

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

/** Een overleg op een tijdstip, met de vaste punten uit het ritme erin. */
async function maakOverleg(sb: Sb, datum: string, tijd: string, locatie: string | null) {
  const { data: r } = await sb.from("cm_ritme").select("vaste_punten").maybeSingle();
  const { data, error } = await sb.from("cm_overleggen").insert({ datum: nlNaarIso(datum, tijd), locatie }).select("id").single();
  if (error) return { error, id: null };
  const id = (data as { id: string }).id;
  const vaste = ((r as { vaste_punten?: string[] } | null)?.vaste_punten || []).map((titel, i) => ({ overleg_id: id, titel, vast: true, sort: i + 1 }));
  if (vaste.length) await sb.from("cm_agendapunten").insert(vaste);
  return { error: null, id };
}

/* ---------- plannen en afronden (omzet) ---------- */

export async function overlegPlannen(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const moment = leesMoment(formData);
  if ("fout" in moment) redirect(terug(`fout=${moment.fout}`, "volgend"));
  const { data: open } = await sb.from("cm_overleggen").select("id").is("afgerond_at", null).limit(1);
  if (open?.length) redirect(terug("fout=overleg-al-gepland", "volgend"));
  const { error } = await maakOverleg(sb, moment.datum, moment.tijd, moment.locatie);
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
  const { error } = await sb.from("cm_overleggen").update({ datum: nlNaarIso(moment.datum, moment.tijd), locatie: moment.locatie, herinnerd_at: null }).eq("id", id).is("afgerond_at", null);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "volgend"));
  ververs();
  redirect(terug("opgeslagen=overleg-verzet", "volgend"));
}

export async function overlegNotulen(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  const notulen = String(formData.get("notulen") || "").trim();
  const naar = String(formData.get("naar") || "");
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  if (notulen.length > 20000) redirect(terug("fout=overleg-te-lang", "notulen"));
  const { error } = await sb.from("cm_overleggen").update({ notulen: notulen || null }).eq("id", id);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "notulen"));
  ververs();
  redirect(naar === "archief" ? `/admin/overleg/${id}?opgeslagen=overleg-notulen` : terug("opgeslagen=overleg-notulen", "notulen"));
}

/**
 * Na afloop: het overleg gaat het archief in, het volgende wordt volgens het
 * ritme gepland (met de vaste punten), en wat collega's inbrachten maar niet
 * besproken is schuift door naar dat volgende overleg.
 */
export async function overlegAfronden(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect(terug("fout=opslaan"));
  const [{ data: o }, { data: r }] = await Promise.all([
    sb.from("cm_overleggen").select("datum, afgerond_at").eq("id", id).maybeSingle(),
    sb.from("cm_ritme").select("elke_weken, weekdag, tijd, locatie, vaste_punten").maybeSingle(),
  ]);
  if (!o || (o as { afgerond_at: string | null }).afgerond_at) redirect(terug("fout=opslaan"));
  const { error } = await sb.from("cm_overleggen").update({ afgerond_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`));
  const ritme = r as Ritme | null;
  if (ritme) {
    const volgende = volgendeDatum(ritme, datumOver(0), (o as { datum: string }).datum);
    const nieuw = await maakOverleg(sb, volgende.datum, volgende.tijd, ritme.locatie);
    if (nieuw.id) {
      await sb.from("cm_agendapunten").update({ overleg_id: nieuw.id }).eq("overleg_id", id).eq("vast", false).eq("besproken", false);
    }
  }
  ververs();
  redirect(terug("opgeslagen=overleg-afgerond"));
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
  if (!UUID.test(overleg)) redirect(terug("fout=opslaan", "agenda"));
  if ("fout" in punt) redirect(terug(`fout=${punt.fout}`, "agenda"));
  const { error } = await sb.from("cm_agendapunten").insert({ overleg_id: overleg, ...punt, sort: 100 });
  if (error) redirect(terug(`fout=${/row-level security|policy/i.test(error.message) ? "overleg-gesloten" : foutSleutel(error)}`, "agenda"));
  ververs();
  redirect(terug("opgeslagen=agendapunt", "agenda"));
}

export async function agendapuntWeg(id: string) {
  const { sb } = await requireAdmin();
  if (!UUID.test(id)) redirect(terug("fout=opslaan", "agenda"));
  const { data, error } = await sb.from("cm_agendapunten").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(terug("fout=overleg-niet-van-jou", "agenda"));
  ververs();
  redirect(terug("opgeslagen=agendapunt-weg", "agenda"));
}

/** Tijdens het overleg een punt als besproken markeren (beheer). */
export async function agendapuntBesproken(id: string, besproken: boolean): Promise<ZetUitkomst> {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) return { ok: false, fout: "Dat lukte niet." };
  const { data, error } = await sb.from("cm_agendapunten").update({ besproken }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, fout: "Dat lukte niet. Probeer het nog eens." };
  ververs();
  return { ok: true };
}

/* ---------- actiepunten ---------- */

export async function actiepuntMaken(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const overleg = String(formData.get("overleg_id") || "");
  const actie = leesActiepunt(formData);
  if (!UUID.test(overleg)) redirect(terug("fout=opslaan", "acties"));
  if ("fout" in actie) redirect(terug(`fout=${actie.fout}`, "acties"));
  const collega = (await haalCollegas(sb)).find((c) => c.user_id === actie.wie);
  if (!collega) redirect(terug("fout=overleg-actie", "acties"));
  const { error } = await sb.from("cm_actiepunten").insert({ overleg_id: overleg, wat: actie.wat, wie: actie.wie, wie_naam: collega.naam, wanneer: actie.wanneer });
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "acties"));
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
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect(terug("fout=opslaan", "acties"));
  const { error } = await sb.from("cm_actiepunten").delete().eq("id", id);
  if (error) redirect(terug(`fout=${foutSleutel(error)}`, "acties"));
  ververs();
  redirect(terug("opgeslagen=actiepunt-weg", "acties"));
}
