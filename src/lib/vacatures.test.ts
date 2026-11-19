import { describe, expect, it } from "vitest";
import { ORGANISATIE_ID } from "./organisatie";
import type { Vacancy } from "./types";
import { GELDIG_DAGEN, baseSalaryLd, geldigTot, jobPostingLd, kenmerkInTaal, salarisKort, salarisRest, splitsVragen } from "./vacatures";

const vacature = (extra: Partial<Vacancy> = {}): Vacancy => ({
  id: "v1", slug: "casemanager", title: "Casemanager verzuim", location: "Eindhoven", employment_type: "FULL_TIME",
  hours: "32-40 uur", salary: "€ 3.600 tot € 4.800 bruto per maand bij 40 uur", intro: "Je begeleidt verzuim.", description_md: "Tekst.",
  status: "published", published_at: "2026-10-21T10:00:00+00:00", valid_through: null, seo_title: null, seo_description: null,
  created_at: "2026-10-01T09:00:00+00:00", updated_at: "2026-10-21T10:00:00+00:00", ...extra,
});

describe("geldigTot", () => {
  it("neemt de einddatum uit de admin als die er is", () => {
    expect(geldigTot(vacature({ valid_through: "2027-03-01" }))).toBe("2027-03-01");
  });

  it(`geeft zonder einddatum ${GELDIG_DAGEN} dagen na de laatste wijziging`, () => {
    expect(geldigTot(vacature())).toBe("2027-01-19");
    // Een latere bewerking verlengt de termijn; een latere publicatiedatum telt ook.
    expect(geldigTot(vacature({ updated_at: "2026-11-19T08:00:00+00:00" }))).toBe("2027-02-17");
    expect(geldigTot(vacature({ updated_at: "2026-10-01T08:00:00+00:00", published_at: "2026-11-01T08:00:00+00:00" }))).toBe("2027-01-30");
  });
});

describe("jobPostingLd", () => {
  it("heeft altijd een validThrough en wijst naar de organisatie van de homepage", () => {
    const ld = jobPostingLd(vacature(), "nl");
    expect(ld.validThrough).toBe("2027-01-19");
    expect(ld.datePosted).toBe("2026-10-21T10:00:00+00:00");
    expect(ld.hiringOrganization["@id"]).toBe(ORGANISATIE_ID);
    expect(ld.hiringOrganization.name).toBe("React2u");
    expect(ld.jobLocation.address.addressLocality).toBe("Eindhoven");
    expect(ld.baseSalary?.value).toMatchObject({ minValue: 3600, maxValue: 4800 });
    // Geldig JSON-LD zonder ongedefinieerde waarden.
    expect(JSON.parse(JSON.stringify(ld))).toEqual(ld);
  });
});

describe("salarisRest", () => {
  it("geeft de tekst na de bedragen", () => {
    expect(salarisRest("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "nl")).toBe("bruto per maand bij 40 uur");
    expect(salarisRest("€ 3.600 tot € 4.800 bruto per maand bij 40 uur", "en")).toBe("gross per month based on 40 hours");
    expect(salarisRest("€ 130 tot € 175 per uur excl. btw", "nl")).toBe("per uur excl. btw");
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
