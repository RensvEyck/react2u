import { describe, expect, it } from "vitest";
import { kern, periodeVan, perMaand, perVerkoper, perVorm, pijplijn, trechter, type VerkoopOfferte } from "./verkoop";
import type { BrochureRij } from "./opvolgen";
import type { Regel } from "./offertes";

const NU = new Date("2026-11-04T10:00:00Z");
const dagenGeleden = (d: number) => new Date(NU.getTime() - d * 86_400_000).toISOString();
// 10 × €120 per jaar = €100 per maand.
const REGELS: Regel[] = [{ id: "a", sectie: "Aansluiting", naam: "Compleet", prijs: 120, eenheid: "medewerker_jaar", soort: "vast" }];

let n = 0;
function offerte(over: Partial<VerkoopOfferte> = {}): VerkoopOfferte {
  n++;
  return {
    id: `o${n}`, nummer: `2026-${String(n).padStart(4, "0")}`, status: "verstuurd", vorm: "verzuimbegeleiding",
    bedrijf: `Bedrijf ${n}`, contactpersoon: null, email: null, telefoon: null, medewerkers: 10, regels: REGELS,
    keuze: null, keuze_at: null, geldig_tot: "2026-12-01", created_at: dagenGeleden(20), verstuurd_at: dagenGeleden(20),
    bekeken_at: null, laatst_bekeken_at: null, aantal_bekeken: 0, getekend_at: null, afzender_naam: "Rens van Eyck", afgewezen_at: null,
    ...over,
  };
}

const sinds90 = "2026-08-06";

describe("kerncijfers", () => {
  it("telt getekend op de datum van tekenen en de hitrate per cohort", () => {
    const k = kern([
      offerte({ status: "getekend", verstuurd_at: dagenGeleden(30), getekend_at: dagenGeleden(20) }),
      offerte({ status: "getekend", verstuurd_at: dagenGeleden(50), getekend_at: dagenGeleden(40), vorm: "rie", regels: [{ id: "r", sectie: "RI&E", naam: "RI&E", prijs: 1450, eenheid: "eenmalig", soort: "vast" }] }),
      offerte({ status: "afgewezen", verstuurd_at: dagenGeleden(40), afgewezen_at: dagenGeleden(30) }),
      offerte({ status: "verstuurd", geldig_tot: "2026-10-01", verstuurd_at: dagenGeleden(60) }), // verlopen
      offerte(), // open
      // Lang geleden getekend: telt niet in deze periode.
      offerte({ status: "getekend", verstuurd_at: dagenGeleden(200), getekend_at: dagenGeleden(190) }),
    ], sinds90, NU);
    expect(k.getekend).toEqual({ aantal: 2, perMaand: 100, eenmalig: 1450 });
    expect(k.hitrate).toEqual({ procent: 50, getekend: 2, afgerond: 4 });
    expect(k.doorlooptijd).toBe(10);
    expect(k.gemiddeld).toBe(100);
    expect(k.verstuurd).toBe(5);
  });

  it("valt terug op 90 dagen bij een onbekende periode", () => {
    expect(periodeVan("365").dagen).toBe(365);
    expect(periodeVan("onzin").dagen).toBe(90);
  });
});

describe("trechter en pijplijn", () => {
  it("volgt brochures naar een offerte voor dezelfde klant", () => {
    const brochures: BrochureRij[] = [
      { id: "b1", nummer: "B1", status: "verstuurd", bedrijf: "Vermeulen Transport", contactpersoon: null, email: "k@vermeulen.nl", telefoon: null, created_at: dagenGeleden(30), verstuurd_at: dagenGeleden(30), bekeken_at: dagenGeleden(29), laatst_bekeken_at: dagenGeleden(29), aantal_bekeken: 1 },
      { id: "b2", nummer: "B2", status: "verstuurd", bedrijf: "Knip", contactpersoon: null, email: null, telefoon: null, created_at: dagenGeleden(10), verstuurd_at: dagenGeleden(10), bekeken_at: null, laatst_bekeken_at: null, aantal_bekeken: 0 },
    ];
    const t = trechter(
      [
        offerte({ bedrijf: "Vermeulen Transport B.V.", created_at: dagenGeleden(25), verstuurd_at: dagenGeleden(25), bekeken_at: dagenGeleden(24), keuze_at: dagenGeleden(24), status: "getekend", getekend_at: dagenGeleden(20) }),
        offerte({ bekeken_at: dagenGeleden(5) }),
        offerte({ status: "concept", verstuurd_at: null }),
      ],
      brochures,
      sinds90
    );
    expect(t.brochures.map((s) => s.aantal)).toEqual([2, 1, 1]);
    expect(t.offertes.map((s) => s.aantal)).toEqual([2, 2, 1, 1]);
  });

  it("verdeelt de open offertes over hoe ver de klant is", () => {
    const f = pijplijn([
      offerte(),
      offerte({ bekeken_at: dagenGeleden(2) }),
      offerte({ bekeken_at: dagenGeleden(2), keuze_at: dagenGeleden(1), medewerkers: 30 }),
      offerte({ geldig_tot: "2026-10-01" }), // verlopen: niet in de pijplijn
    ], NU);
    expect(f.map((x) => [x.key, x.aantal, x.perMaand])).toEqual([["niet-geopend", 1, 100], ["bekeken", 1, 100], ["gekozen", 1, 300]]);
  });
});

describe("per maand, soort en verkoper", () => {
  it("telt per maand verstuurd en getekend", () => {
    const m = perMaand([
      offerte({ verstuurd_at: "2026-10-03T10:00:00Z", status: "getekend", getekend_at: "2026-11-02T10:00:00Z" }),
      offerte({ verstuurd_at: "2026-11-01T10:00:00Z" }),
    ], ["2026-10", "2026-11"], NU);
    expect(m).toEqual([
      { maand: "2026-10", verstuurd: 1, getekend: 0, perMaand: 0, eenmalig: 0 },
      { maand: "2026-11", verstuurd: 1, getekend: 1, perMaand: 100, eenmalig: 0 },
    ]);
  });

  it("groepeert per soort en per verkoper, met de meeste opbrengst bovenaan", () => {
    const lijst = [
      offerte({ status: "getekend", getekend_at: dagenGeleden(5), afzender_naam: "Susanne Linders" }),
      offerte({ vorm: "reflex", afzender_naam: "Cindy Faro" }),
      offerte({ status: "concept", afzender_naam: "Iemand" }),
    ];
    expect(perVorm(lijst, sinds90, NU).map((g) => [g.label, g.verstuurd, g.getekend, g.perMaand])).toEqual([
      ["Verzuim", 1, 1, 100],
      ["Reflex", 1, 0, 0],
    ]);
    expect(perVerkoper(lijst, sinds90, NU).map((g) => g.label)).toEqual(["Susanne Linders", "Cindy Faro"]);
  });
});
