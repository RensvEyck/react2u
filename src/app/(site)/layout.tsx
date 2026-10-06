import type { Metadata } from "next";
import SiteShell from "@/components/site/SiteShell";
import { getSetting } from "@/lib/content";
import { normalizeSeoSettings } from "@/lib/seo";

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

// De deelafbeelding als een pagina geen eigen og:image heeft en er in de
// instellingen geen is gekozen: uit de eigen beeldserie, 1200×630 (de maat die
// LinkedIn, WhatsApp en X verwachten). Vroeger het logo uit de oude
// WordPress-map op Supabase.
const OG_FALLBACK = {
  url: "/beeld/og/react2u-samen-aan-tafel.jpg",
  width: 1200,
  height: 630,
  alt: "Vier collega’s lachen samen aan een ronde tafel",
};

// Zonder deze defaults tonen LinkedIn, WhatsApp en X een kale link zonder
// titel of afbeelding. Pagina's die hun eigen openGraph zetten winnen hiervan.
export async function generateMetadata(): Promise<Metadata> {
  const seo = normalizeSeoSettings(await getSetting<unknown>("seo"));
  const image = seo.share_image || OG_FALLBACK;
  return {
    description: seo.description,
    // Bewust géén title/description in openGraph en twitter: laat Next die
    // afleiden uit de titel en omschrijving van de pagina zelf. Zetten we ze
    // hier hard, dan krijgt élke pagina "React2u" als deeltitel.
    openGraph: {
      type: "website",
      siteName: "React2u",
      locale: "nl_NL",
      url: SITE,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
