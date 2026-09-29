/**
 * Zoeklogica achter het commandopalet (⌘K) in de admin.
 *
 * Twee soorten bronnen, bewust verschillend behandeld:
 *
 * - **Inhoud** (pagina's, blokken, artikelen, vacatures) is klein en verandert
 *   weinig. Die gaat bij het openen van het palet in één keer naar de browser
 *   en wordt daar doorzocht — elke toetsaanslag geeft dan meteen resultaat,
 *   zonder wachten op het netwerk. Ook de tékst van blokken zit erin, zodat je
 *   kunt vinden op welke pagina een zin staat.
 * - **Inzendingen** (berichten, sollicitaties, leads) groeien door en bevatten
 *   persoonsgegevens. Die worden per zoekopdracht op de server bevraagd, met
 *   een limiet, en nooit als geheel naar de browser gestuurd.
 *
 * Alles hier is puur: geen database, geen DOM. Zo is het te testen.
 */

export type Range = [start: number, end: number];

export type Snippet = { text: string; ranges: Range[]; clippedStart: boolean; clippedEnd: boolean };

/** Een doorzoekbaar stuk inhoud, zoals de server het voor het palet klaarzet. */
export type IndexEntry = {
  kind: "pagina" | "blok" | "artikel" | "vacature";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** Leesbare tekst om in te zoeken (blokteksten, artikelbody). Mag leeg. */
  text: string;
  /** Live, concept of gesloten — getoond als label, telt niet mee in de score. */
  status: "live" | "concept" | "gesloten";
};

/** Een inzending of persoon, gevonden door de server. */
export type RecordHit = {
  kind: "bericht" | "sollicitatie" | "lead" | "gebruiker";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/**
 * Maakt één teken vergelijkbaar: kleine letters, zonder accenten.
 *
 * "Café" en "cafe" moeten elkaar vinden. NFD splitst é in e + accentteken, en
 * dat teken gooien we weg.
 */
function foldChar(c: string): string {
  return c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Vouwt een tekst en onthoudt per gevouwen teken waar het vandaan kwam.
 *
 * Nodig om een treffer terug te vertalen naar de originele tekst: vouwen kan
 * de lengte veranderen (een los accentteken verdwijnt, "İ" wordt twee tekens),
 * en dan zou markeren op dezelfde posities naast de treffer uitkomen.
 */
function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = foldChar(s[i]);
    for (let j = 0; j < f.length; j++) {
      folded += f[j];
      map.push(i);
    }
  }
  map.push(s.length);
  return { folded, map };
}

/** Zoektermen: gevouwen, op spaties gesplitst, lege weg. */
export function terms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Alle plekken in `text` waar een van de termen staat, als bereiken in het origineel. */
export function findRanges(text: string, queryTerms: string[]): Range[] {
  if (!text || !queryTerms.length) return [];
  const { folded, map } = foldWithMap(text);
  const out: Range[] = [];
  for (const t of queryTerms) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(t, from);
      if (at < 0) break;
      // Tot het origineel van het volgende gevouwen teken: zo gaat een los
      // accentteken direct na de treffer mee in de markering.
      out.push([map[at], map[at + t.length]]);
      from = at + t.length;
    }
  }
  return mergeRanges(out);
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/**
 * Een fragment rond de eerste treffer, zodat je ziet wáár iets staat.
 *
 * Knipt op een woordgrens als dat binnen een paar tekens kan; een fragment dat
 * midden in een woord begint leest als een fout.
 */
export function snippet(text: string, queryTerms: string[], radius = 56): Snippet | null {
  const flat = text.replace(/\s+/g, " ").trim();
  const ranges = findRanges(flat, queryTerms);
  if (!ranges.length) return null;
  const [s, e] = ranges[0];
  let start = Math.max(0, s - radius);
  let end = Math.min(flat.length, e + radius);
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space > -1 && space < s) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > e) end = space;
  }
  const piece = flat.slice(start, end);
  return {
    text: piece,
    ranges: ranges
      .filter(([a, b]) => a >= start && b <= end)
      .map(([a, b]) => [a - start, b - start] as Range),
    clippedStart: start > 0,
    clippedEnd: end < flat.length,
  };
}

/**
 * Hoe goed past een kandidaat bij de zoekopdracht? 0 = niet.
 *
 * Elke term moet ergens voorkomen (titel, ondertitel of tekst) — anders valt de
 * kandidaat af. Een treffer in de titel weegt het zwaarst, en daarbinnen gaat
 * "begint met" voor "staat ergens in". Zo staat bij "con" de pagina Contact
 * boven een blok waarin toevallig "concreet" staat.
 */
export function score(
  fields: { title: string; subtitle?: string; text?: string },
  queryTerms: string[]
): number {
  if (!queryTerms.length) return 0;
  const title = fold(fields.title);
  const subtitle = fold(fields.subtitle || "");
  const text = fold(fields.text || "");
  let total = 0;
  for (const t of queryTerms) {
    let best = 0;
    if (title.startsWith(t)) best = 100;
    else if (title.includes(` ${t}`) || title.includes(`-${t}`) || title.includes(`/${t}`)) best = 80;
    else if (title.includes(t)) best = 60;
    else if (subtitle.includes(t)) best = 35;
    else if (text.includes(t)) best = 20;
    if (!best) return 0;
    total += best;
  }
  // Korte titels die volledig matchen zijn waarschijnlijker wat je zoekt.
  if (title === queryTerms.join(" ")) total += 50;
  return total;
}

/* ---------- tekst uit blokdata ---------- */

// Velden die geen leesbare tekst bevatten: links, afbeeldingen, iconen en
// stijlkeuzes. Wie op "check" zoekt wil geen blok vinden omdat daar een
// vinkje-icoon in staat.
const NON_TEXT_KEYS = new Set(["image", "href", "icon", "style", "imagePosition", "logo", "og_image", "phone", "images", "logos"]);

/**
 * Haalt alle leesbare tekst uit de data van een blok.
 *
 * Blokdata heeft per type een andere vorm (zie blockTemplates.ts), dus we
 * lopen de structuur generiek af in plaats van per type velden te noemen — een
 * nieuw bloktype is dan meteen doorzoekbaar.
 */
export function blockText(data: unknown, max = 3000): string {
  const parts: string[] = [];
  let length = 0;
  const walk = (v: unknown, key?: string) => {
    if (length >= max) return;
    if (key && NON_TEXT_KEYS.has(key)) return;
    if (typeof v === "string") {
      const clean = stripMarkdown(v).trim();
      if (clean) {
        parts.push(clean);
        length += clean.length + 1;
      }
    } else if (Array.isArray(v)) {
      v.forEach((item) => walk(item, key));
    } else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) walk(val, k);
    }
  };
  walk(data);
  return parts.join(" · ").slice(0, max);
}

/** Genoeg markdown weghalen om zoekfragmenten leesbaar te houden. */
export function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "");
}

/**
 * Maakt een zoekopdracht veilig voor een PostgREST `or()`-filter.
 *
 * Komma's en haakjes zijn daar syntax, `%` en `_` zijn jokers in `ilike`. Wie
 * "a,b" intikt zou anders een kapot filter opleveren, en wie "%" intikt alles.
 */
export function ilikeTerm(query: string): string {
  return query.replace(/[,()%_*\\"':]/g, " ").replace(/\s+/g, " ").trim();
}
