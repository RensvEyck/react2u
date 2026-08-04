import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, getPublishedPages } from "@/lib/content";
import BlockRenderer from "@/components/blocks/BlockRenderer";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  return pages.filter((p) => p.slug !== "home").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPage(slug);
  if (!res) return {};
  return {
    title: { absolute: res.page.seo_title || `${res.page.title} • React2u` },
    description: res.page.seo_description || undefined,
    openGraph: res.page.og_image ? { images: [res.page.og_image] } : undefined,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await getPage(slug);
  if (!res) notFound();
  return <BlockRenderer blocks={res.blocks} />;
}
