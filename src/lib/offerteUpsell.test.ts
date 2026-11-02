import { describe, expect, it } from "vitest";
import { aanbevolenExtras, AANBEVOLEN, AANBEVOLEN_SECTIE, catalogusStandaard } from "./offerteCatalogus";
import { alleSjablonen } from "./offerteSjablonen";
import { berekenTotalen, normaliseerRegels, VORM_KEYS } from "./offertes";

describe("aanbevolen extra's", () => {
  const catalogus = catalogusStandaard();

  it("elke aanbevolen dienst staat met een vaste prijs op de prijslijst", () => {
    for (const vorm of VORM_KEYS) {
      const extras = aanbevolenExtras(vorm, catalogus);
      expect(extras.map((r) => r.naam)).toEqual(AANBEVOLEN[vorm]);
      for (const r of extras) {
        expect(r.prijs).not.toBeNull();
        expect(r).toMatchObject({ soort: "optie", aanbevolen: true, sectie: AANBEVOLEN_SECTIE });
        expect(r.aan).toBeUndefined();
        expect(r.label).toMatch(/^React2u /);
      }
    }
  });

  it("de aansluiting als extra hoort bij Recover en is geen keuze meer", () => {
    const [aansluiting] = aanbevolenExtras("rie", catalogus);
    expect(aansluiting).toMatchObject({ naam: "Verrichtingenbasis", label: "React2u Recover", soort: "optie", eenheid: "medewerker_jaar" });
    // Een optie uit de groep van de aansluitingen: met een tweede aansluiting als module staat er hooguit één aan.
    expect(aansluiting.groep).toBe("Recover-aansluiting");
    expect(aansluiting.punten).toBeUndefined();
  });

  it("slaat over wat al in de offerte staat", () => {
    const extras = aanbevolenExtras("verzuimbegeleiding", catalogus, [{ id: "x", sectie: "Onderdelen", naam: "loopbaanscan", prijs: 2025, eenheid: "traject", soort: "optie" }]);
    expect(extras.map((r) => r.naam)).not.toContain("Loopbaanscan");
  });

  it("een standaardsjabloon heeft ze, uit, zodat het startbedrag niet verandert", () => {
    const s = alleSjablonen(catalogus).find((x) => x.sleutel === "verzuim-keuze")!;
    const extras = s.regels.filter((r) => r.aanbevolen);
    expect(extras.map((r) => r.naam)).toEqual(AANBEVOLEN.verzuimbegeleiding);
    const zonder = s.regels.filter((r) => !r.aanbevolen);
    expect(berekenTotalen(s.regels, [], 42).perMaand).toBe(berekenTotalen(zonder, [], 42).perMaand);
  });

  it("aanzetten telt mee: loopbaanscan eenmalig, salarisadministratie per maand", () => {
    const s = alleSjablonen(catalogus).find((x) => x.sleutel === "verzuim-keuze")!;
    const scan = s.regels.find((r) => r.naam === "Loopbaanscan")!;
    const salaris = s.regels.find((r) => r.naam === "Salarisadministratie, maandverloning")!;
    const t = berekenTotalen(s.regels, [scan.id, salaris.id], 42);
    expect(t.eenmalig).toBe(2025);
    expect(t.perMaand).toBe(441);
  });

  it("de markering blijft bij opslaan bewaard, alleen bij een optie", () => {
    const [r] = normaliseerRegels([{ naam: "Coaching", prijs: 1975, eenheid: "traject", soort: "optie", aanbevolen: true }]);
    expect(r.aanbevolen).toBe(true);
    const [v] = normaliseerRegels([{ naam: "Intake", prijs: 495, eenheid: "eenmalig", soort: "vast", aanbevolen: true }]);
    expect(v.aanbevolen).toBeUndefined();
  });
});
