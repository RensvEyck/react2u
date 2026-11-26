import { describe, expect, it } from "vitest";
import { WETEN } from "./onboardingWeten";
import { isPortaalWeten, leesTijd, PORTAAL_WETEN, portaalVragen, portaalWetenNa, portaalWetenVoor, portaalWetenVoorgaand } from "./portaalWeten";

describe("Goed om te weten in Mijn React2u", () => {
  it("heeft acht onderwerpen met unieke slugs", () => {
    expect(PORTAAL_WETEN).toHaveLength(8);
    expect(new Set(PORTAAL_WETEN.map((w) => w.slug)).size).toBe(PORTAAL_WETEN.length);
    for (const w of PORTAAL_WETEN) expect(w.slug).toMatch(/^[a-z-]+$/);
  });

  it("geeft elk onderwerp uitleg, punten in het kort en minstens zes vragen met een antwoord", () => {
    for (const w of PORTAAL_WETEN) {
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

  it("verwijst alleen naar onderwerpen van de klant die bestaan", () => {
    for (const w of PORTAAL_WETEN) if (w.klant) expect(WETEN.map((k) => k.slug), w.slug).toContain(w.klant);
  });

  it("noemt geen namen van collega's en geen bedragen (teksten voor werknemers)", () => {
    const tekst = JSON.stringify(PORTAAL_WETEN);
    expect(tekst).not.toMatch(/\bRens\b/);
    expect(tekst).not.toMatch(/€|\beuro\b/i);
  });

  it("houdt de wettelijke termijnen aan en noemt de ruimere weken uit Welkom alleen als uitleg", () => {
    const p = portaalWetenVoor("poortwachter")!;
    const kern = p.kern.join(" ");
    expect(kern).toContain("Week 6");
    expect(kern).toContain("week 8");
    expect(kern).toContain("week 104");
    expect(p.vragen.some((v) => v.antwoord.includes("week 6 tot 12"))).toBe(true);
  });

  it("herkent slugs en loopt door de lijst", () => {
    expect(isPortaalWeten("ziekmelding")).toBe(true);
    expect(isPortaalWeten("ziekmelden")).toBe(false);
    expect(portaalWetenVoor("x")).toBeNull();
    expect(portaalWetenVoorgaand("ziekmelding")).toBeNull();
    expect(portaalWetenNa("ziekmelding")?.slug).toBe("poortwachter");
    expect(portaalWetenNa(PORTAAL_WETEN[PORTAAL_WETEN.length - 1].slug)).toBeNull();
  });

  it("schat de leestijd en telt de vragen", () => {
    for (const w of PORTAAL_WETEN) {
      expect(leesTijd(w)).toBeGreaterThanOrEqual(2);
      expect(leesTijd(w)).toBeLessThanOrEqual(8);
    }
    expect(leesTijd(WETEN[0])).toBeGreaterThanOrEqual(1);
    expect(portaalVragen()).toBeGreaterThan(50);
  });
});
