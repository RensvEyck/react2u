/**
 * Serialiseert structured data veilig voor een inline `<script>`-tag.
 *
 * `JSON.stringify` alleen is niet genoeg. Het escapet `<` niet, dus een
 * redacteur die `</script><script>…` in een vacaturetitel, artikeltekst of
 * FAQ-antwoord zet, breekt uit de scripttag en krijgt zijn eigen JavaScript op
 * de publieke site. React beschermt hier niet: binnen `dangerouslySetInnerHTML`
 * gaat de string ongewijzigd naar de HTML.
 *
 * Dat is geen theoretisch risico zodra er een tweede gebruiker is: een
 * redacteur heeft `vacatures` maar niet `postvak`, en zou via zo'n script de
 * sollicitatieformulieren op diezelfde pagina kunnen meelezen — precies de
 * grens die het rollenmodel moet bewaken.
 *
 * U+2028 en U+2029 zijn geldig in JSON maar niet in JavaScript-broncode; die
 * moeten mee, anders levert de tag een syntaxisfout op.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

import type { Taal } from "./taal";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

/** `BreadcrumbList` voor een kruimelpad; "Home" komt er zelf voor (in het Engels: /en). */
export function breadcrumbLd(crumbs: { label: string; href: string }[], taal: Taal = "nl") {
  const items = [{ label: "Home", href: taal === "en" ? "/en" : "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE}${c.href === "/" ? "" : c.href}`,
    })),
  };
}
