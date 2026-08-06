import type { NextConfig } from "next";

const MEDIA = "https://tumwtappyegkjabtmold.supabase.co/storage/v1/object/public/media/wp/2025/05";

/**
 * Redirects van de oude WordPress-site.
 *
 * Deze URL's staan in Google en verdwijnen zodra de DNS naar Vercel wijst.
 * Zonder redirect wordt elk van deze adressen een 404 en verliest de pagina
 * zijn positie — en die komt niet vanzelf terug. Bron: de sitemap van de oude
 * site (wp-sitemap.xml), opgehaald toen die nog live was.
 *
 * Alle redirects zijn permanent (308). Dat vertelt Google de waarde door te
 * geven aan het nieuwe adres; een tijdelijke redirect doet dat niet.
 *
 * Volgorde telt: specifieke paden staan vóór de patronen die ze zouden
 * opslokken.
 */
const OLD_SITE_REDIRECTS = [
  // Oude structuur met /werkgever en /werknemer ervoor
  { source: "/werkgever/diensten/arbodienstverlening", destination: "/diensten" },
  { source: "/werkgever/diensten/verzuimbegeleiding", destination: "/verzuimbegeleiding-wvp" },
  { source: "/werkgever/diensten/ziektewetuitvoering", destination: "/verzuimbegeleiding-erd-zw" },
  { source: "/werkgever/diensten", destination: "/diensten" },
  { source: "/werkgever/over-ons", destination: "/over-react2u" },
  { source: "/werkgever/contact", destination: "/contact" },
  { source: "/werkgever/faq-werkgever", destination: "/diensten" },
  { source: "/werknemer/faq-werknemer", destination: "/werknemers" },
  { source: "/werknemer/contact", destination: "/contact" },
  { source: "/werknemer", destination: "/werknemers" },
  { source: "/werkgever", destination: "/diensten" },

  // Adviseurssectie, bestaat niet meer als aparte ingang
  { source: "/adviseurs/arbodienstverlening", destination: "/diensten" },
  { source: "/adviseurs/ziektewet-uitvoering", destination: "/verzuimbegeleiding-erd-zw" },
  { source: "/adviseurs/ziekteverzuimbegeleiding", destination: "/verzuimbegeleiding-wvp" },
  { source: "/adviseurs", destination: "/diensten" },

  // Losse oude paden
  { source: "/xdiensten", destination: "/diensten" },
  { source: "/xbegeleidingx-xcoachingx", destination: "/begeleiding-en-coaching" },

  // Documenten waren aparte pagina's, nu PDF's in de footer
  { source: "/privacy-reglement", destination: `${MEDIA}/Privacy-reglement-r2u.pdf` },
  { source: "/klachtenprocedure", destination: `${MEDIA}/Klachtenprocedure-r2u.pdf` },
  { source: "/algemene-voorwaarden", destination: `${MEDIA}/Algemene-voorwaarden-r2u.pdf` },

  // Restanten van het WordPress-thema: Engelstalige demo-artikelen, teamleden
  // met plaatshouder-namen, categorieën en auteursarchieven. Geen echte
  // inhoud, maar een 404 is een 404 — die vangen we af op de dichtstbijzijnde
  // pagina die wél bestaat.
  { source: "/team/:slug*", destination: "/over-react2u" },
  { source: "/category/:slug*", destination: "/blog" },
  { source: "/author/:slug*", destination: "/" },
  { source: "/the-importance-of-self-care-for-coaches-strategies-for-success", destination: "/blog" },
  { source: "/coaching-for-leadership-building-stronger-teams-and-organizations", destination: "/blog" },
  { source: "/the-role-of-business-coach-education-training-experience", destination: "/blog" },
  { source: "/the-power-of-mindset-helping-clients-achieve-their-goals", destination: "/blog" },
  { source: "/mastering-communication-skills-key-to-effective-coaching", destination: "/blog" },
  { source: "/building-trust-with-business-coaching-clients", destination: "/blog" },
  { source: "/effective-goal-setting-for-business-coaching-clients", destination: "/blog" },
  { source: "/managing-difficult-business-coaching-clients", destination: "/blog" },

  // WordPress-restanten die crawlers nog jaren blijven proberen
  { source: "/wp-content/:path*", destination: "/" },
  { source: "/wp-includes/:path*", destination: "/" },
  { source: "/feed", destination: "/blog" },
  { source: "/comments/feed", destination: "/blog" },
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_SITE_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
};

export default nextConfig;
