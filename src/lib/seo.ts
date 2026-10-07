import { nl } from "./woordenboek/nl";
import type { Page, Post, Vacancy } from "./types";

/**
 * Analyse achter het SEO-overzicht in de admin.
 *
 * Het overzicht moet tonen wat Google straks écht ziet, niet wat er in het
 * veld staat. Een pagina zonder seo_title krijgt een titel uit de fallback en
 * is dus niet "leeg" — hij is alleen niet zelf gekozen. Daarom rekent deze
 * module de effectieve waarde uit, precies zoals de betreffende
 * generateMetadata dat doet. Wijkt die af, dan liegt het overzicht.
 */

// Google kapt titels af rond 600px (~60 tekens) en omschrijvingen rond 155.
// Te kort is geen fout maar wel een gemiste kans, vandaag de aparte drempel.
export const TITLE_MAX = 60;
export const DESC_MIN = 70;
export const DESC_MAX = 155;

export type Severity = "ok" | "warn" | "error";

export type FieldCheck = {
  value: string;
  length: number;
  /** Komt de waarde uit een eigen SEO-veld of uit een fallback? */
  custom: boolean;
  severity: Severity;
  message: string | null;
};

export type SeoRow = {
  kind: "Pagina" | "Artikel" | "Vacature";
  id: string;
  label: string;
  path: string;
  editHref: string;
  published: boolean;
  title: FieldCheck;
  description: FieldCheck;
  worst: Severity;
};

function checkTitle(value: string, custom: boolean): FieldCheck {
  const length = value.length;
  if (!length) {
    return { value, length, custom, severity: "error", message: "Geen titel" };
  }
  if (length > TITLE_MAX) {
    return { value, length, custom, severity: "warn", message: `Te lang — Google kapt af rond ${TITLE_MAX} tekens` };
  }
  if (!custom) {
    return { value, length, custom, severity: "warn", message: "Automatisch afgeleid, geen eigen SEO-titel" };
  }
  return { value, length, custom, severity: "ok", message: null };
}

function checkDescription(value: string, custom: boolean): FieldCheck {
  const length = value.length;
  if (!length) {
    return { value, length, custom, severity: "error", message: "Geen omschrijving — Google verzint er zelf een" };
  }
  if (length > DESC_MAX) {
    return { value, length, custom, severity: "warn", message: `Te lang — wordt afgekapt rond ${DESC_MAX} tekens` };
  }
  if (length < DESC_MIN) {
    return { value, length, custom, severity: "warn", message: `Kort — onder ${DESC_MIN} tekens blijft ruimte onbenut` };
  }
  if (!custom) {
    return { value, length, custom, severity: "warn", message: "Overgenomen uit de tekst, geen eigen SEO-omschrijving" };
  }
  return { value, length, custom, severity: "ok", message: null };
}

const worstOf = (...s: Severity[]): Severity =>
  s.includes("error") ? "error" : s.includes("warn") ? "warn" : "ok";

function row(base: Omit<SeoRow, "worst">): SeoRow {
  return { ...base, worst: worstOf(base.title.severity, base.description.severity) };
}

/**
 * Spiegelt app/(site)/[slug]/page.tsx en app/(site)/page.tsx. Zonder eigen
 * omschrijving laat de pagina de sleutel weg en erft hij de site-brede
 * standaardtekst uit de instellingen (`standaard`; zonder die SEO_FALLBACK).
 * Dat is geen lege omschrijving meer, wel een die niets over de pagina zegt.
 */
export function analysePage(p: Page, standaard?: string): SeoRow {
  const isHome = p.slug === "home";
  const title = p.seo_title || (isHome ? HOME_TITEL : `${p.title} • React2u`);
  const eigen = omschrijving(p.seo_description);
  const description = eigen
    ? checkDescription(eigen, true)
    : {
        value: standaard || SEO_FALLBACK.description,
        length: (standaard || SEO_FALLBACK.description).length,
        custom: false,
        severity: "warn" as const,
        message: "Geen eigen omschrijving — de site-brede standaardtekst uit Instellingen wordt getoond",
      };
  return row({
    kind: "Pagina",
    id: p.id,
    label: p.title,
    path: isHome ? "/" : `/${p.slug}`,
    editHref: `/admin/paginas/${p.slug}`,
    published: p.published,
    title: checkTitle(title, Boolean(p.seo_title)),
    description,
  });
}

/** Spiegelt app/(site)/blog/[slug]/page.tsx — inclusief de titelsjabloon. */
export function analysePost(p: Post): SeoRow {
  const base = p.seo_title || p.title;
  const description = omschrijving(p.seo_description, p.excerpt) || "";
  return row({
    kind: "Artikel",
    id: p.id,
    label: p.title,
    path: `/blog/${p.slug}`,
    editHref: `/admin/blog/${p.id}`,
    published: p.status === "published",
    title: checkTitle(paginaTitel(base), Boolean(p.seo_title)),
    description: checkDescription(description, Boolean(p.seo_description)),
  });
}

/** Spiegelt app/(site)/vacatures/[slug]/page.tsx — inclusief de titelsjabloon. */
export function analyseVacancy(v: Vacancy): SeoRow {
  const base = v.seo_title || `${v.title} • Vacature`;
  const description = omschrijving(v.seo_description, v.intro) || "";
  return row({
    kind: "Vacature",
    id: v.id,
    label: v.title,
    path: `/vacatures/${v.slug}`,
    editHref: `/admin/vacatures/${v.id}`,
    published: v.status === "published",
    title: checkTitle(paginaTitel(base), Boolean(v.seo_title)),
    description: checkDescription(description, Boolean(v.seo_description)),
  });
}

/* ---------- titel en omschrijving zoals de pagina ze uitstuurt ---------- */

const MERK = "React2u";

/**
 * Precies één keer " • React2u" achter de titel.
 *
 * Een redacteur die het merk zelf al in de SEO-titel zet (met •, | of een
 * streepje ervoor) kreeg "… • React2u • React2u": het sjabloon in
 * app/layout.tsx plakte er altijd nog een achter. Vacatures en artikelen
 * zetten hun titel daarom als `absolute` en laten dit het merk toevoegen.
 */
export function paginaTitel(base: string): string {
  const kaal = base.replace(/\s*[•|\-–—]\s*React2u\s*$/i, "").trim();
  return kaal ? `${kaal} • ${MERK}` : MERK;
}

/**
 * Hooguit `max` tekens (standaard DESC_MAX), afgekapt op een woordgrens met
 * een beletselteken. Een intro of samenvatting die als omschrijving dient is
 * vaak langer; Google kapt dan zelf af, midden in een zin.
 */
export function kort(tekst: string | null | undefined, max = DESC_MAX): string | undefined {
  const s = (tekst ?? "").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  if (s.length <= max) return s;
  const kap = s.slice(0, max - 1);
  const spatie = kap.lastIndexOf(" ");
  return `${(spatie > max * 0.6 ? kap.slice(0, spatie) : kap).replace(/[\s,;:.]+$/, "")}…`;
}

/**
 * De meta-omschrijving van een pagina: de eigen SEO-tekst gaat compleet mee,
 * alleen een afgeleide tekst (intro, samenvatting) wordt met kort() op een
 * woordgrens ingekort. Google kent geen vaste limiet van 155 tekens; dat
 * getal is een redactiehulp in het SEO-overzicht, geen mes. Eerder kapte
 * kort() ook zelfgeschreven teksten af, en eindigde /werkgevers op
 * "Persoonlijk…". `undefined` als er niets is: laat de sleutel dan weg, zodat
 * de site-brede standaardtekst uit de layout overerft (zie CONTEXT.md, *SEO*).
 */
export function omschrijving(eigen: string | null | undefined, afgeleid?: string | null): string | undefined {
  const s = (eigen ?? "").replace(/\s+/g, " ").trim();
  return s || kort(afgeleid);
}

/** Alleen een sleutel als er een waarde is: `description: undefined` wist de layoutwaarde (shallow merge). */
export function metOmschrijving(tekst: string | undefined): { description?: string } {
  return tekst ? { description: tekst } : {};
}

/**
 * Concepten tellen niet mee in de aandachtspunten: die staan niet in Google,
 * dus een waarschuwing erover is ruis die de echte problemen verstopt.
 */
export function countIssues(rows: SeoRow[]) {
  const live = rows.filter((r) => r.published);
  return {
    errors: live.filter((r) => r.worst === "error").length,
    warnings: live.filter((r) => r.worst === "warn").length,
    ok: live.filter((r) => r.worst === "ok").length,
  };
}

/* ---------- site-brede standaardwaarden ---------- */

export type SeoSettings = { description: string; share_image: string };

/**
 * Als er in Instellingen niets staat. De omschrijving staat op élke pagina
 * zonder eigen tekst, dus hij zegt wat React2u is en doet, niet alleen de slogan.
 */
export const SEO_FALLBACK: SeoSettings = {
  description:
    "React2u is een persoonlijke arbodienst in Eindhoven: verzuimbegeleiding met één vaste casemanager, preventie en re-integratie voor werkgevers en werknemers.",
  share_image: "",
};

/** De titel van de homepage zonder eigen SEO-titel; de pagina en het overzicht gebruiken dezelfde. */
export const HOME_TITEL = nl.seo.homeTitel;

export function normalizeSeoSettings(value: unknown): SeoSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return SEO_FALLBACK;
  const v = value as Partial<SeoSettings>;
  return {
    description: String(v.description ?? "").trim() || SEO_FALLBACK.description,
    share_image: String(v.share_image ?? "").trim(),
  };
}
