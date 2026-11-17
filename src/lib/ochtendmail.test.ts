import { describe, expect, it } from "vitest";
import { bedrijfSleutel, type Gesprek, type Klant } from "./klanten";
import { isVanMij, ochtendmail, watDeedDeKlant } from "./ochtendmail";
import type { Signaal } from "./opvolgen";

const VANDAAG = "2026-11-17";
const klant = (bedrijf: string, extra: Partial<Klant> = {}): Klant => ({
  id: `id-${bedrijf}`, bedrijf, sleutel: bedrijfSleutel(bedrijf), status: "lead", contactpersoon: null, email: null, telefoon: null, eigenaar: null, bron: null,
  startdatum: null, offerte_retour: false, contract_retour: false, formulieren_retour: false, koppeling: false, facturatie: false, stand: null,
  volgende_actie: null, volgende_actie_op: null, laatste_contact_op: null, laatste_contact: null, notitie: null, lead_id: null, created_by: null,
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z", ...extra,
});
const gesprek = (klant_id: string, tekst: string): Gesprek => ({
  id: `g-${tekst}`, klant_id, soort: "systeem", op: "2026-11-16", tekst, door: "klant", contact: true, bron: "offerte", bron_id: "o1", bron_gebeurtenis: 1, created_at: "2026-11-16T15:00:00Z",
});
const signaal = (bedrijf: string, label: string, toon: Signaal["toon"]): Signaal => ({
  key: bedrijf, soort: "offerte", id: "o1", bedrijf, contactpersoon: null, telefoon: null, href: "/admin/offertes/o1", reden: "bekeken", label, toon, details: ["gisteren bekeken"], termijn: null, opSite: null, gewicht: 10, at: "2026-11-16T10:00:00Z",
});

describe("ochtendmail", () => {
  const klanten = [
    klant("Bakkerij De Korenaar B.V.", { eigenaar: "Cindy", volgende_actie: "Offerte nabellen", volgende_actie_op: "2026-11-15" }),
    klant("Zorggroep Oost", { eigenaar: "Rens van Eyck", volgende_actie: "Kennismaking", volgende_actie_op: VANDAAG }),
    klant("Hoveniersbedrijf Groen", { volgende_actie: "Bellen", volgende_actie_op: "2026-11-16" }),
    klant("Weg BV", { status: "inactief", volgende_actie_op: "2026-11-01" }),
  ];
  const gisteren = [gesprek("id-Bakkerij De Korenaar B.V.", "Offerte 2026-0012 bekeken"), gesprek("id-Zorggroep Oost", "Offerte 2026-0013 aangemaakt")];
  const invoer = { klanten, gisteren, signalen: [signaal("Hoveniersbedrijf Groen", "Niet geopend", "let-op"), signaal("Ander", "Getekend", "goed")], vandaag: VANDAAG, basis: "https://react2u.nl" };

  it("weet van wie een kaart is aan de eerste naam van de eigenaar", () => {
    expect(isVanMij("Cindy", "cindy.faro@react2u.nl")).toBe(true);
    expect(isVanMij("Rens van Eyck", "rens@react2u.nl")).toBe(true);
    expect(isVanMij("Hayley", "rens@react2u.nl")).toBe(false);
    expect(isVanMij(null, "rens@react2u.nl")).toBe(false);
  });

  it("zet eerst wat van jou is, dan gisteren, dan opvolgen, dan het team", () => {
    const m = ochtendmail(invoer, "cindy.faro@react2u.nl")!;
    expect(m.onderwerp).toBe("Vandaag 3 acties, 2 te laat, Bakkerij De Korenaar bekeek de offerte");
    expect(m.delen.map((d) => d.kop)).toEqual(["Voor jou", "Gisteren bij klanten", "Opvolgen volgens de modules", "Rest van het team"]);
    expect(m.delen[0].regels).toEqual([{ bedrijf: "Bakkerij De Korenaar B.V.", tekst: "Offerte nabellen", sub: "2 dagen te laat · Cindy", href: "https://react2u.nl/admin/klantenbord#klant-id-Bakkerij De Korenaar B.V." }]);
    expect(m.delen[1].regels.map((r) => r.tekst)).toEqual(["Bakkerij De Korenaar bekeek de offerte"]);
    expect(m.delen[2].regels.map((r) => r.tekst)).toEqual(["Niet geopend: Hoveniersbedrijf Groen"]);
    expect(m.delen[3].regels.map((r) => r.bedrijf)).toEqual(["Hoveniersbedrijf Groen", "Zorggroep Oost"]);
    expect(m.teLaat).toBe(2);
  });

  it("zonder eigen kaarten heet het team gewoon het team, en zonder iets is er geen mail", () => {
    const m = ochtendmail(invoer, "hayley@react2u.nl")!;
    expect(m.delen[0].kop).toBe("Gisteren bij klanten");
    expect(m.delen.at(-1)?.kop).toBe("Het team");
    expect(ochtendmail({ ...invoer, klanten: [], gisteren: [], signalen: [] }, "rens@react2u.nl")).toBeNull();
  });

  it("vertaalt wat de klant deed naar gewone taal", () => {
    expect(watDeedDeKlant("Offerte 2026-0012 getekend door Fatima El Amrani")).toBe("tekende de offerte");
    expect(watDeedDeKlant("Koos zelf onderdelen in offerte 2026-0012")).toBe("koos onderdelen in de offerte");
    expect(watDeedDeKlant("Brochure B2026-0003 bekeken")).toBe("bekeek de brochure");
    expect(watDeedDeKlant("Inrichting nieuwe klant ingevuld (onboarding O2026-0001)")).toBe("vulde een document in");
    expect(watDeedDeKlant("Offerte 2026-0012 aangemaakt")).toBeNull();
  });
});
