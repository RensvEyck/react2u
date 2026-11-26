import { describe, expect, it } from "vitest";
import { concept, conceptEn, MIGRATIE_RESERVE, reserveActief, reserveConcept, reserveSlugs } from "./concept";
import { EERSTE_REEKS, GIDSEN } from "./gidsen";

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

  it("houdt geen gids meer als reserve: 0060 en 0061 staan op productie, alle gidsen komen uit de database", () => {
    // Tussen de merge van PR #115 en migratie 0060 stonden de eerste vijf hier, tussen PR #117 en 0061
    // de tweede reeks, zodat de 301 van een oud blogartikel niet op een 404 uitkwam. Sinds 25 november 2026 leeg.
    expect(MIGRATIE_RESERVE).toEqual([]);
    expect(EERSTE_REEKS.length).toBeLessThan(GIDSEN.length);
    for (const g of GIDSEN) expect(reserveConcept(g.slug)).toBeNull();
  });

  it("laat de concepten zelf met rust: lokaal (zonder VERCEL_ENV=preview) zijn ze uit, Engels is er altijd", () => {
    expect(concept("contact")).toBeNull();
    expect(conceptEn("contact")?.slug).toBe("contact");
  });
});
