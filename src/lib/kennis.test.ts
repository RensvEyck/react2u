import { describe, expect, it } from "vitest";
import { GIDSEN } from "./gidsen";
import { HULPMIDDELEN, ONDERWERPEN, artikelenBij, hulpmiddelenBij, kennisItems, onderwerpVanArtikel, zoekKennis } from "./kennis";
import { CHECKLIST_AANTAL, CHECKLIST_FASEN } from "./checklistPoortwachter";
import { DESC_MAX, TITLE_MAX } from "./seo";
import type { Post } from "./types";

const artikel = (slug: string, title: string) => ({ slug, title, excerpt: "Een artikel." }) as Post;

describe("kennisbank", () => {
  it("heeft vier onderwerpen met titel en omschrijving binnen de maten, en elke gids hangt onder één ervan", () => {
    expect(ONDERWERPEN.map((o) => o.slug)).toEqual(["verzuim", "re-integratie", "preventie", "wet-en-regels"]);
    for (const o of ONDERWERPEN) {
      expect(o.seo_title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(o.seo_description.length).toBeLessThanOrEqual(DESC_MAX + 25);
    }
    for (const g of GIDSEN) expect(ONDERWERPEN.some((o) => o.slug === g.onderwerp), g.slug).toBe(true);
    for (const o of ONDERWERPEN) expect(GIDSEN.some((g) => g.onderwerp === o.slug), o.slug).toBe(true);
  });

  it("heeft drie hulpmiddelen die elk bij een gids horen", () => {
    expect(HULPMIDDELEN.map((h) => h.slug)).toEqual(["poortwachter-planner", "loonsanctie-check", "checklist-poortwachterdossier"]);
    for (const h of HULPMIDDELEN) {
      expect(GIDSEN.some((g) => g.slug === h.gids), h.slug).toBe(true);
      expect(h.seo_title.length).toBeLessThanOrEqual(TITLE_MAX);
    }
    expect(hulpmiddelenBij("preventie")).toHaveLength(3);
    expect(hulpmiddelenBij("wet-en-regels")).toHaveLength(3);
  });

  it("hangt de artikelen van oktober 2026 onder het juiste onderwerp en raadt een nieuw artikel op zijn titel", () => {
    expect(onderwerpVanArtikel(artikel("loonsanctie-voorkomen", "Loonsanctie voorkomen"))).toBe("wet-en-regels");
    expect(onderwerpVanArtikel(artikel("verzuim-mkb", "Mkb en verzuim"))).toBe("verzuim");
    expect(onderwerpVanArtikel(artikel("nieuw", "Tweede spoor: zo begin je"))).toBe("re-integratie");
    expect(onderwerpVanArtikel(artikel("nieuw", "Werkdruk in het team"))).toBe("preventie");
    expect(onderwerpVanArtikel(artikel("nieuw", "Een gewone dag"))).toBe("verzuim");
    const posts = [artikel("loonsanctie-voorkomen", "A"), artikel("verzuim-mkb", "B")];
    expect(artikelenBij(posts, "wet-en-regels").map((p) => p.slug)).toEqual(["loonsanctie-voorkomen"]);
  });

  it("zoekt op woordbegin, zonder accenten, gidsen eerst", () => {
    const items = kennisItems([artikel("kosten-zieke-werknemer", "Wat kost een zieke werknemer écht?")]);
    expect(items.filter((i) => i.soort === "gids")).toHaveLength(GIDSEN.length);
    const t = zoekKennis(items, "loonsanc");
    expect(t[0]).toMatchObject({ soort: "gids", href: "/loonsanctie" });
    expect(t.some((i) => i.href === "/kennis/loonsanctie-check")).toBe(true);
    expect(zoekKennis(items, "zieke werknémer").map((i) => i.href)).toContain("/blog/kosten-zieke-werknemer");
    expect(zoekKennis(items, "ri&e")[0].href).toBe("/rie");
    expect(zoekKennis(items, "x")).toEqual([]);
    expect(zoekKennis(items, "qzqzqz")).toEqual([]);
  });

  it("de checklist heeft 24 punten in vijf fasen", () => {
    expect(CHECKLIST_FASEN).toHaveLength(5);
    expect(CHECKLIST_AANTAL).toBe(24);
    expect(new Set(CHECKLIST_FASEN.flatMap((f) => f.punten.map((p) => p.tekst))).size).toBe(24);
  });
});
