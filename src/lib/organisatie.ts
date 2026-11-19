import { LINKEDIN_URL, LOGO_SVG_URL } from "./nav";

/*
 * React2u als één knoop in de structured data. Tot november 2026 stond er
 * alleen een LocalBusiness op de homepage zonder vast @id, en noemden de
 * blogartikelen (publisher) en vacatures (hiringOrganization) "React2u" elk
 * als een losse Organization. Nu heeft de organisatie één adres
 * (`https://react2u.nl/#organisatie`) en verwijzen de andere pagina's daarnaar;
 * zo ziet Google één bedrijf met één logo, adres en KvK-nummer (HALO-scan).
 * Zie CONTEXT.md, *SEO*.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

export const ORGANISATIE_ID = `${SITE}/#organisatie`;
export const WEBSITE_ID = `${SITE}/#website`;

/** Handelsregister en btw-nummer, zoals op de contactpagina en in de footer. */
export const KVK = "95076824";
export const BTW = "NL866991906B01";

/**
 * De organisatie zelf: Organization én LocalBusiness (het kantoor in Eindhoven
 * met adres en openingstijden). Hoort op de homepage, in beide talen.
 */
export function organisatieLd() {
  return {
    "@type": ["Organization", "LocalBusiness"],
    "@id": ORGANISATIE_ID,
    name: "React2u",
    legalName: "React2u II B.V.",
    alternateName: "R2U",
    url: SITE,
    logo: LOGO_SVG_URL,
    image: LOGO_SVG_URL,
    telephone: "+31856205800",
    email: "info@react2u.nl",
    identifier: { "@type": "PropertyValue", propertyID: "KvK", value: KVK },
    vatID: BTW,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Stratumsedijk 29",
      postalCode: "5611 NB",
      addressLocality: "Eindhoven",
      addressCountry: "NL",
    },
    areaServed: { "@type": "Country", name: "Nederland" },
    sameAs: [LINKEDIN_URL],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
    ],
  };
}

/** De website, met de organisatie als uitgever. */
export function webSiteLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE,
    name: "React2u",
    inLanguage: ["nl", "en"],
    publisher: { "@id": ORGANISATIE_ID },
  };
}

/** Het geheel voor de homepage: organisatie en website in één @graph. */
export function organisatieGraphLd() {
  return { "@context": "https://schema.org", "@graph": [organisatieLd(), webSiteLd()] };
}

/**
 * De verwijzing vanaf een andere pagina (publisher van een artikel,
 * hiringOrganization van een vacature): hetzelfde @id, plus de velden die
 * Google op die plek verlangt (naam, logo), zodat de knoop ook los leesbaar is.
 */
export function organisatieRef() {
  return {
    "@type": "Organization",
    "@id": ORGANISATIE_ID,
    name: "React2u",
    url: SITE,
    logo: { "@type": "ImageObject", url: LOGO_SVG_URL },
  };
}
