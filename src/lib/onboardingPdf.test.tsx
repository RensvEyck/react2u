import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

const { onboardingPdf } = await import("./onboardingPdf");
const { CONTACT_FALLBACK } = await import("./content");
const { DOCUMENT_SLEUTELS } = await import("./onboarding");

describe("onboardingPdf", () => {
  for (const document of DOCUMENT_SLEUTELS.filter((d) => d !== "werknemers")) {
    it(`maakt de pdf voor ${document}, leeg en ingevuld`, async () => {
      for (const ingevuld of [false, true]) {
        const pdf = await onboardingPdf({
          document,
          bedrijf: "Transportbedrijf Vermeulen B.V.",
          nummer: "O2026-0001",
          contact: CONTACT_FALLBACK,
          antwoord: ingevuld
            ? {
              at: "2026-11-16T10:00:00Z",
              door: "Karin Vermeulen",
              data: { bedrijfsnaam: "Transportbedrijf Vermeulen B.V.", kvk: "12345678", factuur_straat: "Havenweg 12", factuur_postcode: "5611 AB", factuur_plaats: "Eindhoven", factuur_email: "facturen@vermeulen.nl", contact_naam: "Karin Vermeulen", contact_email: "karin@vermeulen.nl", arbodienst: "ArboNed", plaats: "Utrecht", bedrijfsarts: "J. de Vries" },
            }
            : undefined,
          intern: ingevuld ? { contractsoort: "Abonnement Recover", debiteurnummer: "D1042" } : undefined,
        });
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        if (process.env.ONBOARDING_PDF_MAP) writeFileSync(`${process.env.ONBOARDING_PDF_MAP}/${document}${ingevuld ? "-ingevuld" : ""}.pdf`, pdf);
      }
    }, 30000);
  }
});
