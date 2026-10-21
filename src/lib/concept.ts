import type { Block } from "./types";
import type { Taal } from "./taal";
import home from "@/content/home.json";
import werkgevers from "@/content/werkgevers.json";
import werknemers from "@/content/werknemers.json";
import verzuimprotocol from "@/content/verzuimprotocol.json";
import diensten from "@/content/diensten.json";
import tarieven from "@/content/tarieven.json";
import contact from "@/content/contact.json";
import resist from "@/content/resist.json";
import recover from "@/content/recover.json";
import restart from "@/content/restart.json";
import reflex from "@/content/reflex.json";
import ready from "@/content/ready.json";
import overReact2u from "@/content/over-react2u.json";
import kennismaken from "@/content/kennismaken.json";
import jeRechten from "@/content/je-rechten-en-privacy.json";
import jeCasemanager from "@/content/je-casemanager.json";
import inloggen from "@/content/inloggen.json";
import juridisch from "@/content/juridische-documenten.json";
import sitemap from "@/content/sitemap.json";
import certificeringen from "@/content/certificeringen.json";
import enHome from "@/content/en/home.json";
import enEmployees from "@/content/en/employees.json";
import enSickWhatNow from "@/content/en/sick-what-now.json";
import enYourRights from "@/content/en/your-rights-and-privacy.json";
import enYourCaseManager from "@/content/en/your-case-manager.json";
import enEmployers from "@/content/en/employers.json";
import enServices from "@/content/en/services.json";
import enRecover from "@/content/en/services/recover.json";
import enResist from "@/content/en/services/resist.json";
import enRestart from "@/content/en/services/restart.json";
import enReflex from "@/content/en/services/reflex.json";
import enReady from "@/content/en/services/ready.json";
import enPricing from "@/content/en/pricing.json";
import enLetsTalk from "@/content/en/lets-talk.json";
import enContact from "@/content/en/contact.json";
import enAboutUs from "@/content/en/about-us.json";
import enCertifications from "@/content/en/certifications.json";

/**
 * Concepten: een nieuwe opbouw van een pagina die nog niet in de database
 * staat. Eén JSON-bestand per pagina in src/content/. Zie CONTEXT.md,
 * *Concepten*.
 */
type ConceptBestand = {
  slug: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  blocks: { type: string; label?: string | null; data: unknown }[];
};

const CONCEPTEN: ConceptBestand[] = [home, werkgevers, werknemers, verzuimprotocol, diensten, tarieven, contact, resist, recover, restart, reflex, ready, overReact2u, kennismaken, jeRechten, jeCasemanager, inloggen, juridisch, sitemap, certificeringen];

/**
 * De Engelse pagina's (src/content/en/), met dezelfde blokstructuur als het
 * Nederlandse concept van dezelfde pagina. `slug` is hier de Engelse slug uit
 * de koppeltabel in lib/taal.ts ("home" voor /en). Er is geen database voor
 * Engels: deze bestanden zíjn de Engelse site, ook in productie. Zie
 * docs/adr/0001-tweetalig-nl-en.md.
 */
const CONCEPTEN_EN: ConceptBestand[] = [
  enHome, enEmployees, enSickWhatNow, enYourRights, enYourCaseManager,
  enEmployers, enServices, enRecover, enResist, enRestart, enReflex, enReady, enPricing, enLetsTalk, enContact, enAboutUs, enCertifications,
];

/**
 * Concepten zijn alleen zichtbaar op een preview-deploy (staging): daar wil je
 * de site zien zoals hij straks live komt. Lokaal nabootsen met
 * `VERCEL_ENV=preview npm run dev`. In productie komt alles uit de database.
 */
export const conceptenActief = process.env.VERCEL_ENV === "preview";

/**
 * Het nieuwe ontwerp (header en footer uit het Design-canvas, blog, "Werken
 * bij", vacature en 404) stond tot de livegang van oktober 2026 alleen op
 * staging aan, achter `conceptenActief`. Sindsdien is het overal het ontwerp
 * van de site; alleen de pagina-inhoud zelf komt in productie nog uit de
 * database en op staging uit de concepten. De oude componenten (Header,
 * Footer, PageHeader-pagina's) staan er nog als terugvaloptie.
 */
export const nieuwOntwerp = true;

export type Concept = { slug: string; title: string; seo_title?: string; seo_description?: string; blocks: Block[] };

export function concept(slug: string): Concept | null {
  if (!conceptenActief) return null;
  return uitBestand(slug, CONCEPTEN);
}

/**
 * Reserve-inhoud in productie: het concept voor een pagina die de database
 * (nog) niet gepubliceerd heeft. Alleen aan tijdens een migratiefase, zodat
 * een nieuwe pagina als /werkgevers geen 404 geeft tussen het live zetten van
 * de code en het draaien van de SQL. Zet het aan in dezelfde commit als het
 * nieuwe concept, en weer uit zodra de SQL gedraaid is.
 *
 * Standaard uit, want de publicatiestatus in de database is leidend: met de
 * reserve aan kwam een pagina die een beheerder verborg of verwijderde via dit
 * bestand gewoon terug, openbaar, indexeerbaar en in sitemap.xml (de
 * publieke sleutel ziet een verborgen pagina niet, dus "verborgen" en "bestaat
 * niet" zijn voor de code hetzelfde). Zie CONTEXT.md, *Concepten*.
 */
export const reserveActief = false;

/** Het concept als reserve voor een pagina die niet gepubliceerd is; null zolang de reserve uit staat. */
export function reserveConcept(slug: string): Concept | null {
  if (!reserveActief) return null;
  return uitBestand(slug, CONCEPTEN);
}

/** De Engelse pagina met deze Engelse slug (zoals "employees" of "services/recover"), in elke omgeving. */
export function conceptEn(slug: string): Concept | null {
  return uitBestand(slug, CONCEPTEN_EN, "en");
}

function uitBestand(slug: string, lijst: ConceptBestand[], taal: Taal = "nl"): Concept | null {
  const c = lijst.find((x) => x.slug === slug);
  if (!c) return null;
  const id = taal === "nl" ? c.slug : `${taal}-${c.slug}`;
  return {
    slug: c.slug,
    title: c.title,
    seo_title: c.seo_title,
    seo_description: c.seo_description,
    blocks: c.blocks.map((b, i) => ({
      id: `concept-${id}-${i}`,
      page_id: `concept-${id}`,
      type: b.type,
      label: b.label ?? null,
      sort: i,
      data: b.data as Record<string, unknown>,
      updated_at: "",
    })),
  };
}

/** De slugs die als reserve-inhoud bereikbaar zijn, voor sitemap.xml; leeg zolang de reserve uit staat. */
export function reserveSlugs(): string[] {
  return reserveActief ? CONCEPTEN.map((c) => c.slug).filter((s) => s !== "home") : [];
}

/** Slugs van concepten die nog niet als pagina bestaan, voor generateStaticParams. */
export function conceptSlugs(): string[] {
  return conceptenActief ? CONCEPTEN.map((c) => c.slug).filter((s) => s !== "home") : [];
}

/** De Engelse slugs met een eigen pagina onder /en (zonder "home"), voor generateStaticParams en sitemap.xml. */
export function alleConceptSlugsEn(): string[] {
  return CONCEPTEN_EN.map((c) => c.slug).filter((s) => s !== "home");
}
