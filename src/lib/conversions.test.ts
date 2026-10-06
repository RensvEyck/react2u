import { describe, expect, it } from "vitest";
import { byKind, byPath, overallRate, pathFromReferer, type Conversion } from "./conversions";
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
});
