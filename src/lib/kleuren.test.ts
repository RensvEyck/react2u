import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BIJTEKST, ROZE, ROZE_DONKER } from "./kleuren";

/** Contrastverhouding volgens WCAG 2.x. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const token = (naam: string) => css.match(new RegExp(`--color-${naam}:\\s*(#[0-9a-f]{6})`, "i"))?.[1].toLowerCase();

describe("kleuren", () => {
  it("staan gelijk aan de tokens in globals.css", () => {
    expect(token("accent")).toBe(ROZE);
    expect(token("accent-deep")).toBe(ROZE_DONKER);
    expect(token("bijtekst")).toBe(BIJTEKST);
  });

  // De lichtste vlakken waar tekst in deze kleuren op staat.
  const vlakken = ["#ffffff", "#f8f5f1", "#f6f5fb", "#f3f1fa", "#f6f2ec", "#fafafd"];

  it("roze haalt 4,5:1 met witte tekst en als tekst op lichte vlakken", () => {
    expect(contrast(ROZE, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ROZE_DONKER, "#ffffff")).toBeGreaterThan(contrast(ROZE, "#ffffff"));
    for (const v of vlakken) expect(contrast(ROZE, v), v).toBeGreaterThanOrEqual(4.5);
  });

  it("bijtekst haalt 4,5:1 op lichte vlakken", () => {
    for (const v of vlakken) expect(contrast(BIJTEKST, v), v).toBeGreaterThanOrEqual(4.5);
  });
});
