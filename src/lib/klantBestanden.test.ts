import { describe, expect, it } from "vitest";
import { ACCEPT, bestandFout, bestandPad, bestandSoortLabel, bestandType, isBestandSoort, padVanKlant, veiligeNaam } from "./klantBestanden";

const KLANT = "0b6a2f8e-7c9d-4e2a-9f1b-2c3d4e5f6a7b";

describe("eigen bestanden bij een klant (0048)", () => {
  it("laat pdf, Word, Excel en afbeeldingen toe en de rest niet", () => {
    expect(bestandType("contract.pdf")).toBe("application/pdf");
    expect(bestandType("Urenstaat.XLSX")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(bestandType("scan.heic")).toBe("image/heic");
    expect(bestandType("script.exe")).toBeNull();
    expect(bestandType("zonder-extensie")).toBeNull();
    expect(ACCEPT).toContain(".xlsx");
  });

  it("zegt wat er mis is met een bestand", () => {
    expect(bestandFout({ name: "a.txt", size: 10 })).toMatch(/alleen pdf, Word/);
    expect(bestandFout({ name: "a.pdf", size: 21 * 1024 * 1024 })).toMatch(/groter dan 20 MB/);
    expect(bestandFout({ name: "a.pdf", size: 0 })).toMatch(/leeg/);
    expect(bestandFout({ name: "a.pdf", size: 1000 })).toBeNull();
  });

  it("zet het bestand altijd onder de klant", () => {
    const pad = bestandPad(KLANT, "Contract Korenaar (getekend).pdf", 1700000000000);
    expect(pad).toBe(`${KLANT}/1700000000000-Contract-Korenaar-getekend.pdf`);
    expect(padVanKlant(pad, KLANT)).toBe(true);
    expect(padVanKlant(`andere-klant/${pad.split("/")[1]}`, KLANT)).toBe(false);
    expect(padVanKlant(`${KLANT}/../x.pdf`, KLANT)).toBe(false);
    expect(padVanKlant(`${KLANT}/map/x.pdf`, KLANT)).toBe(false);
    expect(veiligeNaam("Ñoño & co.docx")).toBe("Nono-co.docx");
  });

  it("kent drie soorten", () => {
    expect(isBestandSoort("overeenkomst")).toBe(true);
    expect(isBestandSoort("factuur")).toBe(false);
    expect(bestandSoortLabel("correspondentie")).toBe("Correspondentie");
  });
});
