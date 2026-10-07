import { describe, expect, it } from "vitest";
import { terugQuery, veiligTerugPad } from "./terug";

describe("terug naar waar je was", () => {
  it("laat paden binnen het adminpaneel door, met query", () => {
    expect(veiligTerugPad("/admin")).toBe("/admin");
    expect(veiligTerugPad("/admin/bellijst")).toBe("/admin/bellijst");
    expect(veiligTerugPad("/admin/bellijst?filter=alles&q=bakker")).toBe("/admin/bellijst?filter=alles&q=bakker");
    expect(veiligTerugPad("/admin/paginas/home/blok/1a2b")).toBe("/admin/paginas/home/blok/1a2b");
  });

  it("weigert alles buiten het adminpaneel", () => {
    expect(veiligTerugPad("/")).toBeNull();
    expect(veiligTerugPad("/werkgevers")).toBeNull();
    expect(veiligTerugPad("/administratie")).toBeNull();
    expect(veiligTerugPad("admin/bellijst")).toBeNull();
  });

  it("weigert andere sites, hoe ook verpakt", () => {
    expect(veiligTerugPad("https://evil.example/admin")).toBeNull();
    expect(veiligTerugPad("//evil.example/admin")).toBeNull();
    expect(veiligTerugPad("/\\evil.example/admin")).toBeNull();
    expect(veiligTerugPad("\\\\evil.example/admin")).toBeNull();
    expect(veiligTerugPad("javascript:alert(1)")).toBeNull();
    expect(veiligTerugPad("/admin/\nbellijst")).toBeNull();
  });

  it("stuurt niet terug naar het inlogscherm zelf", () => {
    expect(veiligTerugPad("/admin/login")).toBeNull();
    expect(veiligTerugPad("/admin/login?stap=code")).toBeNull();
    expect(veiligTerugPad("/admin/uitnodiging?token_hash=x")).toBeNull();
  });

  it("normaliseert ../ binnen het pad", () => {
    expect(veiligTerugPad("/admin/../werkgevers")).toBeNull();
    expect(veiligTerugPad("/admin/bellijst/../paginas")).toBe("/admin/paginas");
  });

  it("leeg of te lang is geen pad", () => {
    expect(veiligTerugPad("")).toBeNull();
    expect(veiligTerugPad(null)).toBeNull();
    expect(veiligTerugPad(`/admin/${"a".repeat(600)}`)).toBeNull();
  });

  it("bouwt de query alleen als er iets terug te gaan valt", () => {
    expect(terugQuery("/admin")).toBe("");
    expect(terugQuery("/admin/bellijst?filter=alles")).toBe("terug=%2Fadmin%2Fbellijst%3Ffilter%3Dalles");
    expect(terugQuery("https://evil.example")).toBe("");
  });
});
