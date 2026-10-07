import type { NextConfig } from "next";
import { DIENST_REDIRECTS, DOCUMENT_REDIRECTS, WORDPRESS_REDIRECTS, metSlash } from "./src/lib/redirects";

// Uit de omgeving, zodat een lokale stack (`supabase start`) ook door de CSP
// komt; op Vercel is dat de vaste project-URL. Als origin geparst, zodat een
// spatie, regeleinde of pad in de variabele de header niet kapotmaakt (een
// ongeldige CSP-header raakt elke pagina).
function supabaseOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "https://tumwtappyegkjabtmold.supabase.co";
  }
}
const SUPABASE = supabaseOrigin();

// Cloudflare Turnstile (spamcontrole op de formulieren) is optioneel; alleen
// als de site-sleutel gezet is, mag het widget laden. Zie src/lib/turnstile.ts.
const TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? "https://challenges.cloudflare.com" : "";

// `next dev` draait zijn eigen runtime met eval() (source maps, hot reload);
// de CSP hieronder blokkeerde dat, waardoor lokaal niets interactief werkte.
// Alleen in ontwikkeling; een productiebuild heeft geen eval nodig.
const DEV_EVAL = process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "";

const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };

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
      `script-src 'self' 'unsafe-inline' ${DEV_EVAL} ${TURNSTILE}`.replace(/\s+/g, " ").trim(),
      `img-src 'self' data: blob: ${SUPABASE}`,
      `connect-src 'self' ${SUPABASE} https://*.supabase.co`,
      // Het Turnstile-widget is een iframe; zonder frame-src valt dat terug op
      // default-src 'self' en wordt het geblokkeerd.
      ...(TURNSTILE ? [`frame-src ${TURNSTILE}`] : []),
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
  source: metSlash("/:path*"),
  has: [{ type: "host" as const, value: "www.react2u.nl" }],
  destination: "https://react2u.nl/:path*",
  permanent: true,
};

const nextConfig: NextConfig = {
  images: {
    // Next 16 staat alleen kwaliteiten uit deze lijst toe. 75 is de standaard;
    // 85 is voor de foto's (Beeld): de AI-serie heeft fijne details en werd bij
    // 75 na de her-encodering van de optimizer zichtbaar zacht.
    qualities: [75, 85],
  },
  // Next's eigen 308 van `/pad/` naar `/pad` liep vóór de lijst hieronder, en
  // maakte van elke oude URL met schuine streep een keten van twee stappen.
  // Nu accepteert elke vaste regel de streep zelf (metSlash) en haalt de
  // middleware hem voor alle andere adressen af; zie src/middleware.ts.
  skipTrailingSlashRedirect: true,
  // De vaste lijst van de oude WordPress-site staat in src/lib/redirects.ts,
  // zodat de admin kan tonen welke paden al vergeven zijn. Doorverwijzingen die
  // later in de admin worden toegevoegd past de middleware toe — die komt pas
  // ná deze lijst aan de beurt, dus deze wint altijd.
  async redirects() {
    return [
      WWW_REDIRECT,
      ...WORDPRESS_REDIRECTS.map((r) => ({ ...r, source: metSlash(r.source), permanent: true })),
      // De juridische documenten: een klassieke 301 naar de PDF.
      ...DOCUMENT_REDIRECTS.map((r) => ({ ...r, source: metSlash(r.source), statusCode: 301 })),
      // De zes oude dienstpagina's: een 301 naar hun label.
      ...DIENST_REDIRECTS.map((r) => ({ ...r, source: metSlash(r.source), statusCode: 301 })),
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Alleen react2u.nl hoort in Google. Het Vercel-adres van productie
      // (react2u.vercel.app) en elke preview-deploy (*.vercel.app) serveren
      // dezelfde pagina's; zonder deze header kon Google ze als dubbele site
      // oppakken. Een preview sluit daarnaast zijn robots.txt (app/robots.ts).
      {
        source: "/:path*",
        has: [{ type: "host", value: ".*\\.vercel\\.app" }],
        headers: [NOINDEX],
      },
      // Het adminpaneel, inclusief de inlogpagina: nooit in Google. Dezelfde
      // regel staat als <meta> in app/admin/layout.tsx; robots.txt laat /admin
      // bewust open, anders ziet een crawler deze header nooit.
      { source: "/admin/:path*", headers: [NOINDEX] },
    ];
  },
};

export default nextConfig;
