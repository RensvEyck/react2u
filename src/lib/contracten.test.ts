import { describe, expect, it } from "vitest";
import {
  CONTRACT_STANDAARD, RESELLER_STANDAARD, contractStructuur, metAanvullend, metVergoeding, resellerTekst, resellerVergoeding, wijktAf,
} from "./contractTekst";
import {
  comparitieOpdrachtgever, comparitieOpdrachtnemer, comparities, contractFeiten, contractInhoud, contractKort, contractPdfNaam, controleerContract,
  looptijdMaanden, looptijdNu, looptijdTekst, looptijdZin, normaliseerOpdrachtgever, offerteKenmerk, opdrachtgeverFout, opdrachtnemerUit, plusMaanden,
  postcodePlaats, react2uPartij, soortVan, standaardEinde, standaardIngang,
} from "./contracten";

describe("de standaardtekst", () => {
  const s = contractStructuur(CONTRACT_STANDAARD);

  it("heeft de zes overwegingen A tot en met F", () => {
    expect(s.overwegingenKop).toBe("In aanmerking nemende");
    expect(s.overwegingen.map((o) => o.letter)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("heeft de acht artikelen van het Word-bestand", () => {
    expect(s.artikelen.map((a) => `${a.nr} ${a.titel}`)).toEqual([
      "1 Duur van de overeenkomst en opzegging",
      "2 Inhoud dienstverlening",
      "3 Uitvoering kerntaken",
      "4 Beroepsuitoefening van de bedrijfsarts",
      "5 Randvoorwaarden",
      "6 Overige",
      "7 Vergoeding(en) en betalingscondities",
      "8 Slotbepalingen",
    ]);
  });

  it("kent bepalingen binnen bepalingen", () => {
    const art5 = s.artikelen[4].bepalingen.map((b) => b.nr);
    expect(art5).toEqual(["5.1", "5.2", "5.3", "5.3.1", "5.3.2", "5.3.3", "5.3.4", "5.3.5", "5.3.6", "5.3.7", "5.4", "5.4.1", "5.4.2"]);
    expect(s.artikelen[4].bepalingen.find((b) => b.nr === "5.3.1")?.diepte).toBe(2);
  });

  it("houdt een tweede alinea bij zijn bepaling (second opinion in 4.3)", () => {
    const b = s.artikelen[3].bepalingen.find((x) => x.nr === "4.3")!;
    expect(b.alineas).toHaveLength(2);
    expect(b.alineas[1]).toMatch(/^Een bedrijfsarts die bekend is/);
  });

  it("verliest geen woord: alle tekst uit het Word-bestand staat in de structuur", () => {
    const woorden = (t: string) => t.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim();
    const terug = [
      s.overwegingenKop,
      ...s.overwegingen.map((o) => `${o.letter}. ${o.alineas.join(" ")}`),
      ...s.artikelen.flatMap((a) => [`${a.nr}. ${a.titel}`, ...a.bepalingen.map((b) => `${b.nr}. ${b.alineas.join(" ")}`)]),
    ].join(" ");
    expect(woorden(terug)).toBe(woorden(CONTRACT_STANDAARD));
  });

  it("de standaard wijkt niet af van zichzelf, een aanpassing wel", () => {
    expect(wijktAf(CONTRACT_STANDAARD)).toBe(false);
    expect(wijktAf(`${CONTRACT_STANDAARD}\n\n`)).toBe(false);
    expect(wijktAf(CONTRACT_STANDAARD.replace("30 dagen", "14 dagen"))).toBe(true);
  });
});

describe("aanvullende afspraken", () => {
  it("worden het laatste artikel, elke alinea een bepaling", () => {
    const s = metAanvullend(contractStructuur(CONTRACT_STANDAARD), "Eerste afspraak.\n\nTweede afspraak,\nover twee regels.");
    const laatste = s.artikelen[s.artikelen.length - 1];
    expect(laatste).toMatchObject({ nr: "9", titel: "Aanvullende afspraken" });
    expect(laatste.bepalingen.map((b) => [b.nr, b.alineas[0]])).toEqual([["9.1", "Eerste afspraak."], ["9.2", "Tweede afspraak, over twee regels."]]);
  });

  it("zonder tekst blijft het contract gelijk", () => {
    const s = contractStructuur(CONTRACT_STANDAARD);
    expect(metAanvullend(s, "  \n ")).toBe(s);
  });
});

describe("de tekst van één contract", () => {
  it("vult de looptijd en de offerte in", () => {
    const s = contractInhoud({ tekst: CONTRACT_STANDAARD, ingangsdatum: "2026-12-01", einddatum: "2027-11-30", offerte_kenmerk: "Offerte 2026-0012 van 3 november 2026", bedrijf: "Bakkerij Jansen" });
    expect(s.artikelen[0].bepalingen[0].alineas[0]).toMatch(/^De Overeenkomst start op 1 december 2026 en heeft als einddatum 30 november 2027\./);
    expect(s.overwegingen[3].alineas[0]).toBe("Dat Opdrachtgever akkoord is met de offerte voor de dienstverlening van Opdrachtnemer, met kenmerk: Offerte 2026-0012 van 3 november 2026.");
  });

  it("zonder offerte: naam en KvK van de klant als kenmerk, zoals het Word-bestand vraagt", () => {
    const s = contractInhoud({ tekst: CONTRACT_STANDAARD, ingangsdatum: "2026-12-01", einddatum: "2027-11-30", bedrijf: "Jansen", opdrachtgever: { naam: "Bakkerij Jansen B.V.", kvk: "12345678" } });
    expect(s.overwegingen[3].alineas[0]).toMatch(/met kenmerk: Bakkerij Jansen B\.V\., KvK 12345678\.$/);
  });

  it("offertekenmerk met de datum van tekenen", () => {
    expect(offerteKenmerk({ nummer: "2026-0012", getekend_at: "2026-11-03T10:00:00Z" })).toBe("Offerte 2026-0012 van 3 november 2026");
    expect(offerteKenmerk({ nummer: "2026-0012" })).toBe("Offerte 2026-0012");
  });
});

describe("partijen", () => {
  it("React2u uit Instellingen, getekend door de bestuurder", () => {
    const o = opdrachtnemerUit({ addressLine1: "Stratumsedijk 29", addressLine2: "5611 NB Eindhoven", kvk: "95076824", phoneDisplay: "085 - 620 58 00" });
    expect(o).toEqual({
      naam: "React2u", adres: "Stratumsedijk 29", postcode: "5611 NB", plaats: "Eindhoven", kvk: "95076824", vertegenwoordiger: "de heer R. van Eyck", functie: "bestuurder",
      statutair: "React2u II B.V.", email: "sales@react2u.nl", telefoon: "085 620 58 00",
    });
    expect(comparitieOpdrachtnemer(o)).toBe(
      "React2u, gevestigd en kantoorhoudend te Eindhoven aan de Stratumsedijk 29, 5611 NB Eindhoven, ingeschreven in het handelsregister onder KvK-nummer 95076824, te dezer zake rechtsgeldig vertegenwoordigd door de heer R. van Eyck in de hoedanigheid van bestuurder, hierna te noemen “Opdrachtnemer”;",
    );
  });

  it("de klant met wie tekent, en open plekken zolang iets ontbreekt", () => {
    const og = { naam: "Bakkerij Jansen B.V.", adres: "Markt 1", postcode: "5611 AA", plaats: "Eindhoven", kvk: "12345678" };
    expect(comparitieOpdrachtgever(og, { naam: "Marieke Jansen", functie: "directeur" })).toBe(
      "Bakkerij Jansen B.V., gevestigd en kantoorhoudende te Eindhoven aan de Markt 1, 5611 AA Eindhoven, ingeschreven in het handelsregister onder KvK-nummer 12345678, te dezen rechtsgeldig vertegenwoordigd door Marieke Jansen, directeur; hierna te noemen “Opdrachtgever”;",
    );
    expect(comparitieOpdrachtgever({ naam: "Jansen" }, {})).toMatch(/te \[ \] aan de \[ \], .*KvK-nummer \[ \], te dezen rechtsgeldig vertegenwoordigd door de ondertekenaar;/);
  });

  it("controleert de gegevens van de klant zoals de database", () => {
    const goed = normaliseerOpdrachtgever({ naam: " Jansen  B.V. ", adres: "Markt 1", postcode: "5611aa", plaats: "Eindhoven", kvk: "1234 5678", onbekend: "x" });
    expect(goed).toEqual({ naam: "Jansen B.V.", adres: "Markt 1", postcode: "5611AA", plaats: "Eindhoven", kvk: "12345678" });
    expect(opdrachtgeverFout(goed)).toBeNull();
    expect(opdrachtgeverFout({ ...goed, naam: "" })).toBe("organisatie-naam");
    expect(opdrachtgeverFout({ ...goed, postcode: "" })).toBe("organisatie-adres");
    expect(opdrachtgeverFout({ ...goed, kvk: "1234567" })).toBe("organisatie-kvk");
    expect(opdrachtgeverFout({ ...goed, kvk: undefined })).toBe("organisatie-kvk");
  });

  it("splitst postcode en plaats", () => {
    expect(postcodePlaats("5611 NB Eindhoven")).toEqual({ postcode: "5611 NB", plaats: "Eindhoven" });
    expect(postcodePlaats("5611nb 's-Hertogenbosch")).toEqual({ postcode: "5611NB", plaats: "'s-Hertogenbosch" });
    expect(postcodePlaats("Eindhoven")).toEqual({ postcode: "", plaats: "Eindhoven" });
  });
});

describe("looptijd", () => {
  it("begint standaard de eerste van de volgende maand en loopt een jaar", () => {
    expect(standaardIngang(new Date("2026-11-03T10:00:00Z"))).toBe("2026-12-01");
    expect(standaardIngang(new Date("2026-12-31T23:30:00Z"))).toBe("2027-02-01"); // al 1 januari in Nederland
    expect(standaardEinde("2026-12-01")).toBe("2027-11-30");
    expect(standaardEinde("2027-03-01")).toBe("2028-02-29");
  });

  it("rekent met de laatste dag van de maand", () => {
    expect(plusMaanden("2027-01-31", 1)).toBe("2027-02-28");
    expect(plusMaanden("2027-11-30", -3)).toBe("2027-08-30");
  });

  it("noemt de looptijd", () => {
    expect(looptijdMaanden("2026-12-01", "2027-11-30")).toBe(12);
    expect(looptijdTekst("2026-12-01", "2027-11-30")).toBe("1 jaar");
    expect(looptijdTekst("2026-12-01", "2028-11-30")).toBe("2 jaar");
    expect(looptijdTekst("2026-12-01", "2027-05-31")).toBe("6 maanden");
    expect(looptijdTekst("2026-12-15", "2027-03-02")).toBe("15 december 2026 tot en met 2 maart 2027");
  });

  it("verlengt stilzwijgend met 12 maanden en zegt tot wanneer je kunt opzeggen", () => {
    expect(looptijdNu("2026-12-01", "2027-11-30", "2027-06-01")).toEqual({ begonnen: true, periodeEinde: "2027-11-30", verlengd: 0, opzeggenUiterlijk: "2027-08-30" });
    expect(looptijdNu("2026-12-01", "2027-11-30", "2027-12-05")).toEqual({ begonnen: true, periodeEinde: "2028-11-30", verlengd: 1, opzeggenUiterlijk: "2028-08-30" });
    expect(looptijdNu("2026-12-01", "2027-11-30", "2026-11-20").begonnen).toBe(false);
  });
});

describe("de resellerovereenkomst", () => {
  const s = contractStructuur(RESELLER_STANDAARD);
  const on = opdrachtnemerUit({ addressLine1: "Stratumsedijk 29", addressLine2: "5611 NB Eindhoven", kvk: "95076824", phoneDisplay: "085 - 620 58 00" });

  it("heeft de overwegingen A tot en met E en de elf artikelen van het Word-bestand", () => {
    expect(s.overwegingenKop).toBe("Overwegingen");
    expect(s.overwegingen.map((o) => o.letter)).toEqual(["A", "B", "C", "D", "E"]);
    expect(s.artikelen.map((a) => `${a.nr} ${a.titel}`)).toEqual([
      "1 Definities",
      "2 Vrije samenwerking en aanbrengen van Klanten",
      "3 Vergoeding",
      "4 Facturatie en betaling",
      "5 Uitgangspunten voor Reseller",
      "6 Uitgangspunten voor React2u",
      "7 Naam, merk en privacy",
      "8 Duur en beëindiging",
      "9 Geheimhouding",
      "10 Aansprakelijkheid",
      "11 Slotbepalingen",
    ]);
    expect(s.artikelen[1].bepalingen.map((b) => b.nr)).toEqual(["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"]);
  });

  it("houdt a en b bij 3.1", () => {
    const b = s.artikelen[2].bepalingen[0];
    expect(b.nr).toBe("3.1");
    expect(b.alineas).toEqual([
      "Voor iedere Klant ontvangt Reseller een vergoeding op basis van het Aansluittarief dat React2u aan die Klant factureert:",
      "a. eerste Contractjaar: 50% van het Aansluittarief;",
      "b. ieder volgend Contractjaar: 25% van het Aansluittarief.",
    ]);
  });

  it("verliest geen woord: alle tekst staat in de structuur", () => {
    const woorden = (t: string) => t.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim();
    const terug = [
      s.overwegingenKop,
      ...s.overwegingen.map((o) => `${o.letter}. ${o.alineas.join(" ")}`),
      ...s.artikelen.flatMap((a) => [`${a.nr}. ${a.titel}`, ...a.bepalingen.map((b) => `${b.nr}. ${b.alineas.join(" ")}`)]),
    ].join(" ");
    expect(woorden(terug)).toBe(woorden(RESELLER_STANDAARD));
  });

  it("de percentages in 3.1 horen bij de partner en tellen niet als afwijking", () => {
    expect(resellerVergoeding(RESELLER_STANDAARD)).toEqual({ jaarEen: "50", vervolg: "25" });
    const spine = resellerTekst({ jaarEen: 50, vervolg: 50 });
    expect(resellerVergoeding(spine)).toEqual({ jaarEen: "50", vervolg: "50" });
    expect(spine).toContain("b. ieder volgend Contractjaar: 50% van het Aansluittarief.");
    expect(resellerVergoeding(resellerTekst({ jaarEen: 37.5, vervolg: 20 }))).toEqual({ jaarEen: "37,5", vervolg: "20" });
    expect(wijktAf(spine, "reseller")).toBe(false);
    expect(wijktAf(RESELLER_STANDAARD, "reseller")).toBe(false);
    expect(wijktAf(RESELLER_STANDAARD.replace("één maand", "twee maanden"), "reseller")).toBe(true);
    // De andere soort is wel een afwijking.
    expect(wijktAf(RESELLER_STANDAARD)).toBe(true);
    expect(wijktAf(CONTRACT_STANDAARD, "reseller")).toBe(true);
  });

  it("andere percentages in een aangepaste tekst", () => {
    const aangepast = `${RESELLER_STANDAARD}\n\n## 12. Extra\n\n12.1. Iets anders.`;
    expect(resellerVergoeding(metVergoeding(aangepast, { jaarEen: 40, vervolg: "22,5" }))).toEqual({ jaarEen: "40", vervolg: "22,5" });
    expect(metVergoeding("Geen artikel 3.1", { jaarEen: 40, vervolg: 20 })).toBe("Geen artikel 3.1");
  });

  it("de partijen in de bewoording van het Word-bestand", () => {
    const [react2u, reseller] = comparities(
      "reseller", on,
      { naam: "Jouw HR Partner B.V.", adres: "Kerkstraat 1", postcode: "5611 AA", plaats: "Eindhoven", kvk: "12345678", email: "info@jouwhr.test", telefoon: "040 123 45 67" },
      { naam: "Sanne de Vries", functie: "eigenaar" },
    );
    expect(react2u).toBe(
      "React2u II B.V., handelend onder de naam React2u, gevestigd aan de Stratumsedijk 29, 5611 NB Eindhoven, ingeschreven bij de Kamer van Koophandel onder nummer 95076824, rechtsgeldig vertegenwoordigd door de heer R. van Eyck, e-mail sales@react2u.nl, telefoon 085 620 58 00, hierna: React2u;",
    );
    expect(reseller).toBe(
      "Jouw HR Partner B.V., gevestigd aan Kerkstraat 1, 5611 AA Eindhoven, ingeschreven bij de Kamer van Koophandel onder nummer 12345678, rechtsgeldig vertegenwoordigd door Sanne de Vries, e-mail info@jouwhr.test, telefoon 040 123 45 67, hierna: Reseller;",
    );
    expect(comparities("reseller", on, { naam: "Jouw HR Partner" }, {})[1]).toMatch(/^Jouw HR Partner, gevestigd aan \[ \], \[ \], .*door \[ \], e-mail \[ \], telefoon \[ \], hierna: Reseller;$/);
    expect(react2uPartij("reseller", on)).toBe("React2u II B.V. h.o.d.n. React2u");
    expect(react2uPartij("basiscontract", on)).toBe("React2u");
  });

  it("vraagt van de reseller ook mail en telefoon, zoals de database", () => {
    const og = normaliseerOpdrachtgever({ naam: "Jouw HR Partner B.V.", adres: "Kerkstraat 1", postcode: "5611 AA", plaats: "Eindhoven", kvk: "12345678", email: " Info@JouwHR.test ", telefoon: "040 123 45 67" });
    expect(og.email).toBe("info@jouwhr.test");
    expect(opdrachtgeverFout(og, "reseller")).toBeNull();
    expect(opdrachtgeverFout({ ...og, email: "" }, "reseller")).toBe("organisatie-email");
    expect(opdrachtgeverFout({ ...og, telefoon: "040 12" }, "reseller")).toBe("organisatie-telefoon");
    // Voor een basiscontract tellen mail en telefoon niet.
    expect(opdrachtgeverFout({ ...og, email: "", telefoon: "" })).toBeNull();
  });

  it("in het kort en de kerngegevens: de vergoeding van de partner, onbepaalde tijd", () => {
    const c = { soort: "reseller" as const, ingangsdatum: null, einddatum: null, tekst: resellerTekst({ jaarEen: 50, vervolg: 50 }) };
    const kort = contractKort(c);
    expect(kort[0]).toBe("Per aangebrachte klant 50% van het aansluittarief in het eerste contractjaar en 50% in elk jaar daarna");
    expect(kort).toHaveLength(5);
    expect(contractFeiten(c).map((f) => [f.label, f.waarde])).toEqual([["Vergoeding", "50% en 50%"], ["Looptijd", "Onbepaalde tijd"], ["Opzegtermijn", "1 maand"]]);
    expect(contractFeiten({ ...c, ingangsdatum: "2026-11-04" })[1]).toEqual({ label: "Ingangsdatum", waarde: "4 november 2026", sub: "voor onbepaalde tijd" });
    expect(contractKort({ ...c, tekst: `${c.tekst}\n\n## 12. Extra\n\n12.1. Iets anders.` })).toHaveLength(1);
    expect(looptijdZin({ ...c, ingangsdatum: "2026-11-04" })).toBe("onbepaalde tijd, vanaf 4 november 2026");
  });

  it("geen looptijd nodig om te versturen, wel voor een basiscontract", () => {
    const basis = { bedrijf: "Jouw HR Partner", email: null, tekst: RESELLER_STANDAARD, opdrachtnemer: on, ingangsdatum: null, einddatum: null };
    expect(controleerContract({ ...basis, soort: "reseller" })).toEqual([]);
    expect(controleerContract(basis)).toContain("De einddatum moet na de ingangsdatum liggen.");
  });

  it("soort, inhoud en bestandsnaam", () => {
    expect(soortVan({ soort: "reseller" })).toBe("reseller");
    expect(soortVan({})).toBe("basiscontract");
    expect(soortVan(null)).toBe("basiscontract");
    expect(contractInhoud({ soort: "reseller", tekst: null, ingangsdatum: null, einddatum: null, bedrijf: "X" }).artikelen).toHaveLength(11);
    expect(contractInhoud({ soort: "reseller", tekst: RESELLER_STANDAARD, aanvullend: "Iets extra.", ingangsdatum: null, einddatum: null, bedrijf: "X" }).artikelen[11])
      .toMatchObject({ nr: "12", titel: "Aanvullende afspraken" });
    expect(contractPdfNaam({ nummer: "C2026-0004", bedrijf: "Jouw HR Partner", soort: "reseller" })).toBe("Resellerovereenkomst C2026-0004 Jouw HR Partner (getekend).pdf");
    expect(contractPdfNaam({ nummer: "C2026-0001", bedrijf: "Jansen" }, "concept")).toBe("Basiscontract C2026-0001 Jansen (concept).pdf");
  });
});
