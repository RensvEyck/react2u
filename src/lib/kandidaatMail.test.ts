import { describe, expect, it } from "vitest";
import {
  SJABLONEN, alineasUitTekst, briefAlsTekst, groetVoor, mailVoorstel, openPlek, stelOp, voornaamUitEmail,
} from "./kandidaatMail";

const basis = { naam: "Yasmin El Amrani", vacature: "Casemanager verzuim", afzender: "Rens" };

describe("vaste mails aan kandidaten", () => {
  it("spreekt de kandidaat aan met de voornaam en ondertekent met de collega", () => {
    const b = stelOp("afwijzing", basis);
    expect(b.aanhef).toBe("Hoi Yasmin,");
    expect(b.groet).toEqual(["Groet,", "Rens", "React2u · 085 - 620 58 00"]);
    expect(b.onderwerp).toBe("Je sollicitatie bij React2u");
    expect(b.alineas[0]).toContain("sollicitatie als Casemanager verzuim");
  });

  it("een open sollicitatie heet ook zo", () => {
    expect(stelOp("afwijzing", { ...basis, vacature: null }).alineas[0]).toContain("je open sollicitatie");
    expect(stelOp("aanbod", { ...basis, vacature: null }).alineas[0]).toBe("We hebben goed nieuws: we willen je graag een aanbod doen.");
  });

  it("de bewaarzin volgt de toestemming van de kandidaat", () => {
    expect(stelOp("afwijzing", basis).alineas.join(" ")).toContain("verwijderen we na afloop van de procedure");
    expect(stelOp("afwijzing", { ...basis, retainLonger: true }).alineas.join(" ")).toContain("een jaar te bewaren");
  });

  it("de tekst om te bewerken komt na het versturen terug als dezelfde alinea's", () => {
    const b = stelOp("uitnodiging", { ...basis, moment: "donderdag om 10.00 uur" });
    const tekst = briefAlsTekst(b);
    expect(tekst.startsWith("Hoi Yasmin,\n\nBedankt voor je sollicitatie")).toBe(true);
    expect(alineasUitTekst(tekst)).toEqual([b.aanhef, ...b.alineas]);
    expect(b.alineas.some((a) => a === "")).toBe(false);
  });

  it("een aangepaste tekst: witregel is een nieuwe alinea, een enkele regelovergang blijft", () => {
    expect(alineasUitTekst("Hoi Tom,\r\n\r\nRegel één  \nregel twee\n \n\n\nLaatste alinea.\n")).toEqual([
      "Hoi Tom,", "Regel één\nregel twee", "Laatste alinea.",
    ]);
    expect(alineasUitTekst("  \n\n ")).toEqual([]);
  });

  it("een leeg veld staat als plek in de tekst, en die wordt gevonden", () => {
    const leeg = briefAlsTekst(stelOp("uitnodiging", basis));
    expect(leeg).toContain("We nodigen je uit voor een gesprek op [moment], bij ons op kantoor");
    expect(openPlek(leeg)).toBe("[moment]");
    expect(openPlek(briefAlsTekst(stelOp("uitnodiging", { ...basis, moment: "morgen" })))).toBeNull();
    expect(openPlek(briefAlsTekst(stelOp("tussenbericht", basis)))).toBeNull(); // heeft een standaard
    expect(openPlek(briefAlsTekst(stelOp("afwijzing", basis)))).toBeNull();
  });

  it("de groet volgt de taal en valt zonder naam terug op React2u", () => {
    expect(groetVoor("nl", " Cindy ")).toEqual(["Groet,", "Cindy", "React2u · 085 - 620 58 00"]);
    expect(groetVoor("en", "")).toEqual(["Kind regards,", "React2u", "React2u · +31 85 620 58 00"]);
  });

  it("vult de standaardlocatie in de taal van de kandidaat in", () => {
    const nl = stelOp("uitnodiging", { ...basis, moment: "donderdag om 10.00 uur" });
    expect(nl.alineas[1]).toBe("We nodigen je uit voor een gesprek op donderdag om 10.00 uur, bij ons op kantoor aan de Stratumsedijk 29 in Eindhoven.");
    const en = stelOp("uitnodiging", { ...basis, taal: "en", moment: "Thursday at 10:00" });
    expect(en.aanhef).toBe("Hi Yasmin,");
    expect(en.onderwerp).toBe("Invitation to an introductory meeting at React2u");
    expect(en.alineas[1]).toContain("at our office at Stratumsedijk 29 in Eindhoven");
    expect(en.groet[0]).toBe("Kind regards,");
  });

  it("elk sjabloon heeft in beide talen een onderwerp en tekst", () => {
    for (const s of SJABLONEN) {
      for (const taal of ["nl", "en"] as const) {
        const b = stelOp(s.key, { ...basis, taal, moment: "x", uiterlijk: "y" });
        expect(b.onderwerp.length).toBeGreaterThan(10);
        expect(b.alineas.length).toBeGreaterThanOrEqual(3);
        expect(b.alineas.join(" ")).not.toContain("undefined");
      }
    }
  });

  it("stelt het sjabloon voor dat bij de fase past, en mist een afwijzing", () => {
    expect(mailVoorstel("nieuw", [])).toEqual({ voorstel: "uitnodiging" });
    expect(mailVoorstel("gesprek", [{ sjabloon: "uitnodiging" }])).toEqual({ voorstel: "tweede_gesprek" });
    expect(mailVoorstel("aanbod", [])).toEqual({ voorstel: "aanbod" });
    expect(mailVoorstel("afgewezen", [])).toEqual({ voorstel: "afwijzing", herinnering: "Nog geen afwijzing gemaild" });
    expect(mailVoorstel("afgewezen", [{ sjabloon: "uitnodiging" }])).toEqual({
      voorstel: "afwijzing_na_gesprek", herinnering: "Nog geen afwijzing gemaild",
    });
    expect(mailVoorstel("afgewezen", [{ sjabloon: "afwijzing" }])).toEqual({ voorstel: "afwijzing" });
  });

  it("haalt een voornaam uit een e-mailadres", () => {
    expect(voornaamUitEmail("rens@react2u.nl")).toBe("Rens");
    expect(voornaamUitEmail("cindy.jansen@react2u.nl")).toBe("Cindy");
    expect(voornaamUitEmail("@react2u.nl")).toBe("");
  });
});
