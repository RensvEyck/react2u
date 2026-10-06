import { nlPadVoor, pad, type Taal } from "./taal";
import { woordenboek } from "./woordenboek";

// Foto's uit de mediabibliotheek. Hier en niet onderaan het bestand: LABELS
// hieronder gebruikt ze al bij het laden.
const FOTO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;

/** De foto bij "Kom met ons in contact" onderaan een pagina, als het blok zelf geen foto heeft. */
export const CONTACT_FOTO = `${FOTO}/2023/06/front-view-older-woman-talking-phone-while-working.jpg`;
/** Samenwerken op kantoor: de kop van "Werken bij React2u". */
export const WERKEN_BIJ_FOTO = `${FOTO}/2023/05/partnering-up-project-shot-two-coworkers-meeting-office.jpg`;
/** De fototegels "Ik ben werkgever" en "Ik ben werknemer" op de 404 en de lege blog. */
export const DOELGROEP_FOTO = {
  werkgever: `${FOTO}/2024/06/RIE_-Risicomanagement-1.png`,
  werknemer: `${FOTO}/2024/06/Verzuimbegeleiding-ERD_ZVW-1-1.png`,
} as const;

/* ---------- Diensten: vijf labels ---------- */

/**
 * Een label is een specialisme met een eigen pagina (/resist, /recover, …).
 * `situatie` beschrijft het label vanuit de werkgever: waar loop je tegenaan?
 * Zo kiest een bezoeker op herkenning in plaats van op vakjargon.
 */
export type Label = {
  naam: string;
  /** "React2u Recover": zo heet het label in menu's en lijsten. */
  titel: string;
  href: string;
  /** Wat het label is, in twee of drie woorden: "Verzuimbegeleiding". */
  omschrijving: string;
  situatie: string;
  /** De labelkleur (hex), dezelfde als op de labelpagina. */
  kleur: string;
  image: string;
};

const LABEL_EXTRA: Record<string, Pick<Label, "situatie" | "image">> = {
  resist: { situatie: "Je wilt uitval voorkomen", image: `${FOTO}/2024/06/Preventie-Vitaliteit-2.png` },
  recover: { situatie: "Een medewerker meldt zich ziek", image: `${FOTO}/2024/06/Verzuimbegeleiding-WVP-Rood-2.png` },
  restart: { situatie: "Terugkeer in het eigen werk lukt niet", image: `${FOTO}/2024/06/Begeleiding-Coaching-1.png` },
  reflex: { situatie: "Je werkt met flexkrachten of bent eigenrisicodrager", image: `${FOTO}/2024/06/Verzuimbegeleiding-ERD_ZVW-1-1.png` },
  ready: { situatie: "Je hebt een HR-vraag rond verzuim", image: `${FOTO}/2023/06/serious-colleagues-discussing-documents-meeting-e1717497004999.jpg` },
};

/**
 * De vijf labels, in de volgorde van het dienstenmenu: van voorkomen via
 * verzuim naar re-integratie, dan de twee specialismen. Naam, omschrijving en
 * kleur komen uit het woordenboek (header.diensten), zodat het nieuwe menu en
 * deze lijst nooit uit elkaar lopen. Voedt het oude menu en de oude footer, de
 * 404, en de blokken `pillars` en `servicesGrid`.
 *
 * Tot oktober 2026 waren dit zes diensten in drie stappen; die oude pagina's
 * sturen nu met een 301 door naar hun label (DIENST_REDIRECTS in redirects.ts).
 */
export const LABELS: Label[] = woordenboek("nl").header.diensten.map((d) => ({
  naam: d.naam,
  titel: `React2u ${d.naam}`,
  href: `/${d.slug}`,
  omschrijving: d.sub,
  kleur: d.kleur,
  ...LABEL_EXTRA[d.slug],
}));

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

const WERKNEMER_PADEN = ["/werknemers", "/verzuimprotocol", "/je-rechten-en-privacy", "/je-casemanager"];
/**
 * Bij welke doelgroep hoort dit pad? `null` voor het startscherm en voor
 * gedeelde pagina's (contact, blog, over ons): daar geldt de laatste keuze
 * van de bezoeker (zie lib/doelgroep.ts).
 */
export function doelgroepVoorPad(pathOfEnPath: string): Doelgroep | null {
  // Een Engels pad (/en/employees) telt als zijn Nederlandse tegenhanger.
  const path = nlPadVoor(pathOfEnPath);
  if (WERKNEMER_PADEN.some((p) => path === p || path.startsWith(`${p}/`))) return "werknemer";
  // De vijf labelpagina's (Resist, Recover, …) horen bij de werkgever.
  if (path === "/werkgevers" || path === "/diensten" || labelVoor(path)) return "werkgever";
  return null;
}

/* ---------- Hoofdmenu ---------- */

export type NavLink = { label: string; href: string };
/**
 * Een menu-item is een gewone link, een uitklapmenu (`children`) of het
 * dienstenmenu met de labels (`mega`). Het dienstenmenu leest uit LABELS.
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

/** Het label achter een Nederlands pad, of null als het geen labelpagina is. */
export function labelVoor(path: string): Label | null {
  return LABELS.find((l) => l.href === path) ?? null;
}

/**
 * Het kruimelpad naar een pagina, zonder "Home" (dat zet de weergave ervoor).
 * Pagina's van een doelgroep hangen onder hun startpagina, zodat je altijd
 * ziet in welk deel van de site je bent: Werkgevers › Diensten › React2u
 * Recover, of Werknemers › Verzuimprotocol. Dezelfde stappen als het zichtbare
 * kruimelpad op een labelpagina (DienstLabel), in beide talen.
 */
export function crumbsVoor(path: string, title: string, taal: Taal = "nl"): NavLink[] {
  const groep = doelgroepVoorPad(path);
  if (!groep) return [{ label: title, href: path }];
  const t = woordenboek(taal).header;
  const start: NavLink = taal === "nl"
    ? STARTPAGINA[groep]
    : { label: groep === "werkgever" ? t.werkgevers : t.werknemers, href: pad(taal, groep === "werkgever" ? "werkgevers" : "werknemers") };
  if (path === start.href) return [start];
  const tussen = labelVoor(nlPadVoor(path))
    ? [{ label: woordenboek(taal).dienstLabel.kruimelDiensten, href: pad(taal, "diensten") }]
    : [];
  return [start, ...tussen, { label: title, href: path }];
}

export const LINKEDIN_URL = "https://www.linkedin.com/company/react2u/";

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;

export const LOGO_URL = `${MEDIA}/2023/07/cropped-cropped-Logo_react2u.png`;
/** De favicon staat in de code: app/favicon.ico (met icon.png en apple-icon.png ernaast). */
export const FAVICON_URL = "/favicon.ico";
export const LOGO_SVG_URL = `${MEDIA}/2023/05/Logo-kleur.svg`;

/* ---------- Footer: documenten ---------- */

export type FooterDoc = { label: string; href: string };

// Vroeger was dit een vast object met drie sleutels (ook `privacy_reglement`,
// de oude WordPress-PDF die niet meer in de footer hoort). Sinds de footer een
// vrije lijst is, bestaat die vorm alleen nog als opgeslagen data in
// site_settings — zie normalizeDocs().
type LegacyFooterDocs = {
  algemene_voorwaarden: string;
  klachtenprocedure: string;
};

const LEGACY_DOC_LABELS: { key: keyof LegacyFooterDocs; label: string }[] = [
  { key: "algemene_voorwaarden", label: "Algemene voorwaarden" },
  { key: "klachtenprocedure", label: "Klachtenprocedure" },
];

const LEGACY_DOC_HREFS: LegacyFooterDocs = {
  algemene_voorwaarden: `${MEDIA}/2025/05/Algemene-voorwaarden-r2u.pdf`,
  klachtenprocedure: `${MEDIA}/2025/05/Klachtenprocedure-r2u.pdf`,
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
