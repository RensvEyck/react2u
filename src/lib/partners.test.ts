import { describe, expect, it } from "vitest";
import {
  aanmeldlink, codeVoorstel, euroCent, euroRond, euroTarief, kwartaalLabel, kwartaalOverzicht, kwartaalVan, laatsteKwartalen,
  normaliseerPartnercode, partnerVergoeding, vergoedingInKwartaal, type PartnerKlantRij,
} from "./partners";

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

describe("partnercode", () => {
  it("maakt hoofdletters en haalt tekens weg", () => {
    expect(normaliseerPartnercode(" abc-advies 24 ")).toBe("ABCADVIES24");
    expect(normaliseerPartnercode("ab")).toBeNull();
    expect(normaliseerPartnercode(null)).toBeNull();
    expect(normaliseerPartnercode("x".repeat(21))).toBeNull();
  });

  it("stelt een code voor uit de naam van het kantoor", () => {
    expect(codeVoorstel("Bakker & Zonen Accountants", () => 0)).toBe("BAKKERZONE10");
    expect(codeVoorstel("Één", () => 0.99)).toBe("EEN99");
    expect(codeVoorstel("!!!", () => 0)).toBe("PARTNER10");
  });

  it("maakt de aanmeldlink naar het kennismaakformulier", () => {
    expect(aanmeldlink("https://react2u.nl/", "ABC24")).toBe("https://react2u.nl/kennismaken?partner=ABC24");
  });
});

describe("vergoeding per kwartaal", () => {
  // 12 medewerkers × € 38,50 = € 462 per jaar, € 38,50 per maand
  const klant: PartnerKlantRij = { id: "k", bedrijf: "Bakkerij", medewerkers: 12, tarief: 38.5, start: "2026-11-15", eind: null };
  const pct = { jaarEen: 50, vervolg: 25 };

  it("telt per begonnen maand, vanaf de startmaand", () => {
    // Q4 2026: november en december
    expect(vergoedingInKwartaal(klant, pct, { jaar: 2026, kwartaal: 4 })).toEqual({ bedrag: 38.5, maanden: 2 });
    expect(vergoedingInKwartaal(klant, pct, { jaar: 2026, kwartaal: 3 })).toEqual({ bedrag: 0, maanden: 0 });
  });

  it("gaat na twaalf maanden over op het vervolgpercentage", () => {
    // Q4 2027: oktober (maand 12, nog jaar één), november en december (jaar twee)
    // 19,25 + 9,625 + 9,625
    expect(vergoedingInKwartaal(klant, pct, { jaar: 2027, kwartaal: 4 })).toEqual({ bedrag: 38.5, maanden: 3 });
    expect(vergoedingInKwartaal(klant, pct, { jaar: 2028, kwartaal: 1 })).toEqual({ bedrag: 28.88, maanden: 3 });
  });

  it("stopt na de laatste maand als klant", () => {
    const weg = { ...klant, eind: "2027-02-10" };
    expect(vergoedingInKwartaal(weg, pct, { jaar: 2027, kwartaal: 1 })).toEqual({ bedrag: 38.5, maanden: 2 });
    expect(vergoedingInKwartaal(weg, pct, { jaar: 2027, kwartaal: 2 })).toEqual({ bedrag: 0, maanden: 0 });
  });

  it("telt de klanten van een partner op en laat lege regels weg", () => {
    const later = { ...klant, id: "l", start: "2027-01-01" };
    const o = kwartaalOverzicht([klant, later], pct, { jaar: 2026, kwartaal: 4 });
    expect(o.totaal).toBe(38.5);
    expect(o.regels).toHaveLength(1);
  });

  it("noemt en telt kwartalen terug", () => {
    expect(kwartaalVan(new Date(2026, 9, 21))).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(laatsteKwartalen(3, { jaar: 2026, kwartaal: 1 }).map(kwartaalLabel)).toEqual(["Q1 2026", "Q4 2025", "Q3 2025"]);
    expect(euroCent(1604.166)).toBe("€ 1.604,17");
  });
});
