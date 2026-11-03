import { describe, expect, it } from "vitest";
import tarievenJson from "@/content/tarieven.json";
import { halveKolom, prijslijstStandaard, prijslijstUit, prijsRijen } from "./brochurePrijslijst";
import { MERKEN } from "./offerteMerk";

const blok = (tarievenJson as { blocks: { type: string; data: Record<string, unknown> }[] }).blocks.find((b) => b.type === "dgTarieven")!.data;
const JAAR = { jaar: "2027", geldigTot: "31 december 2027" };

describe("brochurePrijslijst", () => {
  it("volgt de gedrukte prijslijst: drie aansluitingen, de uurtarieven en de zes labels in volgorde", () => {
    const p = prijslijstStandaard(JAAR);
    expect(p.jaar).toBe("2027");
    expect(p.geldigheid).toBe("Tarieven 2027, geldig tot en met 31 december 2027. Alle bedragen zijn exclusief btw.");
    expect(p.aansluitingen.map((a) => [a.naam, a.badge, a.prijs])).toEqual([
      ["Verrichtingenbasis", "Meest gekozen", "€38,50"],
      ["Casemanagement Compleet", "Pakket", "€139,50"],
      ["Grotere organisaties", "Maatwerk", "Op offerte"],
    ]);
    expect(p.aansluitingen.map((a) => [a.uitgelicht, a.bedrag])).toEqual([[true, true], [false, true], [false, false]]);
    expect(p.groepen.map((g) => g.naam)).toEqual(["Tarieven per uur", "Recover", "Resist", "Restart", "Reflex", "Ready", "Reward"]);
    expect(p.groepen.map((g) => g.id)).toEqual(["uur", "recover", "resist", "restart", "reflex", "ready", "reward"]);
    expect(p.maatwerk?.titel).toBe("Maatwerk en specialisten");
    expect(p.maatwerk?.tekst).toContain("arbeidshygiënist");
  });

  it("één lange lijst staat over twee kolommen, zoals de uurtarieven op papier (4 + 3)", () => {
    const p = prijslijstStandaard(JAAR);
    const uur = p.groepen[0];
    expect(uur.slug).toBeUndefined();
    expect(uur.metTitels).toBe(false);
    expect(uur.kolommen.map((k) => k.flatMap((l) => l.regels.map((r) => r.naam)))).toEqual([
      ["Casemanager", "Senior casemanager (interim)", "Casemanager taakdelegatie", "Ondersteuner bedrijfsarts (POH)"],
      ["Bedrijfsarts", "Vertrouwenspersoon", "Administratief medewerker"],
    ]);
    const ready = p.groepen.find((g) => g.slug === "ready")!;
    expect(ready.kolommen.map((k) => k[0].regels.length)).toEqual([4, 4]);
    expect(ready.kolommen.flat().flatMap((l) => l.regels).every((r) => !r.bedrag)).toBe(true);
  });

  it("een label met twee lijsten houdt zijn titels; uitlegkaarten van de site vallen weg", () => {
    const reflex = prijslijstStandaard(JAAR).groepen.find((g) => g.slug === "reflex")!;
    expect(reflex.metTitels).toBe(true);
    expect(reflex.kolommen.map((k) => k.map((l) => l.titel))).toEqual([["Per geval"], ["Abonnement"]]);
    expect(reflex.kolommen[1][0].regels[0]).toMatchObject({ naam: "Casemanagement Reflex", prijs: "€15", bedrag: true });
    expect(JSON.stringify(reflex)).not.toContain("Eigenrisicodrager of uitzendbureau?");
    expect(reflex.ondertitel).toBe("Voor uitzendbureaus · Betalen per geval, of met een abonnement");
  });

  it("bedragen en woorden: €, procenten en 'per uur' herkent hij goed", () => {
    const p = prijslijstStandaard(JAAR);
    const regels = p.groepen.flatMap((g) => g.kolommen.flat().flatMap((l) => l.regels));
    const vind = (naam: string) => regels.find((r) => r.naam === naam)!;
    expect(vind("Verloning zieke medewerkers")).toMatchObject({ prijs: "6%", bedrag: true });
    expect(vind("Telefonisch contact werknemer")).toMatchObject({ prijs: "per uur", bedrag: false });
    expect(vind("Spoor 2, eerste zes maanden")).toMatchObject({ prijs: "€3.365", bedrag: true });
    expect(vind("Keuringen bedrijfsarts").sub).toBe("Rijbewijs C, Code 95, aanstellings- en brandweerkeuring");
  });

  it("de uitgelichte aansluiting houdt zijn voorbeeld: wat je per verrichting betaalt", () => {
    const [basis, compleet] = prijslijstStandaard(JAAR).aansluitingen;
    expect(basis.voorbeeld?.kop).toBe("Wat je dan per verrichting betaalt");
    expect(basis.voorbeeld?.regels[0]).toEqual({ naam: "Casemanager", prijs: "€142,50 per uur" });
    expect(basis.punten).toHaveLength(3);
    expect(compleet.voorbeeld).toBeUndefined();
    expect(compleet.noot).toMatch(/^Niet inbegrepen/);
  });

  it("Reflex en Ready delen een rij, zoals op papier; de grote labels staan alleen", () => {
    const p = prijslijstStandaard(JAAR);
    expect(prijsRijen(p.groepen).map((r) => r.map((g) => g.id))).toEqual([["uur"], ["recover"], ["resist"], ["restart"], ["reflex", "ready"], ["reward"]]);
    // Op halve breedte: Ready weer als één lijst van acht, Reflex met zijn twee lijsten onder elkaar.
    const ready = p.groepen.find((g) => g.slug === "ready")!;
    expect(halveKolom(ready).map((l) => l.regels.length)).toEqual([8]);
    expect(halveKolom(ready)[0].regels[4].naam).toBe("Arbeidsrechtelijke ondersteuning");
    const reflex = p.groepen.find((g) => g.slug === "reflex")!;
    expect(halveKolom(reflex).map((l) => l.titel)).toEqual(["Per geval", "Abonnement"]);
  });

  it("de labelkleuren komen van de brochure mee; anders de vaste", () => {
    const vast = prijslijstStandaard(JAAR).groepen.find((g) => g.slug === "restart")!;
    expect([vast.kleur, vast.tekst, vast.tint]).toEqual([MERKEN.restart.kleur, MERKEN.restart.tekst, MERKEN.restart.tint]);
    const cms = prijslijstStandaard(JAAR, { restart: { naam: "Restart", kleur: "#FF8800", tekst: "#994400", tint: "#FFF5E6" } }).groepen.find((g) => g.slug === "restart")!;
    expect([cms.kleur, cms.tekst, cms.tint]).toEqual(["#FF8800", "#994400", "#FFF5E6"]);
  });

  it("zonder instelling het jaar uit het blok; zonder bruikbaar blok null (de lader valt dan terug op de repo)", () => {
    expect(prijslijstUit(blok, null)?.jaar).toBe("2027");
    expect(prijslijstUit({ ...blok, eyebrow: "Tarieven 2028" }, null)?.geldigheid).toContain("31 december 2028");
    expect(prijslijstUit(null, JAAR)).toBeNull();
    expect(prijslijstUit({ heading: "Iets anders" }, JAAR)).toBeNull();
    expect(prijslijstUit({ groepen: "kapot", abonnementen: [{ naam: "Basis" }] }, JAAR)).toBeNull();
  });
});
