import { describe, expect, it } from "vitest";
import { concept, conceptEn, reserveActief, reserveConcept, reserveSlugs } from "./concept";

describe("reserve-inhoud", () => {
  it("staat buiten een migratiefase uit: een verborgen pagina komt niet via het concept terug", () => {
    // De SiteJob-scan van 6 oktober 2026: /contact was verborgen in de database
    // en stond toch openbaar, indexeerbaar en in sitemap.xml, via dit bestand.
    expect(reserveActief).toBe(false);
    expect(reserveConcept("contact")).toBeNull();
    expect(reserveSlugs()).toEqual([]);
  });

  it("laat de concepten zelf met rust: lokaal (zonder VERCEL_ENV=preview) zijn ze uit, Engels is er altijd", () => {
    expect(concept("contact")).toBeNull();
    expect(conceptEn("contact")?.slug).toBe("contact");
  });
});
