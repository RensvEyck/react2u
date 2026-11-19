import { describe, expect, it } from "vitest";
import { INKT, inkt } from "./kleur";

/** Contrastverhouding volgens WCAG 2.x. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hoog, laag] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hoog + 0.05) / (laag + 0.05);
}

describe("inkt", () => {
  it("geeft elke tekstkleur minstens 4,5:1 op wit en 4,4:1 op het ivoren vlak", () => {
    for (const [merk, tekst] of Object.entries(INKT)) {
      expect(contrast(tekst, "#ffffff"), `${merk} → ${tekst} op wit`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tekst, "#f6f2ec"), `${merk} → ${tekst} op ivoor`).toBeGreaterThanOrEqual(4.4);
      // En de merkkleur zelf haalde het niet; anders hoort hij hier niet in.
      expect(contrast(merk, "#ffffff"), `${merk} op wit`).toBeLessThan(4.5);
    }
  });

  it("laat hoofdletters, indigo en een eigen kleur ongemoeid", () => {
    expect(inkt("#E61674")).toBe("#D4136A");
    expect(inkt("#e61674")).toBe("#D4136A");
    expect(inkt("#322E83")).toBe("#322E83");
    expect(inkt("#CA152A")).toBe("#CA152A");
    expect(inkt(undefined)).toBe("#322E83");
    expect(inkt("", "#000000")).toBe("#000000");
  });
});
