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

export const FOOTER_DOCS = [
  {
    label: "Algemene voorwaarden",
    href: "https://react2u.nl/wp-content/uploads/2025/05/Algemene%20voorwaarden%20r2u.pdf",
  },
  {
    label: "Klachtenprocedure",
    href: "https://react2u.nl/wp-content/uploads/2025/05/Klachtenprocedure%20r2u.pdf",
  },
  {
    label: "Privacy regelement",
    href: "https://react2u.nl/wp-content/uploads/2025/05/Privacy%20reglement%20r2u.pdf",
  },
];

export const LOGO_URL = "https://react2u.nl/wp-content/uploads/2023/07/cropped-cropped-Logo_react2u.png";
