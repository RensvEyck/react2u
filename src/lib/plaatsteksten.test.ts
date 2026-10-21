import { describe, expect, it } from "vitest";
import teksten from "../content/plaatsen.json";
import { LABELS, REISTIJDEN, SOORTEN, plaatsTekst, slugsMetTekst, type PlaatsTekst } from "./plaatsteksten";
import { REGIOS, plaatsVoorSlug } from "./gemeenten";
import { indexSlugs } from "./plaatsIndex";

const NAMEN = new Set(REGIOS.flatMap((r) => r.provincies.flatMap((p) => p.gemeenten)));
const woorden = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/*
 * De plaatsteksten komen in Google. Een fout hier (een buur die niet bestaat,
 * een leeg veld, een tekst die bij een andere gemeente hoort) merk je anders
 * pas als de pagina al geïndexeerd is.
 */
describe("plaatsteksten", () => {
  const slugs = slugsMetTekst();

  it("plaatsen-index.json loopt gelijk met plaatsen.json", () => {
    // De index is een afgeleide; staat er een gemeente in de een en niet in de
    // ander, dan klopt de noindex-regel of de sitemap niet meer (lib/plaatsIndex.ts).
    expect([...indexSlugs()].sort()).toEqual([...slugs].sort());
  });

  it("horen allemaal bij een bestaande gemeente", () => {
    for (const slug of slugs) expect(plaatsVoorSlug(slug), slug).not.toBeNull();
    for (const sleutel of Object.keys(teksten)) {
      if (!sleutel.startsWith("_")) expect(slugs, `${sleutel} heeft geen bruikbare tekst`).toContain(sleutel);
    }
  });

  it("zijn compleet en kloppen met het schema", () => {
    for (const slug of slugs) {
      const t = plaatsTekst(slug) as PlaatsTekst;
      const naam = plaatsVoorSlug(slug)!.naam;
      expect(SOORTEN, `${slug}: soort`).toContain(t.soort);
      expect(t.tekst, `${slug}: drie alinea's`).toHaveLength(3);
      const n = t.tekst.reduce((a, b) => a + woorden(b), 0);
      expect(n, `${slug}: ${n} woorden`).toBeGreaterThanOrEqual(150);
      expect(n, `${slug}: ${n} woorden`).toBeLessThanOrEqual(260);
      expect(t.tekst.join(" "), `${slug}: noemt de plaats niet`).toContain(naam.replace(/ \(.*\)$| c\.a\.$/, ""));
      if (t.seo) expect(t.seo.length, `${slug}: seo ${t.seo.length} tekens`).toBeLessThanOrEqual(160);
      if (t.kop) expect(woorden(t.kop), `${slug}: kop`).toBeLessThanOrEqual(10);
      if (t.reistijd) expect(REISTIJDEN, `${slug}: reistijd`).toContain(t.reistijd);
      for (const sector of t.sectoren ?? []) {
        expect(LABELS, `${slug}: label ${sector.label}`).toContain(sector.label);
        expect(sector.naam && sector.verzuim, `${slug}: sector onvolledig`).toBeTruthy();
      }
      expect((t.sectoren ?? []).length, `${slug}: sectoren`).toBeLessThanOrEqual(4);
      for (const buur of t.buren ?? []) {
        expect(NAMEN.has(buur), `${slug}: buur "${buur}" is geen gemeente`).toBe(true);
        expect(buur, `${slug}: is zijn eigen buur`).not.toBe(naam);
      }
      expect((t.kernen ?? []).length, `${slug}: kernen`).toBeLessThanOrEqual(6);
      // Gedachtestreepjes en grote getallen horen er niet in (schrijfwijzer).
      const alles = [t.intro, t.kop, t.seo, ...t.tekst].filter(Boolean).join(" ");
      expect(alles, `${slug}: gedachtestreepje`).not.toMatch(/[—–]| - /);
      // Wegnummers (A2, N269) mogen; inwoneraantallen en jaartallen niet.
      expect(alles.replace(/\b[AN]\d{1,3}\b/g, ""), `${slug}: getal`).not.toMatch(/\d{3,}/);
    }
  });

  it("delen met geen enkele andere plaatstekst een reeks van 20 woorden of meer", () => {
    // Google beoordeelt dubbele inhoud op gedeelde passages, niet op losse woorden.
    // Plaatsnamen tellen niet mee, anders verbergt "Etten-Leur" vs "Helmond" een gekopieerde alinea.
    const woordenVan = (slug: string) => {
      let s = [plaatsTekst(slug)!.intro ?? "", ...plaatsTekst(slug)!.tekst].join(" ");
      const naam = plaatsVoorSlug(slug)!.naam;
      for (const deel of [naam, ...naam.split(/[- ]/)].filter((x) => x.length > 3)) s = s.split(deel).join("PLAATS");
      return s.toLowerCase().replace(/[^a-zà-ÿ ]/g, " ").split(/\s+/).filter(Boolean);
    };
    const W = Object.fromEntries(slugs.map((s) => [s, woordenVan(s)]));
    const index = new Map<string, Set<string>>();
    for (const s of slugs) for (let i = 0; i + 8 <= W[s].length; i++) {
      const g = W[s].slice(i, i + 8).join(" ");
      if (!index.has(g)) index.set(g, new Set());
      index.get(g)!.add(s);
    }
    const paren = new Set<string>();
    for (const set of index.values()) if (set.size > 1) {
      const l = [...set].sort();
      for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) paren.add(`${l[i]}|${l[j]}`);
    }
    const langste = (a: string[], b: string[]) => {
      let best = 0; let vorige = new Map<number, number>();
      for (let i = 0; i < a.length; i++) {
        const nu = new Map<number, number>();
        for (let j = 0; j < b.length; j++) if (a[i] === b[j]) { const v = (vorige.get(j - 1) ?? 0) + 1; nu.set(j, v); if (v > best) best = v; }
        vorige = nu;
      }
      return best;
    };
    for (const p of paren) {
      const [a, b] = p.split("|");
      expect(langste(W[a], W[b]), `${a} en ${b} delen een lange passage`).toBeLessThan(20);
    }
  });

  it("zijn echt verschillend van elkaar", () => {
    // Geen twee teksten met dezelfde openingszin of dezelfde kop.
    const openingen = new Map<string, string>();
    const koppen = new Map<string, string>();
    for (const slug of slugs) {
      const t = plaatsTekst(slug) as PlaatsTekst;
      const zin = t.tekst[0].split(/(?<=[.!?])\s/)[0].toLowerCase();
      expect(openingen.get(zin), `${slug} opent als ${openingen.get(zin)}`).toBeUndefined();
      openingen.set(zin, slug);
      if (t.kop) {
        expect(koppen.get(t.kop.toLowerCase()), `${slug} heeft dezelfde kop als ${koppen.get(t.kop.toLowerCase())}`).toBeUndefined();
        koppen.set(t.kop.toLowerCase(), slug);
      }
    }
  });
});
