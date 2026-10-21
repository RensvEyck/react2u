import { describe, expect, it } from "vitest";
import {
  AANTAL_GEMEENTEN, AANTAL_PROVINCIES, KERNGEMEENTEN, geindexeerdePlaatsen, isGeindexeerd, kernProvincies, plaatsVoorSlug,
  slugVan, werkgebiedPaden,
} from "./gemeenten";
import { slugsMetTekst } from "./plaatsteksten";

describe("geïndexeerde gemeenten", () => {
  it("kerngemeenten bestaan allemaal als gemeente en zijn altijd geïndexeerd", () => {
    // Een tikfout in de lijst zou stil een gemeente uit Google halen.
    for (const slug of KERNGEMEENTEN) {
      expect(plaatsVoorSlug(slug), slug).not.toBeNull();
      expect(isGeindexeerd(slug), slug).toBe(true);
    }
    expect(new Set(KERNGEMEENTEN).size).toBe(KERNGEMEENTEN.length);
    expect(kernProvincies()).toEqual(["Noord-Brabant", "Limburg"]);
  });

  it("elke gemeente met een eigen tekst is geïndexeerd, een gemeente zonder niet", () => {
    for (const slug of slugsMetTekst()) {
      expect(plaatsVoorSlug(slug), `tekst voor onbekende gemeente ${slug}`).not.toBeNull();
      expect(isGeindexeerd(slug)).toBe(true);
    }
    expect(isGeindexeerd("gemeente-die-niet-bestaat")).toBe(false);
    expect(AANTAL_GEMEENTEN - geindexeerdePlaatsen().length).toBeGreaterThanOrEqual(0);
  });

  it("sitemap.xml bevat alle provincies en precies de geïndexeerde gemeenten", () => {
    const paden = werkgebiedPaden();
    expect(paden).toHaveLength(AANTAL_PROVINCIES + geindexeerdePlaatsen().length);
    expect(paden).toContain("/arbodienst-provincie-noord-brabant");
    expect(paden).toContain("/arbodienst-eindhoven");
    expect(paden).toContain("/arbodienst-nuenen-ca");
    for (const p of geindexeerdePlaatsen()) expect(paden).toContain(`/arbodienst-${p.slug}`);
    expect(new Set(paden).size).toBe(paden.length);
  });

  it("herkent slugs zoals slugVan ze maakt", () => {
    expect(slugVan("Nuenen c.a.")).toBe("nuenen-ca");
    expect(slugVan("'s-Hertogenbosch")).toBe("s-hertogenbosch");
    expect(isGeindexeerd("nuenen-ca")).toBe(true);
  });
});
