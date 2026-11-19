import { describe, expect, it } from "vitest";
import { HERKOMST_LABEL, HERKOMST_UITLEG, HERKOMSTEN, herkomstLabel, isHerkomst } from "./herkomst";
import { nl } from "./woordenboek/nl";
import { en } from "./woordenboek/en";

describe("herkomst", () => {
  it("kent alleen de vaste sleutels", () => {
    expect(isHerkomst("google")).toBe(true);
    expect(isHerkomst("anders")).toBe(true);
    expect(isHerkomst("Google")).toBe(false);
    expect(isHerkomst("")).toBe(false);
    expect(isHerkomst(null)).toBe(false);
  });

  it("heeft voor elke sleutel een label, een uitleg en een tekst in beide talen", () => {
    for (const h of HERKOMSTEN) {
      expect(HERKOMST_LABEL[h]).toBeTruthy();
      expect(HERKOMST_UITLEG[h]).toBeTruthy();
      expect(nl.formulier.herkomst.opties[h]).toBeTruthy();
      expect(en.formulier.herkomst.opties[h]).toBeTruthy();
    }
  });

  it("geeft het label, of de ruwe tekst bij iets ouds, en niets bij leeg", () => {
    expect(herkomstLabel("google")).toBe("Google");
    expect(herkomstLabel("beurs 2025")).toBe("beurs 2025");
    expect(herkomstLabel(null)).toBeNull();
    expect(herkomstLabel("")).toBeNull();
  });
});
