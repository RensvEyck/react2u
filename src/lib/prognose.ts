/**
 * Prognose van de werkdruk (migratie 0049): hoeveel werknemers React2u de
 * komende twaalf maanden begeleidt, hoeveel casemanagers daarvoor nodig zijn,
 * en hoe dat zich verhoudt tot de bezetting en tot wat de casemanagers zelf in
 * hun weekevaluatie zeggen.
 *
 * De bronnen, van zeker naar verwacht:
 * - lopende klanten (klantenbord, status akkoord, inrichten of klant): het
 *   aantal werknemers op de stamkaart, of anders dat op hun getekende offerte;
 * - getekende offertes die nog moeten ingaan, vanaf hun ingangsdatum;
 * - de pijplijn: openstaande offertes, gewogen met de kans op tekenen (de
 *   eigen hitrate, of wat Rens instelt).
 *
 * Van werknemers naar casemanagers met één norm: hoeveel werknemers één fte
 * casemanager aankan. Zonder ingestelde norm rekent de prognose hem uit met de
 * huidige verhouding: de werknemers van de lopende klanten gedeeld door de fte
 * casemanagement van nu. Daarbovenop eenmalig werk: inrichten van een nieuwe
 * klant en eenmalige diensten (RI&E, PAGO, training, trajecten), met urennormen
 * die Rens instelt. Zonder norm tellen die niet mee; er wordt niets uit een
 * prijs afgeleid.
 *
 * Puur, zonder database. Een maand is jjjj-mm; een datum jjjj-mm-dd.
 */

import { bedrijfSleutel } from "./klanten";
import { maandNaam, plusMaanden } from "./omzet";
import { VORMEN, type Vorm } from "./offertes";
import { maandVanWeek } from "./uren";
import { gemiddelde, type Antwoorden } from "./weekevaluatie";

/* ---------- normen ---------- */

/** De vormen die een lopend abonnement zijn en dus doorlopend casemanagement vragen. */
export const ABONNEMENT_VORMEN: Vorm[] = ["verzuimbegeleiding", "reflex"];
/** De vormen die eenmalig werk zijn, met een urennorm per opdracht. */
export const EENMALIGE_VORMEN = ["rie", "pago", "verzuimtraining", "spoor2", "werkfit", "arbeidsdeskundig"] as const;
export type EenmaligeVorm = (typeof EENMALIGE_VORMEN)[number];

export function isAbonnement(vorm: string | null | undefined): boolean {
  return ABONNEMENT_VORMEN.includes((vorm || "verzuimbegeleiding") as Vorm);
}
export function isEenmalig(vorm: string | null | undefined): vorm is EenmaligeVorm {
  return (EENMALIGE_VORMEN as readonly string[]).includes(vorm || "");
}

export type Normen = {
  /** Hoeveel werknemers één fte casemanager aankan. Leeg: uitrekenen met de huidige verhouding. */
  werknemersPerFte: number | null;
  /** Uren in een volle werkweek, om contracturen naar fte te rekenen. */
  urenPerFte: number;
  /** Extra uren in de maand dat een nieuwe klant start (inrichten, import, kennismaken). Leeg: telt niet mee. */
  inrichtingUren: number | null;
  /** Zonder ingangsdatum: zoveel weken na tekenen begint de dienstverlening. */
  inrichtingWeken: number;
  /** Uren per eenmalige opdracht, per vorm. Leeg: telt niet mee. */
  urenPerOpdracht: Partial<Record<EenmaligeVorm, number>>;
  /** Hoeveel maanden werven en inwerken kosten: zo ver vooruit komt het advies. */
  wervingsMaanden: number;
  /** De kans dat een openstaande offerte getekend wordt, in procenten. Leeg: de eigen hitrate. */
  kansPijplijn: number | null;
};

export const STANDAARD_NORMEN: Normen = {
  werknemersPerFte: null,
  urenPerFte: 36,
  inrichtingUren: null,
  inrichtingWeken: 4,
  urenPerOpdracht: {},
  wervingsMaanden: 3,
  kansPijplijn: null,
};

/** Werkweken per maand, om uren per maand naar fte te rekenen (52 / 12). */
export const WEKEN_PER_MAAND = 52 / 12;

const getal = (w: unknown, min: number, max: number): number | null => {
  const n = typeof w === "number" ? w : typeof w === "string" && w.trim() ? Number(w.trim().replace(/\./g, "").replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
};

/** De normen uit de database (of een formulier), aangevuld met de standaard. Onzin valt terug op de standaard. */
export function leesNormen(ruw: unknown): Normen {
  const o = (ruw && typeof ruw === "object" ? ruw : {}) as Record<string, unknown>;
  const per = (o.urenPerOpdracht && typeof o.urenPerOpdracht === "object" ? o.urenPerOpdracht : {}) as Record<string, unknown>;
  const urenPerOpdracht: Partial<Record<EenmaligeVorm, number>> = {};
  for (const v of EENMALIGE_VORMEN) {
    const n = getal(per[v], 0.5, 2000);
    if (n !== null) urenPerOpdracht[v] = n;
  }
  return {
    werknemersPerFte: getal(o.werknemersPerFte, 1, 100000),
    urenPerFte: getal(o.urenPerFte, 20, 48) ?? STANDAARD_NORMEN.urenPerFte,
    inrichtingUren: getal(o.inrichtingUren, 0.5, 500),
    inrichtingWeken: getal(o.inrichtingWeken, 0, 26) ?? STANDAARD_NORMEN.inrichtingWeken,
    urenPerOpdracht,
    wervingsMaanden: getal(o.wervingsMaanden, 0, 12) ?? STANDAARD_NORMEN.wervingsMaanden,
    kansPijplijn: getal(o.kansPijplijn, 0, 100),
  };
}

/* ---------- datums ---------- */

const DAG = 86_400_000;
const plusDagen = (datum: string, n: number) => new Date(new Date(`${datum.slice(0, 10)}T00:00:00Z`).getTime() + n * DAG).toISOString().slice(0, 10);

/** De komende `n` maanden vanaf de maand van vandaag, die meegerekend. */
export function maandenVanaf(vandaag: string, n: number): string[] {
  const start = vandaag.slice(0, 7);
  return Array.from({ length: n }, (_, i) => plusMaanden(start, i));
}

/* ---------- de invoer ---------- */

export type KlantIn = {
  id: string;
  bedrijf: string;
  status: string;
  medewerkers: number | null;
  startdatum: string | null;
  casemanager: string | null;
};

export type OfferteIn = {
  id: string;
  nummer: string;
  bedrijf: string;
  vorm: string | null;
  status: string;
  medewerkers: number | null;
  /** Het aantal zoals het getekend is, als dat er is. */
  getekend_medewerkers?: number | null;
  ingangsdatum: string | null;
  getekend_at: string | null;
  verstuurd_at: string | null;
  geldig_tot: string | null;
  bekeken_at?: string | null;
  /** Abonnement beëindigd (0035): telt niet meer mee. */
  gestopt?: boolean;
};

export type ContractIn = { bedrijf: string; status: string; ingangsdatum: string | null };

export type StartBron = "offerte" | "kaart" | "contract" | "getekend" | "verwacht" | "loopt";

/** Eén klant of offerte in de prognose: hoeveel werknemers, vanaf wanneer, en hoe zeker. */
export type Bijdrage = {
  sleutel: string;
  bedrijf: string;
  soort: "lopend" | "getekend" | "pijplijn";
  werknemers: number | null;
  /** Eerste dag van de dienstverlening; leeg = loopt al. */
  start: string | null;
  startBron: StartBron;
  /** 1 voor lopend en getekend; de kans op tekenen voor de pijplijn. */
  kans: number;
  klantId: string | null;
  offerteId: string | null;
  offerteNummer: string | null;
  casemanager: string | null;
};

export type Opdracht = { vorm: EenmaligeVorm; bedrijf: string; maand: string; kans: number; offerteId: string; offerteNummer: string };

const ACTIEF = ["akkoord", "inrichten", "klant"];

/**
 * De kans op tekenen in procenten: de ingestelde, of de eigen hitrate (van de
 * afgeronde offertes: het deel dat getekend is), of anders een derde.
 */
export function kansVan(normen: Pick<Normen, "kansPijplijn">, hitrate: number | null): number {
  if (normen.kansPijplijn !== null) return normen.kansPijplijn;
  return hitrate ?? 33;
}

/** Hoeveel dagen het van versturen tot tekenen duurt (mediaan), of drie weken als er niets te meten is. */
export function doorlooptijd(offertes: Pick<OfferteIn, "status" | "verstuurd_at" | "getekend_at">[]): number {
  const dagen = offertes
    .filter((o) => o.status === "getekend" && o.verstuurd_at && o.getekend_at)
    .map((o) => Math.max(0, Math.round((new Date(o.getekend_at!).getTime() - new Date(o.verstuurd_at!).getTime()) / DAG)))
    .sort((a, b) => a - b);
  if (!dagen.length) return 21;
  return dagen.length % 2 ? dagen[(dagen.length - 1) / 2] : Math.round((dagen[dagen.length / 2 - 1] + dagen[dagen.length / 2]) / 2);
}

/**
 * Alle bijdragen: de lopende en komende klanten (één per bedrijf, samen met hun
 * getekende offerte), getekende offertes zonder kaart, en de pijplijn. Een
 * openstaande offerte voor een bedrijf dat al klant is telt niet in de
 * pijplijn: die gaat meestal over iets erbij, niet over nieuwe werknemers.
 */
export function bijdragen(i: {
  klanten: KlantIn[];
  offertes: OfferteIn[];
  contracten: ContractIn[];
  normen: Normen;
  kans: number;
  vandaag: string;
}): { bijdragen: Bijdrage[]; opdrachten: Opdracht[] } {
  const { normen, vandaag } = i;
  const doorloop = doorlooptijd(i.offertes);
  const getekendPer = new Map<string, OfferteIn>();
  for (const o of i.offertes) {
    if (o.status !== "getekend" || o.gestopt || !isAbonnement(o.vorm)) continue;
    const s = bedrijfSleutel(o.bedrijf);
    const huidig = getekendPer.get(s);
    if (!huidig || (o.getekend_at || "") > (huidig.getekend_at || "")) getekendPer.set(s, o);
  }
  const contractPer = new Map<string, string>();
  for (const c of i.contracten) {
    if (c.status !== "getekend" || !c.ingangsdatum) continue;
    const s = bedrijfSleutel(c.bedrijf);
    const huidig = contractPer.get(s);
    if (!huidig || c.ingangsdatum > huidig) contractPer.set(s, c.ingangsdatum);
  }
  const uit: Bijdrage[] = [];
  const gezien = new Set<string>();
  for (const k of i.klanten) {
    if (!ACTIEF.includes(k.status)) continue;
    const s = bedrijfSleutel(k.bedrijf);
    if (gezien.has(s)) continue;
    gezien.add(s);
    const o = getekendPer.get(s);
    const werknemers = k.medewerkers ?? o?.getekend_medewerkers ?? o?.medewerkers ?? null;
    let start: string | null = null;
    let startBron: StartBron = "loopt";
    if (o?.ingangsdatum) [start, startBron] = [o.ingangsdatum, "offerte"];
    else if (k.startdatum) [start, startBron] = [k.startdatum, "kaart"];
    else if (contractPer.get(s)) [start, startBron] = [contractPer.get(s)!, "contract"];
    else if (k.status !== "klant" && o?.getekend_at) [start, startBron] = [plusDagen(o.getekend_at, normen.inrichtingWeken * 7), "getekend"];
    else if (k.status !== "klant") [start, startBron] = [plusDagen(vandaag, normen.inrichtingWeken * 7), "verwacht"];
    uit.push({
      sleutel: s, bedrijf: k.bedrijf, soort: start && start > vandaag ? "getekend" : "lopend", werknemers, start, startBron, kans: 1,
      klantId: k.id, offerteId: o?.id ?? null, offerteNummer: o?.nummer ?? null, casemanager: k.casemanager,
    });
  }
  for (const [s, o] of getekendPer) {
    if (gezien.has(s)) continue;
    gezien.add(s);
    const [start, startBron]: [string, StartBron] = o.ingangsdatum
      ? [o.ingangsdatum, "offerte"]
      : contractPer.get(s)
        ? [contractPer.get(s)!, "contract"]
        : [plusDagen(o.getekend_at || vandaag, normen.inrichtingWeken * 7), "getekend"];
    uit.push({
      sleutel: s, bedrijf: o.bedrijf, soort: start > vandaag ? "getekend" : "lopend", werknemers: o.getekend_medewerkers ?? o.medewerkers ?? null,
      start, startBron, kans: 1, klantId: null, offerteId: o.id, offerteNummer: o.nummer, casemanager: null,
    });
  }
  const kans = Math.max(0, Math.min(100, i.kans)) / 100;
  const open = i.offertes.filter((o) => o.status === "verstuurd" && !(o.geldig_tot && o.geldig_tot < vandaag));
  for (const o of open) {
    if (!isAbonnement(o.vorm)) continue;
    const s = bedrijfSleutel(o.bedrijf);
    if (gezien.has(s)) continue;
    gezien.add(s);
    const verwachtGetekend = [plusDagen(o.verstuurd_at || vandaag, doorloop), vandaag].sort().pop()!;
    const [start, startBron]: [string, StartBron] = o.ingangsdatum
      ? [o.ingangsdatum, "offerte"]
      : [plusDagen(verwachtGetekend, normen.inrichtingWeken * 7), "verwacht"];
    uit.push({
      sleutel: s, bedrijf: o.bedrijf, soort: "pijplijn", werknemers: o.medewerkers, start, startBron, kans,
      klantId: null, offerteId: o.id, offerteNummer: o.nummer, casemanager: null,
    });
  }
  // Eenmalig werk: getekend en nog niet uitgevoerd (de maand van ingang of een maand na tekenen), en de pijplijn.
  const opdrachten: Opdracht[] = [];
  const dezeMaand = vandaag.slice(0, 7);
  for (const o of i.offertes) {
    if (!isEenmalig(o.vorm)) continue;
    if (o.status === "getekend") {
      const maand = (o.ingangsdatum || plusDagen(o.getekend_at || vandaag, 30)).slice(0, 7);
      if (maand >= dezeMaand) opdrachten.push({ vorm: o.vorm, bedrijf: o.bedrijf, maand, kans: 1, offerteId: o.id, offerteNummer: o.nummer });
    } else if (o.status === "verstuurd" && !(o.geldig_tot && o.geldig_tot < vandaag)) {
      const verwacht = [plusDagen(o.verstuurd_at || vandaag, doorloop + 30), vandaag].sort().pop()!;
      opdrachten.push({ vorm: o.vorm, bedrijf: o.bedrijf, maand: (o.ingangsdatum || verwacht).slice(0, 7), kans, offerteId: o.id, offerteNummer: o.nummer });
    }
  }
  return { bijdragen: uit, opdrachten };
}

/* ---------- de bezetting ---------- */

export type MedewerkerIn = { id: string; naam: string; functie: string | null; contracturen: number; actief: boolean; user_id?: string | null };

/** Wie meetelt in de capaciteit casemanagement: actief, met "casemanager" in de functie. */
export function isCasemanager(m: Pick<MedewerkerIn, "functie" | "actief">): boolean {
  return m.actief && /casemanag/i.test(m.functie || "");
}

export function fteVan(contracturen: number, urenPerFte: number): number {
  return Math.round((contracturen / urenPerFte) * 100) / 100;
}

export type Scenario = { extraFte: number; vanaf: string | null };

export function bezetting(medewerkers: MedewerkerIn[], urenPerFte: number): number {
  return Math.round(medewerkers.filter(isCasemanager).reduce((s, m) => s + fteVan(m.contracturen, urenPerFte), 0) * 100) / 100;
}

/* ---------- de norm ---------- */

/**
 * De huidige verhouding: werknemers van de lopende klanten per fte
 * casemanagement. Alleen als elke lopende klant een aantal heeft; anders is
 * het getal te laag en zou de prognose te weinig mensen vragen.
 */
export function huidigeVerhouding(b: Bijdrage[], fte: number): { verhouding: number | null; werknemers: number; zonderAantal: number } {
  const lopend = b.filter((x) => x.soort === "lopend");
  const werknemers = lopend.reduce((s, x) => s + (x.werknemers ?? 0), 0);
  const zonderAantal = lopend.filter((x) => x.werknemers === null).length;
  return { verhouding: !zonderAantal && fte > 0 && werknemers > 0 ? Math.round(werknemers / fte) : null, werknemers, zonderAantal };
}

/* ---------- per maand ---------- */

export type PrognoseMaand = {
  maand: string;
  /** Werknemers van lopende en getekende klanten. */
  werknemersZeker: number;
  /** Plus de pijplijn, gewogen met de kans. */
  werknemersVerwacht: number;
  nieuweKlanten: { bedrijf: string; kans: number }[];
  inrichtingUren: number;
  eenmaligUren: number;
  /** Benodigde fte casemanagement, of null zonder norm. */
  nodigZeker: number | null;
  nodigVerwacht: number | null;
  bezetting: number;
  /** Bezetting min nodig (verwacht); negatief is een tekort. */
  ruimte: number | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Valt deze bijdrage in deze maand: loopt al, of start uiterlijk op de laatste dag van de maand. */
function telt(b: Pick<Bijdrage, "start">, maand: string): boolean {
  return !b.start || b.start.slice(0, 7) <= maand;
}

export function prognose(i: {
  bijdragen: Bijdrage[];
  opdrachten: Opdracht[];
  normen: Normen;
  norm: number | null;
  bezetting: number;
  scenario?: Scenario;
  maanden: string[];
}): PrognoseMaand[] {
  const { normen, norm } = i;
  return i.maanden.map((maand) => {
    let zeker = 0;
    let verwacht = 0;
    const nieuw: { bedrijf: string; kans: number }[] = [];
    for (const b of i.bijdragen) {
      if (b.start && b.start.slice(0, 7) === maand && b.soort !== "lopend") nieuw.push({ bedrijf: b.bedrijf, kans: b.kans });
      if (!telt(b, maand)) continue;
      const n = b.werknemers ?? 0;
      if (b.soort === "pijplijn") verwacht += n * b.kans;
      else {
        zeker += n;
        verwacht += n;
      }
    }
    const inrichting = normen.inrichtingUren ? nieuw.reduce((s, x) => s + x.kans * normen.inrichtingUren!, 0) : 0;
    const eenmalig = i.opdrachten
      .filter((o) => o.maand === maand)
      .reduce((s, o) => s + (normen.urenPerOpdracht[o.vorm] ?? 0) * o.kans, 0);
    const urenFte = (inrichting + eenmalig) / (normen.urenPerFte * WEKEN_PER_MAAND);
    const nieuwZeker = nieuw.filter((x) => x.kans >= 1).length;
    const urenZekerFte = ((normen.inrichtingUren ?? 0) * nieuwZeker + i.opdrachten.filter((o) => o.maand === maand && o.kans >= 1).reduce((s, o) => s + (normen.urenPerOpdracht[o.vorm] ?? 0), 0)) / (normen.urenPerFte * WEKEN_PER_MAAND);
    const extra = i.scenario && i.scenario.extraFte && (!i.scenario.vanaf || maand >= i.scenario.vanaf) ? i.scenario.extraFte : 0;
    const bez = r2(i.bezetting + extra);
    const nodigZeker = norm ? r1(zeker / norm + urenZekerFte) : null;
    const nodigVerwacht = norm ? r1(verwacht / norm + urenFte) : null;
    return {
      maand, werknemersZeker: Math.round(zeker), werknemersVerwacht: Math.round(verwacht), nieuweKlanten: nieuw,
      inrichtingUren: Math.round(inrichting), eenmaligUren: Math.round(eenmalig),
      nodigZeker, nodigVerwacht, bezetting: bez, ruimte: nodigVerwacht === null ? null : r1(bez - nodigVerwacht),
    };
  });
}

export type Advies =
  | { soort: "werven"; maand: string; tekort: number; uiterlijk: string; zeker: boolean }
  | { soort: "ruimte"; tot: string | null }
  | { soort: "geen-norm" };

/**
 * Wanneer het krap wordt, en wanneer je dan moet beginnen met werven: de eerste
 * maand waarin de bezetting (met een kwart fte speling) niet genoeg is, min de
 * wervingstijd. Eerst de zekere vraag; is die genoeg, dan de verwachte.
 */
export function advies(maanden: PrognoseMaand[], wervingsMaanden: number, vandaag: string): Advies {
  if (!maanden.length || maanden[0].nodigZeker === null) return { soort: "geen-norm" };
  const SPELING = 0.25;
  const zeker = maanden.find((m) => m.nodigZeker !== null && m.nodigZeker > m.bezetting + SPELING);
  const verwacht = maanden.find((m) => m.nodigVerwacht !== null && m.nodigVerwacht > m.bezetting + SPELING);
  const eerste = zeker ?? verwacht;
  if (!eerste) return { soort: "ruimte", tot: null };
  const tekort = r1((zeker ? eerste.nodigZeker! : eerste.nodigVerwacht!) - eerste.bezetting);
  const uiterlijk = [plusMaanden(eerste.maand, -Math.round(wervingsMaanden)), vandaag.slice(0, 7)].sort().pop()!;
  return { soort: "werven", maand: eerste.maand, tekort, uiterlijk, zeker: Boolean(zeker) };
}

/** "maart 2027". */
export const maandLang = (maand: string) => maandNaam(maand, true);

/** "2,4" of "2". */
export function fteTekst(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

export function vormLabel(v: string): string {
  return (VORMEN as Record<string, { kort: string }>)[v]?.kort ?? v;
}

/* ---------- de weekevaluaties ---------- */

export type EvaluatieIn = { user_id: string; week: string; antwoorden: Antwoorden };

export type Gemeten = { maand: string; tijd: number | null; energie: number | null; emotie: number | null; n: number };

/** Per maand het teamgemiddelde voor tijd, energie en emotie, uit de weekevaluaties (een week hoort bij de maand van zijn donderdag). */
export function gemetenPerMaand(evaluaties: EvaluatieIn[], maanden: string[], alleen?: Set<string>): Gemeten[] {
  return maanden.map((maand) => {
    const rijen = evaluaties.filter((e) => maandVanWeek(e.week) === maand && (!alleen || alleen.has(e.user_id)));
    const gem = (k: "tijd" | "energie" | "emotie") => gemiddelde(rijen.map((e) => e.antwoorden[k]).filter((x): x is number => typeof x === "number"));
    return { maand, tijd: gem("tijd"), energie: gem("energie"), emotie: gem("emotie"), n: rijen.length };
  });
}

export type Draagkracht = "krap" | "redelijk" | "ruim";

/** Hoe het team "werk paste in de tijd" beoordeelt: onder de 6 krap, onder de 7 redelijk, daarboven ruim. */
export function draagkracht(tijd: number | null): Draagkracht | null {
  if (tijd === null) return null;
  return tijd < 6 ? "krap" : tijd < 7 ? "redelijk" : "ruim";
}

/** Gemiddelde over de laatste weken, voor één schaal. */
export function recent(evaluaties: EvaluatieIn[], sinds: string, k: "tijd" | "energie" | "emotie", alleen?: Set<string>): { gem: number | null; n: number } {
  const w = evaluaties.filter((e) => e.week >= sinds && (!alleen || alleen.has(e.user_id))).map((e) => e.antwoorden[k]).filter((x): x is number => typeof x === "number");
  return { gem: gemiddelde(w), n: w.length };
}

/* ---------- per casemanager ---------- */

const schoon = (s: string | null | undefined) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").trim().split(/\s+/).filter(Boolean);

/**
 * Is de casemanager op de kaart ("Susanne" of "Susanne Linders") dezelfde als
 * de medewerker ("Susanne Linders")? Hele naam gelijk, of de voornaam gelijk als
 * er op de kaart alleen een voornaam staat.
 */
export function zelfdePersoon(opKaart: string | null | undefined, naam: string | null | undefined): boolean {
  const a = schoon(opKaart);
  const b = schoon(naam);
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  return a.length === 1 && a[0].length >= 3 && a[0] === b[0];
}

export type Radar = {
  medewerker: MedewerkerIn;
  fte: number;
  /** Werknemers van de lopende klanten op zijn naam. */
  werknemers: number;
  klanten: number;
  /** Komt er de komende maanden bij (getekend, op zijn naam). */
  erbij: number;
  /** Werknemers gedeeld door wat hij volgens de norm aankan, in procenten. */
  bezetting: number | null;
  tijd: number | null;
  energie: number | null;
  evaluaties: number;
};

/**
 * De werkdruk per casemanager: zijn portefeuille (de klanten met zijn naam op
 * de kaart) tegenover wat hij volgens de norm aankan, naast wat hij de laatste
 * weken zelf invulde voor tijd en energie. Zo zie je niet alleen hoe het voelt,
 * maar ook waarom.
 */
export function radar(i: { medewerkers: MedewerkerIn[]; bijdragen: Bijdrage[]; evaluaties: EvaluatieIn[]; norm: number | null; urenPerFte: number; sinds: string }): Radar[] {
  return i.medewerkers.filter(isCasemanager).map((m) => {
    const fte = fteVan(m.contracturen, i.urenPerFte);
    const eigen = i.bijdragen.filter((b) => b.soort !== "pijplijn" && zelfdePersoon(b.casemanager, m.naam));
    const lopend = eigen.filter((b) => b.soort === "lopend");
    const werknemers = lopend.reduce((s, b) => s + (b.werknemers ?? 0), 0);
    const erbij = eigen.filter((b) => b.soort === "getekend").reduce((s, b) => s + (b.werknemers ?? 0), 0);
    const zelf = m.user_id ? new Set([m.user_id]) : new Set<string>();
    const t = recent(i.evaluaties, i.sinds, "tijd", zelf);
    const e = recent(i.evaluaties, i.sinds, "energie", zelf);
    return {
      medewerker: m, fte, werknemers, klanten: lopend.length, erbij,
      bezetting: i.norm && fte > 0 ? Math.round((werknemers / (i.norm * fte)) * 100) : null,
      tijd: m.user_id ? t.gem : null, energie: m.user_id ? e.gem : null, evaluaties: m.user_id ? t.n : 0,
    };
  });
}
