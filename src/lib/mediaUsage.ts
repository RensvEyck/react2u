/**
 * Waar wordt een bestand uit de mediabibliotheek gebruikt?
 *
 * Er is geen koppeltabel: een afbeelding staat als volledige URL in blokdata,
 * in een artikel, in een instelling. Daarom zoeken we in alle inhoud naar URL's
 * van de `media`-bucket en maken daar een overzicht van. Puur: de server geeft
 * de bronnen, deze module telt.
 */

export type Usage = { label: string; href: string };

export type Source = Usage & { text: string };

const MARKER = "/storage/v1/object/public/media/";

/** Alle media-paden in een stuk tekst of JSON: "uploads/123-logo.png", "wp/2023/…". */
export function mediaPaths(text: string): string[] {
  const out = new Set<string>();
  let at = text.indexOf(MARKER);
  while (at !== -1) {
    const start = at + MARKER.length;
    // Een pad eindigt bij een aanhalingsteken, spatie, haakje of querystring —
    // zo staat het in JSON, markdown en HTML.
    const match = text.slice(start).match(/^[^"'\s)<>?#\\]+/);
    if (match) {
      let path = match[0];
      try {
        path = decodeURIComponent(path);
      } catch {
        // Kapotte codering: het ruwe pad is dan het beste wat we hebben.
      }
      out.add(path);
    }
    at = text.indexOf(MARKER, start);
  }
  return [...out];
}

/** Per pad de plekken waar het voorkomt, zonder dubbele vermeldingen. */
export function buildUsage(sources: Source[]): Record<string, Usage[]> {
  const usage: Record<string, Usage[]> = {};
  for (const s of sources) {
    for (const path of mediaPaths(s.text)) {
      const list = (usage[path] ||= []);
      if (!list.some((u) => u.href === s.href && u.label === s.label)) list.push({ label: s.label, href: s.href });
    }
  }
  return usage;
}

/** "240 KB", "1,4 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Boven deze grootte vertraagt een foto de pagina merkbaar, vooral mobiel. Een
 * webfoto hoeft zelden meer dan een paar honderd KB te zijn; de site-audit
 * haalde er eerder 6,8 MB aan afbeeldingen af.
 */
export const HEAVY_IMAGE_BYTES = 600 * 1024;
