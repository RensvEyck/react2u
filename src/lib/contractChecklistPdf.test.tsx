import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

const { contractChecklistPdf } = await import("./contractChecklistPdf");
const { CONTACT_FALLBACK } = await import("./content");
const { CHECKLIST_VRAGEN, actieSleutel, datumSleutel } = await import("./contractChecklist");

describe("contractChecklistPdf", () => {
  const contract = { nummer: "C2026-0001", bedrijf: "Bakkerij Jansen", opdrachtgever: { naam: "Bakkerij Jansen B.V." } };
  const link = "https://react2u.nl/contract/abc/checklist";

  it("maakt de lege checklist, om te printen of met de hand in te vullen", async () => {
    const pdf = await contractChecklistPdf({ contract, stand: null, contact: CONTACT_FALLBACK, link });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("basiscontract, in te vullen");
    // Leeg heeft elk onderdeel schrijfruimte: dat zijn twee pagina's, niet meer.
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length).toBeLessThanOrEqual(2);
    if (process.env.CHECKLIST_PDF_MAP) writeFileSync(`${process.env.CHECKLIST_PDF_MAP}/checklist-leeg.pdf`, pdf);
  }, 30000);

  it("maakt de ingevulde checklist met alle antwoorden, wie en wanneer", async () => {
    const data: Record<string, string> = { plaats: "Eindhoven", bedrijf: "Bakkerij Jansen B.V.", datum: "2026-11-17", naam: "Marieke Jansen", functie: "directeur" };
    CHECKLIST_VRAGEN.forEach((q, i) => {
      data[actieSleutel(q.id)] = `Antwoord ${i + 1}: ${"een afspraak die best lang kan zijn en over meer regels loopt. ".repeat(2)}`;
      if (i % 2 === 0) data[datumSleutel(q.id)] = `2026-12-${String(i + 1).padStart(2, "0")}`;
    });
    const pdf = await contractChecklistPdf({
      contract, contact: CONTACT_FALLBACK, link,
      stand: { data, door: "Marieke Jansen", ingevuld_at: "2026-11-17T10:00:00Z", bijgewerkt_at: "2026-11-18T09:00:00Z", versie: 2 },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("basiscontract, ingevuld");
    expect(pdf.length).toBeGreaterThan(20_000);
    if (process.env.CHECKLIST_PDF_MAP) writeFileSync(`${process.env.CHECKLIST_PDF_MAP}/checklist-ingevuld.pdf`, pdf);
  }, 30000);
});
