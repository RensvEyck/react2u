import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ONDERTEKENAAR, ondertekeningRegel } from "./offerteOndertekenaar";
import { datumLang } from "./offertes";

describe("ondertekening namens React2u", () => {
  it("de bestuurder tekent elke offerte, met zijn handtekening als transparante png in public/beeld", () => {
    expect(ONDERTEKENAAR.naam).toBe("Rens van Eyck");
    expect(ONDERTEKENAAR.functie).toBe("Bestuurder");
    const bestand = path.join(process.cwd(), "public", ONDERTEKENAAR.handtekening);
    expect(fs.existsSync(bestand)).toBe(true);
    const kop = fs.readFileSync(bestand).subarray(0, 8);
    expect(kop.toString("hex")).toBe("89504e470d0a1a0a"); // png
  });

  it("de regel onder de handtekening: naam, functie en de datum van versturen", () => {
    expect(ondertekeningRegel("2026-11-03T10:00:00Z", datumLang)).toBe("Rens van Eyck, Bestuurder, 3 november 2026");
    expect(ondertekeningRegel(null, datumLang)).toBe("Rens van Eyck, Bestuurder");
  });
});
