import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

/**
 * Wat voor élke route geldt, in elk van de drie root layouts (zie RootHtml).
 * De omschrijving en de deelafbeelding zijn instelbaar en staan in de
 * sitelayouts, die toch al instellingen ophalen; zo blijft het adminpaneel vrij
 * van die query. De favicon komt uit app/favicon.ico, icon.png en
 * apple-icon.png (Next zet de <link>-tags zelf).
 */
export const BASIS_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "React2u", template: "%s • React2u" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};
