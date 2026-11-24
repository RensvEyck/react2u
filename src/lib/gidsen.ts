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

export type GidsDienst = "recover" | "restart" | "resist" | "reflex" | "ready";

/** Het onderwerp in de kennisbank waar een gids onder hangt (lib/kennis.ts). */
export type OnderwerpSlug = "verzuim" | "re-integratie" | "preventie" | "wet-en-regels";

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
  /** Het onderwerp in de kennisbank (/kennis/<onderwerp>). */
  onderwerp: OnderwerpSlug;
  /** De auteur (slug uit lib/auteurs.ts); dezelfde naam staat in de kop van de gids. */
  auteur: string;
};

/** De labeltint per dienst, dezelfde als op de dienstpagina (src/content/<label>.json). */
export const DIENST_TINT: Record<GidsDienst, string> = {
  recover: "#FDECF4",
  restart: "#FEF3E3",
  resist: "#E5F5F4",
  reflex: "#E9F5FC",
  ready: "#ECEBF5",
};

/** De labelkleur per dienst, dezelfde als in het woordenboek (header.diensten). */
export const DIENST_KLEUR: Record<GidsDienst, string> = {
  recover: "#E61674",
  restart: "#F19001",
  resist: "#00A098",
  reflex: "#3AA5DD",
  ready: "#322E83",
};

// De naam van een dienst ("Re-integratie eerste en tweede spoor") staat niet
// hier maar in DIENSTEN in lib/organisatie.ts: één bron voor de hele site.
// Dat bestand importeert nav.ts, dat weer dit bestand importeert; daarom
// leest alleen de component (components/blocks/Gids.tsx) uit DIENSTEN.

/**
 * De gidsen, in de volgorde van het zoekvolume (DataForSEO, november 2026).
 * De eerste vijf komen uit het HALO-herstelplan (re-integratie 6.600 per
 * maand, Wet verbetering poortwachter 3.600, bedrijfsarts 2.900,
 * arbeidsdeskundig onderzoek 2.400, preventiemedewerker 1.600); de tweede
 * reeks dekt de kanswoorden erna (arbodienst 5.400, verzuimverzekering 880,
 * casemanager verzuim 720, loonsanctie 260 maar met hoge intentie) en de
 * vragen die daar in de praktijk bij horen.
 */
export const GIDSEN: Gids[] = [
  {
    slug: "re-integratie",
    naam: "Re-integratie",
    vraag: "Wat is re-integratie en wanneer start het tweede spoor?",
    kort: "Eerste en tweede spoor, wie wat moet doen en wanneer het tweede spoor moet beginnen.",
    zoekwoord: "re-integratie",
    dienst: "restart",
    onderwerp: "re-integratie",
    auteur: "rens-van-eyck",
  },
  {
    slug: "arbodienst",
    naam: "Arbodienst",
    vraag: "Wat doet een arbodienst en hoe kies je de juiste?",
    kort: "Wat een arbodienst voor je regelt, wat verplicht is, waar je op let bij het kiezen en hoe overstappen werkt.",
    zoekwoord: "arbodienst",
    dienst: "recover",
    onderwerp: "verzuim",
    auteur: "rens-van-eyck",
  },
  {
    slug: "wet-verbetering-poortwachter",
    naam: "Wet verbetering poortwachter",
    vraag: "Wat zijn de stappen van de Wet verbetering poortwachter?",
    kort: "Alle stappen en termijnen van week 1 tot week 104, en hoe je een loonsanctie voorkomt.",
    zoekwoord: "wet verbetering poortwachter",
    dienst: "recover",
    onderwerp: "wet-en-regels",
    auteur: "rens-van-eyck",
  },
  {
    slug: "bedrijfsarts",
    naam: "Bedrijfsarts",
    vraag: "Wat doet een bedrijfsarts, en wanneer heb je er een nodig?",
    kort: "De taken van de bedrijfsarts, wat jij wel en niet te horen krijgt en wat het basiscontract eist.",
    zoekwoord: "bedrijfsarts",
    dienst: "recover",
    onderwerp: "verzuim",
    auteur: "rens-van-eyck",
  },
  {
    slug: "arbeidsdeskundig-onderzoek",
    naam: "Arbeidsdeskundig onderzoek",
    vraag: "Wat is een arbeidsdeskundig onderzoek en wanneer laat je het doen?",
    kort: "De vier vragen die de arbeidsdeskundige beantwoordt, het beste moment en wat het kost.",
    zoekwoord: "arbeidsdeskundig onderzoek",
    dienst: "restart",
    onderwerp: "re-integratie",
    auteur: "rens-van-eyck",
  },
  {
    slug: "preventiemedewerker",
    naam: "Preventiemedewerker",
    vraag: "Wat is een preventiemedewerker en is die verplicht?",
    kort: "De drie wettelijke taken uit de Arbowet, wie het mag zijn en hoe je het regelt.",
    zoekwoord: "preventiemedewerker",
    dienst: "resist",
    onderwerp: "preventie",
    auteur: "rens-van-eyck",
  },
  {
    slug: "zieke-werknemer",
    naam: "Zieke werknemer",
    vraag: "Zieke werknemer: wat moet je als werkgever doen?",
    kort: "De eerste dag, de eerste week en de eerste zes weken: wat je regelt, wat je mag vragen en wat niet.",
    zoekwoord: "zieke werknemer",
    dienst: "recover",
    onderwerp: "verzuim",
    auteur: "rens-van-eyck",
  },
  {
    slug: "verzuimverzekering",
    naam: "Verzuimverzekering",
    vraag: "Wat is een verzuimverzekering en heb je die nodig?",
    kort: "Hoe een verzuimverzekering werkt, wat hij dekt, wat hij kost en wanneer hij verstandig is.",
    zoekwoord: "verzuimverzekering",
    dienst: "recover",
    onderwerp: "verzuim",
    auteur: "rens-van-eyck",
  },
  {
    slug: "casemanager-verzuim",
    naam: "Casemanager verzuim",
    vraag: "Wat doet een casemanager verzuim?",
    kort: "De taken van de casemanager, het verschil met de bedrijfsarts, taakdelegatie en wat jij ervan merkt.",
    zoekwoord: "casemanager verzuim",
    dienst: "recover",
    onderwerp: "verzuim",
    auteur: "rens-van-eyck",
  },
  {
    slug: "loonsanctie",
    naam: "Loonsanctie",
    vraag: "Wat is een loonsanctie en hoe voorkom je die?",
    kort: "Wanneer UWV een loonsanctie oplegt, wat het kost, hoe je hem voorkomt en hoe je hem bekort.",
    zoekwoord: "loonsanctie",
    dienst: "recover",
    onderwerp: "wet-en-regels",
    auteur: "rens-van-eyck",
  },
  {
    slug: "rie",
    naam: "RI&E",
    vraag: "Is een RI&E verplicht en hoe maak je er een?",
    kort: "Wat de risico-inventarisatie en -evaluatie is, voor wie hij verplicht is, de toetsing en het plan van aanpak.",
    zoekwoord: "ri&e",
    dienst: "resist",
    onderwerp: "preventie",
    auteur: "rens-van-eyck",
  },
  {
    slug: "eigenrisicodrager-ziektewet",
    naam: "Eigenrisicodrager Ziektewet",
    vraag: "Wat betekent eigenrisicodrager Ziektewet zijn?",
    kort: "Wat je zelf doet in plaats van UWV, voor wie het loont, de aanvraag en de verplichtingen.",
    zoekwoord: "eigenrisicodrager ziektewet",
    dienst: "reflex",
    onderwerp: "wet-en-regels",
    auteur: "rens-van-eyck",
  },
  {
    slug: "twee-jaar-ziek",
    naam: "Twee jaar ziek",
    vraag: "Wat gebeurt er als een werknemer twee jaar ziek is?",
    kort: "De WIA-beoordeling, het einde van de loondoorbetaling, ontslag, de transitievergoeding en de compensatie van UWV.",
    zoekwoord: "twee jaar ziek",
    dienst: "ready",
    onderwerp: "wet-en-regels",
    auteur: "rens-van-eyck",
  },
];

/** De gidsen uit het HALO-herstelplan (de eerste reeks, migratie 0060). */
export const EERSTE_REEKS = ["re-integratie", "wet-verbetering-poortwachter", "bedrijfsarts", "arbeidsdeskundig-onderzoek", "preventiemedewerker"];

/** De gids achter een pad of slug, of null als het geen gids is. */
export function gidsVoor(padOfSlug: string): Gids | null {
  const slug = padOfSlug.replace(/^\//, "").split(/[?#]/)[0].replace(/\/+$/, "");
  return GIDSEN.find((g) => g.slug === slug) ?? null;
}

/** De gidsen bij een dienst, voor de strook "Lees ook" op een dienstpagina. */
export function gidsenBij(dienst: string): Gids[] {
  return GIDSEN.filter((g) => g.dienst === dienst);
}

/**
 * Wanneer een gids voor het laatst is bijgewerkt: de datum in de kop, of de
 * laatste wijziging van de pagina in de database als die later is. Zo klopt
 * "bijgewerkt op" ook als een collega in het beheer een alinea aanpast
 * zonder de datum in de kop te verzetten.
 */
export function bijgewerktOp(inKop: string | null | undefined, uitDatabase: string | null | undefined): string | null {
  const geldig = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const a = geldig(inKop);
  const b = geldig(uitDatabase);
  if (a && b) return a > b ? a : b;
  return a ?? b;
}

/** Alle gidspaden, voor doelgroepVoorPad (een gids is voor werkgevers geschreven). */
export const GIDS_PADEN = GIDSEN.map((g) => `/${g.slug}`);

/**
 * De oude blogadressen die in een gids zijn opgegaan. Een 301 (lib/redirects.ts,
 * GIDS_REDIRECTS), zodat Google de positie van het artikel aan de gids geeft.
 */
export const GIDS_VAN_ARTIKEL: { artikel: string; gids: string }[] = [
  { artikel: "wet-verbetering-poortwachter-stappen", gids: "wet-verbetering-poortwachter" },
  // "Wat is een loonsanctie en wanneer krijg je die?" is opgegaan in de gids; de
  // artikelen over voorkomen en bekorten blijven als verdieping eronder hangen.
  { artikel: "loonsanctie-uwv", gids: "loonsanctie" },
];

/** De gidsen bij een onderwerp van de kennisbank, in de volgorde van GIDSEN. */
export function gidsenBijOnderwerp(onderwerp: OnderwerpSlug): Gids[] {
  return GIDSEN.filter((g) => g.onderwerp === onderwerp);
}

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
    .filter((b) => b.type.startsWith("gids") && b.type !== "gidsenKaarten" && b.type !== "gidsBronnen")
    .map((b) => tekstUit(b.data).split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
}
