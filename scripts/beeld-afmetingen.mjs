#!/usr/bin/env node
// Leest de afmetingen van alle afbeeldingen in public/beeld en schrijft ze naar
// src/lib/beeldAfmetingen.json. Het component <Beeld> gebruikt die om next/image
// een width en height te geven voor beeld dat niet het hele vlak vult.
//
// Draai dit opnieuw na het toevoegen of vervangen van een bestand in public/beeld:
//   node scripts/beeld-afmetingen.mjs
//
// Zonder afhankelijkheden: leest alleen de kop van PNG, JPEG en WebP.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MAP = join(ROOT, "public", "beeld");
const UIT = join(ROOT, "src", "lib", "beeldAfmetingen.json");

function* bestanden(dir) {
  for (const naam of readdirSync(dir).sort()) {
    const p = join(dir, naam);
    if (statSync(p).isDirectory()) yield* bestanden(p);
    else if ([".png", ".jpg", ".jpeg", ".webp"].includes(extname(naam).toLowerCase())) yield p;
  }
}

function png(b) {
  if (b.toString("ascii", 1, 4) !== "PNG") return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function jpeg(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

function webp(b) {
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (chunk === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  return null;
}

const uit = {};
for (const p of bestanden(MAP)) {
  const b = readFileSync(p);
  const dims = png(b) || jpeg(b) || webp(b);
  const pad = "/" + relative(join(ROOT, "public"), p).split("\\").join("/");
  if (!dims) { console.warn("Onbekend formaat, overgeslagen:", pad); continue; }
  uit[pad] = dims;
}
writeFileSync(UIT, JSON.stringify(uit, null, 2) + "\n");
console.log(`${Object.keys(uit).length} afbeeldingen → ${relative(ROOT, UIT)}`);
