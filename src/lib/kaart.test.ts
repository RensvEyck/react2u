import { describe, expect, it } from "vitest";
import { casemanagersVan, CM_KLEUREN, KAART, kaartStand, OVERIG_KLEUR, plaatsSleutel, plekVan, straal, ZONDER_KLEUR, type KaartKlant } from "./kaart";

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
    klant({ bedrijf: "Bakkerij", casemanager: "Fleur", medewerkers: 12, postcode: "5611AB" }),
    klant({ bedrijf: "Garage", casemanager: "Fleur", medewerkers: 30, postcode: "5612" }),
    klant({ bedrijf: "Kapper", casemanager: "Anne", medewerkers: 4, postcode: "5613" }),
    klant({ bedrijf: "Drukkerij", casemanager: "Sanne Bos", medewerkers: 50, plaats: "Tilburg" }),
    klant({ bedrijf: "Zonder plek", casemanager: "Anne", medewerkers: 8 }),
    klant({ bedrijf: "Nog niemand", postcode: "1012" }),
  ];
  const s = kaartStand(klanten);

  it("geeft casemanagers op naam een vaste kleur", () => {
    expect(s.casemanagers.map((c) => `${c.naam}:${c.kleur}`)).toEqual([`Anne:${CM_KLEUREN[0]}`, `Fleur:${CM_KLEUREN[1]}`, `Sanne Bos:${CM_KLEUREN[2]}`]);
  });

  it("telt klanten, werknemers en gemeenten per casemanager, ook wie nog niet op de kaart staat", () => {
    expect(s.casemanagers.map((c) => `${c.naam} ${c.klanten}/${c.werknemers}/${c.gemeenten}/${c.opKaart}`)).toEqual(["Anne 2/12/1/1", "Fleur 2/42/1/2", "Sanne Bos 1/50/1/1"]);
    expect(s.zonderPlek.map((k) => k.bedrijf)).toEqual(["Zonder plek"]);
    expect(s.zonderCm.map((k) => k.bedrijf)).toEqual(["Nog niemand"]);
    expect(s.punten).toHaveLength(5);
    expect(s.punten.find((p) => p.klant.bedrijf === "Nog niemand")?.kleur).toBe(ZONDER_KLEUR);
  });

  it("geeft het werkgebied per gemeente aan wie er de meeste klanten heeft", () => {
    const eindhoven = KAART.gemeenten.findIndex((g) => g.naam === "Eindhoven");
    const tilburg = KAART.gemeenten.findIndex((g) => g.naam === "Tilburg");
    expect(s.casemanagers[s.werkgebied.get(eindhoven)!].naam).toBe("Fleur");
    expect(s.casemanagers[s.werkgebied.get(tilburg)!].naam).toBe("Sanne Bos");
    expect(s.werkgebied.size).toBe(2);
  });

  it("zet klanten op dezelfde postcode naast elkaar", () => {
    const twee = kaartStand([klant({ bedrijf: "A", casemanager: "Anne", postcode: "5611" }), klant({ bedrijf: "B", casemanager: "Anne", postcode: "5611" })]);
    const [a, b] = twee.punten;
    expect(a.x !== b.x || a.y !== b.y).toBe(true);
  });

  it("geeft de vierde casemanager geel en een ruit, een vijfde de kleur voor overige", () => {
    const vijf = kaartStand(["A", "B", "C", "D", "E"].map((n) => klant({ bedrijf: n, casemanager: n, postcode: "5611" })));
    expect(vijf.casemanagers.map((c) => c.kleur)).toEqual([...CM_KLEUREN, OVERIG_KLEUR]);
    expect(vijf.casemanagers.map((c) => c.vorm)).toEqual(["stip", "stip", "stip", "ruit", "stip"]);
    expect(vijf.punten.find((p) => p.klant.bedrijf === "D")?.vorm).toBe("ruit");
  });
});

describe("het team op de kaart (0057)", () => {
  const team = [
    { naam: "Anne de Wit", sort: 1 },
    { naam: "Sanne Bos van Dalen", sort: 2 },
    { naam: "Noor Jansen", sort: 3 },
    { naam: "Fleur Visser", sort: 4 },
  ];
  const klanten = [
    klant({ bedrijf: "Bakkerij", casemanager: "Fleur", postcode: "5611" }),
    klant({ bedrijf: "Drukkerij", casemanager: "Sanne Bos", postcode: "5038" }),
    klant({ bedrijf: "Kapper", casemanager: "anne de wit", postcode: "5613" }),
    klant({ bedrijf: "Haven", casemanager: "Kees", postcode: "3011" }),
  ];
  const s = kaartStand(klanten, team);

  it("zet het hele team in de lijst, in de volgorde van het team, ook wie nog geen klanten heeft", () => {
    expect(s.casemanagers.map((c) => `${c.naam}:${c.klanten}:${c.inTeam}`)).toEqual(["Anne:1:true", "Sanne:1:true", "Noor:0:true", "Fleur:1:true", "Kees:1:false"]);
    expect(s.casemanagers[2].volledig).toBe("Noor Jansen");
  });

  it("koppelt een voornaam of een deel van de naam op de stamkaart aan de collega uit het team", () => {
    expect(s.punten.find((p) => p.klant.bedrijf === "Drukkerij")?.cm).toBe(1);
    expect(s.punten.find((p) => p.klant.bedrijf === "Kapper")?.cm).toBe(0);
    expect(s.punten.find((p) => p.klant.bedrijf === "Bakkerij")?.vorm).toBe("ruit");
  });

  it("koppelt niet op voornaam als twee collega's dezelfde voornaam hebben", () => {
    const { lijst, van } = casemanagersVan([klant({ casemanager: "Fleur" }), klant({ casemanager: "Fleur Visser" })], [{ naam: "Fleur Visser" }, { naam: "Fleur de Boer" }]);
    expect(lijst.map((c) => c.naam)).toEqual(["Fleur de Boer", "Fleur Visser", "Fleur"]);
    expect(van("Fleur Visser")).toBe(1);
    expect(van("Fleur")).toBe(2);
    expect(van(null)).toBe(-1);
  });
});
