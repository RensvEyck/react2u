import { describe, expect, it } from "vitest";
import { mayIdentify, normalizeTracking } from "./tracking";

describe("bedrijfsherkenning: grondslag", () => {
  it("valt terug op toestemming", () => {
    expect(normalizeTracking(null).bedrijfsherkenning).toBe("toestemming");
    expect(normalizeTracking({ bedrijfsherkenning: "iets" }).bedrijfsherkenning).toBe("toestemming");
    expect(normalizeTracking({ bedrijfsherkenning: "altijd" }).bedrijfsherkenning).toBe("altijd");
  });

  it("bij toestemming: alleen met een uitdrukkelijk ja", () => {
    const s = normalizeTracking({});
    expect(mayIdentify(s, true)).toBe(true);
    expect(mayIdentify(s, false)).toBe(false);
    expect(mayIdentify(s, null)).toBe(false);
    expect(mayIdentify(s, undefined)).toBe(false);
  });

  it("bij gerechtvaardigd belang: tenzij bezwaar", () => {
    const s = normalizeTracking({ bedrijfsherkenning: "altijd" });
    expect(mayIdentify(s, true)).toBe(true);
    expect(mayIdentify(s, null)).toBe(true);
    expect(mayIdentify(s, false)).toBe(false);
  });
});
