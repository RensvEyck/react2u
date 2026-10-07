import type { Metadata } from "next";
import RootHtml from "@/components/site/RootHtml";
import SiteShell from "@/components/site/SiteShell";
import { BASIS_METADATA, SITE_URL } from "@/lib/metadata";
import { deelAfbeelding, seoInstellingen } from "@/lib/og";

export const revalidate = 300;

// Zonder deze defaults tonen LinkedIn, WhatsApp en X een kale link zonder
// titel of afbeelding. Elke pagina zet daarnaast zijn eigen openGraph met zijn
// eigen url (lib/og.ts); dit is de basis voor routes die dat niet doen.
export async function generateMetadata(): Promise<Metadata> {
  const [seo, image] = await Promise.all([seoInstellingen(), deelAfbeelding("nl")]);
  return {
    ...BASIS_METADATA,
    description: seo.description,
    // Bewust géén title/description in openGraph en twitter: laat Next die
    // afleiden uit de titel en omschrijving van de pagina zelf. Zetten we ze
    // hier hard, dan krijgt élke pagina "React2u" als deeltitel.
    openGraph: {
      type: "website",
      siteName: "React2u",
      locale: "nl_NL",
      url: SITE_URL,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}

/**
 * Root layout van de Nederlandse site (<html lang="nl">). De Engelse site
 * onder /en en het adminpaneel hebben hun eigen root layout; zie RootHtml.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootHtml taal="nl">
      <SiteShell taal="nl">{children}</SiteShell>
    </RootHtml>
  );
}
