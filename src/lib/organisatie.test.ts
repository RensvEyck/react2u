import { describe, expect, it } from "vitest";
import { KVK, ORGANISATIE_ID, organisatieGraphLd, organisatieLd, organisatieRef, webSiteLd } from "./organisatie";

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
});
