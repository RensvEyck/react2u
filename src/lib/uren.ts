/**
 * Declarabele uren (migratie 0035): weken, en hoeveel van de beschikbare uren
 * een medewerker declarabel maakte tegenover zijn norm.
 *
 * Puur, zonder database. Een week is de maandag ervan (jjjj-mm-dd, ISO-week);
 * een maand de jjjj-mm. Een week die over twee maanden loopt hoort bij de
 * maand van zijn donderdag, net als het ISO-weeknummer zelf.
 */

export type Medewerker = {
  id: string;
  naam: string;
  functie: string | null;
  /** Per week. */
  contracturen: number;
  /** Procent van de beschikbare uren dat declarabel hoort te zijn. */
  norm: number;
  /** Waartegen de declarabele uren als omzet tellen; leeg = niet in de omzet. */
  uurtarief: number | null;
  actief: boolean;
  sort: number;
};

export type UrenRij = { medewerker_id: string; week: string; declarabel: number; afwezig: number };

const DAG = 86_400_000;

function utc(datum: string): Date {
  return new Date(`${datum}T00:00:00Z`);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** De maandag van de week waarin `datum` valt. */
export function maandagVan(datum: string): string {
  const d = utc(datum);
  const dag = (d.getUTCDay() + 6) % 7; // maandag 0 … zondag 6
  return iso(new Date(d.getTime() - dag * DAG));
}

export function plusWeken(maandag: string, n: number): string {
  return iso(new Date(utc(maandag).getTime() + n * 7 * DAG));
}

/** De laatste `n` weken tot en met de week van `tot`, oudste eerst. */
export function wekenTot(tot: string, n: number): string[] {
  const laatste = maandagVan(tot);
  return Array.from({ length: n }, (_, i) => plusWeken(laatste, i - n + 1));
}

/** ISO-weeknummer: week 1 is de week met de eerste donderdag van het jaar. */
export function weekNummer(maandag: string): { jaar: number; week: number } {
  const donderdag = new Date(utc(maandag).getTime() + 3 * DAG);
  const jaar = donderdag.getUTCFullYear();
  const eersteDonderdag = new Date(Date.UTC(jaar, 0, 4));
  const start = new Date(eersteDonderdag.getTime() - ((eersteDonderdag.getUTCDay() + 6) % 7) * DAG);
  return { jaar, week: 1 + Math.round((utc(maandag).getTime() - start.getTime()) / (7 * DAG)) };
}

/** De maand (jjjj-mm) waar de week bij hoort: die van zijn donderdag. */
export function maandVanWeek(maandag: string): string {
  return iso(new Date(utc(maandag).getTime() + 3 * DAG)).slice(0, 7);
}

const KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });

/** "3–9 nov" of "27 okt – 2 nov". */
export function weekBereik(maandag: string): string {
  const van = utc(maandag);
  const tot = new Date(van.getTime() + 6 * DAG);
  const [d1, m1] = KORT.format(van).replace(".", "").split(" ");
  const [d2, m2] = KORT.format(tot).replace(".", "").split(" ");
  return m1 === m2 ? `${d1}–${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
}

/**
 * "7,5", "7.5", "7½" of "" naar een getal (halve en kwartieren mogen), of null
 * als het geen geldig aantal uren is. Leeg is 0: een leeg vakje is niets gewerkt.
 */
export function leesUren(invoer: string | number | null | undefined, max = 80): number | null {
  if (invoer === null || invoer === undefined) return 0;
  if (typeof invoer === "number") return Number.isFinite(invoer) && invoer >= 0 && invoer <= max ? Math.round(invoer * 4) / 4 : null;
  const t = invoer.trim().replace("½", ".5").replace(",", ".");
  if (!t) return 0;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n <= max ? Math.round(n * 4) / 4 : null;
}

/** "7,5" en "36": zoals je het invult, zonder ",0". */
export function urenTekst(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

/** Beschikbaar = contracturen min afwezigheid, nooit onder nul. */
export function beschikbaar(contracturen: number, afwezig: number): number {
  return Math.max(0, contracturen - afwezig);
}

/** Declarabel deel van de beschikbare uren, in hele procenten; null als er niets beschikbaar was. */
export function declarabiliteit(declarabel: number, beschikbareUren: number): number | null {
  if (beschikbareUren <= 0) return declarabel > 0 ? 100 : null;
  return Math.round((declarabel / beschikbareUren) * 100);
}

export type Oordeel = "boven" | "op" | "net-onder" | "onder";

/** Tegenover de norm: erboven, erop (tot 2 punten eronder), net eronder (tot 10) of eronder. */
export function oordeel(procent: number | null, norm: number): Oordeel | null {
  if (procent === null) return null;
  const v = procent - norm;
  if (v > 2) return "boven";
  if (v >= -2) return "op";
  if (v >= -10) return "net-onder";
  return "onder";
}

export type Cel = { declarabel: number; afwezig: number; beschikbaar: number; procent: number | null; ingevuld: boolean };

/** Per medewerker en week wat er staat, met de beschikbare uren en de declarabiliteit. */
export function cel(m: Pick<Medewerker, "contracturen">, rij: UrenRij | undefined): Cel {
  const declarabel = rij?.declarabel ?? 0;
  const afwezig = rij?.afwezig ?? 0;
  const b = beschikbaar(m.contracturen, afwezig);
  return { declarabel, afwezig, beschikbaar: b, procent: rij ? declarabiliteit(declarabel, b) : null, ingevuld: Boolean(rij) };
}

export type Totaal = { declarabel: number; afwezig: number; beschikbaar: number; procent: number | null; weken: number };

/** Opgeteld over een reeks cellen; alleen ingevulde weken tellen mee in de beschikbare uren. */
export function optellen(cellen: Cel[]): Totaal {
  const ingevuld = cellen.filter((c) => c.ingevuld);
  const declarabel = ingevuld.reduce((s, c) => s + c.declarabel, 0);
  const afwezig = ingevuld.reduce((s, c) => s + c.afwezig, 0);
  const b = ingevuld.reduce((s, c) => s + c.beschikbaar, 0);
  return { declarabel, afwezig, beschikbaar: b, procent: ingevuld.length ? declarabiliteit(declarabel, b) : null, weken: ingevuld.length };
}

/** De uren per medewerker per week, als opzoektabel. */
export function urenIndex(rijen: UrenRij[]): Map<string, UrenRij> {
  return new Map(rijen.map((r) => [`${r.medewerker_id}|${r.week}`, { ...r, declarabel: Number(r.declarabel), afwezig: Number(r.afwezig) }]));
}

/** Gewogen norm van een groep: de norm van ieder naar zijn contracturen. */
export function groepsnorm(medewerkers: Pick<Medewerker, "contracturen" | "norm">[]): number | null {
  const uren = medewerkers.reduce((s, m) => s + m.contracturen, 0);
  if (!uren) return null;
  return Math.round(medewerkers.reduce((s, m) => s + m.norm * m.contracturen, 0) / uren);
}
