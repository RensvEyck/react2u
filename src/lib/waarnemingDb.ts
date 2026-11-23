import type { requireAdmin } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { kort, type Collega, type Kort, type Waarneming, type WnKlant } from "@/lib/waarneming";

/**
 * De waarneming uit de database (0057), met de sessie van de ingelogde collega:
 * de policies bepalen wat terugkomt. De collega's en de klanten komen uit de
 * hulpfuncties wn_collegas() en wn_klanten(), die alleen geven wat de
 * waarneming nodig heeft (geen adres-, bank- of contactgegevens van klanten).
 */

type Sb = Awaited<ReturnType<typeof requireAdmin>>["sb"];
export type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: "migratie" | "laden" };

const rij = (w: Waarneming): Waarneming => ({ ...w, klant_ids: Array.isArray(w.klant_ids) ? w.klant_ids : [] });

export async function haalCollegas(sb: Sb): Promise<Collega[]> {
  const { data, error } = await sb.rpc("wn_collegas");
  if (error) return [];
  return (data as Collega[] | null) || [];
}

export async function haalKlanten(sb: Sb): Promise<WnKlant[]> {
  const { data, error } = await sb.rpc("wn_klanten");
  if (error) return [];
  return (data as WnKlant[] | null) || [];
}

export type Overzicht = { waarnemingen: Waarneming[]; collegas: Collega[]; klanten: WnKlant[] };

/** Alles voor het scherm Waarneming: de waarnemingen (ook wat geweest is, tot een jaar terug), wie kan waarnemen en de klanten. */
export async function haalOverzicht(sb: Sb, vandaag: string): Promise<Uitkomst<Overzicht>> {
  const grens = new Date(`${vandaag}T00:00:00Z`);
  grens.setUTCFullYear(grens.getUTCFullYear() - 1);
  const [w, collegas, klanten] = await Promise.all([
    sb.from("waarnemingen").select("*").gte("tot", grens.toISOString().slice(0, 10)).order("van", { ascending: false }).limit(2000),
    haalCollegas(sb),
    haalKlanten(sb),
  ]);
  if (w.error) return { ok: false, fout: isMissingTable(w.error) ? "migratie" : "laden" };
  return { ok: true, data: { waarnemingen: ((w.data as Waarneming[] | null) || []).map(rij), collegas, klanten } };
}

export type EenWaarneming = { waarneming: Waarneming | null; collegas: Collega[]; klanten: WnKlant[]; andere: Waarneming[] };

/** Eén waarneming met wie en welke klanten; `andere` zijn de overige waarnemingen van dezelfde collega die nog lopen of komen (voor de overlapwaarschuwing). */
export async function haalWaarneming(sb: Sb, id: string, vandaag: string): Promise<Uitkomst<EenWaarneming>> {
  const [w, collegas, klanten] = await Promise.all([sb.from("waarnemingen").select("*").eq("id", id).maybeSingle(), haalCollegas(sb), haalKlanten(sb)]);
  if (w.error) return { ok: false, fout: isMissingTable(w.error) ? "migratie" : "laden" };
  if (!w.data) return { ok: true, data: { waarneming: null, collegas, klanten, andere: [] } };
  const waarneming = rij(w.data as Waarneming);
  const a = await sb.from("waarnemingen").select("*").eq("afwezige", waarneming.afwezige).neq("id", id).gte("tot", vandaag).limit(50);
  return { ok: true, data: { waarneming, collegas, klanten, andere: ((a.data as Waarneming[] | null) || []).map(rij) } };
}

export type Dekkingsdata = { waarnemingen: Waarneming[]; collegas: Collega[] };

/**
 * Voor de klantenkaart, het klantenbord en het overleg: wat nu loopt of nog
 * komt, met de collega's om namen te tonen. Null vóór de migratie of zonder
 * recht; dan tonen die schermen gewoon niets.
 */
export async function haalDekking(sb: Sb, vandaag: string): Promise<Dekkingsdata | null> {
  const [w, collegas] = await Promise.all([sb.from("waarnemingen").select("*").gte("tot", vandaag).order("van").limit(500), haalCollegas(sb)]);
  if (w.error) return null;
  return { waarnemingen: ((w.data as Waarneming[] | null) || []).map(rij), collegas };
}

export type WaarnemingKort = Kort & { collegas: Collega[] };

/** Voor het dashboard: waar jij voor waarneemt, wie er voor jou is, en (beheer) wat nog te regelen is. Null vóór de migratie. */
export async function haalWaarnemingKort(sb: Sb, userId: string, vandaag: string, beheer: boolean): Promise<WaarnemingKort | null> {
  const d = await haalDekking(sb, vandaag);
  if (!d) return null;
  return { ...kort(d.waarnemingen, userId, vandaag, beheer), collegas: d.collegas };
}
