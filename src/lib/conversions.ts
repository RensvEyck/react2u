import type { PageView } from "./types";
import { normalizePath } from "./analytics";
import { herkomstLabel } from "./herkomst";

/**
 * Conversies: welke pagina levert aanvragen op, en waar die vandaan komen.
 *
 * Bezoek alleen zegt niets over wat de site oplevert. Elk verstuurd formulier
 * telt daarom één conversie (tabel `conversions`, migratie 0013): het soort en
 * de pagina waar het formulier stond. Sinds migratie 0047 telt ook een klik op
 * een telefoonnummer (`bel`) of mailadres (`mail`), en staat bij elke rij de
 * herkomst (wat de bezoeker zelf koos), de bron (wat de browser zag) en de
 * landingspagina (waar het bezoek begon). Geen persoonsgegevens — die staan
 * al in het Postvak IN. Hier alleen de rekensommen; opslaan en ophalen zit in
 * conversionsDb.ts.
 */

/** Een verstuurd formulier: een aanvraag. */
export const AANVRAAG_KINDS = ["contact", "offerte", "sollicitatie", "terugbel"] as const;
/** Een klik op een telefoonnummer of mailadres: een aanloop naar een aanvraag die de site niet ziet. */
export const KLIK_KINDS = ["bel", "mail"] as const;
export const CONVERSION_KINDS = [...AANVRAAG_KINDS, ...KLIK_KINDS] as const;
export type AanvraagKind = (typeof AANVRAAG_KINDS)[number];
export type KlikKind = (typeof KLIK_KINDS)[number];
export type ConversionKind = (typeof CONVERSION_KINDS)[number];

export const CONVERSION_LABELS: Record<ConversionKind, string> = {
  contact: "Contactberichten",
  offerte: "Offerteaanvragen",
  sollicitatie: "Sollicitaties",
  terugbel: "Terugbelverzoeken",
  bel: "Belklikken",
  mail: "Mailklikken",
};

export function isKlik(kind: string): kind is KlikKind {
  return (KLIK_KINDS as readonly string[]).includes(kind);
}

export type Conversion = {
  id: string;
  kind: ConversionKind;
  path: string;
  created_at: string;
  /** Wat de bezoeker koos bij "hoe heb je ons gevonden" (sleutel uit lib/herkomst.ts); ontbreekt bij oudere rijen en klikken. */
  herkomst?: string | null;
  /** Wat de browser zag: "verwijzer: google.com" of "campagne: chatgpt.com". */
  bron?: string | null;
  /** De eerste pagina van het bezoek. */
  landingspagina?: string | null;
  /** De daghash van de bezoeker, zoals in page_views; null vóór 0047 of zonder zout. */
  visitor_hash?: string | null;
};

/** Wat er bij een conversie mee kan, naast soort en pagina (migratie 0047). */
export type ConversionExtra = Partial<Pick<Conversion, "herkomst" | "bron" | "landingspagina" | "visitor_hash">>;

/**
 * Het pad van de pagina waar het formulier stond, uit de Referer van het
 * verzoek. Server actions krijgen die header mee; de host doet er niet toe
 * (staging deelt de database). Zonder bruikbare waarde: "/".
 */
export function pathFromReferer(referer: string | null | undefined): string {
  if (!referer) return "/";
  try {
    return normalizePath(new URL(referer).pathname);
  } catch {
    return "/";
  }
}

/** Alleen de verstuurde formulieren; klikken tellen niet als aanvraag. */
export function aanvragen(convs: Conversion[]): Conversion[] {
  return convs.filter((c) => !isKlik(c.kind));
}

/** Alleen de bel- en mailklikken. */
export function klikken(convs: Conversion[]): Conversion[] {
  return convs.filter((c) => isKlik(c.kind));
}

export type KindCount = { kind: ConversionKind; label: string; count: number };

/** Aantal aanvragen per soort, alle soorten, ook met nul — zodat het overzicht niet verspringt. */
export function byKind(convs: Conversion[]): KindCount[] {
  return AANVRAAG_KINDS.map((kind) => ({
    kind,
    label: CONVERSION_LABELS[kind],
    count: convs.filter((c) => c.kind === kind).length,
  }));
}

/** Aantal klikken per soort (bel, mail), ook met nul. */
export function klikkenPerSoort(convs: Conversion[]): KindCount[] {
  return KLIK_KINDS.map((kind) => ({
    kind,
    label: CONVERSION_LABELS[kind],
    count: convs.filter((c) => c.kind === kind).length,
  }));
}

export type PathConversion = {
  path: string;
  /** Unieke bezoekers op die pagina in de periode (unieke hashes, roteren per dag). */
  visitors: number;
  conversions: number;
  /** Conversies per honderd bezoekers; null zonder bezoek. */
  rate: number | null;
};

function perPagina(convs: Conversion[], views: PageView[]): PathConversion[] {
  const visitors = new Map<string, Set<string>>();
  for (const v of views) (visitors.get(v.path) ?? visitors.set(v.path, new Set()).get(v.path)!).add(v.visitor_hash);
  const counts = new Map<string, number>();
  for (const c of convs) counts.set(c.path, (counts.get(c.path) || 0) + 1);
  return [...counts.entries()]
    .map(([path, conversions]) => {
      const n = visitors.get(path)?.size || 0;
      return { path, visitors: n, conversions, rate: n ? Math.min(100, Math.round((conversions / n) * 1000) / 10) : null };
    })
    .sort((a, b) => b.conversions - a.conversions || (b.rate ?? 0) - (a.rate ?? 0) || a.path.localeCompare(b.path));
}

/**
 * Per pagina: bezoekers, aanvragen en het percentage. Alleen pagina's met
 * minstens één aanvraag; gesorteerd op aantal aanvragen, dan op percentage.
 * Klikken tellen hier niet mee: die staan apart (klikkenPerPagina).
 */
export function byPath(convs: Conversion[], views: PageView[]): PathConversion[] {
  return perPagina(aanvragen(convs), views);
}

/** Per pagina: bezoekers en bel- plus mailklikken, met het percentage. */
export function klikkenPerPagina(convs: Conversion[], views: PageView[]): PathConversion[] {
  return perPagina(klikken(convs), views);
}

/** Aanvragen per honderd bezoekers over de hele site; null zonder bezoek. */
export function overallRate(convs: Conversion[], visitors: number): number | null {
  return visitors ? Math.round((aanvragen(convs).length / visitors) * 1000) / 10 : null;
}

export type HerkomstCount = { herkomst: string; label: string; count: number };

/**
 * Aanvragen per herkomst: wat de werkgever zelf zei bij "hoe heb je ons
 * gevonden". Sollicitaties en klikken vragen dat niet en tellen hier niet mee;
 * een aanvraag zonder antwoord (ouder dan 0047, of de belbalk) staat als
 * "Niet gevraagd". Gesorteerd op aantal.
 */
export function byHerkomst(convs: Conversion[]): HerkomstCount[] {
  const counts = new Map<string, number>();
  for (const c of aanvragen(convs)) {
    if (c.kind === "sollicitatie") continue;
    const h = c.herkomst || "";
    counts.set(h, (counts.get(h) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([herkomst, count]) => ({ herkomst, label: herkomst ? herkomstLabel(herkomst) || herkomst : "Niet gevraagd", count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export type LandingCount = { landingspagina: string; aanvragen: number; klikken: number };

/**
 * Per landingspagina (waar het bezoek begon): hoeveel aanvragen en klikken er
 * later in dat bezoek kwamen. Dit is de vraag achter de plaatspagina's: leidt
 * een binnenkomst op /arbodienst-<plaats> ooit tot een telefoontje of een
 * formulier? Alleen rijen met een bekende landingspagina; gesorteerd op
 * aanvragen, dan klikken.
 */
export function byLanding(convs: Conversion[]): LandingCount[] {
  const rows = new Map<string, LandingCount>();
  for (const c of convs) {
    if (!c.landingspagina) continue;
    const r = rows.get(c.landingspagina) ?? { landingspagina: c.landingspagina, aanvragen: 0, klikken: 0 };
    if (isKlik(c.kind)) r.klikken++;
    else r.aanvragen++;
    rows.set(c.landingspagina, r);
  }
  return [...rows.values()].sort((a, b) => b.aanvragen - a.aanvragen || b.klikken - a.klikken || a.landingspagina.localeCompare(b.landingspagina));
}
