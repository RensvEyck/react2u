import { describe, expect, it } from "vitest";
import { DOC_SOORTEN, DOC_VOLGORDE, dagenTekst, faseVan, staatUit, tellingen, type DocRij } from "./klantdocumenten";

const VANDAAG = "2026-11-19";
const NU = new Date("2026-11-19T12:00:00Z");

function rij(soort: DocRij["soort"], status: string, extra: Partial<DocRij> = {}): DocRij {
  return { soort, id: `${soort}-${status}-${Math.random()}`, bedrijf: "Bakkerij", status, verstuurd_at: null, bekeken_at: null, created_at: "2026-11-01T10:00:00Z", ...extra };
}

describe("klantdocumenten", () => {
  it("heeft vijf soorten in de volgorde van de klantreis, elk met een lijst en een nieuw-pagina", () => {
    expect(DOC_VOLGORDE).toEqual(["brochure", "offerte", "contract", "onboarding", "evaluatie"]);
    for (const s of DOC_VOLGORDE) {
      expect(DOC_SOORTEN[s].lijst).toMatch(/^\/admin\//);
      expect(DOC_SOORTEN[s].nieuw).toBe(`${DOC_SOORTEN[s].lijst}/nieuw`);
      expect(DOC_SOORTEN[s].detail("x")).toBe(`${DOC_SOORTEN[s].lijst}/x`);
    }
  });

  it("bepaalt de fase per status", () => {
    expect(faseVan(rij("offerte", "concept"), VANDAAG)).toBe("concept");
    expect(faseVan(rij("offerte", "verstuurd", { geldig_tot: "2026-12-01" }), VANDAAG)).toBe("uit");
    expect(faseVan(rij("offerte", "verstuurd", { geldig_tot: "2026-11-18" }), VANDAAG)).toBe("weg");
    expect(faseVan(rij("offerte", "getekend"), VANDAAG)).toBe("klaar");
    expect(faseVan(rij("offerte", "afgewezen"), VANDAAG)).toBe("weg");
    expect(faseVan(rij("contract", "ingetrokken"), VANDAAG)).toBe("weg");
    expect(faseVan(rij("onboarding", "afgerond"), VANDAAG)).toBe("klaar");
    expect(faseVan(rij("evaluatie", "ingevuld"), VANDAAG)).toBe("klaar");
    // Een brochure wordt niet getekend: bekeken is klaar.
    expect(faseVan(rij("brochure", "verstuurd"), VANDAAG)).toBe("uit");
    expect(faseVan(rij("brochure", "verstuurd", { bekeken_at: "2026-11-10T09:00:00Z" }), VANDAAG)).toBe("klaar");
    // Een geopende offerte ligt nog steeds bij de klant.
    expect(faseVan(rij("offerte", "verstuurd", { bekeken_at: "2026-11-10T09:00:00Z" }), VANDAAG)).toBe("uit");
  });

  it("telt per soort, ook de soorten zonder documenten", () => {
    const t = tellingen([
      rij("offerte", "concept"), rij("offerte", "verstuurd"), rij("offerte", "getekend"), rij("offerte", "afgewezen"),
      rij("contract", "verstuurd"),
    ], VANDAAG);
    expect(t.offerte).toEqual({ concept: 1, uit: 1, klaar: 1, alle: 4 });
    expect(t.contract).toEqual({ concept: 0, uit: 1, klaar: 0, alle: 1 });
    expect(t.evaluatie).toEqual({ concept: 0, uit: 0, klaar: 0, alle: 0 });
  });

  it("zet wat bij klanten ligt op volgorde: het langst wachtende eerst", () => {
    const lijst = staatUit([
      rij("offerte", "verstuurd", { bedrijf: "Nieuw", verstuurd_at: "2026-11-19T08:00:00Z" }),
      rij("contract", "verstuurd", { bedrijf: "Oud", verstuurd_at: "2026-11-05T08:00:00Z", bekeken_at: "2026-11-06T08:00:00Z" }),
      rij("evaluatie", "ingevuld", { bedrijf: "Klaar" }),
      rij("onboarding", "verstuurd", { bedrijf: "Zonder datum" }),
    ], NU, VANDAAG);
    expect(lijst.map((r) => r.bedrijf)).toEqual(["Zonder datum", "Oud", "Nieuw"]);
    expect(lijst[0].dagen).toBe(18);
    expect(lijst[1]).toMatchObject({ dagen: 14, geopend: true });
    expect(lijst[2]).toMatchObject({ dagen: 0, geopend: false });
  });

  it("schrijft dagen uit", () => {
    expect(dagenTekst(0)).toBe("vandaag");
    expect(dagenTekst(1)).toBe("1 dag");
    expect(dagenTekst(9)).toBe("9 dagen");
  });
});
