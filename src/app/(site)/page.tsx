import type { Metadata } from "next";
import { getPage, getPublishedPosts, getSetting } from "@/lib/content";
import BlockRenderer, { needsKeurmerken, needsPosts } from "@/components/blocks/BlockRenderer";
import { normalizeCertificates } from "@/lib/nav";
import { jsonLd } from "@/lib/jsonld";
import { organisatieGraphLd } from "@/lib/organisatie";
import { concept } from "@/lib/concept";
import { HOME_TITEL, metOmschrijving, omschrijving } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import { hreflangVoor } from "@/lib/taal";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const res = await getPage("home");
  // Zonder eigen SEO-titel een titel die zegt wat React2u is, niet "Home".
  const title = res?.page.seo_title || HOME_TITEL;
  return {
    title: { absolute: title },
    // Zonder eigen omschrijving erft de homepage de site-brede standaardtekst
    // uit (site)/layout.tsx; zie (site)/[slug]/page.tsx.
    ...metOmschrijving(omschrijving(res?.page.seo_description)),
    // Met hreflang naar /en zodra het startscherm er in het Engels is (lib/taal.ts).
    alternates: { canonical: "/", languages: hreflangVoor("/") ?? undefined },
    openGraph: await openGraphVoor({ pad: "/", afbeelding: res?.page.og_image }),
  };
}

export default async function HomePage() {
  const blocks = concept("home")?.blocks ?? (await getPage("home"))?.blocks;
  if (!blocks) return <div className="container-site py-20">Content wordt nog ingericht.</div>;
  const [posts, certificaten] = await Promise.all([
    needsPosts(blocks) ? getPublishedPosts() : [],
    // De certificaten uit de instellingen, alleen voor pagina's met keurmerken (lib/keurmerken.ts).
    needsKeurmerken(blocks) ? getSetting<unknown>("certificates").then(normalizeCertificates) : undefined,
  ]);
  return (
    <>
      <BlockRenderer blocks={blocks} ctx={{ posts, certificaten }} />
      {/* De organisatie en de website als één geheel (lib/organisatie.ts);
          artikelen en vacatures verwijzen met hetzelfde @id hiernaar. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organisatieGraphLd()) }} />
    </>
  );
}
