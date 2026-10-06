import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EN_KLAAR, SLUGS, heeftVertaling, hreflangVoor, nlPadVoor, pad, taalVanPad, telefoonInTaal, vertaalPad, vul } from "./taal";
import { en } from "./woordenboek/en";
import { nl } from "./woordenboek/nl";

const EN_MAP = join(__dirname, "../content/en");

/** De Engelse concepten op schijf: bestandsnaam → slug uit het bestand. */
function engelseConcepten(): { bestand: string; slug: string }[] {
  return readdirSync(EN_MAP)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ bestand: f, slug: (JSON.parse(readFileSync(join(EN_MAP, f), "utf8")) as { slug: string }).slug }));
}

describe("koppeltabel", () => {
  it("elke Engelse pagina op schijf staat in SLUGS en EN_KLAAR, en andersom", () => {
    const opSchijf = new Set(engelseConcepten().map((c) => c.slug));
    const enSlugs = new Map(Object.entries(SLUGS).map(([nlSlug, enSlug]) => [enSlug || "home", nlSlug]));
    for (const slug of opSchijf) {
      expect(enSlugs.has(slug), `src/content/en: slug "${slug}" ontbreekt in SLUGS`).toBe(true);
      expect(EN_KLAAR.has(enSlugs.get(slug)!), `EN_KLAAR mist "${enSlugs.get(slug)}" (bestand bestaat)`).toBe(true);
    }
    for (const nlSlug of EN_KLAAR) {
      if (nlSlug === "vacatures") continue; // eigen routes, geen JSON
      expect(opSchijf.has(SLUGS[nlSlug] || "home"), `EN_KLAAR noemt "${nlSlug}" maar src/content/en mist het bestand`).toBe(true);
    }
  });

  it("Engelse slugs zijn uniek en in kleine letters", () => {
    const waarden = Object.values(SLUGS);
    expect(new Set(waarden).size).toBe(waarden.length);
    for (const v of waarden) expect(v).toMatch(/^[a-z0-9/-]*$/);
  });
});

describe("paden", () => {
  it("herkent de taal van een pad", () => {
    expect(taalVanPad("/")).toBe("nl");
    expect(taalVanPad("/en")).toBe("en");
    expect(taalVanPad("/en/employees")).toBe("en");
    expect(taalVanPad("/energie")).toBe("nl");
  });

  it("maakt het adres van een pagina in een taal, met terugval op Nederlands", () => {
    expect(pad("nl", "werknemers")).toBe("/werknemers");
    expect(pad("en", "werknemers")).toBe("/en/employees");
    expect(pad("en", "home")).toBe("/en");
    expect(pad("nl", "home")).toBe("/");
    expect(pad("en", "werknemers", "faq")).toBe("/en/employees#faq");
    expect(pad("en", "blog")).toBe("/blog");
    // Nog niet vertaald (fase 2): het Nederlandse adres, geen 404.
    if (!EN_KLAAR.has("werkgevers")) expect(pad("en", "werkgevers")).toBe("/werkgevers");
  });

  it("vertaalt een pad naar de andere taal", () => {
    expect(vertaalPad("/", "en")).toBe("/en");
    expect(vertaalPad("/en", "nl")).toBe("/");
    expect(vertaalPad("/werknemers", "en")).toBe("/en/employees");
    expect(vertaalPad("/werknemers#vragen", "en")).toBe("/en/employees");
    expect(vertaalPad("/en/employees", "nl")).toBe("/werknemers");
    expect(vertaalPad("/vacatures", "en")).toBe("/en/jobs");
    expect(vertaalPad("/vacatures/casemanager", "en")).toBe("/en/jobs/casemanager");
    expect(vertaalPad("/vacatures/open-sollicitatie", "en")).toBe("/en/jobs/open-application");
    expect(vertaalPad("/en/jobs/open-application", "nl")).toBe("/vacatures/open-sollicitatie");
    expect(vertaalPad("/en/jobs/casemanager", "nl")).toBe("/vacatures/casemanager");
    // Zonder vertaling: het startscherm van die taal.
    expect(vertaalPad("/blog", "en")).toBe("/en");
    expect(vertaalPad("/arbodienst-eindhoven", "en")).toBe("/en");
    expect(vertaalPad("/en/bestaat-niet", "nl")).toBe("/");
    // Dezelfde taal: het pad zelf, zonder hash.
    expect(vertaalPad("/en/employees#faq", "en")).toBe("/en/employees");
  });

  it("geneste Engelse slugs (fase 2) vertalen heen en terug", () => {
    for (const [nlSlug, enSlug] of Object.entries(SLUGS)) {
      if (!EN_KLAAR.has(nlSlug) || !enSlug) continue;
      expect(vertaalPad(`/${nlSlug}`, "en")).toBe(`/en/${enSlug}`);
      expect(vertaalPad(`/en/${enSlug}`, "nl")).toBe(`/${nlSlug}`);
    }
  });

  it("kent het Nederlandse pad achter een Engels pad", () => {
    expect(nlPadVoor("/en/employees")).toBe("/werknemers");
    expect(nlPadVoor("/werknemers")).toBe("/werknemers");
    expect(nlPadVoor("/en")).toBe("/");
  });

  it("geeft hreflang alleen voor vertaalde pagina's, met x-default op Nederlands", () => {
    expect(hreflangVoor("/werknemers")).toEqual({ nl: "/werknemers", en: "/en/employees", "x-default": "/werknemers" });
    expect(hreflangVoor("/en/employees")).toEqual({ nl: "/werknemers", en: "/en/employees", "x-default": "/werknemers" });
    expect(hreflangVoor("/")).toEqual({ nl: "/", en: "/en", "x-default": "/" });
    expect(hreflangVoor("/vacatures/x")).toEqual({ nl: "/vacatures/x", en: "/en/jobs/x", "x-default": "/vacatures/x" });
    expect(hreflangVoor("/blog")).toBeNull();
    expect(hreflangVoor("/arbodienst-eindhoven")).toBeNull();
    expect(heeftVertaling("/werknemers/dieper")).toBe(false);
  });
});

describe("tekst", () => {
  it("schrijft het telefoonnummer in de taal van de lezer", () => {
    expect(telefoonInTaal("085 - 620 58 00", "nl")).toBe("085 620 58 00");
    expect(telefoonInTaal("085 - 620 58 00", "en")).toBe("+31 85 620 58 00");
    expect(telefoonInTaal("06 12479720", "en")).toBe("+31 6 12479720");
  });

  it("vult plekken in", () => {
    expect(vul("Menu {naam}", { naam: "werkgevers" })).toBe("Menu werkgevers");
    expect(vul("{n} open", { n: 3 })).toBe("3 open");
  });
});

/* ---------- de Engelse teksten zelf ---------- */

/** Alle tekstwaarden in een object, met hun pad, voor controles op de inhoud. */
function teksten(x: unknown, pad = ""): [string, string][] {
  if (typeof x === "string") return [[pad, x]];
  if (Array.isArray(x)) return x.flatMap((v, i) => teksten(v, `${pad}[${i}]`));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => teksten(v, pad ? `${pad}.${k}` : k));
  return [];
}

// Veelvoorkomende Nederlandse woorden die in een Engelse tekst niet thuishoren.
// Alleen hele woorden; Nederlandse stelselbegrippen tussen haakjes (bedrijfsarts,
// Ziektewet) zijn juist gewenst en staan er niet in.
const NEDERLANDS = /\b(werkgever|werkgevers|werknemer|werknemers|ziek|bel|bellen|meer weten|lees meer|vragen|contact opnemen|aanvragen|verzuim|casemanager|uur|maandag|vrijdag|voor|van|het|een|niet|wat nu|je|jouw|wij|onze)\b/i;
const GEDACHTESTREEP = /[–—]/;

const UITZONDERINGEN = new Set(["taal", "locale", "ogLocale", "formulier.honeypot"]);

describe("Engelse teksten", () => {
  const woordenboekTeksten = teksten(en).filter(([p]) => !UITZONDERINGEN.has(p) && !/talen|kleur|slug|anker|dienstverband|href/.test(p));
  const inhoud = engelseConcepten().flatMap((c) => {
    const json = JSON.parse(readFileSync(join(EN_MAP, c.bestand), "utf8")) as { blocks: unknown };
    return teksten(json.blocks, c.bestand).filter(([p]) => !/\.(href|image|icon|focus|kleur|tint|panel|orb|bg|type|naam|letter|anchor|doelgroep)$/.test(p));
  });

  it("bevatten geen gedachtestreepjes", () => {
    for (const [p, t] of [...woordenboekTeksten, ...inhoud]) {
      expect(GEDACHTESTREEP.test(t), `${p}: "${t}"`).toBe(false);
    }
  });

  it("bevatten geen Nederlandse resten", () => {
    for (const [p, t] of [...woordenboekTeksten, ...inhoud]) {
      // Nederlandse begrippen tussen haakjes zijn bedoeld; de tekst eromheen moet Engels zijn.
      const zonderHaakjes = t.replace(/\([^)]*\)/g, "");
      expect(NEDERLANDS.test(zonderHaakjes), `${p}: "${t}"`).toBe(false);
    }
  });

  it("hebben dezelfde vorm als het Nederlandse woordenboek", () => {
    const vorm = (x: unknown): unknown =>
      Array.isArray(x) ? "array" : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, vorm((x as Record<string, unknown>)[k])])) : typeof x;
    expect(vorm(en)).toEqual(vorm(nl));
  });

  it("Engelse inhoud linkt alleen naar Engelse pagina's die bestaan, of naar Nederlandse", () => {
    const hrefs = engelseConcepten().flatMap((c) => {
      const json = JSON.parse(readFileSync(join(EN_MAP, c.bestand), "utf8")) as { blocks: unknown };
      return teksten(json.blocks, c.bestand).filter(([p]) => /\.href$/.test(p)).map(([p, h]) => [p, h] as [string, string]);
    });
    const enPaden = new Set([...engelseConcepten().map((c) => (c.slug === "home" ? "/en" : `/en/${c.slug}`)), "/en/jobs", "/en/jobs/open-application"]);
    for (const [p, h] of hrefs) {
      if (!h.startsWith("/en")) continue;
      const kaal = h.split("#")[0];
      expect(enPaden.has(kaal) || kaal.startsWith("/en/jobs/"), `${p}: ${h} bestaat (nog) niet`).toBe(true);
    }
  });
});
