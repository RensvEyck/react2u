import { describe, expect, it } from "vitest";
import { DESC_MAX, kort, paginaTitel } from "./seo";

describe("paginaTitel", () => {
  it("zet het merk er één keer achter", () => {
    expect(paginaTitel("Casemanager • Vacature")).toBe("Casemanager • Vacature • React2u");
    expect(paginaTitel("Casemanager • React2u")).toBe("Casemanager • React2u");
    expect(paginaTitel("Casemanager | react2u ")).toBe("Casemanager • React2u");
    expect(paginaTitel("Casemanager - React2u")).toBe("Casemanager • React2u");
    expect(paginaTitel("")).toBe("React2u");
  });
});

describe("kort", () => {
  it("laat een korte tekst met rust en normaliseert witruimte", () => {
    expect(kort("  Eén  regel\n tekst ")).toBe("Eén regel tekst");
    expect(kort("")).toBeUndefined();
    expect(kort(null)).toBeUndefined();
  });

  it("kapt op een woordgrens af, binnen de grens", () => {
    const lang = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(" ");
    const k = kort(lang)!;
    expect(k.length).toBeLessThanOrEqual(DESC_MAX);
    expect(k.endsWith("…")).toBe(true);
    // Niet midden in een woord: wat overblijft staat zo, gevolgd door een spatie, in het origineel.
    expect(lang.startsWith(`${k.slice(0, -1)} `)).toBe(true);
    expect(kort(lang, 40)).toBe("woord0 woord1 woord2 woord3 woord4…");
  });
});
