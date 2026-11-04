import { describe, expect, it } from "vitest";
import {
  cel, declarabiliteit, groepsnorm, leesUren, maandagVan, maandVanWeek, oordeel, optellen, plusWeken, urenTekst, weekBereik, weekNummer, wekenTot,
} from "./uren";

describe("weken", () => {
  it("vindt de maandag van elke dag in de week", () => {
    expect(maandagVan("2026-11-04")).toBe("2026-11-02"); // woensdag
    expect(maandagVan("2026-11-08")).toBe("2026-11-02"); // zondag
    expect(maandagVan("2026-11-02")).toBe("2026-11-02");
  });

  it("telt ISO-weken, ook over de jaargrens", () => {
    expect(weekNummer("2026-11-02")).toEqual({ jaar: 2026, week: 45 });
    // Maandag 28 december 2026: week 53 van 2026 (donderdag 31 december).
    expect(weekNummer("2026-12-28")).toEqual({ jaar: 2026, week: 53 });
    expect(weekNummer("2027-01-04")).toEqual({ jaar: 2027, week: 1 });
  });

  it("geeft een week aan de maand van zijn donderdag", () => {
    expect(maandVanWeek("2026-10-26")).toBe("2026-10"); // do 29 okt
    expect(maandVanWeek("2026-11-30")).toBe("2026-12"); // do 3 dec
  });

  it("schrijft het bereik van een week", () => {
    expect(weekBereik("2026-11-02")).toBe("2–8 nov");
    expect(weekBereik("2026-10-26")).toBe("26 okt – 1 nov");
  });

  it("geeft de laatste weken, oudste eerst", () => {
    expect(wekenTot("2026-11-04", 3)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(plusWeken("2026-11-02", -1)).toBe("2026-10-26");
  });
});

describe("invoer", () => {
  it("leest uren met komma, punt of ½, en weigert onzin", () => {
    expect(leesUren("7,5")).toBe(7.5);
    expect(leesUren("7.25")).toBe(7.25);
    expect(leesUren("7½")).toBe(7.5);
    expect(leesUren("")).toBe(0);
    expect(leesUren("abc")).toBeNull();
    expect(leesUren("-3")).toBeNull();
    expect(leesUren("90")).toBeNull();
    expect(urenTekst(7.5)).toBe("7,5");
    expect(urenTekst(36)).toBe("36");
  });
});

describe("declarabiliteit", () => {
  it("rekent met de beschikbare uren: contracturen min afwezig", () => {
    const m = { contracturen: 36 };
    expect(cel(m, { medewerker_id: "a", week: "2026-11-02", declarabel: 27, afwezig: 0 }).procent).toBe(75);
    // 8 uur vrij: 28 beschikbaar, 21 declarabel is ook 75%.
    expect(cel(m, { medewerker_id: "a", week: "2026-11-02", declarabel: 21, afwezig: 8 })).toMatchObject({ beschikbaar: 28, procent: 75 });
    expect(cel(m, undefined)).toMatchObject({ ingevuld: false, procent: null });
    expect(declarabiliteit(0, 0)).toBeNull();
  });

  it("oordeelt tegenover de norm", () => {
    expect(oordeel(80, 75)).toBe("boven");
    expect(oordeel(74, 75)).toBe("op");
    expect(oordeel(68, 75)).toBe("net-onder");
    expect(oordeel(50, 75)).toBe("onder");
    expect(oordeel(null, 75)).toBeNull();
  });

  it("telt alleen ingevulde weken mee", () => {
    const m = { contracturen: 32 };
    const t = optellen([
      cel(m, { medewerker_id: "a", week: "w1", declarabel: 24, afwezig: 0 }),
      cel(m, undefined),
      cel(m, { medewerker_id: "a", week: "w3", declarabel: 16, afwezig: 16 }),
    ]);
    expect(t).toEqual({ declarabel: 40, afwezig: 16, beschikbaar: 48, procent: 83, weken: 2 });
  });

  it("weegt de norm van een team naar contracturen", () => {
    expect(groepsnorm([{ contracturen: 36, norm: 80 }, { contracturen: 18, norm: 50 }])).toBe(70);
    expect(groepsnorm([])).toBeNull();
  });
});
