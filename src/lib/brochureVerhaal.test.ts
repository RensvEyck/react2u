import { describe, expect, it } from "vitest";
import { BROCHURE_DIENSTEN } from "./brochures";
import { prijslijstStandaard } from "./brochurePrijslijst";
import {
  DIENSTEN_BROCHURE, HOOFDSTUKKEN, kostenvoorbeeld, OVERSTAP, TERMIJNEN, TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS,
} from "./brochureVerhaal";

const JAAR = { jaar: "2027", geldigTot: "31 december 2027" };
const alleTekst = JSON.stringify({ DIENSTEN_BROCHURE, OVERSTAP, TERMIJNEN, TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS });

describe("brochureVerhaal", () => {
  it("acht hoofdstukken in de volgorde van de voorbeeldbrochure, met unieke ankers", () => {
    expect(HOOFDSTUKKEN.map((h) => h.nr)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
    expect(HOOFDSTUKKEN.map((h) => h.kort)).toEqual(["Hoe het gaat", "Voorwoord", "Onze werkwijze", "Wat het kost", "Onze diensten", "Jouw rol", "Tarieven", "Overstappen"]);
    expect(new Set(HOOFDSTUKKEN.map((h) => h.id)).size).toBe(8);
    // De ankers die de pagina en de e2e-test gebruiken.
    expect(HOOFDSTUKKEN.map((h) => h.id)).toEqual(expect.arrayContaining(["diensten", "tarieven"]));
  });

  it("de rekensom van hoofdstuk 04 komt uit de prijslijst van dit jaar", () => {
    const k = kostenvoorbeeld(prijslijstStandaard(JAAR));
    expect([k.totaal, k.loon, k.sanctie]).toEqual(["€94.500", "€63.000", "€31.500"]);
    expect(k.spoor2).toBe("€3.365");
    // 50 × €139,50 en 31.500 / 6.975 = 4,5 jaar.
    expect(k.compleet).toEqual({ bedrag: "€6.975", werknemers: 50, jaren: "4,5" });
    // Zonder Compleet of spoor 2 op de prijslijst: geen bedragen verzinnen.
    const kaal = kostenvoorbeeld({ jaar: "2027", geldigheid: "", aansluitingen: [], groepen: [] });
    expect(kaal.compleet).toBeNull();
    expect(kaal.spoor2).toBeNull();
  });

  it("zes diensten met Reward, en de vinkjes van Susanne", () => {
    expect(Object.keys(DIENSTEN_BROCHURE).sort()).toEqual([...BROCHURE_DIENSTEN].sort());
    expect(DIENSTEN_BROCHURE.recover.punten).toEqual(expect.arrayContaining(["Taakgedelegeerde casemanager", "Poortwachterproof dossier", "Begeleiding eigenrisicodragers Ziektewet"]));
    expect(DIENSTEN_BROCHURE.resist.punten).toEqual(expect.arrayContaining(["RI&E en toetsing", "Alle vier kerndeskundigen in huis", "Vitaliteit op de werkvloer"]));
    expect(DIENSTEN_BROCHURE.restart.punten).toEqual(expect.arrayContaining(["Coaching", "Outplacement"]));
    expect(DIENSTEN_BROCHURE.restart.punten.join()).not.toMatch(/burn-out/i);
    expect(DIENSTEN_BROCHURE.reflex.punten).toEqual(["Zieke flexkrachten", "Na einde dienstverband", "Eigenrisicodragerschap Ziektewet"]);
    expect(DIENSTEN_BROCHURE.ready.punten).toContain("Deskundigenoordeel UWV en second opinion bedrijfsarts");
  });

  it("de correcties van Susanne staan erin", () => {
    // Een vangnetregeling mag je wél vragen, alleen niet welke.
    expect(VRAGEN.mag.items.some((v) => /vangnetregeling/.test(v))).toBe(true);
    expect(VRAGEN.magNiet.items.some((v) => /vangnetregeling/.test(v))).toBe(false);
    // De casemanager werkt in taakdelegatie, niet de bedrijfsarts; het systeem bewaakt de termijnen.
    expect(WERKWIJZE.punten[1].tekst).toMatch(/casemanager werkt in taakdelegatie/);
    expect(alleTekst).not.toMatch(/bedrijfsarts werkt in taakdelegatie/i);
    expect(WERKWIJZE.punten[2].titel).toBe("Ons systeem bewaakt de termijnen");
    // Geen "zij" voor de casemanager, en de juiste afzenders van het voorwoord (dat komt uit de offerte).
    expect(alleTekst).not.toMatch(/zij houdt de klok bij|algemeen directeur/i);
    // Dag 1: eerst de werkgever, dan de werknemer.
    expect(TERMIJNEN.rijen[0].wij).toMatch(/eerst met jou.*Daarna bellen we je werknemer/);
    // Overstappen: drie tot vier weken, de werkgever vraagt de medische informatie op, en de OR.
    expect(OVERSTAP.stappen[2].tekst).toMatch(/drie tot vier weken/);
    expect(OVERSTAP.stappen[0].tekst).toMatch(/samen met je werknemer op bij je huidige arbodienst/);
    expect(OVERSTAP.or).toMatch(/instemmingsrecht/);
    expect(TIJDLIJN.momenten.at(-1)?.vraag).toMatch(/UWV-proof/);
  });

  it("de zusterlabels: React2u zelf zonder link, de andere drie met hun site", () => {
    expect(ZUSTERLABELS.labels.map((l) => [l.naam, l.url])).toEqual([
      ["React2u", null], ["FlexHero", "flexhero.com"], ["Jobbs", "jobbs.nl"], ["Zorg Verbindt", "zorg-verbindt.nl"],
    ]);
  });
});
