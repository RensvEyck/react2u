import { describe, expect, it } from "vitest";
import { klantSleutels, opvolgen, verkoopcijfers, waardeTekst, type BrochureRij, type ContractRij, type OfferteRij } from "./opvolgen";
import type { Regel } from "./offertes";

// Woensdag 4 november 2026, 11:00 in Amsterdam.
const NU = new Date("2026-11-04T10:00:00Z");
const urenGeleden = (u: number) => new Date(NU.getTime() - u * 3_600_000).toISOString();
const dagenGeleden = (d: number) => urenGeleden(d * 24);

// 10 medewerkers × €120 per jaar = €1.200 per jaar = €100 per maand.
const REGELS: Regel[] = [{ id: "a", sectie: "Aansluiting", naam: "Compleet", prijs: 120, eenheid: "medewerker_jaar", soort: "vast" }];

function offerte(over: Partial<OfferteRij> = {}): OfferteRij {
  return {
    id: "o1", nummer: "2026-0001", status: "verstuurd", vorm: "verzuimbegeleiding",
    bedrijf: "Jansen Bouw B.V.", contactpersoon: "Kees Jansen", email: "kees@jansenbouw.nl", telefoon: "06 12345678",
    medewerkers: 10, regels: REGELS, keuze: null, keuze_at: null, geldig_tot: "2026-11-30",
    created_at: dagenGeleden(5), verstuurd_at: dagenGeleden(5), bekeken_at: null, laatst_bekeken_at: null,
    aantal_bekeken: 0, getekend_at: null, ...over,
  };
}

function brochure(over: Partial<BrochureRij> = {}): BrochureRij {
  return {
    id: "b1", nummer: "B2026-0001", status: "verstuurd", bedrijf: "Vermeulen Transport", contactpersoon: "Karin",
    email: "karin@vermeulen.nl", telefoon: null, created_at: dagenGeleden(6), verstuurd_at: dagenGeleden(6),
    bekeken_at: null, laatst_bekeken_at: null, aantal_bekeken: 0, ...over,
  };
}

function contract(over: Partial<ContractRij> = {}): ContractRij {
  return {
    id: "c1", nummer: "C2026-0001", status: "verstuurd", bedrijf: "Smit Installatie", contactpersoon: "Anna",
    email: "anna@smit.nl", telefoon: null, offerte_id: null, ingangsdatum: "2026-12-01", einddatum: "2027-11-30",
    created_at: dagenGeleden(4), verstuurd_at: dagenGeleden(4), bekeken_at: null, laatst_bekeken_at: null,
    aantal_bekeken: 0, getekend_at: null, ...over,
  };
}

const leeg = { offertes: [], brochures: [], contracten: [] };

describe("offertes opvolgen", () => {
  it("zet een offerte waarin de klant net onderdelen koos bovenaan, als warm", () => {
    const [s] = opvolgen({
      ...leeg,
      offertes: [offerte({ bekeken_at: urenGeleden(30), laatst_bekeken_at: urenGeleden(2), aantal_bekeken: 3, keuze_at: urenGeleden(2) })],
    }, NU);
    expect(s.label).toBe("Koos onderdelen");
    expect(s.toon).toBe("warm");
    expect(s.details).toEqual(["Offerte 2026-0001", "3× bekeken, laatst 2 uur geleden", "€100 per maand"]);
    expect(s.href).toBe("/admin/offertes/o1");
  });

  it("noemt een offerte van een paar dagen terug bekeken, en na een week stil", () => {
    const bekeken = opvolgen({ ...leeg, offertes: [offerte({ bekeken_at: dagenGeleden(3), laatst_bekeken_at: dagenGeleden(3), aantal_bekeken: 1 })] }, NU);
    expect(bekeken[0]).toMatchObject({ reden: "bekeken", label: "Bekeken", toon: "let-op" });
    expect(bekeken[0].details[1]).toBe("bekeken 3 dagen geleden");

    const stil = opvolgen({
      ...leeg,
      offertes: [offerte({ verstuurd_at: dagenGeleden(12), bekeken_at: dagenGeleden(10), laatst_bekeken_at: dagenGeleden(10), aantal_bekeken: 1 })],
    }, NU);
    expect(stil[0]).toMatchObject({ reden: "stil", label: "Daarna stil" });
  });

  it("vraagt een herinnering voor een offerte die na drie dagen niet geopend is, en zwijgt na een herinnering", () => {
    expect(opvolgen({ ...leeg, offertes: [offerte()] }, NU)[0]).toMatchObject({ reden: "niet-geopend", toon: "info" });
    expect(opvolgen({ ...leeg, offertes: [offerte({ verstuurd_at: dagenGeleden(1) })] }, NU)).toEqual([]);
    expect(opvolgen({ ...leeg, offertes: [offerte()], gemaild: new Map([["o1", dagenGeleden(1)]]) }, NU)).toEqual([]);
  });

  it("noemt een eerdere herinnering als de offerte daarna nog steeds niet geopend is", () => {
    const [s] = opvolgen({ ...leeg, offertes: [offerte({ verstuurd_at: dagenGeleden(10) })], gemaild: new Map([["o1", dagenGeleden(4)]]) }, NU);
    expect(s.details[1]).toBe("verstuurd 10 dagen geleden, herinnering 4 dagen geleden");
  });

  it("noemt de termijn als de geldigheid binnen vijf dagen afloopt, ook als er net gemaild is", () => {
    const [s] = opvolgen({ ...leeg, offertes: [offerte({ geldig_tot: "2026-11-06" })] }, NU);
    expect(s.termijn).toBe("verloopt over 2 dagen");
    expect(s.toon).toBe("let-op");
    const [n] = opvolgen({ ...leeg, offertes: [offerte({ geldig_tot: "2026-11-05", verstuurd_at: dagenGeleden(1) })] }, NU);
    expect(n).toMatchObject({ reden: "verloopt", termijn: "verloopt morgen" });
  });

  it("houdt een verlopen offerte een maand vast en laat hem daarna los", () => {
    expect(opvolgen({ ...leeg, offertes: [offerte({ geldig_tot: "2026-11-01" })] }, NU)[0]).toMatchObject({ reden: "verlopen", label: "Verlopen" });
    expect(opvolgen({ ...leeg, offertes: [offerte({ geldig_tot: "2026-09-20" })] }, NU)).toEqual([]);
  });

  it("negeert concepten, afgewezen en ingetrokken offertes", () => {
    for (const status of ["concept", "afgewezen", "ingetrokken"] as const) {
      expect(opvolgen({ ...leeg, offertes: [offerte({ status })] }, NU)).toEqual([]);
    }
  });
});

describe("getekend zonder basiscontract", () => {
  const getekend = offerte({ status: "getekend", getekend_at: dagenGeleden(2) });

  it("wijst de volgende stap aan: het basiscontract bij deze offerte", () => {
    const [s] = opvolgen({ ...leeg, offertes: [getekend] }, NU);
    expect(s).toMatchObject({ reden: "zonder-contract", label: "Getekend", toon: "goed", href: "/admin/contracten/nieuw?offerte=o1" });
  });

  it("is klaar als er voor die klant al een contract verstuurd is, ook onder een iets andere naam", () => {
    const c = contract({ bedrijf: "Jansen Bouw", email: "info@jansenbouw.nl", status: "verstuurd", verstuurd_at: dagenGeleden(1) });
    expect(opvolgen({ ...leeg, offertes: [getekend], contracten: [c] }, NU).filter((s) => s.reden === "zonder-contract")).toEqual([]);
  });

  it("gaat naar het concept als dat al klaarstaat", () => {
    const c = contract({ id: "c9", status: "concept", offerte_id: "o1", bedrijf: "Iets anders" });
    const s = opvolgen({ ...leeg, offertes: [getekend], contracten: [c] }, NU).find((x) => x.reden === "zonder-contract")!;
    expect(s.href).toBe("/admin/contracten/c9");
    expect(s.details[1]).toContain("staat klaar");
  });

  it("geldt niet voor een losse opdracht zoals een RI&E", () => {
    expect(opvolgen({ ...leeg, offertes: [{ ...getekend, vorm: "rie" }] }, NU)).toEqual([]);
  });
});

describe("brochures opvolgen", () => {
  it("meldt een bekeken brochure zolang er voor die klant nog geen offerte is", () => {
    const b = brochure({ bekeken_at: urenGeleden(5), laatst_bekeken_at: urenGeleden(5), aantal_bekeken: 1 });
    expect(opvolgen({ ...leeg, brochures: [b] }, NU)[0]).toMatchObject({ reden: "brochure-bekeken", toon: "warm" });

    // Offerte aan hetzelfde domein, na de brochure: dan is de brochure geen aanleiding meer.
    const o = offerte({ status: "concept", bedrijf: "Vermeulen Transport en Logistiek", email: "inkoop@vermeulen.nl", created_at: dagenGeleden(1) });
    expect(opvolgen({ ...leeg, brochures: [b], offertes: [o] }, NU).filter((s) => s.soort === "brochure")).toEqual([]);

    // Een offerte aan een ander bedrijf telt niet.
    expect(opvolgen({ ...leeg, brochures: [b], offertes: [offerte({ status: "concept" })] }, NU).some((s) => s.soort === "brochure")).toBe(true);
  });

  it("vraagt pas na vijf dagen om een herinnering, en niet meer na een maand", () => {
    expect(opvolgen({ ...leeg, brochures: [brochure({ verstuurd_at: dagenGeleden(4) })] }, NU)).toEqual([]);
    expect(opvolgen({ ...leeg, brochures: [brochure()] }, NU)[0]).toMatchObject({ reden: "niet-geopend" });
    expect(opvolgen({ ...leeg, brochures: [brochure({ verstuurd_at: dagenGeleden(40) })] }, NU)).toEqual([]);
  });

  it("laat een brochure die twee weken niet meer bekeken is los", () => {
    const b = brochure({ verstuurd_at: dagenGeleden(25), bekeken_at: dagenGeleden(20), laatst_bekeken_at: dagenGeleden(20), aantal_bekeken: 1 });
    expect(opvolgen({ ...leeg, brochures: [b] }, NU)).toEqual([]);
  });
});

describe("contracten opvolgen", () => {
  it("meldt een bekeken contract dat nog niet getekend is", () => {
    const c = contract({ bekeken_at: urenGeleden(3), laatst_bekeken_at: urenGeleden(3), aantal_bekeken: 2 });
    expect(opvolgen({ ...leeg, contracten: [c] }, NU)[0]).toMatchObject({ soort: "contract", label: "Net bekeken", toon: "warm" });
  });

  it("waarschuwt als de laatste opzegdag van een getekend contract nadert", () => {
    // Loopt tot 15 februari 2027: opzeggen uiterlijk 15 november 2026, over 11 dagen.
    const c = contract({ status: "getekend", ingangsdatum: "2026-02-16", einddatum: "2027-02-15", getekend_at: dagenGeleden(200) });
    const [s] = opvolgen({ ...leeg, contracten: [c] }, NU);
    expect(s).toMatchObject({ reden: "opzeggen", toon: "let-op", termijn: "laatste opzegdag over 11 dagen" });

    // Ruim voor de opzegtermijn: niets.
    expect(opvolgen({ ...leeg, contracten: [{ ...c, einddatum: "2027-08-31" }] }, NU)).toEqual([]);
  });
});

describe("bezoek en volgorde", () => {
  it("koppelt een bedrijf dat net op de site was en duwt het omhoog", () => {
    const o = offerte();
    const zonder = opvolgen({ ...leeg, offertes: [o] }, NU)[0];
    const met = opvolgen({ ...leeg, offertes: [o], bezoek: [{ naam: "jansenbouw.nl", domein: "jansenbouw.nl", laatst: urenGeleden(1), paginas: 4 }] }, NU)[0];
    expect(met.opSite).toBe("Op de site 1 uur geleden, 4 pagina's");
    expect(met.gewicht).toBeGreaterThan(zonder.gewicht);
    expect(met.toon).toBe("let-op");
  });

  it("zet warm vóór let op vóór informatie", () => {
    const lijst = opvolgen({
      offertes: [
        offerte({ id: "koud" }),
        offerte({ id: "warm", bekeken_at: urenGeleden(1), laatst_bekeken_at: urenGeleden(1), aantal_bekeken: 1 }),
      ],
      brochures: [brochure({ bekeken_at: dagenGeleden(6), laatst_bekeken_at: dagenGeleden(6), aantal_bekeken: 1 })],
      contracten: [],
    }, NU);
    expect(lijst.map((s) => s.toon)).toEqual(["warm", "let-op", "info"]);
  });
});

describe("klant herkennen", () => {
  it("gebruikt het domein alleen als het geen Gmail of Hotmail is", () => {
    expect(klantSleutels({ bedrijf: "Smit Installatie B.V.", email: "Anna@Smit.nl" })).toEqual(["naam:smit installatie", "mail:anna@smit.nl", "domein:smit.nl"]);
    expect(klantSleutels({ bedrijf: "Bakkerij Piet", email: "piet@gmail.com" })).toEqual(["naam:bakkerij piet", "mail:piet@gmail.com"]);
  });
});

describe("verkoopcijfers", () => {
  it("telt de open waarde, wat de laatste 30 dagen getekend is, de hitrate en de contracten", () => {
    const c = verkoopcijfers(
      [
        offerte({ id: "1", bekeken_at: dagenGeleden(1), laatst_bekeken_at: dagenGeleden(1), aantal_bekeken: 1 }),
        offerte({ id: "2" }),
        offerte({ id: "3", status: "getekend", getekend_at: dagenGeleden(10), verstuurd_at: dagenGeleden(20) }),
        offerte({ id: "4", status: "afgewezen", verstuurd_at: dagenGeleden(40) }),
        offerte({ id: "5", status: "getekend", getekend_at: dagenGeleden(50), verstuurd_at: dagenGeleden(60) }),
      ],
      [contract({ status: "getekend" }), contract({ id: "c2" })],
      NU
    );
    expect(c.open).toEqual({ aantal: 2, bekeken: 1, perMaand: 200, eenmalig: 0 });
    expect(c.getekend30).toEqual({ aantal: 1, perMaand: 100, eenmalig: 0 });
    expect(c.hitrate).toEqual({ procent: 67, getekend: 2, afgerond: 3 });
    expect(c.contracten).toEqual({ getekend: 1, wacht: 1 });
  });

  it("schrijft een waarde per maand en eenmalig", () => {
    expect(waardeTekst({ perMaand: 450, eenmalig: 0 })).toBe("€450 per maand");
    expect(waardeTekst({ perMaand: 0, eenmalig: 1250 })).toBe("€1.250 eenmalig");
    expect(waardeTekst({ perMaand: 0, eenmalig: 0 })).toBeNull();
  });
});
