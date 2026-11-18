/**
 * De "Checklist arbeidsomstandigheden - inventarisatie" (migratie 0042): het
 * formulier dat bij elk basiscontract hoort (Rens, 17 nov 2026: "deze moet bij
 * het contract komen, in dezelfde stijl"). De klant krijgt hem op de
 * contractpagina en als pdf bij de contractmail, vult hem online in, en het
 * beheer leest de antwoorden bij het contract.
 *
 * De tekst komt letterlijk uit het Word-bestand "Checklist arbeidsomstandigheden
 * - inventarisatie": de titel, de vijf vakken bovenaan (plaats, bedrijf, datum,
 * naam, functie), de drie kolommen en de acht onderdelen met hun toelichting.
 * Alleen de opmaak is die van de site. Niets samenvatten of herschrijven; wat
 * aan de tekst zelf opvalt ("R&IE", "de arbeidsomstandighedenbeleid") staat zo
 * in het bestand.
 *
 * Puur, zonder database: dezelfde bron voor de klantpagina, het beheer, de pdf
 * en de mails.
 */
import type { Veld } from "./onboarding";

/** De titel zoals hij boven het Word-bestand staat. */
export const CHECKLIST_TITEL = "Checklist arbeidsomstandigheden wet";
/** De naam in het beheer, op knoppen en in bestandsnamen. */
export const CHECKLIST_NAAM = "Checklist arbeidsomstandigheden";
export const CHECKLIST_ONDERTITEL = "Inventarisatie";

/** De vijf vakken bovenaan het formulier, in de volgorde van het Word-bestand (links plaats en datum, rechts bedrijf, naam en functie). */
export const CHECKLIST_KOP: Veld[] = [
  { naam: "plaats", label: "Plaats", half: true, max: 100, autocomplete: "address-level2" },
  { naam: "bedrijf", label: "Bedrijf", half: true, max: 200, autocomplete: "organization" },
  { naam: "datum", label: "Datum", type: "date", half: true, max: 10 },
  { naam: "naam", label: "Naam", half: true, max: 120, autocomplete: "name", verplicht: true, hint: "Wie de checklist invult." },
  { naam: "functie", label: "Functie", half: true, max: 120, autocomplete: "organization-title" },
];

/** De drie kolommen van de tabel. */
export const CHECKLIST_KOLOMMEN = ["Verplichte onderdelen basiscontract", "Actiepunten en afspraken", "Datum afronding actie"] as const;

export type ChecklistVraag = {
  id: string;
  /** De tekst in de eerste kolom, per alinea. */
  alineas: string[];
  /** Wat het Word-bestand al in de kolom "Actiepunten en afspraken" zette. */
  toelichting?: string;
};

/** De acht onderdelen, letterlijk en in de volgorde van het Word-bestand. */
export const CHECKLIST_VRAGEN: ChecklistVraag[] = [
  { id: "casemanager", alineas: ["Wie is de verantwoordelijke interne casemanager voor de verzuimende werknemers?"] },
  {
    id: "overeenstemming",
    alineas: ["Is er overeenstemming met de werknemersvertegenwoordiging over de volledige inhoud en uitvoering van de arbeidsomstandighedenbeleid en ziekteverzuimbegeleiding"],
  },
  { id: "protocol", alineas: ["Is uw verzuimprotocol voorzien van de laatste wet en regelgeving en uw bedrijfsvoorwaarden."] },
  {
    id: "rie",
    alineas: [
      "Is er een actuele RI&E aanwezig en is deze getoetst door een kerndeskundige.",
      "Zijn eventuele punten die naar voren komen vanuit de R&IE en genoemd in het plan van aanpak opgelost of loopt daar een planning voor? Hoe verloopt de waarborging van deze verbeterpunten?",
    ],
  },
  { id: "beoordeling", alineas: ["De bedrijfsarts of kerndeskundige van React2u zal de bestaande RI&E en het bestaande PAGO beleid beoordelen en een advies uitbrengen over de nog uit te voeren zaken."] },
  { id: "klachtenregeling", alineas: ["Wijzen op de klachtenregeling en waar deze procedure terug te vinden is."] },
  {
    id: "preventiemedewerker",
    alineas: ["Wie is de preventiemedewerker binnen uw organisatie?"],
    toelichting: "Iedere organisatie moet 1 preventiemedewerker aanstellen. Bij een bedrijf met minder dan 25 werknemers mag dit ook de directeur zijn.",
  },
  { id: "training", alineas: ["Op welke wijze is de preventiemedewerker in uw organisatie getraind en geschoold?", "Heeft u interesse in een dergelijke training?"] },
];

/** De sleutels in de antwoorden: per onderdeel de actiepunten en de datum van afronding. */
export const actieSleutel = (id: string) => `${id}_actie`;
export const datumSleutel = (id: string) => `${id}_datum`;

export const MAX_ACTIE = 2000;

/** De antwoorden, als platte sleutels (de kop en per onderdeel <id>_actie en <id>_datum), alleen wat ingevuld is. */
export type ChecklistData = Record<string, string>;

/** Wat `contract_checklist_bekijken` (0042) teruggeeft, en een rij uit `contract_checklists` zoals het beheer hem leest. */
export type ChecklistStand = {
  data: ChecklistData;
  door: string | null;
  ingevuld_at: string;
  bijgewerkt_at: string;
  versie: number;
};

/** Alleen een basiscontract heeft de checklist; een resellerovereenkomst niet. */
export function heeftChecklist(c: { soort?: string | null } | null | undefined): boolean {
  return (c?.soort ?? "basiscontract") === "basiscontract";
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Alleen de bekende sleutels, getrimd en ingekort; een datum alleen als hij een echte datum is. */
export function schoonChecklist(invoer: unknown): ChecklistData {
  const bron = (invoer && typeof invoer === "object" ? invoer : {}) as Record<string, unknown>;
  const uit: ChecklistData = {};
  const neem = (sleutel: string, max: number) => {
    const w = String(bron[sleutel] ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max);
    if (w) uit[sleutel] = w;
  };
  for (const v of CHECKLIST_KOP) neem(v.naam, v.max ?? 200);
  for (const q of CHECKLIST_VRAGEN) {
    neem(actieSleutel(q.id), MAX_ACTIE);
    neem(datumSleutel(q.id), 10);
  }
  return uit;
}

function datumGeldig(s: string): boolean {
  if (!DATUM.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= "2000-01-01" && s <= "2100-12-31";
}

/** Wat er niet klopt, per sleutel; leeg = goed. Een lege checklist telt ook als fout (sleutel `leeg`). */
export function controleerChecklist(data: ChecklistData): Record<string, string> {
  const fouten: Record<string, string> = {};
  if (!data.naam || data.naam.length < 2) fouten.naam = "Vul je naam in: zo weten we wie de checklist invulde.";
  if (data.datum && !datumGeldig(data.datum)) fouten.datum = "Deze datum klopt niet.";
  for (const q of CHECKLIST_VRAGEN) {
    const d = data[datumSleutel(q.id)];
    if (d && !datumGeldig(d)) fouten[datumSleutel(q.id)] = "Deze datum klopt niet.";
  }
  if (!checklistVoortgang(data).beantwoord) fouten.leeg = "Vul minstens één onderdeel in voordat je opslaat.";
  return fouten;
}

/** Of een onderdeel beantwoord is: actiepunten of een datum. */
export function onderdeelBeantwoord(data: ChecklistData, id: string): boolean {
  return Boolean(data[actieSleutel(id)] || data[datumSleutel(id)]);
}

/** Hoeveel van de acht onderdelen beantwoord zijn. */
export function checklistVoortgang(data: ChecklistData | null | undefined): { beantwoord: number; totaal: number } {
  const d = data || {};
  return { beantwoord: CHECKLIST_VRAGEN.filter((q) => onderdeelBeantwoord(d, q.id)).length, totaal: CHECKLIST_VRAGEN.length };
}

/** "3 van 8 onderdelen beantwoord", voor pillen en kaarten. */
export function voortgangTekst(data: ChecklistData | null | undefined): string {
  const v = checklistVoortgang(data);
  return `${v.beantwoord} van ${v.totaal} onderdelen beantwoord`;
}

/** Bestandsnaam van de pdf: "Checklist arbeidsomstandigheden C2026-0001 Bakkerij Jansen (ingevuld).pdf". */
export function checklistPdfNaam(c: { nummer: string; bedrijf: string }, ingevuld: boolean): string {
  const bedrijf = c.bedrijf.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${CHECKLIST_NAAM} ${c.nummer} ${bedrijf} (${ingevuld ? "ingevuld" : "leeg"}).pdf`;
}

/** Waarmee het formulier begint: wat al ingevuld is, anders het bedrijf en de contactpersoon uit het contract. */
export function checklistBegin(c: { bedrijf: string; contactpersoon?: string | null; opdrachtgever?: { naam?: string; plaats?: string } | null }, stand: ChecklistStand | null | undefined): ChecklistData {
  if (stand?.data) return { ...stand.data };
  const uit: ChecklistData = { bedrijf: c.opdrachtgever?.naam || c.bedrijf };
  if (c.contactpersoon) uit.naam = c.contactpersoon;
  if (c.opdrachtgever?.plaats) uit.plaats = c.opdrachtgever.plaats;
  return uit;
}

/** De fouten die de klantactie teruggeeft, in gewone taal; de codes komen uit contract_checklist_opslaan (0042). */
export const CHECKLIST_FOUT: Record<string, string> = {
  onbekend: "Deze link werkt niet (meer). Neem contact met ons op.",
  concept: "Dit is een voorbeeld: invullen kan pas als het contract verstuurd is.",
  gesloten: "Dit contract is ingetrokken. Neem contact met ons op.",
  document: "Bij deze overeenkomst hoort geen checklist.",
  invoer: "Er klopt iets niet aan wat je invulde. Controleer de velden.",
  limiet: "Je hebt het kort na elkaar heel vaak geprobeerd. Wacht even en probeer het opnieuw.",
  storing: "Opslaan lukte niet door een storing. Probeer het zo opnieuw.",
};

/** Waar de checklist voor is, in gewone woorden: op de contractpagina, de checklistpagina en in de mail. */
export const CHECKLIST_UITLEG = {
  kort: "De inventarisatie van de verplichte onderdelen van het basiscontract: wie de casemanager en de preventiemedewerker zijn, de RI&E, het verzuimprotocol en de afspraken daarover.",
  invullen: "Loop de acht onderdelen door en noteer per onderdeel de actiepunten en afspraken, met de datum waarop een actie is afgerond. Je kunt tussendoor opslaan en later aanvullen; wij lezen mee.",
  mail: "Bij het contract hoort de Checklist arbeidsomstandigheden: de inventarisatie van de verplichte onderdelen uit de Arbowet. Vul hem online in via dezelfde link, of print de bijlage.",
};
