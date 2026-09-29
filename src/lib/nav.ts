import type { Kleur } from "./brand";

/* ---------- Oplossingen: drie pijlers, zes diensten ---------- */

export type Dienst = { label: string; href: string; description: string; kleur: Kleur };
/** `icon` is een naam uit src/components/site/Icon.tsx. */
export type Pijler = { key: string; title: string; text: string; kleur: Kleur; icon: string; diensten: Dienst[] };

/**
 * De zes diensten, gegroepeerd van voorkomen naar herstellen. Voedt het
 * megamenu, de footer en de standaardinhoud van het blok "Pijlers".
 *
 * Elke dienst houdt zijn eigen kleur uit het logo (zie brand.ts); de pijler
 * neemt de kleur van zijn eerste dienst.
 */
export const PIJLERS: Pijler[] = [
  {
    key: "preventie",
    title: "Preventie",
    text: "Gezonde medewerkers vallen minder snel uit. We signaleren vroeg en pakken risico's aan voordat ze verzuim worden.",
    kleur: "blauw",
    icon: "shield",
    diensten: [
      {
        label: "Preventie & Vitaliteit",
        href: "/preventie-en-vitaliteit",
        description: "Preventief medisch onderzoek, consulten en tevredenheidsonderzoek.",
        kleur: "blauw",
      },
      {
        label: "Risicomanagement (RI&E)",
        href: "/risicomanagement",
        description: "Samen met kerndeskundigen de risico's in je organisatie in kaart.",
        kleur: "indigo",
      },
    ],
  },
  {
    key: "verzuim",
    title: "Verzuim",
    text: "Valt er toch iemand uit? Dan begeleiden we je medewerker doelgericht terug naar werk, met een vaste casemanager en duidelijke stappen.",
    kleur: "rood",
    icon: "route",
    diensten: [
      {
        label: "Verzuimbegeleiding WVP",
        href: "/verzuimbegeleiding-wvp",
        description: "Het volledige poortwachtertraject, van ziekmelding tot WIA-aanvraag.",
        kleur: "rood",
      },
      {
        label: "Verzuimbegeleiding ERD/ZW",
        href: "/verzuimbegeleiding-erd-zw",
        description: "Voor eigenrisicodragers Ziektewet, ook in de flexbranche.",
        kleur: "oranje",
      },
    ],
  },
  {
    key: "ontwikkeling",
    title: "Ontwikkeling",
    text: "Soms is er meer nodig dan een plan van aanpak. Met coaching en training brengen we mensen en teams weer in beweging.",
    kleur: "roze",
    icon: "leaf",
    diensten: [
      {
        label: "Begeleiding & Coaching",
        href: "/begeleiding-en-coaching",
        description: "Eén-op-één, burn-out- en loopbaancoaching op maat.",
        kleur: "roze",
      },
      {
        label: "Trainingen & Workshops",
        href: "/trainingen-en-workshops",
        description: "Verzuim-, management- en communicatietrainingen voor je team.",
        kleur: "teal",
      },
    ],
  },
];

/* ---------- Hoofdmenu ---------- */

export type NavLink = { label: string; href: string };
/**
 * Een menu-item is een gewone link, een uitklapmenu (`children`) of het
 * megamenu met de pijlers (`mega`). Het megamenu leest zijn inhoud uit PIJLERS.
 */
export type NavItem = NavLink & { children?: NavLink[]; mega?: true };

export const MAIN_NAV: NavItem[] = [
  { label: "Oplossingen", href: "/diensten", mega: true },
  {
    label: "Werknemers",
    href: "/werknemers",
    children: [
      { label: "Voor werknemers", href: "/werknemers" },
      { label: "Verzuimprotocol", href: "/verzuimprotocol" },
    ],
  },
  {
    label: "Over ons",
    href: "/over-react2u",
    children: [
      { label: "Over React2u", href: "/over-react2u" },
      { label: "Werken bij React2u", href: "/vacatures" },
    ],
  },
  { label: "Inzichten", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

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
 * Een dienst hangt onder Oplossingen, een pagina uit een uitklapmenu onder zijn
 * menu-item; de rest staat direct onder Home.
 */
export function crumbsVoor(path: string, title: string): NavLink[] {
  if (dienstVoor(path)) return [{ label: "Oplossingen", href: "/diensten" }, { label: title, href: path }];
  const ouder = MAIN_NAV.find((i) => i.href !== path && i.children?.some((c) => c.href === path));
  if (ouder) return [{ label: ouder.label, href: ouder.href }, { label: title, href: path }];
  return [{ label: title, href: path }];
}

/** De knop rechts in de header, zoals Acture's "Adviesgesprek". */
export const HEADER_CTA: NavLink = { label: "Adviesgesprek", href: "/contact" };

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
