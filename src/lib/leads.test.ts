import { describe, expect, it } from "vitest";
import { pagineer, searchLeads } from "./leads";

const lead = (name: string, extra: Partial<Record<"company" | "email" | "phone" | "source" | "notes", string>> = {}) => ({
  name, company: null, email: null, phone: null, source: null, notes: null, ...extra,
});

describe("bellijst zoeken", () => {
  const leads = [
    lead("Mevr. José Dillesen", { company: "Nederrijn Schoonmaak", phone: "0418-514744", notes: "Contract nog 2 jaar" }),
    lead("Bakker", { company: "Bakker BV", email: "info@bakker.nl", notes: "Vestiging Eindhoven" }),
    lead("Jansen", { company: "Frencken Mechatronics B.V.", phone: "040 250 75 07" }),
  ];

  it("lege zoekvraag geeft alles", () => {
    expect(searchLeads(leads, "  ")).toHaveLength(3);
  });

  it("zoekt zonder op hoofdletters of accenten te letten", () => {
    expect(searchLeads(leads, "jose").map((l) => l.name)).toEqual(["Mevr. José Dillesen"]);
    expect(searchLeads(leads, "JOSÉ").map((l) => l.name)).toEqual(["Mevr. José Dillesen"]);
  });

  it("elk woord moet ergens voorkomen", () => {
    expect(searchLeads(leads, "bakker eindhoven").map((l) => l.name)).toEqual(["Bakker"]);
    expect(searchLeads(leads, "bakker tilburg")).toHaveLength(0);
  });

  it("vindt een telefoonnummer ongeacht spaties en streepjes", () => {
    expect(searchLeads(leads, "0402507507").map((l) => l.name)).toEqual(["Jansen"]);
    expect(searchLeads(leads, "0418514").map((l) => l.name)).toEqual(["Mevr. José Dillesen"]);
    expect(searchLeads(leads, "040-2507").map((l) => l.name)).toEqual(["Jansen"]);
  });
});

describe("bladeren", () => {
  const items = Array.from({ length: 53 }, (_, i) => i + 1);

  it("geeft de gevraagde pagina met rangnummers", () => {
    const p = pagineer(items, 2, 25);
    expect(p).toMatchObject({ pagina: 2, paginas: 3, totaal: 53, van: 26, tot: 50 });
    expect(p.items[0]).toBe(26);
  });

  it("laatste pagina is korter", () => {
    expect(pagineer(items, 3, 25)).toMatchObject({ van: 51, tot: 53 });
  });

  it("valt terug binnen het bereik", () => {
    expect(pagineer(items, 99, 25).pagina).toBe(3);
    expect(pagineer(items, 0, 25).pagina).toBe(1);
    expect(pagineer(items, "abc", 25).pagina).toBe(1);
    expect(pagineer(items, undefined, 25).pagina).toBe(1);
  });

  it("een lege lijst is één lege pagina", () => {
    expect(pagineer([], 1, 25)).toMatchObject({ pagina: 1, paginas: 1, totaal: 0, van: 0, tot: 0, items: [] });
  });
});
