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
  { label: "Vacatures", href: "/vacatures" },
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Contact", href: "/contact" },
];

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;

export const LOGO_URL = `${MEDIA}/2023/07/cropped-cropped-Logo_react2u.png`;
export const FAVICON_URL = `${MEDIA}/2023/05/cropped-favicon-react2u-32x32.png`;
export const LOGO_SVG_URL = `${MEDIA}/2023/05/Logo-kleur.svg`;

export type FooterDocs = {
  algemene_voorwaarden: string;
  klachtenprocedure: string;
  privacy_reglement: string;
};

export const FOOTER_DOCS_FALLBACK: FooterDocs = {
  algemene_voorwaarden: `${MEDIA}/2025/05/Algemene-voorwaarden-r2u.pdf`,
  klachtenprocedure: `${MEDIA}/2025/05/Klachtenprocedure-r2u.pdf`,
  privacy_reglement: `${MEDIA}/2025/05/Privacy-reglement-r2u.pdf`,
};

export const FOOTER_DOC_LABELS: { key: keyof FooterDocs; label: string }[] = [
  { key: "algemene_voorwaarden", label: "Algemene voorwaarden" },
  { key: "klachtenprocedure", label: "Klachtenprocedure" },
  { key: "privacy_reglement", label: "Privacy regelement" },
];
