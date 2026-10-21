import { describe, expect, it } from "vitest";
import { DESC_MAX, HOME_TITEL, SEO_FALLBACK, analysePage, kort, metOmschrijving, omschrijving, paginaTitel } from "./seo";
import type { Page } from "./types";

describe("paginaTitel", () => {
  it("zet het merk er één keer achter", () => {
    expect(paginaTitel("Casemanager • Vacature")).toBe("Casemanager • Vacature • React2u");
    expect(paginaTitel("Casemanager • React2u")).toBe("Casemanager • React2u");
    expect(paginaTitel("Casemanager | react2u ")).toBe("Casemanager • React2u");
    expect(paginaTitel("Casemanager - React2u")).toBe("Casemanager • React2u");
    expect(paginaTitel("")).toBe("React2u");
  });
});

describe("kort", () => {
  it("laat een korte tekst met rust en normaliseert witruimte", () => {
    expect(kort("  Eén  regel\n tekst ")).toBe("Eén regel tekst");
    expect(kort("")).toBeUndefined();
    expect(kort(null)).toBeUndefined();
  });

  it("kapt op een woordgrens af, binnen de grens", () => {
    const lang = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(" ");
    const k = kort(lang)!;
    expect(k.length).toBeLessThanOrEqual(DESC_MAX);
    expect(k.endsWith("…")).toBe(true);
    // Niet midden in een woord: wat overblijft staat zo, gevolgd door een spatie, in het origineel.
    expect(lang.startsWith(`${k.slice(0, -1)} `)).toBe(true);
    expect(kort(lang, 40)).toBe("woord0 woord1 woord2 woord3 woord4…");
  });
});

describe("omschrijving", () => {
  const lang = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(" ");

  it("laat een eigen SEO-tekst heel, ook boven de redactiegrens", () => {
    // /werkgevers eindigde op "Persoonlijk…" omdat kort() ook eigen teksten afkapte.
    expect(omschrijving(lang)).toBe(lang);
    expect(omschrijving("  Eén  regel\n tekst ")).toBe("Eén regel tekst");
  });

  it("kort alleen een afgeleide tekst in", () => {
    expect(omschrijving(null, lang)!.length).toBeLessThanOrEqual(DESC_MAX);
    expect(omschrijving("", lang)!.endsWith("…")).toBe(true);
    expect(omschrijving("Eigen", lang)).toBe("Eigen");
  });

  it("geeft niets terug als er niets is, zodat de sleutel weg kan blijven", () => {
    expect(omschrijving(null)).toBeUndefined();
    expect(omschrijving("  ", "")).toBeUndefined();
    expect(metOmschrijving(undefined)).toEqual({});
    expect(metOmschrijving("x")).toEqual({ description: "x" });
  });
});

describe("analysePage", () => {
  const pagina = (extra: Partial<Page>): Page => ({
    id: "1", slug: "werkgevers", title: "Werkgevers", seo_title: null, seo_description: null, og_image: null,
    published: true, sort: 0, updated_at: "", ...extra,
  });

  it("toont zonder eigen omschrijving de site-brede standaardtekst als waarschuwing, niet als fout", () => {
    const r = analysePage(pagina({}), "Standaardtekst uit Instellingen");
    expect(r.description.value).toBe("Standaardtekst uit Instellingen");
    expect(r.description.custom).toBe(false);
    expect(r.description.severity).toBe("warn");
    expect(analysePage(pagina({})).description.value).toBe(SEO_FALLBACK.description);
  });

  it("gebruikt voor de homepage dezelfde titel als de pagina zelf", () => {
    expect(analysePage(pagina({ slug: "home", title: "Home" })).title.value).toBe(HOME_TITEL);
    expect(HOME_TITEL).not.toMatch(/^Home/);
  });
});
