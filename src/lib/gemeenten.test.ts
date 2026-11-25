import { describe, expect, it } from "vitest";
import {
  AANTAL_GEMEENTEN, AANTAL_PROVINCIES, KERNGEMEENTEN, WERKGEBIED_BIJGEWERKT, geindexeerdePlaatsen, isGeindexeerd, kernProvincies,
  plaatsVoorSlug, provincieVoorSlug, slugVan, werkgebiedPaden, werkgebiedSlugs,
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

  it("heeft een echte wijzigingsdatum voor sitemap.xml, niet in de toekomst", () => {
    expect(WERKGEBIED_BIJGEWERKT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = new Date(WERKGEBIED_BIJGEWERKT);
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getTime()).toBeLessThanOrEqual(Date.now());
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

describe("werkgebiedpagina's voor de build", () => {
  it("werkgebiedSlugs levert elke provincie en elke gemeente precies één keer, als bestaand adres", () => {
    const slugs = werkgebiedSlugs();
    expect(slugs).toHaveLength(AANTAL_PROVINCIES + AANTAL_GEMEENTEN);
    expect(new Set(slugs).size).toBe(slugs.length);
    // Dezelfde regel als werkgebied() in (site)/[slug]/page.tsx: elke slug
    // moet daar op een provincie of gemeente uitkomen, anders bouwt de build
    // een 404.
    for (const slug of slugs) {
      const bestaat = slug.startsWith("arbodienst-provincie-")
        ? provincieVoorSlug(slug.slice("arbodienst-provincie-".length)) !== null
        : plaatsVoorSlug(slug.slice("arbodienst-".length)) !== null;
      expect(bestaat, slug).toBe(true);
    }
    // sitemap.xml (alle provincies, de geïndexeerde gemeenten) is een deelverzameling.
    for (const pad of werkgebiedPaden()) expect(slugs).toContain(pad.slice(1));
  });
});
