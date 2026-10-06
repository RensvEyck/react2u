import { describe, expect, it } from "vitest";
import {
  AANTAL_GEMEENTEN, AANTAL_PROVINCIES, GEINDEXEERDE_GEMEENTEN, geindexeerdePlaatsen, isGeindexeerd, plaatsVoorSlug, slugVan,
  werkgebiedPaden,
} from "./gemeenten";

describe("geïndexeerde gemeenten", () => {
  it("bestaan allemaal als gemeente", () => {
    // Een tikfout in de lijst zou stil een gemeente uit Google halen.
    for (const slug of GEINDEXEERDE_GEMEENTEN) expect(plaatsVoorSlug(slug), slug).not.toBeNull();
    expect(geindexeerdePlaatsen()).toHaveLength(GEINDEXEERDE_GEMEENTEN.length);
    expect(new Set(GEINDEXEERDE_GEMEENTEN).size).toBe(GEINDEXEERDE_GEMEENTEN.length);
  });

  it("zijn de enige gemeenten in sitemap.xml, naast alle provincies", () => {
    const paden = werkgebiedPaden();
    expect(paden).toHaveLength(AANTAL_PROVINCIES + GEINDEXEERDE_GEMEENTEN.length);
    expect(paden).toContain("/arbodienst-provincie-noord-brabant");
    expect(paden).toContain("/arbodienst-eindhoven");
    expect(paden).toContain("/arbodienst-nuenen-ca");
    expect(paden).not.toContain("/arbodienst-amsterdam");
    expect(AANTAL_GEMEENTEN).toBeGreaterThan(GEINDEXEERDE_GEMEENTEN.length);
  });

  it("herkent slugs zoals slugVan ze maakt", () => {
    expect(slugVan("Nuenen c.a.")).toBe("nuenen-ca");
    expect(slugVan("'s-Hertogenbosch")).toBe("s-hertogenbosch");
    expect(isGeindexeerd("nuenen-ca")).toBe(true);
    expect(isGeindexeerd("amsterdam")).toBe(false);
  });
});
