import { describe, expect, it } from "vitest";
import { alleModules, catalogusStandaard, MODULES_SECTIE, ruimModulesOp, vernieuwModules } from "./offerteCatalogus";
import { alleSjablonen, aantalOnderdelen } from "./offerteSjablonen";
import {
  bedragTekst, berekenTotalen, DIENSTLABEL, geldigeKeuze, herstelKeuze, normaliseerRegels, standaardKeuze, VORM_KEYS, wissel, type Regel,
} from "./offertes";

describe("alle modules (Rens, 2 nov 2026: de klant klikt zelf alle modules aan)", () => {
  const catalogus = catalogusStandaard();
  const zoek = (regels: Regel[], naam: string) => regels.find((r) => r.naam === naam)!;

  it("elke vorm biedt de diensten van alle zes labels aan, het eigen label vooraan", () => {
    for (const vorm of VORM_KEYS) {
      const m = alleModules(vorm, catalogus);
      const labels = [...new Set(m.map((r) => r.label))];
      expect(labels).toHaveLength(6);
      expect(labels[0]).toBe(DIENSTLABEL[vorm]);
      for (const r of m) expect(r).toMatchObject({ soort: "optie", module: true, sectie: MODULES_SECTIE });
      expect(m.some((r) => r.aan)).toBe(false);
    }
  });

  it("niet de dienst die de offerte zelf is, en geen tweede aansluiting bij verzuimbegeleiding", () => {
    expect(alleModules("rie", catalogus).map((r) => r.naam)).not.toContain("Risico-inventarisatie en -evaluatie (RI&E)");
    expect(alleModules("spoor2", catalogus).map((r) => r.naam)).not.toContain("Spoor 2, eerste zes maanden");
    const s = alleSjablonen(catalogus).find((x) => x.sleutel === "verzuim-keuze")!;
    expect(s.regels.filter((r) => r.module).map((r) => r.naam)).not.toContain("Casemanagement Compleet");
    // Wat als aanbevolen extra al in de offerte staat, komt er niet nog eens bij.
    const namen = s.regels.map((r) => r.naam);
    expect(namen.filter((n) => n === "Loopbaanscan")).toHaveLength(1);
  });

  it("wat aanzetten betekent: vaste prijs telt mee, tarief bij gebruik niet, op aanvraag is een voorstel", () => {
    const m = alleModules("rie", catalogus);
    const coaching = zoek(m, "Coaching");
    const training = zoek(m, "Training Leiderschap en Management");
    const melding = zoek(m, "Ziek- en herstelmelding");
    const erd = zoek(m, "Eigenrisicodragerschap Ziektewet");
    const whk = zoek(m, "Whk-check en bezwaar");
    const hr = zoek(m, "HR-advies op afroep");
    const zieken = zoek(m, "Verloning zieke medewerkers");
    expect(coaching.bijGebruik).toBeUndefined();
    expect(training).toMatchObject({ bijGebruik: true, prijs: 240, eenheid: "uur" });
    expect(melding).toMatchObject({ bijGebruik: true, prijsTekst: "€20 per ziekmelding" });
    expect(erd).toMatchObject({ bijGebruik: true, prijsTekst: "€95 per dossier per maand" });
    expect(whk).toMatchObject({ eenheid: "eenmalig", prijs: 495 });
    expect(whk.bijGebruik).toBeUndefined();
    expect(hr.prijs).toBeNull();
    expect(zieken).toMatchObject({ bijGebruik: true, prijsTekst: "6%" });

    const t = berekenTotalen(m, [coaching.id, training.id, melding.id, erd.id, whk.id, hr.id, zieken.id], 20);
    expect(t.eenmalig).toBe(1975 + 495);
    expect(t.perMaand).toBe(0);
    expect(t.regels).toHaveLength(7);
    const tekst = (r: Regel) => bedragTekst(t.regels.find((x) => x.regel.id === r.id)!);
    expect(tekst(coaching)).toBe("€1.975 eenmalig");
    expect(tekst(training)).toBe("€240 per uur");
    expect(tekst(melding)).toBe("€20 per ziekmelding");
    expect(tekst(hr)).toBe("Op aanvraag");
  });

  it("per medewerker per jaar rekent per maand mee: salarisadministratie voor 42 medewerkers", () => {
    const m = alleModules("rie", catalogus);
    const t = berekenTotalen(m, [zoek(m, "Salarisadministratie, maandverloning").id], 42);
    expect(t.perMaand).toBe(441);
  });

  it("Casemanagement Reflex (Rens, 2 nov 2026): €15 per medewerker per jaar telt mee, de €20 per ziekmelding staat erbij", () => {
    const m = alleModules("verzuimbegeleiding", catalogus);
    const reflex = zoek(m, "Casemanagement Reflex");
    expect(reflex).toMatchObject({ label: "React2u Reflex", prijs: 15, eenheid: "medewerker_jaar", soort: "optie", module: true });
    expect(reflex.bijGebruik).toBeUndefined();
    expect(reflex.groep).toBeUndefined();
    expect(reflex.omschrijving).toContain("HRM-systeem");
    expect(reflex.omschrijving).toContain("€20 per ziekmelding");
    // Een losse module: naast de aansluiting aan te zetten, niet in plaats ervan.
    const t = berekenTotalen(m, [reflex.id], 40);
    expect(t.perMaand).toBe(50);
    expect(bedragTekst(t.regels[0])).toBe("€50 per maand");
  });

  it("één aansluiting en één manier van verlonen: de tweede zet de eerste uit", () => {
    const m = alleModules("rie", catalogus);
    const basis = zoek(m, "Verrichtingenbasis");
    const compleet = zoek(m, "Casemanagement Compleet");
    const maand = zoek(m, "Salarisadministratie, maandverloning");
    const vier = zoek(m, "Salarisadministratie, vierwekelijks");
    let k = wissel(m, [], basis.id);
    k = wissel(m, k, maand.id);
    k = wissel(m, k, compleet.id);
    expect(k).toEqual([maand.id, compleet.id]);
    k = wissel(m, k, vier.id);
    expect(k).toEqual([compleet.id, vier.id]);
    k = wissel(m, k, vier.id);
    expect(k).toEqual([compleet.id]);
    // Een opgeslagen keuze met twee uit één groep: de eerste telt.
    expect(herstelKeuze(m, [basis.id, compleet.id])).toEqual([basis.id]);
    expect(standaardKeuze(m.map((r) => (r.groep ? { ...r, aan: true } : r))).filter((id) => [basis.id, compleet.id].includes(id))).toEqual([basis.id]);
  });

  it("de database-keuze laat modules gewoon door (geen eigen groepsregel in SQL)", () => {
    const m = alleModules("pago", catalogus);
    const ids = m.slice(0, 3).map((r) => r.id);
    expect(geldigeKeuze(m, ids)).toEqual(ids);
  });

  it("de markeringen blijven bij opslaan bewaard, alleen bij een optie", () => {
    const m = alleModules("rie", catalogus);
    const terug = normaliseerRegels(JSON.parse(JSON.stringify(m)));
    expect(terug).toEqual(m);
    const [v] = normaliseerRegels([{ naam: "Intake", prijs: 495, eenheid: "eenmalig", soort: "vast", module: true, bijGebruik: true, groep: "x" }]);
    expect(v.module).toBeUndefined();
    expect(v.bijGebruik).toBeUndefined();
    expect(v.groep).toBeUndefined();
  });

  it("vernieuwen houdt ids en wat aan stond; een gewoon onderdeel met dezelfde naam wint", () => {
    const m = alleModules("rie", catalogus);
    const coaching = zoek(m, "Coaching");
    const met = [...m.map((r) => (r.id === coaching.id ? { ...r, aan: true } : r))];
    const nieuw = vernieuwModules("spoor2", catalogus, met);
    expect(zoek(nieuw, "Coaching")).toMatchObject({ id: coaching.id, aan: true });
    expect(nieuw[0].label).toBe("React2u Restart");
    const eigen: Regel = { id: "e1", sectie: "Offerte", naam: "Coaching", prijs: 1800, eenheid: "traject", soort: "vast" };
    const opgeruimd = ruimModulesOp([...m, eigen]);
    expect(opgeruimd.filter((r) => r.naam === "Coaching")).toEqual([eigen]);
    expect(opgeruimd[0]).toBe(eigen);
  });

  it("een sjabloon telt de modules niet als onderdelen en het startbedrag blijft gelijk", () => {
    const s = alleSjablonen(catalogus).find((x) => x.sleutel === "rie")!;
    expect(s.regels.filter((r) => r.module).length).toBeGreaterThan(30);
    expect(aantalOnderdelen(s.regels)).toBe("1 onderdeel");
    expect(berekenTotalen(s.regels, standaardKeuze(s.regels), null).eenmalig).toBe(2825);
  });

  it("alles past in één offerte (de database staat 200 regels toe)", () => {
    for (const s of alleSjablonen(catalogus)) expect(s.regels.length).toBeLessThanOrEqual(120);
  });
});
