import type { Post } from "./types";
import { GIDSEN, gidsenBijOnderwerp, type Gids, type GidsDienst, type OnderwerpSlug } from "./gidsen";

/**
 * De kennisbank (/kennis): de gidsen als pijlers, de artikelen en de
 * hulpmiddelen eronder, per onderwerp. Tot november 2026 stond alles op /blog,
 * als één lijst zonder structuur; de HALO-scan zag dat de interne links
 * vooral naar plaatsnamen gingen en de onderwerppagina's weinig kracht
 * kregen. Nu hangt elk stuk inhoud onder één van vier onderwerpen, met een
 * eigen pagina (/kennis/<onderwerp>) die naar de gidsen, de hulpmiddelen en de
 * artikelen linkt, en terug naar de dienst. Zie docs/adr/0004.
 *
 * Wat hier staat is wat de site over de kennisbank moet weten; de inhoud zelf
 * staat in de gidsen (src/content/<slug>.json), de artikelen (tabel posts) en
 * de hulpmiddelen (components/kennis/).
 */

export type { OnderwerpSlug } from "./gidsen";

export type Onderwerp = {
  slug: OnderwerpSlug;
  naam: string;
  /** De kop van de onderwerppagina, als zin. */
  kop: string;
  tekst: string;
  seo_title: string;
  seo_description: string;
  /** Het label dat bij dit onderwerp hoort, voor "Zo helpt React2u". */
  dienst: GidsDienst;
};

export const ONDERWERPEN: Onderwerp[] = [
  {
    slug: "verzuim",
    naam: "Verzuim",
    kop: "Een werknemer is ziek. Wat nu?",
    tekst: "Van de ziekmelding tot de bedrijfsarts en de kosten: wat je in de eerste weken regelt, wat je mag vragen en wie je daarbij helpt.",
    seo_title: "Verzuim: gidsen en hulpmiddelen voor werkgevers • React2u",
    seo_description: "Alles over verzuim voor werkgevers: de ziekmelding, de bedrijfsarts, de arbodienst, de casemanager, de kosten en de verzuimverzekering. Gidsen, artikelen en hulpmiddelen.",
    dienst: "recover",
  },
  {
    slug: "re-integratie",
    naam: "Re-integratie",
    kop: "Terug aan het werk, bij jou of ergens anders",
    tekst: "Het eerste en het tweede spoor, het arbeidsdeskundig onderzoek en de keuzes onderweg: wanneer blijf je bij het eigen werk, en wanneer niet.",
    seo_title: "Re-integratie: gidsen en hulpmiddelen • React2u",
    seo_description: "Alles over re-integratie voor werkgevers: eerste en tweede spoor, het arbeidsdeskundig onderzoek en wat UWV van je verwacht. Gidsen, artikelen en hulpmiddelen.",
    dienst: "restart",
  },
  {
    slug: "preventie",
    naam: "Preventie",
    kop: "Uitval voorkomen vóór de ziekmelding",
    tekst: "De RI&E, de preventiemedewerker, het preventief medisch onderzoek en de signalen die je eerder kunt zien dan het verzuim.",
    seo_title: "Preventie: gidsen en hulpmiddelen voor werkgevers • React2u",
    seo_description: "Alles over preventie voor werkgevers: de RI&E, de preventiemedewerker, het PMO en de verplichtingen uit de Arbowet. Gidsen, artikelen en hulpmiddelen.",
    dienst: "resist",
  },
  {
    slug: "wet-en-regels",
    naam: "Wet en regels",
    kop: "De Wet verbetering poortwachter, UWV en de Arbowet",
    tekst: "De termijnen, de loonsanctie, de WIA en wat er na twee jaar ziekte gebeurt. Met een planner die alle datums voor je uitrekent.",
    seo_title: "Wet en regels bij verzuim: gidsen voor werkgevers • React2u",
    seo_description: "De Wet verbetering poortwachter, de loonsanctie, de WIA, eigenrisicodragerschap en twee jaar ziekte, uitgelegd voor werkgevers. Met de Poortwachter-planner en de loonsanctie-check.",
    dienst: "recover",
  },
];

export function onderwerpVoor(slug: string): Onderwerp | null {
  return ONDERWERPEN.find((o) => o.slug === slug) ?? null;
}

/* ---------- hulpmiddelen ---------- */

export type Hulpmiddel = {
  /** Het adres: /kennis/<slug>. */
  slug: string;
  naam: string;
  /** De vraag die het hulpmiddel beantwoordt, de H1. */
  vraag: string;
  kort: string;
  onderwerp: OnderwerpSlug;
  soort: "planner" | "check" | "checklist";
  seo_title: string;
  seo_description: string;
  /** De gids die erbij hoort. */
  gids: string;
};

export const HULPMIDDELEN: Hulpmiddel[] = [
  {
    slug: "poortwachter-planner",
    naam: "Poortwachter-planner",
    vraag: "Welke poortwachtertermijn komt eraan, en wanneer precies?",
    kort: "Vul de eerste ziektedag in en zie alle datums van week 6 tot week 104, om in je agenda te zetten.",
    onderwerp: "wet-en-regels",
    soort: "planner",
    seo_title: "Poortwachter-planner: alle termijnen op datum • React2u",
    seo_description: "Vul de eerste ziektedag in en zie meteen de uiterste datums van de Wet verbetering poortwachter: week 6, 8, 42, 52, 88, 91, 93 en 104. Zet ze in één keer in je agenda.",
    gids: "wet-verbetering-poortwachter",
  },
  {
    slug: "loonsanctie-check",
    naam: "Loonsanctie-check",
    vraag: "Hoe groot is je risico op een loonsanctie?",
    kort: "Twaalf vragen over je dossier, meteen de zwakke plekken en wat je nog kunt herstellen.",
    onderwerp: "wet-en-regels",
    soort: "check",
    seo_title: "Loonsanctie-check: hoe groot is je risico? • React2u",
    seo_description: "Twaalf vragen over je poortwachterdossier en meteen het antwoord: laag, verhoogd of hoog risico op een loonsanctie van UWV, met per punt wat je nog kunt herstellen.",
    gids: "loonsanctie",
  },
  {
    slug: "checklist-poortwachterdossier",
    naam: "Checklist poortwachterdossier",
    vraag: "Is je dossier compleet voor UWV?",
    kort: "De 24 punten die UWV bij de WIA-aanvraag controleert, als pdf in je mailbox.",
    onderwerp: "wet-en-regels",
    soort: "checklist",
    seo_title: "Checklist poortwachterdossier: 24 punten voor UWV • React2u",
    seo_description: "De 24 documenten en afspraken die UWV bij de WIA-aanvraag in je re-integratieverslag verwacht, per fase van week 1 tot week 104. Gratis als pdf.",
    gids: "wet-verbetering-poortwachter",
  },
];

export function hulpmiddelVoor(slug: string): Hulpmiddel | null {
  return HULPMIDDELEN.find((h) => h.slug === slug) ?? null;
}

/** De hulpmiddelen bij een onderwerp; zonder eigen hulpmiddel alle drie (ze gaan allemaal over het dossier). */
export function hulpmiddelenBij(onderwerp: OnderwerpSlug): Hulpmiddel[] {
  const eigen = HULPMIDDELEN.filter((h) => h.onderwerp === onderwerp);
  return eigen.length ? eigen : HULPMIDDELEN;
}

/* ---------- artikelen ---------- */

/**
 * Onder welk onderwerp een artikel hangt. De artikelen van oktober 2026 staan
 * met naam genoemd; een nieuw artikel krijgt een onderwerp op zijn titel en
 * slug, en anders Verzuim (het breedste onderwerp).
 */
const ARTIKEL_ONDERWERP: Record<string, OnderwerpSlug> = {
  "loonsanctie-voorkomen": "wet-en-regels",
  "loonsanctie-bekorten": "wet-en-regels",
  "fouten-wet-verbetering-poortwachter": "wet-en-regels",
  "kosten-zieke-werknemer": "verzuim",
  "medewerker-langdurig-ziek": "verzuim",
  "verzuimkosten-verlagen": "verzuim",
  "verzuim-mkb": "verzuim",
};

export function onderwerpVanArtikel(p: Pick<Post, "slug" | "title">): OnderwerpSlug {
  const vast = ARTIKEL_ONDERWERP[p.slug];
  if (vast) return vast;
  const t = `${p.slug} ${p.title}`.toLowerCase();
  if (/poortwachter|loonsanctie|uwv|wia|wet\b|ziektewet|eigenrisico/.test(t)) return "wet-en-regels";
  if (/re-integratie|reintegratie|tweede spoor|spoor\b|arbeidsdeskundig/.test(t)) return "re-integratie";
  if (/preventie|ri&e|rie\b|vitaliteit|werkdruk|pmo\b|veilig/.test(t)) return "preventie";
  return "verzuim";
}

export function artikelenBij(posts: Post[], onderwerp: OnderwerpSlug): Post[] {
  return posts.filter((p) => onderwerpVanArtikel(p) === onderwerp);
}

/* ---------- zoeken ---------- */

export type KennisItem = {
  soort: "gids" | "hulpmiddel" | "artikel";
  titel: string;
  kort: string;
  href: string;
  onderwerp: OnderwerpSlug;
  /** Extra woorden waarop het item gevonden mag worden (het zoekwoord, de naam). */
  trefwoorden: string;
};

/** Alles wat in de kennisbank te vinden is, in één lijst voor het zoekveld. */
export function kennisItems(posts: Post[]): KennisItem[] {
  return [
    ...GIDSEN.map((g) => ({ soort: "gids" as const, titel: g.vraag, kort: g.kort, href: `/${g.slug}`, onderwerp: g.onderwerp, trefwoorden: `${g.naam} ${g.zoekwoord} gids` })),
    ...HULPMIDDELEN.map((h) => ({ soort: "hulpmiddel" as const, titel: h.vraag, kort: h.kort, href: `/kennis/${h.slug}`, onderwerp: h.onderwerp, trefwoorden: `${h.naam} ${h.soort} hulpmiddel` })),
    ...posts.map((p) => ({ soort: "artikel" as const, titel: p.title, kort: p.excerpt ? p.excerpt.slice(0, 160) : "", href: `/blog/${p.slug}`, onderwerp: onderwerpVanArtikel(p), trefwoorden: "artikel" })),
  ];
}

/** Letters zonder accenten en in kleine letters, zodat "RI&E" en "ri&e", "ziekte" en "ziekté" elkaar vinden. */
export function normaliseer(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Zoeken in de kennisbank: elk woord uit de vraag moet ergens in de titel, de
 * korte tekst of de trefwoorden voorkomen (als begin van een woord, zodat
 * "poortw" al iets vindt). Gidsen eerst, dan hulpmiddelen, dan artikelen; een
 * treffer in de titel telt zwaarder dan een in de tekst.
 */
export function zoekKennis(items: KennisItem[], vraag: string, max = 12): KennisItem[] {
  const woorden = normaliseer(vraag).split(/[^a-z0-9&-]+/).filter((w) => w.length >= 2);
  if (!woorden.length) return [];
  const rang = { gids: 0, hulpmiddel: 1, artikel: 2 };
  const scoor = (it: KennisItem): number => {
    const titel = normaliseer(it.titel);
    const rest = normaliseer(`${it.kort} ${it.trefwoorden}`);
    let score = 0;
    for (const w of woorden) {
      const inTitel = titel.split(/[^a-z0-9&-]+/).some((t) => t.startsWith(w));
      const inRest = rest.split(/[^a-z0-9&-]+/).some((t) => t.startsWith(w));
      if (!inTitel && !inRest) return 0;
      score += inTitel ? 3 : 1;
    }
    return score;
  };
  return items
    .map((it, i) => ({ it, score: scoor(it), i }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || rang[a.it.soort] - rang[b.it.soort] || a.i - b.i)
    .slice(0, max)
    .map((x) => x.it);
}

/** Alle gidsen van een onderwerp, voor de hub en de onderwerppagina. */
export function gidsenPerOnderwerp(): { onderwerp: Onderwerp; gidsen: Gids[] }[] {
  return ONDERWERPEN.map((o) => ({ onderwerp: o, gidsen: gidsenBijOnderwerp(o.slug) }));
}
