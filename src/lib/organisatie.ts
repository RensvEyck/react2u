import { LINKEDIN_URL, LOGO_SVG_URL, type Certificate } from "./nav";
import { BEKENDE_KEURMERKEN, keurmerkenVoor } from "./keurmerken";
import { pad, type Taal } from "./taal";

/*
 * React2u als één knoop in de structured data. Tot november 2026 stond er
 * alleen een LocalBusiness op de homepage zonder vast @id, en noemden de
 * blogartikelen (publisher) en vacatures (hiringOrganization) "React2u" elk
 * als een losse Organization. Nu heeft de organisatie één adres
 * (`https://react2u.nl/#organisatie`) en verwijzen de andere pagina's daarnaar;
 * zo ziet Google één bedrijf met één logo, adres en KvK-nummer (HALO-scan).
 * Sinds de tweede HALO-scan (november 2026) staan de keurmerken uit
 * Instellingen erbij (`hasCredential`, OVAL als `memberOf`) en heeft elke
 * dienstpagina een `Service` die naar deze organisatie wijst (`serviceLd`).
 * Zie CONTEXT.md, *SEO*.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

export const ORGANISATIE_ID = `${SITE}/#organisatie`;
export const WEBSITE_ID = `${SITE}/#website`;

/** Handelsregister en btw-nummer, zoals op de contactpagina en in de footer. */
export const KVK = "95076824";
export const BTW = "NL866991906B01";

/**
 * De keurmerken uit Instellingen → Certificaten (lib/keurmerken.ts) als
 * structured data: een certificaat wordt een `EducationalOccupationalCredential`
 * met de link naar het certificaat zelf, een lidmaatschap (OVAL) een `memberOf`.
 * Google en AI-zoekmachines kunnen de SBCA- en ISO-certificering dan
 * controleren in plaats van op de tekst te vertrouwen.
 */
function keurmerkenLd(certificaten: Certificate[] | undefined) {
  const alle = keurmerkenVoor(certificaten ?? []);
  const lid = alle.filter((k) => k.bekend >= 0 && BEKENDE_KEURMERKEN[k.bekend].naam === "OVAL");
  const certs = alle.filter((k) => !lid.includes(k));
  return {
    ...(certs.length
      ? {
          hasCredential: certs.map((k) => ({
            "@type": "EducationalOccupationalCredential",
            name: k.naam,
            credentialCategory: "certification",
            ...(k.wat ? { description: k.wat } : {}),
            ...(k.href ? { url: k.href } : {}),
          })),
        }
      : {}),
    ...(lid.length ? { memberOf: lid.map((k) => ({ "@type": "Organization", name: k.naam, ...(k.href ? { url: k.href } : {}) })) } : {}),
  };
}

/**
 * De organisatie zelf: Organization én LocalBusiness (het kantoor in Eindhoven
 * met adres en openingstijden). Hoort op de homepage, in beide talen. Met de
 * certificaten uit Instellingen erbij als die er zijn.
 */
export function organisatieLd(certificaten?: Certificate[]) {
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
    ...keurmerkenLd(certificaten),
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
export function organisatieGraphLd(certificaten?: Certificate[]) {
  return { "@context": "https://schema.org", "@graph": [organisatieLd(certificaten), webSiteLd()] };
}

/**
 * De zes diensten, met de naam waarop een werkgever zoekt. Dezelfde woorden
 * als de titel en de hoofdkop van de dienstpagina (src/content/<label>.json,
 * migratie 0059) en de linkteksten op de werkgebiedpagina's.
 */
export const DIENSTEN: Record<string, { naam: string; nl: string; en: string }> = {
  recover: { naam: "Recover", nl: "Verzuimbegeleiding voor werkgevers", en: "Sickness absence support for employers" },
  restart: { naam: "Restart", nl: "Re-integratie eerste en tweede spoor", en: "Reintegration, first and second track" },
  resist: { naam: "Resist", nl: "Preventie en preventiemedewerker", en: "Prevention and the prevention officer" },
  reward: { naam: "Reward", nl: "Salarisadministratie en verloning", en: "Payroll and salary administration" },
  reflex: { naam: "Reflex", nl: "Ziektewet en verzuim in de flexbranche", en: "Sickness Benefits Act and absence in the staffing sector" },
  ready: { naam: "Ready", nl: "HR-advies en arbeidsrecht", en: "HR advice and employment law" },
};

/**
 * De dienst van een dienstpagina als `Service`, met de organisatie van de
 * homepage als aanbieder. Null voor een pagina die geen dienst is.
 */
export function serviceLd(slug: string, taal: Taal) {
  const d = DIENSTEN[slug];
  if (!d) return null;
  const url = `${SITE}${pad(taal, slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: d[taal],
    alternateName: `React2u ${d.naam}`,
    serviceType: taal === "en" ? "Occupational health service" : "Arbodienstverlening",
    provider: { "@id": ORGANISATIE_ID },
    areaServed: { "@type": "Country", name: "Nederland" },
    url,
    inLanguage: taal,
  };
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
