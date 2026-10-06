/**
 * Twee talen: Nederlands op de gewone paden, Engels onder /en.
 *
 * Dit bestand is de koppeltabel NL-slug <-> EN-slug en de rekenregels voor
 * paden. Het importeert bewust niets uit de rest van de code: de header
 * (client) en de sitemap (server) lezen er allebei uit, en het mag dus geen
 * JSON-inhoud of databasecode meetrekken. Zie docs/adr/0001-tweetalig-nl-en.md.
 */

export type Taal = "nl" | "en";
export const TALEN: readonly Taal[] = ["nl", "en"];
export const STANDAARD_TAAL: Taal = "nl";

export function isTaal(x: unknown): x is Taal {
  return x === "nl" || x === "en";
}

/**
 * Koppeltabel: NL-slug (zoals in `pages.slug` en src/content/*.json) naar de
 * Engelse slug onder /en. Eén plek; de sitemap, de hreflang-tags, de
 * taalknop en de menu's rekenen hier allemaal op. `home` is "" (dus /en).
 */
export const SLUGS: Record<string, string> = {
  home: "",
  werkgevers: "employers",
  werknemers: "employees",
  verzuimprotocol: "sick-what-now",
  "je-rechten-en-privacy": "your-rights-and-privacy",
  "je-casemanager": "your-case-manager",
  vacatures: "jobs",
  diensten: "services",
  recover: "services/recover",
  resist: "services/resist",
  restart: "services/restart",
  reflex: "services/reflex",
  ready: "services/ready",
  verzuimabonnementen: "pricing",
  kennismaken: "lets-talk",
  contact: "contact",
  "over-react2u": "about-us",
  certificeringen: "certifications",
};

/**
 * Welke Engelse pagina's er al zijn. Fase 1: de werknemerskant, de
 * vacatures en de startpagina. Een slug die hier niet in staat krijgt geen
 * /en-adres: links ernaartoe wijzen dan naar de Nederlandse pagina en de
 * taalknop naar /en. De test in taal.test.ts bewaakt dat deze lijst klopt met
 * de bestanden in src/content/en/.
 */
export const EN_KLAAR: ReadonlySet<string> = new Set([
  "home",
  "werknemers",
  "verzuimprotocol",
  "je-rechten-en-privacy",
  "je-casemanager",
  "vacatures",
]);

const EN_NAAR_NL: Record<string, string> = Object.fromEntries(
  Object.entries(SLUGS).filter(([, en]) => en).map(([nl, en]) => [en, nl]),
);

/** De open sollicitatie hangt onder de vacatures; de vacatureslug zelf is in beide talen gelijk. */
export const OPEN_SOLLICITATIE = { nl: "open-sollicitatie", en: "open-application" } as const;

/** Welke taal hoort bij dit pad? Alles onder /en is Engels. */
export function taalVanPad(path: string): Taal {
  return path === "/en" || path.startsWith("/en/") || path.startsWith("/en?") || path.startsWith("/en#") ? "en" : "nl";
}

/** Het startscherm, in beide talen. */
export function isStart(path: string): boolean {
  const kaal = kaalPad(path);
  return kaal === "/" || kaal === "/en";
}

/** Pad zonder querystring, hash en afsluitende schuine streep. */
export function kaalPad(path: string): string {
  const s = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return s || "/";
}

/** De Engelse slug van een NL-slug, alleen als die pagina er in het Engels al is. */
export function enSlug(nlSlug: string): string | null {
  return EN_KLAAR.has(nlSlug) && nlSlug in SLUGS ? SLUGS[nlSlug] : null;
}

/** De NL-slug achter een Engelse slug (ook geneste, zoals services/recover). */
export function nlSlug(enSlug: string): string | null {
  return EN_NAAR_NL[enSlug] ?? null;
}

/**
 * Het pad van een pagina in een taal, op basis van de NL-slug. Bestaat de
 * Engelse versie (nog) niet, dan het Nederlandse pad: beter een Nederlandse
 * pagina dan een 404. Een onbekende slug (blog, gemeenten) blijft Nederlands.
 */
export function pad(taal: Taal, nlSlugOfPad: string, anker?: string): string {
  const slug = nlSlugOfPad.replace(/^\//, "");
  const hash = anker ? `#${anker}` : "";
  if (taal === "en") {
    const en = enSlug(slug);
    if (en !== null) return `${en ? `/en/${en}` : "/en"}${hash}`;
  }
  return `${slug === "home" || slug === "" ? "/" : `/${slug}`}${hash}`;
}

/**
 * Hetzelfde adres in de andere taal, voor de taalknop en de hreflang-tags.
 * Zonder vertaling naar het startscherm van die taal (/en of /). Hash en
 * querystring gaan niet mee: ankers verschillen per taal.
 */
export function vertaalPad(path: string, naar: Taal): string {
  const kaal = kaalPad(path);
  if (taalVanPad(kaal) === naar) return kaal;

  if (naar === "en") {
    if (kaal === "/") return "/en";
    const [eerste, ...rest] = kaal.slice(1).split("/");
    if (eerste === "vacatures" && EN_KLAAR.has("vacatures")) {
      if (!rest.length) return "/en/jobs";
      if (rest[0] === OPEN_SOLLICITATIE.nl) return `/en/jobs/${OPEN_SOLLICITATIE.en}`;
      return `/en/jobs/${rest.join("/")}`;
    }
    if (rest.length) return "/en";
    const en = enSlug(eerste);
    return en === null ? "/en" : en ? `/en/${en}` : "/en";
  }

  if (kaal === "/en") return "/";
  const enPad = kaal.slice("/en/".length);
  if (enPad === "jobs") return "/vacatures";
  if (enPad.startsWith("jobs/")) {
    const rest = enPad.slice("jobs/".length);
    return rest === OPEN_SOLLICITATIE.en ? `/vacatures/${OPEN_SOLLICITATIE.nl}` : `/vacatures/${rest}`;
  }
  const nl = nlSlug(enPad);
  return nl ? `/${nl}` : "/";
}

/** Een Engels pad als zijn Nederlandse tegenhanger; een Nederlands pad blijft zoals het is. */
export function nlPadVoor(path: string): string {
  return taalVanPad(path) === "en" ? vertaalPad(path, "nl") : kaalPad(path);
}

/** Heeft dit Nederlandse pad een Engelse tegenhanger? */
export function heeftVertaling(nlPath: string): boolean {
  const kaal = kaalPad(nlPath);
  if (kaal === "/") return EN_KLAAR.has("home");
  const [eerste, ...rest] = kaal.slice(1).split("/");
  if (eerste === "vacatures") return EN_KLAAR.has("vacatures");
  return rest.length === 0 && enSlug(eerste) !== null;
}

/**
 * De hreflang-alternates voor een pagina die in beide talen bestaat, als
 * relatieve paden (metadataBase maakt ze absoluut). x-default is Nederlands:
 * dat is de taal van de meeste bezoekers en van de rest van de site. `null`
 * als er geen vertaling is; dan hoort er ook geen hreflang te staan.
 */
export function hreflangVoor(path: string): { nl: string; en: string; "x-default": string } | null {
  const nl = nlPadVoor(path);
  if (!heeftVertaling(nl)) return null;
  const en = vertaalPad(nl, "en");
  return { nl, en, "x-default": nl };
}

/** Telefoonnummer zoals een lezer in die taal het verwacht: 085 620 58 00 of +31 85 620 58 00. */
export function telefoonInTaal(nlWeergave: string, taal: Taal): string {
  const kaal = nlWeergave.replace(/\s*[-–]\s*/g, " ").trim();
  if (taal === "nl") return kaal;
  return kaal.startsWith("0") ? `+31 ${kaal.slice(1)}` : kaal;
}

/** Vult {naam}-plekken in een woordenboektekst. */
export function vul(tekst: string, waarden: Record<string, string | number>): string {
  return tekst.replace(/\{(\w+)\}/g, (_, k) => String(waarden[k] ?? `{${k}}`));
}
