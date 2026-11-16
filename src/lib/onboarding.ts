/**
 * Onboarding (migratie 0037): een nieuwe klant krijgt één persoonlijke link
 * met de documenten die sales aanvinkt. Per document kiest sales of het alleen
 * meegaat (lezen of downloaden) of dat de klant het online invult.
 *
 * Puur, zonder database: de catalogus met de inhoud van elk document, de
 * velden van de formulieren en hun controles. Dezelfde bron voor het beheer,
 * de klantpagina, de pdf's en de mail, zodat een tekst maar op één plek staat.
 */
import { OFFERTE_EMAIL } from "./offertes";

export type OnboardingStatus = "concept" | "verstuurd" | "afgerond" | "ingetrokken";

/** Eén antwoord van de klant op een in te vullen document. */
export type Antwoord<T = Record<string, unknown>> = { data: T; at: string; door: string | null };

/** Een rij uit `onboardings`, zoals het beheer hem leest. */
export type Onboarding = {
  id: string;
  nummer: string;
  token: string;
  status: OnboardingStatus;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  bericht: string | null;
  documenten: string[];
  invullen: string[];
  antwoorden: Partial<Record<DocumentSleutel, Antwoord>>;
  gelezen: Partial<Record<DocumentSleutel, string>>;
  contractsoort: string | null;
  debiteurnummer: string | null;
  taken: Partial<Record<TaakSleutel, Taak>>;
  afzender_naam: string | null;
  afzender_functie: string | null;
  afzender_email: string | null;
  afzender_telefoon: string | null;
  notitie: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  verstuurd_at: string | null;
  afgerond_at: string | null;
  bekeken_at: string | null;
  laatst_bekeken_at: string | null;
  aantal_bekeken: number;
};

/** Wat `onboarding_bekijken` teruggeeft: zonder notitie, interne velden en e-mail van de klant. */
export type OnboardingPubliek = Pick<
  Onboarding,
  | "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "bericht" | "documenten" | "invullen" | "antwoorden" | "gelezen"
  | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at" | "afgerond_at" | "created_at"
> & { eerste_keer?: boolean };

export type OnboardingGebeurtenis = {
  id: number;
  onboarding_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "ingevuld" | "gelezen" | "afgerond" | "ingetrokken" | "heropend" | "gewist" | "taak";
  door: string | null;
  details: Record<string, string | number | boolean> | null;
  at: string;
};

/** Afzender en antwoordadres: de salesbox, net als bij offertes en brochures. */
export const ONBOARDING_EMAIL = OFFERTE_EMAIL;

/* ---------- de vaste gegevens van React2u in de documenten ---------- */

export const REACT2U = {
  telefoon: "085 620 58 00",
  telefoonLink: "0856205800",
  email: "info@react2u.nl",
  medisch: "medisch@react2u.nl",
  facturatie: "facturatie@react2u.nl",
  adres: "Stratumsedijk 29, 5611 NB Eindhoven",
  bedrijfsarts: { naam: "Stafarts B. Kamzoul", big: "89044438001" },
};

/* ---------- de documenten ---------- */

export type DocumentSleutel = "welkom" | "verzuimprotocol" | "vragen" | "inrichting" | "werknemers" | "machtiging";

export type DocumentInfo = {
  sleutel: DocumentSleutel;
  titel: string;
  /** Eén regel: wat het is en voor wie. */
  kort: string;
  /** Wat de klant doet als het document alleen meegaat. */
  lezen: string;
  /** Wat de klant doet als het online in te vullen is; null = niet in te vullen. */
  invullen: string | null;
  /** De kleur van het document op de pagina en in de pdf (de stippen van het logo). */
  kleur: string;
  tint: string;
  /** Standaard aangevinkt bij een nieuwe onboarding. */
  standaard: { mee: boolean; invullen: boolean };
  /** Er is een Excelbestand in plaats van (of naast) een pdf. */
  excel?: boolean;
};

/**
 * De catalogus, in de volgorde van het verhaal op de klantpagina: eerst hoe we
 * samenwerken, dan wat de medewerkers moeten weten, dan wat we van de klant
 * nodig hebben (HOOFDSTUKKEN hieronder). Het beheer, de mail en de stapnummers
 * volgen dezelfde volgorde.
 */
export const DOCUMENTEN: DocumentInfo[] = [
  {
    sleutel: "welkom",
    titel: "Welkom bij React2u",
    kort: "Onze werkwijze en de tijdlijn van ziekmelding tot WIA, voor de werkgever.",
    lezen: "Lees hoe we samenwerken",
    invullen: null,
    kleur: "#322E83", tint: "#ECEBF5",
    standaard: { mee: true, invullen: false },
  },
  {
    sleutel: "verzuimprotocol",
    titel: "Verzuimprotocol",
    kort: "Wat je medewerkers doen bij ziekte, in zes stappen. Om te delen of op te hangen.",
    lezen: "Deel het met je medewerkers",
    invullen: null,
    kleur: "#3AA5DD", tint: "#E8F4FB",
    standaard: { mee: true, invullen: false },
  },
  {
    sleutel: "vragen",
    titel: "Wat je wél mag vragen bij ziekteverzuim",
    kort: "Wat een werkgever mag vragen en noteren, met een belscript voor de ziekmelding.",
    lezen: "Lees het en houd het bij de hand",
    invullen: null,
    kleur: "#F19001", tint: "#FEF3E2",
    standaard: { mee: true, invullen: false },
  },
  {
    sleutel: "inrichting",
    titel: "Inrichting nieuwe klant",
    kort: "Bedrijfs- en factuurgegevens, zodat we jullie omgeving kunnen inrichten.",
    lezen: "Download het formulier, vul het in en mail het terug",
    invullen: "Vul jullie bedrijfsgegevens in",
    kleur: "#E61674", tint: "#FDECF4",
    standaard: { mee: true, invullen: true },
  },
  {
    sleutel: "werknemers",
    titel: "Werknemersbestand",
    kort: "De gegevens van jullie medewerkers voor het verzuimsysteem (import XpertSuite).",
    lezen: "Download het Excelbestand, vul het in en mail het terug",
    invullen: "Voer jullie medewerkers in",
    kleur: "#00A098", tint: "#E5F6F4",
    standaard: { mee: true, invullen: true },
    excel: true,
  },
  {
    sleutel: "machtiging",
    titel: "Machtiging overdracht verzuimdossier",
    kort: "Alleen bij een overstap van een andere arbodienst: toestemming van de werknemer om een lopend dossier over te dragen.",
    lezen: "Laat zieke medewerkers met een lopend dossier tekenen",
    invullen: "Vul de gegevens van je vorige arbodienst in",
    kleur: "#CA152A", tint: "#FBEAEC",
    standaard: { mee: false, invullen: true },
  },
];

export const DOCUMENT_SLEUTELS = DOCUMENTEN.map((d) => d.sleutel);

/** Een hoofdstuk van het verhaal op de klantpagina: welke documenten erin staan en hoe het begint. */
export type Hoofdstuk = { id: string; label: string; eyebrow: string; titel: string; tekst: string; documenten: DocumentSleutel[] };

/**
 * De verhaallijn van de onboarding, in drie hoofdstukken (de pagina slaat een
 * hoofdstuk over als geen van zijn documenten meegaat): kennismaken, je
 * medewerkers voorbereiden, en jullie gegevens. Daarna vertelt de pagina wat
 * React2u vervolgens doet.
 */
export const HOOFDSTUKKEN: Hoofdstuk[] = [
  {
    id: "samenwerken",
    label: "Zo werken we",
    eyebrow: "Zo werken we samen",
    titel: "Eerst: hoe een ziekmelding bij ons loopt.",
    tekst: "Wie wat doet, van de eerste dag tot het einde van de wachttijd, en waar je ons voor kunt bellen. Lees het rustig door; wij bewaken de termijnen.",
    documenten: ["welkom"],
  },
  {
    id: "medewerkers",
    label: "Je medewerkers",
    eyebrow: "Je medewerkers voorbereiden",
    titel: "Wat je mensen moeten weten, en wat jij mag vragen.",
    tekst: "Twee documenten om te delen en bij de hand te houden: het verzuimprotocol voor je medewerkers, en voor leidinggevenden wat je wél en niet vraagt bij een ziekmelding.",
    documenten: ["verzuimprotocol", "vragen"],
  },
  {
    id: "gegevens",
    label: "Jullie gegevens",
    eyebrow: "Wat we van jullie nodig hebben",
    titel: "Jullie gegevens, dan richten wij alles in.",
    tekst: "Met deze gegevens zetten we jullie omgeving, de facturatie en het verzuimsysteem klaar. Je kunt tussendoor stoppen en later verder; wat je opslaat, blijft bewaard.",
    documenten: ["inrichting", "werknemers", "machtiging"],
  },
];

/** De hoofdstukken die voor deze onboarding gelden, elk met de gekozen documenten erin. */
export function hoofdstukkenVoor(o: Pick<Onboarding, "documenten">): (Hoofdstuk & { docs: DocumentInfo[] })[] {
  return HOOFDSTUKKEN.map((h) => ({ ...h, docs: h.documenten.filter((s) => o.documenten.includes(s)).map(documentInfo) })).filter((h) => h.docs.length > 0);
}

export function isDocument(s: unknown): s is DocumentSleutel {
  return typeof s === "string" && (DOCUMENT_SLEUTELS as string[]).includes(s);
}

export function documentInfo(s: DocumentSleutel): DocumentInfo {
  return DOCUMENTEN.find((d) => d.sleutel === s)!;
}

/** De gekozen documenten in de vaste volgorde van de catalogus, onbekende eruit. */
export function gekozen(o: Pick<Onboarding, "documenten">): DocumentInfo[] {
  return DOCUMENTEN.filter((d) => o.documenten.includes(d.sleutel));
}

/** Of de klant dit document online invult (alleen als het kan en sales het aanvinkte). */
export function vultIn(o: Pick<Onboarding, "invullen">, s: DocumentSleutel): boolean {
  return documentInfo(s).invullen !== null && o.invullen.includes(s);
}

/** Of een document af is: ingevuld als het in te vullen is, anders afgevinkt. */
export function documentKlaar(o: Pick<Onboarding, "invullen" | "antwoorden" | "gelezen">, s: DocumentSleutel): boolean {
  return vultIn(o, s) ? Boolean(o.antwoorden?.[s]) : Boolean(o.gelezen?.[s]);
}

/**
 * Voor lijsten: alleen het moment per ingevuld document, zonder de inhoud.
 * `antwoorden` kan het hele werknemersbestand bevatten (tot 500 medewerkers),
 * en een lijst of het dashboard heeft alleen nodig óf het is ingevuld.
 * Gebruik in een select, en zet de rij daarna om met `metAntwoordMomenten`.
 */
export const ANTWOORD_MOMENTEN = "inrichting_at:antwoorden->inrichting->>at, werknemers_at:antwoorden->werknemers->>at, machtiging_at:antwoorden->machtiging->>at";

export type AntwoordMomenten = { inrichting_at?: string | null; werknemers_at?: string | null; machtiging_at?: string | null };

/** Bouwt uit de momenten een `antwoorden` dat voor `voortgang` en `documentKlaar` volstaat. */
export function metAntwoordMomenten<T extends AntwoordMomenten>(rij: T): T & { antwoorden: Onboarding["antwoorden"] } {
  const antwoorden: Onboarding["antwoorden"] = {};
  for (const d of ["inrichting", "werknemers", "machtiging"] as const) {
    const at = rij[`${d}_at`];
    if (at) antwoorden[d] = { data: {}, at, door: null };
  }
  return { ...rij, antwoorden };
}

/** Hoeveel van de gekozen documenten af zijn. */
export function voortgang(o: Pick<Onboarding, "documenten" | "invullen" | "antwoorden" | "gelezen">): { klaar: number; totaal: number } {
  const docs = gekozen(o);
  return { klaar: docs.filter((d) => documentKlaar(o, d.sleutel)).length, totaal: docs.length };
}

/** Uit het formulier van het beheer: wat er meegaat, en wat daarvan online in te vullen is. */
export function keuzeUit(mee: string[], invul: string[]): { documenten: DocumentSleutel[]; invullen: DocumentSleutel[] } {
  const documenten = DOCUMENT_SLEUTELS.filter((s) => mee.includes(s));
  const invullen = documenten.filter((s) => invul.includes(s) && documentInfo(s).invullen !== null);
  return { documenten, invullen };
}

/* ---------- wat React2u zelf regelt ---------- */

export type TaakSleutel = "xpertsuite" | "werknemers_import" | "facturatie" | "casemanager" | "dossiers" | "instructie";

/** Eén afgevinkte taak: wanneer en door wie. */
export type Taak = { at: string; door: string | null };

export type TaakInfo = {
  sleutel: TaakSleutel;
  titel: string;
  kort: string;
  /** Alleen als dit document meegaat. */
  bij?: DocumentSleutel;
  /** Kan pas als de klant dit document heeft ingevuld of afgevinkt. */
  na?: DocumentSleutel;
  /** Hoe de klantpagina het vertelt, onder "Zo gaat het verder": een kopje en een zin. */
  klantKop: string;
  klant: string;
};

/**
 * De checklist van React2u: wat er na (en naast) de documenten van de klant
 * moet gebeuren voordat hij live is. Samen met de documenten is dit het hele
 * traject; het beheer vinkt af, de klant ziet dit niet.
 */
export const TAKEN: TaakInfo[] = [
  { sleutel: "xpertsuite", klantKop: "Jullie omgeving", titel: "Werkgever aangemaakt in XpertSuite", kort: "Bedrijf, afdelingen en contactpersoon, uit het inrichtingsformulier.", na: "inrichting", klant: "We zetten jullie bedrijf, afdelingen en contactpersoon in ons verzuimsysteem XpertSuite." },
  { sleutel: "werknemers_import", klantKop: "Je medewerkers", titel: "Werknemers geïmporteerd", kort: "Het Excelbestand ingelezen in XpertSuite. Wis het bestand hier daarna.", bij: "werknemers", na: "werknemers", klant: "We lezen jullie medewerkers in, zodat een ziekmelding meteen goed binnenkomt." },
  { sleutel: "facturatie", klantKop: "De facturatie", titel: "Debiteur aangemaakt", kort: "Factuuradres en mailadres voor facturen in de boekhouding; vul hier het debiteurnummer in.", na: "inrichting", klant: "We richten de facturatie in op het adres dat je opgaf." },
  { sleutel: "casemanager", klantKop: "Een vaste casemanager", titel: "Vaste casemanager gekoppeld", kort: "Wie het aanspreekpunt wordt voor dit bedrijf, ook in XpertSuite.", klant: "Je krijgt een vaste casemanager: één aanspreekpunt dat jullie organisatie kent." },
  { sleutel: "dossiers", klantKop: "Lopende dossiers", titel: "Dossiers opgevraagd bij de vorige arbodienst", kort: "Met de getekende machtigingen, bij de arbodienst die de klant opgaf.", bij: "machtiging", na: "machtiging", klant: "Met de getekende machtigingen vragen we lopende dossiers op bij je vorige arbodienst." },
  { sleutel: "instructie", klantKop: "Wegwijs in het systeem", titel: "Instructie XpertSuite gegeven", kort: "De klant wegwijs gemaakt in de beveiligde omgeving, op kantoor of online.", klant: "We maken je wegwijs in de beveiligde omgeving, op kantoor of online." },
];

export const TAAK_SLEUTELS = TAKEN.map((t) => t.sleutel);

export function isTaak(s: unknown): s is TaakSleutel {
  return typeof s === "string" && (TAAK_SLEUTELS as string[]).includes(s);
}

export function taakInfo(s: TaakSleutel): TaakInfo {
  return TAKEN.find((t) => t.sleutel === s)!;
}

/** De taken die bij deze onboarding horen: alleen die bij een gekozen document, plus de algemene. */
export function takenVoor(o: Pick<Onboarding, "documenten">): TaakInfo[] {
  return TAKEN.filter((t) => !t.bij || o.documenten.includes(t.bij));
}

export function taakKlaar(o: Pick<Onboarding, "taken">, s: TaakSleutel): boolean {
  return Boolean(o.taken?.[s]);
}

/** Hoeveel van de taken van React2u af zijn. */
export function takenVoortgang(o: Pick<Onboarding, "documenten" | "taken">): { klaar: number; totaal: number } {
  const taken = takenVoor(o);
  return { klaar: taken.filter((t) => taakKlaar(o, t.sleutel)).length, totaal: taken.length };
}

/** Of een taak al kan: de klant heeft het document gedaan waar hij op wacht (of er is geen wachten). */
export function taakKan(o: Pick<Onboarding, "invullen" | "antwoorden" | "gelezen" | "documenten">, t: TaakInfo): boolean {
  return !t.na || !o.documenten.includes(t.na) || documentKlaar(o, t.na);
}

/* ---------- status ---------- */

/**
 * Wat het beheer ziet: de status, verfijnd met wat de klant deed (bekeken) en
 * met wat React2u nog moet doen (afgerond = klant klaar; ingericht = ook onze
 * taken af, de klant is live).
 */
export type OnboardingWeergave = OnboardingStatus | "bekeken" | "ingericht";

export function onboardingWeergave(o: Pick<Onboarding, "status" | "bekeken_at" | "documenten" | "taken">): OnboardingWeergave {
  if (o.status === "verstuurd" && o.bekeken_at) return "bekeken";
  if (o.status === "afgerond") {
    const t = takenVoortgang(o);
    if (t.klaar === t.totaal) return "ingericht";
  }
  return o.status;
}

export const ONBOARDING_WEERGAVE: Record<OnboardingWeergave, { label: string; kleur: string; achter: string }> = {
  concept: { label: "Concept", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verstuurd: { label: "Verstuurd", kleur: "#312e82", achter: "#eef0ff" },
  bekeken: { label: "Klant bezig", kleur: "#0b6bcb", achter: "#e6f2ff" },
  afgerond: { label: "Klant klaar", kleur: "#b86e00", achter: "#fff4e5" },
  ingericht: { label: "Ingericht", kleur: "#0a7a4b", achter: "#e3f6ed" },
  ingetrokken: { label: "Ingetrokken", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
};

export const BERICHT_STANDAARD =
  "Welkom bij React2u! Fijn dat we voor {bedrijf} aan de slag gaan. Hieronder staat alles wat je nodig hebt om goed te starten: hoe we werken, wat je medewerkers doen bij ziekte, en de gegevens die we van jullie nodig hebben om alles in te richten.\n\nVul in wat je online kunt invullen; je kunt altijd tussendoor stoppen en later verder. Vragen? Bel of mail me gerust.";

/* ---------- formulier 1: inrichting nieuwe klant ---------- */

export type Veld = {
  naam: string;
  label: string;
  verplicht?: boolean;
  type?: "text" | "email" | "tel";
  hint?: string;
  /** Halve breedte op de pagina. */
  half?: boolean;
  max?: number;
  autocomplete?: string;
};

export type VeldGroep = { titel: string; tekst?: string; velden: Veld[] };

export const INRICHTING: VeldGroep[] = [
  {
    titel: "Bedrijf",
    velden: [
      { naam: "bedrijfsnaam", label: "Naam bedrijf", verplicht: true, autocomplete: "organization" },
      { naam: "afdelingen", label: "Afdelingen", hint: "Als je verzuim per afdeling wilt zien. Eén per regel of gescheiden door komma's.", max: 1000 },
      { naam: "kvk", label: "KvK-nummer", verplicht: true, half: true },
      { naam: "btw", label: "Btw-nummer", half: true },
      { naam: "uwv", label: "Aansluitnummer UWV", half: true, hint: "Staat op post van het UWV." },
      { naam: "loonheffingsnummer", label: "Loonheffingsnummer", half: true, hint: "Bijvoorbeeld 123456789L01." },
    ],
  },
  {
    titel: "Facturatie",
    velden: [
      { naam: "factuur_straat", label: "Straat en huisnummer", verplicht: true, autocomplete: "street-address" },
      { naam: "factuur_postcode", label: "Postcode", verplicht: true, half: true, autocomplete: "postal-code", max: 10 },
      { naam: "factuur_plaats", label: "Plaats", verplicht: true, half: true, autocomplete: "address-level2" },
      { naam: "factuur_email", label: "E-mailadres voor facturen", verplicht: true, type: "email" },
      { naam: "iban", label: "IBAN", half: true, hint: "Alleen bij betalen via automatische incasso." },
      { naam: "rekeninghouder", label: "Ten name van", half: true },
    ],
  },
  {
    titel: "Contactpersoon",
    tekst: "Ons aanspreekpunt voor verzuim binnen jullie organisatie.",
    velden: [
      { naam: "contact_naam", label: "Naam", verplicht: true, autocomplete: "name" },
      { naam: "contact_functie", label: "Functie", half: true },
      { naam: "contact_telefoon", label: "Telefoon", type: "tel", half: true, autocomplete: "tel" },
      { naam: "contact_email", label: "E-mail", verplicht: true, type: "email", autocomplete: "email" },
    ],
  },
];

/* ---------- formulier 2: machtiging (de gegevens van de latende arbodienst) ---------- */

export const MACHTIGING: VeldGroep[] = [
  {
    titel: "Je vorige arbodienst en bedrijfsarts",
    tekst: "Die zetten we op de machtiging. De werknemer vult daarna alleen zijn eigen gegevens in en tekent.",
    velden: [
      { naam: "arbodienst", label: "Arbodienst", verplicht: true },
      { naam: "plaats", label: "Vestigingsplaats", half: true },
      { naam: "bedrijfsarts", label: "Naam bedrijfsarts", half: true },
      { naam: "big", label: "BIG-registratienummer", half: true, hint: "Weet je het niet? Laat het leeg, dan vragen wij het op." },
      { naam: "email", label: "E-mail arbodienst", type: "email", half: true, hint: "Daar vragen wij het dossier op." },
    ],
  },
];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Alleen de bekende velden, getrimd en ingekort. */
export function schoonVelden(groepen: VeldGroep[], invoer: Record<string, unknown>): Record<string, string> {
  const uit: Record<string, string> = {};
  for (const v of groepen.flatMap((g) => g.velden)) {
    const w = String(invoer?.[v.naam] ?? "").trim().slice(0, v.max ?? 200);
    if (w) uit[v.naam] = w;
  }
  return uit;
}

/** Wat er niet klopt, per veld; leeg = goed. */
export function controleerVelden(groepen: VeldGroep[], data: Record<string, string>): Record<string, string> {
  const fouten: Record<string, string> = {};
  for (const v of groepen.flatMap((g) => g.velden)) {
    const w = data[v.naam] || "";
    if (v.verplicht && !w) fouten[v.naam] = "Vul dit in.";
    else if (w && v.type === "email" && !EMAIL.test(w)) fouten[v.naam] = "Dit e-mailadres klopt niet.";
  }
  if (data.kvk && !/^\d{8}$/.test(data.kvk.replace(/\s/g, ""))) fouten.kvk = "Een KvK-nummer heeft 8 cijfers.";
  if (data.iban && !ibanGeldig(data.iban)) fouten.iban = "Dit IBAN klopt niet.";
  if (data.factuur_postcode && !/^\d{4}\s?[a-z]{2}$/i.test(data.factuur_postcode) && !/^[a-z0-9 -]{3,10}$/i.test(data.factuur_postcode)) {
    fouten.factuur_postcode = "Deze postcode klopt niet.";
  }
  return fouten;
}

/** IBAN met de mod 97-controle. */
export function ibanGeldig(iban: string): boolean {
  const s = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const omgezet = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const c of omgezet) rest = (rest * 10 + Number(c)) % 97;
  return rest === 1;
}

/* ---------- formulier 3: het werknemersbestand (import XpertSuite) ---------- */

export type WerknemerKolom = {
  naam: string;
  label: string;
  verplicht?: boolean;
  type?: "text" | "date" | "email" | "tel" | "number" | "geslacht";
  /** Kolom in het importbestand van XpertSuite. */
  xpert: string[];
  breed?: boolean;
};

/** De velden die de klant per medewerker invult; de rest van de 37 kolommen blijft leeg. */
export const WERKNEMER_KOLOMMEN: WerknemerKolom[] = [
  { naam: "voorletters", label: "Voorletters", verplicht: true, xpert: ["voorletters"] },
  { naam: "roepnaam", label: "Roepnaam", verplicht: true, xpert: ["roepnaam"] },
  { naam: "tussenvoegsels", label: "Tussenvoegsel", xpert: ["tussenvoegsels"] },
  { naam: "achternaam", label: "Achternaam", verplicht: true, xpert: ["Eigen_achternaam"] },
  { naam: "geslacht", label: "Geslacht", type: "geslacht", xpert: ["geslacht"] },
  { naam: "geboortedatum", label: "Geboortedatum", verplicht: true, type: "date", xpert: ["geboortedatum"] },
  { naam: "bsn", label: "BSN", verplicht: true, xpert: ["Burgerservicenummer"] },
  { naam: "personeelsnummer", label: "Personeelsnummer", xpert: ["Personeelsnummer"] },
  { naam: "adres", label: "Straat", verplicht: true, xpert: ["adres"], breed: true },
  { naam: "huisnummer", label: "Huisnr.", verplicht: true, xpert: ["huisnummer"] },
  { naam: "toevoeging", label: "Toev.", xpert: ["Huisnummer_toevoeging"] },
  { naam: "postcode", label: "Postcode", verplicht: true, xpert: ["postcode"] },
  { naam: "plaats", label: "Plaats", verplicht: true, xpert: ["plaatsnaam"] },
  { naam: "mobiel", label: "Mobiel", type: "tel", xpert: ["telefoon_mobiel"] },
  { naam: "email_thuis", label: "E-mail privé", type: "email", xpert: ["email_adres_thuis"], breed: true },
  { naam: "email_werk", label: "E-mail werk", type: "email", xpert: ["email_adres_werk"], breed: true },
  { naam: "functie", label: "Functie", xpert: ["naam_functie"] },
  { naam: "afdeling", label: "Afdeling", xpert: ["Naam_afdeling"] },
  { naam: "uren", label: "Uren per week", type: "number", xpert: ["omvangdienstverband"] },
  { naam: "startdatum", label: "In dienst sinds", verplicht: true, type: "date", xpert: ["startdatum_dienstverband", "start_overeenkomst"] },
  { naam: "einddatum", label: "Einddatum contract", type: "date", xpert: ["einddatum_dienstverband", "einde_overeenkomst"] },
];

/** De 37 kolommen van het lege importbestand van XpertSuite, in hun volgorde. */
export const XPERT_KOLOMMEN = [
  "Burgerservicenummer", "Personeelsnummer", "code_werkgever", "IsAnoniem", "roepnaam", "voorletters", "tussenvoegsels",
  "Eigen_achternaam", "geslacht", "geboortedatum", "Overlijdensdatum", "Tussenvoegsels_partner", "Achternaam_partner",
  "Voorkeurshantering", "adres", "huisnummer", "Huisnummer_toevoeging", "postcode", "plaatsnaam", "landcode",
  "ExtraAdresRegel", "telefoon_werk", "telefoon_thuis", "telefoon_mobiel", "telefoon_mobiel_werk", "email_adres_thuis",
  "email_adres_werk", "start_overeenkomst", "einde_overeenkomst", "code_afdeling", "Naam_afdeling", "naam_functie",
  "code_functie", "Loonomvang", "omvangdienstverband", "startdatum_dienstverband", "einddatum_dienstverband",
] as const;

export type Werknemer = Record<string, string>;
export const MAX_WERKNEMERS = 500;

/** BSN met de elfproef. */
export function bsnGeldig(bsn: string): boolean {
  const s = bsn.replace(/\D/g, "").padStart(9, "0");
  if (!/^\d{9}$/.test(s) || /^0+$/.test(s)) return false;
  let som = 0;
  for (let i = 0; i < 8; i++) som += Number(s[i]) * (9 - i);
  som -= Number(s[8]);
  return som % 11 === 0;
}

/** Eén medewerker: alleen bekende velden, getrimd. Lege rijen vallen weg. */
export function schoneWerknemers(rijen: unknown): Werknemer[] {
  if (!Array.isArray(rijen)) return [];
  return rijen
    .slice(0, MAX_WERKNEMERS)
    .map((r) => {
      const uit: Werknemer = {};
      for (const k of WERKNEMER_KOLOMMEN) {
        let w = String((r as Record<string, unknown>)?.[k.naam] ?? "").trim().slice(0, 120);
        if (k.naam === "bsn") w = w.replace(/\D/g, "");
        if (k.naam === "postcode") w = w.toUpperCase();
        if (k.type === "geslacht" && !["M", "V", "X"].includes(w)) w = "";
        if (k.type === "date" && w && !/^\d{4}-\d{2}-\d{2}$/.test(w)) w = datumNaarIso(w) || "";
        if (w) uit[k.naam] = w;
      }
      return uit;
    })
    .filter((r) => Object.keys(r).length > 0);
}

/** "31-12-1980" of "31/12/1980" naar "1980-12-31"; anders null. */
export function datumNaarIso(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** "1980-12-31" naar "31-12-1980", zoals XpertSuite en Nederlanders hem lezen. */
export function datumNl(iso: string | undefined): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso || "";
}

/** Per rij (index) en veld wat er niet klopt. */
export function controleerWerknemers(rijen: Werknemer[]): Record<number, Record<string, string>> {
  const fouten: Record<number, Record<string, string>> = {};
  rijen.forEach((r, i) => {
    const f: Record<string, string> = {};
    for (const k of WERKNEMER_KOLOMMEN) {
      const w = r[k.naam] || "";
      if (k.verplicht && !w) f[k.naam] = "Verplicht";
      else if (w && k.type === "email" && !EMAIL.test(w)) f[k.naam] = "Geen geldig e-mailadres";
      else if (w && k.type === "number" && !/^\d{1,2}([.,]\d{1,2})?$/.test(w)) f[k.naam] = "Aantal uren, bijvoorbeeld 32";
    }
    if (r.bsn && !bsnGeldig(r.bsn)) f.bsn = "Dit BSN klopt niet";
    if (r.postcode && !/^\d{4}\s?[A-Z]{2}$/.test(r.postcode)) f.postcode = "Bijvoorbeeld 5611 NB";
    if (Object.keys(f).length) fouten[i] = f;
  });
  return fouten;
}

/** De medewerkers als rijen voor het importbestand: de 37 kolommen, in volgorde. */
export function naarXpertRijen(rijen: Werknemer[], codeWerkgever?: string | null): string[][] {
  return rijen.map((r) => {
    const rij: Record<string, string> = { landcode: "NL" };
    if (codeWerkgever) rij.code_werkgever = codeWerkgever;
    for (const k of WERKNEMER_KOLOMMEN) {
      const w = r[k.naam];
      if (!w) continue;
      for (const x of k.xpert) rij[x] = k.type === "date" ? datumNl(w) : k.naam === "postcode" ? w.replace(/\s/g, "") : w;
    }
    return XPERT_KOLOMMEN.map((x) => rij[x] || "");
  });
}

/* ---------- de inhoud van de leesdocumenten ---------- */

export type TijdlijnStap = { moment: string; wat: string; wie: string; fase: "start" | "begeleiding" | "uwv" | "spoed" };

export const WELKOM = {
  titel: "Welkom bij React2u, jouw arbodienst.",
  intro: [
    "Als werkgever wil je dat zieke werknemers de juiste zorg krijgen, en dat je zelf de juiste stappen zet binnen de wettelijke kaders van verzuim.",
    "Wij volgen dit proces nauwlettend, bewaken de belangrijke momenten en zetten de acties uit die nodig zijn. Zo ziet dat eruit:",
  ],
  tijdlijn: [
    { moment: "Dag 1", wat: "Werknemer meldt zich ziek bij de werkgever", wie: "Werknemer", fase: "start" },
    { moment: "Dag 1", wat: "Werkgever meldt de werknemer ziek bij de arbodienst", wie: "Werkgever", fase: "start" },
    { moment: "Dag 1 tot 3", wat: "Eerste contact met de zieke werknemer", wie: "React2u", fase: "start" },
    { moment: "Week 1 tot 6", wat: "Begeleiding en monitoring van het verzuim", wie: "React2u", fase: "begeleiding" },
    { moment: "Week 6 tot 12", wat: "Probleemanalyse opstellen", wie: "Bedrijfsarts", fase: "begeleiding" },
    { moment: "Week 8 tot 13", wat: "Plan van aanpak opstellen", wie: "Werkgever en werknemer", fase: "begeleiding" },
    { moment: "Elke 6 weken", wat: "Evaluatie van het plan van aanpak", wie: "Werkgever en werknemer, met React2u", fase: "begeleiding" },
    { moment: "Week 42", wat: "Ziekmelding bij het UWV", wie: "Werkgever", fase: "uwv" },
    { moment: "Week 52", wat: "Eerstejaarsevaluatie", wie: "Werkgever en werknemer", fase: "uwv" },
    { moment: "Week 52 tot 88", wat: "Voortzetting re-integratie, eventueel spoor 2", wie: "Werkgever en React2u", fase: "uwv" },
    { moment: "Week 88", wat: "WIA-aanvraag voorbereiden", wie: "Werknemer en React2u", fase: "uwv" },
    { moment: "Week 91", wat: "WIA-aanvraag indienen", wie: "Werknemer", fase: "uwv" },
    { moment: "Week 104", wat: "Einde wachttijd WIA en einde loondoorbetalingsplicht", wie: "UWV en werkgever", fase: "uwv" },
    { moment: "Spoed", wat: "Bij spoed en calamiteiten plannen we de werknemer meteen in bij de bedrijfsarts", wie: "React2u", fase: "spoed" },
  ] satisfies TijdlijnStap[],
  geruststelling: "Je hoeft dit traject niet zelf te bewaken. React2u begeleidt je door het hele proces, bewaakt de wettelijke termijnen en ondersteunt bij alle verplichte stappen.",
  secties: [
    {
      kop: "Zo loopt een ziekmelding",
      alineas: [
        "Een zieke werknemer meldt zich bij jou volgens het verzuimprotocol, het liefst telefonisch. Zo haal je in het gesprek de context van de melding op. Die ziekmelding ontvangen wij in ons systeem.",
        "Daarna bellen we jou meestal voor wat achtergrond, zodat we goed voorbereid zijn als we de werknemer spreken. Binnen 1 tot 3 werkdagen nemen we contact op met jou en met de werknemer.",
      ],
    },
    {
      kop: "Alles in één beveiligde omgeving",
      alineas: [
        "In de beveiligde omgeving van XpertSuite zie je de voortgang, de contactmomenten en de teruggekoppelde adviezen. Je legt er zelf je momenten vast met de notitiefunctie en uploadt documenten voor het re-integratieverslag.",
        "Alle rapportages zijn zichtbaar, behalve medische gegevens en informatie van behandelaren. Die zijn wettelijk niet toegankelijk voor de werkgever; alleen de bedrijfsarts en de casemanager in taakdelegatie zien ze.",
        "Communiceer daarom bij voorkeur via de beveiligde omgeving en niet via Outlook. Bellen kan natuurlijk altijd.",
      ],
    },
    {
      kop: "Je vaste aanspreekpunt",
      alineas: [
        "Bel altijd eerst je eigen taakgedelegeerde casemanager. Niet bereikbaar? Dan helpt het team je verder via 085 620 58 00 of info@react2u.nl.",
        "Wil je wegwijs worden in het systeem? Plan een afspraak op kantoor of online, dan lopen we het samen door.",
      ],
    },
    {
      kop: "De bedrijfsarts",
      alineas: [
        "Duurt het verzuim volgens de wettelijke termijn langer, of is er een medische noodzaak, dan plannen we een afspraak bij een van onze bedrijfsartsen. We volgen het advies van de bedrijfsarts op en houden nauw en persoonlijk contact met jou en met de werknemer.",
      ],
    },
  ],
};

export type ProtocolStap = { letter: string; kop: string; tekst: string; kleur: string };

export const VERZUIMPROTOCOL: { titel: string; intro: string; stappen: ProtocolStap[] } = {
  titel: "Verzuimprotocol",
  intro: "Ziek? Zo pak je het aan. Zes stappen, van je eerste telefoontje tot je terugkeer op het werk.",
  stappen: [
    { letter: "R", kop: "Rechten en plichten", kleur: "#E61674", tekst: "Ben je ziek en kun je niet werken? Dan heb je rechten en plichten. Je hebt recht op loon tijdens ziekte en op goede zorg. Je bent verplicht bereikbaar te zijn en samen te zoeken naar mogelijkheden om te werken." },
    { letter: "E", kop: "Even je werk bellen", kleur: "#00A098", tekst: "Bel je werk zodra je weet dat je niet kunt werken. Werk je via een uitzendbureau? Bel dan je juridisch werkgever, het uitzendbureau én de inlener waar je op dat moment werkt. Licht iedereen telefonisch in." },
    { letter: "A", kop: "Altijd aangeven", kleur: "#3AA5DD", tekst: "Geef door hoe lang je verwacht ziek te zijn, op welk adres en nummer je bereikbaar bent, en welk werk je nog wél kunt doen. Je werkgever vraagt ook of er sprake is van een vangnetsituatie of regres (een ongeval)." },
    { letter: "C", kop: "Contact met React2u", kleur: "#F19001", tekst: "Na je ziekmelding neemt arbodienst React2u contact met je op. Wij zijn de verbindende factor en helpen je samen met je werkgever op een goede manier terug naar het werk." },
    { letter: "T", kop: "Traject van verzuim", kleur: "#CA152A", tekst: "React2u heeft een geheimhoudingsplicht: je kunt alles met ons delen, van medische informatie tot problemen op het werk. We ondersteunen je bij je re-integratie." },
    { letter: "2U", kop: "Wij zijn er voor jou", kleur: "#E61674", tekst: "Samen met de bedrijfsarts kijken we wat je nodig hebt en maken we een plan van aanpak. Jij en je werkgever zijn samen verantwoordelijk om je eraan te houden; wij ondersteunen je daarbij." },
  ],
};

export type VraagRij = { onderwerp: string; mag: boolean; opmerking: string };

export const VRAGEN = {
  titel: "Wat je wél mag vragen bij ziekteverzuim",
  intro: "Een werkgever mag alleen vragen wat nodig is om het verzuim goed te registreren, de loonbetaling te regelen en passende maatregelen voor re-integratie te nemen.",
  welVragen: [
    { kop: "Het verwachte verloop", punten: ["Hoe lang denk je afwezig te zijn?", "Wanneer verwacht je weer te kunnen werken?", "Is er sprake van een arbeidsongeval, regres of een vangnetsituatie?"] },
    { kop: "Werk dat nog wél kan", punten: ["Kun je (deels) thuiswerken?", "Kun je aangepast werk doen?"] },
    { kop: "Lopende afspraken", punten: ["Welke klanten, projecten of overleggen moeten worden overgenomen of verzet?"] },
    { kop: "Bereikbaarheid", punten: ["Wat is je actuele verblijfsadres en telefoonnummer? Alleen als dat nodig is voor contact over verzuim of re-integratie."] },
  ],
  nietVragen: [
    "Wat iemand precies mankeert (de aard of oorzaak van de ziekte)",
    "Welke klachten iemand heeft of welke behandeling",
    "Of iemand naar een arts of specialist gaat",
    "Of iemand medicijnen gebruikt",
  ],
  nietToelichting: "Deze informatie is alleen voor de bedrijfsarts of de taakgedelegeerde van de bedrijfsarts.",
  bedrijfsarts: {
    tekst: "De bedrijfsarts mag meer medische informatie hebben, maar geeft aan de werkgever alleen dit door:",
    punten: [
      "Of de werknemer arbeidsgeschikt of arbeidsongeschikt is",
      "De verwachte duur van het verzuim",
      "De beperkingen en mogelijkheden, functioneel en niet medisch",
      "Adviezen voor re-integratie of aanpassing van het werk",
    ],
    voorbeeld: "Dus geen medische details maar functionele informatie, zoals “kan niet lang staan” of “tijdelijk geen klantcontact”.",
  },
  tabel: [
    { onderwerp: "Oorzaak van de ziekte", mag: false, opmerking: "Alleen voor de bedrijfsarts" },
    { onderwerp: "Verwachte duur", mag: true, opmerking: "Voor planning en administratie" },
    { onderwerp: "Werk dat nog wel kan", mag: true, opmerking: "Voor re-integratie" },
    { onderwerp: "Beperkingen, zonder medische oorzaak", mag: true, opmerking: "Alleen functioneel" },
    { onderwerp: "Behandeling of medicijnen", mag: false, opmerking: "Medisch geheim" },
    { onderwerp: "Contactgegevens", mag: true, opmerking: "Alleen als het nodig is" },
    { onderwerp: "Verblijfplaats tijdens ziekte", mag: true, opmerking: "Alleen voor contact of controle" },
  ] satisfies VraagRij[],
  script: [
    { kop: "Begin van het gesprek", zin: "Bedankt dat je belt. Vervelend dat je je niet goed voelt, ik hoop dat het snel beter gaat. Ik stel een paar korte vragen om de ziekmelding goed vast te leggen. Medische details hoef en mag ik niet weten, dus daar vraag ik niet naar." },
    { kop: "Verwachte duur", zin: "Kun je inschatten hoe lang je afwezig bent? Weet je al wanneer je weer kunt werken, eventueel aangepast of gedeeltelijk?", noot: "Bijvoorbeeld een dag, een paar dagen, langer of nog onbekend." },
    { kop: "Werk dat nog wél kan", zin: "Zijn er werkzaamheden die je nog wel kunt doen, bijvoorbeeld thuis of met aangepaste taken?", noot: "Vraag naar mogelijkheden, niet naar de oorzaak van beperkingen." },
    { kop: "Lopende zaken", zin: "Moet er vandaag of de komende dagen iets worden overgenomen of verzet?", noot: "Klantafspraken, deadlines, vergaderingen." },
    { kop: "Bereikbaarheid", zin: "Is dit nummer het beste om contact te houden? Verblijf je ergens anders waar we je kunnen bereiken als dat nodig is?" },
    { kop: "De arbodienst", zin: "Duurt het verzuim wat langer, dan schakelen we de arbodienst in. Die bespreekt met jou wat medisch mogelijk is. Alleen de bedrijfsarts mag vragen stellen over je gezondheid of behandeling." },
    { kop: "Afronden", zin: "Dank je wel. Rust goed uit. We houden contact over hoe het gaat en wat er qua werk mogelijk is als je weer beter bent." },
  ],
  intern: [
    "Registreer alleen functionele en organisatorische informatie, geen medische gegevens.",
    "Houd notities neutraal: “verwacht eind van de week terug”, niet “griep”.",
    "Medische informatie loopt uitsluitend via de bedrijfsarts.",
    "Deelt een werknemer uit zichzelf medische details, noteer die dan niet.",
  ],
};

export const MACHTIGING_TEKST = {
  titel: "Machtiging overdracht verzuimdossier",
  alinea:
    "Je werkgever heeft de arbodienstverlening overgedragen aan React2u. Met deze machtiging geef je toestemming om je lopende verzuimdossier over te dragen aan de opvolgende bedrijfsarts hieronder. Zo heeft de nieuwe bedrijfsarts genoeg medische informatie om je begeleiding voort te zetten, en voorkomen we dubbele onderzoeken. React2u gaat vanzelfsprekend vertrouwelijk om met je medische gegevens.",
  werknemer: ["Naam", "Adres", "Postcode en woonplaats", "Geboortedatum", "BSN", "Telefoonnummer"],
  facturen: `Facturen voor de overdracht kunnen naar ${REACT2U.facturatie}.`,
};

/* ---------- pure hulp voor de pagina's ---------- */

/** De fouten die de klantacties teruggeven, in gewone taal. */
export const ONBOARDING_FOUT: Record<string, string> = {
  onbekend: "Deze link werkt niet (meer). Neem contact met ons op.",
  concept: "Dit is een voorbeeld: invullen kan pas als de onboarding verstuurd is.",
  gesloten: "Deze onboarding is gesloten. Neem contact met ons op.",
  document: "Dit document hoort niet bij jullie onboarding.",
  invoer: "Er klopt iets niet aan wat je invulde. Controleer de velden.",
  limiet: "Je hebt het kort na elkaar heel vaak geprobeerd. Wacht even en probeer het opnieuw.",
  storing: "Opslaan lukte niet door een storing. Probeer het zo opnieuw.",
};

/** Wat er nog ontbreekt om te versturen; leeg = klaar. */
export function controleerOnboarding(o: Pick<Onboarding, "bedrijf" | "email" | "documenten">): string[] {
  const fouten: string[] = [];
  if (!o.bedrijf?.trim()) fouten.push("De naam van het bedrijf ontbreekt.");
  if (o.email && !EMAIL.test(o.email)) fouten.push("Het e-mailadres klopt niet.");
  if (!o.documenten.length) fouten.push("Kies minstens één document om mee te sturen.");
  return fouten;
}
