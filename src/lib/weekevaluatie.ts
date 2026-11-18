/**
 * Weekevaluatie (migratie 0044): de vaste vragen, welke weken je nog mag
 * invullen, kwartalen, gemiddelden en trends, wie welke week miste, de tekst
 * van de vrijdagherinnering en de rijen voor de export.
 *
 * Puur, zonder database. Een week is zijn maandag (jjjj-mm-dd, ISO-week), net
 * als bij de uren (lib/uren.ts); een kwartaal is dat van de donderdag van de
 * week, zoals een week ook bij de maand van zijn donderdag hoort.
 */

import { maandagVan, plusWeken, weekBereik, weekNummer } from "./uren";

/* ---------- de vragen ---------- */

export type Schaal = "energie" | "werkdruk" | "voldoening" | "samenwerking" | "cijfer";
export type Tekstvraag = "goed" | "beter" | "knelpunt" | "nodig" | "trots";
export type VraagSleutel = Schaal | Tekstvraag;

export type SchaalVraag = { sleutel: Schaal; soort: "schaal"; label: string; kort: string; hint: string; laag: string; hoog: string };
export type TekstVraag = { sleutel: Tekstvraag; soort: "tekst"; label: string; kort: string; hint: string; voorbeeld: string };
export type Vraag = SchaalVraag | TekstVraag;

/**
 * De vaste lijst, in de volgorde van het formulier. Eerst de schalen (1 tot
 * 10, hoger is beter, zodat de grafieken één richting hebben), dan de open
 * vragen. Past bij een arbodienst waar casemanagers en sales werken: energie
 * en werkdruk zijn de signalen die je in een kwartaalmeeting wilt zien, de
 * open vragen geven het verhaal erbij. Een vraag erbij is hier een regel; de
 * database bewaart de antwoorden als jsonb op deze sleutels.
 */
export const VRAGEN: Vraag[] = [
  { sleutel: "energie", soort: "schaal", label: "Hoeveel energie had je deze week?", kort: "Energie", hint: "Niet hoe druk het was, maar hoe je erin zat.", laag: "leeg", hoog: "vol" },
  { sleutel: "werkdruk", soort: "schaal", label: "Hoe goed kon je de werkdruk aan?", kort: "Werkdruk", hint: "Dossiers, telefoontjes, deadlines: was het te doen?", laag: "niet te doen", hoog: "prima te doen" },
  { sleutel: "voldoening", soort: "schaal", label: "Hoeveel voldoening gaf je werk?", kort: "Voldoening", hint: "Een werknemer die weer aan het werk is, een werkgever die geholpen is.", laag: "weinig", hoog: "veel" },
  { sleutel: "samenwerking", soort: "schaal", label: "Hoe liep de samenwerking?", kort: "Samenwerking", hint: "Met collega's, werkgevers, bedrijfsartsen en werknemers.", laag: "stroef", hoog: "soepel" },
  { sleutel: "cijfer", soort: "schaal", label: "Welk cijfer geef je deze week?", kort: "Cijfer", hint: "Alles bij elkaar.", laag: "slechte week", hoog: "topweek" },
  { sleutel: "goed", soort: "tekst", label: "Wat ging goed?", kort: "Ging goed", hint: "Groot of klein. Twee zinnen zijn genoeg.", voorbeeld: "Bijvoorbeeld: twee werknemers zijn weer gestart, en het gesprek met de werkgever liep rustig." },
  { sleutel: "beter", soort: "tekst", label: "Wat kon beter?", kort: "Kon beter", hint: "Van jezelf, van het team of van hoe we werken.", voorbeeld: "Bijvoorbeeld: ik heb te lang gewacht met terugbellen." },
  { sleutel: "knelpunt", soort: "tekst", label: "Waar liep je tegenaan?", kort: "Knelpunt", hint: "Een dossier, een systeem, een klant, de planning.", voorbeeld: "Bijvoorbeeld: de bedrijfsarts was pas donderdag beschikbaar, de werkgever belde drie keer." },
  { sleutel: "nodig", soort: "tekst", label: "Wat heb je nodig?", kort: "Nodig", hint: "Van React2u, van je collega's, van Rens.", voorbeeld: "Bijvoorbeeld: een uur samen door de spoor 2-dossiers." },
  { sleutel: "trots", soort: "tekst", label: "Waar ben je trots op?", kort: "Trots op", hint: "Dit nemen we mee naar de kwartaalmeeting.", voorbeeld: "Bijvoorbeeld: de werkgever van de bakkerij zei dat hij zich eindelijk gehoord voelde." },
];

export const SCHALEN = VRAGEN.filter((v): v is SchaalVraag => v.soort === "schaal");
export const TEKSTVRAGEN = VRAGEN.filter((v): v is TekstVraag => v.soort === "tekst");
export const SCHAAL_SLEUTELS = SCHALEN.map((v) => v.sleutel);

export function vraag(sleutel: Schaal): SchaalVraag;
export function vraag(sleutel: Tekstvraag): TekstVraag;
export function vraag(sleutel: VraagSleutel): Vraag {
  return VRAGEN.find((v) => v.sleutel === sleutel)!;
}

export type Antwoorden = Partial<Record<Schaal, number> & Record<Tekstvraag, string>>;

export type Evaluatie = {
  id: string;
  user_id: string;
  week: string;
  antwoorden: Antwoorden;
  door: string | null;
  created_at: string;
  updated_at: string;
};

export const MAX_TEKST = 2000;

/**
 * Wat het formulier stuurde naar antwoorden: elke schaal een heel getal van 1
 * tot 10 (verplicht), open vragen bijgeknipt en leeg weggelaten. `fouten`
 * noemt de schalen die ontbreken of onzin bevatten.
 */
export function leesAntwoorden(invoer: Record<string, string | null | undefined>): { antwoorden: Antwoorden; fouten: Schaal[] } {
  const antwoorden: Antwoorden = {};
  const fouten: Schaal[] = [];
  for (const v of VRAGEN) {
    const ruw = (invoer[v.sleutel] ?? "").toString().trim();
    if (v.soort === "schaal") {
      const n = Number(ruw);
      if (/^\d{1,2}$/.test(ruw) && Number.isInteger(n) && n >= 1 && n <= 10) antwoorden[v.sleutel] = n;
      else fouten.push(v.sleutel);
    } else if (ruw) {
      antwoorden[v.sleutel] = ruw.replace(/\r\n/g, "\n").slice(0, MAX_TEKST);
    }
  }
  return { antwoorden, fouten };
}

/** De antwoorden zoals ze uit de database komen: alleen bekende sleutels met een geldige waarde. */
export function normaliseerAntwoorden(ruw: unknown): Antwoorden {
  const a: Antwoorden = {};
  if (!ruw || typeof ruw !== "object") return a;
  const o = ruw as Record<string, unknown>;
  for (const v of VRAGEN) {
    const w = o[v.sleutel];
    if (v.soort === "schaal") {
      if (typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= 10) a[v.sleutel] = w;
    } else if (typeof w === "string" && w.trim()) a[v.sleutel] = w.slice(0, MAX_TEKST);
  }
  return a;
}

/** Of er in de open vragen iets staat. */
export function heeftTekst(a: Antwoorden): boolean {
  return TEKSTVRAGEN.some((v) => Boolean(a[v.sleutel]));
}

/* ---------- weken: open, gesloten, toekomst ---------- */

const DAG = 86_400_000;
const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDagen = (datum: string, n: number) => iso(new Date(utc(datum).getTime() + n * DAG));

/** De twee weken die je nog mag invullen of wijzigen: vorige week en deze week, oudste eerst. */
export function openWeken(vandaag: string): [string, string] {
  const deze = maandagVan(vandaag);
  return [plusWeken(deze, -1), deze];
}

export type WeekStand = "open" | "gesloten" | "toekomst";

/** Open: nog in te vullen (deze of vorige week). Gesloten: de week erna is voorbij. */
export function weekStand(week: string, vandaag: string): WeekStand {
  const deze = maandagVan(vandaag);
  if (week > deze) return "toekomst";
  return week >= plusWeken(deze, -1) ? "open" : "gesloten";
}

export function magWijzigen(week: string, vandaag: string): boolean {
  return weekStand(week, vandaag) === "open";
}

/** De laatste dag waarop een week nog te wijzigen is: de zondag van de week erna. */
export function sluitOp(week: string): string {
  return plusDagen(week, 13);
}

/** "Week 47 · 16–22 nov". */
export function weekTitel(week: string): string {
  return `Week ${weekNummer(week).week} · ${weekBereik(week)}`;
}

/** Alleen weken waarvan de zondag op of na `sinds` valt tellen voor iemand mee. */
export function teltVoor(week: string, sinds: string | null | undefined): boolean {
  return !sinds || plusDagen(week, 6) >= sinds;
}

/* ---------- kwartalen ---------- */

export type Kwartaal = { jaar: number; kwartaal: 1 | 2 | 3 | 4 };

/** Het kwartaal van een week: dat van zijn donderdag, zoals het ISO-weeknummer en de maand bij de uren. */
export function kwartaalVanWeek(maandag: string): Kwartaal {
  const donderdag = utc(plusDagen(maandag, 3));
  return { jaar: donderdag.getUTCFullYear(), kwartaal: (Math.floor(donderdag.getUTCMonth() / 3) + 1) as Kwartaal["kwartaal"] };
}

/** Het kwartaal waar de week van deze datum bij hoort. */
export function kwartaalVanDatum(datum: string): Kwartaal {
  return kwartaalVanWeek(maandagVan(datum));
}

/** "2026-Q4", voor in de URL. */
export function kwartaalSleutel(k: Kwartaal): string {
  return `${k.jaar}-Q${k.kwartaal}`;
}

export function leesKwartaal(s: string | null | undefined): Kwartaal | null {
  const m = /^(\d{4})-Q([1-4])$/.exec((s || "").trim());
  if (!m) return null;
  return { jaar: Number(m[1]), kwartaal: Number(m[2]) as Kwartaal["kwartaal"] };
}

/** "Q4 2026" of, lang, "vierde kwartaal 2026". */
export function kwartaalLabel(k: Kwartaal, lang = false): string {
  return lang ? `${["eerste", "tweede", "derde", "vierde"][k.kwartaal - 1]} kwartaal ${k.jaar}` : `Q${k.kwartaal} ${k.jaar}`;
}

export function plusKwartalen(k: Kwartaal, n: number): Kwartaal {
  const index = k.jaar * 4 + (k.kwartaal - 1) + n;
  return { jaar: Math.floor(index / 4), kwartaal: ((index % 4) + 1) as Kwartaal["kwartaal"] };
}

export function zelfdeKwartaal(a: Kwartaal, b: Kwartaal): boolean {
  return a.jaar === b.jaar && a.kwartaal === b.kwartaal;
}

/** De weken (maandagen) van een kwartaal: die waarvan de donderdag in het kwartaal valt. Twaalf tot veertien. */
export function wekenInKwartaal(k: Kwartaal): string[] {
  const eerste = `${k.jaar}-${String((k.kwartaal - 1) * 3 + 1).padStart(2, "0")}-01`;
  const weken: string[] = [];
  let w = maandagVan(eerste);
  if (plusDagen(w, 3) < eerste) w = plusWeken(w, 1);
  while (zelfdeKwartaal(kwartaalVanWeek(w), k)) {
    weken.push(w);
    w = plusWeken(w, 1);
  }
  return weken;
}

/* ---------- gemiddelden en trends ---------- */

/** Op één decimaal, of null zonder waarden. */
export function gemiddelde(waarden: number[]): number | null {
  if (!waarden.length) return null;
  return Math.round((waarden.reduce((s, x) => s + x, 0) / waarden.length) * 10) / 10;
}

export type SchaalSamenvatting = { gem: number | null; n: number; laagste: number | null; hoogste: number | null };

/** Per schaal het gemiddelde over deze evaluaties, met het laagste en hoogste cijfer. */
export function gemiddelden(evaluaties: Pick<Evaluatie, "antwoorden">[]): Record<Schaal, SchaalSamenvatting> {
  const uit = {} as Record<Schaal, SchaalSamenvatting>;
  for (const s of SCHAAL_SLEUTELS) {
    const w = evaluaties.map((e) => e.antwoorden[s]).filter((x): x is number => typeof x === "number");
    uit[s] = { gem: gemiddelde(w), n: w.length, laagste: w.length ? Math.min(...w) : null, hoogste: w.length ? Math.max(...w) : null };
  }
  return uit;
}

/** Verschil op één decimaal, of null als een van beide ontbreekt. */
export function trend(nu: number | null | undefined, vorig: number | null | undefined): number | null {
  if (nu === null || nu === undefined || vorig === null || vorig === undefined) return null;
  return Math.round((nu - vorig) * 10) / 10;
}

/** "7,4", "8" en "–" voor niets. */
export function cijferTekst(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** "+0,4", "−1,2", "±0". */
export function trendTekst(t: number | null): string {
  if (t === null) return "";
  if (t === 0) return "±0";
  return `${t > 0 ? "+" : "−"}${cijferTekst(Math.abs(t))}`;
}

export type WeekGemiddelde = { week: string; waarden: Partial<Record<Schaal, number>>; n: number };

/** Per week het gemiddelde over wie die week invulde (voor de teamgrafiek). */
export function perWeek(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[], weken: string[]): WeekGemiddelde[] {
  return weken.map((week) => {
    const rijen = evaluaties.filter((e) => e.week === week);
    const g = gemiddelden(rijen);
    const waarden: Partial<Record<Schaal, number>> = {};
    for (const s of SCHAAL_SLEUTELS) if (g[s].gem !== null) waarden[s] = g[s].gem!;
    return { week, waarden, n: rijen.length };
  });
}

/* ---------- wie doet mee, wie miste ---------- */

export type Deelnemer = { user_id: string; email: string; rol: string; sinds: string | null };

/**
 * Wie telt mee. De super admin heeft het recht omdat die alles heeft, niet
 * omdat hij meedoet; die telt (en krijgt de herinnering) pas als hij zelf ooit
 * een evaluatie invulde. Iedere andere rol met het recht doet gewoon mee.
 */
export function doetMee(d: Pick<Deelnemer, "rol">, heeftOoitIngevuld: boolean): boolean {
  return d.rol !== "superadmin" || heeftOoitIngevuld;
}

export function deelnemers<T extends Pick<Deelnemer, "rol" | "user_id">>(lijst: T[], evaluaties: Pick<Evaluatie, "user_id">[]): T[] {
  const ooit = new Set(evaluaties.map((e) => e.user_id));
  return lijst.filter((d) => doetMee(d, ooit.has(d.user_id)));
}

export type Deelname = { ingevuld: string[]; gemist: string[]; open: string[]; verwacht: number };

/**
 * Welke weken iemand invulde, miste (gesloten en leeg) en nog kan invullen,
 * binnen een reeks weken. Weken van vóór zijn komst tellen niet.
 */
export function deelname(d: Pick<Deelnemer, "sinds">, weken: string[], ingevuld: Set<string>, vandaag: string): Deelname {
  const uit: Deelname = { ingevuld: [], gemist: [], open: [], verwacht: 0 };
  for (const w of weken) {
    const stand = weekStand(w, vandaag);
    if (stand === "toekomst") continue;
    // Wat ingevuld is telt altijd; een lege week van vóór iemands komst niet.
    if (ingevuld.has(w)) {
      uit.verwacht++;
      uit.ingevuld.push(w);
    } else if (teltVoor(w, d.sinds)) {
      uit.verwacht++;
      if (stand === "gesloten") uit.gemist.push(w);
      else uit.open.push(w);
    }
  }
  return uit;
}

/** Wie deze week nog niet invulde en wel meedoet: de ontvangers van de vrijdagherinnering. */
export function wieHerinneren<T extends Deelnemer>(lijst: T[], evaluaties: Pick<Evaluatie, "user_id" | "week">[], week: string): T[] {
  const dezeWeek = new Set(evaluaties.filter((e) => e.week === week).map((e) => e.user_id));
  return deelnemers(lijst, evaluaties).filter((d) => !dezeWeek.has(d.user_id) && teltVoor(week, d.sinds));
}

/* ---------- de herinnering ---------- */

export type Herinnering = { onderwerp: string; aanhef: string; alineas: string[]; knop: string };

/** De vriendelijke mail van vrijdagmiddag. Kort: het invullen zelf duurt vijf minuten. */
export function herinnering(voornaam: string | null, week: string, open: { vorigeWeekOok: boolean }): Herinnering {
  const nr = weekNummer(week).week;
  return {
    onderwerp: `Hoe was je week ${nr}?`,
    aanhef: `Hoi${voornaam ? ` ${voornaam}` : ""},`,
    alineas: [
      `Het is vrijdagmiddag: tijd voor je weekevaluatie van week ${nr} (${weekBereik(week)}). Vijf cijfers en een paar zinnen, dat is alles. Je kunt hem tot en met zondag ${weekBereikDag(sluitOp(week))} nog aanpassen.`,
      open.vorigeWeekOok ? `Vorige week staat ook nog open; die kun je in hetzelfde scherm invullen.` : `Wat je schrijft is alleen voor jou en voor Rens, en komt terug in de kwartaalmeeting.`,
      "Fijn weekend!",
    ],
    knop: "Vul je weekevaluatie in",
  };
}

const LANG = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });

/** "29 november", voor in een zin. */
export function weekBereikDag(datum: string): string {
  return LANG.format(utc(datum));
}

/* ---------- export ---------- */

export type ExportInvoer = {
  deelnemers: Deelnemer[];
  evaluaties: Evaluatie[];
  weken: string[];
  /** Naam per user_id, uit de medewerkers (0035); anders het e-mailadres. */
  namen: Map<string, string>;
  /** Declarabele uren per `${user_id}|${week}`, als de collega gekoppeld is. */
  uren: Map<string, { declarabel: number; afwezig: number }>;
  vandaag: string;
};

export const EXPORT_KOP = [
  "Collega", "E-mail", "Jaar", "Week", "Periode", "Status",
  ...SCHALEN.map((s) => s.kort),
  ...TEKSTVRAGEN.map((t) => t.label),
  "Declarabele uren", "Uren afwezig", "Ingevuld op",
];

const getal = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

/**
 * Eén rij per collega per week van het kwartaal (ook de gemiste, dan met de
 * status "gemist" en lege cellen), zodat de tabel in Excel meteen te draaien
 * is. Alle cellen tekst, zoals xlsx() ze wegschrijft.
 */
export function exportRijen(i: ExportInvoer): string[][] {
  const rijen: string[][] = [EXPORT_KOP];
  const per = new Map(i.evaluaties.map((e) => [`${e.user_id}|${e.week}`, e]));
  for (const d of deelnemers(i.deelnemers, i.evaluaties)) {
    const naam = i.namen.get(d.user_id) || d.email;
    for (const w of i.weken) {
      const stand = weekStand(w, i.vandaag);
      if (stand === "toekomst") continue;
      const e = per.get(`${d.user_id}|${w}`);
      if (!e && !teltVoor(w, d.sinds)) continue;
      const u = i.uren.get(`${d.user_id}|${w}`);
      const { jaar, week } = weekNummer(w);
      rijen.push([
        naam, d.email, String(jaar), String(week), weekBereik(w),
        e ? "ingevuld" : stand === "open" ? "nog open" : "gemist",
        ...SCHALEN.map((s) => getal(e?.antwoorden[s.sleutel])),
        ...TEKSTVRAGEN.map((t) => e?.antwoorden[t.sleutel] || ""),
        u ? getal(u.declarabel) : "", u ? getal(u.afwezig) : "",
        e ? e.updated_at.slice(0, 10) : "",
      ]);
    }
  }
  return rijen;
}

/** Bestandsnaam van de export: weekevaluaties-2026-Q4.xlsx. */
export function exportNaam(k: Kwartaal): string {
  return `weekevaluaties-${kwartaalSleutel(k)}.xlsx`;
}
