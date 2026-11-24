import { gidsVoor, gidsWoorden } from "./gidsen";
import { auteurVoorNaam } from "./auteurs";
import { DESC_MAX, TITLE_MAX } from "./seo";

/**
 * De controles op een gids voor /admin/seo: dezelfde regels als
 * src/lib/gidsen.test.ts bewaakt voor de concepten, maar dan op de blokken
 * zoals ze in de database staan, zodat een collega die een gids in het beheer
 * schrijft of bijwerkt ziet of hij nog aan de opbouw van HALO voldoet.
 * Puur: de pagina haalt de blokken op en geeft ze hier aan.
 */

export type GidsControle = { sleutel: string; label: string; ok: boolean; detail: string };

type Blok = { type: string; data: unknown };
type Pagina = { slug: string; title: string; seo_title: string | null; seo_description: string | null };

export const GIDS_BLOKTYPES = ["gidsKop", "gidsTekst", "gidsTijdlijn", "gidsTabel", "gidsVragen", "gidsBronnen", "gidsHelpt"];

/** Een pagina is een gids als hij met een gidskop begint. */
export function isGids(blocks: Blok[]): boolean {
  return blocks.length > 0 && blocks[0].type === "gidsKop";
}

const d = (b: Blok | undefined) => (b?.data && typeof b.data === "object" ? (b.data as Record<string, unknown>) : {});
const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function controleerGids(pagina: Pagina, blocks: Blok[]): GidsControle[] {
  const kop = d(blocks.find((b) => b.type === "gidsKop"));
  const vragen = d(blocks.find((b) => b.type === "gidsVragen"));
  const helpt = d(blocks.find((b) => b.type === "gidsHelpt"));
  const bronnen = d(blocks.find((b) => b.type === "gidsBronnen"));
  const heading = tekst(kop.heading);
  const antwoord = tekst(kop.antwoord);
  const zinnen = antwoord ? antwoord.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean).length : 0;
  const woorden = gidsWoorden(blocks);
  const items = Array.isArray(vragen.items) ? vragen.items.length : 0;
  const auteur = (kop.auteur && typeof kop.auteur === "object" ? kop.auteur : {}) as { naam?: string; functie?: string };
  const dienst = (helpt.dienst && typeof helpt.dienst === "object" ? helpt.dienst : {}) as { href?: string };
  const aantalBronnen = Array.isArray(bronnen.items) ? bronnen.items.length : 0;
  const gids = gidsVoor(pagina.slug);
  const titel = pagina.seo_title || `${pagina.title} • React2u`;
  const omschrijving = pagina.seo_description || "";

  return [
    { sleutel: "vraag", label: "De kop is een vraag", ok: heading.endsWith("?"), detail: heading || "geen kop" },
    { sleutel: "antwoord", label: "Twee zinnen direct antwoord", ok: zinnen >= 2 && zinnen <= 3, detail: antwoord ? `${zinnen} ${zinnen === 1 ? "zin" : "zinnen"}` : "geen antwoord" },
    { sleutel: "woorden", label: "1.500 tot 2.000 woorden", ok: woorden >= 1500 && woorden <= 2100, detail: `${woorden} woorden` },
    { sleutel: "tijdlijn", label: "Tijdlijn of stappenplan", ok: blocks.some((b) => b.type === "gidsTijdlijn"), detail: blocks.some((b) => b.type === "gidsTijdlijn") ? "aanwezig" : "ontbreekt" },
    { sleutel: "tabel", label: "Tabel met termijnen of kosten", ok: blocks.some((b) => b.type === "gidsTabel"), detail: blocks.some((b) => b.type === "gidsTabel") ? "aanwezig" : "ontbreekt" },
    { sleutel: "vragen", label: "Vijf tot acht veelgestelde vragen", ok: items >= 5 && items <= 8, detail: `${items} ${items === 1 ? "vraag" : "vragen"}` },
    { sleutel: "auteur", label: "Auteur met naam, functie en pagina", ok: Boolean(auteur.naam && auteur.functie && auteurVoorNaam(auteur.naam)), detail: auteur.naam ? `${auteur.naam}${auteur.functie ? `, ${auteur.functie}` : ", geen functie"}${auteurVoorNaam(auteur.naam) ? "" : " (geen auteurspagina in lib/auteurs.ts)"}` : "geen auteur" },
    { sleutel: "bronnen", label: "Minstens twee bronnen", ok: aantalBronnen >= 2, detail: `${aantalBronnen} ${aantalBronnen === 1 ? "bron" : "bronnen"}` },
    { sleutel: "dienst", label: "Zo helpt React2u met een dienst en kennismaken", ok: Boolean(dienst.href), detail: dienst.href ? `naar ${dienst.href}` : "geen dienst gekoppeld" },
    { sleutel: "titel", label: `Titel onder ${TITLE_MAX} tekens${gids ? ", zoekwoord vooraan" : ""}`, ok: titel.length <= TITLE_MAX && (!gids || titel.toLowerCase().startsWith(gids.zoekwoord)), detail: `${titel.length} tekens${gids && !titel.toLowerCase().startsWith(gids.zoekwoord) ? `, begint niet met “${gids.zoekwoord}”` : ""}` },
    { sleutel: "omschrijving", label: `Omschrijving 70 tot ${DESC_MAX} tekens`, ok: omschrijving.length >= 70 && omschrijving.length <= DESC_MAX, detail: `${omschrijving.length} tekens` },
  ];
}

/** Hoeveel controles slagen, voor het overzicht. */
export function gidsScore(controles: GidsControle[]): { ok: number; totaal: number } {
  return { ok: controles.filter((c) => c.ok).length, totaal: controles.length };
}
