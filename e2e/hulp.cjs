// Gedeeld door de browsertests: waar de site draait, waar de uitvoer heen gaat,
// de mails van de nep-Resend, de TOTP-code van de testbeheerder en SQL op de
// testdatabase. Alles via omgevingsvariabelen, zodat e2e/run.mjs (lokaal en in
// CI) het kan sturen; de standaardwaarden horen bij e2e/supabase/config.toml.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BASIS = process.env.E2E_BASIS || "http://localhost:3014";
const UIT = path.resolve(process.env.E2E_UIT || path.join(__dirname, "..", ".e2e", "uitvoer"));
const MAILS = path.join(UIT, "mails.jsonl");
const DB = process.env.E2E_DB_CONTAINER || "supabase_db_react2u-e2e";

/** De testbeheerder uit e2e/supabase/extra/testgebruiker.sql. */
const BEHEERDER = { email: "rens@react2u.nl", wachtwoord: "Test-wachtwoord-123" };

const mails = () => (fs.existsSync(MAILS) ? fs.readFileSync(MAILS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

/** De offertelink uit een mail (localhost of 127.0.0.1, met poort). */
const offerteLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/offerte\/[a-f0-9]{48,})"/)?.[1];
const brochureLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/brochure\/[a-f0-9]{48,})"/)?.[1];
const onboardingLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/onboarding\/[a-f0-9]{48,})"/)?.[1];
const evaluatieLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/evaluatie\/[a-f0-9]{48,})"/)?.[1];

function base32(s) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += a.indexOf(c).toString(2).padStart(5, "0");
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

/** RFC 6238: sha1, 30 seconden, 6 cijfers. */
function totp(secret, t = Date.now()) {
  const tel = Buffer.alloc(8);
  tel.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / 30)));
  const h = crypto.createHmac("sha1", base32(secret)).update(tel).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

/** Het geheim van de authenticator die e2e/run.mjs voor de testbeheerder instelt. */
const geheim = () => fs.readFileSync(path.join(UIT, "totp-geheim.txt"), "utf8").trim();

const sql = (q) => execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-tA", "-c", q]).toString().trim();

module.exports = { BASIS, UIT, MAILS, DB, BEHEERDER, mails, offerteLink, brochureLink, onboardingLink, evaluatieLink, totp, geheim, sql };

/**
 * Een .xlsx zoals Excel hem opslaat (deflate, gedeelde tekst, een datumopmaak),
 * om het uploaden in de browser te testen. Een cel is tekst, of { d: "2024-01-31" }
 * voor een datum als getal met datumopmaak, zoals Excel een getypte datum bewaart.
 */
function maakXlsx(rijen) {
  const zlib = require("zlib");
  const enc = new TextEncoder();
  const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const kolom = (i) => { let s = ""; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  const serie = (iso) => Math.round((Date.UTC(...iso.split("-").map((x, i) => Number(x) - (i === 1 ? 1 : 0))) - Date.UTC(1899, 11, 30)) / 86400000);
  const teksten = [];
  const gedeeld = (t) => { let i = teksten.indexOf(t); if (i < 0) { teksten.push(t); i = teksten.length - 1; } return i; };
  const blad = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rijen
    .map((rij, r) => `<row r="${r + 1}">${rij.map((w, k) => {
      const ref = `${kolom(k)}${r + 1}`;
      if (w && typeof w === "object" && w.d) return `<c r="${ref}" s="1"><v>${serie(w.d)}</v></c>`;
      if (w === "" || w == null) return "";
      return `<c r="${ref}" t="s"><v>${gedeeld(String(w))}</v></c>`;
    }).join("")}</row>`)
    .join("")}</sheetData></worksheet>`;
  const bestanden = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Personeel" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    "xl/styles.xml": `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": blad,
  };
  bestanden["xl/sharedStrings.xml"] = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${teksten.length}" uniqueCount="${teksten.length}">${teksten.map((t) => `<si><t xml:space="preserve">${xml(t)}</t></si>`).join("")}</sst>`;
  const tabel = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (d) => { let c = 0xffffffff; for (const b of d) c = tabel[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const delen = []; const centraal = []; let offset = 0;
  for (const [naam, tekst] of Object.entries(bestanden)) {
    const n = enc.encode(naam); const ruw = enc.encode(tekst); const data = zlib.deflateRawSync(ruw); const crc = crc32(ruw);
    const kop = Buffer.alloc(30); kop.writeUInt32LE(0x04034b50, 0); kop.writeUInt16LE(20, 4); kop.writeUInt16LE(8, 8);
    kop.writeUInt32LE(crc, 14); kop.writeUInt32LE(data.length, 18); kop.writeUInt32LE(ruw.length, 22); kop.writeUInt16LE(n.length, 26);
    delen.push(kop, Buffer.from(n), data);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(ruw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    centraal.push(c, Buffer.from(n));
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centraal);
  const eind = Buffer.alloc(22); eind.writeUInt32LE(0x06054b50, 0); eind.writeUInt16LE(Object.keys(bestanden).length, 8); eind.writeUInt16LE(Object.keys(bestanden).length, 10);
  eind.writeUInt32LE(cd.length, 12); eind.writeUInt32LE(offset, 16);
  return Buffer.concat([...delen, cd, eind]);
}

module.exports.maakXlsx = maakXlsx;
