export type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export const MAIN_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Diensten",
    href: "/diensten",
    children: [
      { label: "Verzuimbegeleiding WVP", href: "/verzuimbegeleiding-wvp" },
      { label: "Verzuimbegeleiding ERD/ZW", href: "/verzuimbegeleiding-erd-zw" },
      { label: "Preventie & Vitaliteit", href: "/preventie-en-vitaliteit" },
      { label: "Begeleiding & Coaching", href: "/begeleiding-en-coaching" },
      { label: "Trainingen & Workshops", href: "/trainingen-en-workshops" },
      { label: "Risicomanagement", href: "/risicomanagement" },
    ],
  },
  {
    label: "Werknemers",
    href: "/werknemers",
    children: [{ label: "Verzuimprotocol", href: "/verzuimprotocol" }],
  },
  { label: "Blog", href: "/blog" },
  { label: "Vacatures", href: "/vacatures" },
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Contact", href: "/contact" },
];

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
