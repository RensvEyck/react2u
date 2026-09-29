import { describe, expect, it } from "vitest";
import { blockText, findRanges, fold, ilikeTerm, score, snippet, terms } from "./search";

describe("zoeken", () => {
  it("vouwt accenten en hoofdletters", () => {
    expect(fold("Café Überhaupt")).toBe("cafe uberhaupt");
  });

  it("markeert op de plek in het origineel, ook met accenten", () => {
    const t = "Een café in Eindhoven";
    const [[a, b]] = findRanges(t, terms("cafe"));
    expect(t.slice(a, b)).toBe("café");
  });

  it("neemt een los accentteken mee in de markering", () => {
    const t = "café bar";
    const ranges = findRanges(t, terms("café bar"));
    expect(ranges.map(([a, b]) => t.slice(a, b))).toEqual(["café", "bar"]);
  });

  it("knipt een fragment op woordgrenzen rond de treffer", () => {
    const text = "Lorem ipsum dolor sit amet ".repeat(10) + "verzuimbegeleiding voor werkgevers " + "consectetur ".repeat(20);
    const s = snippet(text, terms("verzuim"))!;
    expect(s.clippedStart && s.clippedEnd).toBe(true);
    const [a, b] = s.ranges[0];
    expect(s.text.slice(a, b)).toBe("verzuim");
    expect(s.text.startsWith(" ")).toBe(false);
  });

  it("zet een treffer in de titel boven een treffer in de tekst", () => {
    const t = terms("con");
    expect(score({ title: "Contact" }, t)).toBeGreaterThan(score({ title: "Home", text: "concreet" }, t));
    expect(score({ title: "Home", text: "abc" }, t)).toBe(0);
  });

  it("eist dat elke zoekterm ergens voorkomt", () => {
    expect(score({ title: "Verzuimbegeleiding WVP" }, terms("verzuim erd"))).toBe(0);
    expect(score({ title: "Verzuimbegeleiding ERD/ZW" }, terms("verzuim erd"))).toBeGreaterThan(0);
  });

  it("haalt alleen leesbare tekst uit blokdata", () => {
    const txt = blockText({
      heading: "Kop",
      button: { label: "Bel ons", href: "/contact" },
      icon: "check",
      image: "https://x/y.png",
      cards: [{ title: "**Vet**", description: "- punt" }],
    });
    expect(txt).toBe("Kop · Bel ons · Vet · punt");
  });

  it("maakt een zoekterm veilig voor een PostgREST-filter", () => {
    expect(ilikeTerm("a,b (c) 100% _x_")).toBe("a b c 100 x");
    expect(ilikeTerm("jan@x.nl")).toBe("jan@x.nl");
  });
});
