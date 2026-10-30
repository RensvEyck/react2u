import { describe, expect, it } from "vitest";
import { vulIn } from "./offertes";
import { ondertekenaarRegel, VOORWOORD, VOORWOORD_VAN } from "./offerteVoorwoord";

describe("voorwoord", () => {
  it("is van Cindy en Susanne", () => {
    expect(VOORWOORD.ondertekenaars.map((o) => o.naam)).toEqual(["Cindy", "Susanne"]);
    expect(VOORWOORD_VAN).toBe("Cindy en Susanne");
  });

  it("is uitgebreid: een kop, een uitgelichte zin en meerdere alinea's", () => {
    expect(VOORWOORD.kop).toBeTruthy();
    expect(VOORWOORD.citaat).toBeTruthy();
    expect(VOORWOORD.alineas.length).toBeGreaterThanOrEqual(5);
    expect(VOORWOORD.alineas.join(" ").split(/\s+/).length).toBeGreaterThan(250);
  });

  it("vult de bedrijfsnaam in en laat geen invulvelden staan", () => {
    const tekst = VOORWOORD.alineas.map((a) => vulIn(a, { bedrijf: "Bouwbedrijf Hendriks" })).join(" ");
    expect(tekst).toContain("Bouwbedrijf Hendriks");
    expect(tekst).not.toMatch(/\{[a-z]+\}/);
  });

  it("houdt zich aan de huisregels voor tekst: geen middenpuntjes of lange streepjes", () => {
    const alles = [VOORWOORD.kop, VOORWOORD.citaat, ...VOORWOORD.alineas].join(" ");
    expect(alles).not.toMatch(/[·—]/);
  });

  it("zet onder een handtekening de volledige naam en functie, of de voornaam en React2u", () => {
    expect(ondertekenaarRegel({ naam: "Cindy", volledigeNaam: null, functie: null })).toBe("Cindy, React2u");
    expect(ondertekenaarRegel({ naam: "Cindy", volledigeNaam: "Cindy Jansen", functie: "Directeur" })).toBe("Cindy Jansen, Directeur");
  });
});
