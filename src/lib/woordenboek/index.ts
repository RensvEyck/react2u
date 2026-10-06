import type { Taal } from "@/lib/taal";
import { nl, type Woordenboek } from "./nl";
import { en } from "./en";

export type { Woordenboek };

const WOORDENBOEKEN: Record<Taal, Woordenboek> = { nl, en };

/** De vaste interfaceteksten in een taal. Werkt op de server en in de browser. */
export function woordenboek(taal: Taal): Woordenboek {
  return WOORDENBOEKEN[taal] ?? nl;
}
