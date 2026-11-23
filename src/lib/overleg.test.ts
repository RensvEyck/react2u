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
    expect(leesMoment(form({ datum: "2026-12-01", tijd: "09:30", locatie: "Kantoor Eindhoven" }))).toEqual({ datum: "2026-12-01", tijd: "09:30", eind: null, locatie: "Kantoor Eindhoven" });
    expect(leesMoment(form({ datum: "1 december", tijd: "9.30" }))).toEqual({ fout: "overleg-moment" });
    expect(leesRitme(form({ elke_weken: "2", weekdag: "2", tijd: "09:30", locatie: "", vaste_punten: "Opening\n\n Rondvraag " }))).toEqual({ elke_weken: 2, weekdag: 2, tijd: "09:30", locatie: null, vaste_punten: ["Opening", "Rondvraag"], duur_minuten: 60 });
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

describe("het format van het team", () => {
  it("geeft tijd van tot en rekent het einde uit het ritme", async () => {
    const { tijdVanTot, eindeVan, overlegDag } = await import("./overleg");
    expect(tijdVanTot({ datum: "2026-11-18T13:15:00Z", einde: "2026-11-18T14:15:00Z" })).toBe("14:15 tot 15:15");
    expect(tijdVanTot({ datum: "2026-11-18T13:15:00Z", einde: null })).toBe("14:15");
    expect(eindeVan("2026-11-18", "14:15", null, 60)).toBe("2026-11-18T14:15:00.000Z");
    expect(eindeVan("2026-11-18", "14:15", "15:30")).toBe("2026-11-18T14:30:00.000Z");
    expect(overlegDag("2026-11-18T13:15:00Z")).toBe("Woensdag 18 november 2026");
  });

  it("leest wie er is en wie notuleert, alleen collega's uit de lijst", async () => {
    const { leesBezetting } = await import("./overleg");
    const collegas = [{ user_id: "11111111-1111-4111-8111-111111111111", email: "a@x.nl", naam: "Fleur" }, { user_id: "22222222-2222-4222-8222-222222222222", email: "b@x.nl", naam: "Jasper" }];
    const f = new FormData();
    f.append("aanwezig", collegas[0].user_id);
    f.append("aanwezig", "33333333-3333-4333-8333-333333333333");
    f.set("extra", "Sanne, Bram");
    f.set("notulist", collegas[0].user_id);
    expect(leesBezetting(f, collegas)).toEqual({ aanwezig: [{ user_id: collegas[0].user_id, naam: "Fleur" }, { user_id: null, naam: "Sanne" }, { user_id: null, naam: "Bram" }], notulist: collegas[0].user_id });
    f.set("notulist", collegas[1].user_id);
    expect(leesBezetting(f, collegas)).toEqual({ fout: "overleg-notulist" });
  });

  it("bouwt de notulen zoals het voorbeeld: check-in per persoon, punten, acties en volgend overleg", async () => {
    const { notulenVan, isBesproken, isDossiers } = await import("./overleg");
    const p = (o: Partial<Agendapunt>): Agendapunt => ({ id: o.titel || "p", overleg_id: "o", titel: "t", toelichting: null, vast: false, door: null, door_email: null, besproken: false, sort: 0, created_at: "2026-11-17T10:00:00Z", notulen: null, doorgeschoven: false, voor_volgend: false, ...o });
    const n = notulenVan(
      { datum: "2026-11-18T13:15:00Z", einde: "2026-11-18T14:15:00Z", locatie: "Kantoor", notulist_naam: "Fleur" },
      [
        p({ titel: "Check in", vast: true, sort: 1 }),
        p({ titel: "Dossiers", vast: true, sort: 2, notulen: "Bij een vraag over een VSO verwijzen we naar een jurist." }),
        p({ titel: "Caseload", doorgeschoven: true, notulen: "Definitieve verdeling in januari." }),
        p({ titel: "Spoor 2 op tijd aanmelden", door_email: "jasper@x.nl" }),
        p({ titel: "Wie doet de aanmeldingen?", voor_volgend: true, door_email: "fleur@x.nl" }),
      ],
      [{ naam: "Jasper", checkin: "Ervaart werkdruk.", sort: 2 }, { naam: "Fleur", checkin: "Gaat goed.", sort: 1 }, { naam: "Sanne", checkin: null, sort: 3 }],
      [{ wat: "Overleg plannen", wie_naam: "Fleur", wanneer: null, gedaan_at: null }, { wat: "Mailen", wie_naam: "Jasper", wanneer: "2026-11-25", gedaan_at: "2026-11-20T10:00:00Z" }],
      (x) => (x.door_email ? x.door_email.split("@")[0] : null),
    );
    expect(n.titel).toBe("CM-overleg 18 november 2026");
    expect(n.gegevens).toEqual({ datum: "Woensdag 18 november 2026", tijd: "14:15 tot 15:15", locatie: "Kantoor", aanwezig: ["Fleur", "Jasper", "Sanne"], notulist: "Fleur" });
    expect(n.structureel).toEqual(["Check in", "Dossiers"]);
    expect(n.uitVorig.map((x) => x.titel)).toEqual(["Caseload"]);
    expect(n.nieuw).toEqual([{ titel: "Spoor 2 op tijd aanmelden", inbrenger: "jasper" }]);
    expect(n.delen.map((d) => d.titel)).toEqual(["Check in", "Dossiers", "Caseload", "Spoor 2 op tijd aanmelden"]);
    expect(n.delen[0]).toMatchObject({ checkin: true, regels: [{ wie: "Fleur", tekst: "Gaat goed." }, { wie: "Jasper", tekst: "Ervaart werkdruk." }] });
    expect(n.delen[1].dossiers).toBe(true);
    expect(n.acties.map((a) => `${a.wat}:${a.door}:${a.status}`)).toEqual(["Overleg plannen:Fleur:Lopend", "Mailen:Jasper:Gedaan"]);
    expect(n.volgend).toEqual([{ titel: "Wie doet de aanmeldingen?", inbrenger: "fleur" }]);
    expect(isBesproken({ besproken: false, notulen: " " })).toBe(false);
    expect(isBesproken({ besproken: false, notulen: "iets" })).toBe(true);
    expect(isDossiers("Dossier")).toBe(true);
  });
});
