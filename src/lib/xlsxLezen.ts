/**
 * Een .xlsx-bestand lezen in de browser (en in Node, voor de tests): het
 * ingevulde werknemersbestand dat de klant uploadt (0037, "Via Excel").
 * Tegenhanger van lib/xlsx.ts, net zo zonder dependency: een xlsx is een zip
 * met XML-bestanden. Ontpakken kan de browser zelf (DecompressionStream,
 * deflate-raw); de XML lezen we met reguliere expressies, want de bestanden
 * van Excel zijn klein en voorspelbaar.
 *
 * Geeft de cellen van het eerste werkblad als tekst, rij voor rij, zoals de
 * klant ze ziet: gedeelde tekst opgezocht, getallen als getal, en een datum
 * (een getal met een datumopmaak) als 2024-01-31. Wat hier uitkomt gaat door
 * `rijenUitCellen` (lib/onboarding.ts), net als geplakte rijen.
 */

const dec = new TextDecoder();

type Zip = Map<string, { methode: number; begin: number; lengte: number }>;

/** De centrale map van de zip: per bestand waar de inhoud staat. */
function inhoudsopgave(b: Uint8Array): Zip {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eind = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eind = i; break; }
  }
  if (eind < 0) throw new Error("geen zip");
  const aantal = dv.getUint16(eind + 10, true);
  let p = dv.getUint32(eind + 16, true);
  const map: Zip = new Map();
  for (let n = 0; n < aantal; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("zip beschadigd");
    const methode = dv.getUint16(p + 10, true);
    const lengte = dv.getUint32(p + 20, true);
    const naamLengte = dv.getUint16(p + 28, true);
    const extraLengte = dv.getUint16(p + 30, true);
    const commentaarLengte = dv.getUint16(p + 32, true);
    const lokaal = dv.getUint32(p + 42, true);
    const naam = dec.decode(b.subarray(p + 46, p + 46 + naamLengte));
    // De lokale kop heeft zijn eigen naam- en extralengte; daarna begint de inhoud.
    const begin = lokaal + 30 + dv.getUint16(lokaal + 26, true) + dv.getUint16(lokaal + 28, true);
    map.set(naam.replace(/^\//, ""), { methode, begin, lengte });
    p += 46 + naamLengte + extraLengte + commentaarLengte;
  }
  return map;
}

async function ontpak(b: Uint8Array, zip: Zip, naam: string): Promise<string | null> {
  const e = zip.get(naam);
  if (!e) return null;
  const deel = b.subarray(e.begin, e.begin + e.lengte);
  if (e.methode === 0) return dec.decode(deel);
  if (e.methode !== 8) throw new Error(`zip-methode ${e.methode}`);
  const stroom = new Blob([new Uint8Array(deel)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stroom).text();
}

const ONTSNAPT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
function tekst(xml: string): string {
  return xml.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, c: string) =>
    c[0] === "#" ? String.fromCodePoint(parseInt(c[1] === "x" || c[1] === "X" ? c.slice(2) : c.slice(1), c[1] === "x" || c[1] === "X" ? 16 : 10)) : ONTSNAPT[m.toLowerCase()] ?? m
  );
}

/** Alle <t>…</t> in een stuk XML achter elkaar (een cel met opmaak heeft er meerdere). */
const tekstVan = (xml: string) => tekst([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/** "AB" → 27 (nul-gebaseerd: 27). */
function kolomIndex(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+$/, "")) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Welke opmaakindexen (s="…") een datum zijn: de ingebouwde datumopmaken, of een eigen opmaak met dag, maand en jaar. */
function datumStijlen(styles: string | null): Set<number> {
  const uit = new Set<number>();
  if (!styles) return uit;
  const eigen = new Set<number>();
  for (const m of styles.matchAll(/<numFmt\s[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    const code = m[2].replace(/\[[^\]]*\]/g, "").replace(/"[^"]*"/g, "").toLowerCase();
    if (/d/.test(code) && /m/.test(code) && /y/.test(code) && !/[hs]/.test(code)) eigen.add(Number(m[1]));
  }
  const xfs = styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] || "";
  [...xfs.matchAll(/<xf\s[^>]*?(?:\/>|>)/g)].forEach((m, i) => {
    const id = Number(m[0].match(/numFmtId="(\d+)"/)?.[1] ?? -1);
    if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || eigen.has(id)) uit.add(i);
  });
  return uit;
}

/** Een Exceldatum (dagen sinds 1900, met de fout van 29 februari 1900) als 2024-01-31. */
export function excelDatum(serie: number): string {
  const dag = Math.floor(serie);
  // Dag 1 is 1 januari 1900; Excel telt een 29 februari 1900 die niet bestaat (dag 60), daarna loopt alles één dag voor.
  const d = new Date(Date.UTC(1899, 11, dag > 59 ? 30 : 31) + dag * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Een getal zoals Excel het toont: 38 blijft 38, 38.5 blijft 38.5, 1.2345678E8 wordt 123456780. */
function getal(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

/** Het eerste werkblad van een xlsx als tekstcellen; lege cellen zijn "". */
export async function lezenXlsx(bytes: Uint8Array | ArrayBuffer): Promise<string[][]> {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const zip = inhoudsopgave(b);
  const [werkboek, rels, gedeeld, styles] = await Promise.all([
    ontpak(b, zip, "xl/workbook.xml"), ontpak(b, zip, "xl/_rels/workbook.xml.rels"), ontpak(b, zip, "xl/sharedStrings.xml"), ontpak(b, zip, "xl/styles.xml"),
  ]);
  // Het eerste blad: via de relatie uit workbook.xml, anders sheet1.
  let bladPad = "xl/worksheets/sheet1.xml";
  const rId = werkboek?.match(/<sheet\s[^>]*r:id="([^"]+)"/)?.[1];
  if (rId && rels) {
    const doel = rels.match(new RegExp(`<Relationship\\s[^>]*Id="${rId}"[^>]*Target="([^"]+)"`))?.[1] || rels.match(new RegExp(`<Relationship\\s[^>]*Target="([^"]+)"[^>]*Id="${rId}"`))?.[1];
    if (doel) bladPad = doel.startsWith("/") ? doel.slice(1) : `xl/${doel}`;
  }
  const blad = await ontpak(b, zip, bladPad);
  if (!blad) throw new Error("geen werkblad");

  const strings = gedeeld ? [...gedeeld.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => tekstVan(m[1])) : [];
  const datums = datumStijlen(styles);
  const rijen: string[][] = [];
  for (const rij of blad.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cellen: string[] = [];
    for (const cel of rij[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attr = cel[1];
      const ref = attr.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const i = kolomIndex(ref);
      const t = attr.match(/\bt="(\w+)"/)?.[1];
      const s = Number(attr.match(/\bs="(\d+)"/)?.[1] ?? -1);
      const binnen = cel[2] || "";
      let waarde = "";
      if (t === "s") waarde = strings[Number(binnen.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? -1)] ?? "";
      else if (t === "inlineStr") waarde = tekstVan(binnen);
      else if (t === "str" || t === "e") waarde = tekst(binnen.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      else if (t === "b") waarde = binnen.match(/<v>1<\/v>/) ? "ja" : "nee";
      else {
        const v = binnen.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v !== undefined) waarde = datums.has(s) && Number.isFinite(Number(v)) && Number(v) > 0 ? excelDatum(Number(v)) : getal(v.trim());
      }
      while (cellen.length < i) cellen.push("");
      cellen[i] = waarde;
    }
    rijen.push(cellen);
  }
  return rijen;
}

/** Of de browser dit kan (DecompressionStream; sinds 2023 overal). */
export function kanXlsxLezen(): boolean {
  return typeof DecompressionStream !== "undefined";
}
