import { describe, expect, it } from "vitest";
import { euroRond, euroTarief, partnerVergoeding } from "./partners";

describe("partnervergoeding", () => {
  it("rekent het abonnement maal het percentage", () => {
    // 10 klanten × 25 medewerkers × € 135 = € 33.750 per jaar
    const r = partnerVergoeding({ klanten: 10, medewerkers: 25, tarief: 135, pctJaarEen: 15, pctVervolg: 5 });
    expect(r.jaarEen).toBeCloseTo(5062.5);
    expect(r.vervolg).toBeCloseTo(1687.5);
  });

  it("geeft nul bij ontbrekende of rare waarden, nooit NaN", () => {
    expect(partnerVergoeding({ klanten: 0, medewerkers: 25, tarief: 135, pctJaarEen: 15, pctVervolg: 5 }).jaarEen).toBe(0);
    expect(partnerVergoeding({ klanten: 3, medewerkers: NaN, tarief: 135, pctJaarEen: 15, pctVervolg: 5 }).vervolg).toBe(0);
    expect(partnerVergoeding({ klanten: 3, medewerkers: 10, tarief: -1, pctJaarEen: 15, pctVervolg: 5 }).jaarEen).toBe(0);
  });
});

describe("bedragen", () => {
  it("rondt af op hele euro's met een punt per duizendtal", () => {
    expect(euroRond(5062.5)).toBe("€ 5.063");
    expect(euroRond(0)).toBe("€ 0");
  });

  it("toont centen bij een tarief alleen als die er zijn", () => {
    expect(euroTarief(135)).toBe("€ 135");
    expect(euroTarief(139.5)).toBe("€ 139,50");
  });
});
