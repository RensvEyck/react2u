import { describe, expect, it } from "vitest";
import { ZIEKMELDEN_STANDAARD, geldigeUrl, normalizeKoppelingen, werkdagenTekst } from "./koppelingen";

describe("koppelingen", () => {
  it("valt terug op de standaardwaarden", () => {
    expect(normalizeKoppelingen(null)).toEqual({ kennismaking_url: "", sollicitatie_werkdagen: 5, ziekmelden_url: ZIEKMELDEN_STANDAARD });
    expect(normalizeKoppelingen({ sollicitatie_werkdagen: "0" }).sollicitatie_werkdagen).toBe(5);
    expect(normalizeKoppelingen({ sollicitatie_werkdagen: "3" }).sollicitatie_werkdagen).toBe(3);
    expect(normalizeKoppelingen({ sollicitatie_werkdagen: 99 }).sollicitatie_werkdagen).toBe(5);
  });

  it("laat alleen http(s)-adressen door", () => {
    expect(geldigeUrl(" https://calendly.com/react2u/kennismaking ")).toBe("https://calendly.com/react2u/kennismaking");
    expect(geldigeUrl("calendly.com/react2u")).toBe("");
    expect(geldigeUrl("javascript:alert(1)")).toBe("");
    expect(geldigeUrl("")).toBe("");
    expect(normalizeKoppelingen({ kennismaking_url: "ftp://x" }).kennismaking_url).toBe("");
  });

  it("valt voor ziek melden terug op het klantportaal, nooit op een lege knop", () => {
    expect(normalizeKoppelingen({ ziekmelden_url: "" }).ziekmelden_url).toBe(ZIEKMELDEN_STANDAARD);
    expect(normalizeKoppelingen({ ziekmelden_url: "javascript:x" }).ziekmelden_url).toBe(ZIEKMELDEN_STANDAARD);
    expect(normalizeKoppelingen({ ziekmelden_url: "https://portaal.voorbeeld.nl/ziek" }).ziekmelden_url).toBe("https://portaal.voorbeeld.nl/ziek");
  });

  it("schrijft werkdagen als woord", () => {
    expect(werkdagenTekst(1)).toBe("één werkdag");
    expect(werkdagenTekst(5)).toBe("vijf werkdagen");
    expect(werkdagenTekst(12)).toBe("12 werkdagen");
  });
});
