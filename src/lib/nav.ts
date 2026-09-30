import type { Kleur } from "./brand";

// Foto's uit de mediabibliotheek. Hier en niet onderaan het bestand: PIJLERS
// hieronder gebruikt ze al bij het laden.
const FOTO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;

/** De foto bij "Kom met ons in contact" onderaan een pagina, als het blok zelf geen foto heeft. */
export const CONTACT_FOTO = `${FOTO}/2023/06/front-view-older-woman-talking-phone-while-working.jpg`;
/** Samenwerken op kantoor: de kop van "Werken bij React2u". */
export const WERKEN_BIJ_FOTO = `${FOTO}/2023/05/partnering-up-project-shot-two-coworkers-meeting-office.jpg`;

/* ---------- Diensten: drie stappen, zes diensten ---------- */

/**
 * `situatie` beschrijft de dienst vanuit de werkgever: waar loop je tegenaan?
 * Zo kiest een bezoeker op herkenning in plaats van op vakjargon.
 */
export type Dienst = { label: string; href: string; description: string; situatie: string; kleur: Kleur; image: string };
/** `stap` is de plek in de route van voorkomen naar versterken; `icon` een naam uit Icon.tsx. */
export type Pijler = { key: string; stap: string; title: string; text: string; kleur: Kleur; icon: string; diensten: Dienst[] };

/**
 * De zes diensten in drie stappen: voorkomen, begeleiden, versterken. Voedt het
 * menu, de footer en het blok "Diensten per situatie" (`pillars`).
 *
 * Kleur hoort bij de pijler, niet bij de dienst: drie kleuren uit het logo,
 * zodat je in menu, footer en overzichten in één oogopslag ziet wat bij
 * elkaar hoort. Zes kleuren voor zes diensten werd een regenboog waarin kleur
 * niets meer betekende. `kleur` staat per dienst zodat het later nog kan
 * afwijken, maar is nu gelijk aan die van de pijler.
 */
export const PIJLERS: Pijler[] = [
  {
    key: "preventie",
    stap: "Voorkomen",
    title: "Preventie",
    text: "Gezonde medewerkers vallen minder snel uit. We signaleren vroeg en pakken risico's aan voordat ze verzuim worden.",
    kleur: "blauw",
    icon: "shield",
    diensten: [
      {
        label: "Preventie & Vitaliteit",
        href: "/preventie-en-vitaliteit",
        description: "Preventief medisch onderzoek, consulten en tevredenheidsonderzoek.",
        situatie: "Je wilt verzuim voorkomen",
        kleur: "blauw",
        image: `${FOTO}/2024/06/Preventie-Vitaliteit-2.png`,
      },
      {
        label: "Risicomanagement (RI&E)",
        href: "/risicomanagement",
        description: "Samen met kerndeskundigen de risico's in je organisatie in kaart.",
        situatie: "Je wilt de risico's in je organisatie in kaart",
        kleur: "blauw",
        image: `${FOTO}/2024/06/RIE_-Risicomanagement-1.png`,
      },
    ],
  },
  {
    key: "verzuim",
    stap: "Begeleiden",
    title: "Verzuim",
    text: "Valt er toch iemand uit? Dan begeleiden we je medewerker doelgericht terug naar werk, met een vaste casemanager en duidelijke stappen.",
    kleur: "rood",
    icon: "route",
    diensten: [
      {
        label: "Verzuimbegeleiding WVP",
        href: "/verzuimbegeleiding-wvp",
        description: "Het volledige poortwachtertraject, van ziekmelding tot WIA-aanvraag.",
        situatie: "Een medewerker meldt zich ziek",
        kleur: "rood",
        image: `${FOTO}/2024/06/Verzuimbegeleiding-WVP-Rood-2.png`,
      },
      {
        label: "Verzuimbegeleiding ERD/ZW",
        href: "/verzuimbegeleiding-erd-zw",
        description: "Voor eigenrisicodragers Ziektewet, ook in de flexbranche.",
        situatie: "Je bent eigenrisicodrager voor de Ziektewet",
        kleur: "rood",
        image: `${FOTO}/2024/06/Verzuimbegeleiding-ERD_ZVW-1-1.png`,
      },
    ],
  },
  {
    key: "ontwikkeling",
    stap: "Versterken",
    title: "Ontwikkeling",
    text: "Soms is er meer nodig dan een plan van aanpak. Met coaching en training brengen we mensen en teams weer in beweging.",
    kleur: "teal",
    icon: "leaf",
    diensten: [
      {
        label: "Begeleiding & Coaching",
        href: "/begeleiding-en-coaching",
        description: "Eén-op-één, burn-out- en loopbaancoaching op maat.",
        situatie: "Een medewerker loopt vast of dreigt uit te vallen",
        kleur: "teal",
        image: `${FOTO}/2024/06/Begeleiding-Coaching-1.png`,
      },
      {
        label: "Trainingen & Workshops",
        href: "/trainingen-en-workshops",
        description: "Verzuim-, management- en communicatietrainingen voor je team.",
        situatie: "Je wilt leidinggevenden en je team versterken",
        kleur: "teal",
        image: `${FOTO}/2024/06/Trainingen-Cursussen-2.png`,
      },
    ],
  },
];

/* ---------- Werkgever en werknemer ---------- */

/**
 * De site kent twee doelgroepen met elk een eigen startpagina en een eigen
 * menu. Een werkgever zoekt diensten en een partner; een zieke werknemer wil
 * weten wat hij moet doen. Het startscherm op `/` laat kiezen.
 */
export type Doelgroep = "werkgever" | "werknemer";

export const STARTPAGINA: Record<Doelgroep, NavLink> = {
  werkgever: { label: "Werkgevers", href: "/werkgevers" },
  werknemer: { label: "Werknemers", href: "/werknemers" },
};

const WERKNEMER_PADEN = ["/werknemers", "/verzuimprotocol"];

/**
 * Bij welke doelgroep hoort dit pad? `null` voor het startscherm en voor
 * gedeelde pagina's (contact, blog, over ons): daar geldt de laatste keuze
 * van de bezoeker (zie lib/doelgroep.ts).
 */
export function doelgroepVoorPad(path: string): Doelgroep | null {
  if (WERKNEMER_PADEN.some((p) => path === p || path.startsWith(`${p}/`))) return "werknemer";
  if (path === "/werkgevers" || path === "/diensten" || dienstVoor(path)) return "werkgever";
  return null;
}

/* ---------- Hoofdmenu ---------- */

export type NavLink = { label: string; href: string };
/**
 * Een menu-item is een gewone link, een uitklapmenu (`children`) of het
 * dienstenmenu met de pijlers (`mega`). Het dienstenmenu leest uit PIJLERS.
 */
export type NavItem = NavLink & { children?: NavLink[]; mega?: true };

const OVER_ONS: NavItem = {
  label: "Over ons",
  href: "/over-react2u",
  children: [
    { label: "Over React2u", href: "/over-react2u" },
    { label: "Werken bij React2u", href: "/vacatures" },
  ],
};

/**
 * Het menu per doelgroep. `algemeen` staat op het startscherm, waar nog niet
 * gekozen is.
 */
export const NAV: Record<Doelgroep | "algemeen", NavItem[]> = {
  werkgever: [
    { label: "Diensten", href: "/diensten", mega: true },
    { label: "Verzuimabonnementen", href: "/verzuimabonnementen" },
    OVER_ONS,
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  werknemer: [
    { label: "Ziek, wat nu?", href: "/verzuimprotocol" },
    { label: "Veelgestelde vragen", href: "/werknemers#veelgestelde-vragen" },
    OVER_ONS,
    { label: "Contact", href: "/contact" },
  ],
  // Op het startscherm is nog niet gekozen; de diensten staan er toch in, want
  // wie direct zoekt, zoekt meestal een dienst.
  algemeen: [
    { label: "Diensten", href: "/diensten", mega: true },
    { label: "Verzuimabonnementen", href: "/verzuimabonnementen" },
    OVER_ONS,
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
};

/** De knop rechts in de header, per doelgroep. */
export const HEADER_CTA: Record<Doelgroep | "algemeen", NavLink> = {
  werkgever: { label: "Maak een afspraak", href: "/contact" },
  werknemer: { label: "Stel je vraag", href: "/contact" },
  algemeen: { label: "Neem contact op", href: "/contact" },
};

/** De dienst achter een pad, met zijn pijler — of null als het geen dienstpagina is. */
export function dienstVoor(path: string): { dienst: Dienst; pijler: Pijler } | null {
  for (const pijler of PIJLERS) {
    const dienst = pijler.diensten.find((d) => d.href === path);
    if (dienst) return { dienst, pijler };
  }
  return null;
}

/**
 * Het kruimelpad naar een pagina, zonder "Home" (dat zet de weergave ervoor).
 * Pagina's van een doelgroep hangen onder hun startpagina, zodat je altijd
 * ziet in welk deel van de site je bent: Werkgevers › Diensten › Verzuim-
 * begeleiding WVP, of Werknemers › Verzuimprotocol.
 */
export function crumbsVoor(path: string, title: string): NavLink[] {
  const groep = doelgroepVoorPad(path);
  if (!groep) return [{ label: title, href: path }];
  const start = STARTPAGINA[groep];
  if (path === start.href) return [start];
  const tussen = dienstVoor(path) ? [{ label: "Diensten", href: "/diensten" }] : [];
  return [start, ...tussen, { label: title, href: path }];
}

export const LINKEDIN_URL = "https://www.linkedin.com/company/react2u/";

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;

export const LOGO_URL = `${MEDIA}/2023/07/cropped-cropped-Logo_react2u.png`;
export const FAVICON_URL = `${MEDIA}/2023/05/cropped-favicon-react2u-32x32.png`;
export const LOGO_SVG_URL = `${MEDIA}/2023/05/Logo-kleur.svg`;

/* ---------- Footer: documenten ---------- */

export type FooterDoc = { label: string; href: string };

// Vroeger was dit een vast object met precies deze drie sleutels. Sinds de
// footer een vrije lijst is, bestaat die vorm alleen nog als opgeslagen data in
// site_settings — zie normalizeDocs().
type LegacyFooterDocs = {
  algemene_voorwaarden: string;
  klachtenprocedure: string;
  privacy_reglement: string;
};

const LEGACY_DOC_LABELS: { key: keyof LegacyFooterDocs; label: string }[] = [
  { key: "algemene_voorwaarden", label: "Algemene voorwaarden" },
  { key: "klachtenprocedure", label: "Klachtenprocedure" },
  { key: "privacy_reglement", label: "Privacy regelement" },
];

const LEGACY_DOC_HREFS: LegacyFooterDocs = {
  algemene_voorwaarden: `${MEDIA}/2025/05/Algemene-voorwaarden-r2u.pdf`,
  klachtenprocedure: `${MEDIA}/2025/05/Klachtenprocedure-r2u.pdf`,
  privacy_reglement: `${MEDIA}/2025/05/Privacy-reglement-r2u.pdf`,
};

export const FOOTER_DOCS_FALLBACK: FooterDoc[] = LEGACY_DOC_LABELS.map((d) => ({
  label: d.label,
  href: LEGACY_DOC_HREFS[d.key],
}));

/**
 * Leest zowel de nieuwe lijstvorm als het oude vaste object uit site_settings.
 *
 * De oude vorm staat nog in de database van sites die vóór de omzetting zijn
 * opgeslagen. Zou dit alleen de lijstvorm accepteren, dan viel de footer terug
 * op de standaardlinks tot iemand de instellingen opnieuw opslaat — met kans op
 * verkeerde URL's in de tussentijd.
 */
export function normalizeDocs(value: unknown): FooterDoc[] {
  if (Array.isArray(value)) {
    return value
      .map((d) => ({
        label: String((d as FooterDoc)?.label ?? "").trim(),
        href: String((d as FooterDoc)?.href ?? "").trim(),
      }))
      .filter((d) => d.label && d.href);
  }
  if (value && typeof value === "object") {
    const legacy = value as Partial<LegacyFooterDocs>;
    const out = LEGACY_DOC_LABELS.map((d) => ({
      label: d.label,
      href: String(legacy[d.key] ?? LEGACY_DOC_HREFS[d.key]).trim(),
    })).filter((d) => d.href);
    if (out.length) return out;
  }
  return FOOTER_DOCS_FALLBACK;
}

/* ---------- Footer: certificaten ---------- */

// href is optioneel: een keurmerk zonder doorklik toont alleen het logo.
export type Certificate = { image: string; alt: string; href: string };

/** Herkent of een URL naar een afbeelding wijst die een browser kan tonen. */
export function isAfbeelding(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url.trim());
}

/**
 * Certificaten voor de footer.
 *
 * Een certificaat telt mee zodra er íets te tonen valt: een logo, of anders een
 * omschrijving met een link. Dat laatste is er bewust bij: certificaten worden
 * vaak als PDF aangeleverd, en een PDF kun je niet in een `<img>` zetten. Zonder
 * die uitzondering verdween zo'n regel spoorloos — hij werd wél opgeslagen, maar
 * verscheen nergens, wat niet te onderscheiden is van "opslaan werkt niet".
 *
 * Een niet-toonbaar bestand in `image` (zoals een PDF) schuift daarom door naar
 * `href`, zodat het als link bruikbaar blijft.
 */
export function normalizeCertificates(value: unknown): Certificate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => {
      const ruw = String((c as Certificate)?.image ?? "").trim();
      const alt = String((c as Certificate)?.alt ?? "").trim();
      const href = String((c as Certificate)?.href ?? "").trim();
      const toonbaar = isAfbeelding(ruw);
      return {
        image: toonbaar ? ruw : "",
        alt,
        // Staat er een PDF in het logoveld en is er geen link, dan wordt dat de link.
        href: href || (!toonbaar && ruw ? ruw : ""),
      };
    })
    .filter((c) => c.image || (c.alt && c.href));
}
