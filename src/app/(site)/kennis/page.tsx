import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/content";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import KennisHub from "@/components/kennis/KennisHub";

export const revalidate = 86400;

/**
 * De kennisbank: de gidsen, hulpmiddelen en artikelen op één plek (lib/kennis.ts).
 * Sinds november 2026 in plaats van /blog, dat met een 301 hierheen gaat.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "Kennisbank verzuim: gidsen en hulpmiddelen • React2u" },
    description: "Gidsen die één vraag over verzuim volledig beantwoorden, hulpmiddelen voor het poortwachterdossier en artikelen uit de praktijk. Voor werkgevers, zonder jargon.",
    alternates: { canonical: "/kennis" },
    openGraph: await openGraphVoor({ pad: "/kennis" }),
  };
}

export default async function KennisPagina() {
  const posts = await getPublishedPosts();
  return (
    <>
      <KennisHub posts={posts} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd([{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }])) }} />
    </>
  );
}
