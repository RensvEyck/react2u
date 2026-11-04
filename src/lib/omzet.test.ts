import { describe, expect, it } from "vitest";
import { abonnementen, abonnementsbrug, jaarTotNu, maandenTot, maandNaam, maandVan, omzetPerMaand, perKlant, perLabel, type GetekendeOfferte } from "./omzet";
import type { Regel } from "./offertes";

// 10 medewerkers: Recover €120 p.p.p.j. (€100 p/m), Resist-optie €60 p.p.p.j. (€50 p/m), intake €250 eenmalig.
const REGELS: Regel[] = [
  { id: "a", sectie: "Aansluiting", label: "React2u Recover", kleur: "#E61674", naam: "Compleet", prijs: 120, eenheid: "medewerker_jaar", soort: "vast" },
  { id: "b", sectie: "Preventie", label: "React2u Resist", kleur: "#00A098", naam: "RI&E-check", prijs: 60, eenheid: "medewerker_jaar", soort: "optie" },
  { id: "c", sectie: "Start", naam: "Intake", prijs: 250, eenheid: "eenmalig", soort: "vast" },
];

function offerte(over: Partial<GetekendeOfferte> = {}): GetekendeOfferte {
  return {
    id: "o1", nummer: "2026-0001", bedrijf: "Jansen Bouw B.V.", vorm: "verzuimbegeleiding", regels: REGELS,
    keuze: ["a", "b", "c"], medewerkers: 10, status: "getekend", getekend_at: "2026-09-15T10:00:00Z", ...over,
  };
}

describe("maanden", () => {
  it("rekent de maand in Nederlandse tijd", () => {
    // 30 november 23:30 UTC is 1 december 00:30 in Amsterdam.
    expect(maandVan("2026-11-30T23:30:00Z")).toBe("2026-12");
    expect(maandenTot("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(maandNaam("2026-11")).toBe("nov");
    expect(maandNaam("2026-11", true)).toBe("november 2026");
  });
});

describe("abonnementen", () => {
  it("telt de getekende keuze per maand, verdeeld over de labels", () => {
    const [a] = abonnementen([offerte()]);
    expect(a).toMatchObject({ start: "2026-09", stop: null, perMaand: 150, eenmalig: 250 });
    expect(a.labels).toEqual([
      { label: "React2u Recover", kleur: "#E61674", perMaand: 100 },
      { label: "React2u Resist", kleur: "#00A098", perMaand: 50 },
    ]);
  });

  it("laat een optie weg die de klant niet koos, en negeert wat niet getekend is", () => {
    const [a] = abonnementen([offerte({ keuze: ["a", "c"] }), offerte({ id: "o2", status: "verstuurd" })]);
    expect(a.perMaand).toBe(100);
    expect(abonnementen([offerte({ status: "verstuurd" })])).toEqual([]);
  });

  it("stopt in de maand die bij het beëindigen is opgegeven", () => {
    const abos = abonnementen([offerte()], [{ offerte_id: "o1", vanaf: "2026-11-01" }]);
    const reeks = omzetPerMaand(abos, [], [], ["2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(reeks.map((m) => m.abonnementen)).toEqual([0, 150, 150, 0]);
    expect(reeks.map((m) => m.eenmalig)).toEqual([0, 250, 0, 0]);
  });
});

describe("omzet per maand", () => {
  it("telt de uren tegen het uurtarief in de maand van de week", () => {
    const reeks = omzetPerMaand(
      [],
      [{ id: "m1", uurtarief: 95 }, { id: "m2", uurtarief: null }],
      [
        { medewerker_id: "m1", week: "2026-11-02", declarabel: 20, afwezig: 0 },
        { medewerker_id: "m2", week: "2026-11-02", declarabel: 10, afwezig: 0 },
        // Week van 30 november hoort bij december.
        { medewerker_id: "m1", week: "2026-11-30", declarabel: 8, afwezig: 0 },
      ],
      ["2026-11", "2026-12"]
    );
    expect(reeks[0]).toMatchObject({ uren: 1900, urenAantal: 30, totaal: 1900 });
    expect(reeks[1]).toMatchObject({ uren: 760, urenAantal: 8 });
  });

  it("verdeelt per label en per klant, en voegt dezelfde klant samen", () => {
    const abos = abonnementen([
      offerte(),
      offerte({ id: "o2", bedrijf: "Jansen Bouw", regels: [REGELS[0]], keuze: ["a"], medewerkers: 5, getekend_at: "2026-10-02T09:00:00Z" }),
      offerte({ id: "o3", bedrijf: "Smit Installatie", regels: [REGELS[0]], keuze: ["a"], medewerkers: 20 }),
    ]);
    expect(perLabel(abos, "2026-10").map((l) => [l.label, l.perMaand, l.klanten])).toEqual([
      ["React2u Recover", 350, 3],
      ["React2u Resist", 50, 1],
    ]);
    const klanten = perKlant(abos, "2026-10");
    expect(klanten.map((k) => [k.bedrijf, k.perMaand, k.sinds, k.abonnementen.length])).toEqual([
      ["Jansen Bouw B.V.", 200, "2026-09", 2],
      ["Smit Installatie", 200, "2026-09", 1],
    ]);
  });

  it("legt uit hoe het maandbedrag veranderde", () => {
    const abos = abonnementen(
      [offerte(), offerte({ id: "o2", bedrijf: "Smit", getekend_at: "2026-10-05T09:00:00Z", keuze: ["a"] })],
      [{ offerte_id: "o1", vanaf: "2026-10-01" }]
    );
    expect(abonnementsbrug(abos, "2026-10")).toEqual({
      begin: 150, nieuw: { bedrag: 100, aantal: 1 }, gestopt: { bedrag: 150, aantal: 1 }, eind: 100,
    });
  });

  it("vergelijkt het jaar tot nu alleen als vorig jaar compleet in de reeks zit", () => {
    const reeks = maandenTot("2026-03", 15).map((maand) => ({ maand, abonnementen: 0, eenmalig: 0, uren: 0, urenAantal: 0, totaal: 100 }));
    expect(jaarTotNu(reeks, "2026-03")).toEqual({ dit: 300, vorig: 300 });
    expect(jaarTotNu(reeks.slice(-4), "2026-03")).toEqual({ dit: 300, vorig: null });
  });
});
