import { describe, expect, it } from "vitest";
import { baseSalaryLd, kenmerkInTaal } from "./vacatures";

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

describe("baseSalaryLd", () => {
  it("leest bedragen en eenheid uit de Nederlandse tekst", () => {
    expect(baseSalaryLd("€ 3.600 tot € 4.800 bruto per maand bij 40 uur")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "MONTH", minValue: 3600, maxValue: 4800 });
    expect(baseSalaryLd("€ 130 tot € 175 per uur excl. btw")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "HOUR", minValue: 130, maxValue: 175 });
    expect(baseSalaryLd("€ 400 per maand stagevergoeding")?.value).toEqual({ "@type": "QuantitativeValue", unitText: "MONTH", value: 400 });
  });
});
