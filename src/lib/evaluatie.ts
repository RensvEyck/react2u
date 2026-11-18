/**
 * Klantevaluatie (migratie 0043): het jaarlijkse evaluatieformulier "Klant
 * Evaluatie" (Word, v2) als losse module onder Documenten. De klant krijgt één
 * persoonlijke link en vult online in; het beheer leest mee, en de pdf komt in
 * de huisstijl.
 *
 * Puur, zonder database: de tekst van het document (letterlijk uit het Word-
 * bestand, met het "u" van het origineel; de knoppen en uitleg eromheen zeggen
 * "je"), de vorm van de antwoorden en hun controles. Dezelfde bron voor het
 * beheer, de klantpagina, de pdf en de mail.
 */
import { OFFERTE_EMAIL } from "./offertes";

export type EvaluatieStatus = "concept" | "verstuurd" | "ingevuld" | "ingetrokken";

/** Een rij uit `evaluaties`, zoals het beheer hem leest. */
export type Evaluatie = {
  id: string;
  nummer: string;
  token: string;
  status: EvaluatieStatus;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  bericht: string | null;
  /** De dag van het (geplande) bezoek, als 2026-11-20; met de tijd als vrije tekst ("10.00 uur"). */
  bezoek_datum: string | null;
  bezoek_tijd: string | null;
  antwoorden: EvaluatieAntwoorden | null;
  ingevuld_at: string | null;
  ingevuld_door: string | null;
  afzender_naam: string | null;
  afzender_functie: string | null;
  afzender_email: string | null;
  afzender_telefoon: string | null;
  notitie: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  verstuurd_at: string | null;
  bekeken_at: string | null;
  laatst_bekeken_at: string | null;
  aantal_bekeken: number;
};

/** Wat `evaluatie_bekijken` teruggeeft: zonder notitie en interne velden; wel het e-mailadres van de klant, want dat staat op het formulier. */
export type EvaluatiePubliek = Pick<
  Evaluatie,
  | "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "bericht" | "bezoek_datum" | "bezoek_tijd" | "antwoorden" | "ingevuld_at" | "ingevuld_door"
  | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at" | "created_at"
> & { eerste_keer?: boolean };

export type EvaluatieGebeurtenis = {
  id: number;
  evaluatie_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "ingevuld" | "ingetrokken" | "heropend";
  door: string | null;
  details: Record<string, string | number | boolean> | null;
  at: string;
};

/** Afzender en antwoordadres: de salesbox, net als bij offertes en de onboarding. */
export const EVALUATIE_EMAIL = OFFERTE_EMAIL;

/* ---------- de tekst van het document, letterlijk ---------- */

/** De titel en het blok Gegevens bovenaan het formulier. */
export const DOCUMENT = {
  titel: "Klant Evaluatie",
  gegevens: { datum: "Datum bezoek", tijd: "Tijd", bedrijf: "Bedrijfsnaam", contactpersoon: "Contactpersoon", email: "E-mailadres" },
  checklist: "Checklist",
} as const;

export type ChecklistSleutel = "rie" | "psa" | "aanstellingskeuring" | "bedrijfsarts" | "pmo" | "preventiemedewerker" | "ondernemingsraad" | "klachtenprocedure" | "verzuimprotocol";

export type ChecklistPunt = {
  sleutel: ChecklistSleutel;
  /** Het kopje achter het vakje, zoals in het document (in hoofdletters). */
  titel: string;
  /** Een leesbare naam voor het beheer, de mail en de tijdlijn. */
  naam: string;
  /** De toelichting onder het kopje, letterlijk. */
  toelichting: string;
  /** Open vragen bij dit punt, letterlijk (alleen bij de preventiemedewerker). */
  vragen?: { naam: string; label: string }[];
};

/** De negen punten van de checklist, in de volgorde van het document. */
export const CHECKLIST: ChecklistPunt[] = [
  {
    sleutel: "rie",
    titel: "RI&E",
    naam: "RI&E",
    toelichting:
      "U heeft een actuele Risico-inventarisatie en -evaluatie (RI&E) met Plan van aanpak? De RI&E geeft inzicht in alle arbeidsrisico’s in uw bedrijf. In het Plan van aanpak neemt u op hoe u deze risico’s aanpakt. Het resultaat: minder verzuim, efficiënter werken en gemotiveerde medewerkers.",
  },
  {
    sleutel: "psa",
    titel: "PSA",
    naam: "PSA",
    toelichting:
      "Heeft u de bronnen van PSA in kaart gebracht? Dan legt u de aanpak op ongewenste situaties vast in een wettelijk verplicht beleid psychosociale arbeidsbelasting. Een onderdeel van dit beleid is de ‘gedragscode’, waarin je als werkgever duidelijk maakt wat gewenst en ongewenst gedrag is. En wat medewerkers kunnen doen als ze ongewenst gedrag ervaren.",
  },
  {
    sleutel: "aanstellingskeuring",
    titel: "AANSTELLINGSKEURING (van toepassing)",
    naam: "Aanstellingskeuring",
    toelichting:
      "Waar nodig biedt u uw medewerkers een aanstellingskeuring aan. In bepaalde branches is een medische keuring noodzakelijk. Voor sommige beroepen is zo’n keuring zelfs verplicht.",
  },
  {
    sleutel: "bedrijfsarts",
    titel: "VRIJE TOEGANG BEDRIJFSARTS (open spreekuur)",
    naam: "Vrije toegang bedrijfsarts",
    toelichting:
      "Uw medewerkers hebben de mogelijkheid een bedrijfsarts te bezoeken, bijvoorbeeld via een open spreekuur. Informeer uw medewerkers dat ze de bedrijfsarts kunnen bezoeken voor vragen over hun gezondheid in relatie tot het werk, ook als er (nog) geen sprake is van verzuim of klachten. Hiermee kunt u verzuim voorkomen.",
  },
  {
    sleutel: "pmo",
    titel: "PMO",
    naam: "PMO",
    toelichting:
      "U biedt uw medewerkers elke paar jaar een Preventief medisch onderzoek (PMO) of een Periodiek arbeidsgezondheidskundig onderzoek (PAGO) aan Het PMO geeft uw medewerkers inzicht in hun fysieke en mentale gezondheid. Ook krijgen ze een adviesgesprek met één van onze experts voor concrete tips. Zo bevordert u de gezondheid en vitaliteit in uw bedrijf.",
  },
  {
    sleutel: "preventiemedewerker",
    titel: "PREVENTIE MEDEWERKER",
    naam: "Preventiemedewerker",
    toelichting: "Iedere organisatie moet 1 preventiemedewerker aanstellen. Bij een bedrijf met minder dan 25 werknemers mag dit ook de directeur zijn.",
    vragen: [
      { naam: "training", label: "Op welke wijze is de preventiemedewerker in uw organisatie getraind en geschoold?" },
      { naam: "interesse", label: "Heeft u interesse in een dergelijke training?" },
    ],
  },
  {
    sleutel: "ondernemingsraad",
    titel: "ONDERNEMINGSRAAD",
    naam: "Ondernemingsraad",
    toelichting:
      "Indien uw organisatie < 50 is een ondernemingsraad een verplichting binnen de arbeidsomstandigheden wetgeving. Is er overeenstemming met de werknemersvertegenwoordiging over de volledige inhoud en uitvoering van de arbeidsomstandighedenbeleid en ziekteverzuimbegeleiding",
  },
  {
    sleutel: "klachtenprocedure",
    titel: "KLACHTENPROCEDURE",
    naam: "Klachtenprocedure",
    toelichting:
      "Heeft u een klachtenprocedure? Soms kan het voorkomen dat iemand een officiële klacht wil indienen na een gebeurtenis. Is de procedure daarvoor bekend bij uw werknemers?",
  },
  {
    sleutel: "verzuimprotocol",
    titel: "VERZUIMPROTOCOL",
    naam: "Verzuimprotocol",
    toelichting:
      "Beschikt uw organisatie over een actueel verzuimbeleid/regelement passend bij uw organisatie en de wettelijke wetgeving voor de begeleiding in de Wet Verbetering Poortwachter als indien van toepassing in de uitvoering Ziektewet als Eigen Risico Drager.",
  },
];

export const CHECKLIST_SLEUTELS = CHECKLIST.map((p) => p.sleutel);

export function isChecklistSleutel(s: unknown): s is ChecklistSleutel {
  return typeof s === "string" && (CHECKLIST_SLEUTELS as string[]).includes(s);
}

export function checklistPunt(s: ChecklistSleutel): ChecklistPunt {
  return CHECKLIST.find((p) => p.sleutel === s)!;
}

/**
 * Het vakje van het document, online in drie standen. Het origineel heeft één
 * vakje per punt; "van toepassing" achter de aanstellingskeuring laat zien dat
 * niet elk punt voor elk bedrijf geldt.
 */
export type ChecklistAntwoord = "ja" | "nee" | "nvt";

export const CHECKLIST_ANTWOORDEN: { key: ChecklistAntwoord; label: string; kort: string; kleur: string; achter: string }[] = [
  { key: "ja", label: "Ja, geregeld", kort: "Ja", kleur: "#0A7A4B", achter: "#E3F6ED" },
  { key: "nee", label: "Nee, nog niet", kort: "Nee", kleur: "#B42318", achter: "#FDECEA" },
  { key: "nvt", label: "Niet van toepassing", kort: "N.v.t.", kleur: "#6B6985", achter: "#ECEBF5" },
];

export function isChecklistAntwoord(s: unknown): s is ChecklistAntwoord {
  return s === "ja" || s === "nee" || s === "nvt";
}

export function antwoordInfo(a: ChecklistAntwoord) {
  return CHECKLIST_ANTWOORDEN.find((x) => x.key === a)!;
}

/** De drie vrije vakken van het document, in volgorde. */
export type VrijeVeldSleutel = "evaluatie" | "wensen" | "afspraken";

export const VRIJE_VELDEN: { sleutel: VrijeVeldSleutel; titel: string; hint: string }[] = [
  { sleutel: "evaluatie", titel: "Evaluatie dienstverlening (tevens wijzen op het KTO)", hint: "Hoe ervaar je onze dienstverlening het afgelopen jaar? Wat ging goed, wat kan beter?" },
  { sleutel: "wensen", titel: "Wensen komend jaar dienstverlening", hint: "Waar wil je komend jaar aandacht voor, en wat heb je daarbij van ons nodig?" },
  { sleutel: "afspraken", titel: "Gemaakte afspraken", hint: "Wat spreken we af? Wij vullen dit na het gesprek aan als dat nodig is." },
];

/** De regel onder de gemaakte afspraken, letterlijk. */
export const VOLGEND_BEZOEK = { datum: "Datum volgend bezoek", tijd: "Tijd", tot: "tot" } as const;

/** De tabel onderaan, letterlijk: drie kolommen, in het document vier lege rijen. */
export const ACTIES = { titel: "Acties", kolommen: { actie: "Acties", door: "Actie door", status: "Status" }, rijen: 4 } as const;
export const MAX_ACTIES = 12;

/** Wat het KTO is, voor de klant die het niet kent. */
export const KTO_UITLEG = "KTO staat voor klanttevredenheidsonderzoek: los van dit gesprek vragen we je eens per jaar in een korte vragenlijst hoe tevreden je bent.";

/* ---------- de antwoorden ---------- */

export type ChecklistInvulling = { antwoord: ChecklistAntwoord; toelichting?: string; vragen?: Record<string, string> };

export type Actie = { actie: string; door: string; status: string };

export type EvaluatieAntwoorden = {
  checklist: Partial<Record<ChecklistSleutel, ChecklistInvulling>>;
  evaluatie?: string;
  wensen?: string;
  afspraken?: string;
  volgend_bezoek?: { datum?: string; tijd?: string; tot?: string };
  acties: Actie[];
};

const MAX_TEKST = 5000;
const MAX_KORT = 300;
const knip = (w: unknown, max: number) => String(w ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

/** Alleen de bekende velden, getrimd en ingekort; lege acties vallen weg. */
export function schoonAntwoorden(invoer: unknown): EvaluatieAntwoorden {
  const i = obj(invoer);
  const checklist: EvaluatieAntwoorden["checklist"] = {};
  const cl = obj(i.checklist);
  for (const p of CHECKLIST) {
    const r = obj(cl[p.sleutel]);
    if (!isChecklistAntwoord(r.antwoord)) continue;
    const uit: ChecklistInvulling = { antwoord: r.antwoord };
    const toelichting = knip(r.toelichting, MAX_TEKST);
    if (toelichting) uit.toelichting = toelichting;
    if (p.vragen) {
      const v = obj(r.vragen);
      const vragen: Record<string, string> = {};
      for (const q of p.vragen) {
        const w = knip(v[q.naam], MAX_TEKST);
        if (w) vragen[q.naam] = w;
      }
      if (Object.keys(vragen).length) uit.vragen = vragen;
    }
    checklist[p.sleutel] = uit;
  }
  const uit: EvaluatieAntwoorden = { checklist, acties: [] };
  for (const v of VRIJE_VELDEN) {
    const w = knip(i[v.sleutel], MAX_TEKST);
    if (w) uit[v.sleutel] = w;
  }
  const vb = obj(i.volgend_bezoek);
  const volgend = { datum: knip(vb.datum, 10), tijd: knip(vb.tijd, 40), tot: knip(vb.tot, 40) };
  if (volgend.datum || volgend.tijd || volgend.tot) {
    uit.volgend_bezoek = Object.fromEntries(Object.entries(volgend).filter(([, w]) => w));
  }
  const acties = Array.isArray(i.acties) ? i.acties : [];
  uit.acties = acties
    .slice(0, MAX_ACTIES)
    .map((a) => {
      const r = obj(a);
      return { actie: knip(r.actie, MAX_KORT), door: knip(r.door, MAX_KORT), status: knip(r.status, MAX_KORT) };
    })
    .filter((a) => a.actie || a.door || a.status);
  return uit;
}

/** Wat er niet klopt, per veld; leeg = goed. Elk punt van de checklist vraagt een antwoord. */
export function controleerAntwoorden(a: EvaluatieAntwoorden): Record<string, string> {
  const fouten: Record<string, string> = {};
  for (const p of CHECKLIST) {
    if (!a.checklist[p.sleutel]) fouten[`checklist.${p.sleutel}`] = "Kies ja, nee of niet van toepassing.";
  }
  const d = a.volgend_bezoek?.datum;
  if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()))) fouten["volgend_bezoek.datum"] = "Deze datum klopt niet.";
  return fouten;
}

/** Hoeveel punten van de checklist beantwoord zijn. */
export function voortgang(a: EvaluatieAntwoorden | null | undefined): { klaar: number; totaal: number } {
  return { klaar: a ? CHECKLIST.filter((p) => a.checklist[p.sleutel]).length : 0, totaal: CHECKLIST.length };
}

/** Per antwoord hoe vaak het gegeven is, voor het beheer en de mail. */
export function telling(a: EvaluatieAntwoorden | null | undefined): Record<ChecklistAntwoord, number> {
  const t: Record<ChecklistAntwoord, number> = { ja: 0, nee: 0, nvt: 0 };
  if (!a) return t;
  for (const p of CHECKLIST) {
    const r = a.checklist[p.sleutel];
    if (r) t[r.antwoord] += 1;
  }
  return t;
}

/** De punten waar de klant "nee" op zei: de aandachtspunten voor het gesprek, in de volgorde van het document. */
export function aandachtspunten(a: EvaluatieAntwoorden | null | undefined): ChecklistPunt[] {
  if (!a) return [];
  return CHECKLIST.filter((p) => a.checklist[p.sleutel]?.antwoord === "nee");
}

/** Of de klant naast de checklist ook iets in de vrije vakken of de acties zette. */
export function heeftToelichting(a: EvaluatieAntwoorden | null | undefined): boolean {
  if (!a) return false;
  return VRIJE_VELDEN.some((v) => Boolean(a[v.sleutel])) || a.acties.length > 0 || Boolean(a.volgend_bezoek);
}

/* ---------- status ---------- */

/** Wat het beheer ziet: de status, verfijnd met of de klant hem al opende. */
export type EvaluatieWeergave = EvaluatieStatus | "bekeken";

export function evaluatieWeergave(e: Pick<Evaluatie, "status" | "bekeken_at">): EvaluatieWeergave {
  if (e.status === "verstuurd" && e.bekeken_at) return "bekeken";
  return e.status;
}

export const EVALUATIE_WEERGAVE: Record<EvaluatieWeergave, { label: string; kleur: string; achter: string }> = {
  concept: { label: "Concept", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verstuurd: { label: "Verstuurd", kleur: "#312e82", achter: "#eef0ff" },
  bekeken: { label: "Klant bezig", kleur: "#0b6bcb", achter: "#e6f2ff" },
  ingevuld: { label: "Ingevuld", kleur: "#0a7a4b", achter: "#e3f6ed" },
  ingetrokken: { label: "Ingetrokken", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
};

export const BERICHT_STANDAARD =
  "Fijn dat we voor {bedrijf} mogen zorgen. Eén keer per jaar kijken we samen hoe het gaat: wat er goed geregeld is, wat beter kan en wat je komend jaar van ons nodig hebt.\n\nVul de evaluatie in wanneer het je uitkomt; het kost een kwartier. Wat je invult, nemen we mee in ons gesprek. Vragen? Bel of mail me gerust.";

/** Hoe lang het invullen ongeveer duurt, voor de klant. */
export const MINUTEN = 15;

/** De fouten die de klantacties teruggeven, in gewone taal. */
export const EVALUATIE_FOUT: Record<string, string> = {
  onbekend: "Deze link werkt niet (meer). Neem contact met ons op.",
  concept: "Dit is een voorbeeld: invullen kan pas als de evaluatie verstuurd is.",
  gesloten: "Deze evaluatie is gesloten. Neem contact met ons op.",
  invoer: "Er klopt iets niet aan wat je invulde. Controleer de velden.",
  limiet: "Je hebt het kort na elkaar heel vaak geprobeerd. Wacht even en probeer het opnieuw.",
  storing: "Opslaan lukte niet door een storing. Probeer het zo opnieuw.",
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Wat er nog ontbreekt om te versturen; leeg = klaar. */
export function controleerEvaluatie(e: Pick<Evaluatie, "bedrijf" | "email">): string[] {
  const fouten: string[] = [];
  if (!e.bedrijf?.trim()) fouten.push("De naam van het bedrijf ontbreekt.");
  if (e.email && !EMAIL.test(e.email)) fouten.push("Het e-mailadres klopt niet.");
  return fouten;
}

/** "10.00" of "10:00 uur" blijft zoals de klant het typte; alleen de lengte wordt bewaakt. */
export function tijdTekst(t: string | null | undefined): string {
  return (t || "").trim().slice(0, 40);
}
