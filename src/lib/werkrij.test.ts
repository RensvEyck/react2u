import { describe, expect, it } from "vitest";
import { bedrijfSleutel, type Klant } from "./klanten";
import type { Signaal } from "./opvolgen";
import { morgen, werkrij } from "./werkrij";

const VANDAAG = "2026-11-17";
const NU = new Date("2026-11-17T10:00:00+01:00");

const klant = (bedrijf: string, extra: Partial<Klant> = {}): Klant => ({
  id: `id-${bedrijf}`, bedrijf, sleutel: bedrijfSleutel(bedrijf), status: "lead", contactpersoon: null, email: null, telefoon: null, eigenaar: null, bron: null,
  startdatum: null, offerte_retour: false, contract_retour: false, formulieren_retour: false, koppeling: false, facturatie: false, stand: null,
  volgende_actie: null, volgende_actie_op: null, laatste_contact_op: null, laatste_contact: null, notitie: null, lead_id: null, created_by: null,
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z", ...extra,
});

const signaal = (bedrijf: string, extra: Partial<Signaal> = {}): Signaal => ({
  key: `o-${bedrijf}`, soort: "offerte", id: "o1", bedrijf, contactpersoon: null, telefoon: null, href: "/admin/offertes/o1", reden: "bekeken", label: "Bekeken",
  toon: "let-op", details: ["gisteren bekeken"], termijn: null, opSite: null, gewicht: 10, at: "2026-11-16T10:00:00Z", ...extra,
});

describe("werkrij", () => {
  it("zet warme signalen bovenaan, dan te laat, dan vandaag, en laat de rest weg", () => {
    const klanten = [
      klant("Rustig BV"),
      klant("Vandaag BV", { volgende_actie: "Bellen", volgende_actie_op: VANDAAG }),
      klant("Laat BV", { volgende_actie: "Offerte nabellen", volgende_actie_op: "2026-11-10" }),
      klant("Warm BV", { status: "offerte" }),
      klant("Koud BV", { status: "offerte" }),
    ];
    const signalen = [
      signaal("Koud B.V.", { label: "Niet geopend", toon: "let-op", gewicht: 5 }),
      signaal("Warm B.V.", { label: "Koos onderdelen", toon: "warm", gewicht: 30, termijn: "verloopt over 2 dagen" }),
    ];
    const rijen = werkrij(klanten, signalen, {}, VANDAAG, NU);
    expect(rijen.map((r) => r.klant.bedrijf)).toEqual(["Warm BV", "Koud BV", "Laat BV", "Vandaag BV"]);
    expect(rijen[0].redenen[0]).toEqual({ soort: "signaal", tekst: "Koos onderdelen", details: "gisteren bekeken · verloopt over 2 dagen", toon: "warm" });
    expect(rijen[0].signaal?.href).toBe("/admin/offertes/o1");
    expect(rijen[2].redenen[0]).toEqual({ soort: "te_laat", tekst: "Te laat: Offerte nabellen", details: "7 dagen te laat", toon: "let-op" });
    expect(rijen[3].redenen[0].tekst).toBe("Vandaag: Bellen");
  });

  it("telt een recent sitebezoek mee en slaat inactieve kaarten over", () => {
    const klanten = [klant("Site BV", { volgende_actie_op: VANDAAG }), klant("Weg BV", { status: "inactief", volgende_actie_op: "2026-11-01" })];
    const rijen = werkrij(klanten, [signaal("Weg BV", { toon: "warm" })], { "id-Site BV": { laatst: "2026-11-17T09:20:00+01:00", paginas: 3, sessies: [] } }, VANDAAG, NU);
    expect(rijen.map((r) => r.klant.bedrijf)).toEqual(["Site BV"]);
    expect(rijen[0].redenen.map((r) => r.soort)).toEqual(["vandaag", "site"]);
    expect(rijen[0].redenen[1]).toEqual({ soort: "site", tekst: "Op de site 40 min geleden", details: "3 pagina's bekeken", toon: "warm" });
    expect(rijen[0].gewicht).toBe(70);
  });

  it("een bezoek van langer dan twee dagen geleden telt niet", () => {
    const rijen = werkrij([klant("Oud BV")], [], { "id-Oud BV": { laatst: "2026-11-10T09:00:00Z", paginas: 1, sessies: [] } }, VANDAAG, NU);
    expect(rijen).toEqual([]);
  });

  it("weet welke dag morgen is", () => {
    expect(morgen("2026-11-17")).toBe("2026-11-18");
    expect(morgen("2026-12-31")).toBe("2027-01-01");
  });
});
