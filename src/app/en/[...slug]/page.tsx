import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { alleConceptSlugsEn, conceptEn } from "@/lib/concept";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { crumbsVoor } from "@/lib/nav";
import { kort } from "@/lib/seo";
import { hreflangVoor } from "@/lib/taal";

/**
 * Een Engelse pagina onder /en, uit src/content/en/. De slug mag genest zijn
 * (services/recover), daarom een catch-all; een onbekend adres onder /en komt
 * zo ook hier uit en wordt de Engelse 404 (en/not-found.tsx).
 */
export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return alleConceptSlugsEn().map((s) => ({ slug: s.split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const pad = slug.join("/");
  const c = conceptEn(pad);
  if (!c) return {};
  return {
    title: { absolute: c.seo_title || `${c.title} • React2u` },
    description: kort(c.seo_description),
    alternates: { canonical: `/en/${pad}`, languages: hreflangVoor(`/en/${pad}`) ?? undefined },
  };
}

export default async function EnglishPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const pad = slug.join("/");
  const c = conceptEn(pad);
  if (!c) notFound();
  const path = `/en/${pad}`;
  const crumbs = crumbsVoor(path, c.title, "en");
  return (
    <>
      <BlockRenderer blocks={c.blocks} ctx={{ crumbs, lang: "en" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, "en")) }} />
    </>
  );
}
