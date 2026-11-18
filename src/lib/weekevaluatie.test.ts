import { describe, expect, it } from "vitest";
import {
  ALLE_SCHALEN, bespreekpunten, cijferTekst, deelname, deelnemers, doelenVan, doelStanden, EXPORT_KOP, exportNaam, exportRijen, gemiddelde, gemiddelden,
  herinnering, isKwartaalEinde, isMaandEinde, kwartaalLabel, kwartaalSleutel, kwartaalVanDatum, kwartaalVanWeek, leesAntwoorden, leesKwartaal,
  maandenInKwartaal, maandOverzicht, magWijzigen, meldingen, meldingInhoud, meldingMail, momenten, normaliseerAntwoorden, openWeken, perWeek,
  plusKwartalen, SCHALEN, schalenZin, signaal, signaalMail, signalen, sluitOp, teksten, telKeuzes, TEKSTVRAGEN, teltVoor, trend, trendTekst, VRAGEN,
  vragenVoorWeek, weekStand, weekTitel, wekenInKwartaal, wieHerinneren, zwaarsteWeken, type Antwoorden, type Deelnemer, type Doel, type Evaluatie,
} from "./weekevaluatie";

const ev = (user_id: string, week: string, antwoorden: Antwoorden = { cijfer: 7 }): Evaluatie => ({
  id: `${user_id}-${week}`, user_id, week, antwoorden, door: `${user_id}@react2u.test`, created_at: `${week}T10:00:00Z`, updated_at: `${week}T10:00:00Z`,
});

/** Een formulier zoals de browser het stuurt: elke naam een lijst waarden. */
const formulier = (velden: Record<string, string | string[]>) =>
  Object.fromEntries(Object.entries(velden).map(([k, v]) => [k, Array.isArray(v) ? v : [v]]));

const WEEK_OK = { energie: "7", plezier: "8", tijd: "6", emotie: "7", herstel: "5", kennis: "8", cijfer: "7" };
const MAAND_OK = { trots: "8", inzet: "9", waardering: "6", ruimte: "7", geleerd: "5", steun: "8" };

// Woensdag 18 november 2026: week 47. De laatste week van november is week 48 (donderdag 26 nov),
// de laatste van het kwartaal week 53 (maandag 28 december, donderdag 31 december).
const WEEK_47 = "2026-11-16";
const WEEK_48 = "2026-11-23";
const WEEK_53 = "2026-12-28";
const DOEL = "11111111-2222-4333-8444-555555555555";

describe("de vragen", () => {
  it("heeft zeven weekschalen, zes maandvragen en een terugblik per kwartaal, elk met een unieke sleutel", () => {
    expect(SCHALEN.filter((s) => s.moment === "week").map((s) => s.sleutel)).toEqual(["energie", "plezier", "tijd", "emotie", "herstel", "kennis", "cijfer"]);
    expect(SCHALEN.filter((s) => s.moment === "maand").map((s) => s.sleutel)).toEqual(["trots", "inzet", "waardering", "ruimte", "geleerd", "steun"]);
    expect(VRAGEN.filter((v) => v.moment === "kwartaal").map((v) => v.sleutel)).toEqual(["blijven", "blijven_waarom", "kwartaal_hoogtepunt", "kwartaal_anders"]);
    expect(new Set(VRAGEN.map((v) => v.sleutel)).size).toBe(VRAGEN.length);
    // Alles mag mee naar de kwartaalmeeting, behalve de melding: die heeft een eigen plek op de agenda.
    expect(TEKSTVRAGEN.filter((t) => !t.bespreekbaar).map((t) => t.sleutel)).toEqual(["melding"]);
  });

  it("heeft vrije velden bij de cijfers, in eigen woorden, bij de maandvragen en een veld om iets te melden", () => {
    const per = (blok: string) => TEKSTVRAGEN.filter((t) => t.blok === blok).map((t) => t.sleutel);
    expect(per("cijfers")).toEqual(["cijfers_toelichting"]);
    expect(per("woorden")).toEqual(["hoogtepunt", "knelpunt", "kennis_mist", "beter", "nodig", "volgende_week"]);
    expect(per("melden")).toEqual(["melding"]);
    expect(per("maand")).toEqual(["maand_toelichting"]);
    expect(per("terugblik")).toEqual(["blijven_waarom", "kwartaal_hoogtepunt", "kwartaal_anders"]);
  });

  it("vraagt niets over gezondheid", () => {
    const alles = VRAGEN.map((v) => `${v.label} ${v.hint}`).join(" ").toLowerCase();
    for (const woord of ["klacht", "slaap", "ziek ben", "medicijn", "pijn"]) expect(alles).not.toContain(woord);
  });

  it("weet welke weken maandvragen en een terugblik hebben", () => {
    expect(isMaandEinde(WEEK_47)).toBe(false);
    expect(isMaandEinde(WEEK_48)).toBe(true);
    expect(isKwartaalEinde(WEEK_48)).toBe(false);
    expect(isKwartaalEinde(WEEK_53)).toBe(true);
    expect(isMaandEinde(WEEK_53)).toBe(true);
    // Maandag 28 september 2026: donderdag 1 oktober, dus de eerste week van Q4 en niet de laatste van september.
    expect(isMaandEinde("2026-09-21")).toBe(true);
    expect(momenten(WEEK_47)).toEqual(["week"]);
    expect(momenten(WEEK_48)).toEqual(["week", "maand"]);
    expect(momenten(WEEK_53)).toEqual(["week", "maand", "kwartaal"]);
    expect(vragenVoorWeek(WEEK_47)).toHaveLength(15);
    expect(vragenVoorWeek(WEEK_53)).toHaveLength(VRAGEN.length);
  });
});

describe("het formulier lezen", () => {
  it("leest een gewone week: schalen verplicht, tekst bijgeknipt, leeg weggelaten", () => {
    const { antwoorden, fouten } = leesAntwoorden(formulier({ ...WEEK_OK, hoogtepunt: "  Twee gestart.  ", knelpunt: "", trots: "9" }), { week: WEEK_47, doelen: [] });
    expect(fouten).toEqual([]);
    expect(antwoorden).toEqual({ energie: 7, plezier: 8, tijd: 6, emotie: 7, herstel: 5, kennis: 8, cijfer: 7, hoogtepunt: "Twee gestart." });
  });

  it("noemt de schalen die ontbreken of onzin zijn, ook de maandvragen in de laatste week van de maand", () => {
    expect(leesAntwoorden(formulier({ ...WEEK_OK, energie: "11", tijd: "0", kennis: "7,5" }), { week: WEEK_47, doelen: [] }).fouten).toEqual(["energie", "tijd", "kennis"]);
    expect(leesAntwoorden(formulier(WEEK_OK), { week: WEEK_48, doelen: [] }).fouten).toEqual(["trots", "inzet", "waardering", "ruimte", "geleerd", "steun"]);
    expect(leesAntwoorden(formulier({ ...WEEK_OK, ...MAAND_OK }), { week: WEEK_53, doelen: [] }).fouten).toEqual(["blijven"]);
    expect(leesAntwoorden(formulier({ ...WEEK_OK, ...MAAND_OK, blijven: "8" }), { week: WEEK_53, doelen: [] }).fouten).toEqual([]);
  });

  it("vraagt alleen welke kennis je miste als kennis een 6 of lager is", () => {
    const veld = { kennis_mist: "Loonsanctie", kennis_themas: ["wetgeving", "onzin"], bespreken: ["kennis_mist"] };
    const hoog = leesAntwoorden(formulier({ ...WEEK_OK, ...veld }), { week: WEEK_47, doelen: [] }).antwoorden;
    expect(hoog.kennis_mist).toBeUndefined();
    expect(hoog.kennis_themas).toBeUndefined();
    expect(hoog.bespreken).toBeUndefined();
    const laag = leesAntwoorden(formulier({ ...WEEK_OK, kennis: "5", ...veld }), { week: WEEK_47, doelen: [] }).antwoorden;
    expect(laag).toMatchObject({ kennis: 5, kennis_mist: "Loonsanctie", kennis_themas: ["wetgeving"], bespreken: ["kennis_mist"] });
  });

  it("houdt thema's op vaste volgorde en een bespreekvinkje alleen bij een antwoord", () => {
    const { antwoorden } = leesAntwoorden(
      formulier({ ...WEEK_OK, knelpunt_themas: ["planning", "werkdruk", "planning"], bespreken: ["knelpunt", "hoogtepunt", "kwartaal_anders"] }),
      { week: WEEK_47, doelen: [] },
    );
    expect(antwoorden.knelpunt_themas).toEqual(["werkdruk", "planning"]);
    // Knelpunt heeft alleen thema's en telt; hoogtepunt is leeg en de terugblik wordt deze week niet gevraagd.
    expect(antwoorden.bespreken).toEqual(["knelpunt"]);
  });

  it("leest de melding: één soort, en meteen doorsturen alleen met tekst", () => {
    const { antwoorden } = leesAntwoorden(
      formulier({ ...WEEK_OK, melding: " Susanne nam twee dossiers over. ", melding_soort: ["compliment", "zorg"], melding_nu: "aan", nodig: "Een uur samen", volgende_week: "Eerst terugbellen" }),
      { week: WEEK_47, doelen: [] },
    );
    expect(antwoorden).toMatchObject({ melding: "Susanne nam twee dossiers over.", melding_soort: ["zorg"], melding_nu: true, nodig: "Een uur samen", volgende_week: "Eerst terugbellen" });
    // Bij twee rondjes tegelijk (kan alleen buiten de browser om) blijft de eerste in de vaste volgorde over.
    expect(leesAntwoorden(formulier({ ...WEEK_OK, melding_soort: "idee", melding_nu: "aan" }), { week: WEEK_47, doelen: [] }).antwoorden).toEqual({ ...Object.fromEntries(Object.entries(WEEK_OK).map(([k, v]) => [k, Number(v)])), melding_soort: ["idee"] });
    // De toelichting bij de maandvragen telt alleen in de laatste week van de maand.
    expect(leesAntwoorden(formulier({ ...WEEK_OK, maand_toelichting: "x" }), { week: WEEK_47, doelen: [] }).antwoorden.maand_toelichting).toBeUndefined();
    expect(leesAntwoorden(formulier({ ...WEEK_OK, ...MAAND_OK, maand_toelichting: "Veel geleerd" }), { week: WEEK_48, doelen: [] }).antwoorden.maand_toelichting).toBe("Veel geleerd");
  });

  it("vraagt de voortgang op elk doel", () => {
    expect(leesAntwoorden(formulier(WEEK_OK), { week: WEEK_47, doelen: [{ id: DOEL }] }).fouten).toEqual([`doel:${DOEL}`]);
    const { antwoorden } = leesAntwoorden(formulier({ ...WEEK_OK, [`doel_${DOEL}`]: "6", [`doel_${DOEL}_tekst`]: " Twee dossiers samen doorgenomen " }), { week: WEEK_47, doelen: [{ id: DOEL }] });
    expect(antwoorden.doelen).toEqual({ [DOEL]: { cijfer: 6, tekst: "Twee dossiers samen doorgenomen" } });
  });

  it("houdt uit de database alleen bekende, geldige antwoorden over", () => {
    expect(normaliseerAntwoorden({
      energie: 7, tijd: 12, cijfer: "8", hoogtepunt: "Prima", onbekend: "weg", knelpunt: "   ",
      knelpunt_themas: ["planning", "onzin", "werkdruk"], bespreken: ["hoogtepunt", "eval()"],
      doelen: { [DOEL]: { cijfer: 7, tekst: "ok" }, "geen-uuid": { cijfer: 7 }, "22222222-2222-4333-8444-555555555555": { cijfer: 11 } },
    })).toEqual({ energie: 7, hoogtepunt: "Prima", knelpunt_themas: ["werkdruk", "planning"], bespreken: ["hoogtepunt"], doelen: { [DOEL]: { cijfer: 7, tekst: "ok" } } });
    expect(normaliseerAntwoorden({ melding: "Idee", melding_soort: ["idee", "zorg"], melding_nu: true, melding_verstuurd: "a1b2c3d4e5f60718" }))
      .toEqual({ melding: "Idee", melding_soort: ["zorg"], melding_nu: true, melding_verstuurd: "a1b2c3d4e5f60718" });
    expect(normaliseerAntwoorden({ melding_nu: true, melding_verstuurd: "<script>" })).toEqual({});
    expect(normaliseerAntwoorden(null)).toEqual({});
  });
});

describe("open en gesloten weken", () => {
  it("laat deze week en vorige week open, tot en met de zondag van de week erna", () => {
    expect(openWeken("2026-11-18")).toEqual(["2026-11-09", "2026-11-16"]);
    expect(weekStand("2026-11-16", "2026-11-18")).toBe("open");
    expect(weekStand("2026-11-09", "2026-11-18")).toBe("open");
    expect(weekStand("2026-11-02", "2026-11-18")).toBe("gesloten");
    expect(weekStand("2026-11-23", "2026-11-18")).toBe("toekomst");
    expect(magWijzigen("2026-11-09", "2026-11-22")).toBe(true);
    expect(magWijzigen("2026-11-09", "2026-11-23")).toBe(false);
    expect(sluitOp("2026-11-09")).toBe("2026-11-22");
    expect(weekTitel("2026-11-16")).toBe("Week 47 · 16–22 nov");
  });

  it("telt weken van vóór iemands komst niet mee", () => {
    expect(teltVoor("2026-11-09", "2026-11-12")).toBe(true);
    expect(teltVoor("2026-11-02", "2026-11-12")).toBe(false);
    expect(teltVoor("2026-11-02", null)).toBe(true);
  });
});

describe("kwartalen", () => {
  it("rekent het kwartaal van een week naar zijn donderdag, ook over de jaargrens", () => {
    expect(kwartaalVanWeek("2026-11-16")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(kwartaalVanWeek(WEEK_53)).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(kwartaalVanDatum("2027-01-01")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(kwartaalVanDatum("2027-01-04")).toEqual({ jaar: 2027, kwartaal: 1 });
    expect(kwartaalVanWeek("2026-03-30")).toEqual({ jaar: 2026, kwartaal: 2 });
  });

  it("geeft de weken en maanden van een kwartaal", () => {
    const q4 = wekenInKwartaal({ jaar: 2026, kwartaal: 4 });
    expect(q4[0]).toBe("2026-09-28");
    expect(q4[q4.length - 1]).toBe(WEEK_53);
    expect(q4).toHaveLength(14);
    const q1 = wekenInKwartaal({ jaar: 2027, kwartaal: 1 });
    expect(q1[0]).toBe("2027-01-04");
    expect(q1[q1.length - 1]).toBe("2027-03-22");
    expect(q1).toHaveLength(12);
    expect(maandenInKwartaal({ jaar: 2026, kwartaal: 4 })).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("leest en schrijft de sleutel en het label", () => {
    expect(kwartaalSleutel({ jaar: 2026, kwartaal: 4 })).toBe("2026-Q4");
    expect(leesKwartaal("2026-Q4")).toEqual({ jaar: 2026, kwartaal: 4 });
    expect(leesKwartaal("2026-Q5")).toBeNull();
    expect(kwartaalLabel({ jaar: 2026, kwartaal: 1 }, true)).toBe("eerste kwartaal 2026");
    expect(plusKwartalen({ jaar: 2026, kwartaal: 4 }, 1)).toEqual({ jaar: 2027, kwartaal: 1 });
    expect(plusKwartalen({ jaar: 2026, kwartaal: 1 }, -1)).toEqual({ jaar: 2025, kwartaal: 4 });
    expect(exportNaam({ jaar: 2026, kwartaal: 4 })).toBe("weekevaluaties-2026-Q4.xlsx");
  });
});

describe("gemiddelden en trends", () => {
  it("middelt op één decimaal en kent laagste en hoogste", () => {
    expect(gemiddelde([7, 8])).toBe(7.5);
    expect(gemiddelde([7, 8, 8])).toBe(7.7);
    expect(gemiddelde([])).toBeNull();
    const g = gemiddelden([ev("a", "2026-11-02", { energie: 6, cijfer: 7 }), ev("a", "2026-11-09", { energie: 8, cijfer: 8 }), ev("a", "2026-11-16", { cijfer: 6 })]);
    expect(g.energie).toEqual({ gem: 7, n: 2, laagste: 6, hoogste: 8 });
    expect(g.cijfer).toEqual({ gem: 7, n: 3, laagste: 6, hoogste: 8 });
    expect(g.trots).toEqual({ gem: null, n: 0, laagste: null, hoogste: null });
    expect(Object.keys(g)).toEqual(ALLE_SCHALEN);
  });

  it("schrijft cijfers en trends in het Nederlands", () => {
    expect(cijferTekst(7.4)).toBe("7,4");
    expect(cijferTekst(null)).toBe("–");
    expect(trend(6.8, 7.2)).toBe(-0.4);
    expect(trend(7, null)).toBeNull();
    expect(trendTekst(0.4)).toBe("+0,4");
    expect(trendTekst(-1.2)).toBe("−1,2");
    expect(trendTekst(0)).toBe("±0");
  });

  it("middelt per week over wie die week invulde", () => {
    const rijen = perWeek([ev("a", "2026-11-09", { energie: 6, cijfer: 7 }), ev("b", "2026-11-09", { energie: 8, cijfer: 6 })], ["2026-11-02", "2026-11-09"]);
    expect(rijen[0]).toEqual({ week: "2026-11-02", waarden: {}, n: 0 });
    expect(rijen[1]).toEqual({ week: "2026-11-09", waarden: { energie: 7, cijfer: 6.5 }, n: 2 });
  });
});

describe("twee zware weken", () => {
  it("geeft een signaal bij twee weken achter elkaar een 4 of lager voor energie of tijd", () => {
    expect(signaal({ energie: 4, tijd: 6 }, { energie: 3, tijd: 3 })).toEqual(["energie"]);
    expect(signaal({ energie: 4, tijd: 2 }, { energie: 3, tijd: 4 })).toEqual(["energie", "tijd"]);
    expect(signaal({ energie: 5, tijd: 5 }, { energie: 1, tijd: 1 })).toEqual([]);
    // Emotie en herstel tellen hier niet; die staan in de zwaarste weken.
    expect(signaal({ emotie: 1, herstel: 1 }, { emotie: 1, herstel: 1 })).toEqual([]);
    expect(signaal({ energie: 2 }, undefined)).toEqual([]);
  });

  it("vindt alle signalen in een reeks, op de tweede week, alleen bij opeenvolgende weken", () => {
    const s = signalen([
      ev("noor", "2026-11-02", { energie: 3 }), ev("noor", "2026-11-09", { energie: 4 }), ev("noor", "2026-11-16", { energie: 2 }),
      ev("sam", "2026-10-26", { tijd: 2 }), ev("sam", "2026-11-09", { tijd: 2 }),
    ]);
    expect(s).toEqual([
      { user_id: "noor", week: "2026-11-16", schalen: ["energie"] },
      { user_id: "noor", week: "2026-11-09", schalen: ["energie"] },
    ]);
  });

  it("schrijft de mail zonder de antwoorden zelf", () => {
    expect(schalenZin(["energie", "tijd"])).toBe("energie en werk paste in de tijd");
    const m = signaalMail("Noor", "2026-11-16", ["energie"]);
    expect(m.onderwerp).toBe("Twee zware weken voor Noor");
    expect(m.alineas[0]).toBe("Noor gaf in week 46 en 47 allebei een 4 of lager voor energie.");
    expect(m.alineas.join(" ")).toContain("niet naar de gezondheid");
  });
});

describe("voor de kwartaalmeeting", () => {
  const reeks = [
    ev("noor", "2026-10-05", { energie: 8, tijd: 7, emotie: 8, herstel: 7, knelpunt_themas: ["planning"] }),
    ev("noor", "2026-10-12", { energie: 3, tijd: 4, emotie: 5, herstel: 4, knelpunt_themas: ["werkdruk", "klant"], knelpunt: "Drie spoedgevallen", bespreken: ["knelpunt"] }),
    ev("noor", "2026-10-19", { energie: 6, tijd: 6, emotie: 6, herstel: 6, knelpunt_themas: ["werkdruk"], kennis_themas: ["wetgeving"] }),
    ev("noor", "2026-10-26", { energie: 5, tijd: 3, emotie: 4, herstel: 5, trots: 8, inzet: 9, hoogtepunt: "Bakkerij weer aan het werk", bespreken: ["hoogtepunt"] }),
  ];

  it("wijst de twee zwaarste weken aan, pas vanaf drie weken", () => {
    expect(zwaarsteWeken(reeks)).toEqual([{ week: "2026-10-12", zwaarte: 4 }, { week: "2026-10-26", zwaarte: 4.3 }]);
    expect(zwaarsteWeken(reeks.slice(0, 2))).toEqual([]);
  });

  it("telt de thema's, vaakst eerst", () => {
    expect(telKeuzes(reeks, "knelpunt_themas").map((t) => `${t.label}:${t.aantal}`)).toEqual(["Werkdruk:2", "Klant of werkgever:1", "Planning:1"]);
    expect(telKeuzes(reeks, "kennis_themas").map((t) => t.label)).toEqual(["Wet poortwachter en WIA"]);
  });

  it("zet de bespreekpunten op een rij, nieuwste eerst, met de thema's erbij", () => {
    expect(bespreekpunten(reeks)).toEqual([
      { week: "2026-10-26", sleutel: "hoogtepunt", vraag: "Hoogtepunt", tekst: "Bakkerij weer aan het werk", themas: [] },
      { week: "2026-10-12", sleutel: "knelpunt", vraag: "Knelpunt", tekst: "Drie spoedgevallen", themas: ["Werkdruk", "Klant of werkgever"] },
    ]);
  });

  it("zet de vrije teksten en de meldingen op een rij, nieuwste eerst", () => {
    const rijen = [
      ev("noor", "2026-11-02", { nodig: "Een uur samen", melding: "Nieuwe printer?", melding_soort: ["vraag"] }),
      ev("noor", "2026-11-09", { nodig: "Rust", melding: "Klant werd agressief aan de telefoon", melding_soort: ["zorg"], melding_nu: true, melding_verstuurd: "a1b2c3d4" }),
      ev("noor", "2026-11-16", { melding: "Zomaar" }),
    ];
    expect(teksten(rijen, "nodig")).toEqual([{ week: "2026-11-09", tekst: "Rust" }, { week: "2026-11-02", tekst: "Een uur samen" }]);
    expect(meldingen(rijen)).toEqual([
      { week: "2026-11-16", soort: null, soortLabel: "Gemeld of gedeeld", tekst: "Zomaar", nu: false, verstuurd: false },
      { week: "2026-11-09", soort: "zorg", soortLabel: "Iets wat niet goed gaat", tekst: "Klant werd agressief aan de telefoon", nu: true, verstuurd: true },
      { week: "2026-11-02", soort: "vraag", soortLabel: "Een vraag", tekst: "Nieuwe printer?", nu: false, verstuurd: false },
    ]);
  });

  it("mailt een melding alleen als de collega dat vroeg, en opnieuw alleen bij een andere tekst", () => {
    expect(meldingInhoud({ melding: "Idee", melding_soort: ["idee"] })).toBeNull();
    expect(meldingInhoud({ melding: "Idee", melding_soort: ["idee"], melding_nu: true })).toBe("idee|Idee");
    expect(meldingInhoud({ melding: "Idee", melding_nu: true })).toBe("|Idee");
    const m = meldingMail("Noor", "2026-11-16", "compliment", "Susanne nam twee dossiers over.");
    expect(m.onderwerp).toBe("Noor deelt een compliment");
    expect(m.alineas[0]).toContain("week 47");
    expect(m.alineas[1]).toContain("rechtstreeks naar Noor");
    expect(m.citaat).toBe("Susanne nam twee dossiers over.");
    expect(meldingMail("Noor", "2026-11-16", "zorg", "x").onderwerp).toBe("Noor meldt iets wat niet goed gaat");
    expect(meldingMail("Noor", "2026-11-16", null, "x").onderwerp).toBe("Noor wil iets melden");
  });

  it("zet de maandvragen per maand van het kwartaal", () => {
    const m = maandOverzicht(reeks, { jaar: 2026, kwartaal: 4 });
    expect(m.maanden).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(m.ingevuld).toBe(1);
    expect(m.rijen.find((r) => r.sleutel === "trots")?.waarden).toEqual([8, null, null]);
  });

  it("volgt de doelen per week", () => {
    const doel: Doel = { id: DOEL, user_id: "noor", jaar: 2026, kwartaal: 4, titel: "Spoor 2 eigen maken", toelichting: null, sort: 0 };
    const [d] = doelStanden([doel], [
      ev("noor", "2026-10-12", { doelen: { [DOEL]: { cijfer: 4, tekst: "Boek besteld" } } }),
      ev("noor", "2026-10-05", { doelen: { [DOEL]: { cijfer: 6 } } }),
      ev("noor", "2026-10-19", {}),
    ]);
    expect(d.perWeek).toEqual([{ week: "2026-10-05", cijfer: 6 }, { week: "2026-10-12", cijfer: 4 }]);
    expect(d.gem).toBe(5);
    expect(d.laatste).toEqual({ week: "2026-10-12", tekst: "Boek besteld" });
    expect(doelenVan([{ ...doel, sort: 2, titel: "B" }, { ...doel, sort: 1, titel: "A" }, { ...doel, kwartaal: 1 }], { jaar: 2026, kwartaal: 4 }).map((x) => x.titel)).toEqual(["A", "B"]);
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
    const noor = deelname(NOOR, weken, new Set(["2026-10-05", "2026-10-19", "2026-11-16"]), "2026-11-18");
    expect(noor.gemist).toEqual(["2026-09-28", "2026-10-12", "2026-10-26", "2026-11-02"]);
    expect(noor.open).toEqual(["2026-11-09"]);
    expect(noor.verwacht).toBe(8);
    const sam = deelname(SAM, weken, new Set(), "2026-11-18");
    expect(sam.open).toEqual(["2026-11-09", "2026-11-16"]);
    expect(sam.verwacht).toBe(2);
    const eerder = deelname(SAM, weken, new Set(["2026-10-19"]), "2026-11-18");
    expect(eerder.ingevuld).toEqual(["2026-10-19"]);
    expect(eerder.verwacht).toBe(3);
  });

  it("herinnert wie meedoet en deze week nog niets invulde", () => {
    const evaluaties = [ev("noor", "2026-11-09"), ev("sam", "2026-11-16")];
    expect(wieHerinneren([NOOR, SAM, RENS], evaluaties, "2026-11-16").map((d) => d.user_id)).toEqual(["noor"]);
    expect(wieHerinneren([NOOR, SAM, RENS], [...evaluaties, ev("rens", "2026-10-05")], "2026-11-16").map((d) => d.user_id)).toEqual(["noor", "rens"]);
    expect(wieHerinneren([{ ...SAM, sinds: "2026-11-23" }], [], "2026-11-16")).toEqual([]);
  });

  it("schrijft de herinnering, met de maandvragen en de terugblik in de weken waarin ze staan", () => {
    const h = herinnering("Noor", WEEK_47, { vorigeWeekOok: false });
    expect(h.onderwerp).toBe("Hoe was je week 47?");
    expect(h.aanhef).toBe("Hoi Noor,");
    expect(h.alineas[0]).toContain("week 47 (16–22 nov)");
    expect(h.alineas[0]).toContain("zondag 29 november");
    expect(h.alineas[1]).toContain("nooit voor beoordeling of salaris");
    expect(herinnering(null, WEEK_47, { vorigeWeekOok: true }).alineas[1]).toContain("Vorige week staat ook nog open");
    expect(herinnering(null, WEEK_48, { vorigeWeekOok: false }).alineas[1]).toContain("laatste week van de maand");
    expect(herinnering(null, WEEK_53, { vorigeWeekOok: false }).alineas[1]).toContain("laatste week van het kwartaal");
  });
});

describe("export", () => {
  it("maakt één rij per collega per verstreken week, met gemiste weken, thema's, doelen en signalen", () => {
    const doel: Doel = { id: DOEL, user_id: "noor", jaar: 2026, kwartaal: 4, titel: "Spoor 2 eigen maken", toelichting: null, sort: 0 };
    const rijen = exportRijen({
      deelnemers: [NOOR, RENS],
      evaluaties: [
        ev("noor", "2026-11-02", { energie: 3, tijd: 3 }),
        ev("noor", "2026-11-09", {
          energie: 4, plezier: 6, tijd: 4, emotie: 7, herstel: 5, kennis: 5, cijfer: 6, hoogtepunt: "Twee gestart", knelpunt: "Bedrijfsarts pas donderdag",
          knelpunt_themas: ["werkdruk", "planning"], kennis_themas: ["reintegratie"], kennis_mist: "Spoor 2", bespreken: ["knelpunt"],
          doelen: { [DOEL]: { cijfer: 6, tekst: "Twee dossiers" } }, cijfers_toelichting: "Maandag zwaar", nodig: "Een uur samen",
          melding: "Susanne hielp", melding_soort: ["compliment"], melding_nu: true, melding_verstuurd: "a1b2c3d4",
        }),
      ],
      weken: ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"],
      namen: new Map([["noor", "Noor de Vries"]]),
      uren: new Map([["noor|2026-11-09", { declarabel: 27.5, afwezig: 0 }]]),
      doelen: [doel],
      vandaag: "2026-11-18",
    });
    const kol = (rij: string[], naam: string) => rij[EXPORT_KOP.indexOf(naam)];
    expect(rijen[0]).toEqual(EXPORT_KOP);
    expect(rijen).toHaveLength(5); // kop + week 44 tot en met 47 van Noor; Rens doet niet mee, week 48 is toekomst
    expect(kol(rijen[1], "Status")).toBe("gemist");
    const w46 = rijen[3];
    expect(kol(w46, "Week")).toBe("46");
    expect(kol(w46, "Status")).toBe("ingevuld");
    expect(kol(w46, "Energie")).toBe("4");
    expect(kol(w46, "Knelpuntthema's")).toBe("Werkdruk, Planning");
    expect(kol(w46, "Kennisthema's")).toBe("Re-integratie spoor 1 en 2");
    expect(kol(w46, "Voortgang doelen")).toBe("Spoor 2 eigen maken: 6 (Twee dossiers)");
    expect(kol(w46, "Te bespreken")).toBe("Knelpunt");
    expect(kol(w46, "Toelichting bij de cijfers")).toBe("Maandag zwaar");
    expect(kol(w46, "Nodig")).toBe("Een uur samen");
    expect(kol(w46, "Soort melding")).toBe("Een compliment");
    expect(kol(w46, "Gemeld of gedeeld")).toBe("Susanne hielp");
    expect(kol(w46, "Meteen doorgestuurd")).toBe("ja");
    expect(kol(rijen[1], "Meteen doorgestuurd")).toBe("");
    expect(kol(w46, "Twee zware weken")).toBe("energie en werk paste in de tijd");
    expect(kol(w46, "Declarabele uren")).toBe("27,5");
    expect(kol(rijen[4], "Status")).toBe("nog open");
  });
});
