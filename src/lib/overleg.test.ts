import { describe, expect, it } from "vitest";
import {
  actiesPerPersoon, herinneringVoor, leesActiepunt, leesAgendapunt, leesMoment, leesRitme, nlDelen, nlNaarIso, overlegTitel,
  sorteerAgenda, teLaat, volgendeDatum, wanneerTekst, weekdagVan, type Actiepunt, type Agendapunt,
} from "./overleg";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("tijd in Nederland", () => {
  it("rekent winter- en zomertijd goed om", () => {
    expect(nlNaarIso("2026-12-01", "09:30")).toBe("2026-12-01T08:30:00.000Z");
    expect(nlNaarIso("2026-06-02", "09:30")).toBe("2026-06-02T07:30:00.000Z");
    expect(nlDelen("2026-12-01T08:30:00.000Z")).toEqual({ datum: "2026-12-01", tijd: "09:30" });
    expect(overlegTitel("2026-12-01T08:30:00.000Z")).toBe("Dinsdag 1 december, 09:30");
  });

  it("zegt hoe ver het weg is", () => {
    expect(wanneerTekst("2026-11-23T08:30:00Z", "2026-11-23")).toBe("vandaag");
    expect(wanneerTekst("2026-11-24T08:30:00Z", "2026-11-23")).toBe("morgen");
    expect(wanneerTekst("2026-12-01T08:30:00Z", "2026-11-23")).toBe("over 8 dagen");
    expect(wanneerTekst("2026-11-20T08:30:00Z", "2026-11-23")).toBe("3 dagen geleden");
  });
});

describe("het ritme", () => {
  const ritme = { elke_weken: 2, weekdag: 2, tijd: "09:30:00" };

  it("plant zonder eerder overleg op de eerstvolgende vaste weekdag na vandaag", () => {
    expect(weekdagVan("2026-11-23")).toBe(1);
    expect(volgendeDatum(ritme, "2026-11-23", null)).toEqual({ datum: "2026-11-24", tijd: "09:30" });
    expect(volgendeDatum(ritme, "2026-11-24", null)).toEqual({ datum: "2026-12-01", tijd: "09:30" });
    expect(volgendeDatum({ ...ritme, weekdag: 5 }, "2026-11-27", null).datum).toBe("2026-12-04");
  });

  it("plant na een overleg het aantal weken verder, en nooit in het verleden", () => {
    expect(volgendeDatum(ritme, "2026-11-23", "2026-11-17T08:30:00Z").datum).toBe("2026-12-01");
    expect(volgendeDatum(ritme, "2026-12-15", "2026-11-17T08:30:00Z").datum).toBe("2026-12-29");
    // Ander weekdag in het ritme: dezelfde week, op de nieuwe dag.
    expect(volgendeDatum({ ...ritme, weekdag: 4 }, "2026-11-23", "2026-11-17T08:30:00Z").datum).toBe("2026-12-03");
  });

  it("stuurt de herinnering op de werkdag ervoor", () => {
    expect(herinneringVoor("2026-11-23")).toBe("2026-11-24");
    expect(herinneringVoor("2026-11-27")).toBe("2026-11-30");
  });
});

describe("agenda en actiepunten", () => {
  const punt = (o: Partial<Agendapunt>): Agendapunt => ({ id: "p", overleg_id: "o", titel: "t", toelichting: null, vast: false, door: null, door_email: null, besproken: false, sort: 0, created_at: "2026-11-20T10:00:00Z", ...o });
  const actie = (o: Partial<Actiepunt>): Actiepunt => ({ id: "a", overleg_id: "o", wat: "w", wie: "u1", wie_naam: "Ida", wanneer: null, gedaan_at: null, gedaan_door: null, created_at: "2026-11-20T10:00:00Z", ...o });

  it("zet vaste punten bovenaan, de rest op volgorde van binnenkomst", () => {
    const lijst = sorteerAgenda([
      punt({ id: "eigen2", created_at: "2026-11-21T10:00:00Z" }),
      punt({ id: "vast2", vast: true, sort: 2 }),
      punt({ id: "eigen1" }),
      punt({ id: "vast1", vast: true, sort: 1 }),
    ]);
    expect(lijst.map((p) => p.id)).toEqual(["vast1", "vast2", "eigen1", "eigen2"]);
  });

  it("groepeert actiepunten per persoon, oudste deadline eerst", () => {
    const groepen = actiesPerPersoon([
      actie({ id: "1", wie: "u2", wie_naam: "Nadja", wanneer: "2026-12-10" }),
      actie({ id: "2", wanneer: null }),
      actie({ id: "3", wanneer: "2026-11-30" }),
    ]);
    expect(groepen.map((g) => `${g.naam}:${g.acties.map((a) => a.id).join("")}`)).toEqual(["Ida:32", "Nadja:1"]);
    expect(teLaat(actie({ wanneer: "2026-11-20" }), "2026-11-23")).toBe(true);
    expect(teLaat(actie({ wanneer: "2026-11-20", gedaan_at: "2026-11-21T10:00:00Z" }), "2026-11-23")).toBe(false);
  });

  it("leest de formulieren en noemt wat ontbreekt", () => {
    expect(leesAgendapunt(form({ titel: " Werkverdeling na nieuwe klant ", toelichting: "" }))).toEqual({ titel: "Werkverdeling na nieuwe klant", toelichting: null });
    expect(leesAgendapunt(form({ titel: "" }))).toEqual({ fout: "overleg-titel" });
    expect(leesActiepunt(form({ wat: "Klant bellen over de evaluatie", wie: "11111111-2222-4333-8444-555555555555", wanneer: "2026-12-04" }))).toEqual({ wat: "Klant bellen over de evaluatie", wie: "11111111-2222-4333-8444-555555555555", wanneer: "2026-12-04" });
    expect(leesActiepunt(form({ wat: "x", wie: "niemand" }))).toEqual({ fout: "overleg-actie" });
    expect(leesMoment(form({ datum: "2026-12-01", tijd: "09:30", locatie: "Kantoor Eindhoven" }))).toEqual({ datum: "2026-12-01", tijd: "09:30", locatie: "Kantoor Eindhoven" });
    expect(leesMoment(form({ datum: "1 december", tijd: "9.30" }))).toEqual({ fout: "overleg-moment" });
    expect(leesRitme(form({ elke_weken: "2", weekdag: "2", tijd: "09:30", locatie: "", vaste_punten: "Opening\n\n Rondvraag " }))).toEqual({ elke_weken: 2, weekdag: 2, tijd: "09:30", locatie: null, vaste_punten: ["Opening", "Rondvraag"] });
    expect(leesRitme(form({ elke_weken: "0", weekdag: "2", tijd: "09:30" }))).toEqual({ fout: "overleg-ritme" });
  });
});

describe("de herinnering", () => {
  it("zegt wanneer, waar, de agenda en de eigen actiepunten", async () => {
    const { overlegHerinnering } = await import("./overleg");
    const h = overlegHerinnering("Noor", { datum: "2026-11-24T08:30:00Z", locatie: "Kantoor Eindhoven" }, ["Opening", "Verdeling"], [{ wat: "Klant bellen", wanneer: "2026-11-30" }], "2026-11-23");
    expect(h.onderwerp).toBe("CM-overleg morgen om 09:30");
    expect(h.intro).toBe("Morgen om 09:30 is het CM-overleg, Kantoor Eindhoven. Wil je nog iets bespreken? Breng het vandaag nog in.");
    expect(h.agenda).toEqual(["Opening", "Verdeling"]);
    expect(h.acties).toEqual(["Klant bellen (af op 30-11-2026)"]);
    // Op vrijdag voor maandag.
    expect(overlegHerinnering(null, { datum: "2026-11-30T08:30:00Z", locatie: null }, [], [], "2026-11-27").onderwerp).toBe("CM-overleg maandag om 09:30");
  });
});
