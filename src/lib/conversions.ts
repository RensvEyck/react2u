import type { PageView } from "./types";
import { normalizePath } from "./analytics";

/**
 * Conversies: welke pagina levert aanvragen op.
 *
 * Bezoek alleen zegt niets over wat de site oplevert. Elk verstuurd formulier
 * telt daarom één conversie (tabel `conversions`, migratie 0013): het soort en
 * de pagina waar het formulier stond. Geen persoonsgegevens — die staan al in
 * het Postvak IN. Hier alleen de rekensommen; opslaan en ophalen zit in
 * conversionsDb.ts.
 */

export const CONVERSION_KINDS = ["contact", "offerte", "sollicitatie", "terugbel"] as const;
export type ConversionKind = (typeof CONVERSION_KINDS)[number];

export const CONVERSION_LABELS: Record<ConversionKind, string> = {
  contact: "Contactberichten",
  offerte: "Offerteaanvragen",
  sollicitatie: "Sollicitaties",
  terugbel: "Terugbelverzoeken",
};

export type Conversion = { id: string; kind: ConversionKind; path: string; created_at: string };

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

export type KindCount = { kind: ConversionKind; label: string; count: number };

/** Aantal per soort, alle soorten, ook met nul — zodat het overzicht niet verspringt. */
export function byKind(convs: Conversion[]): KindCount[] {
  return CONVERSION_KINDS.map((kind) => ({
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

/**
 * Per pagina: bezoekers, aanvragen en het percentage. Alleen pagina's met
 * minstens één aanvraag; gesorteerd op aantal aanvragen, dan op percentage.
 */
export function byPath(convs: Conversion[], views: PageView[]): PathConversion[] {
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

/** Conversies per honderd bezoekers over de hele site; null zonder bezoek. */
export function overallRate(convs: Conversion[], visitors: number): number | null {
  return visitors ? Math.round((convs.length / visitors) * 1000) / 10 : null;
}
