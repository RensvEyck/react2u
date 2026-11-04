import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { brochurePdf } = await import("./brochurePdf");
const { CONTACT_FALLBACK } = await import("./content");
const { MERKEN } = await import("./offerteMerk");
const { BROCHURE_DIENSTEN } = await import("./brochures");
const { prijslijstStandaard } = await import("./brochurePrijslijst");
import type { BrochurePubliek } from "./brochures";
import type { Dienst } from "./brochureHuisstijl";

describe("brochurePdf", () => {
  it("maakt een pdf met de omslag en de acht hoofdstukken", async () => {
    const diensten: Dienst[] = BROCHURE_DIENSTEN.map((slug) => ({ ...MERKEN[slug], slug, omschrijving: `Over ${MERKEN[slug].naam}.`, href: `/${slug}` }));
    const brochure: BrochurePubliek = {
      id: "b1", nummer: "B2026-0001", status: "verstuurd", bedrijf: "Transportbedrijf Vermeulen", contactpersoon: "Karin Vermeulen",
      bericht: null, afzender_naam: "Rens van Eyck", afzender_functie: "Eigenaar", afzender_email: "sales@react2u.nl", afzender_telefoon: "085 620 58 00",
      verstuurd_at: "2026-11-02T10:00:00Z", created_at: "2026-11-02T09:00:00Z",
    };
    const prijslijst = prijslijstStandaard({ jaar: "2027", geldigTot: "31 december 2027" });
    const pdf = await brochurePdf({ brochure, diensten, prijslijst, contact: CONTACT_FALLBACK });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Omslag en acht hoofdstukken, met lettertypen, logo's en keurmerken: ruim boven een lege pdf.
    expect(pdf.length).toBeGreaterThan(100_000);
    // Compact (Susanne: "te veel pagina's"): het voorbeeld had er veertien.
    const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
    expect(paginas).toBeGreaterThanOrEqual(8);
    expect(paginas).toBeLessThanOrEqual(11);
    // Zonder contactpersoon en afzender ook: de brochure valt terug op "relatie" en "Team React2u".
    const kaal = await brochurePdf({ brochure: { ...brochure, contactpersoon: null, afzender_naam: null, afzender_functie: null, afzender_telefoon: null, status: "concept", verstuurd_at: null }, diensten, prijslijst, contact: CONTACT_FALLBACK });
    expect(kaal.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
