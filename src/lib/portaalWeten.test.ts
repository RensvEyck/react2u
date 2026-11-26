import { describe, expect, it } from "vitest";
import { WETEN } from "./onboardingWeten";
import { AFKORTINGEN, TERMINOLOGIE } from "./portaalTermen";
import { isPortaalWeten, leesTijd, PORTAAL_WETEN, portaalTabellen, portaalVragen, portaalWetenNa, portaalWetenVoor, portaalWetenVoorgaand } from "./portaalWeten";

describe("Goed om te weten in Mijn React2u", () => {
  it("heeft dertien onderwerpen met unieke slugs", () => {
    expect(PORTAAL_WETEN).toHaveLength(13);
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
    expect(tekst).not.toMatch(/\bRens\b|\bDanique\b/);
    expect(tekst).not.toMatch(/€|\beuro\b/i);
  });

  it("bevat het belspiekbriefje en het voicemailscript niet (Rens: belscript hoeft er niet in)", () => {
    const tekst = JSON.stringify(PORTAAL_WETEN);
    expect(tekst).not.toMatch(/je spreekt met|this is .* from React2u|einde bericht|terugbellen op 06|06 ?22/i);
  });

  it("houdt de wettelijke termijnen aan en noemt de ruimere weken uit Welkom alleen als uitleg", () => {
    const p = portaalWetenVoor("poortwachter")!;
    const kern = p.kern.join(" ");
    expect(kern).toContain("Week 6");
    expect(kern).toContain("week 8");
    expect(kern).toContain("week 104");
    expect(p.vragen.some((v) => v.antwoord.includes("week 6 tot 12"))).toBe(true);
  });

  it("geeft elke tabel kopjes en volle rijen met evenveel cellen als kopjes", () => {
    const tabellen = portaalTabellen();
    expect(tabellen.length).toBeGreaterThanOrEqual(9);
    expect(new Set(tabellen.map((t) => t.titel)).size).toBe(tabellen.length);
    for (const t of tabellen) {
      expect(t.rijen.length, t.titel).toBeGreaterThan(0);
      for (const r of t.rijen) {
        expect(r.length, `${t.titel}: ${r[0]}`).toBe(t.kolommen.length);
        for (const c of r) expect(c.trim().length, `${t.titel}: ${r[0]}`).toBeGreaterThan(0);
      }
      expect(new Set(t.rijen.map((r) => r.join("|"))).size, t.titel).toBe(t.rijen.length);
    }
  });

  it("heeft de afkortingen alfabetisch, zonder dubbele, met de verbeterde betekenissen", () => {
    const afk = AFKORTINGEN.rijen.map((r) => r[0]);
    expect(afk).toEqual([...afk].sort((a, b) => a.localeCompare(b, "nl", { sensitivity: "base" })));
    expect(new Set(afk).size).toBe(afk.length);
    const betekenis = Object.fromEntries(AFKORTINGEN.rijen);
    expect(betekenis.PAGO).toMatch(/^Periodiek arbeidsgezondheidskundig onderzoek/);
    expect(betekenis.WW).toMatch(/^Werkloosheidswet/);
    expect(betekenis.UWV).toBe("Uitvoeringsinstituut Werknemersverzekeringen");
    expect(betekenis.ERD).toMatch(/Ziektewet of voor de WGA/);
    expect(betekenis.IZP).toBe("Inzetbaarheidsprofiel");
    expect(betekenis.GBM).toBe("Geen benutbare mogelijkheden");
    for (const r of TERMINOLOGIE.rijen) expect(r[1], r[0]).not.toMatch(/^Geen benutbare mogelijkheden/);
  });

  it("herkent slugs en loopt door de lijst", () => {
    expect(isPortaalWeten("ziekmelding")).toBe(true);
    expect(isPortaalWeten("ziekmelden")).toBe(false);
    expect(portaalWetenVoor("x")).toBeNull();
    expect(portaalWetenVoorgaand("ziekmelding")).toBeNull();
    expect(portaalWetenNa("ziekmelding")?.slug).toBe("poortwachter");
    expect(portaalWetenNa("poortwachter")?.slug).toBe("eerste-ziektejaar");
    expect(portaalWetenNa(PORTAAL_WETEN[PORTAAL_WETEN.length - 1].slug)).toBeNull();
  });

  it("schat de leestijd (met de tabellen) en telt de vragen", () => {
    for (const w of PORTAAL_WETEN) {
      expect(leesTijd(w), w.slug).toBeGreaterThanOrEqual(2);
      expect(leesTijd(w), w.slug).toBeLessThanOrEqual(15);
    }
    expect(leesTijd(portaalWetenVoor("anamnese")!)).toBeGreaterThan(leesTijd({ ...portaalWetenVoor("anamnese")!, tabellen: [] }));
    expect(leesTijd(WETEN[0])).toBeGreaterThanOrEqual(1);
    expect(portaalVragen()).toBeGreaterThan(85);
  });
});
