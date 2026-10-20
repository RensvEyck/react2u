import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedVacancies } from "@/lib/content";
import { metOmschrijving, paginaTitel } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import { hreflangVoor } from "@/lib/taal";
import { VAKGEBIEDEN, vakgebiedOpSlug } from "@/lib/vakgebieden";
import { VakgebiedPagina } from "@/components/blocks/WerkenBij";

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return VAKGEBIEDEN.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = vakgebiedOpSlug(slug);
  if (!g) return {};
  const pad = `/vacatures/vakgebied/${slug}`;
  return {
    title: { absolute: paginaTitel(g.nl.titel) },
    ...metOmschrijving(g.nl.seo),
    alternates: { canonical: pad, languages: hreflangVoor(`/vacatures/vakgebied/${slug}`) ?? undefined },
    openGraph: await openGraphVoor({ pad }),
  };
}

export default async function VakgebiedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = vakgebiedOpSlug(slug);
  if (!g) notFound();
  const vacatures = await getPublishedVacancies();
  return <VakgebiedPagina g={g} vacatures={vacatures} taal="nl" />;
}
