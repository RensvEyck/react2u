import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { excelDatum, lezenXlsx } from "./xlsxLezen";
import { crc32, xlsx } from "./xlsx";
import { rijenUitCellen } from "./onboarding";

const enc = new TextEncoder();

/** Een zip zoals Excel hem maakt: met deflate (methode 8), anders dan onze eigen schrijver (methode 0). */
function zipDeflate(bestanden: Record<string, string>): Uint8Array {
  const delen: Uint8Array[] = [];
  const centraal: Uint8Array[] = [];
  let offset = 0;
  for (const [naam, tekst] of Object.entries(bestanden)) {
    const n = enc.encode(naam);
    const ruw = enc.encode(tekst);
    const data = new Uint8Array(deflateRawSync(ruw));
    const crc = crc32(ruw);
    const kop = new DataView(new ArrayBuffer(30));
    kop.setUint32(0, 0x04034b50, true); kop.setUint16(4, 20, true); kop.setUint16(8, 8, true);
    kop.setUint32(14, crc, true); kop.setUint32(18, data.length, true); kop.setUint32(22, ruw.length, true); kop.setUint16(26, n.length, true);
    delen.push(new Uint8Array(kop.buffer), n, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(10, 8, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, ruw.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
    centraal.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const cdLengte = centraal.reduce((s, d) => s + d.length, 0);
  const eind = new DataView(new ArrayBuffer(22));
  eind.setUint32(0, 0x06054b50, true); eind.setUint16(8, Object.keys(bestanden).length, true); eind.setUint16(10, Object.keys(bestanden).length, true);
  eind.setUint32(12, cdLengte, true); eind.setUint32(16, offset, true);
  const alles = [...delen, ...centraal, new Uint8Array(eind.buffer)];
  const uit = new Uint8Array(alles.reduce((s, d) => s + d.length, 0));
  let p = 0;
  for (const d of alles) { uit.set(d, p); p += d.length; }
  return uit;
}

/** Een werkboek zoals Excel het opslaat: gedeelde tekst, getallen, een datumopmaak, een eigen datumopmaak. */
function excelWerkboek(): Uint8Array {
  return zipDeflate({
    "[Content_Types].xml": `<Types/>`,
    "xl/workbook.xml": `<workbook xmlns:r="x"><sheets><sheet name="Personeel" sheetId="1" r:id="rId3"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Type="styles" Target="styles.xml"/><Relationship Id="rId3" Type="worksheet" Target="/xl/worksheets/sheet7.xml"/></Relationships>`,
    "xl/sharedStrings.xml": `<sst count="5"><si><t>Burgerservicenummer</t></si><si><t>roepnaam</t></si><si><r><rPr><b/></rPr><t>Eigen_</t></r><r><t>achternaam</t></r></si><si><t>Jan</t></si><si><t xml:space="preserve">de Vries &amp; Zn</t></si></sst>`,
    "xl/styles.xml": `<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="2"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet7.xml": `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="inlineStr"><is><t>geboortedatum</t></is></c><c r="E1" t="inlineStr"><is><t>startdatum_dienstverband</t></is></c><c r="F1" t="inlineStr"><is><t>omvangdienstverband</t></is></c></row>
<row r="2"><c r="A2"><v>123456782</v></c><c r="B2" t="s"><v>3</v></c><c r="C2" t="s"><v>4</v></c><c r="D2" s="1"><v>29353</v></c><c r="E2" s="2"><v>45292</v></c><c r="F2" s="3"><v>38.5</v></c></row>
<row r="3"><c r="A3"><v>12345678</v></c><c r="C3" t="str"><v>Peters</v></c><c r="D3" t="inlineStr"><is><t>15-02-1975</t></is></c><c r="F3"><v>4E1</v></c></row>
<row r="4"><c r="A4" s="3"/><c r="B4" s="3"/></row>
</sheetData></worksheet>`,
  });
}

describe("xlsx lezen", () => {
  it("leest ons eigen (ongecomprimeerde) bestand terug, cel voor cel", async () => {
    const rijen = [["Burgerservicenummer", "roepnaam", "Eigen_achternaam"], ["012345678", "Jan", "Jansen"], ["", "Sanne", "de Vries"]];
    expect(await lezenXlsx(xlsx(rijen))).toEqual(rijen);
  });

  it("leest een bestand zoals Excel het opslaat: deflate, gedeelde tekst, datums en getallen", async () => {
    const cellen = await lezenXlsx(excelWerkboek());
    expect(cellen[0]).toEqual(["Burgerservicenummer", "roepnaam", "Eigen_achternaam", "geboortedatum", "startdatum_dienstverband", "omvangdienstverband"]);
    // Rich text wordt één tekst; &amp; wordt &; een ingebouwde en een eigen datumopmaak worden een datum; 38.5 blijft 38.5.
    expect(cellen[1]).toEqual(["123456782", "Jan", "de Vries & Zn", "1980-05-12", "2024-01-01", "38.5"]);
    // Een lege cel ertussen blijft leeg; een formule-tekst en wetenschappelijke notatie komen goed door.
    expect(cellen[2]).toEqual(["12345678", "", "Peters", "15-02-1975", "", "40"]);
    // Een rij met alleen opmaak is leeg.
    expect(cellen[3]).toEqual(["", ""]);
  });

  it("gaat door rijenUitCellen: kopregel herkend, lege rijen weg, BSN met acht cijfers aangevuld", async () => {
    const { rijen, kopregel } = rijenUitCellen(await lezenXlsx(excelWerkboek()));
    expect(kopregel).toBe(true);
    expect(rijen).toHaveLength(2);
    expect(rijen[0]).toMatchObject({ bsn: "123456782", roepnaam: "Jan", achternaam: "de Vries & Zn", geboortedatum: "1980-05-12", startdatum: "2024-01-01", uren: "38.5" });
    expect(rijen[1]).toMatchObject({ bsn: "012345678", achternaam: "Peters", geboortedatum: "1975-02-15", uren: "40" });
  });

  it("rekent Exceldatums om, ook rond de fout van 1900", () => {
    expect(excelDatum(45292)).toBe("2024-01-01");
    expect(excelDatum(29353)).toBe("1980-05-12");
    expect(excelDatum(1)).toBe("1900-01-01");
    expect(excelDatum(61)).toBe("1900-03-01");
  });

  it("weigert wat geen zip is", async () => {
    await expect(lezenXlsx(new TextEncoder().encode("naam;bsn\nJan;1"))).rejects.toThrow();
  });
});
