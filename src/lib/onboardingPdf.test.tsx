import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

const { onboardingPdf, machtigingGetekendPdf, overdrachtPdf } = await import("./onboardingPdf");
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

describe("de getekende machtiging en de opdracht tot overdracht (0038)", () => {
  // Een piepklein PNG'tje als handtekening: react-pdf moet een data-URL kunnen tekenen.
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const m = {
    id: "11111111-1111-4111-8111-111111111111", naam: "Mohammed Yilmaz", email: "mo@korenaar.test",
    gegevens: { naam: "Mohammed Yilmaz", adres: "Hoogstraat 12", postcode: "5611 AB", plaats: "Eindhoven", geboortedatum: "1985-07-21", bsn: "111222333", telefoon: "06 12345678" },
    handtekening: png, getekend_at: "2026-11-16T10:00:00Z", getekend_hash: "a".repeat(64), getekend_ip: "10.0.0.1", uitgenodigd_at: "2026-11-15T09:00:00Z", overdracht_at: null,
  };
  const g = { nummer: "O2026-0001", bedrijf: "Bakkerij De Korenaar", contactpersoon: "Fatima El Amrani", email: "fatima@korenaar.test", arbodienst: { arbodienst: "ArboNed", plaats: "Utrecht", bedrijfsarts: "P. de Vries", email: "dossiers@arboned.test" }, machtigingen: [m, { ...m, id: "22222222-2222-4222-8222-222222222222", gegevens: { ...m.gegevens, naam: "Eva Smit" } }] };
  it("maakt de getekende machtiging met handtekening en certificaat", async () => {
    const pdf = await machtigingGetekendPdf(g, m, CONTACT_FALLBACK);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.ONBOARDING_PDF_MAP) writeFileSync(`${process.env.ONBOARDING_PDF_MAP}/machtiging-getekend.pdf`, pdf);
  }, 30000);
  it("maakt de opdracht: de brief en elke machtiging op een eigen pagina", async () => {
    const pdf = await overdrachtPdf(g, CONTACT_FALLBACK);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);
    if (process.env.ONBOARDING_PDF_MAP) writeFileSync(`${process.env.ONBOARDING_PDF_MAP}/opdracht-overdracht.pdf`, pdf);
  }, 30000);
});
