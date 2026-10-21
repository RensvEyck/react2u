import { describe, expect, it } from "vitest";
import { alleenPunten, baseSalaryLd, kenmerkInTaal, salarisKort, salarisRest, splitsVragen } from "./vacatures";

describe("salarisRest", () => {
  it("geeft de tekst na de bedragen", () => {
    expect(salarisRest("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "nl")).toBe("bruto per maand bij 40 uur");
    expect(salarisRest("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "en")).toBe("gross per month based on 40 hours");
    expect(salarisRest("€ 130 tot € 175 per uur excl. btw", "nl")).toBe("per uur excl. btw");
  });
});

describe("alleenPunten", () => {
  it("geeft de punten alleen als alles een opsomming is", () => {
    expect(alleenPunten("- Een\n- **Twee**\n\n- Drie")).toEqual(["Een", "Twee", "Drie"]);
    expect(alleenPunten("Inleiding\n\n- Een")).toBeNull();
    expect(alleenPunten("")).toBeNull();
  });
});

describe("splitsVragen", () => {
  it("splitst op de vetgedrukte regel", () => {
    expect(splitsVragen("- Diploma\n- Ervaring\n\n**Mooi meegenomen:**\n\n- Rijbewijs B")).toEqual({ eisen: "- Diploma\n- Ervaring", extraKop: "Mooi meegenomen", extra: "- Rijbewijs B" });
    expect(splitsVragen("- Diploma\n- Ervaring")).toBeNull();
    expect(splitsVragen("**Nice to have:**\n- Rijbewijs")).toBeNull();
  });
});

describe("kenmerkInTaal", () => {
  it("laat de Nederlandse tekst ongemoeid", () => {
    expect(kenmerkInTaal("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "nl")).toBe("€ 3.600 tot € 4.800 bruto per maand bij 40 uur");
  });

  it("vertaalt salarissen en tarieven naar het Engels", () => {
    expect(kenmerkInTaal("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "en")).toBe("€3,600 to €4,800 gross per month based on 40 hours");
    expect(kenmerkInTaal("€ 130 tot € 175 per uur excl. btw", "en")).toBe("€130 to €175 per hour excl. VAT");
    expect(kenmerkInTaal("€ 400 per maand stagevergoeding", "en")).toBe("€400 per month internship allowance");
    expect(kenmerkInTaal("€ 3.600 tot € 4.600 bruto per maand bij 40 uur, plus bonus", "en")).toBe("€3,600 to €4,600 gross per month based on 40 hours, plus bonus");
  });

  it("vertaalt uren zoals voorheen", () => {
    expect(kenmerkInTaal("32-40 uur", "en")).toBe("32-40 hours");
    expect(kenmerkInTaal("€3.500 p/m", "en")).toBe("€3,500 per month");
  });
});

describe("salarisKort", () => {
  it("splitst bedrag en eenheid", () => {
    expect(salarisKort("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "nl")).toEqual({ bedrag: "€ 3.600 tot € 4.800", eenheid: "per maand" });
    expect(salarisKort("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "en")).toEqual({ bedrag: "€3,600 to €4,800", eenheid: "per month" });
    expect(salarisKort("€ 130 tot € 175 per uur excl. btw", "nl")).toEqual({ bedrag: "€ 130 tot € 175", eenheid: "per uur, excl. btw" });
    expect(salarisKort("€ 400 per maand stagevergoeding", "nl")).toEqual({ bedrag: "€ 400", eenheid: "per maand" });
    expect(salarisKort("€ 3.600 tot € 4.600 bruto per maand bij 40 uur, plus bonus", "nl")).toEqual({ bedrag: "€ 3.600 tot € 4.600", eenheid: "per maand, plus bonus" });
  });

  it("geeft null zonder herkenbaar bedrag", () => {
    expect(salarisKort("Marktconform", "nl")).toBeNull();
    expect(salarisKort(null, "nl")).toBeNull();
  });
});

describe("baseSalaryLd", () => {
  it("leest bedragen en eenheid uit de Nederlandse tekst", () => {
    expect(baseSalaryLd("€ 3.600 tot € 4.800 bruto per maand bij 40 uur")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "MONTH", minValue: 3600, maxValue: 4800 });
    expect(baseSalaryLd("€ 130 tot € 175 per uur excl. btw")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "HOUR", minValue: 130, maxValue: 175 });
    expect(baseSalaryLd("€ 400 per maand stagevergoeding")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "MONTH", value: 400 });
  });
});
