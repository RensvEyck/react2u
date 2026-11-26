import { describe, expect, it } from "vitest";
import { GIDSEN } from "./gidsen";
import { DOCUMENT_SLEUTELS } from "./onboarding";
import { aantalVragen, isWeten, leesMinuten, WETEN, wetenNa, wetenNummer, wetenVoor, wetenVoorgaand } from "./onboardingWeten";

describe("Goed om te weten: de onderwerpen", () => {
  it("heeft negen onderwerpen met unieke slugs, zodat het raster op de hub klopt", () => {
    expect(WETEN).toHaveLength(9);
    expect(new Set(WETEN.map((w) => w.slug)).size).toBe(WETEN.length);
    for (const w of WETEN) expect(w.slug).toMatch(/^[a-z-]+$/);
  });

  it("geeft elk onderwerp uitleg, punten in het kort en minstens zes vragen met een antwoord", () => {
    for (const w of WETEN) {
      expect(w.uitleg.length, w.slug).toBeGreaterThanOrEqual(2);
      expect(w.kern.length, w.slug).toBeGreaterThanOrEqual(3);
      expect(w.vragen.length, w.slug).toBeGreaterThanOrEqual(6);
      for (const v of w.vragen) {
        expect(v.vraag, w.slug).toMatch(/\?$/);
        expect(v.antwoord.length, `${w.slug}: ${v.vraag}`).toBeGreaterThan(40);
      }
      expect(new Set(w.vragen.map((v) => v.vraag)).size, w.slug).toBe(w.vragen.length);
    }
  });

  it("verwijst alleen naar stappen en gidsen die bestaan", () => {
    for (const w of WETEN) {
      if (w.stap) expect(DOCUMENT_SLEUTELS, w.slug).toContain(w.stap);
      if (w.gids) expect(GIDSEN.map((g) => g.slug), w.slug).toContain(w.gids);
      if (w.meer) expect(w.meer.href, w.slug).toMatch(/^\//);
    }
  });

  it("noemt geen bedragen: die staan in de offerte en op de prijslijst", () => {
    const tekst = JSON.stringify(WETEN);
    expect(tekst).not.toMatch(/€|\d+,\d\d\b|\beuro\b/i);
  });

  it("houdt de weken aan uit het Welkom-document (Rens, 16 nov 2026: zo laten)", () => {
    const poortwachter = wetenVoor("poortwachter")!;
    const tekst = [...poortwachter.uitleg, ...poortwachter.kern].join(" ");
    expect(tekst).toContain("week 42");
    expect(tekst).toContain("week 52");
    expect(tekst).toContain("week 104");
    expect(tekst).not.toMatch(/uiterlijk (in )?week [68]\b/);
  });
});

describe("Goed om te weten: de hulpfuncties", () => {
  it("herkent een onderwerp en wijst onbekende slugs af", () => {
    expect(isWeten("ziekmelden")).toBe(true);
    expect(isWeten("welkom")).toBe(false);
    expect(isWeten(undefined)).toBe(false);
    expect(wetenVoor("onbekend")).toBeNull();
  });

  it("nummert en loopt vooruit en terug door de lijst", () => {
    expect(wetenNummer("ziekmelden")).toBe(1);
    expect(wetenNummer(WETEN[WETEN.length - 1].slug)).toBe(WETEN.length);
    expect(wetenVoorgaand("ziekmelden")).toBeNull();
    expect(wetenNa("ziekmelden")?.slug).toBe("casemanager");
    expect(wetenNa(WETEN[WETEN.length - 1].slug)).toBeNull();
    expect(wetenVoorgaand("casemanager")?.slug).toBe("ziekmelden");
  });

  it("schat de leestijd en telt de vragen", () => {
    for (const w of WETEN) {
      expect(leesMinuten(w)).toBeGreaterThanOrEqual(2);
      expect(leesMinuten(w)).toBeLessThanOrEqual(8);
    }
    expect(aantalVragen()).toBe(WETEN.reduce((s, w) => s + w.vragen.length, 0));
    expect(aantalVragen()).toBeGreaterThan(60);
  });
});
