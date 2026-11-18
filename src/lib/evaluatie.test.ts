import { describe, expect, it } from "vitest";
import {
  aandachtspunten, CHECKLIST, CHECKLIST_SLEUTELS, controleerAntwoorden, controleerEvaluatie, evaluatieWeergave, heeftToelichting, schoonAntwoorden, telling,
  voortgang, VRIJE_VELDEN,
} from "./evaluatie";

const alles = Object.fromEntries(CHECKLIST_SLEUTELS.map((s) => [s, { antwoord: "ja" }]));

describe("de tekst van het document", () => {
  it("heeft de negen punten van de checklist, in de volgorde van het Word-bestand", () => {
    expect(CHECKLIST.map((p) => p.titel)).toEqual([
      "RI&E", "PSA", "AANSTELLINGSKEURING (van toepassing)", "VRIJE TOEGANG BEDRIJFSARTS (open spreekuur)", "PMO", "PREVENTIE MEDEWERKER",
      "ONDERNEMINGSRAAD", "KLACHTENPROCEDURE", "VERZUIMPROTOCOL",
    ]);
  });
  it("houdt de toelichting en de open vragen letterlijk", () => {
    expect(CHECKLIST[0].toelichting.startsWith("U heeft een actuele Risico-inventarisatie en -evaluatie (RI&E) met Plan van aanpak?")).toBe(true);
    expect(CHECKLIST.find((p) => p.sleutel === "preventiemedewerker")?.vragen?.map((v) => v.label)).toEqual([
      "Op welke wijze is de preventiemedewerker in uw organisatie getraind en geschoold?",
      "Heeft u interesse in een dergelijke training?",
    ]);
    expect(VRIJE_VELDEN.map((v) => v.titel)).toEqual(["Evaluatie dienstverlening (tevens wijzen op het KTO)", "Wensen komend jaar dienstverlening", "Gemaakte afspraken"]);
  });
});

describe("schoonAntwoorden", () => {
  it("houdt alleen bekende punten en geldige antwoorden over, getrimd", () => {
    const a = schoonAntwoorden({
      checklist: { rie: { antwoord: "ja", toelichting: "  Vorig jaar vernieuwd  " }, psa: { antwoord: "misschien" }, onzin: { antwoord: "ja" }, preventiemedewerker: { antwoord: "nee", vragen: { training: " Nog niet ", onbekend: "x" } } },
      evaluatie: " Prettig contact.\r\nSnelle reacties. ",
      volgend_bezoek: { datum: "2027-11-20", tijd: "10.00", tot: "" },
      acties: [{ actie: "RI&E actualiseren", door: "Fatima", status: "open" }, { actie: "", door: "", status: "" }],
      extra: "weg",
    });
    expect(a.checklist.rie).toEqual({ antwoord: "ja", toelichting: "Vorig jaar vernieuwd" });
    expect(a.checklist.psa).toBeUndefined();
    expect("onzin" in a.checklist).toBe(false);
    expect(a.checklist.preventiemedewerker).toEqual({ antwoord: "nee", vragen: { training: "Nog niet" } });
    expect(a.evaluatie).toBe("Prettig contact.\nSnelle reacties.");
    expect(a.volgend_bezoek).toEqual({ datum: "2027-11-20", tijd: "10.00" });
    expect(a.acties).toEqual([{ actie: "RI&E actualiseren", door: "Fatima", status: "open" }]);
    expect("extra" in a).toBe(false);
  });
  it("kort lange teksten in en begrenst het aantal acties", () => {
    const a = schoonAntwoorden({ wensen: "x".repeat(6000), acties: Array.from({ length: 20 }, (_, i) => ({ actie: `a${i}` })) });
    expect(a.wensen).toHaveLength(5000);
    expect(a.acties).toHaveLength(12);
  });
  it("geeft bij rommel een lege, geldige vorm", () => {
    expect(schoonAntwoorden(null)).toEqual({ checklist: {}, acties: [] });
    expect(schoonAntwoorden("tekst")).toEqual({ checklist: {}, acties: [] });
  });
});

describe("controleerAntwoorden", () => {
  it("vraagt een antwoord op elk punt van de checklist", () => {
    const f = controleerAntwoorden(schoonAntwoorden({ checklist: { rie: { antwoord: "ja" } } }));
    expect(Object.keys(f)).toHaveLength(8);
    expect(f["checklist.psa"]).toBe("Kies ja, nee of niet van toepassing.");
    expect(f["checklist.rie"]).toBeUndefined();
  });
  it("controleert de datum van het volgende bezoek", () => {
    expect(controleerAntwoorden(schoonAntwoorden({ checklist: alles, volgend_bezoek: { datum: "20-11-2027" } }))["volgend_bezoek.datum"]).toBe("Deze datum klopt niet.");
    expect(controleerAntwoorden(schoonAntwoorden({ checklist: alles, volgend_bezoek: { datum: "2027-11-20" } }))).toEqual({});
  });
});

describe("voortgang, telling en aandachtspunten", () => {
  const a = schoonAntwoorden({ checklist: { ...alles, psa: { antwoord: "nee" }, pmo: { antwoord: "nvt" }, verzuimprotocol: { antwoord: "nee" } } });
  it("telt de beantwoorde punten", () => {
    expect(voortgang(a)).toEqual({ klaar: 9, totaal: 9 });
    expect(voortgang(null)).toEqual({ klaar: 0, totaal: 9 });
  });
  it("telt per antwoord", () => {
    expect(telling(a)).toEqual({ ja: 6, nee: 2, nvt: 1 });
  });
  it("de aandachtspunten zijn de nee's, in de volgorde van het document", () => {
    expect(aandachtspunten(a).map((p) => p.naam)).toEqual(["PSA", "Verzuimprotocol"]);
  });
  it("weet of de klant meer invulde dan de checklist", () => {
    expect(heeftToelichting(a)).toBe(false);
    expect(heeftToelichting({ ...a, afspraken: "Volgend jaar weer." })).toBe(true);
    expect(heeftToelichting({ ...a, acties: [{ actie: "x", door: "", status: "" }] })).toBe(true);
  });
});

describe("status", () => {
  it("verstuurd en bekeken is klant bezig", () => {
    expect(evaluatieWeergave({ status: "verstuurd", bekeken_at: "2026-11-17T10:00:00Z" })).toBe("bekeken");
    expect(evaluatieWeergave({ status: "verstuurd", bekeken_at: null })).toBe("verstuurd");
    expect(evaluatieWeergave({ status: "ingevuld", bekeken_at: "2026-11-17T10:00:00Z" })).toBe("ingevuld");
  });
  it("versturen vraagt een bedrijf en een geldig e-mailadres", () => {
    expect(controleerEvaluatie({ bedrijf: "", email: null })).toHaveLength(1);
    expect(controleerEvaluatie({ bedrijf: "Acme", email: "geen-adres" })).toHaveLength(1);
    expect(controleerEvaluatie({ bedrijf: "Acme", email: "info@acme.test" })).toEqual([]);
  });
});
