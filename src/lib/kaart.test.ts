import { describe, expect, it } from "vitest";
import { CM_KLEUREN, KAART, kaartStand, OVERIG_KLEUR, plaatsSleutel, plekVan, straal, ZONDER_KLEUR, type KaartKlant } from "./kaart";

const klant = (o: Partial<KaartKlant>): KaartKlant => ({ id: o.bedrijf || "x", bedrijf: "x", status: "klant", casemanager: null, medewerkers: null, postcode: null, plaats: null, ...o });
const gemeente = (i: number | undefined) => (i === undefined ? undefined : KAART.gemeenten[i].naam);

describe("de kaart van Nederland", () => {
  it("heeft alle 342 gemeenten", () => {
    expect(KAART.gemeenten).toHaveLength(342);
    expect(KAART.gemeenten.every((g) => g.d.startsWith("M") && g.x > 0 && g.y > 0 && g.x < KAART.breedte && g.y < KAART.hoogte)).toBe(true);
  });

  it("vindt een klant op de postcode, met of zonder letters en spatie", () => {
    expect(gemeente(plekVan("5611 AB", null)?.gemeente)).toBe("Eindhoven");
    expect(gemeente(plekVan("1012ab", null)?.gemeente)).toBe("Amsterdam");
    expect(gemeente(plekVan("9711", "Ergens anders")?.gemeente)).toBe("Groningen");
    expect(plekVan("5611 AB", null)?.bron).toBe("postcode");
  });

  it("valt zonder postcode terug op de plaats als dat een gemeente is", () => {
    expect(gemeente(plekVan(null, "Den Haag")?.gemeente)).toBe("'s-Gravenhage");
    expect(gemeente(plekVan("", "Den Bosch")?.gemeente)).toBe("'s-Hertogenbosch");
    expect(gemeente(plekVan(null, "middelburg")?.gemeente)).toBe("Middelburg (Z.)");
    expect(plekVan(null, "Tilburg")?.bron).toBe("plaats");
    // Bergen bestaat twee keer: dan is de plaats niet genoeg.
    expect(plekVan(null, "Bergen")).toBeNull();
    expect(plekVan(null, "Atlantis")).toBeNull();
    expect(plekVan("0000", null)).toBeNull();
    expect(plaatsSleutel("Nuenen, Gerwen en Nederwetten")).toBe("nuenen gerwen en nederwetten");
  });

  it("maakt een stip groter bij meer werknemers, binnen grenzen", () => {
    expect(straal(null)).toBe(50);
    expect(straal(4)).toBeLessThan(straal(100));
    expect(straal(100000)).toBe(130);
  });
});

describe("de verdeling per casemanager", () => {
  const klanten = [
    klant({ bedrijf: "Bakkerij", casemanager: "Nadja", medewerkers: 12, postcode: "5611AB" }),
    klant({ bedrijf: "Garage", casemanager: "Nadja", medewerkers: 30, postcode: "5612" }),
    klant({ bedrijf: "Kapper", casemanager: "Ida", medewerkers: 4, postcode: "5613" }),
    klant({ bedrijf: "Drukkerij", casemanager: "Robin Roos", medewerkers: 50, plaats: "Tilburg" }),
    klant({ bedrijf: "Zonder plek", casemanager: "Ida", medewerkers: 8 }),
    klant({ bedrijf: "Nog niemand", postcode: "1012" }),
  ];
  const s = kaartStand(klanten);

  it("geeft casemanagers op naam een vaste kleur", () => {
    expect(s.casemanagers.map((c) => `${c.naam}:${c.kleur}`)).toEqual([`Ida:${CM_KLEUREN[0]}`, `Nadja:${CM_KLEUREN[1]}`, `Robin Roos:${CM_KLEUREN[2]}`]);
  });

  it("telt klanten, werknemers en gemeenten per casemanager, ook wie nog niet op de kaart staat", () => {
    expect(s.casemanagers.map((c) => `${c.naam} ${c.klanten}/${c.werknemers}/${c.gemeenten}/${c.opKaart}`)).toEqual(["Ida 2/12/1/1", "Nadja 2/42/1/2", "Robin Roos 1/50/1/1"]);
    expect(s.zonderPlek.map((k) => k.bedrijf)).toEqual(["Zonder plek"]);
    expect(s.zonderCm.map((k) => k.bedrijf)).toEqual(["Nog niemand"]);
    expect(s.punten).toHaveLength(5);
    expect(s.punten.find((p) => p.klant.bedrijf === "Nog niemand")?.kleur).toBe(ZONDER_KLEUR);
  });

  it("geeft het werkgebied per gemeente aan wie er de meeste klanten heeft", () => {
    const eindhoven = KAART.gemeenten.findIndex((g) => g.naam === "Eindhoven");
    const tilburg = KAART.gemeenten.findIndex((g) => g.naam === "Tilburg");
    expect(s.casemanagers[s.werkgebied.get(eindhoven)!].naam).toBe("Nadja");
    expect(s.casemanagers[s.werkgebied.get(tilburg)!].naam).toBe("Robin Roos");
    expect(s.werkgebied.size).toBe(2);
  });

  it("zet klanten op dezelfde postcode naast elkaar", () => {
    const twee = kaartStand([klant({ bedrijf: "A", casemanager: "Ida", postcode: "5611" }), klant({ bedrijf: "B", casemanager: "Ida", postcode: "5611" })]);
    const [a, b] = twee.punten;
    expect(a.x !== b.x || a.y !== b.y).toBe(true);
  });

  it("geeft een vierde casemanager de kleur voor overige", () => {
    const vier = kaartStand(["A", "B", "C", "D"].map((n) => klant({ bedrijf: n, casemanager: n, postcode: "5611" })));
    expect(vier.casemanagers.map((c) => c.kleur)).toEqual([...CM_KLEUREN, OVERIG_KLEUR]);
  });
});
