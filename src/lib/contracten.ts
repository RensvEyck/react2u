/**
 * Contracten (migratie 0031): het Basiscontract Arbodienstverlening, dat sales
 * net als een offerte als link verstuurt en dat de klant online tekent. De
 * tekst staat in lib/contractTekst.ts; hier de vorm van een contract, de
 * partijen, de looptijd en de controles die ook de database doet.
 *
 * Puur, zonder database: dezelfde helpers in het beheer, op de klantpagina, in
 * de pdf en in de mails.
 */
import { CONTRACT_STANDAARD, CONTRACT_VERSIE, contractStructuur, metAanvullend, vulContractIn, wijktAf, type ContractStructuur } from "./contractTekst";
import { datumLang, OFFERTE_EMAIL, type Bevestiging, type CertificaatGegevens } from "./offertes";
import { ONDERTEKENAAR } from "./offerteOndertekenaar";

export type ContractStatus = "concept" | "verstuurd" | "getekend" | "ingetrokken";

/** React2u zoals in de kop van het contract; bij het opslaan uit Instellingen gezet (contractActions). */
export type Opdrachtnemer = {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  kvk: string;
  /** "de heer R. van Eyck" */
  vertegenwoordiger: string;
  /** "bestuurder" */
  functie: string;
};

/** De klant zoals in de kop van het contract: vooraf door sales, bij het tekenen door de klant. */
export type Opdrachtgever = { naam: string; adres: string; postcode: string; plaats: string; kvk: string };

/** Een rij uit `contracten`, zoals het beheer hem leest. */
export type Contract = {
  id: string;
  nummer: string;
  token: string;
  status: ContractStatus;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  opdrachtnemer: Partial<Opdrachtnemer>;
  opdrachtgever: Partial<Opdrachtgever> | null;
  offerte_id: string | null;
  offerte_kenmerk: string | null;
  ingangsdatum: string;
  einddatum: string;
  tekst: string;
  tekst_versie: string | null;
  aanvullend: string | null;
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
  getekend_at: string | null;
  getekend_naam: string | null;
  getekend_functie: string | null;
  getekend_email: string | null;
  getekend_plaats: string | null;
  handtekening: string | null;
  getekend_ip: string | null;
  getekend_agent: string | null;
  getekend_inhoud: GetekendContract | null;
  getekend_hash: string | null;
};

/** Wat contract_ondertekenen (0031) vastlegt: alles wat er getekend is. */
export type GetekendContract = {
  nummer: string;
  bedrijf: string;
  contactpersoon: string | null;
  opdrachtnemer: Partial<Opdrachtnemer>;
  opdrachtgever: Partial<Opdrachtgever>;
  offerte_kenmerk: string | null;
  ingangsdatum: string;
  einddatum: string;
  tekst: string;
  tekst_versie: string | null;
  aanvullend: string | null;
  afzender_naam: string | null;
  afzender_functie: string | null;
  afzender_email: string | null;
  verstuurd_at: string | null;
  getekend_naam: string;
  getekend_functie: string;
  getekend_email: string;
  getekend_plaats: string;
  getekend_at: string;
  handtekening_hash?: string;
  bevestiging?: Bevestiging;
};

/** Wat `contract_bekijken` (0031) teruggeeft: zonder notitie, IP en wie hem aanmaakte. */
export type ContractPubliek = Pick<
  Contract,
  | "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "opdrachtnemer" | "opdrachtgever" | "offerte_kenmerk"
  | "ingangsdatum" | "einddatum" | "tekst" | "tekst_versie" | "aanvullend"
  | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at" | "created_at"
  | "getekend_at" | "getekend_naam" | "getekend_functie" | "getekend_email" | "getekend_plaats" | "handtekening" | "getekend_inhoud" | "getekend_hash"
> & { eerste_keer?: boolean };

export type ContractGebeurtenis = {
  id: number;
  contract_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "code" | "getekend" | "ingetrokken" | "heropend";
  door: string | null;
  details: Record<string, string | number | boolean> | null;
  at: string;
};

/** Een offerte om aan te koppelen (overweging D: "akkoord met de offerte met kenmerk ..."). */
export type OfferteKeuze = { id: string; nummer: string; bedrijf: string; status: string; getekend_at: string | null; verstuurd_at: string | null };

/** Hetzelfde certificaat als bij offertes (contract_certificaat geeft dezelfde vorm). */
export type ContractCertificaat = Omit<CertificaatGegevens, "tijdlijn"> & {
  tijdlijn: { soort: ContractGebeurtenis["soort"]; at: string; wie: string | null }[];
};

/** De afzender die de klant ziet en waar hij op antwoordt: de salesbox, net als bij offertes. */
export const CONTRACT_EMAIL = OFFERTE_EMAIL;

/* ---------- status ---------- */

export type ContractWeergave = ContractStatus | "bekeken";

export function contractWeergave(c: Pick<Contract, "status" | "bekeken_at">): ContractWeergave {
  return c.status === "verstuurd" && c.bekeken_at ? "bekeken" : c.status;
}

export const CONTRACT_WEERGAVE: Record<ContractWeergave, { label: string; kleur: string; achter: string }> = {
  concept: { label: "Concept", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verstuurd: { label: "Verstuurd", kleur: "#312e82", achter: "#eef0ff" },
  bekeken: { label: "Bekeken", kleur: "#0b6bcb", achter: "#e6f2ff" },
  getekend: { label: "Getekend", kleur: "#0a7a4b", achter: "#e3f6ed" },
  ingetrokken: { label: "Ingetrokken", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
};

/** Meldingen bij een mislukte ondertekening; de codes komen uit contract_ondertekenen (0031). */
export const CONTRACT_FOUT: Record<string, string> = {
  onbekend: "Dit contract is niet (meer) beschikbaar. Neem contact met ons op.",
  "al-getekend": "Dit contract is al ondertekend.",
  naam: "Vul je volledige naam in.",
  functie: "Vul je functie in: daarmee staat in het contract in welke hoedanigheid je tekent.",
  email: "Vul een geldig e-mailadres in.",
  plaats: "Vul de plaats in waar je tekent.",
  handtekening: "Zet je handtekening in het vak, of typ je naam.",
  organisatie: "Controleer de gegevens van je organisatie.",
  "organisatie-naam": "Vul de statutaire naam van je organisatie in, zoals in het handelsregister.",
  "organisatie-adres": "Vul het adres van je organisatie in: straat en huisnummer, postcode en plaats.",
  "organisatie-kvk": "Vul het KvK-nummer in: 8 cijfers.",
  akkoord: "Vink aan dat je akkoord gaat en bevoegd bent om te tekenen.",
  limiet: "Er ging iets te vaak achter elkaar mis. Probeer het over een uur opnieuw, of bel ons.",
  storing: "Ondertekenen lukte niet door een storing. Probeer het opnieuw, of bel ons.",
  code: "Deze code klopt niet. Kijk nog eens in de mail, of vraag een nieuwe code aan.",
  "code-nieuw": "Vraag eerst een code aan.",
  "code-verlopen": "Deze code is verlopen. Vraag een nieuwe code aan.",
  "code-pogingen": "Te vaak een verkeerde code. Vraag een nieuwe code aan.",
  "code-email": "De code is naar een ander e-mailadres gestuurd. Vraag een nieuwe code aan.",
  "code-limiet": "Er zijn het afgelopen uur al vijf codes gestuurd. Probeer het later opnieuw, of bel ons.",
  mail: "We konden de code niet mailen. Controleer je e-mailadres, of bel ons.",
};

/* ---------- partijen ---------- */

const tekst = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** De gegevens van de klant uit een formulier of de database terug in vorm: alleen de bekende velden, schoon. */
export function normaliseerOpdrachtgever(input: unknown): Partial<Opdrachtgever> {
  if (!input || typeof input !== "object") return {};
  const o = input as Record<string, unknown>;
  const uit: Partial<Opdrachtgever> = {
    naam: tekst(o.naam, 200),
    adres: tekst(o.adres, 200),
    postcode: tekst(o.postcode, 12).toUpperCase(),
    plaats: tekst(o.plaats, 100),
    kvk: tekst(o.kvk, 20).replace(/\s/g, ""),
  };
  for (const k of Object.keys(uit) as (keyof Opdrachtgever)[]) if (!uit[k]) delete uit[k];
  return uit;
}

/** Wat er nog niet klopt aan de gegevens van de klant, als foutcode uit CONTRACT_FOUT (dezelfde controle als 0031), of null. */
export function opdrachtgeverFout(o: Partial<Opdrachtgever>): "organisatie-naam" | "organisatie-adres" | "organisatie-kvk" | null {
  if (!o.naam || o.naam.length < 2) return "organisatie-naam";
  if (!o.adres || o.adres.length < 3 || !o.postcode || o.postcode.length < 4 || !o.plaats || o.plaats.length < 2) return "organisatie-adres";
  if (!o.kvk || !/^\d{8}$/.test(o.kvk)) return "organisatie-kvk";
  return null;
}

/** "5611 NB Eindhoven" → postcode en plaats; zonder postcode alles als plaats. */
export function postcodePlaats(regel: string): { postcode: string; plaats: string } {
  const m = (regel || "").trim().match(/^(\d{4}\s?[A-Za-z]{2})\s+(.+)$/);
  return m ? { postcode: m[1].toUpperCase(), plaats: m[2].trim() } : { postcode: "", plaats: (regel || "").trim() };
}

/**
 * React2u als partij, uit de bedrijfsgegevens in Instellingen (dezelfde als in
 * de footer en op de offerte). Namens React2u tekent de bestuurder
 * (lib/offerteOndertekenaar.ts), zoals op elke offerte.
 */
export function opdrachtnemerUit(contact: { addressLine1: string; addressLine2: string; kvk: string }): Opdrachtnemer {
  const { postcode, plaats } = postcodePlaats(contact.addressLine2);
  return {
    naam: "React2u",
    adres: contact.addressLine1.trim(),
    postcode,
    plaats,
    kvk: contact.kvk.replace(/\s/g, ""),
    vertegenwoordiger: ONDERTEKENAAR.formeel,
    functie: ONDERTEKENAAR.functie.toLowerCase(),
  };
}

/** Wat er nog niet is ingevuld, als zichtbare plek in de tekst. */
const OPEN = "[ ]";

/**
 * De partij zoals in de kop van het contract ("De ondergetekenden"), in de
 * bewoording van het Word-bestand. Wat nog niet bekend is, blijft een open plek.
 */
const adresRegel = (o: { adres?: string; postcode?: string; plaats?: string }) =>
  [o.adres, [o.postcode, o.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export function comparitieOpdrachtnemer(o: Partial<Opdrachtnemer>): string {
  return `${o.naam || "React2u"}, gevestigd en kantoorhoudend te ${o.plaats || OPEN} aan de ${adresRegel(o) || OPEN}, ingeschreven in het handelsregister onder KvK-nummer ${o.kvk || OPEN}, te dezer zake rechtsgeldig vertegenwoordigd door ${o.vertegenwoordiger || OPEN} in de hoedanigheid van ${o.functie || OPEN}, hierna te noemen “Opdrachtnemer”;`;
}

export function comparitieOpdrachtgever(o: Partial<Opdrachtgever>, ondertekenaar: { naam?: string | null; functie?: string | null }): string {
  const adres = adresRegel(o);
  const wie = ondertekenaar.naam?.trim() ? `${ondertekenaar.naam.trim()}${ondertekenaar.functie?.trim() ? `, ${ondertekenaar.functie.trim()}` : ""}` : "de ondertekenaar";
  return `${o.naam || OPEN}, gevestigd en kantoorhoudende te ${o.plaats || OPEN} aan de ${adres || OPEN}, ingeschreven in het handelsregister onder KvK-nummer ${o.kvk || OPEN}, te dezen rechtsgeldig vertegenwoordigd door ${wie}; hierna te noemen “Opdrachtgever”;`;
}

/* ---------- looptijd ---------- */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dag = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`);

/** `jjjj-mm-dd` plus `maanden`, met de dag ingekort tot de laatste van de maand (31 jan + 1 = 28/29 feb). */
export function plusMaanden(datum: string, maanden: number): string {
  const d = dag(datum);
  const doel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + maanden, 1, 12));
  const laatste = new Date(Date.UTC(doel.getUTCFullYear(), doel.getUTCMonth() + 1, 0, 12)).getUTCDate();
  doel.setUTCDate(Math.min(d.getUTCDate(), laatste));
  return iso(doel);
}

export function plusDagen(datum: string, dagen: number): string {
  const d = dag(datum);
  d.setUTCDate(d.getUTCDate() + dagen);
  return iso(d);
}

/** De eerste van de volgende maand, in Nederlandse tijd: het gewone begin van een contract. */
export function standaardIngang(nu = new Date()): string {
  const vandaag = nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  return plusMaanden(`${vandaag.slice(0, 7)}-01`, 1);
}

/** Een jaar na de ingang, de dag ervoor: 1 december 2026 → 30 november 2027. */
export function standaardEinde(ingang: string, maanden = 12): string {
  return plusDagen(plusMaanden(ingang, maanden), -1);
}

/** Hele maanden tussen ingang en einde (inclusief de einddag), of null als het geen hele maanden zijn. */
export function looptijdMaanden(ingang: string, einde: string): number | null {
  for (let m = 1; m <= 120; m++) {
    const e = standaardEinde(ingang, m);
    if (e === einde) return m;
    if (e > einde) return null;
  }
  return null;
}

export function looptijdTekst(ingang: string, einde: string): string {
  const m = looptijdMaanden(ingang, einde);
  if (m === 12) return "1 jaar";
  if (m && m % 12 === 0) return `${m / 12} jaar`;
  if (m) return `${m} maanden`;
  return `${datumLang(ingang)} tot en met ${datumLang(einde)}`;
}

/**
 * Waar een lopend contract staat (artikel 1.1): het einde van de huidige
 * periode (na de einddatum telkens 12 maanden erbij) en de laatste dag om op
 * te zeggen, drie maanden daarvoor.
 */
export function looptijdNu(ingang: string, einde: string, vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" })) {
  let periodeEinde = einde;
  let verlengd = 0;
  while (periodeEinde < vandaag && verlengd < 100) {
    periodeEinde = plusDagen(plusMaanden(plusDagen(periodeEinde, 1), 12), -1);
    verlengd++;
  }
  // Opzeggen uiterlijk 3 maanden vóór de einddatum: 30 november → uiterlijk 30 augustus.
  const opzeggenUiterlijk = plusMaanden(periodeEinde, -3);
  return { begonnen: ingang <= vandaag, periodeEinde, verlengd, opzeggenUiterlijk };
}

/**
 * De belangrijkste afspraken in gewone woorden, voor de opening van de pagina
 * en de mail. De looptijd komt uit het contract zelf; de rest staat alleen
 * erbij als de tekst de standaard is, anders kan het niet meer kloppen. De
 * volledige tekst is altijd leidend.
 */
export function contractKort(c: { ingangsdatum: string; einddatum: string; offerte_kenmerk?: string | null; tekst: string }): string[] {
  const m = looptijdMaanden(c.ingangsdatum, c.einddatum);
  const looptijd = m
    ? `Looptijd ${looptijdTekst(c.ingangsdatum, c.einddatum)}: van ${datumLang(c.ingangsdatum)} tot en met ${datumLang(c.einddatum)}`
    : `Looptijd van ${datumLang(c.ingangsdatum)} tot en met ${datumLang(c.einddatum)}`;
  if (wijktAf(c.tekst)) return [looptijd];
  return [
    looptijd,
    "Daarna telkens 12 maanden verlengd; opzeggen kan tot 3 maanden vóór de einddatum, per aangetekende brief",
    `Tarieven zoals in ${c.offerte_kenmerk?.trim() ? c.offerte_kenmerk.trim().replace(/^Offerte/, "offerte") : "de offerte"}; facturen digitaal, betaling binnen 30 dagen`,
    "Je medewerkers kunnen anoniem bij de bedrijfsarts terecht en een second opinion vragen",
    "Persoonsgegevens en medische gegevens volgens de AVG en ons privacyreglement",
  ];
}

/** Twee of drie kerngegevens voor de kaart in de mail en de opening van de pagina. */
export function contractFeiten(c: { ingangsdatum: string; einddatum: string; tekst: string }): { label: string; waarde: string; sub?: string }[] {
  const m = looptijdMaanden(c.ingangsdatum, c.einddatum);
  return [
    { label: "Ingangsdatum", waarde: datumLang(c.ingangsdatum) },
    m ? { label: "Looptijd", waarde: looptijdTekst(c.ingangsdatum, c.einddatum), sub: `tot en met ${datumLang(c.einddatum)}` } : { label: "Einddatum", waarde: datumLang(c.einddatum) },
    ...(wijktAf(c.tekst) ? [] : [{ label: "Opzegtermijn", waarde: "3 maanden", sub: "daarna stilzwijgend verlengd" }]),
  ];
}

/* ---------- de tekst van één contract ---------- */

/** "Offerte 2026-0012 van 3 november 2026": het kenmerk bij overweging D. */
export function offerteKenmerk(o: { nummer: string; getekend_at?: string | null; verstuurd_at?: string | null }): string {
  const datum = o.getekend_at || o.verstuurd_at;
  return `Offerte ${o.nummer}${datum ? ` van ${datumLang(datum)}` : ""}`;
}

/**
 * De tekst van een contract met de invulvelden ingevuld en de aanvullende
 * afspraken als laatste artikel. Zonder offertekenmerk de naam en het
 * KvK-nummer van de klant, zoals het Word-bestand voorschrijft.
 */
export function contractInhoud(c: {
  tekst: string | null | undefined; aanvullend?: string | null; ingangsdatum: string; einddatum: string;
  offerte_kenmerk?: string | null; bedrijf: string; opdrachtgever?: Partial<Opdrachtgever> | null;
}): ContractStructuur {
  const og = c.opdrachtgever || {};
  const offerte = c.offerte_kenmerk?.trim() || [og.naam || c.bedrijf, og.kvk ? `KvK ${og.kvk}` : ""].filter(Boolean).join(", ");
  const tekstNu = vulContractIn(c.tekst || CONTRACT_STANDAARD, {
    ingangsdatum: datumLang(c.ingangsdatum) || OPEN,
    einddatum: datumLang(c.einddatum) || OPEN,
    offerte: offerte || OPEN,
  });
  return metAanvullend(contractStructuur(tekstNu), c.aanvullend);
}

/** De versie van de tekst voor in de voet: "versie november 2026", of "aangepaste tekst". */
export function versieTekst(versie: string | null | undefined): string {
  return versie ? `versie ${versie}` : `versie ${CONTRACT_VERSIE}`;
}

/** "Eindhoven" uit "5611 NB Eindhoven", voor "Te Eindhoven, 3 november 2026". */
export function plaatsUit(o: Partial<Opdrachtnemer>): string {
  return o.plaats || "Eindhoven";
}

/* ---------- beheer ---------- */

/** Wat er nog ontbreekt om te versturen; leeg = klaar. */
export function controleerContract(c: Pick<Contract, "bedrijf" | "email" | "ingangsdatum" | "einddatum" | "tekst" | "opdrachtnemer">): string[] {
  const fouten: string[] = [];
  if (!c.bedrijf?.trim()) fouten.push("De naam van het bedrijf ontbreekt.");
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) fouten.push("Het e-mailadres klopt niet.");
  if (!c.ingangsdatum || !c.einddatum || c.einddatum <= c.ingangsdatum) fouten.push("De einddatum moet na de ingangsdatum liggen.");
  if (!contractStructuur(c.tekst).artikelen.length) fouten.push("De contracttekst heeft geen artikelen.");
  if (!c.opdrachtnemer?.kvk || !c.opdrachtnemer?.adres) fouten.push("De gegevens van React2u ontbreken; controleer Instellingen (adres en KvK).");
  return fouten;
}

/** Bestandsnaam van de pdf: "Basiscontract C2026-0001 Bakkerij Jansen (getekend).pdf". */
export function contractPdfNaam(c: { nummer: string; bedrijf: string }, soort: "getekend" | "concept" = "getekend"): string {
  const bedrijf = c.bedrijf.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `Basiscontract ${c.nummer} ${bedrijf} (${soort}).pdf`;
}

/** De tijdlijn van het certificaat in gewone zinnen, zoals tijdlijnRegels() bij offertes. */
export function contractTijdlijn(c: ContractCertificaat): { at: string; tekst: string }[] {
  let eersteKeer = true;
  const uit: { at: string; tekst: string }[] = [];
  for (const g of c.tijdlijn) {
    if (g.soort === "verstuurd") uit.push({ at: g.at, tekst: g.wie ? `Contract verstuurd aan ${g.wie}` : "Link naar het contract gedeeld" });
    else if (g.soort === "herinnering") uit.push({ at: g.at, tekst: g.wie ? `Herinnering verstuurd aan ${g.wie}` : "Herinnering verstuurd" });
    else if (g.soort === "bekeken" && eersteKeer) {
      eersteKeer = false;
      uit.push({ at: g.at, tekst: c.aantal_bekeken > 1 ? `Contract voor het eerst geopend (in totaal ${c.aantal_bekeken} keer)` : "Contract geopend" });
    } else if (g.soort === "code") uit.push({ at: g.at, tekst: `Bevestigingscode gemaild naar ${g.wie || "de ondertekenaar"}` });
    else if (g.soort === "getekend") uit.push({ at: g.at, tekst: `Ondertekend door ${g.wie || "de klant"}, met de juiste code` });
  }
  return uit;
}
