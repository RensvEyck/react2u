import { describe, expect, it } from "vitest";
import { KVK, ORGANISATIE_ID, organisatieGraphLd, organisatieLd, organisatieRef, serviceLd, webSiteLd } from "./organisatie";

describe("organisatie als één knoop", () => {
  it("heeft een vast @id waar de rest naar verwijst", () => {
    expect(ORGANISATIE_ID).toMatch(/\/#organisatie$/);
    expect(organisatieLd()["@id"]).toBe(ORGANISATIE_ID);
    expect(organisatieRef()["@id"]).toBe(ORGANISATIE_ID);
    expect(webSiteLd().publisher).toEqual({ "@id": ORGANISATIE_ID });
  });

  it("noemt KvK, adres en handelsnaam", () => {
    const o = organisatieLd();
    expect(o["@type"]).toContain("LocalBusiness");
    expect(o["@type"]).toContain("Organization");
    expect(o.identifier).toEqual({ "@type": "PropertyValue", propertyID: "KvK", value: KVK });
    expect(o.address.streetAddress).toBe("Stratumsedijk 29");
    expect(o.address.addressLocality).toBe("Eindhoven");
    expect(o.legalName).toBe("React2u II B.V.");
  });

  it("levert voor de homepage één @graph met organisatie en website", () => {
    const g = organisatieGraphLd();
    expect(g["@context"]).toBe("https://schema.org");
    expect(g["@graph"].map((k) => k["@type"])).toEqual([["Organization", "LocalBusiness"], "WebSite"]);
    // Geldig JSON-LD: geen ongedefinieerde waarden die JSON.stringify stil weglaat.
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });

  it("geeft een verwijzing die ook los leesbaar is (naam en logo)", () => {
    const r = organisatieRef();
    expect(r.name).toBe("React2u");
    expect(r.logo["@type"]).toBe("ImageObject");
  });

  it("zet de certificaten uit Instellingen erbij, en OVAL als lidmaatschap", () => {
    const o = organisatieLd([
      { image: "", alt: "SBCA gecertificeerde arbodienst", href: "https://react2u.nl/docs/sbca.pdf" },
      { image: "", alt: "ISO 9001", href: "" },
      { image: "", alt: "Lid van OVAL", href: "https://www.oval.nl" },
    ]);
    expect(o.hasCredential).toEqual([
      { "@type": "EducationalOccupationalCredential", name: "SBCA", credentialCategory: "certification", description: "Gecertificeerde arbodienst", url: "https://react2u.nl/docs/sbca.pdf" },
      { "@type": "EducationalOccupationalCredential", name: "ISO 9001", credentialCategory: "certification", description: "Kwaliteitsmanagement" },
    ]);
    expect(o.memberOf).toEqual([{ "@type": "Organization", name: "OVAL", url: "https://www.oval.nl" }]);
    // Zonder certificaten ontbreken de sleutels, in plaats van een lege lijst.
    expect(organisatieLd()).not.toHaveProperty("hasCredential");
    expect(organisatieLd([])).not.toHaveProperty("memberOf");
  });

  it("beschrijft een dienstpagina als Service van dezelfde organisatie", () => {
    const s = serviceLd("recover", "nl")!;
    expect(s["@type"]).toBe("Service");
    expect(s.name).toBe("Verzuimbegeleiding voor werkgevers");
    expect(s.provider).toEqual({ "@id": ORGANISATIE_ID });
    expect(s.url).toMatch(/\/recover$/);
    expect(serviceLd("recover", "en")!.url).toMatch(/\/en\/services\/recover$/);
    expect(serviceLd("contact", "nl")).toBeNull();
  });
});
