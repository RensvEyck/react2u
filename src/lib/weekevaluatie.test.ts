import { describe, expect, it } from "vitest";
import {
  cijferTekst, deelname, deelnemers, EXPORT_KOP, exportNaam, exportRijen, gemiddelde, gemiddelden, herinnering, kwartaalLabel, kwartaalSleutel,
  kwartaalVanDatum, kwartaalVanWeek, leesAntwoorden, leesKwartaal, magWijzigen, normaliseerAntwoorden, openWeken, perWeek, plusKwartalen, SCHALEN,
  sluitOp, TEKSTVRAGEN, teltVoor, trend, trendTekst, VRAGEN, weekStand, weekTitel, wekenInKwartaal, wieHerinneren, type Deelnemer, type Evaluatie,
} from "./weekevaluatie";

const ev = (user_id: string, week: string, antwoorden: Evaluatie["antwoorden"] = { cijfer: 7 }): Evaluatie => ({
  id: `${user_id}-${week}`, user_id, week, antwoorden, door: `${user_id}@react2u.test`, created_at: `${week}T10:00:00Z`, updated_at: `${week}T10:00:00Z`,
});

describe("de vragen", () => {
  it("heeft vijf schalen en vijf open vragen, elk met een unieke sleutel", () => {
    expect(SCHALEN.map((s) => s.sleutel)).toEqual(["energie", "werkdruk", "voldoening", "samenwerking", "cijfer"]);
    expect(TEKSTVRAGEN.map((t) => t.sleutel)).toEqual(["goed", "beter", "knelpunt", "nodig", "trots"]);
    expect(new Set(VRAGEN.map((v) => v.sleutel)).size).toBe(VRAGEN.length);
  });

  it("leest het formulier: schalen verplicht van 1 tot 10, tekst bijgeknipt en leeg weggelaten", () => {
    const { antwoorden, fouten } = leesAntwoorden({ energie: "7", werkdruk: "6", voldoening: "8", samenwerking: "9", cijfer: "7", goed: "  Twee gestart.  ", beter: "", trots: "x".repeat(2500) });
    expect(fouten).toEqual([]);
    expect(antwoorden).toMatchObject({ energie: 7, werkdruk: 6, voldoening: 8, samenwerking: 9, cijfer: 7, goed: "Twee gestart." });
    expect(antwoorden.beter).toBeUndefined();
    expect(antwoorden.trots).toHaveLength(2000);
  });

  it("noemt de schalen die ontbreken of onzin zijn", () => {
    const { fouten } = leesAntwoorden({ energie: "11", werkdruk: "0", voldoening: "abc", samenwerking: "7,5", cijfer: "7" });
    expect(fouten).toEqual(["energie", "werkdruk", "voldoening", "samenwerking"]);
  });

  it("houdt uit de database alleen bekende, geldige antwoorden over", () => {
    expect(normaliseerAntwoorden({ energie: 7, werkdruk: 12, cijfer: "8", goed: "Prima", onbekend: "weg", trots: "   " })).toEqual({ energie: 7, goed: "Prima" });
    expect(normaliseerAntwoorden(null)).toEqual({});
  });
});

describe("open en gesloten weken", () => {
  it("laat deze week en vorige week open, tot en met de zondag van de week erna", () => {
    // Woensdag 18 november 2026: week 47 (16 nov) en week 46 (9 nov) staan open.
    expect(openWeken("2026-11-18")).toEqual(["2026-11-09", "2026-11-16"]);
    expect(weekStand("2026-11-16", "2026-11-18")).toBe("open");
    expect(weekStand("2026-11-09", "2026-11-18")).toBe("open");
    expect(weekStand("2026-11-02", "2026-11-18")).toBe("gesloten");
    expect(weekStand("2026-11-23", "2026-11-18")).toBe("toekomst");
    expect(magWijzigen("2026-11-09", "2026-11-22")).toBe(true); // zondag: laatste dag
    expect(magWijzigen("2026-11-09", "2026-11-23")).toBe(false); // maandag erna: dicht
    expect(sluitOp("2026-11-09")).toBe("2026-11-22");
  });

  it("schrijft de titel van een week", () => {
    expect(weekTitel("2026-11-16")).toBe("Week 47 · 16–22 nov");
  });

  it("telt weken van vóór iemands komst niet mee", () => {
    expect(teltVoor("2026-11-09", "2026-11-12")).toBe(true); // de zondag (15 nov) valt na de komst
    expect(teltVoor("2026-11-02", "2026-11-12")).toBe(false);
    expect(teltVoor("2026-11-02", null)).toBe(true);
  });
});

describe("kwartalen", () => {
  it("rekent het kwartaal van een week naar zijn donderdag, ook over de jaargrens", () => {
    expect(kwartaalVanWeek("2026-11-16")).toEqual({ jaar: 2026, kwartaal: 4 });
    // Maandag 28 december 2026: week 53, donderdag 31 december, dus nog Q4 2026, ook op vrijdag 1 januari.
    expect(kwartaalVanWeek("2026-12-28")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(kwartaalVanDatum("2027-01-01")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(kwartaalVanDatum("2027-01-04")).toEqual({ jaar: 2027, kwartaal: 1 });
    // Maandag 30 maart 2026: donderdag 2 april, dus Q2.
    expect(kwartaalVanWeek("2026-03-30")).toEqual({ jaar: 2026, kwartaal: 2 });
  });

  it("geeft de weken van een kwartaal: twaalf tot veertien, naar de donderdag", () => {
    const q4 = wekenInKwartaal({ jaar: 2026, kwartaal: 4 });
    expect(q4[0]).toBe("2026-09-28"); // donderdag 1 oktober
    expect(q4[q4.length - 1]).toBe("2026-12-28"); // donderdag 31 december
    expect(q4).toHaveLength(14);
    const q1 = wekenInKwartaal({ jaar: 2027, kwartaal: 1 });
    expect(q1[0]).toBe("2027-01-04");
    expect(q1[q1.length - 1]).toBe("2027-03-22"); // donderdag 25 maart; de week erna hoort bij Q2
    expect(q1).toHaveLength(12);
    expect(wekenInKwartaal({ jaar: 2026, kwartaal: 2 })[0]).toBe("2026-03-30");
  });

  it("leest en schrijft de sleutel en het label", () => {
    expect(kwartaalSleutel({ jaar: 2026, kwartaal: 4 })).toBe("2026-Q4");
    expect(leesKwartaal("2026-Q4")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(leesKwartaal("2026-Q5")).toBeNull();
    expect(leesKwartaal(undefined)).toBeNull();
    expect(kwartaalLabel({ jaar: 2026, kwartaal: 4 })).toBe("Q4 2026");
    expect(kwartaalLabel({ jaar: 2026, kwartaal: 1 }, true)).toBe("eerste kwartaal 2026");
    expect(plusKwartalen({ jaar: 2026, kwartaal: 4 }, 1)).toEqual({ jaar: 2027, kwartaal: 1 });
    expect(plusKwartalen({ jaar: 2026, kwartaal: 1 }, -1)).toEqual({ jaar: 2025, kwartaal: 4 });
    expect(exportNaam({ jaar: 2026, kwartaal: 4 })).toBe("weekevaluaties-2026-Q4.xlsx");
  });
});

describe("gemiddelden en trends", () => {
  it("middelt op één decimaal en kent laagste en hoogste", () => {
    expect(gemiddelde([7, 8, 6])).toBe(7);
    expect(gemiddelde([7, 8])).toBe(7.5);
    expect(gemiddelde([7, 8, 8])).toBe(7.7);
    expect(gemiddelde([])).toBeNull();
    const g = gemiddelden([ev("a", "2026-11-02", { energie: 6, cijfer: 7 }), ev("a", "2026-11-09", { energie: 8, cijfer: 8 }), ev("a", "2026-11-16", { cijfer: 6 })]);
    expect(g.energie).toEqual({ gem: 7, n: 2, laagste: 6, hoogste: 8 });
    expect(g.cijfer).toEqual({ gem: 7, n: 3, laagste: 6, hoogste: 8 });
    expect(g.werkdruk).toEqual({ gem: null, n: 0, laagste: null, hoogste: null });
  });

  it("schrijft cijfers en trends in het Nederlands", () => {
    expect(cijferTekst(7.4)).toBe("7,4");
    expect(cijferTekst(8)).toBe("8");
    expect(cijferTekst(null)).toBe("–");
    expect(trend(7.4, 7)).toBe(0.4);
    expect(trend(6.8, 7.2)).toBe(-0.4);
    expect(trend(7, null)).toBeNull();
    expect(trendTekst(0.4)).toBe("+0,4");
    expect(trendTekst(-1.2)).toBe("−1,2");
    expect(trendTekst(0)).toBe("±0");
    expect(trendTekst(null)).toBe("");
  });

  it("middelt per week over wie die week invulde", () => {
    const rijen = perWeek(
      [ev("a", "2026-11-09", { energie: 6, cijfer: 7 }), ev("b", "2026-11-09", { energie: 8, cijfer: 6 }), ev("a", "2026-11-16", { cijfer: 9 })],
      ["2026-11-02", "2026-11-09", "2026-11-16"],
    );
    expect(rijen[0]).toEqual({ week: "2026-11-02", waarden: {}, n: 0 });
    expect(rijen[1]).toEqual({ week: "2026-11-09", waarden: { energie: 7, cijfer: 6.5 }, n: 2 });
    expect(rijen[2]).toEqual({ week: "2026-11-16", waarden: { cijfer: 9 }, n: 1 });
  });
});

const NOOR: Deelnemer = { user_id: "noor", email: "noor@react2u.test", rol: "werknemer", sinds: "2026-10-01" };
const SAM: Deelnemer = { user_id: "sam", email: "sam@react2u.test", rol: "casemanager", sinds: "2026-11-12" };
const RENS: Deelnemer = { user_id: "rens", email: "rens@react2u.test", rol: "superadmin", sinds: "2026-01-01" };

describe("wie doet mee en wie miste", () => {
  it("telt de super admin pas mee als hij zelf ooit invulde", () => {
    expect(deelnemers([NOOR, SAM, RENS], [ev("noor", "2026-11-09")]).map((d) => d.user_id)).toEqual(["noor", "sam"]);
    expect(deelnemers([NOOR, RENS], [ev("rens", "2026-10-05")]).map((d) => d.user_id)).toEqual(["noor", "rens"]);
  });

  it("weet welke weken iemand invulde, miste en nog kan invullen, vanaf zijn komst", () => {
    const weken = wekenInKwartaal({ jaar: 2026, kwartaal: 4 });
    const vandaag = "2026-11-18";
    const noor = deelname(NOOR, weken, new Set(["2026-10-05", "2026-10-19", "2026-11-16"]), vandaag);
    expect(noor.ingevuld).toEqual(["2026-10-05", "2026-10-19", "2026-11-16"]);
    // Week 40 (28 sep) telt mee: de zondag is 4 oktober, na 1 oktober.
    expect(noor.gemist).toEqual(["2026-09-28", "2026-10-12", "2026-10-26", "2026-11-02"]);
    expect(noor.open).toEqual(["2026-11-09"]);
    expect(noor.verwacht).toBe(8);
    // Sam kwam op 12 november: week 46 (9 nov) is zijn eerste, en die staat nog open.
    const sam = deelname(SAM, weken, new Set(), vandaag);
    expect(sam.gemist).toEqual([]);
    expect(sam.open).toEqual(["2026-11-09", "2026-11-16"]);
    expect(sam.verwacht).toBe(2);
    // Een evaluatie van vóór iemands komst (een account dat later opnieuw is uitgenodigd) telt gewoon als ingevuld.
    const eerder = deelname(SAM, weken, new Set(["2026-10-19"]), vandaag);
    expect(eerder.ingevuld).toEqual(["2026-10-19"]);
    expect(eerder.gemist).toEqual([]);
    expect(eerder.verwacht).toBe(3);
  });

  it("herinnert wie meedoet en deze week nog niets invulde", () => {
    const evaluaties = [ev("noor", "2026-11-09"), ev("sam", "2026-11-16")];
    expect(wieHerinneren([NOOR, SAM, RENS], evaluaties, "2026-11-16").map((d) => d.user_id)).toEqual(["noor"]);
    // Rens vulde ooit in: dan hoort hij er wel bij.
    expect(wieHerinneren([NOOR, SAM, RENS], [...evaluaties, ev("rens", "2026-10-05")], "2026-11-16").map((d) => d.user_id)).toEqual(["noor", "rens"]);
    // Wie na deze week pas begon, krijgt geen herinnering voor een week waarin hij er nog niet was.
    expect(wieHerinneren([{ ...SAM, sinds: "2026-11-23" }], [], "2026-11-16")).toEqual([]);
  });

  it("schrijft de herinnering met het weeknummer en de sluitdatum", () => {
    const h = herinnering("Noor", "2026-11-16", { vorigeWeekOok: false });
    expect(h.onderwerp).toBe("Hoe was je week 47?");
    expect(h.aanhef).toBe("Hoi Noor,");
    expect(h.alineas[0]).toContain("week 47 (16–22 nov)");
    expect(h.alineas[0]).toContain("zondag 29 november");
    expect(h.alineas[1]).toContain("kwartaalmeeting");
    expect(herinnering(null, "2026-11-16", { vorigeWeekOok: true }).alineas[1]).toContain("Vorige week staat ook nog open");
    expect(herinnering(null, "2026-11-16", { vorigeWeekOok: true }).aanhef).toBe("Hoi,");
  });
});

describe("export", () => {
  it("maakt één rij per collega per verstreken week, met gemiste weken erbij", () => {
    const weken = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"];
    const rijen = exportRijen({
      deelnemers: [NOOR, RENS],
      evaluaties: [ev("noor", "2026-11-09", { energie: 7, werkdruk: 6, voldoening: 8, samenwerking: 7, cijfer: 7.5 as unknown as number, goed: "Twee gestart", trots: "De bakkerij" })],
      weken,
      namen: new Map([["noor", "Noor de Vries"]]),
      uren: new Map([["noor|2026-11-09", { declarabel: 27.5, afwezig: 0 }]]),
      vandaag: "2026-11-18",
    });
    expect(rijen[0]).toEqual(EXPORT_KOP);
    expect(rijen).toHaveLength(4); // kop + week 45, 46, 47 van Noor; Rens doet niet mee, week 48 is toekomst
    expect(rijen[1].slice(0, 6)).toEqual(["Noor de Vries", "noor@react2u.test", "2026", "45", "2–8 nov", "gemist"]);
    expect(rijen[2].slice(0, 6)).toEqual(["Noor de Vries", "noor@react2u.test", "2026", "46", "9–15 nov", "ingevuld"]);
    expect(rijen[2].slice(6, 11)).toEqual(["7", "6", "8", "7", "7,5"]);
    expect(rijen[2][11]).toBe("Twee gestart");
    expect(rijen[2][15]).toBe("De bakkerij");
    expect(rijen[2].slice(16)).toEqual(["27,5", "0", "2026-11-09"]);
    expect(rijen[3][5]).toBe("nog open");
  });
});
