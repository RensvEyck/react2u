import { describe, expect, it } from "vitest";
import {
  aanvragen, byHerkomst, byKind, byLanding, byPath, isKlik, klikken, klikkenPerPagina, klikkenPerSoort, overallRate, pathFromReferer, type Conversion,
} from "./conversions";
import type { PageView } from "./types";

const conv = (kind: Conversion["kind"], path: string, i: number): Conversion => ({
  id: `c${i}`, kind, path, created_at: "2026-10-01T10:00:00Z",
});
const view = (path: string, hash: string): PageView => ({
  id: `${path}-${hash}`, path, referrer_host: null, country: null, company: null, is_company: false,
  visitor_hash: hash, created_at: "2026-10-01T09:00:00Z",
});

describe("conversies", () => {
  it("haalt het pad uit de Referer, zonder host of querystring", () => {
    expect(pathFromReferer("https://react2u.nl/werkgevers?utm_source=x")).toBe("/werkgevers");
    expect(pathFromReferer("https://react2u-v5.vercel.app/verzuimabonnementen/")).toBe("/verzuimabonnementen");
    expect(pathFromReferer(null)).toBe("/");
    expect(pathFromReferer("geen url")).toBe("/");
  });

  it("telt per soort, ook de soorten met nul", () => {
    const rows = byKind([conv("offerte", "/a", 1), conv("offerte", "/b", 2), conv("terugbel", "/a", 3)]);
    expect(rows.map((r) => [r.kind, r.count])).toEqual([
      ["contact", 0], ["offerte", 2], ["sollicitatie", 0], ["terugbel", 1],
    ]);
  });

  it("rekent per pagina bezoekers, aanvragen en percentage uit", () => {
    const views = [view("/a", "h1"), view("/a", "h1"), view("/a", "h2"), view("/a", "h3"), view("/a", "h4"), view("/b", "h9")];
    const convs = [conv("offerte", "/a", 1), conv("contact", "/b", 2), conv("terugbel", "/b", 3), conv("offerte", "/c", 4)];
    const rows = byPath(convs, views);
    expect(rows[0]).toEqual({ path: "/b", visitors: 1, conversions: 2, rate: 100 });
    expect(rows[1]).toEqual({ path: "/a", visitors: 4, conversions: 1, rate: 25 });
    // Een aanvraag zonder geregistreerd bezoek krijgt geen percentage.
    expect(rows[2]).toEqual({ path: "/c", visitors: 0, conversions: 1, rate: null });
  });

  it("rondt het totale percentage op één decimaal af", () => {
    expect(overallRate([conv("contact", "/", 1)], 3)).toBe(33.3);
    expect(overallRate([], 0)).toBeNull();
  });

  it("houdt bel- en mailklikken buiten de aanvragen", () => {
    const convs = [conv("contact", "/contact", 1), conv("bel", "/contact", 2), conv("mail", "/", 3), conv("bel", "/werkgevers", 4)];
    expect(aanvragen(convs).map((c) => c.id)).toEqual(["c1"]);
    expect(klikken(convs).map((c) => c.id)).toEqual(["c2", "c3", "c4"]);
    expect(isKlik("bel") && isKlik("mail") && !isKlik("contact")).toBe(true);
    // Per soort alleen de vier formulieren; de klikken apart.
    expect(byKind(convs).map((r) => r.count)).toEqual([1, 0, 0, 0]);
    expect(klikkenPerSoort(convs).map((r) => [r.kind, r.count])).toEqual([["bel", 2], ["mail", 1]]);
    // Het percentage en de pagina's tellen alleen aanvragen; de klikken hebben hun eigen tabel.
    expect(overallRate(convs, 10)).toBe(10);
    expect(byPath(convs, [view("/contact", "h1")]).map((r) => r.path)).toEqual(["/contact"]);
    expect(klikkenPerPagina(convs, [view("/contact", "h1"), view("/contact", "h2")])).toEqual([
      { path: "/contact", visitors: 2, conversions: 1, rate: 50 },
      { path: "/", visitors: 0, conversions: 1, rate: null },
      { path: "/werkgevers", visitors: 0, conversions: 1, rate: null },
    ]);
  });

  it("telt aanvragen per herkomst, zonder sollicitaties, en noemt een ontbrekend antwoord apart", () => {
    const convs: Conversion[] = [
      { ...conv("offerte", "/kennismaken", 1), herkomst: "google" },
      { ...conv("contact", "/contact", 2), herkomst: "google" },
      { ...conv("contact", "/contact", 3), herkomst: "verwijzing" },
      { ...conv("terugbel", "/werkgevers", 4) },
      { ...conv("sollicitatie", "/vacatures/x", 5), herkomst: "linkedin" },
      { ...conv("bel", "/contact", 6), herkomst: "ai" },
    ];
    expect(byHerkomst(convs)).toEqual([
      { herkomst: "google", label: "Google", count: 2 },
      { herkomst: "", label: "Niet gevraagd", count: 1 },
      { herkomst: "verwijzing", label: "Verwijzing", count: 1 },
    ]);
  });

  it("telt per landingspagina de aanvragen en klikken die er later in het bezoek kwamen", () => {
    const convs: Conversion[] = [
      { ...conv("offerte", "/kennismaken", 1), landingspagina: "/arbodienst-lopik" },
      { ...conv("bel", "/arbodienst-lopik", 2), landingspagina: "/arbodienst-lopik" },
      { ...conv("bel", "/contact", 3), landingspagina: "/" },
      { ...conv("contact", "/contact", 4) },
    ];
    expect(byLanding(convs)).toEqual([
      { landingspagina: "/arbodienst-lopik", aanvragen: 1, klikken: 1 },
      { landingspagina: "/", aanvragen: 0, klikken: 1 },
    ]);
  });
});
