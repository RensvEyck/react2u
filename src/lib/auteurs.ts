import { GIDSEN, type Gids, type OnderwerpSlug } from "./gidsen";

/**
 * De auteurs van de gidsen in de kennisbank, met een eigen pagina
 * (/auteur/<slug>) en als `Person` in de structured data van elke gids.
 * Google en de AI-zoekmachines wegen wie iets schreef en of die persoon
 * bestaat (E-E-A-T); een naam zonder pagina is een naam zonder bewijs.
 *
 * Alleen feiten die React2u zelf kan onderbouwen: functie, sinds wanneer, en
 * registraties zoals ze in het register staan. Geen registratie bekend? Dan
 * blijft de lijst leeg, liever dan een verzonnen titel. Zie docs/adr/0005.
 */

export type Auteur = {
  /** Het adres: /auteur/<slug>. */
  slug: string;
  naam: string;
  functie: string;
  /** Twee of drie alinea's: wie dit is en waarom je deze persoon mag geloven. */
  bio: string[];
  /** Registraties en lidmaatschappen zoals ze in het register staan (bijvoorbeeld "Register casemanager, RNVC"). */
  registraties: string[];
  /** De onderwerpen van de kennisbank waarover deze auteur schrijft. */
  onderwerpen: OnderwerpSlug[];
  /** Sinds welk jaar bij React2u. */
  sinds?: string;
  /** Een openbaar profiel (LinkedIn), voor `sameAs`; leeg als het niet bekend is. */
  linkedin?: string;
};

export const AUTEURS: Auteur[] = [
  {
    slug: "rens-van-eyck",
    naam: "Rens van Eyck",
    functie: "Bestuurder van React2u",
    bio: [
      "Rens van Eyck is bestuurder van React2u, de persoonlijke arbodienst uit Eindhoven die in 2023 werd opgericht vanuit de ervaring van een werkgever: verzuim liep bijna altijd hetzelfde, met te weinig contact, rapportages die te laat kwamen en niemand die precies wist waar een traject stond.",
      "De gidsen in de kennisbank schrijft hij vanuit de praktijk van de casemanagers, bedrijfsartsen en arbeidsdeskundigen van React2u: wat werkgevers vragen, waar het misgaat en wat de wet precies verlangt. Elke gids wordt bijgewerkt zodra regels of termijnen veranderen.",
    ],
    registraties: [],
    onderwerpen: ["verzuim", "re-integratie", "preventie", "wet-en-regels"],
    sinds: "2023",
  },
];

export function auteurVoor(slug: string): Auteur | null {
  return AUTEURS.find((a) => a.slug === slug) ?? null;
}

/** De auteur achter een naam zoals die in de kop van een gids staat; null als die niet in de lijst staat. */
export function auteurVoorNaam(naam: string | null | undefined): Auteur | null {
  const n = (naam ?? "").trim().toLowerCase();
  return n ? AUTEURS.find((a) => a.naam.toLowerCase() === n) ?? null : null;
}

/** De gidsen van een auteur, in de volgorde van lib/gidsen.ts. */
export function gidsenVan(slug: string): Gids[] {
  return GIDSEN.filter((g) => g.auteur === slug);
}

export function voornaam(a: Auteur): string {
  return a.naam.split(/\s+/)[0];
}
