import { getPage, isGepubliceerd } from "./content";
import { concept, reserveConcept, type Concept } from "./concept";
import type { Block, Page } from "./types";

/**
 * Welke inhoud een Nederlandse pagina (/<slug>) toont, en of hij bestaat.
 * Eén plek, zodat de route, de Engelse tegenhanger (hreflang) en sitemap.xml
 * dezelfde regel volgen:
 *
 * 1. op staging het concept, als dat er is (lib/concept.ts);
 * 2. anders de gepubliceerde pagina uit de database;
 * 3. anders de reserve-inhoud, alleen tijdens een migratiefase (reserveActief).
 *
 * De publicatiestatus is leidend: een pagina die een beheerder verbergt of
 * verwijdert is weg, en komt niet via een JSON-bestand terug.
 */
export type Inhoud = { page: Pick<Page, "title" | "seo_title" | "seo_description" | "og_image">; blocks: Block[] };

function alsInhoud(c: Concept): Inhoud {
  return {
    page: { title: c.title, seo_title: c.seo_title ?? null, seo_description: c.seo_description ?? null, og_image: null },
    blocks: c.blocks,
  };
}

export async function inhoud(slug: string): Promise<Inhoud | null> {
  const c = concept(slug);
  if (c) return alsInhoud(c);
  const db = await getPage(slug);
  if (db) return db;
  const reserve = reserveConcept(slug);
  return reserve ? alsInhoud(reserve) : null;
}

/** Bestaat /<slug> publiek? Zelfde regel als inhoud(), zonder de blokken op te halen. */
export async function paginaBestaat(slug: string): Promise<boolean> {
  if (concept(slug)) return true;
  if (await isGepubliceerd(slug)) return true;
  return reserveConcept(slug) !== null;
}
