/*
 * Het voorwoord van Cindy en Susanne: vast in elke offerte, op de klantpagina
 * direct na de opening en in de pdf als eerste hoofdstuk (Rens, 30 okt 2026:
 * "maak een uitgebreid voorwoord vanuit Cindy & Susanne, die moet vast staan").
 *
 * Bewust niet per offerte aan te passen en niet in het beheer: het is het
 * verhaal van React2u, niet van één klant. Het persoonlijke woord van de
 * afzender (`intro`) blijft per offerte. De feiten komen van Over React2u
 * (opgericht in 2023 in Eindhoven, één vast gezicht, zes specialismen,
 * keurmerken); verandert daar iets, pas het dan hier ook aan.
 *
 * Invulvelden zoals in de offertetekst: `{bedrijf}` wordt bij het tonen
 * ingevuld (`vulIn()` in lib/offertes.ts).
 */

export type Ondertekenaar = {
  /** Zoals ze in handschrift onder het voorwoord staan. */
  naam: string;
  /** Volledige naam onder de handtekening; leeg = alleen de voornaam. */
  volledigeNaam: string | null;
  /** Functie onder de naam; leeg = "React2u". */
  functie: string | null;
};

export const VOORWOORD = {
  kop: "Waarom we React2u zijn begonnen",
  citaat: "We weten hoe het voelt om aan de zijlijn te staan. Verzuim vraagt om persoonlijke aandacht.",
  alineas: [
    "Fijn dat je de tijd neemt voor dit voorstel. Voordat je leest wat we voor {bedrijf} kunnen betekenen, vertellen we je graag waarom React2u bestaat en wat je van ons mag verwachten.",
    "We zijn React2u in 2023 in Eindhoven begonnen, omdat we als werkgever zelf zagen hoe verzuim meestal loopt. Een medewerker meldt zich ziek, de arbodienst neemt het over en daarna wordt het stil. Rapportages komen laat, er zit steeds iemand anders aan de telefoon en niemand kan precies zeggen waar een traject staat. Als werkgever sta je aan de zijlijn, en je medewerker voelt zich een dossiernummer. Dat wilden we anders doen.",
    "Daarom krijgt elke organisatie bij ons één vast gezicht. Je casemanager kent je mensen en je bedrijf, houdt de termijnen in de gaten en belt terug wanneer dat is afgesproken. Samen met onze taakgedelegeerden en bedrijfsartsen kijken we naar de hele mens, want verzuim heeft vaak meer oorzaken dan alleen ziekte. Alles wat we doen staat in één online dossier, zodat jij en je medewerker altijd weten waar jullie aan toe zijn.",
    "Voorkomen vinden we net zo belangrijk als herstellen. Met onze zes specialismen, van preventie en trainingen tot re-integratie, denken we mee lang voordat iemand uitvalt, en blijven we betrokken tot iemand weer veilig aan het werk is. Je neemt alleen af wat bij jullie past.",
    "Op kwaliteit en zorgvuldigheid mag je ons aanspreken. We zijn een gecertificeerde arbodienst en hebben de ISO-certificaten voor kwaliteit, informatiebeveiliging en privacy. Onafhankelijke instellingen toetsen elk jaar hoe we werken en hoe we met gegevens omgaan. Het gaat tenslotte om je mensen, en om informatie die je ons toevertrouwt.",
    "In dit voorstel lees je wat we voor je organisatie willen doen en wat het kost. Twijfel je ergens over, of wil je iets anders? Bel of mail ons gerust, we denken graag met je mee. We kijken ernaar uit om samen te werken.",
  ],
  groet: "Hartelijke groet,",
  ondertekenaars: [
    { naam: "Cindy", volledigeNaam: null, functie: null },
    { naam: "Susanne", volledigeNaam: null, functie: null },
  ] as Ondertekenaar[],
};

/** "Cindy, React2u" of "Cindy de Vries, directeur": de regel onder een handtekening. */
export function ondertekenaarRegel(o: Ondertekenaar): string {
  return `${o.volledigeNaam?.trim() || o.naam}, ${o.functie?.trim() || "React2u"}`;
}

/** "Cindy en Susanne". */
export const VOORWOORD_VAN = VOORWOORD.ondertekenaars.map((o) => o.naam).join(" en ");
