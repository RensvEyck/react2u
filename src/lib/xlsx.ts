/**
 * Een eenvoudig .xlsx-bestand: één blad, tekstcellen, de eerste rij vet. Voor
 * het werknemersbestand van een onboarding (0037), in het formaat van het lege
 * importbestand van XpertSuite.
 *
 * Bewust zonder dependency, net als de mail (lib/mail.ts): een xlsx is een zip
 * met vijf kleine XML-bestanden, en die zip hoeft niet gecomprimeerd.
 */

const enc = new TextEncoder();

const CRC_TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABEL[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Een zip zonder compressie (methode 0). */
export function zip(bestanden: { naam: string; inhoud: Uint8Array }[]): Uint8Array {
  const delen: Uint8Array[] = [];
  const centraal: Uint8Array[] = [];
  let offset = 0;
  for (const b of bestanden) {
    const naam = enc.encode(b.naam);
    const crc = crc32(b.inhoud);
    const lokaal = new DataView(new ArrayBuffer(30));
    lokaal.setUint32(0, 0x04034b50, true);
    lokaal.setUint16(4, 20, true);
    lokaal.setUint16(6, 0x0800, true); // utf-8 namen
    lokaal.setUint16(8, 0, true);
    lokaal.setUint16(10, 0, true);
    lokaal.setUint16(12, 0x21, true); // 1 jan 1980
    lokaal.setUint32(14, crc, true);
    lokaal.setUint32(18, b.inhoud.length, true);
    lokaal.setUint32(22, b.inhoud.length, true);
    lokaal.setUint16(26, naam.length, true);
    lokaal.setUint16(28, 0, true);
    delen.push(new Uint8Array(lokaal.buffer), naam, b.inhoud);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, b.inhoud.length, true);
    c.setUint32(24, b.inhoud.length, true);
    c.setUint16(28, naam.length, true);
    c.setUint32(42, offset, true);
    centraal.push(new Uint8Array(c.buffer), naam);
    offset += 30 + naam.length + b.inhoud.length;
  }
  const grootteCentraal = centraal.reduce((s, d) => s + d.length, 0);
  const eind = new DataView(new ArrayBuffer(22));
  eind.setUint32(0, 0x06054b50, true);
  eind.setUint16(8, bestanden.length, true);
  eind.setUint16(10, bestanden.length, true);
  eind.setUint32(12, grootteCentraal, true);
  eind.setUint32(16, offset, true);
  const alles = [...delen, ...centraal, new Uint8Array(eind.buffer)];
  const uit = new Uint8Array(alles.reduce((s, d) => s + d.length, 0));
  let p = 0;
  for (const d of alles) {
    uit.set(d, p);
    p += d.length;
  }
  return uit;
}

const xml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** Kolomletter: 0 → A, 26 → AA. */
export function kolom(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Een werkboek met één blad; `rijen[0]` is de kop. Alle cellen als tekst, zodat een BSN met een 0 vooraan blijft staan. */
export function xlsx(rijen: string[][], blad = "Sheet 1"): Uint8Array {
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rijen
    .map(
      (rij, r) =>
        `<row r="${r + 1}">${rij
          .map((w, k) => (w === "" ? "" : `<c r="${kolom(k)}${r + 1}" t="inlineStr"${r === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(w)}</t></is></c>`))
          .join("")}</row>`,
    )
    .join("")}</sheetData></worksheet>`;
  const bestanden: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(blad.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": sheet,
  };
  return zip(Object.entries(bestanden).map(([naam, inhoud]) => ({ naam, inhoud: enc.encode(inhoud) })));
}
