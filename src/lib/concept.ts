import type { Block } from "./types";
import home from "@/content/home.json";

/**
 * Blokken van de concept-homepage uit src/content/home.json, in de vorm die
 * BlockRenderer verwacht. Zie CONTEXT.md, *Concepten*.
 */
export function conceptBlocks(): Block[] {
  return home.blocks.map((b, i) => ({
    id: `concept-${i}`,
    page_id: "concept",
    type: b.type,
    label: b.label,
    sort: i,
    data: b.data as Record<string, unknown>,
    updated_at: "",
  }));
}

/**
 * Op staging (een preview-deploy) staat het concept ook op `/`: daar wil je de
 * nieuwe homepage zien zoals hij straks live komt, niet eerst naar /concept
 * hoeven. Lokaal en in productie komt `/` gewoon uit de database.
 */
export const conceptOpHome = process.env.VERCEL_ENV === "preview";
