import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

const { evaluatiePdf } = await import("./evaluatiePdf");
const { CONTACT_FALLBACK } = await import("./content");
const { CHECKLIST_SLEUTELS, schoonAntwoorden } = await import("./evaluatie");

const basis = { nummer: "KE2026-0001", bedrijf: "Bakkerij De Korenaar", contactpersoon: "Fatima El Amrani", email: "fatima@korenaar.test", bezoek_datum: "2026-11-20", bezoek_tijd: "10.00 uur" };

describe("evaluatiePdf", () => {
  it("maakt het lege formulier, om te printen", async () => {
    const pdf = await evaluatiePdf({ e: { ...basis, antwoorden: null, ingevuld_at: null, ingevuld_door: null }, contact: CONTACT_FALLBACK });
    if (process.env.EVALUATIE_PDF_MAP) writeFileSync(`${process.env.EVALUATIE_PDF_MAP}/klantevaluatie-leeg.pdf`, pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Twee pagina's: gegevens en checklist, dan de vrije vakken en de acties.
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  }, 30000);
  it("maakt de ingevulde versie met de antwoorden van de klant", async () => {
    const antwoorden = schoonAntwoorden({
      checklist: {
        ...Object.fromEntries(CHECKLIST_SLEUTELS.map((s) => [s, { antwoord: "ja" }])),
        psa: { antwoord: "nee", toelichting: "We hebben wel een vertrouwenspersoon, maar nog geen beleid op papier." },
        pmo: { antwoord: "nvt" },
        preventiemedewerker: { antwoord: "ja", vragen: { training: "Basiscursus preventiemedewerker in 2024.", interesse: "Ja, een opfriscursus." } },
      },
      evaluatie: "Prettig contact met de casemanager, snelle terugkoppeling.",
      wensen: "Een PMO voor de bakkers en een training voor leidinggevenden.",
      afspraken: "React2u stuurt een voorstel voor het PSA-beleid.",
      volgend_bezoek: { datum: "2027-11-18", tijd: "10.00", tot: "11.30" },
      acties: [{ actie: "PSA-beleid opstellen", door: "React2u", status: "Open" }, { actie: "RI&E actualiseren", door: "Fatima", status: "Gepland Q1" }],
    });
    const pdf = await evaluatiePdf({ e: { ...basis, antwoorden, ingevuld_at: "2026-11-20T10:00:00Z", ingevuld_door: "Fatima El Amrani" }, contact: CONTACT_FALLBACK });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.EVALUATIE_PDF_MAP) writeFileSync(`${process.env.EVALUATIE_PDF_MAP}/klantevaluatie-ingevuld.pdf`, pdf);
  }, 30000);
});
