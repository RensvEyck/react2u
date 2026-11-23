import { describe, expect, it } from "vitest";
import { concept, conceptEn, MIGRATIE_RESERVE, reserveActief, reserveConcept, reserveSlugs } from "./concept";
import { GIDSEN } from "./gidsen";

describe("reserve-inhoud", () => {
  it("staat buiten een migratiefase uit: een verborgen pagina komt niet via het concept terug", () => {
    // De SiteJob-scan van 6 oktober 2026: /contact was verborgen in de database
    // en stond toch openbaar, indexeerbaar en in sitemap.xml, via dit bestand.
    expect(reserveActief).toBe(false);
    expect(reserveConcept("contact")).toBeNull();
    // Alleen de pagina's in een migratiefase (MIGRATIE_RESERVE) zijn reserve; nooit een bestaande pagina.
    expect(reserveSlugs()).toEqual(MIGRATIE_RESERVE);
    expect(MIGRATIE_RESERVE).not.toContain("contact");
  });

  it("houdt de nieuwe gidsen bereikbaar tot de SQL gedraaid is (migratie 0060)", () => {
    // De 301 van /blog/wet-verbetering-poortwachter-stappen mag niet op een 404 uitkomen.
    for (const g of GIDSEN) {
      expect(MIGRATIE_RESERVE).toContain(g.slug);
      expect(reserveConcept(g.slug)?.slug).toBe(g.slug);
    }
  });

  it("laat de concepten zelf met rust: lokaal (zonder VERCEL_ENV=preview) zijn ze uit, Engels is er altijd", () => {
    expect(concept("contact")).toBeNull();
    expect(conceptEn("contact")?.slug).toBe("contact");
  });
});
