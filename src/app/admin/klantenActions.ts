"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/admin";
import {
  bedrijfSleutel, CHECKLIST, isDatum, isGesprekSoort, isKlantStatus, rijNaarVelden, statusInfo, statusUitRij, statusVerder, type Gesprek, type GesprekSoort,
  type ImportRij, type Klant, type KlantStatus,
} from "@/lib/klanten";

/*
 * Het klantenbord (migratie 0040): kaarten maken en wijzigen, verplaatsen,
 * gesprekken vastleggen en de klantlijst importeren. Alles achter het
 * salesrecht (`bellijst`), net als de bellijst, offertes en onboardings.
 *
 * Anders dan de meeste actions in dit beheer geven deze een resultaat terug in
 * plaats van een redirect: het bord is één scherm dat zichzelf bijwerkt zonder
 * te herladen (slepen, een gesprek erbij), dus de browser krijgt de nieuwe rij
 * en zet die meteen neer.
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type KlantResultaat = { ok: true; klant: Klant; gesprek?: Gesprek } | { ok: false; fout: string };
export type GesprekResultaat = { ok: true; gesprek: Gesprek | null; klant: Klant } | { ok: false; fout: string };
export type Resultaat = { ok: true } | { ok: false; fout: string };
export type ImportResultaat = { ok: true; nieuw: number; bijgewerkt: number; ongewijzigd: number; overgeslagen: number } | { ok: false; fout: string };

/** Wat je aan een kaart kunt invullen. Alles mag leeg, behalve de bedrijfsnaam bij een nieuwe kaart. */
export type KlantInvoer = {
  bedrijf?: string;
  status?: string;
  contactpersoon?: string | null;
  email?: string | null;
  telefoon?: string | null;
  eigenaar?: string | null;
  bron?: string | null;
  startdatum?: string | null;
  stand?: string | null;
  volgende_actie?: string | null;
  volgende_actie_op?: string | null;
  notitie?: string | null;
  offerte_retour?: boolean;
  contract_retour?: boolean;
  formulieren_retour?: boolean;
  koppeling?: boolean;
  facturatie?: boolean;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const tekst = (w: unknown, max: number): string | null => {
  const t = String(w ?? "").trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};
const meerregelig = (w: unknown, max: number): string | null => {
  const t = String(w ?? "").trim();
  return t ? t.slice(0, max) : null;
};

function foutUit(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Opslaan mislukt.";
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") return "Het klantenbord staat nog niet (helemaal) aan: migraties 0040 en 0041 moeten eerst in Supabase worden uitgevoerd.";
  if (error.code === "23505") return "Dit bedrijf staat al op het bord.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres of een te lange tekst).";
  return "Opslaan mislukt.";
}

/** De invoer schoon en binnen de grenzen van de database; een fout in woorden als iets niet kan. */
function schoon(invoer: KlantInvoer): { velden: Partial<Klant>; fout?: string } {
  const v: Partial<Klant> = {};
  if ("bedrijf" in invoer) {
    const b = tekst(invoer.bedrijf, 200);
    if (!b || !bedrijfSleutel(b)) return { velden: v, fout: "Vul de naam van het bedrijf in." };
    v.bedrijf = b;
  }
  if ("status" in invoer) {
    if (!isKlantStatus(invoer.status)) return { velden: v, fout: "Onbekende status." };
    v.status = invoer.status;
  }
  if ("contactpersoon" in invoer) v.contactpersoon = tekst(invoer.contactpersoon, 200);
  if ("email" in invoer) {
    const e = tekst(invoer.email, 254)?.toLowerCase() ?? null;
    if (e && !EMAIL.test(e)) return { velden: v, fout: "Het e-mailadres klopt niet." };
    v.email = e;
  }
  if ("telefoon" in invoer) v.telefoon = tekst(invoer.telefoon, 40);
  if ("eigenaar" in invoer) v.eigenaar = tekst(invoer.eigenaar, 80);
  if ("bron" in invoer) v.bron = tekst(invoer.bron, 120);
  if ("stand" in invoer) v.stand = meerregelig(invoer.stand, 2000);
  if ("volgende_actie" in invoer) v.volgende_actie = tekst(invoer.volgende_actie, 500);
  if ("notitie" in invoer) v.notitie = meerregelig(invoer.notitie, 10000);
  for (const d of ["startdatum", "volgende_actie_op"] as const) {
    if (d in invoer) {
      const w = tekst(invoer[d], 10);
      if (w && !isDatum(w)) return { velden: v, fout: d === "startdatum" ? "De startdatum klopt niet." : "De datum van de volgende actie klopt niet." };
      v[d] = w;
    }
  }
  for (const c of CHECKLIST) if (c.key in invoer) v[c.key] = Boolean(invoer[c.key]);
  return { velden: v };
}

async function laad(sb: Sb, id: string): Promise<Klant | null> {
  const { data } = await sb.from("klanten").select("*").eq("id", id).maybeSingle();
  return (data as Klant | null) ?? null;
}

/** Een regel van het systeem (verplaatst, import): geen contact, dus niet "het laatste contact" op de kaart. */
async function log(sb: Sb, klantId: string, soort: GesprekSoort, tekst: string, door: string, op?: string): Promise<Gesprek | null> {
  const { data } = await sb
    .from("klant_gesprekken")
    .insert({ klant_id: klantId, soort, tekst: tekst.slice(0, 5000), door, contact: false, ...(op ? { op } : {}) })
    .select("*")
    .single();
  return (data as Gesprek | null) ?? null;
}

const ververs = () => revalidatePath("/admin/klantenbord");

/** Een nieuwe kaart. De status mag mee (standaard lead). */
export async function maakKlant(invoer: KlantInvoer): Promise<KlantResultaat> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { velden, fout } = schoon({ ...invoer, bedrijf: invoer.bedrijf ?? "" });
  if (fout) return { ok: false, fout };
  const { data, error } = await sb.from("klanten").insert({ ...velden, created_by: user.id }).select("*").single();
  if (error || !data) return { ok: false, fout: foutUit(error) };
  const klant = data as Klant;
  await log(sb, klant.id, "status", `Op het bord gezet als ${statusInfo(klant.status).label.toLowerCase()}`, admin.email);
  ververs();
  return { ok: true, klant };
}

/** Velden van een kaart wijzigen (gegevens, checklist, volgende stap, notitie). */
export async function wijzigKlant(id: string, invoer: KlantInvoer): Promise<KlantResultaat> {
  const { sb } = await requirePerm("bellijst");
  const { velden, fout } = schoon(invoer);
  if (fout) return { ok: false, fout };
  delete velden.status;
  if (!Object.keys(velden).length) {
    const k = await laad(sb, id);
    return k ? { ok: true, klant: k } : { ok: false, fout: "Deze kaart bestaat niet meer." };
  }
  const { data, error } = await sb.from("klanten").update(velden).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, fout: foutUit(error) };
  if (!data) return { ok: false, fout: "Deze kaart bestaat niet meer." };
  ververs();
  return { ok: true, klant: data as Klant };
}

/** Een kaart naar een andere kolom; de verplaatsing komt in de tijdlijn. */
export async function zetKlantStatus(id: string, status: KlantStatus): Promise<KlantResultaat> {
  const { sb, admin } = await requirePerm("bellijst");
  if (!isKlantStatus(status)) return { ok: false, fout: "Onbekende status." };
  const oud = await laad(sb, id);
  if (!oud) return { ok: false, fout: "Deze kaart bestaat niet meer." };
  if (oud.status === status) return { ok: true, klant: oud };
  const { data, error } = await sb.from("klanten").update({ status }).eq("id", id).select("*").single();
  if (error || !data) return { ok: false, fout: foutUit(error) };
  const gesprek = await log(sb, id, "status", `Van ${statusInfo(oud.status).label.toLowerCase()} naar ${statusInfo(status).label.toLowerCase()}`, admin.email);
  ververs();
  return { ok: true, klant: data as Klant, gesprek: gesprek ?? undefined };
}

export type GesprekInvoer = {
  soort: string;
  op?: string | null;
  tekst: string;
  /** Meteen de volgende stap zetten (of leegmaken met null). */
  volgende_actie?: string | null;
  volgende_actie_op?: string | null;
  /** En de kaart verplaatsen. */
  status?: string | null;
};

/**
 * Een gesprek, mail, bezoek of notitie bij een klant, met optioneel in één keer
 * de volgende stap en een nieuwe status. Eén handeling na het telefoontje.
 */
export async function voegGesprekToe(id: string, invoer: GesprekInvoer): Promise<GesprekResultaat> {
  const { sb, admin } = await requirePerm("bellijst");
  const soort = invoer.soort;
  if (!isGesprekSoort(soort) || soort === "status" || soort === "import" || soort === "systeem") return { ok: false, fout: "Kies wat voor contact het was." };
  const t = meerregelig(invoer.tekst, 5000);
  const heeftVervolg = invoer.volgende_actie !== undefined || invoer.volgende_actie_op !== undefined || (invoer.status && isKlantStatus(invoer.status));
  if (!t && !heeftVervolg) return { ok: false, fout: "Schrijf kort op wat er besproken is." };
  const op = tekst(invoer.op, 10);
  if (op && !isDatum(op)) return { ok: false, fout: "De datum klopt niet." };
  const oud = await laad(sb, id);
  if (!oud) return { ok: false, fout: "Deze kaart bestaat niet meer." };

  let gesprek: Gesprek | null = null;
  if (t) {
    const { data, error } = await sb.from("klant_gesprekken").insert({ klant_id: id, soort, tekst: t, door: admin.email, ...(op ? { op } : {}) }).select("*").single();
    if (error || !data) return { ok: false, fout: foutUit(error) };
    gesprek = data as Gesprek;
  }

  const velden: Partial<Klant> = {};
  if (invoer.volgende_actie !== undefined) velden.volgende_actie = tekst(invoer.volgende_actie, 500);
  if (invoer.volgende_actie_op !== undefined) {
    const d = tekst(invoer.volgende_actie_op, 10);
    if (d && !isDatum(d)) return { ok: false, fout: "De datum van de volgende actie klopt niet." };
    velden.volgende_actie_op = d;
  }
  if (invoer.status && isKlantStatus(invoer.status) && invoer.status !== oud.status) velden.status = invoer.status;
  if (Object.keys(velden).length) {
    const { error } = await sb.from("klanten").update(velden).eq("id", id);
    if (error) return { ok: false, fout: foutUit(error) };
    if (velden.status) await log(sb, id, "status", `Van ${statusInfo(oud.status).label.toLowerCase()} naar ${statusInfo(velden.status).label.toLowerCase()}`, admin.email);
  }
  const klant = (await laad(sb, id)) || oud;
  ververs();
  return { ok: true, gesprek, klant };
}

export async function verwijderGesprek(klantId: string, gesprekId: string): Promise<GesprekResultaat> {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("klant_gesprekken").delete().eq("id", gesprekId).eq("klant_id", klantId);
  if (error) return { ok: false, fout: foutUit(error) };
  const klant = await laad(sb, klantId);
  if (!klant) return { ok: false, fout: "Deze kaart bestaat niet meer." };
  ververs();
  return { ok: true, gesprek: null, klant };
}

export async function verwijderKlant(id: string): Promise<Resultaat> {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("klanten").delete().eq("id", id);
  if (error) return { ok: false, fout: foutUit(error) };
  ververs();
  return { ok: true };
}

/**
 * De klantlijst importeren. De browser heeft het bestand gelezen en het
 * controlerapport getoond; hier gebeurt wat dat rapport beloofde, maar
 * opnieuw tegen de database van nu: dezelfde bedrijfsnaam is dezelfde kaart,
 * een gevulde cel wint, de status gaat alleen vooruit, inactief blijft
 * inactief. Een rij zonder naam of een tweede rij met dezelfde naam slaan we
 * over. Hooguit duizend rijen per keer.
 */
export async function importeerKlanten(rijen: ImportRij[]): Promise<ImportResultaat> {
  const { sb, user, admin } = await requirePerm("bellijst");
  if (!Array.isArray(rijen) || rijen.length > 1000) return { ok: false, fout: "Te veel rijen in één keer (hooguit duizend)." };
  const { data, error } = await sb.from("klanten").select("*").limit(5000);
  if (error) return { ok: false, fout: foutUit(error) };
  const bestaand = new Map<string, Klant>();
  for (const k of (data as Klant[]) || []) bestaand.set(k.sleutel || bedrijfSleutel(k.bedrijf), k);

  const telling = { nieuw: 0, bijgewerkt: 0, ongewijzigd: 0, overgeslagen: 0 };
  const gezien = new Set<string>();
  for (const ruw of rijen) {
    const bedrijf = tekst(ruw?.bedrijf, 200);
    const sleutel = bedrijfSleutel(bedrijf);
    if (!bedrijf || !sleutel || gezien.has(sleutel)) {
      telling.overgeslagen++;
      continue;
    }
    gezien.add(sleutel);
    // Dezelfde grenzen als bij een kaart met de hand: via schoon(), zodat een rare cel de import niet laat vallen.
    const { velden, fout } = schoon({ ...rijNaarVelden(ruw), bedrijf });
    if (fout) {
      // Een onleesbaar e-mailadres of een datum die niet klopt: zonder dat veld verder.
      const zonder = { ...rijNaarVelden(ruw), bedrijf };
      delete zonder.email;
      delete zonder.startdatum;
      Object.assign(velden, schoon(zonder).velden);
    }
    const afgeleid = statusUitRij(ruw);
    const b = bestaand.get(sleutel);
    if (!b) {
      const { data: nieuw, error: e } = await sb.from("klanten").insert({ ...velden, status: afgeleid, created_by: user.id }).select("*").single();
      if (e || !nieuw) {
        telling.overgeslagen++;
        continue;
      }
      const k = nieuw as Klant;
      bestaand.set(sleutel, k);
      await log(sb, k.id, "import", `Uit de klantlijst (regel ${ruw.regel}) als ${statusInfo(afgeleid).label.toLowerCase()}${velden.stand ? `: ${velden.stand}` : ""}`, admin.email);
      telling.nieuw++;
      continue;
    }
    const update: Partial<Klant> = {};
    for (const [veld, waarde] of Object.entries(velden) as [keyof Klant, Klant[keyof Klant]][]) {
      if (veld === "bedrijf") continue;
      if (waarde !== null && waarde !== undefined && waarde !== b[veld]) (update as Record<string, unknown>)[veld] = waarde;
    }
    if (statusVerder(afgeleid, b.status)) update.status = afgeleid;
    if (!Object.keys(update).length) {
      telling.ongewijzigd++;
      continue;
    }
    const { error: e } = await sb.from("klanten").update(update).eq("id", b.id);
    if (e) {
      telling.overgeslagen++;
      continue;
    }
    const wat = [
      ...(update.status ? [`status ${statusInfo(b.status).label.toLowerCase()} → ${statusInfo(update.status).label.toLowerCase()}`] : []),
      ...(update.stand ? [`stand: ${update.stand}`] : []),
      ...CHECKLIST.filter((c) => c.key in update).map((c) => `${c.label.toLowerCase()} ${update[c.key] ? "ja" : "nee"}`),
      ...(update.startdatum ? [`startdatum ${update.startdatum}`] : []),
    ];
    await log(sb, b.id, "import", `Bijgewerkt uit de klantlijst (regel ${ruw.regel})${wat.length ? `: ${wat.join(", ")}` : ""}`, admin.email);
    telling.bijgewerkt++;
  }
  ververs();
  return { ok: true, ...telling };
}
