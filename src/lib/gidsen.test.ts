import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EERSTE_REEKS, GIDSEN, GIDS_VAN_ARTIKEL, gidsAnker, gidsVoor, gidsWoorden, gidsenBij } from "./gidsen";
import { crumbsVoor, doelgroepVoorPad } from "./nav";
import { GIDS_REDIRECTS, coveredByWordpress, createsLoop, VASTE_REDIRECTS } from "./redirects";
import { DESC_MAX, TITLE_MAX } from "./seo";
import { DIENSTEN } from "./organisatie";

/*
 * De gidsen uit het HALO-herstelplan (november 2026, punt 4). Deze test bewaakt
 * de opbouw die HALO voorschrijft: de H1 is de vraag, twee zinnen direct
 * antwoord, een stappenplan of tijdlijn, een tabel, vijf tot acht vragen, een
 * auteur met naam en functie, en "Zo helpt React2u" met de dienst en
 * kennismaken. En de omvang: 1.500 tot 2.000 woorden, titel en omschrijving
 * onder de maten van Google, het zoekwoord vooraan.
 */

type Blok = { type: string; label?: string | null; data: Record<string, unknown> };
type Concept = { slug: string; title: string; seo_title: string; seo_description: string; blocks: Blok[] };

const map = fileURLToPath(new URL("../content/", import.meta.url));
const concept = (slug: string): Concept => JSON.parse(readFileSync(`${map}${slug}.json`, "utf8"));
const blok = (c: Concept, type: string) => c.blocks.find((b) => b.type === type);
const alleTekst = (v: unknown): string =>
  typeof v === "string" ? v : Array.isArray(v) ? v.map(alleTekst).join(" ") : v && typeof v === "object" ? Object.values(v).map(alleTekst).join(" ") : "";

describe("de vijf gidsen", () => {
  it("zijn de vijf uit het herstelplan plus de tweede reeks, elk met een conceptbestand op dezelfde slug", () => {
    expect(EERSTE_REEKS).toEqual(["re-integratie", "wet-verbetering-poortwachter", "bedrijfsarts", "arbeidsdeskundig-onderzoek", "preventiemedewerker"]);
    expect(GIDSEN.map((g) => g.slug)).toEqual([
      "re-integratie", "arbodienst", "wet-verbetering-poortwachter", "bedrijfsarts", "arbeidsdeskundig-onderzoek", "preventiemedewerker",
      "zieke-werknemer", "verzuimverzekering", "casemanager-verzuim", "loonsanctie", "rie", "eigenrisicodrager-ziektewet", "twee-jaar-ziek",
    ]);
    expect(new Set(GIDSEN.map((g) => g.slug)).size).toBe(GIDSEN.length);
    for (const g of GIDSEN) expect(concept(g.slug).slug).toBe(g.slug);
    expect(gidsVoor("/bedrijfsarts")?.naam).toBe("Bedrijfsarts");
    expect(gidsVoor("/bedrijfsarts/")?.slug).toBe("bedrijfsarts");
    expect(gidsVoor("/recover")).toBeNull();
  });

  it("verwijzen naar de passende dienst", () => {
    expect(gidsenBij("restart").map((g) => g.slug)).toEqual(["re-integratie", "arbeidsdeskundig-onderzoek"]);
    expect(gidsenBij("recover").map((g) => g.slug)).toEqual(["arbodienst", "wet-verbetering-poortwachter", "bedrijfsarts", "zieke-werknemer", "verzuimverzekering", "casemanager-verzuim", "loonsanctie"]);
    expect(gidsenBij("resist").map((g) => g.slug)).toEqual(["preventiemedewerker", "rie"]);
    expect(gidsenBij("reflex").map((g) => g.slug)).toEqual(["eigenrisicodrager-ziektewet"]);
    expect(gidsenBij("ready").map((g) => g.slug)).toEqual(["twee-jaar-ziek"]);
    for (const g of GIDSEN) {
      const helpt = blok(concept(g.slug), "gidsHelpt")?.data as { dienst?: { href?: string; naam?: string; wat?: string }; kennismaken?: { href?: string } };
      expect(helpt?.dienst?.href).toBe(`/${g.dienst}`);
      // Dezelfde dienstnaam als overal op de site (DIENSTEN in lib/organisatie.ts, migratie 0059).
      expect(helpt?.dienst?.naam).toBe(DIENSTEN[g.dienst].naam);
      expect(helpt?.dienst?.wat).toBe(DIENSTEN[g.dienst].nl);
      expect(helpt?.kennismaken?.href).toBe("/kennismaken");
    }
  });

  for (const g of GIDSEN) {
    describe(`/${g.slug}`, () => {
      const c = concept(g.slug);
      const kop = blok(c, "gidsKop")?.data as { heading: string; antwoord: string; auteur?: { naam?: string; functie?: string }; gepubliceerd?: string; bijgewerkt?: string };

      it("heeft de opbouw van HALO: vraag als H1, direct antwoord, tijdlijn, tabel, vragen, auteur en Zo helpt React2u", () => {
        expect(c.blocks[0].type).toBe("gidsKop");
        expect(kop.heading).toBe(g.vraag);
        expect(kop.heading.endsWith("?")).toBe(true);
        expect(kop.heading.toLowerCase()).toContain(g.zoekwoord);
        // Twee zinnen direct antwoord: minstens twee, hooguit drie.
        const zinnen = kop.antwoord.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean).length;
        expect(zinnen).toBeGreaterThanOrEqual(2);
        expect(zinnen).toBeLessThanOrEqual(3);
        expect(blok(c, "gidsTijdlijn")).toBeTruthy();
        expect(blok(c, "gidsTabel")).toBeTruthy();
        expect(blok(c, "gidsHelpt")).toBeTruthy();
        expect(kop.auteur?.naam).toBeTruthy();
        expect(kop.auteur?.functie).toBeTruthy();
        expect(kop.gepubliceerd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(kop.bijgewerkt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("heeft vijf tot acht veelgestelde vragen, elk met antwoord", () => {
        const vragen = blok(c, "gidsVragen")?.data as { items: { question: string; answer: string }[] };
        expect(vragen.items.length).toBeGreaterThanOrEqual(5);
        expect(vragen.items.length).toBeLessThanOrEqual(8);
        for (const v of vragen.items) {
          expect(v.question.endsWith("?")).toBe(true);
          expect(v.answer.length).toBeGreaterThan(40);
        }
      });

      it("is 1.500 tot 2.000 woorden lopende tekst", () => {
        const n = gidsWoorden(c.blocks);
        expect(n).toBeGreaterThanOrEqual(1500);
        // Iets boven de 2.000 mag: tabelcellen en vragen tellen mee.
        expect(n).toBeLessThanOrEqual(2100);
      });

      it("heeft titel en omschrijving met het zoekwoord vooraan en binnen de maten van Google", () => {
        expect(c.seo_title.toLowerCase().startsWith(g.zoekwoord)).toBe(true);
        expect(c.seo_title.length).toBeLessThanOrEqual(TITLE_MAX);
        expect(c.seo_title.endsWith("• React2u")).toBe(true);
        expect(c.seo_description.length).toBeLessThanOrEqual(DESC_MAX);
        expect(c.seo_description.length).toBeGreaterThanOrEqual(70);
        expect(c.seo_description.toLowerCase()).toContain(g.zoekwoord.split(" ")[0]);
      });

      it("noemt geen collega bij naam in de lopende tekst en linkt naar kennismaken en de dienst", () => {
        // De auteur (naam en functie) is de enige plek met een naam: Rens koos zichzelf (23 nov 2026).
        const tekst = alleTekst(c.blocks.map((b) => (b.type === "gidsKop" ? { ...b.data, auteur: undefined } : b.data)));
        expect(tekst).not.toMatch(/\bRens\b/);
        expect(kop.auteur).toEqual({ naam: "Rens van Eyck", functie: "Bestuurder van React2u" });
        expect(tekst).toContain("/kennismaken");
        expect(tekst).toContain(`/${g.dienst}`);
      });

      it("heeft unieke ankers voor de inhoudsopgave", () => {
        const koppen = c.blocks
          .filter((b) => ["gidsTekst", "gidsTijdlijn", "gidsTabel", "gidsVragen", "gidsHelpt"].includes(b.type))
          .map((b) => gidsAnker(String(b.data.heading)));
        expect(new Set(koppen).size).toBe(koppen.length);
        expect(koppen.every((k) => /^[a-z0-9-]+$/.test(k))).toBe(true);
      });
    });
  }

  it("de Poortwachter-gids heeft de tijdlijn die HALO vraagt: week 1, 6, 8, 42, 52, 88 en 91", () => {
    const tijdlijn = blok(concept("wet-verbetering-poortwachter"), "gidsTijdlijn")?.data as { items: { wanneer: string }[] };
    const momenten = tijdlijn.items.map((i) => i.wanneer).join(" | ");
    for (const week of [1, 6, 8, 42, 52, 88, 91]) expect(momenten).toMatch(new RegExp(`\\b${week}\\b`));
  });

  it("hangt in het kruimelpad onder Werkgevers en Kennis, en krijgt het werkgeversmenu", () => {
    expect(doelgroepVoorPad("/re-integratie")).toBe("werkgever");
    expect(crumbsVoor("/re-integratie", "Re-integratie")).toEqual([
      { label: "Werkgevers", href: "/werkgevers" },
      { label: "Kennis", href: "/kennis" },
      { label: "Re-integratie", href: "/re-integratie" },
    ]);
    expect(doelgroepVoorPad("/kennis/wet-en-regels")).toBe("werkgever");
  });

  it("stuurt de artikelen die een gids werden met een vaste 301 naar de gids, zonder lus", () => {
    expect(GIDS_VAN_ARTIKEL).toEqual([
      { artikel: "wet-verbetering-poortwachter-stappen", gids: "wet-verbetering-poortwachter" },
      { artikel: "loonsanctie-uwv", gids: "loonsanctie" },
    ]);
    expect(GIDS_REDIRECTS).toEqual([
      { source: "/blog/wet-verbetering-poortwachter-stappen", destination: "/wet-verbetering-poortwachter" },
      { source: "/blog/loonsanctie-uwv", destination: "/loonsanctie" },
    ]);
    expect(coveredByWordpress("/blog/wet-verbetering-poortwachter-stappen")?.destination).toBe("/wet-verbetering-poortwachter");
    expect(coveredByWordpress("/wet-verbetering-poortwachter")).toBeNull();
    const regels = VASTE_REDIRECTS.map((r) => ({ ...r, permanent: true }));
    for (const r of GIDS_REDIRECTS) expect(createsLoop(r.source, r.destination, regels)).toBe(false);
  });

  it("rekent de leestijd uit de lopende tekst, zonder kleuren, adressen en chips", () => {
    expect(gidsWoorden([{ type: "gidsTekst", data: { heading: "Een kop", tekst: "drie woorden hier", kleur: "#fff", href: "/x" } }])).toBe(5);
    expect(gidsWoorden([{ type: "gidsenKaarten", data: { heading: "telt niet" } }, { type: "homeContact", data: { text: "ook niet" } }])).toBe(0);
    expect(gidsAnker("Eerste spoor: terug bij je eigen organisatie")).toBe("eerste-spoor-terug-bij-je-eigen-organisatie");
  });
});
