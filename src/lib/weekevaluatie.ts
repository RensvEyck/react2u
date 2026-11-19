/**
 * Weekevaluatie (migraties 0044 en 0045): de vaste vragen in drie lagen, welke
 * weken je nog mag invullen, kwartalen, gemiddelden en trends, de signalen bij
 * twee zware weken, wat er voor de kwartaalmeeting op tafel komt (doelen,
 * thema's, bespreekpunten, de maandvragen), wie welke week miste, de tekst van
 * de mails en de rijen voor de export.
 *
 * Puur, zonder database. Een week is zijn maandag (jjjj-mm-dd, ISO-week), net
 * als bij de uren (lib/uren.ts). Een week hoort bij de maand en het kwartaal
 * van zijn donderdag, zoals het ISO-weeknummer zelf.
 */

import { maandagVan, maandVanWeek, plusWeken, weekBereik, weekNummer } from "./uren";

/* ---------- de vragen ---------- */

/**
 * Wanneer een vraag gesteld wordt: elke week, in de laatste week van de maand
 * (toewijding en groei schommelen niet per week, en wekelijks vragen maakt
 * moe), of in de laatste week van het kwartaal (de terugblik voor de meeting).
 */
export type Moment = "week" | "maand" | "kwartaal";

/** Waar een vraag over gaat; zo groepeert het formulier en het overzicht. */
export type Thema = "werkgeluk" | "druk" | "kennis" | "totaal" | "toewijding" | "blijven";

export const THEMA_LABEL: Record<Thema, string> = {
  werkgeluk: "Werkgeluk",
  druk: "Druk",
  kennis: "Kennis",
  totaal: "Alles bij elkaar",
  toewijding: "Toewijding",
  blijven: "Blijven",
};

export const WEEK_SCHALEN = ["energie", "plezier", "tijd", "emotie", "herstel", "kennis", "cijfer"] as const;
export const MAAND_SCHALEN = ["trots", "inzet", "waardering", "ruimte", "geleerd", "steun"] as const;
export const KWARTAAL_SCHALEN = ["blijven"] as const;
export type Schaal = (typeof WEEK_SCHALEN)[number] | (typeof MAAND_SCHALEN)[number] | (typeof KWARTAAL_SCHALEN)[number];

export const TEKST_SLEUTELS = [
  "cijfers_toelichting", "hoogtepunt", "knelpunt", "kennis_mist", "beter", "nodig", "volgende_week", "melding",
  "maand_toelichting", "blijven_waarom", "kwartaal_hoogtepunt", "kwartaal_anders",
] as const;
export type Tekstvraag = (typeof TEKST_SLEUTELS)[number];

/** Waar een open vraag in het formulier staat: bij de cijfers, in eigen woorden, bij melden, bij de maandvragen of in de terugblik. */
export type Blok = "cijfers" | "woorden" | "melden" | "maand" | "terugblik";

export type Keuze = { sleutel: string; label: string };
export type KeuzeVeld = "knelpunt_themas" | "kennis_themas" | "melding_soort";

/** Waar je tegenaan liep, als thema: per kwartaal te tellen. */
export const KNELPUNT_THEMAS: Keuze[] = [
  { sleutel: "werkdruk", label: "Werkdruk" },
  { sleutel: "kennis", label: "Kennis" },
  { sleutel: "klant", label: "Klant of werkgever" },
  { sleutel: "samenwerking", label: "Samenwerking" },
  { sleutel: "systemen", label: "Systemen" },
  { sleutel: "planning", label: "Planning" },
  { sleutel: "anders", label: "Iets anders" },
];

/** Welke kennis je miste: per kwartaal opgeteld is dat het opleidingsplan. */
export const KENNIS_THEMAS: Keuze[] = [
  { sleutel: "wetgeving", label: "Wet poortwachter en WIA" },
  { sleutel: "reintegratie", label: "Re-integratie spoor 1 en 2" },
  { sleutel: "gesprek", label: "Gesprekstechniek" },
  { sleutel: "systemen", label: "XpertSuite en systemen" },
  { sleutel: "sales", label: "Sales en offertes" },
  { sleutel: "anders", label: "Iets anders" },
];

/** Wat voor melding het is: één keuze, zodat Rens in één oogopslag ziet of het een zorg of een compliment is. */
export const MELDING_SOORTEN: Keuze[] = [
  { sleutel: "zorg", label: "Iets wat niet goed gaat" },
  { sleutel: "idee", label: "Een idee" },
  { sleutel: "compliment", label: "Een compliment" },
  { sleutel: "vraag", label: "Een vraag" },
  { sleutel: "anders", label: "Iets anders" },
];

export const KEUZES: Record<KeuzeVeld, Keuze[]> = { knelpunt_themas: KNELPUNT_THEMAS, kennis_themas: KENNIS_THEMAS, melding_soort: MELDING_SOORTEN };

/** Keuzes waarvan er maar één mag (rondjes in plaats van vinkjes). Bewaard als lijst met één element, net als de rest. */
export const ENKELE_KEUZE: KeuzeVeld[] = ["melding_soort"];

export type SchaalVraag = {
  sleutel: Schaal; soort: "schaal"; moment: Moment; thema: Thema;
  label: string; kort: string; hint: string; laag: string; hoog: string;
};
export type TekstVraag = {
  sleutel: Tekstvraag; soort: "tekst"; moment: Moment; thema: Thema; blok: Blok;
  label: string; kort: string; hint: string; voorbeeld: string;
  /** Een rij keuzes erboven, die per kwartaal geteld worden. */
  keuzes?: KeuzeVeld;
  /** Alleen gevraagd als deze schaal laag is: wie zijn kennis een 8 geeft, hoeft niet te zeggen wat hij miste. */
  alleenAls?: { schaal: Schaal; max: number };
  /** Kan aangevinkt worden om mee te nemen naar de kwartaalmeeting. */
  bespreekbaar: boolean;
};
export type Vraag = SchaalVraag | TekstVraag;

const EENS = { laag: "helemaal niet mee eens", hoog: "helemaal mee eens" };

/**
 * De vaste lijst, in de volgorde van het formulier. Elke schaal is een cijfer
 * van 1 tot 10 en hoger is altijd beter, zodat een trend over een kwartaal in
 * één richting te lezen is. Elke week dezelfde woorden: een andere formulering
 * is een andere vraag, en dan breekt de trend.
 *
 * Bewust niet gevraagd: alles over gezondheid (klachten, slaap, medicijnen).
 * Een werkgever mag geen medische gegevens vastleggen; we vragen naar het werk.
 *
 * Een vraag erbij is hier een regel; de database bewaart de antwoorden als
 * jsonb op deze sleutels. Een sleutel hernoemen maakt oude antwoorden onvindbaar.
 */
export const VRAGEN: Vraag[] = [
  // Elke week: werkgeluk, druk en kennis, plus het cijfer.
  { sleutel: "energie", soort: "schaal", moment: "week", thema: "werkgeluk", label: "Met hoeveel energie ging je deze week aan het werk?", kort: "Energie", hint: "Niet hoe druk het was, maar hoe je erin zat.", laag: "leeg", hoog: "vol energie" },
  { sleutel: "plezier", soort: "schaal", moment: "week", thema: "werkgeluk", label: "Hoeveel plezier had je in je werk?", kort: "Plezier", hint: "In het werk zelf: de gesprekken, de dossiers, de klanten.", laag: "geen", hoog: "veel" },
  { sleutel: "tijd", soort: "schaal", moment: "week", thema: "druk", label: "Paste het werk in de tijd die je had?", kort: "Werk paste in de tijd", hint: "Dossiers, telefoontjes, deadlines: kon je het af zonder te jagen?", laag: "veel te veel", hoog: "paste ruim" },
  { sleutel: "emotie", soort: "schaal", moment: "week", thema: "druk", label: "Hoe goed kon je de emotionele kant van je werk dragen?", kort: "Emotioneel te dragen", hint: "Gesprekken met zieke werknemers en hun werkgevers kunnen zwaar zijn.", laag: "zwaar", hoog: "goed te dragen" },
  { sleutel: "herstel", soort: "schaal", moment: "week", thema: "druk", label: "Lukte het je om na het werk los te komen?", kort: "Loskomen na het werk", hint: "'s Avonds en in het weekend: was je hoofd ook vrij?", laag: "helemaal niet", hoog: "helemaal" },
  { sleutel: "kennis", soort: "schaal", moment: "week", thema: "kennis", label: "Kon je met je kennis uit de voeten bij wat er op je pad kwam?", kort: "Kennis", hint: "Wetgeving, re-integratie, gesprekken, systemen.", laag: "vaak niet", hoog: "altijd" },
  { sleutel: "cijfer", soort: "schaal", moment: "week", thema: "totaal", label: "Welk cijfer geef je deze week?", kort: "Cijfer", hint: "Alles bij elkaar.", laag: "slechte week", hoog: "topweek" },
  { sleutel: "cijfers_toelichting", soort: "tekst", moment: "week", thema: "totaal", blok: "cijfers", label: "Wil je iets toelichten bij je cijfers?", kort: "Toelichting bij de cijfers", hint: "Waarom je energie laag was, of wat de week zo goed maakte.", voorbeeld: "Bijvoorbeeld: maandag twee ziekmeldingen tegelijk, daarna ging het beter.", bespreekbaar: true },
  { sleutel: "hoogtepunt", soort: "tekst", moment: "week", thema: "werkgeluk", blok: "woorden", label: "Wat was je hoogtepunt van de week?", kort: "Hoogtepunt", hint: "Groot of klein. Twee zinnen zijn genoeg.", voorbeeld: "Bijvoorbeeld: twee werknemers zijn weer gestart, en de werkgever belde zelf om te bedanken.", bespreekbaar: true },
  { sleutel: "knelpunt", soort: "tekst", moment: "week", thema: "druk", blok: "woorden", label: "Waar liep je tegenaan?", kort: "Knelpunt", hint: "Kies wat erbij past en schrijf er een zin bij. Niets? Laat het leeg.", voorbeeld: "Bijvoorbeeld: de bedrijfsarts was pas donderdag beschikbaar, de werkgever belde drie keer.", keuzes: "knelpunt_themas", bespreekbaar: true },
  { sleutel: "kennis_mist", soort: "tekst", moment: "week", thema: "kennis", blok: "woorden", label: "Welke kennis miste je?", kort: "Kennis gemist", hint: "Omdat je kennis een 6 of lager kreeg: waar zat het?", voorbeeld: "Bijvoorbeeld: wanneer een loonsanctie dreigt bij een te late eerstejaarsevaluatie.", keuzes: "kennis_themas", alleenAls: { schaal: "kennis", max: 6 }, bespreekbaar: true },
  { sleutel: "beter", soort: "tekst", moment: "week", thema: "totaal", blok: "woorden", label: "Wat kon beter?", kort: "Kon beter", hint: "Bij jezelf, in het team of in hoe we werken.", voorbeeld: "Bijvoorbeeld: ik heb te lang gewacht met terugbellen.", bespreekbaar: true },
  { sleutel: "nodig", soort: "tekst", moment: "week", thema: "werkgeluk", blok: "woorden", label: "Wat heb je nodig?", kort: "Nodig", hint: "Van React2u of van je collega's.", voorbeeld: "Bijvoorbeeld: een uur samen door de spoor 2-dossiers.", bespreekbaar: true },
  { sleutel: "volgende_week", soort: "tekst", moment: "week", thema: "totaal", blok: "woorden", label: "Wat neem je mee naar volgende week?", kort: "Volgende week", hint: "Eén ding dat je anders doet, of juist weer zo.", voorbeeld: "Bijvoorbeeld: elke ochtend eerst de terugbelverzoeken.", bespreekbaar: true },
  { sleutel: "melding", soort: "tekst", moment: "week", thema: "totaal", blok: "melden", label: "Wil je iets melden of delen?", kort: "Gemeld of gedeeld", hint: "Een zorg, een idee, een compliment voor een collega, een vraag: alles mag, ook als het niet over deze week gaat.", voorbeeld: "Bijvoorbeeld: Susanne nam deze week twee van mijn dossiers over toen ik vastliep. Dat mag gezien worden.", keuzes: "melding_soort", bespreekbaar: false },

  // De laatste week van de maand: toewijding en wat werkgeluk voedt.
  { sleutel: "trots", soort: "schaal", moment: "maand", thema: "toewijding", label: "Ik ben trots op het werk dat ik bij React2u doe.", kort: "Trots op het werk", hint: "", ...EENS },
  { sleutel: "inzet", soort: "schaal", moment: "maand", thema: "toewijding", label: "Ik zet me graag extra in als een werknemer of klant dat nodig heeft.", kort: "Extra inzet", hint: "", ...EENS },
  { sleutel: "waardering", soort: "schaal", moment: "maand", thema: "werkgeluk", label: "Ik voel me gewaardeerd voor wat ik doe.", kort: "Gewaardeerd", hint: "", ...EENS },
  { sleutel: "ruimte", soort: "schaal", moment: "maand", thema: "werkgeluk", label: "Ik heb ruimte om mijn dossiers op mijn eigen manier aan te pakken.", kort: "Eigen ruimte", hint: "", ...EENS },
  { sleutel: "geleerd", soort: "schaal", moment: "maand", thema: "kennis", label: "Ik heb deze maand iets geleerd waar ik beter van werd.", kort: "Geleerd", hint: "", ...EENS },
  { sleutel: "steun", soort: "schaal", moment: "maand", thema: "druk", label: "Ik krijg steun van collega's als het zwaar is.", kort: "Steun van collega's", hint: "", ...EENS },
  { sleutel: "maand_toelichting", soort: "tekst", moment: "maand", thema: "toewijding", blok: "maand", label: "Wil je iets toelichten bij de maandvragen?", kort: "Toelichting maandvragen", hint: "Waarom je je wel of niet gewaardeerd voelt, wat je leerde, wie je steunde.", voorbeeld: "Bijvoorbeeld: ik leerde veel van het meelopen met de bedrijfsarts.", bespreekbaar: true },

  // De laatste week van het kwartaal: de terugblik voor de meeting.
  { sleutel: "blijven", soort: "schaal", moment: "kwartaal", thema: "blijven", label: "Hoe zeker zie je jezelf over een jaar nog bij React2u?", kort: "Over een jaar nog hier", hint: "Eerlijk is fijner dan wenselijk: dit is voor het gesprek.", laag: "zeker niet", hoog: "zeker wel" },
  { sleutel: "blijven_waarom", soort: "tekst", moment: "kwartaal", thema: "blijven", blok: "terugblik", label: "Waarom?", kort: "Waarom", hint: "Wat houdt je hier, of wat zou je doen twijfelen?", voorbeeld: "Bijvoorbeeld: het team, de vrijheid in mijn dossiers, of juist de reistijd.", bespreekbaar: true },
  { sleutel: "kwartaal_hoogtepunt", soort: "tekst", moment: "kwartaal", thema: "werkgeluk", blok: "terugblik", label: "Wat was je hoogtepunt dit kwartaal?", kort: "Hoogtepunt van het kwartaal", hint: "Waar denk je aan terug?", voorbeeld: "Bijvoorbeeld: het dossier dat na acht maanden toch goed afliep.", bespreekbaar: true },
  { sleutel: "kwartaal_anders", soort: "tekst", moment: "kwartaal", thema: "totaal", blok: "terugblik", label: "Wat moet volgend kwartaal anders, bij jou en bij React2u?", kort: "Volgend kwartaal anders", hint: "Eén ding bij jezelf, één ding bij ons is genoeg.", voorbeeld: "Bijvoorbeeld: ik plan mijn belmomenten vaster; wij spreken af wie de nieuwe klanten intakt.", bespreekbaar: true },
];

export const SCHALEN = VRAGEN.filter((v): v is SchaalVraag => v.soort === "schaal");
export const TEKSTVRAGEN = VRAGEN.filter((v): v is TekstVraag => v.soort === "tekst");
export const ALLE_SCHALEN: Schaal[] = SCHALEN.map((v) => v.sleutel);

const PER_SLEUTEL = new Map<string, Vraag>(VRAGEN.map((v) => [v.sleutel, v]));

export function vraag(sleutel: Schaal): SchaalVraag;
export function vraag(sleutel: Tekstvraag): TekstVraag;
export function vraag(sleutel: Schaal | Tekstvraag): Vraag {
  return PER_SLEUTEL.get(sleutel)!;
}

export function keuzeLabel(veld: KeuzeVeld, sleutel: string): string {
  return KEUZES[veld].find((k) => k.sleutel === sleutel)?.label ?? sleutel;
}

/* ---------- doelen ---------- */

/** Een doel uit de kwartaalmeeting (0045): de collega geeft elke week aan hoe ver hij kwam. */
export type Doel = { id: string; user_id: string; jaar: number; kwartaal: number; titel: string; toelichting: string | null; sort: number };
export type DoelVoortgang = { cijfer: number; tekst?: string };
export const MAX_DOELEN = 3;

/* ---------- antwoorden ---------- */

export type Antwoorden = Partial<Record<Schaal, number>> & Partial<Record<Tekstvraag, string>> & {
  knelpunt_themas?: string[];
  kennis_themas?: string[];
  /** Eén soort: zorg, idee, compliment, vraag of anders. */
  melding_soort?: string[];
  /** De collega wil de melding meteen naar Rens, niet pas in de kwartaalmeeting. */
  melding_nu?: boolean;
  /** Vingerafdruk van de melding die al gemaild is; zet de server, zodat opnieuw bewaren niet opnieuw mailt. */
  melding_verstuurd?: string;
  /** De open vragen die de collega wil bespreken in de kwartaalmeeting. */
  bespreken?: Tekstvraag[];
  /** Voortgang per doel (id uit weekevaluatie_doelen). */
  doelen?: Record<string, DoelVoortgang>;
};

export type Evaluatie = {
  id: string;
  user_id: string;
  week: string;
  antwoorden: Antwoorden;
  door: string | null;
  signaal_at?: string | null;
  created_at: string;
  updated_at: string;
};

export const MAX_TEKST = 2000;
export const MAX_DOELTEKST = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cijfer = (ruw: string | undefined): number | null => {
  const t = (ruw ?? "").trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 10 ? n : null;
};
const tekst = (ruw: string | undefined, max = MAX_TEKST) => (ruw ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

/** Of een open vraag deze week gesteld wordt, gegeven de cijfers die er al staan. */
export function wordtGevraagd(v: TekstVraag, a: Antwoorden): boolean {
  if (!v.alleenAls) return true;
  const w = a[v.alleenAls.schaal];
  return typeof w === "number" && w <= v.alleenAls.max;
}

/**
 * Wat het formulier stuurde, als antwoorden. Elke schaal die deze week
 * gesteld wordt is verplicht (een heel getal van 1 tot 10), net als de
 * voortgang op elk doel; open vragen en keuzes zijn vrij. Een keuze of een
 * bespreekvinkje bij een vraag die niet gesteld werd, valt weg. `fouten` noemt
 * de schalen (en `doel:<id>`) die ontbreken of onzin bevatten.
 */
export function leesAntwoorden(
  invoer: Record<string, string[] | undefined>,
  context: { week: string; doelen: Pick<Doel, "id">[] },
): { antwoorden: Antwoorden; fouten: string[] } {
  const een = (k: string) => invoer[k]?.[0];
  const antwoorden: Antwoorden = {};
  const fouten: string[] = [];
  const vragen = vragenVoorWeek(context.week);
  for (const v of vragen) {
    if (v.soort !== "schaal") continue;
    const n = cijfer(een(v.sleutel));
    if (n === null) fouten.push(v.sleutel);
    else antwoorden[v.sleutel] = n;
  }
  const bespreken = new Set(invoer.bespreken ?? []);
  const besproken: Tekstvraag[] = [];
  for (const v of vragen) {
    if (v.soort !== "tekst" || !wordtGevraagd(v, antwoorden)) continue;
    const t = tekst(een(v.sleutel));
    if (t) antwoorden[v.sleutel] = t;
    let keuzes: string[] = [];
    if (v.keuzes) {
      const bekend = new Set(KEUZES[v.keuzes].map((k) => k.sleutel));
      const gekozen = new Set((invoer[v.keuzes] ?? []).filter((k) => bekend.has(k)));
      // In de vaste volgorde van de lijst; bij één keuze telt de eerste daarvan.
      keuzes = KEUZES[v.keuzes].map((k) => k.sleutel).filter((k) => gekozen.has(k));
      if (ENKELE_KEUZE.includes(v.keuzes)) keuzes = keuzes.slice(0, 1);
      if (keuzes.length) antwoorden[v.keuzes] = keuzes;
    }
    if (v.bespreekbaar && bespreken.has(v.sleutel) && (t || keuzes.length)) besproken.push(v.sleutel);
  }
  if (besproken.length) antwoorden.bespreken = besproken;
  // Meteen doorsturen kan alleen met een melding erbij.
  if (antwoorden.melding && een("melding_nu") === "aan") antwoorden.melding_nu = true;
  for (const d of context.doelen) {
    const n = cijfer(een(`doel_${d.id}`));
    if (n === null) {
      fouten.push(`doel:${d.id}`);
      continue;
    }
    const t = tekst(een(`doel_${d.id}_tekst`), MAX_DOELTEKST);
    antwoorden.doelen = { ...(antwoorden.doelen ?? {}), [d.id]: t ? { cijfer: n, tekst: t } : { cijfer: n } };
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
  for (const veld of Object.keys(KEUZES) as KeuzeVeld[]) {
    const lijst = o[veld];
    if (!Array.isArray(lijst)) continue;
    const bekend = KEUZES[veld].map((k) => k.sleutel).filter((k) => lijst.includes(k));
    if (bekend.length) a[veld] = ENKELE_KEUZE.includes(veld) ? bekend.slice(0, 1) : bekend;
  }
  if (o.melding_nu === true && a.melding) a.melding_nu = true;
  if (typeof o.melding_verstuurd === "string" && /^[0-9a-f]{8,64}$/.test(o.melding_verstuurd)) a.melding_verstuurd = o.melding_verstuurd;
  if (Array.isArray(o.bespreken)) {
    const b = TEKST_SLEUTELS.filter((k) => (o.bespreken as unknown[]).includes(k));
    if (b.length) a.bespreken = b;
  }
  if (o.doelen && typeof o.doelen === "object" && !Array.isArray(o.doelen)) {
    const doelen: Record<string, DoelVoortgang> = {};
    for (const [id, w] of Object.entries(o.doelen as Record<string, unknown>)) {
      if (!UUID.test(id) || !w || typeof w !== "object") continue;
      const { cijfer: c, tekst: t } = w as { cijfer?: unknown; tekst?: unknown };
      if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > 10) continue;
      doelen[id] = typeof t === "string" && t.trim() ? { cijfer: c, tekst: t.slice(0, MAX_DOELTEKST) } : { cijfer: c };
    }
    if (Object.keys(doelen).length) a.doelen = doelen;
  }
  return a;
}

/** Of er in de open vragen iets staat. */
export function heeftTekst(a: Antwoorden): boolean {
  return TEKST_SLEUTELS.some((k) => Boolean(a[k]));
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

/** "wk 47", voor grafieken en pillen. */
export function weekKort(week: string): string {
  return `wk ${weekNummer(week).week}`;
}

/** Alleen weken waarvan de zondag op of na `sinds` valt tellen voor iemand mee. */
export function teltVoor(week: string, sinds: string | null | undefined): boolean {
  return !sinds || plusDagen(week, 6) >= sinds;
}

/** De laatste week van de maand: de week erna hoort (naar zijn donderdag) bij een andere maand. */
export function isMaandEinde(week: string): boolean {
  return maandVanWeek(week) !== maandVanWeek(plusWeken(week, 1));
}

/** De laatste week van het kwartaal. Altijd ook de laatste van een maand. */
export function isKwartaalEinde(week: string): boolean {
  return !zelfdeKwartaal(kwartaalVanWeek(week), kwartaalVanWeek(plusWeken(week, 1)));
}

/** Welke lagen er in deze week gevraagd worden. */
export function momenten(week: string): Moment[] {
  return ["week", ...(isMaandEinde(week) ? (["maand"] as const) : []), ...(isKwartaalEinde(week) ? (["kwartaal"] as const) : [])];
}

export function vragenVoorWeek(week: string): Vraag[] {
  const m = momenten(week);
  return VRAGEN.filter((v) => m.includes(v.moment));
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

/** De drie maanden (jjjj-mm) van een kwartaal. */
export function maandenInKwartaal(k: Kwartaal): string[] {
  return [0, 1, 2].map((i) => `${k.jaar}-${String((k.kwartaal - 1) * 3 + 1 + i).padStart(2, "0")}`);
}

const MAAND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "nov" voor 2026-11. */
export function maandKort(maand: string): string {
  return MAAND[Number(maand.slice(5, 7)) - 1] ?? maand;
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
  for (const s of ALLE_SCHALEN) {
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
    for (const s of ALLE_SCHALEN) if (g[s].gem !== null) waarden[s] = g[s].gem!;
    return { week, waarden, n: rijen.length };
  });
}

/* ---------- twee zware weken ---------- */

/**
 * Twee weken achter elkaar een 4 of lager voor energie, of voor "werk paste in
 * de tijd": dan wacht je niet tot de kwartaalmeeting. Dezelfde regel staat in
 * de database (weekevaluatie_signaal in 0045), die de mail verstuurt.
 */
export const SIGNAAL_GRENS = 4;
export const SIGNAAL_SCHALEN: Schaal[] = ["energie", "tijd"];

/** Welke schalen in beide weken op of onder de grens zaten. */
export function signaal(nu: Antwoorden | undefined, ervoor: Antwoorden | undefined): Schaal[] {
  if (!nu || !ervoor) return [];
  return SIGNAAL_SCHALEN.filter((s) => {
    const a = nu[s];
    const b = ervoor[s];
    return typeof a === "number" && typeof b === "number" && a <= SIGNAAL_GRENS && b <= SIGNAAL_GRENS;
  });
}

export type Signaal = { user_id: string; week: string; schalen: Schaal[] };

/** Alle signalen in deze evaluaties: per collega elk paar opeenvolgende weken, op de tweede week. */
export function signalen(evaluaties: Pick<Evaluatie, "user_id" | "week" | "antwoorden">[]): Signaal[] {
  const per = new Map(evaluaties.map((e) => [`${e.user_id}|${e.week}`, e]));
  const uit: Signaal[] = [];
  for (const e of evaluaties) {
    const ervoor = per.get(`${e.user_id}|${plusWeken(e.week, -1)}`);
    const s = signaal(e.antwoorden, ervoor?.antwoorden);
    if (s.length) uit.push({ user_id: e.user_id, week: e.week, schalen: s });
  }
  return uit.sort((a, b) => b.week.localeCompare(a.week) || a.user_id.localeCompare(b.user_id));
}

/** "energie" of "energie en werk paste in de tijd", voor in een zin. */
export function schalenZin(schalen: Schaal[]): string {
  const namen = schalen.map((s) => vraag(s).kort.toLowerCase());
  return namen.length > 1 ? `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}` : namen[0] ?? "";
}

/** De mail bij twee zware weken, aan wie het overzicht mag zien. Zonder de antwoorden zelf. */
export function signaalMail(naam: string, week: string, schalen: Schaal[]): { onderwerp: string; alineas: string[]; knop: string } {
  const nu = weekNummer(week).week;
  const ervoor = weekNummer(plusWeken(week, -1)).week;
  return {
    onderwerp: `Twee zware weken voor ${naam}`,
    alineas: [
      `${naam} gaf in week ${ervoor} en ${nu} allebei een ${SIGNAAL_GRENS} of lager voor ${schalenZin(schalen)}.`,
      "Dat is geen diagnose, wel een goed moment om even te bellen of langs te lopen, zonder te wachten op de kwartaalmeeting. Vraag naar het werk, niet naar de gezondheid.",
      "In het kwartaaloverzicht zie je de cijfers per week en wat er geschreven is.",
    ],
    knop: "Open het kwartaaloverzicht",
  };
}

/* ---------- voor de kwartaalmeeting ---------- */

/** Hoe zwaar een week was: het gemiddelde van energie en de drie drukvragen. Lager is zwaarder. */
export function zwaarte(a: Antwoorden): number | null {
  return gemiddelde((["energie", "tijd", "emotie", "herstel"] as Schaal[]).map((s) => a[s]).filter((x): x is number => typeof x === "number"));
}

/** De twee zwaarste weken, pas vanaf drie ingevulde weken (daarvoor is alles "de zwaarste"). */
export function zwaarsteWeken(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[], n = 2): { week: string; zwaarte: number }[] {
  const met = evaluaties.map((e) => ({ week: e.week, zwaarte: zwaarte(e.antwoorden) })).filter((x): x is { week: string; zwaarte: number } => x.zwaarte !== null);
  if (met.length < 3) return [];
  return met.sort((a, b) => a.zwaarte - b.zwaarte || a.week.localeCompare(b.week)).slice(0, n);
}

/** Hoe vaak elk thema gekozen is, vaakst eerst; alleen wat gekozen is. */
export function telKeuzes(evaluaties: Pick<Evaluatie, "antwoorden">[], veld: KeuzeVeld): (Keuze & { aantal: number })[] {
  return KEUZES[veld]
    .map((k) => ({ ...k, aantal: evaluaties.filter((e) => e.antwoorden[veld]?.includes(k.sleutel)).length }))
    .filter((k) => k.aantal > 0)
    .sort((a, b) => b.aantal - a.aantal);
}

export type Bespreekpunt = { week: string; sleutel: Tekstvraag; vraag: string; tekst: string | null; themas: string[] };

/** Wat de collega heeft aangevinkt om te bespreken, nieuwste week eerst. */
export function bespreekpunten(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[]): Bespreekpunt[] {
  const uit: Bespreekpunt[] = [];
  for (const e of [...evaluaties].sort((a, b) => b.week.localeCompare(a.week))) {
    for (const k of e.antwoorden.bespreken ?? []) {
      const v = vraag(k);
      const themas = v.keuzes ? (e.antwoorden[v.keuzes] ?? []).map((t) => keuzeLabel(v.keuzes!, t)) : [];
      uit.push({ week: e.week, sleutel: k, vraag: v.kort, tekst: e.antwoorden[k] ?? null, themas });
    }
  }
  return uit;
}

/** Alle antwoorden op één open vraag, nieuwste week eerst. */
export function teksten(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[], sleutel: Tekstvraag): { week: string; tekst: string }[] {
  return [...evaluaties]
    .sort((a, b) => b.week.localeCompare(a.week))
    .flatMap((e) => (e.antwoorden[sleutel] ? [{ week: e.week, tekst: e.antwoorden[sleutel]! }] : []));
}

export type Melding = { week: string; soort: string | null; soortLabel: string; tekst: string; nu: boolean; verstuurd: boolean };

/** Wat een collega meldde of deelde, nieuwste week eerst, met de soort en of het meteen doorgestuurd is. */
export function meldingen(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[]): Melding[] {
  return teksten(evaluaties, "melding").map(({ week, tekst }) => {
    const a = evaluaties.find((e) => e.week === week)!.antwoorden;
    const soort = a.melding_soort?.[0] ?? null;
    return { week, soort, soortLabel: soort ? keuzeLabel("melding_soort", soort) : "Gemeld of gedeeld", tekst, nu: Boolean(a.melding_nu), verstuurd: Boolean(a.melding_verstuurd) };
  });
}

/** Waar de vingerafdruk van een melding van gemaakt wordt: de soort en de tekst. Andere tekst is een nieuwe melding. */
export function meldingInhoud(a: Antwoorden): string | null {
  return a.melding && a.melding_nu ? `${a.melding_soort?.[0] ?? ""}|${a.melding}` : null;
}

/** De mail als een collega iets meteen wil laten weten. Met de tekst zelf: die koos hij om te delen. */
export function meldingMail(naam: string, week: string, soort: string | null, tekst: string): { onderwerp: string; alineas: string[]; citaat: string; knop: string } {
  const onderwerp: Record<string, string> = {
    zorg: `${naam} meldt iets wat niet goed gaat`,
    idee: `${naam} deelt een idee`,
    compliment: `${naam} deelt een compliment`,
    vraag: `${naam} heeft een vraag`,
  };
  return {
    onderwerp: (soort && onderwerp[soort]) || `${naam} wil iets melden`,
    alineas: [
      `${naam} schreef dit in de weekevaluatie van week ${weekNummer(week).week} en wil het niet laten wachten tot de kwartaalmeeting.`,
      `Beantwoord je deze mail, dan gaat je antwoord rechtstreeks naar ${naam}.`,
    ],
    citaat: tekst,
    knop: "Open in het kwartaaloverzicht",
  };
}

export type MaandRij = { sleutel: Schaal; label: string; kort: string; thema: Thema; waarden: (number | null)[] };

/** De maandvragen van één collega per maand van het kwartaal (uit de laatste week van elke maand). */
export function maandOverzicht(evaluaties: Pick<Evaluatie, "week" | "antwoorden">[], k: Kwartaal): { maanden: string[]; rijen: MaandRij[]; ingevuld: number } {
  const maanden = maandenInKwartaal(k);
  const perMaand = new Map<string, Antwoorden>();
  for (const e of evaluaties) {
    if (!isMaandEinde(e.week)) continue;
    if (MAAND_SCHALEN.some((s) => typeof e.antwoorden[s] === "number")) perMaand.set(maandVanWeek(e.week), e.antwoorden);
  }
  const rijen = MAAND_SCHALEN.map((s) => {
    const v = vraag(s);
    return { sleutel: s, label: v.label, kort: v.kort, thema: v.thema, waarden: maanden.map((m) => perMaand.get(m)?.[s] ?? null) };
  });
  return { maanden, rijen, ingevuld: maanden.filter((m) => perMaand.has(m)).length };
}

export type DoelStand = { doel: Doel; gem: number | null; perWeek: { week: string; cijfer: number }[]; laatste: { week: string; tekst: string } | null };

/** Per doel de voortgang per week, het gemiddelde en de laatste toelichting. */
export function doelStanden(doelen: Doel[], evaluaties: Pick<Evaluatie, "week" | "antwoorden">[]): DoelStand[] {
  const op = [...evaluaties].sort((a, b) => a.week.localeCompare(b.week));
  return doelen.map((doel) => {
    const perWeek = op.flatMap((e) => (e.antwoorden.doelen?.[doel.id] ? [{ week: e.week, cijfer: e.antwoorden.doelen[doel.id].cijfer }] : []));
    const met = op.filter((e) => e.antwoorden.doelen?.[doel.id]?.tekst);
    const l = met[met.length - 1];
    return { doel, gem: gemiddelde(perWeek.map((p) => p.cijfer)), perWeek, laatste: l ? { week: l.week, tekst: l.antwoorden.doelen![doel.id].tekst! } : null };
  });
}

/** De doelen van een kwartaal, op volgorde. */
export function doelenVan<T extends Pick<Doel, "jaar" | "kwartaal" | "sort" | "titel">>(doelen: T[], k: Kwartaal): T[] {
  return doelen.filter((d) => d.jaar === k.jaar && d.kwartaal === k.kwartaal).sort((a, b) => a.sort - b.sort || a.titel.localeCompare(b.titel));
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
 * binnen een reeks weken. Wat ingevuld is telt altijd; een lege week van vóór
 * iemands komst niet.
 */
export function deelname(d: Pick<Deelnemer, "sinds">, weken: string[], ingevuld: Set<string>, vandaag: string): Deelname {
  const uit: Deelname = { ingevuld: [], gemist: [], open: [], verwacht: 0 };
  for (const w of weken) {
    const stand = weekStand(w, vandaag);
    if (stand === "toekomst") continue;
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

/** Wat er bij het invullen staat over waar de antwoorden voor zijn; ook in de herinnering. */
export const WAARVOOR =
  "Je antwoorden zijn om inzicht te houden en samen te blijven verbeteren, nooit voor beoordeling of salaris. We vragen naar je werk, niet naar je gezondheid.";

/** De vriendelijke mail van vrijdagmiddag. Kort: het invullen zelf duurt twee minuten. */
export function herinnering(voornaam: string | null, week: string, open: { vorigeWeekOok: boolean }): Herinnering {
  const nr = weekNummer(week).week;
  const extra = isKwartaalEinde(week)
    ? "Het is de laatste week van het kwartaal: er staan ook zes maandvragen en een korte terugblik in, die neem je mee naar de kwartaalmeeting."
    : isMaandEinde(week)
      ? "Het is de laatste week van de maand: er staan ook zes korte maandvragen in."
      : null;
  return {
    onderwerp: `Hoe was je week ${nr}?`,
    aanhef: `Hoi${voornaam ? ` ${voornaam}` : ""},`,
    alineas: [
      `Het is vrijdagmiddag: tijd voor je weekevaluatie van week ${nr} (${weekBereik(week)}). Zeven cijfers en een paar zinnen, dat is twee minuten werk. Je kunt hem tot en met zondag ${weekBereikDag(sluitOp(week))} nog aanpassen.`,
      ...(extra ? [extra] : []),
      open.vorigeWeekOok ? "Vorige week staat ook nog open; die kun je in hetzelfde scherm invullen." : WAARVOOR,
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
  /** De doelen van het kwartaal, voor de kolom met voortgang. */
  doelen: Doel[];
  vandaag: string;
};

const WEEK_VRAGEN = SCHALEN.filter((s) => s.moment === "week");
const MAAND_VRAGEN = SCHALEN.filter((s) => s.moment === "maand");

export const EXPORT_KOP = [
  "Collega", "E-mail", "Jaar", "Week", "Periode", "Status",
  ...WEEK_VRAGEN.map((s) => s.kort),
  "Toelichting bij de cijfers",
  "Hoogtepunt", "Knelpunt", "Knelpuntthema's", "Kennis gemist", "Kennisthema's", "Kon beter", "Nodig", "Volgende week",
  "Soort melding", "Gemeld of gedeeld", "Meteen doorgestuurd",
  "Voortgang doelen", "Te bespreken",
  ...MAAND_VRAGEN.map((s) => s.kort), "Toelichting maandvragen",
  "Over een jaar nog hier", "Waarom", "Hoogtepunt van het kwartaal", "Volgend kwartaal anders",
  "Twee zware weken", "Declarabele uren", "Uren afwezig", "Ingevuld op",
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
  const sig = new Map(signalen(i.evaluaties).map((s) => [`${s.user_id}|${s.week}`, s]));
  const doelTitel = new Map(i.doelen.map((d) => [d.id, d.titel]));
  for (const d of deelnemers(i.deelnemers, i.evaluaties)) {
    const naam = i.namen.get(d.user_id) || d.email;
    for (const w of i.weken) {
      const stand = weekStand(w, i.vandaag);
      if (stand === "toekomst") continue;
      const e = per.get(`${d.user_id}|${w}`);
      if (!e && !teltVoor(w, d.sinds)) continue;
      const a: Antwoorden = e?.antwoorden ?? {};
      const u = i.uren.get(`${d.user_id}|${w}`);
      const s = sig.get(`${d.user_id}|${w}`);
      const { jaar, week } = weekNummer(w);
      rijen.push([
        naam, d.email, String(jaar), String(week), weekBereik(w),
        e ? "ingevuld" : stand === "open" ? "nog open" : "gemist",
        ...WEEK_VRAGEN.map((v) => getal(a[v.sleutel])),
        a.cijfers_toelichting || "",
        a.hoogtepunt || "", a.knelpunt || "",
        (a.knelpunt_themas ?? []).map((t) => keuzeLabel("knelpunt_themas", t)).join(", "),
        a.kennis_mist || "",
        (a.kennis_themas ?? []).map((t) => keuzeLabel("kennis_themas", t)).join(", "),
        a.beter || "", a.nodig || "", a.volgende_week || "",
        a.melding && a.melding_soort?.[0] ? keuzeLabel("melding_soort", a.melding_soort[0]) : "",
        a.melding || "",
        a.melding ? (a.melding_verstuurd ? "ja" : a.melding_nu ? "gevraagd" : "nee") : "",
        Object.entries(a.doelen ?? {}).filter(([id]) => doelTitel.has(id)).map(([id, v]) => `${doelTitel.get(id)}: ${v.cijfer}${v.tekst ? ` (${v.tekst})` : ""}`).join("; "),
        (a.bespreken ?? []).map((k) => vraag(k).kort).join(", "),
        ...MAAND_VRAGEN.map((v) => getal(a[v.sleutel])), a.maand_toelichting || "",
        getal(a.blijven), a.blijven_waarom || "", a.kwartaal_hoogtepunt || "", a.kwartaal_anders || "",
        s ? schalenZin(s.schalen) : "",
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
