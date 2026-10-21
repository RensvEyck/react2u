import teksten from "../content/plaatsen.json";

/*
 * De eigen tekst per gemeente voor /arbodienst-<gemeente>, uit
 * src/content/plaatsen.json (sleutel = slug uit lib/gemeenten.ts). Zonder
 * eigen tekst toont de pagina een algemene alinea en staat hij op noindex:
 * 342 bijna gelijke pagina's ziet Google als dunne, dubbele inhoud. Met een
 * eigen tekst hoort de gemeente in Google en in sitemap.xml (lib/gemeenten.ts).
 *
 * Alleen voor servercode: dit bestand haalt de hele tekstset (1 MB) binnen. Voor
 * "heeft deze gemeente een tekst?" is er lib/plaatsIndex.ts.
 */

export type Label = "resist" | "recover" | "restart" | "reflex" | "ready";
export type Reistijd = "dichtbij" | "regio" | "verder" | "ver";
export type Soort = "stad" | "dorp" | "gemeente";

export type Sector = { naam: string; verzuim: string; label: Label };

export type PlaatsTekst = {
  /** Eén dominante stad, een dorpsgemeente, of een fusiegemeente met meerdere kernen. */
  soort: Soort;
  /** De streek waar iedereen de gemeente onder schaart ("Brainport", "Achterhoek"). */
  streek?: string;
  /** De bekendste kernen van een gemeente met meerdere dorpen. */
  kernen?: string[];
  /** Het werk dat er echt is, met per sector wat verzuim daar kenmerkt en welk label past. */
  sectoren?: Sector[];
  /** Aangrenzende gemeenten, gespeld zoals in lib/gemeenten.ts. */
  buren?: string[];
  /** Afstand tot ons kantoor in Eindhoven. */
  reistijd?: Reistijd;
  /** De h2 boven de tekst. */
  kop?: string;
  /** Eén of twee zinnen bovenin de pagina. */
  intro?: string;
  /** Drie alinea's: de plaats, verzuim bij werkgevers daar, hoe React2u er werkt. */
  tekst: string[];
  /** Metaomschrijving (120 tot 155 tekens). */
  seo?: string;
};

export const LABELS: readonly Label[] = ["resist", "recover", "restart", "reflex", "ready"];
export const REISTIJDEN: readonly Reistijd[] = ["dichtbij", "regio", "verder", "ver"];
export const SOORTEN: readonly Soort[] = ["stad", "dorp", "gemeente"];

/** Naam, kleur en adres per label, zoals in het menu (r2uStijl.ts). */
export const LABEL_INFO: Record<Label, { naam: string; wat: string; href: string; kleur: string }> = {
  resist: { naam: "Resist", wat: "Preventie en vitaliteit", href: "/resist", kleur: "#00A098" },
  recover: { naam: "Recover", wat: "Verzuimbegeleiding", href: "/recover", kleur: "#E61674" },
  restart: { naam: "Restart", wat: "Re-integratie en loopbaan", href: "/restart", kleur: "#F19001" },
  reflex: { naam: "Reflex", wat: "Flexbranche en Ziektewet", href: "/reflex", kleur: "#3AA5DD" },
  ready: { naam: "Ready", wat: "HR en arbeidsrecht", href: "/ready", kleur: "#322E83" },
};

/** De afstand in woorden, voor het kaartje op de pagina. */
export const REISTIJD_TEKST: Record<Reistijd, string> = {
  dichtbij: "Een kwartier tot een half uur rijden vanaf ons kantoor in Eindhoven",
  regio: "Binnen een uur rijden vanaf ons kantoor in Eindhoven",
  verder: "Anderhalf tot twee uur rijden vanaf Eindhoven; gesprekken op locatie of online",
  ver: "Op afstand van Eindhoven; gesprekken bij jou op locatie of online",
};

export const SOORT_TEKST: Record<Soort, string> = { stad: "Stad", dorp: "Dorp", gemeente: "Gemeente met meerdere kernen" };

/** Alle teksten, zonder de uitlegsleutel ("_uitleg") uit het JSON-bestand. */
const ALLE: Record<string, PlaatsTekst> = Object.fromEntries(
  Object.entries(teksten as Record<string, unknown>)
    .filter(([slug, t]) => !slug.startsWith("_") && t && typeof t === "object" && Array.isArray((t as PlaatsTekst).tekst)),
) as Record<string, PlaatsTekst>;

/** De eigen tekst van een gemeente, of null als die er (nog) niet is. */
export function plaatsTekst(slug: string): PlaatsTekst | null {
  const t = ALLE[slug];
  return t && t.tekst.some((a) => a && a.trim()) ? t : null;
}

/** Slugs van alle gemeenten met een eigen tekst. */
export const slugsMetTekst = (): string[] => Object.keys(ALLE).filter((slug) => plaatsTekst(slug) !== null);
