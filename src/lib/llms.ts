import type { ContactInfo } from "@/lib/content";
import { kernProvincies, provincieHref, REGIOS } from "@/lib/gemeenten";
import { coveredByWordpress } from "@/lib/redirects";
import { kort, omschrijving } from "@/lib/seo";
import type { Page, Post, Vacancy } from "@/lib/types";
import { VAKGEBIEDEN } from "@/lib/vakgebieden";

/**
 * De tekst van /llms.txt (https://llmstxt.org): een Markdown-overzicht van de
 * site voor taalmodellen en AI-agents. Eén H1, een samenvatting als citaat en
 * daarna kopjes met Markdown-links, elk met een korte omschrijving. Lighthouse
 * (categorie Agentic browsing) eist een H1, minstens 50 tekens en minstens één
 * link in Markdown-vorm.
 *
 * Titels en omschrijvingen komen uit de database (de SEO-tekst van de pagina),
 * zodat een wijziging in de admin hier vanzelf meekomt. Welke pagina onder welk
 * kopje staat, staat hieronder vast; een nieuwe gepubliceerde pagina die nergens
 * genoemd is, komt onder "Meer pagina's".
 */

const SECTIES: { kop: string; slugs: string[] }[] = [
  {
    kop: "Diensten",
    slugs: ["diensten", "resist", "recover", "restart", "reflex", "ready", "reward", "verzuimabonnementen"],
  },
  { kop: "Voor werkgevers", slugs: ["werkgevers", "kennismaken", "partners"] },
  { kop: "Voor werknemers", slugs: ["werknemers", "verzuimprotocol", "je-casemanager", "je-rechten-en-privacy"] },
  { kop: "Over React2u", slugs: ["over-react2u", "certificeringen", "contact"] },
];

/** Onder "Optional": volgens de standaard mag een agent dit overslaan als de ruimte krap is. */
const OPTIONEEL = ["juridische-documenten", "inloggen", "sitemap"];

/** Pagina's die nooit in de lijst horen, ook niet onder "Meer pagina's". */
const NOOIT = new Set(["home"]);

export type LlmsBron = {
  base: string;
  pages: Page[];
  posts: Post[];
  vacancies: Vacancy[];
  contact: ContactInfo;
};

/** Eén regel: geen regeleinden of dubbele spaties uit de database in de lijst. */
const regel = (s: string) => s.replace(/\s+/g, " ").trim();

/** Haken in een linktekst breken de Markdown-link. */
const linktekst = (s: string) => regel(s).replace(/[[\]]/g, "");

function item(titel: string, url: string, tekst?: string | null): string {
  const t = tekst ? regel(tekst) : "";
  return `- [${linktekst(titel)}](${url})${t ? `: ${t}` : ""}`;
}

/** Een gepubliceerde pagina die bereikbaar is: geen vaste doorverwijzing, geen reservekopie. */
function zichtbaar(p: Page): boolean {
  return !NOOIT.has(p.slug) && !/-oud-\d/.test(p.slug) && !coveredByWordpress(`/${p.slug}`);
}

function sectie(kop: string, regels: string[]): string[] {
  return regels.length ? [`## ${kop}`, "", ...regels, ""] : [];
}

export function llmsTekst({ base, pages, posts, vacancies, contact }: LlmsBron): string {
  const opSlug = new Map(pages.filter(zichtbaar).map((p) => [p.slug, p]));
  const pagina = (slug: string) => {
    const p = opSlug.get(slug);
    return p ? [item(p.title, `${base}/${p.slug}`, omschrijving(p.seo_description))] : [];
  };
  const genoemd = new Set([...SECTIES.flatMap((s) => s.slugs), ...OPTIONEEL]);
  const overig = [...opSlug.values()].filter((p) => !genoemd.has(p.slug));

  const provincies = REGIOS.flatMap((r) => r.provincies.map((p) => p.naam));
  const kern = kernProvincies();
  const opsomming = (namen: string[]) =>
    namen.length > 1 ? `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}` : namen.join("");

  const regels: string[] = [
    "# React2u",
    "",
    "> React2u is een persoonlijke arbodienst uit Eindhoven. We begeleiden werkgevers bij ziekteverzuim, " +
      "preventie en re-integratie volgens de Wet verbetering poortwachter, met één vaste casemanager. " +
      "Zes specialismen zijn los af te nemen: Resist, Recover, Restart, Reflex, Ready en Reward.",
    "",
    `- Gevestigd aan ${contact.addressLine1}, ${contact.addressLine2}. Opgericht in 2023. KvK ${contact.kvk}.`,
    `- Telefoon ${contact.phoneDisplay}, e-mail ${contact.email}.`,
    `- Voor werkgevers in heel Nederland; de meeste klanten zitten in ${opsomming(kern)}.`,
    "- Gecertificeerde arbodienst (SBCA), met ISO 9001, ISO/IEC 27001 en ISO/IEC 27701.",
    "- De site is Nederlandstalig; de Engelse versie staat onder Optional.",
    "",
    ...SECTIES.flatMap((s) => sectie(s.kop, s.slugs.flatMap(pagina))),
    ...sectie(
      "Kennisbank",
      posts.length
        ? [
            item("Blog", `${base}/blog`, "Artikelen over verzuim, de Wet verbetering poortwachter en preventie, voor werkgevers en werknemers."),
            ...posts.map((p) => item(p.title, `${base}/blog/${p.slug}`, omschrijving(p.seo_description, p.excerpt))),
          ]
        : [],
    ),
    ...sectie("Werken bij React2u", [
      item("Vacatures", `${base}/vacatures`, "Alle openstaande vacatures en zzp-opdrachten, te filteren op vakgebied."),
      ...VAKGEBIEDEN.map((v) => item(v.nl.titel, `${base}/vacatures/vakgebied/${v.slug}`, kort(v.nl.intro))),
      ...vacancies.map((v) =>
        item(
          v.title,
          `${base}/vacatures/${v.slug}`,
          [[v.location, v.hours].filter(Boolean).join(", "), omschrijving(v.seo_description, v.intro)]
            .filter(Boolean)
            .join(". "),
        ),
      ),
      item("Open sollicitatie", `${base}/vacatures/open-sollicitatie`, "Geen passende vacature? Stuur een open sollicitatie."),
    ]),
    ...sectie(
      "Werkgebied",
      provincies.map((naam) =>
        item(`Arbodienst in ${naam}`, `${base}${provincieHref(naam)}`, `Verzuimbegeleiding voor werkgevers in ${naam}, met alle gemeenten in de provincie.`),
      ),
    ),
    ...sectie("Meer pagina's", overig.map((p) => item(p.title, `${base}/${p.slug}`, omschrijving(p.seo_description)))),
    ...sectie("Optional", [
      ...OPTIONEEL.flatMap(pagina),
      item("English", `${base}/en`, "The English version of the site, for employers and employees."),
    ]),
  ];

  return `${regels.join("\n").trimEnd()}\n`;
}
