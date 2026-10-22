/**
 * Splitst een regel uit de mini-markdown (lib/md.tsx) in stukken: gewone
 * tekst, **vet** en [links](/pad). Los van de weergave, zodat het zonder
 * React te testen is.
 *
 * Een link mag alleen naar een eigen pad, een anker, http(s), mail of
 * telefoon. Iets anders, zoals `javascript:` of `//elders.nl`, blijft gewone
 * tekst: de teksten komen uit het beheer, maar een link hoort nooit code uit
 * te voeren.
 */

export type Deel =
  | { soort: "tekst"; tekst: string }
  | { soort: "vet"; tekst: string }
  | { soort: "link"; tekst: string; href: string };

const PATROON = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function veiligeHref(href: string): string | null {
  return /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(href) ? href : null;
}

export function inlineDelen(text: string): Deel[] {
  const delen: Deel[] = [];
  let vanaf = 0;
  for (const m of text.matchAll(PATROON)) {
    const begin = m.index ?? 0;
    if (begin > vanaf) delen.push({ soort: "tekst", tekst: text.slice(vanaf, begin) });
    if (m[1] !== undefined) {
      delen.push({ soort: "vet", tekst: m[1] });
    } else {
      const href = veiligeHref(m[3]);
      delen.push(href ? { soort: "link", tekst: m[2], href } : { soort: "tekst", tekst: m[0] });
    }
    vanaf = begin + m[0].length;
  }
  if (vanaf < text.length) delen.push({ soort: "tekst", tekst: text.slice(vanaf) });
  return delen;
}
