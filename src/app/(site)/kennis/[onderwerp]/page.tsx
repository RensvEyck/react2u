import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPosts } from "@/lib/content";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import { ONDERWERPEN, onderwerpVoor } from "@/lib/kennis";
import OnderwerpPagina from "@/components/kennis/OnderwerpPagina";

export const revalidate = 86400;
export const dynamicParams = false;

/** Een onderwerp van de kennisbank: /kennis/verzuim, /kennis/re-integratie, /kennis/preventie, /kennis/wet-en-regels. */
export function generateStaticParams() {
  return ONDERWERPEN.map((o) => ({ onderwerp: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ onderwerp: string }> }): Promise<Metadata> {
  const o = onderwerpVoor((await params).onderwerp);
  if (!o) return {};
  return {
    title: { absolute: o.seo_title },
    description: o.seo_description,
    alternates: { canonical: `/kennis/${o.slug}` },
    openGraph: await openGraphVoor({ pad: `/kennis/${o.slug}` }),
  };
}

export default async function Pagina({ params }: { params: Promise<{ onderwerp: string }> }) {
  const o = onderwerpVoor((await params).onderwerp);
  if (!o) notFound();
  const posts = await getPublishedPosts();
  const crumbs = [{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: o.naam, href: `/kennis/${o.slug}` }];
  return (
    <>
      <OnderwerpPagina onderwerp={o} posts={posts} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
