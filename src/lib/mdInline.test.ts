import { describe, expect, it } from "vitest";
import { inlineDelen, veiligeHref } from "./mdInline";

describe("inlineDelen", () => {
  it("laat gewone tekst heel", () => {
    expect(inlineDelen("Gewoon een zin.")).toEqual([{ soort: "tekst", tekst: "Gewoon een zin." }]);
  });

  it("herkent vet, zoals voorheen", () => {
    expect(inlineDelen("Let op: **uiterlijk in week 42** melden.")).toEqual([
      { soort: "tekst", tekst: "Let op: " },
      { soort: "vet", tekst: "uiterlijk in week 42" },
      { soort: "tekst", tekst: " melden." },
    ]);
  });

  it("maakt van een link naar een eigen pad een link", () => {
    expect(inlineDelen("Lees de [checklist](/blog/loonsanctie-voorkomen) eerst.")).toEqual([
      { soort: "tekst", tekst: "Lees de " },
      { soort: "link", tekst: "checklist", href: "/blog/loonsanctie-voorkomen" },
      { soort: "tekst", tekst: " eerst." },
    ]);
  });

  it("combineert vet en links in één regel", () => {
    expect(inlineDelen("**Tip:** zie [UWV](https://www.uwv.nl).")).toEqual([
      { soort: "vet", tekst: "Tip:" },
      { soort: "tekst", tekst: " zie " },
      { soort: "link", tekst: "UWV", href: "https://www.uwv.nl" },
      { soort: "tekst", tekst: "." },
    ]);
  });

  it("laat een onveilige link staan als tekst", () => {
    expect(inlineDelen("[klik](javascript:void)")).toEqual([{ soort: "tekst", tekst: "[klik](javascript:void)" }]);
  });
});

describe("veiligeHref", () => {
  it("staat eigen paden, ankers, http(s), mail en telefoon toe", () => {
    for (const h of ["/recover", "#vragen", "https://www.uwv.nl", "http://example.org", "mailto:sales@react2u.nl", "tel:+31856205800"]) {
      expect(veiligeHref(h)).toBe(h);
    }
  });

  it("weigert scripts en adressen zonder protocol", () => {
    for (const h of ["javascript:alert(1)", "//elders.nl", "data:text/html,x", "www.uwv.nl"]) {
      expect(veiligeHref(h)).toBeNull();
    }
  });
});
