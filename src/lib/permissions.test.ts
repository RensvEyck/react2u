import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, isMijnReact2u, kanWisselen, zichtbareRechten, type Permission } from "./permissions";

const werknemer: Permission[] = ["weekevaluatie", "overleg"];
const beheerder: Permission[] = ["postvak", "bellijst", "paginas", "weekevaluatie", "overleg"];
const redacteur: Permission[] = ["paginas", "blog", "vacatures", "media", "seo"];

describe("Mijn React2u en Beheer", () => {
  it("geeft een werknemer altijd Mijn React2u, zonder wisselknop", () => {
    expect(isMijnReact2u(werknemer)).toBe(true);
    expect(kanWisselen(werknemer)).toBe(false);
  });

  it("laat wie beheerrechten en een recht uit het portaal heeft wisselen", () => {
    expect(isMijnReact2u(beheerder)).toBe(false);
    expect(kanWisselen(beheerder)).toBe(true);
    expect(kanWisselen(ALL_PERMISSIONS)).toBe(true);
  });

  it("laat wie niets uit het portaal heeft niet wisselen", () => {
    expect(kanWisselen(redacteur)).toBe(false);
  });

  it("toont in Mijn React2u alleen de rechten van het portaal", () => {
    expect(zichtbareRechten(beheerder, true)).toEqual(["weekevaluatie", "overleg"]);
    expect(isMijnReact2u(zichtbareRechten(ALL_PERMISSIONS, true))).toBe(true);
    expect(zichtbareRechten(beheerder, false)).toEqual(beheerder);
  });
});
