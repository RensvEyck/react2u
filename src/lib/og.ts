import type { Metadata } from "next";
import { cache } from "react";
import { getSetting } from "./content";
import { normalizeSeoSettings, type SeoSettings } from "./seo";
import type { Taal } from "./taal";

/**
 * Deelmetadata (Open Graph) per pagina.
 *
 * De sitelayouts zetten de standaard: type, siteName, locale en de
 * deelafbeelding uit de instellingen. Maar `og:url` hoort per pagina te
 * verschillen, en Next voegt metadata shallow samen: zet een pagina
 * `openGraph`, dan vervangt dat het hele object van de layout. Zonder eigen
 * openGraph erfde elke pagina `og:url` van de homepage (/werkgevers meldde
 * https://react2u.nl, de Engelse pagina's /en). Daarom levert openGraphVoor()
 * het complete object: eigen url, de standaardafbeelding als de pagina er geen
 * heeft, en de rest zoals de layout. Titel en omschrijving laten we bewust
 * weg: Next vult die uit de titel en omschrijving van de pagina zelf.
 */

// De deelafbeelding als een pagina geen eigen og:image heeft en er in de
// instellingen geen is gekozen: uit de eigen beeldserie, 1200×630 (de maat die
// LinkedIn, WhatsApp en X verwachten). Vroeger het logo uit de oude
// WordPress-map op Supabase.
export const OG_FALLBACK = {
  url: "/beeld/og/react2u-samen-aan-tafel.jpg",
  width: 1200,
  height: 630,
  alt: "Vier collega’s lachen samen aan een ronde tafel",
};

const OG_FALLBACK_EN = { ...OG_FALLBACK, alt: "Four colleagues laughing together at a round table" };

/** De SEO-instellingen, één keer per aanvraag: layout en pagina vragen ze allebei. */
export const seoInstellingen = cache(async (): Promise<SeoSettings> => normalizeSeoSettings(await getSetting<unknown>("seo")));

type Afbeelding = string | typeof OG_FALLBACK;

/** De deelafbeelding uit de instellingen, anders de standaard in de taal van de pagina. */
export async function deelAfbeelding(taal: Taal = "nl"): Promise<Afbeelding> {
  const seo = await seoInstellingen();
  return seo.share_image || (taal === "en" ? OG_FALLBACK_EN : OG_FALLBACK);
}

const LOCALE: Record<Taal, string> = { nl: "nl_NL", en: "en_GB" };

/**
 * Het Open Graph-object voor een pagina op `pad` (relatief; metadataBase
 * maakt het absoluut). Met `afbeelding` de eigen og:image van de pagina,
 * anders de standaard.
 */
export async function openGraphVoor(opties: {
  pad: string;
  taal?: Taal;
  afbeelding?: string | null;
}): Promise<NonNullable<Metadata["openGraph"]>> {
  const taal = opties.taal ?? "nl";
  return {
    type: "website",
    siteName: "React2u",
    locale: LOCALE[taal],
    ...(taal === "en" ? { alternateLocale: ["nl_NL"] } : {}),
    url: opties.pad,
    images: [opties.afbeelding || (await deelAfbeelding(taal))],
  };
}
