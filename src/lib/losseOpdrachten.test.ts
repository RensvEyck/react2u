import { describe, expect, it } from "vitest";
import { alsOfferte, gestoptVan, leesBedrag, leesLos, losLabel, type LosseOpdracht } from "./losseOpdrachten";
import { abonnementen, omzetPerMaand, perKlant, perLabel } from "./omzet";
import { kern, perVerkoper, perVorm, pijplijn, trechter } from "./verkoop";

const NU = new Date("2026-11-04T10:00:00Z");

function los(over: Partial<LosseOpdracht> = {}): LosseOpdracht {
  return {
    id: "l1", soort: "abonnement", bedrijf: "Van Dijk Bouw", omschrijving: "Verzuimbegeleiding 40 medewerkers", vorm: "verzuimbegeleiding",
    bedrag: 450, datum: "2025-03-01", stop: null, verkoper: "Susanne Linders", contactpersoon: null, email: null, notitie: null,
    created_at: "2026-11-04T09:00:00Z", updated_at: "2026-11-04T09:00:00Z", ...over,
  };
}

describe("invoer", () => {
  it("leest bedragen zoals je ze tikt", () => {
    expect(leesBedrag("1.250,50")).toBe(1250.5);
    expect(leesBedrag("€ 450")).toBe(450);
    expect(leesBedrag("1250.5")).toBe(1250.5);
    expect(leesBedrag("1.250")).toBe(1250);
    expect(leesBedrag("abc")).toBeNull();
    expect(leesBedrag("")).toBeNull();
  });

  it("maakt van een formulier een rij, of zegt wat er ontbreekt", () => {
    const velden = (v: Record<string, string>) => (k: string) => v[k] ?? "";
    expect(leesLos(velden({ soort: "abonnement", bedrijf: "", bedrag: "450", datum: "2025-03-01" }))).toEqual({ ok: false, fout: "los-bedrijf" });
    expect(leesLos(velden({ soort: "abonnement", bedrijf: "X", bedrag: "0", datum: "2025-03-01" }))).toEqual({ ok: false, fout: "los-bedrag" });
    expect(leesLos(velden({ soort: "abonnement", bedrijf: "X", bedrag: "450", datum: "" }))).toEqual({ ok: false, fout: "los-datum" });
    expect(leesLos(velden({ soort: "abonnement", bedrijf: "X", bedrag: "450", datum: "2025-03-01", stop: "2025-02" }))).toEqual({ ok: false, fout: "los-stop" });
    const r = leesLos(velden({ soort: "eenmalig", bedrijf: " Drukkerij Peeters ", bedrag: "1.450", datum: "2026-10-12", vorm: "rie", stop: "2026-12", email: "geen-mail" }));
    expect(r).toMatchObject({ ok: true, rij: { soort: "eenmalig", bedrijf: "Drukkerij Peeters", bedrag: 1450, vorm: "rie", stop: null, email: null } });
  });
});

describe("als getekende offerte", () => {
  it("telt een abonnement per maand vanaf de startdatum, tot het stopt", () => {
    const abos = abonnementen(
      [alsOfferte(los({ stop: "2026-10-01" }))],
      [gestoptVan(los({ stop: "2026-10-01" }))!]
    );
    const reeks = omzetPerMaand(abos, [], [], ["2025-02", "2025-03", "2026-09", "2026-10"]);
    expect(reeks.map((m) => m.abonnementen)).toEqual([0, 450, 450, 0]);
    expect(abos[0].labels).toEqual([{ label: "React2u Recover", kleur: "#E61674", perMaand: 450 }]);
  });

  it("telt een losse opdracht eenmalig in zijn maand, met Overig als er geen dienst bij hoort", () => {
    const abos = abonnementen([alsOfferte(los({ id: "l2", soort: "eenmalig", vorm: null, bedrag: 1450, datum: "2026-10-12" }))]);
    const reeks = omzetPerMaand(abos, [], [], ["2026-10", "2026-11"]);
    expect(reeks.map((m) => [m.abonnementen, m.eenmalig])).toEqual([[0, 1450], [0, 0]]);
    expect(losLabel(null)).toMatchObject({ label: "Overig" });
  });

  it("voegt een losse klant samen met zijn offertes in de klantenlijst en per label", () => {
    const abos = abonnementen([alsOfferte(los()), alsOfferte(los({ id: "l3", bedrijf: "Van Dijk Bouw B.V.", vorm: "rie", bedrag: 50 }))]);
    expect(perKlant(abos, "2026-11").map((k) => [k.bedrijf, k.perMaand, k.abonnementen.length])).toEqual([["Van Dijk Bouw", 500, 2]]);
    expect(perLabel(abos, "2026-11").map((l) => [l.label, l.perMaand])).toEqual([["React2u Recover", 450], ["React2u Resist", 50]]);
  });

  it("telt in het salesdashboard als getekend, maar niet in hitrate, trechter of pijplijn", () => {
    const rijen = [alsOfferte(los({ datum: "2026-10-20" })), alsOfferte(los({ id: "l4", soort: "eenmalig", vorm: null, bedrag: 900, datum: "2026-10-25", verkoper: "Cindy Faro" }))];
    const k = kern(rijen, "2026-08-06", NU);
    expect(k.getekend).toEqual({ aantal: 2, perMaand: 450, eenmalig: 900 });
    expect(k.hitrate).toEqual({ procent: null, getekend: 0, afgerond: 0 });
    expect(k.doorlooptijd).toBeNull();
    expect(trechter(rijen, [], "2026-08-06").offertes[0].aantal).toBe(0);
    expect(pijplijn(rijen, NU).every((f) => f.aantal === 0)).toBe(true);
    expect(perVorm(rijen, "2026-08-06", NU).map((g) => g.label)).toEqual(["Verzuim", "Overig"]);
    expect(perVerkoper(rijen, "2026-08-06", NU).map((g) => [g.label, g.getekend])).toEqual([["Susanne Linders", 1], ["Cindy Faro", 1]]);
  });
});
