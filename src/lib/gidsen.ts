/**
 * De gidsen: vaste pagina's die één vraag van een werkgever volledig
 * beantwoorden (/re-integratie, /wet-verbetering-poortwachter, …). Ze komen
 * uit punt 4 van het HALO-herstelplan (november 2026): React2u stond op 57
 * zoekwoorden net buiten de eerste pagina, maar had geen pagina over de
 * onderwerpen waar werkgevers op zoeken. Het Poortwachter-artikel op de blog
 * kreeg 1.589 vertoningen en 2 klikken (positie 32); een echte gids brengt
 * zo'n onderwerp naar de eerste pagina.
 *
 * De inhoud zelf staat per gids in src/content/<slug>.json (blokken
 * `gidsKop`, `gidsTekst`, `gidsTijdlijn`, `gidsTabel`, `gidsVragen`,
 * `gidsHelpt`; zie components/blocks/Gids.tsx). Deze lijst is wat de rest
 * van de site over een gids moet weten om ernaar te linken: de kaarten op de
 * homepage, /diensten en de blog, de strook op een dienstpagina, het
 * kruimelpad en /llms.txt. Zie CONTEXT.md, *SEO* en docs/adr/0002.
 */

export type GidsDienst = "recover" | "restart" | "resist";

export type Gids = {
  /** Het adres: /<slug>. */
  slug: string;
  /** Korte naam, voor het kruimelpad, kaarten en linkteksten. */
  naam: string;
  /** De vraag die de H1 van de gids is. */
  vraag: string;
  /** Eén zin voor een kaart of lijst. */
  kort: string;
  /** Het zoekwoord waarop de gids gevonden moet worden (DataForSEO, november 2026). */
  zoekwoord: string;
  /** Het label waar de gids naar verwijst in "Zo helpt React2u". */
  dienst: GidsDienst;
};

/** De labeltint per dienst, dezelfde als op de dienstpagina (src/content/<label>.json). */
export const DIENST_TINT: Record<GidsDienst, string> = {
  recover: "#FDECF4",
  restart: "#FEF3E3",
  resist: "#E5F5F4",
};

/** De labelkleur per dienst, dezelfde als in het woordenboek (header.diensten). */
export const DIENST_KLEUR: Record<GidsDienst, string> = {
  recover: "#E61674",
  restart: "#F19001",
  resist: "#00A098",
};

/** Hoe het label heet en wat het is, voor de kaart "Zo helpt React2u" en de chip op een gidskaart. */
export const DIENST_NAAM: Record<GidsDienst, { naam: string; wat: string }> = {
  recover: { naam: "Recover", wat: "Verzuimbegeleiding" },
  restart: { naam: "Restart", wat: "Re-integratie en loopbaan" },
  resist: { naam: "Resist", wat: "Preventie en vitaliteit" },
};

/**
 * De vijf gidsen, in de volgorde van het zoekvolume (re-integratie 6.600 per
 * maand, Wet verbetering poortwachter 3.600, bedrijfsarts 2.900,
 * arbeidsdeskundig onderzoek 2.400, preventiemedewerker 1.600).
 */
export const GIDSEN: Gids[] = [
  {
    slug: "re-integratie",
    naam: "Re-integratie",
    vraag: "Wat is re-integratie en wanneer start het tweede spoor?",
    kort: "Eerste en tweede spoor, wie wat moet doen en wanneer het tweede spoor moet beginnen.",
    zoekwoord: "re-integratie",
    dienst: "restart",
  },
  {
    slug: "wet-verbetering-poortwachter",
    naam: "Wet verbetering poortwachter",
    vraag: "Wat zijn de stappen van de Wet verbetering poortwachter?",
    kort: "Alle stappen en termijnen van week 1 tot week 104, en hoe je een loonsanctie voorkomt.",
    zoekwoord: "wet verbetering poortwachter",
    dienst: "recover",
  },
  {
    slug: "bedrijfsarts",
    naam: "Bedrijfsarts",
    vraag: "Wat doet een bedrijfsarts, en wanneer heb je er een nodig?",
    kort: "De taken van de bedrijfsarts, wat jij wel en niet te horen krijgt en wat het basiscontract eist.",
    zoekwoord: "bedrijfsarts",
    dienst: "recover",
  },
  {
    slug: "arbeidsdeskundig-onderzoek",
    naam: "Arbeidsdeskundig onderzoek",
    vraag: "Wat is een arbeidsdeskundig onderzoek en wanneer laat je het doen?",
    kort: "De vier vragen die de arbeidsdeskundige beantwoordt, het beste moment en wat het kost.",
    zoekwoord: "arbeidsdeskundig onderzoek",
    dienst: "restart",
  },
  {
    slug: "preventiemedewerker",
    naam: "Preventiemedewerker",
    vraag: "Wat is een preventiemedewerker en is die verplicht?",
    kort: "De drie wettelijke taken uit de Arbowet, wie het mag zijn en hoe je het regelt.",
    zoekwoord: "preventiemedewerker",
    dienst: "resist",
  },
];

/** De gids achter een pad of slug, of null als het geen gids is. */
export function gidsVoor(padOfSlug: string): Gids | null {
  const slug = padOfSlug.replace(/^\//, "").split(/[?#]/)[0].replace(/\/+$/, "");
  return GIDSEN.find((g) => g.slug === slug) ?? null;
}

/** De gidsen bij een dienst, voor de strook "Lees ook" op een dienstpagina. */
export function gidsenBij(dienst: string): Gids[] {
  return GIDSEN.filter((g) => g.dienst === dienst);
}

/** Alle gidspaden, voor doelgroepVoorPad (een gids is voor werkgevers geschreven). */
export const GIDS_PADEN = GIDSEN.map((g) => `/${g.slug}`);

/**
 * De oude blogadressen die in een gids zijn opgegaan. Een 301 (lib/redirects.ts,
 * GIDS_REDIRECTS), zodat Google de positie van het artikel aan de gids geeft.
 */
export const GIDS_VAN_ARTIKEL: { artikel: string; gids: string }[] = [
  { artikel: "wet-verbetering-poortwachter-stappen", gids: "wet-verbetering-poortwachter" },
];

/* ---------- rekenhulpen, ook voor de test die de gidsen bewaakt ---------- */

/** Anker voor een hoofdstukkop, dezelfde regel als anchorId in BlockRenderer: "Eerste spoor" → "eerste-spoor". */
export function gidsAnker(titel: string): string {
  return String(titel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Velden die geen lopende tekst zijn: kleuren, adressen, chips en namen tellen niet mee in de omvang. */
const GEEN_TEKST = new Set(["kleur", "tint", "href", "eyebrow", "wie", "kruimel", "gepubliceerd", "bijgewerkt", "label", "naam", "functie", "icon", "value", "image", "alt", "focus", "bg", "slugs"]);

function tekstUit(v: unknown, sleutel?: string): string {
  if (sleutel && GEEN_TEKST.has(sleutel)) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => tekstUit(x)).join(" ");
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => tekstUit(x, k)).join(" ");
  return "";
}

/**
 * Het aantal woorden lopende tekst van een gids, over alle gidsblokken. HALO
 * vraagt 1.500 tot 2.000 woorden per gids; de leestijd in de kop rekent met
 * 200 woorden per minuut.
 */
export function gidsWoorden(blocks: { type: string; data: unknown }[]): number {
  return blocks
    .filter((b) => b.type.startsWith("gids") && b.type !== "gidsenKaarten")
    .map((b) => tekstUit(b.data).split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
}
