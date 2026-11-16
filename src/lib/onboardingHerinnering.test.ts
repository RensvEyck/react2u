import { describe, expect, it } from "vitest";
import { herinneringNodig, laatsteActiviteit } from "./onboardingHerinnering";

const dag = (n: number, nu = new Date("2026-11-16T08:30:00Z")) => new Date(nu.getTime() - n * 86_400_000).toISOString();
const NU = new Date("2026-11-16T08:30:00Z");
const basis = { status: "verstuurd" as const, email: "piet@peters.test", verstuurd_at: dag(6), bekeken_at: null, laatst_bekeken_at: null, antwoorden: {}, gelezen: {} };

describe("automatische herinneringen", () => {
  it("herinnert na vijf dagen niet geopend", () => {
    expect(herinneringNodig(basis, [], NU)).toBe("niet-geopend");
    expect(herinneringNodig({ ...basis, verstuurd_at: dag(3) }, [], NU)).toBeNull();
  });
  it("herinnert na tien dagen stilte, niet terwijl de klant bezig is", () => {
    const bezig = { ...basis, verstuurd_at: dag(20), bekeken_at: dag(19), laatst_bekeken_at: dag(2) };
    expect(herinneringNodig(bezig, [], NU)).toBeNull();
    const stil = { ...bezig, laatst_bekeken_at: dag(11), antwoorden: { inrichting: { data: {}, at: dag(12), door: null } } };
    expect(herinneringNodig(stil, [], NU)).toBe("stil");
    expect(laatsteActiviteit(stil)).toBe(dag(11));
  });
  it("stopt na twee automatische herinneringen en houdt zeven dagen afstand, ook van een collega", () => {
    const o = { ...basis, verstuurd_at: dag(30) };
    const auto = (n: number) => ({ soort: "herinnering" as const, at: dag(n), details: { aan: "x", automatisch: true } });
    expect(herinneringNodig(o, [auto(20), auto(10)], NU)).toBeNull();
    expect(herinneringNodig(o, [auto(3)], NU)).toBeNull();
    expect(herinneringNodig(o, [auto(8)], NU)).toBe("niet-geopend");
    expect(herinneringNodig(o, [{ soort: "herinnering", at: dag(2), details: { aan: "x" } }], NU)).toBeNull();
  });
  it("laat afgeronde, ingetrokken of mailloze onboardings met rust", () => {
    expect(herinneringNodig({ ...basis, status: "afgerond" }, [], NU)).toBeNull();
    expect(herinneringNodig({ ...basis, email: null }, [], NU)).toBeNull();
  });
});
