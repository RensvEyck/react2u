import { describe, expect, it } from "vitest";
import {
  actieSleutel, CHECKLIST_KOLOMMEN, CHECKLIST_KOP, CHECKLIST_TITEL, CHECKLIST_VRAGEN, checklistBegin, checklistPdfNaam, checklistVoortgang, controleerChecklist,
  datumSleutel, heeftChecklist, schoonChecklist, voortgangTekst,
} from "./contractChecklist";

/** De tekst van het Word-bestand "Checklist arbeidsomstandigheden - inventarisatie", alinea voor alinea in de volgorde van het document. */
const WORD = `Checklist arbeidsomstandigheden wet
Plaats
Bedrijf
Datum
Naam
Functie
Verplichte onderdelen basiscontract
Actiepunten en afspraken
Datum afronding actie
Wie is de verantwoordelijke interne casemanager voor de verzuimende werknemers?
Is er overeenstemming met de werknemersvertegenwoordiging over de volledige inhoud en uitvoering van de arbeidsomstandighedenbeleid en ziekteverzuimbegeleiding
Is uw verzuimprotocol voorzien van de laatste wet en regelgeving en uw bedrijfsvoorwaarden.
Is er een actuele RI&E aanwezig en is deze getoetst door een kerndeskundige.
Zijn eventuele punten die naar voren komen vanuit de R&IE en genoemd in
het plan van aanpak opgelost of loopt daar een planning voor? Hoe verloopt
de waarborging van deze verbeterpunten?
De bedrijfsarts of kerndeskundige van React2u zal de bestaande RI&E en het bestaande PAGO beleid beoordelen en een advies uitbrengen over de nog uit te voeren zaken.
Wijzen op de klachtenregeling en waar deze procedure terug te vinden is.
Wie is de preventiemedewerker binnen uw organisatie?
Iedere organisatie moet 1 preventiemedewerker aanstellen. Bij een bedrijf met minder dan 25 werknemers mag dit ook de directeur zijn.
Op welke wijze is de preventiemedewerker in uw organisatie getraind en geschoold?
Heeft u interesse in een dergelijke training?`;

const woorden = (t: string) => t.replace(/\s+/g, " ").trim();

describe("de tekst van de checklist", () => {
  it("heeft de acht onderdelen van het Word-bestand, in die volgorde", () => {
    expect(CHECKLIST_VRAGEN.map((q) => q.id)).toEqual(["casemanager", "overeenstemming", "protocol", "rie", "beoordeling", "klachtenregeling", "preventiemedewerker", "training"]);
    expect(CHECKLIST_KOLOMMEN).toEqual(["Verplichte onderdelen basiscontract", "Actiepunten en afspraken", "Datum afronding actie"]);
    expect(CHECKLIST_KOP.map((v) => v.label)).toEqual(["Plaats", "Bedrijf", "Datum", "Naam", "Functie"]);
  });

  it("verliest geen woord: alle tekst uit het Word-bestand staat erin, in dezelfde volgorde", () => {
    const terug = [
      CHECKLIST_TITEL,
      ...CHECKLIST_KOP.map((v) => v.label),
      ...CHECKLIST_KOLOMMEN,
      ...CHECKLIST_VRAGEN.flatMap((q) => [...q.alineas, ...(q.toelichting ? [q.toelichting] : [])]),
    ].join(" ");
    expect(woorden(terug)).toBe(woorden(WORD));
  });

  it("zet de toelichting van het Word-bestand bij de preventiemedewerker, in de kolom actiepunten", () => {
    expect(CHECKLIST_VRAGEN.filter((q) => q.toelichting).map((q) => q.id)).toEqual(["preventiemedewerker"]);
  });

  it("de kop vraagt wie invult (naam), de rest mag leeg", () => {
    expect(CHECKLIST_KOP.filter((v) => v.verplicht).map((v) => v.naam)).toEqual(["naam"]);
  });
});

describe("antwoorden schoonmaken en controleren", () => {
  it("houdt alleen bekende sleutels, getrimd en ingekort", () => {
    const d = schoonChecklist({
      naam: "  Marieke Jansen ", bedrijf: "Bakkerij", plaats: "Eindhoven", datum: "2026-11-17", functie: "", onbekend: "x",
      [actieSleutel("casemanager")]: "Piet  de Vries,\r\nHR", [datumSleutel("casemanager")]: "2026-12-01", [actieSleutel("training")]: "a".repeat(3000),
    });
    expect(d).toEqual({
      naam: "Marieke Jansen", bedrijf: "Bakkerij", plaats: "Eindhoven", datum: "2026-11-17",
      casemanager_actie: "Piet de Vries,\nHR", casemanager_datum: "2026-12-01", training_actie: "a".repeat(2000),
    });
    expect(schoonChecklist(null)).toEqual({});
    expect(schoonChecklist("tekst")).toEqual({});
  });

  it("weigert een lege checklist en een ontbrekende naam", () => {
    expect(controleerChecklist({})).toEqual({ naam: expect.stringContaining("naam"), leeg: expect.stringContaining("minstens één onderdeel") });
    expect(controleerChecklist({ naam: "Marieke", casemanager_actie: "Piet" })).toEqual({});
    expect(controleerChecklist({ naam: "Marieke", casemanager_datum: "2026-12-01" })).toEqual({});
  });

  it("controleert de datums", () => {
    expect(controleerChecklist({ naam: "Marieke", datum: "17-11-2026", casemanager_actie: "Piet" })).toEqual({ datum: "Deze datum klopt niet." });
    expect(controleerChecklist({ naam: "Marieke", rie_datum: "2026-02-30" })).toEqual({ rie_datum: "Deze datum klopt niet." });
    expect(controleerChecklist({ naam: "Marieke", rie_datum: "1999-12-31" })).toEqual({ rie_datum: "Deze datum klopt niet." });
    expect(controleerChecklist({ naam: "Marieke", rie_datum: "2027-01-31" })).toEqual({});
  });

  it("telt de beantwoorde onderdelen", () => {
    expect(checklistVoortgang(null)).toEqual({ beantwoord: 0, totaal: 8 });
    expect(checklistVoortgang({ naam: "x", casemanager_actie: "Piet", rie_datum: "2026-12-01", training_actie: "ja" })).toEqual({ beantwoord: 3, totaal: 8 });
    expect(voortgangTekst({ casemanager_actie: "Piet" })).toBe("1 van 8 onderdelen beantwoord");
  });
});

describe("hulp voor de pagina's", () => {
  it("alleen een basiscontract heeft de checklist", () => {
    expect(heeftChecklist({ soort: "basiscontract" })).toBe(true);
    expect(heeftChecklist({})).toBe(true);
    expect(heeftChecklist({ soort: "reseller" })).toBe(false);
    expect(heeftChecklist(null)).toBe(true);
  });

  it("begint met het bedrijf, de contactpersoon en de vestigingsplaats uit het contract, of met wat er al staat", () => {
    expect(checklistBegin({ bedrijf: "Bakkerij", contactpersoon: "Marieke Jansen", opdrachtgever: { naam: "Bakkerij B.V.", plaats: "Eindhoven" } }, null)).toEqual({
      bedrijf: "Bakkerij B.V.", naam: "Marieke Jansen", plaats: "Eindhoven",
    });
    expect(checklistBegin({ bedrijf: "Bakkerij" }, null)).toEqual({ bedrijf: "Bakkerij" });
    const stand = { data: { naam: "Piet", bedrijf: "Anders" }, door: "Piet", ingevuld_at: "2026-11-17T10:00:00Z", bijgewerkt_at: "2026-11-17T10:00:00Z", versie: 1 };
    expect(checklistBegin({ bedrijf: "Bakkerij", contactpersoon: "Marieke" }, stand)).toEqual({ naam: "Piet", bedrijf: "Anders" });
  });

  it("geeft de pdf een nette naam", () => {
    expect(checklistPdfNaam({ nummer: "C2026-0001", bedrijf: "Bakkerij Jansen / Zn" }, true)).toBe("Checklist arbeidsomstandigheden C2026-0001 Bakkerij Jansen Zn (ingevuld).pdf");
    expect(checklistPdfNaam({ nummer: "C2026-0001", bedrijf: "Bakkerij" }, false)).toBe("Checklist arbeidsomstandigheden C2026-0001 Bakkerij (leeg).pdf");
  });
});
