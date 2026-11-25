import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AUTEURS, auteurVoor, auteurVoorNaam, gidsenVan } from "./auteurs";
import { GIDSEN, bijgewerktOp } from "./gidsen";
import { controleerGids, gidsScore, isGids } from "./gidsSeo";

const map = fileURLToPath(new URL("../content/", import.meta.url));
const concept = (slug: string) => JSON.parse(readFileSync(`${map}${slug}.json`, "utf8")) as { slug: string; title: string; seo_title: string; seo_description: string; blocks: { type: string; data: unknown }[] };

describe("auteurs", () => {
  it("elke gids heeft een auteur met een pagina, en de naam in de kop is dezelfde", () => {
    for (const g of GIDSEN) {
      const a = auteurVoor(g.auteur);
      expect(a, g.slug).not.toBeNull();
      const kop = concept(g.slug).blocks[0].data as { auteur?: { naam?: string } };
      expect(auteurVoorNaam(kop.auteur?.naam)?.slug, g.slug).toBe(g.auteur);
    }
    expect(gidsenVan("rens-van-eyck")).toHaveLength(GIDSEN.length);
    expect(auteurVoorNaam("Iemand Anders")).toBeNull();
    expect(auteurVoorNaam(" rens van eyck ")?.slug).toBe("rens-van-eyck");
  });

  it("noemt alleen wat te onderbouwen is: een functie, een bio, geen verzonnen registraties", () => {
    for (const a of AUTEURS) {
      expect(a.functie.length).toBeGreaterThan(3);
      expect(a.bio.length).toBeGreaterThanOrEqual(1);
      expect(a.onderwerpen.length).toBeGreaterThan(0);
      expect(Array.isArray(a.registraties)).toBe(true);
    }
  });
});

describe("bijgewerkt op", () => {
  it("neemt de datum uit de kop of de laatste wijziging in de database, wat later is", () => {
    expect(bijgewerktOp("2026-11-23", "2026-11-30")).toBe("2026-11-30");
    expect(bijgewerktOp("2026-11-23", "2026-11-01")).toBe("2026-11-23");
    expect(bijgewerktOp("2026-11-23", null)).toBe("2026-11-23");
    expect(bijgewerktOp(undefined, "2026-11-30")).toBe("2026-11-30");
    expect(bijgewerktOp("gisteren", "2026-11-30T10:00")).toBeNull();
  });
});

describe("controles op een gids (/admin/seo)", () => {
  it("laat elke gids uit de concepten op alle punten slagen", () => {
    for (const g of GIDSEN) {
      const c = concept(g.slug);
      expect(isGids(c.blocks)).toBe(true);
      const controles = controleerGids({ slug: c.slug, title: c.title, seo_title: c.seo_title, seo_description: c.seo_description }, c.blocks);
      const mist = controles.filter((x) => !x.ok).map((x) => `${x.label}: ${x.detail}`);
      expect(mist, g.slug).toEqual([]);
      expect(gidsScore(controles)).toEqual({ ok: controles.length, totaal: controles.length });
    }
  });

  it("ziet wat er mist op een gids uit het beheer", () => {
    const blocks = [
      { type: "gidsKop", data: { heading: "Alles over verzuim", antwoord: "Eén zin.", auteur: { naam: "Onbekend", functie: "" } } },
      { type: "gidsTekst", data: { heading: "Kop", tekst: "weinig tekst" } },
      { type: "gidsVragen", data: { items: [{ question: "Vraag?", answer: "Antwoord." }] } },
      { type: "gidsHelpt", data: { heading: "Zo helpt React2u", dienst: {} } },
    ];
    const controles = controleerGids({ slug: "nieuw", title: "Nieuw", seo_title: "Een veel te lange titel die ver boven de zestig tekens van Google uitkomt • React2u", seo_description: "kort" }, blocks);
    const perSleutel = Object.fromEntries(controles.map((c) => [c.sleutel, c.ok]));
    expect(perSleutel).toEqual({ vraag: false, antwoord: false, woorden: false, tijdlijn: false, tabel: false, vragen: false, auteur: false, bronnen: false, dienst: false, titel: false, omschrijving: false });
    expect(isGids([{ type: "gidsTekst", data: {} }])).toBe(false);
    expect(isGids([])).toBe(false);
  });
});
