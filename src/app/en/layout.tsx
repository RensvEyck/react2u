import type { Metadata } from "next";
import RootHtml from "@/components/site/RootHtml";
import SiteShell from "@/components/site/SiteShell";
import { BASIS_METADATA, SITE_URL } from "@/lib/metadata";
import { deelAfbeelding } from "@/lib/og";
import { woordenboek } from "@/lib/woordenboek";

export const revalidate = 300;

/**
 * De Engelse site onder /en: dezelfde deelafbeelding als de Nederlandse, een
 * Engelse standaardomschrijving en og:locale en_GB. Elke pagina zet zijn eigen
 * openGraph met zijn eigen url (lib/og.ts).
 */
export async function generateMetadata(): Promise<Metadata> {
  const image = await deelAfbeelding("en");
  const t = woordenboek("en");
  return {
    ...BASIS_METADATA,
    description: t.seo.siteOmschrijving,
    openGraph: {
      type: "website",
      siteName: "React2u",
      locale: t.ogLocale,
      alternateLocale: ["nl_NL"],
      url: `${SITE_URL}/en`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}

/** Root layout van de Engelse site (<html lang="en">). */
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootHtml taal="en">
      <SiteShell taal="en">{children}</SiteShell>
    </RootHtml>
  );
}
