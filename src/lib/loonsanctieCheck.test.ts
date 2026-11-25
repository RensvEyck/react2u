import { describe, expect, it } from "vitest";
import { CHECK_VRAGEN, MAX_SCORE, uitkomst } from "./loonsanctieCheck";

describe("loonsanctie-check", () => {
  it("heeft twaalf vragen met een gewicht, een waarom en een herstel", () => {
    expect(CHECK_VRAGEN).toHaveLength(12);
    expect(new Set(CHECK_VRAGEN.map((v) => v.id)).size).toBe(12);
    for (const v of CHECK_VRAGEN) {
      expect(v.vraag.endsWith("?")).toBe(true);
      expect([1, 2, 3]).toContain(v.gewicht);
      expect(v.waarom.length).toBeGreaterThan(20);
      expect(v.herstel.length).toBeGreaterThan(20);
    }
    expect(MAX_SCORE).toBe(27);
  });

  it("geeft laag risico bij alleen ja, en hoog bij niets ingevuld", () => {
    const alles = Object.fromEntries(CHECK_VRAGEN.map((v) => [v.id, "ja" as const]));
    expect(uitkomst(alles)).toMatchObject({ score: 0, max: 27, risico: "laag", zwak: [] });
    const leeg = uitkomst({});
    expect(leeg.score).toBe(27);
    expect(leeg.risico).toBe("hoog");
    expect(leeg.zwak[0].gewicht).toBe(3);
  });

  it("telt onbekend als ontbrekend en sorteert de zwakke punten op gewicht", () => {
    const u = uitkomst({ ...Object.fromEntries(CHECK_VRAGEN.map((v) => [v.id, "ja" as const])), "tweede-spoor": "onbekend", ziekmelding: "nee" });
    expect(u.score).toBe(4);
    expect(u.risico).toBe("verhoogd");
    expect(u.zwak.map((v) => v.id)).toEqual(["tweede-spoor", "ziekmelding"]);
  });

  it("laat vragen weg die in de opgegeven week nog niet aan de orde zijn", () => {
    const u = uitkomst({}, 10);
    expect(u.nogNiet.map((v) => v.id)).toEqual(["evaluaties", "42-weken", "eerstejaarsevaluatie", "ander-werk", "arbeidsdeskundig", "tweede-spoor"]);
    expect(u.max).toBe(27 - 3 - 2 - 3 - 2 - 2 - 3);
    expect(u.score).toBe(u.max);
  });
});
