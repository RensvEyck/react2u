import type { NextConfig } from "next";
import { DOCUMENT_REDIRECTS, WORDPRESS_REDIRECTS } from "./src/lib/redirects";

const SUPABASE = "https://tumwtappyegkjabtmold.supabase.co";

/**
 * Beveiligingsheaders.
 *
 * Bewust géén `script-src` met nonce: dat dwingt dynamische rendering af en
 * sloopt de ISR-cache waar de hele publieke site op draait (`revalidate = 300`).
 * De directives hieronder zijn allemaal statisch en breken niets.
 *
 * Dit is een vangnet, geen oplossing. De echte verdediging tegen XSS is dat
 * inhoud veilig geserialiseerd wordt — zie src/lib/jsonld.ts.
 */
const SECURITY_HEADERS = [
  // Voorkomt dat een geüpload bestand met een verkeerd content-type alsnog als
  // HTML of script wordt uitgevoerd.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: de site hoort nergens in een frame te staan.
  { key: "X-Frame-Options", value: "DENY" },
  // Lekt geen paden of querystrings naar externe sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // De site vraagt geen van deze rechten; expliciet dichtzetten scheelt een
  // aanvaller een opening als er ooit vreemde inhoud wordt ingevoegd.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is hier onvermijdelijk. Next zet de hydratatiedata in
      // inline scripts (self.__next_f.push), en zonder deze regel valt
      // script-src terug op default-src 'self' — dan blokkeert de browser die
      // scripts en werkt er niets meer: geen menu, geen formulieren, geen
      // inloggen. Precies dat is hier één keer misgegaan.
      //
      // Het alternatief, een nonce per verzoek, dwingt dynamische rendering af
      // en sloopt de ISR-cache waar de publieke site op draait. Die ruil is het
      // niet waard: de echte verdediging tegen XSS is dat inhoud veilig
      // geserialiseerd wordt (src/lib/jsonld.ts). Wat deze CSP wél afdekt staat
      // hieronder — exfiltratie naar vreemde domeinen, gekaapte formulieren,
      // clickjacking en base-tag-injectie.
      "script-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${SUPABASE}`,
      `connect-src 'self' ${SUPABASE} https://*.supabase.co`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // Formulieren mogen alleen naar de eigen site posten.
      "form-action 'self'",
      // Geen <base>-injectie die relatieve URL's kan omleiden.
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/**
 * www → het kale domein. Beide hangen in Vercel aan dit project; zonder deze
 * regel staat de hele site op twee adressen. De canonicals wijzen al naar
 * react2u.nl, maar een redirect is het sterkere signaal voor Google — en een
 * inlogsessie geldt per adres, dus wie via www binnenkomt, is in de admin op
 * react2u.nl niet ingelogd (en andersom).
 */
const WWW_REDIRECT = {
  source: "/:path*",
  has: [{ type: "host" as const, value: "www.react2u.nl" }],
  destination: "https://react2u.nl/:path*",
  permanent: true,
};

const nextConfig: NextConfig = {
  // De vaste lijst van de oude WordPress-site staat in src/lib/redirects.ts,
  // zodat de admin kan tonen welke paden al vergeven zijn. Doorverwijzingen die
  // later in de admin worden toegevoegd past de middleware toe — die komt pas
  // ná deze lijst aan de beurt, dus deze wint altijd.
  async redirects() {
    return [
      WWW_REDIRECT,
      ...WORDPRESS_REDIRECTS.map((r) => ({ ...r, permanent: true })),
      // De juridische documenten: een klassieke 301 naar de PDF.
      ...DOCUMENT_REDIRECTS.map((r) => ({ ...r, statusCode: 301 })),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
