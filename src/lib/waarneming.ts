import { firstName } from "@/lib/dashboard";

/**
 * Waarneming (0060; Rens, 23 nov 2026): wie neemt wie waar als iemand er niet
 * is. Een collega plant "ik ben er niet van X tot Y, N neemt waar"; het beheer
 * regelt het voor wie dat zelf niet kan of nog geen waarnemer heeft. De
 * klantenkaart, het klantenbord, het CM-overleg en het dashboard laten zien
 * wie er voor een klant is zolang de eigen casemanager er niet is.
 *
 * Alleen de werkoverdracht: geen reden van afwezigheid (dat is Toeqan), niets
 * medisch (dat is XpertSuite). Klanten hangen aan een collega via het naamveld
 * casemanager op de stamkaart; `klantenVan` vergelijkt dat met de naam uit de
 * medewerkers. Alles hier is puur en getest in waarneming.test.ts.
 */

export type Waarneming = {
  id: string;
  afwezige: string;
  afwezige_email: string | null;
  van: string;
  tot: string;
  waarnemer: string | null;
  waarnemer_email: string | null;
  /** Leeg = alle klanten die op de stamkaart op naam van de afwezige staan. */
  klant_ids: string[];
  toelichting: string | null;
  door: string | null;
  created_at: string;
  updated_at: string;
};

/** Een collega die kan waarnemen (wn_collegas): met de naam en functie uit de medewerkers als die gekoppeld zijn. */
export type Collega = { user_id: string; email: string; naam: string | null; functie: string | null };

/** Een echte klant voor de waarneming (wn_klanten): met de casemanager van de stamkaart. */
export type WnKlant = { id: string; bedrijf: string; status: string; casemanager: string | null; medewerkers: number | null; plaats: string | null };

export type Fase = "actief" | "komend" | "voorbij";

export const MAX_TOELICHTING = 1000;
export const MAX_DAGEN = 400;
/** Hoe ver vooruit het dashboard, de klantenkaart en het overleg een komende waarneming al noemen. */
export const BINNENKORT_DAGEN = 14;
export const MAX_KLANTEN = 300;

export const NIETS_MEDISCH_WAARNEMING =
  "Alleen wat de waarnemer moet weten over het werk: afspraken, lopende zaken, wie te bellen. Geen reden van afwezigheid, geen namen van werknemers van klanten, niets medisch.";
export const TOEQAN_REGEL = "Verlof of ziekte meld je in Toeqan; hier regel je alleen wie het werk overneemt.";

/* ---------- namen ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

const normaliseer = (s: string | null | undefined) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** De naam van een collega: uit de medewerkers, anders de voornaam uit het e-mailadres, anders het adres. */
export function naamVan(c: Pick<Collega, "naam" | "email"> | null | undefined, email?: string | null): string {
  if (c?.naam && c.naam.trim()) return c.naam.trim();
  const adres = c?.email || email || null;
  return firstName(adres) || adres || "een collega";
}

/** De voornaam: het eerste woord van de naam, anders uit het e-mailadres. */
export function voornaamVan(c: Pick<Collega, "naam" | "email"> | null | undefined, email?: string | null): string {
  const n = naamVan(c, email);
  return n.includes("@") ? n : n.split(" ")[0];
}

/** De collega bij een id, met het e-mailadres van toen als de collega weg is. */
export function collegaBij(id: string | null, collegas: Collega[], emailToen?: string | null): Collega | null {
  if (!id) return null;
  return collegas.find((c) => c.user_id === id) || (emailToen ? { user_id: id, email: emailToen, naam: null, functie: null } : null);
}

/* ---------- klanten aan een collega ---------- */

/**
 * Welke collega het naamveld casemanager van een stamkaart bedoelt: de hele
 * naam uit de medewerkers, of anders alleen de voornaam als die bij precies
 * één collega hoort. Een lege of onbekende naam hoort bij niemand.
 */
export function collegaVanCasemanager(casemanager: string | null | undefined, collegas: Collega[]): Collega | null {
  const cm = normaliseer(casemanager);
  if (!cm) return null;
  const vol = collegas.find((c) => normaliseer(c.naam) === cm || normaliseer(c.email) === cm);
  if (vol) return vol;
  const eerste = cm.split(" ")[0];
  const opVoornaam = collegas.filter((c) => normaliseer(voornaamVan(c)) === eerste);
  return opVoornaam.length === 1 ? opVoornaam[0] : null;
}

/** De klanten die op de stamkaart op naam van deze collega staan. */
export function klantenVan(c: Pick<Collega, "user_id">, klanten: WnKlant[], collegas: Collega[]): WnKlant[] {
  return klanten.filter((k) => collegaVanCasemanager(k.casemanager, collegas)?.user_id === c.user_id);
}

/** Welke klanten een waarneming dekt: de gekozen klanten, of anders alle klanten op naam van de afwezige. */
export function gedekteKlanten(w: Pick<Waarneming, "afwezige" | "klant_ids">, klanten: WnKlant[], collegas: Collega[]): WnKlant[] {
  if (w.klant_ids.length > 0) {
    const ids = new Set(w.klant_ids);
    return klanten.filter((k) => ids.has(k.id));
  }
  return klantenVan({ user_id: w.afwezige }, klanten, collegas);
}

/* ---------- tijd ---------- */

const DAG = 86_400_000;
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const isDatum = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(utc(s).getTime());

/** Hele dagen van `van` tot en met `tot`. */
export function duurDagen(van: string, tot: string): number {
  return Math.round((utc(tot).getTime() - utc(van).getTime()) / DAG) + 1;
}

export function dagenTot(iso: string, vandaag: string): number {
  return Math.round((utc(iso).getTime() - utc(vandaag).getTime()) / DAG);
}

export function fase(w: Pick<Waarneming, "van" | "tot">, vandaag: string): Fase {
  if (w.tot < vandaag) return "voorbij";
  if (w.van > vandaag) return "komend";
  return "actief";
}

/** Begint binnen BINNENKORT_DAGEN, of loopt al. */
export function nuOfBinnenkort(w: Pick<Waarneming, "van" | "tot">, vandaag: string, dagen = BINNENKORT_DAGEN): boolean {
  const f = fase(w, vandaag);
  return f === "actief" || (f === "komend" && dagenTot(w.van, vandaag) <= dagen);
}

/** Eerst wat nu loopt (het eerst afgelopen bovenaan), dan wat komt (het eerst op), dan wat geweest is (het laatste eerst). */
export function sorteer<T extends Pick<Waarneming, "van" | "tot">>(ws: T[], vandaag: string): T[] {
  const rang: Record<Fase, number> = { actief: 0, komend: 1, voorbij: 2 };
  return [...ws].sort((a, b) => {
    const fa = fase(a, vandaag), fb = fase(b, vandaag);
    if (fa !== fb) return rang[fa] - rang[fb];
    if (fa === "voorbij") return b.tot.localeCompare(a.tot) || b.van.localeCompare(a.van);
    if (fa === "actief") return a.tot.localeCompare(b.tot) || a.van.localeCompare(b.van);
    return a.van.localeCompare(b.van) || a.tot.localeCompare(b.tot);
  });
}

export function perFase<T extends Pick<Waarneming, "van" | "tot">>(ws: T[], vandaag: string): Record<Fase, T[]> {
  const uit: Record<Fase, T[]> = { actief: [], komend: [], voorbij: [] };
  for (const w of sorteer(ws, vandaag)) uit[fase(w, vandaag)].push(w);
  return uit;
}

/** Twee periodes van dezelfde collega die elkaar raken: geen fout, wel een waarschuwing. */
export function overlapt(w: Pick<Waarneming, "id" | "afwezige" | "van" | "tot">, ws: Pick<Waarneming, "id" | "afwezige" | "van" | "tot">[]): boolean {
  return ws.some((x) => x.id !== w.id && x.afwezige === w.afwezige && x.van <= w.tot && x.tot >= w.van);
}

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "vr 5 dec" */
export function datumKort(iso: string): string {
  const d = utc(iso);
  return `${DAGEN[d.getUTCDay()]} ${d.getUTCDate()} ${MAANDEN_KORT[d.getUTCMonth()]}`;
}

/** "vrijdag 5 december 2026" zonder de dag: "5 december 2026" */
export function datumVol(iso: string): string {
  const d = utc(iso);
  return `${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "ma 1 t/m vr 5 dec", "do 31 dec t/m ma 4 jan", of één dag "vr 5 dec". */
export function periodeTekst(van: string, tot: string): string {
  if (van === tot) return datumKort(van);
  const a = utc(van), b = utc(tot);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${DAGEN[a.getUTCDay()]} ${a.getUTCDate()} t/m ${datumKort(tot)}`;
  }
  return `${datumKort(van)} t/m ${datumKort(tot)}`;
}

/** Hoe het nu zit, in gewone woorden: "nog 3 dagen", "vanaf ma 1 dec", "t/m vr 5 dec". */
export function standTekst(w: Pick<Waarneming, "van" | "tot">, vandaag: string): string {
  const f = fase(w, vandaag);
  if (f === "voorbij") return `tot ${datumKort(w.tot)}`;
  if (f === "komend") {
    const n = dagenTot(w.van, vandaag);
    return n === 1 ? "vanaf morgen" : `vanaf ${datumKort(w.van)}`;
  }
  const rest = dagenTot(w.tot, vandaag);
  return rest === 0 ? "vandaag nog" : rest === 1 ? "t/m morgen" : `t/m ${datumKort(w.tot)}`;
}

/* ---------- wie is er voor een klant ---------- */

export type Dekking = { waarneming: Waarneming; afwezige: Collega | null; waarnemer: Collega | null };

/**
 * Voor een klant: wie neemt nu waar, en wie straks (binnenkort). Een waarneming
 * dekt de klant als de klant gekozen is, of als er niets gekozen is en de klant
 * op de stamkaart op naam van de afwezige staat.
 */
export function wieNeemtWaar(klant: WnKlant, ws: Waarneming[], vandaag: string, collegas: Collega[]): { nu: Dekking | null; straks: Dekking | null } {
  const dekt = (w: Waarneming) =>
    w.klant_ids.length > 0 ? w.klant_ids.includes(klant.id) : collegaVanCasemanager(klant.casemanager, collegas)?.user_id === w.afwezige;
  const maak = (w: Waarneming): Dekking => ({ waarneming: w, afwezige: collegaBij(w.afwezige, collegas, w.afwezige_email), waarnemer: collegaBij(w.waarnemer, collegas, w.waarnemer_email) });
  const relevant = sorteer(ws.filter((w) => nuOfBinnenkort(w, vandaag) && dekt(w)), vandaag);
  const nu = relevant.find((w) => fase(w, vandaag) === "actief");
  const straks = relevant.find((w) => fase(w, vandaag) === "komend");
  return { nu: nu ? maak(nu) : null, straks: straks ? maak(straks) : null };
}

/** De tekst op een pil bij een klant: "Bram neemt waar t/m vr 5 dec" of "Nog geen waarnemer t/m vr 5 dec". */
export function dekkingTekst(d: Dekking, vandaag: string): string {
  const wie = d.waarnemer ? `${voornaamVan(d.waarnemer)} neemt waar` : "Nog geen waarnemer";
  const f = fase(d.waarneming, vandaag);
  if (f === "komend") return `${wie} ${standTekst(d.waarneming, vandaag)} (${voornaamVan(d.afwezige, d.waarneming.afwezige_email)} is er dan niet)`;
  return `${wie} voor ${voornaamVan(d.afwezige, d.waarneming.afwezige_email)}, ${standTekst(d.waarneming, vandaag)}`;
}

/** De pil op een klantkaart of bordkaart: wat er nu speelt, anders wat eraan komt. */
export type DekkingPil = { id: string; tekst: string; soort: "nu" | "straks" | "open" };

export function dekkingPil(d: { nu: Dekking | null; straks: Dekking | null }, vandaag: string): DekkingPil | null {
  const x = d.nu || d.straks;
  if (!x) return null;
  return { id: x.waarneming.id, tekst: dekkingTekst(x, vandaag), soort: !x.waarneming.waarnemer ? "open" : d.nu ? "nu" : "straks" };
}

/** Een klant van de stamkaart in de vorm die de waarneming nodig heeft. */
export function alsWnKlant(k: { id: string; bedrijf: string; status: string; casemanager?: string | null; medewerkers?: number | null; bezoek_plaats?: string | null; post_plaats?: string | null }): WnKlant {
  return { id: k.id, bedrijf: k.bedrijf, status: k.status, casemanager: k.casemanager ?? null, medewerkers: k.medewerkers ?? null, plaats: k.bezoek_plaats || k.post_plaats || null };
}

/* ---------- signalen en het dashboard ---------- */

export type Kort = {
  /** Waar jij nu of binnenkort voor waarneemt. */
  ikNeemWaar: Waarneming[];
  /** Je eigen afwezigheid nu of binnenkort, met of zonder waarnemer. */
  voorMij: Waarneming[];
  /** Voor het beheer: afwezigheid nu of binnenkort zonder waarnemer. */
  teRegelen: Waarneming[];
  /** Hoeveel collega's er vandaag niet zijn. */
  afwezigNu: number;
};

export function kort(ws: Waarneming[], userId: string, vandaag: string, beheer: boolean): Kort {
  const relevant = sorteer(ws.filter((w) => nuOfBinnenkort(w, vandaag)), vandaag);
  return {
    ikNeemWaar: relevant.filter((w) => w.waarnemer === userId),
    voorMij: relevant.filter((w) => w.afwezige === userId),
    teRegelen: beheer ? relevant.filter((w) => !w.waarnemer) : [],
    afwezigNu: new Set(ws.filter((w) => fase(w, vandaag) === "actief").map((w) => w.afwezige)).size,
  };
}

/* ---------- het formulier ---------- */

export type WaarnemingInvoer = { afwezige: string; van: string; tot: string; waarnemer: string | null; klant_ids: string[]; toelichting: string | null };
export type WaarnemingFout =
  | "waarneming-datum" | "waarneming-volgorde" | "waarneming-voorbij" | "waarneming-lang"
  | "waarneming-wie" | "waarneming-zelf" | "waarneming-toelichting" | "waarneming-klanten";

/**
 * Het formulier lezen. Wie het invult is de afwezige, behalve als het beheer
 * iemand anders kiest. De waarnemer mag leeg (nog te regelen), maar moet een
 * collega zijn die kan waarnemen en niet de afwezige zelf. Klanten: leeg of
 * "alle" = alle klanten op naam van de afwezige.
 */
export function leesWaarneming(
  formData: FormData,
  o: { userId: string; beheer: boolean; collegas: Collega[]; vandaag: string },
): WaarnemingInvoer | { fout: WaarnemingFout } {
  const kan = (id: string) => o.collegas.some((c) => c.user_id === id);
  const gekozen = String(formData.get("afwezige") || "");
  const afwezige = o.beheer && isUuid(gekozen) && kan(gekozen) ? gekozen : o.userId;
  const van = String(formData.get("van") || "");
  const tot = String(formData.get("tot") || "");
  if (!isDatum(van) || !isDatum(tot)) return { fout: "waarneming-datum" };
  if (tot < van) return { fout: "waarneming-volgorde" };
  if (tot < o.vandaag) return { fout: "waarneming-voorbij" };
  if (duurDagen(van, tot) > MAX_DAGEN) return { fout: "waarneming-lang" };
  const wn = String(formData.get("waarnemer") || "");
  let waarnemer: string | null = null;
  if (wn) {
    if (!isUuid(wn) || !kan(wn)) return { fout: "waarneming-wie" };
    if (wn === afwezige) return { fout: "waarneming-zelf" };
    waarnemer = wn;
  }
  const alle = formData.get("klanten") === "alle";
  const klant_ids = alle ? [] : [...new Set(formData.getAll("klant").map(String).filter(isUuid))];
  if (klant_ids.length > MAX_KLANTEN) return { fout: "waarneming-klanten" };
  const toelichting = String(formData.get("toelichting") || "").trim();
  if (toelichting.length > MAX_TOELICHTING) return { fout: "waarneming-toelichting" };
  return { afwezige, van, tot, waarnemer, klant_ids, toelichting: toelichting || null };
}

/* ---------- mails ---------- */

export type Brief = { onderwerp: string; alineas: string[]; groet: string[] };

const lijstZin = (namen: string[]) => {
  if (namen.length === 0) return "";
  if (namen.length <= 5) return namen.length === 1 ? namen[0] : `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
  return `${namen.slice(0, 4).join(", ")} en nog ${namen.length - 4} andere`;
};

/** Aan de waarnemer: je neemt waar voor een collega. */
export function waarnemerBrief(b: { waarnemer: string; afwezige: string; van: string; tot: string; klanten: string[]; toelichting: string | null; link: string; doorBeheer: boolean }): Brief {
  const periode = periodeTekst(b.van, b.tot);
  const alineas = [
    `Hoi ${b.waarnemer},`,
    b.doorBeheer
      ? `Het beheer heeft je als waarnemer gezet voor ${b.afwezige}: ${periode} (${duurDagen(b.van, b.tot)} ${duurDagen(b.van, b.tot) === 1 ? "dag" : "dagen"}).`
      : `${b.afwezige} is er niet ${periode} (${duurDagen(b.van, b.tot)} ${duurDagen(b.van, b.tot) === 1 ? "dag" : "dagen"}) en heeft jou als waarnemer gezet.`,
    b.klanten.length === 0
      ? "Op de stamkaarten staat nog geen klant op naam; kijk even met het beheer wat er overgenomen moet worden."
      : `Je neemt ${b.klanten.length === 1 ? "één klant" : `${b.klanten.length} klanten`} over: ${lijstZin(b.klanten)}. Op de klantenkaart en het klantenbord staat zolang jouw naam erbij.`,
  ];
  if (b.toelichting) alineas.push(`Wat je moet weten: ${b.toelichting}`);
  alineas.push(`Alles staat op de kaart van de waarneming: ${b.link}`);
  return { onderwerp: `Je neemt waar voor ${b.afwezige}: ${periode}`, alineas, groet: ["Groet,", "Het beheer van React2u"] };
}

/** Aan de afwezige, als het beheer het regelde of aanpaste. */
export function afwezigeBrief(b: { afwezige: string; waarnemer: string | null; van: string; tot: string; link: string }): Brief {
  const periode = periodeTekst(b.van, b.tot);
  return {
    onderwerp: `Je waarneming ${periode} is geregeld`,
    alineas: [
      `Hoi ${b.afwezige},`,
      b.waarnemer
        ? `Het beheer heeft vastgelegd dat ${b.waarnemer} voor je waarneemt ${periode}. Je klanten zien dat op de klantenkaart.`
        : `Het beheer heeft vastgelegd dat je er niet bent ${periode}. Er is nog geen waarnemer; dat regelt het beheer met je.`,
      `Klopt er iets niet? Kijk op de kaart van de waarneming: ${b.link}`,
    ],
    groet: ["Groet,", "Het beheer van React2u"],
  };
}

export function inkorten(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}
