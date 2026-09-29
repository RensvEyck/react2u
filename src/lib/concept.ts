import type { Block } from "./types";
import home from "@/content/home.json";
import werkgevers from "@/content/werkgevers.json";
import werknemers from "@/content/werknemers.json";
import verzuimprotocol from "@/content/verzuimprotocol.json";

/**
 * Concepten: een nieuwe opbouw van een pagina die nog niet in de database
 * staat. Eén JSON-bestand per pagina in src/content/. Zie CONTEXT.md,
 * *Concepten*.
 */
type ConceptBestand = {
  slug: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  blocks: { type: string; label?: string | null; data: unknown }[];
};

const CONCEPTEN: ConceptBestand[] = [home, werkgevers, werknemers, verzuimprotocol];

/**
 * Concepten zijn alleen zichtbaar op een preview-deploy (staging): daar wil je
 * de site zien zoals hij straks live komt. Lokaal nabootsen met
 * `VERCEL_ENV=preview npm run dev`. In productie komt alles uit de database.
 */
export const conceptenActief = process.env.VERCEL_ENV === "preview";

export type Concept = { slug: string; title: string; seo_title?: string; seo_description?: string; blocks: Block[] };

export function concept(slug: string): Concept | null {
  if (!conceptenActief) return null;
  const c = CONCEPTEN.find((x) => x.slug === slug);
  if (!c) return null;
  return {
    slug: c.slug,
    title: c.title,
    seo_title: c.seo_title,
    seo_description: c.seo_description,
    blocks: c.blocks.map((b, i) => ({
      id: `concept-${c.slug}-${i}`,
      page_id: `concept-${c.slug}`,
      type: b.type,
      label: b.label ?? null,
      sort: i,
      data: b.data as Record<string, unknown>,
      updated_at: "",
    })),
  };
}

/** Slugs van concepten die nog niet als pagina bestaan, voor generateStaticParams. */
export function conceptSlugs(): string[] {
  return conceptenActief ? CONCEPTEN.map((c) => c.slug).filter((s) => s !== "home") : [];
}
