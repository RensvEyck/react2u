import { describe, expect, it } from "vitest";
import { BEL_SLEUTEL, noteerBel, openBel, wisBel } from "./belAfloop";

function nep() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("bel-afloop", () => {
  it("vraagt pas na acht seconden, en niet meer na een dag", () => {
    const o = nep();
    noteerBel({ id: "k1", bedrijf: "Bakkerij De Korenaar", naam: "Fatima" }, 1_000_000, o);
    expect(openBel(1_003_000, o)).toBeNull();
    expect(openBel(1_010_000, o)).toEqual({ id: "k1", bedrijf: "Bakkerij De Korenaar", naam: "Fatima", at: 1_000_000 });
    expect(openBel(1_000_000 + 90_000_000, o)).toBeNull();
    wisBel(o);
    expect(openBel(1_010_000, o)).toBeNull();
  });

  it("negeert rommel in de opslag", () => {
    const o = nep();
    o.setItem(BEL_SLEUTEL, "{onzin");
    expect(openBel(Date.now(), o)).toBeNull();
    o.setItem(BEL_SLEUTEL, JSON.stringify({ id: 5 }));
    expect(openBel(Date.now(), o)).toBeNull();
  });

  it("doet niets zonder opslag", () => {
    expect(() => noteerBel({ id: "k1", bedrijf: "X", naam: null }, 1, null)).not.toThrow();
    expect(openBel(1, null)).toBeNull();
  });
});
