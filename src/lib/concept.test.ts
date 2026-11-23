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

  it("is leeg sinds migratie 0060 op productie draaide: ook de gidsen komen weer uit de database", () => {
    // Tussen de merge van PR #115 en de SQL stonden de vijf gidsen hier, zodat
    // de 301 van /blog/wet-verbetering-poortwachter-stappen niet op een 404 uitkwam.
    expect(MIGRATIE_RESERVE).toEqual([]);
    for (const g of GIDSEN) expect(reserveConcept(g.slug)).toBeNull();
  });

  it("laat de concepten zelf met rust: lokaal (zonder VERCEL_ENV=preview) zijn ze uit, Engels is er altijd", () => {
    expect(concept("contact")).toBeNull();
    expect(conceptEn("contact")?.slug).toBe("contact");
  });
});
