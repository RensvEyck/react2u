import type { Certificate } from "./nav";
import type { Woordenboek } from "./woordenboek";

/**
 * De keurmerken van React2u, zoals de site ze laat zien.
 *
 * Welke keurmerken er staan, bepaalt Instellingen → Certificaten
 * (`site_settings.certificates`, gelezen via `normalizeCertificates()` in
 * nav.ts). Dat is de enige bron: haal je daar een certificaat weg, dan
 * verdwijnt het overal (de voet van elke pagina, Waarom React2u op de
 * dienstpagina's, Over React2u, Certificeringen, de offerte- en brochurepagina
 * en de onboarding). Tot november 2026 stonden de vijf logo's vast in de code
 * en was de instelling alleen de doorklik erachter; weghalen deed toen niets
 * (Rens, 20 nov 2026: "ik haal de certificaten weg via de website en het
 * blijft staan op de website").
 *
 * Wat hier wél in de code staat, zijn de logo's en teksten van de keurmerken
 * die de site kent (`BEKENDE_KEURMERKEN`). Een certificaat uit Instellingen
 * dat daarop lijkt, aan zijn omschrijving of aan de bestandsnaam van de PDF,
 * krijgt dat logo en die teksten, in de taal van de pagina. Een onbekend
 * certificaat toont zijn eigen logo uit Instellingen, of anders zijn
 * omschrijving als tekst.
 */

export type BekendKeurmerk = {
  /** Het logo in public/beeld/keurmerken. */
  src: string;
  alt: string;
  /** Korte naam op een tegel met tekst. */
  naam: string;
  /** Waar het keurmerk voor staat. */
  wat: string;
  /** Waaraan de site het certificaat uit Instellingen herkent (omschrijving of bestandsnaam). */
  zoek: RegExp;
};

/** De keurmerken waarvan de site een eigen logo heeft, in de volgorde van het ontwerp. */
export const BEKENDE_KEURMERKEN: readonly BekendKeurmerk[] = [
  {
    src: "/beeld/keurmerken/sbca.jpg", alt: "SBCA gecertificeerde arbodienst", naam: "SBCA", wat: "Gecertificeerde arbodienst",
    zoek: /sbca|managementsysteem|certificatieschema|gecertificeerde arbodienst|certified occupational health/i,
  },
  { src: "/beeld/keurmerken/iso9001.png", alt: "DNV ISO 9001 certificaat", naam: "ISO 9001", wat: "Kwaliteitsmanagement", zoek: /9001/ },
  { src: "/beeld/keurmerken/iso27001.png", alt: "DNV ISO 27001 certificaat", naam: "ISO 27001", wat: "Informatiebeveiliging", zoek: /27001/ },
  { src: "/beeld/keurmerken/iso27701.png", alt: "DNV ISO 27701 certificaat", naam: "ISO 27701", wat: "Privacy", zoek: /27701/ },
  { src: "/beeld/keurmerken/oval.png", alt: "Lid van OVAL", naam: "OVAL", wat: "Branchevereniging", zoek: /\boval\b/i },
];

/** Een keurmerk zoals een tegel op de site hem toont. */
export type Keurmerk = {
  /** Het logo; leeg als er geen toonbaar beeld is, dan toont de site de naam. */
  src: string;
  alt: string;
  /** De doorklik naar het certificaat zelf (meestal een PDF), of leeg. */
  href: string;
  /** Korte naam voor een tegel met tekst: "ISO 9001", of de omschrijving uit Instellingen. */
  naam: string;
  /** Waar het keurmerk voor staat ("Kwaliteitsmanagement"); leeg bij een onbekend certificaat. */
  wat: string;
  /** Plek in BEKENDE_KEURMERKEN, voor de vertaalde teksten; -1 voor een onbekend certificaat. */
  bekend: number;
};

/** De bestandsnaam van een URL, zonder het tijdstempel dat de mediabibliotheek ervoor zet. */
function bestandsnaam(url: string): string {
  const laatste = url.split(/[?#]/)[0].split("/").pop() ?? "";
  let naam = laatste;
  try {
    naam = decodeURIComponent(laatste);
  } catch {
    // geen geldige codering: dan de naam zoals hij is
  }
  return naam.replace(/^\d+-/, "");
}

/** Welk bekend keurmerk een tekst noemt; -1 als geen enkele past. */
export function herkenKeurmerk(tekst: string): number {
  return BEKENDE_KEURMERKEN.findIndex((k) => k.zoek.test(tekst));
}

/**
 * Welk bekend keurmerk een certificaat uit Instellingen is: eerst aan de
 * omschrijving, dan aan de bestandsnaam van de link en van het logo. Niet aan
 * de hele URL: het tijdstempel dat de mediabibliotheek voor een bestandsnaam
 * zet (1790010000000-…) bevat zomaar "9001".
 */
export function herkenCertificaat(c: Certificate): number {
  for (const tekst of [c.alt, bestandsnaam(c.href), bestandsnaam(c.image)]) {
    const i = tekst ? herkenKeurmerk(tekst) : -1;
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * De keurmerken die de site toont voor de certificaten uit Instellingen, in
 * die volgorde. Een eigen logo uit Instellingen wint van het logo van de site.
 */
export function keurmerkenVoor(certificaten: Certificate[]): Keurmerk[] {
  return certificaten.map((c) => {
    const i = herkenCertificaat(c);
    const b = i >= 0 ? BEKENDE_KEURMERKEN[i] : null;
    return {
      src: c.image || b?.src || "",
      alt: b?.alt || c.alt,
      href: c.href,
      naam: b?.naam || c.alt,
      wat: b?.wat || "",
      bekend: i,
    };
  });
}

/** Alle bekende keurmerken zonder doorklik: voor het voorbeeld in de blokeditor, dat de instellingen niet kan lezen. */
export function alleKeurmerken(): Keurmerk[] {
  return BEKENDE_KEURMERKEN.map((b, i) => ({ src: b.src, alt: b.alt, href: "", naam: b.naam, wat: b.wat, bekend: i }));
}

/**
 * Wat een blok toont: de keurmerken uit Instellingen die de pagina meegeeft
 * (`ctx.certificaten`), of alle bekende als de pagina ze niet meegeeft. Dat
 * laatste is de blokeditor: die draait in de browser en haalt niets op. Een
 * lege lijst is wél een antwoord: dan staat er geen enkel keurmerk.
 */
export function keurmerkenUit(certificaten: Certificate[] | undefined): Keurmerk[] {
  return certificaten ? keurmerkenVoor(certificaten) : alleKeurmerken();
}

/** De teksten van een keurmerk in de taal van de pagina: voor een bekend keurmerk uit het woordenboek, anders uit Instellingen. */
export function keurmerkTekst(k: Keurmerk, t: Woordenboek): { alt: string; naam: string; wat: string } {
  if (k.bekend < 0) return { alt: k.alt, naam: k.naam, wat: k.wat };
  const g = t.gedeeld.keurmerken[k.bekend];
  return { alt: t.footer.keurmerkAlts[k.bekend] || k.alt, naam: g?.naam || k.naam, wat: g?.wat || k.wat };
}

/**
 * Het keurmerk uit de lijst dat bij een titel hoort, zoals "ISO 9001:
 * kwaliteitsmanagement" op de pagina Certificeringen. Staat het keurmerk niet
 * (meer) in Instellingen, dan niets: de tekst op die pagina blijft, het logo niet.
 */
export function keurmerkBij(titel: string, lijst: Keurmerk[]): Keurmerk | undefined {
  const i = herkenKeurmerk(titel);
  if (i >= 0) return lijst.find((k) => k.bekend === i);
  const t = titel.toLowerCase();
  return lijst.find((k) => k.bekend < 0 && k.naam && t.includes(k.naam.toLowerCase()));
}
