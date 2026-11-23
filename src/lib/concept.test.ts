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

  it("houdt alleen de tweede reeks gidsen als reserve tot migratie 0061 gedraaid is; de eerste reeks komt uit de database", () => {
    // Tussen de merge van PR #115 en migratie 0060 stonden de eerste vijf hier; sinds 0061
    // in de maak is de tweede reeks, zodat de 301 van /blog/loonsanctie-uwv niet op een 404 uitkomt.
    const tweede = GIDSEN.map((g) => g.slug).filter((s) => !EERSTE_REEKS.includes(s));
    expect(MIGRATIE_RESERVE).toEqual(tweede);
    for (const s of EERSTE_REEKS) expect(reserveConcept(s)).toBeNull();
    for (const s of tweede) expect(reserveConcept(s)?.slug).toBe(s);
  });

  it("laat de concepten zelf met rust: lokaal (zonder VERCEL_ENV=preview) zijn ze uit, Engels is er altijd", () => {
    expect(concept("contact")).toBeNull();
    expect(conceptEn("contact")?.slug).toBe("contact");
  });
});
