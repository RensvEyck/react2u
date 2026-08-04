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
  const title = res.page.seo_title || `${res.page.title} • React2u`;
  return {
    title: { absolute: title },
    description: res.page.seo_description || undefined,
    alternates: { canonical: `/${slug}` },
    // Alleen meesturen als er echt een eigen afbeelding is. `openGraph: undefined`
    // is niet hetzelfde als weglaten: de sleutel bestaat dan, en overschrijft de
    // defaults uit (site)/layout.tsx — waardoor de pagina hélemaal geen og-tags
    // krijgt. Zetten we hem wel, dan vervangt hij het hele object, dus type,
    // siteName en locale moeten mee.
    ...(res.page.og_image
      ? {
          openGraph: {
            type: "website" as const,
            siteName: "React2u",
            locale: "nl_NL",
            url: `/${slug}`,
            title,
            description: res.page.seo_description || undefined,
            images: [res.page.og_image],
          },
        }
      : {}),
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await getPage(slug);
  if (!res) notFound();
  return <BlockRenderer blocks={res.blocks} />;
}
