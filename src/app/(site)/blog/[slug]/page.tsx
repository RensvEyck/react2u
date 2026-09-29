import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts, getPost } from "@/lib/content";
import { MiniMarkdown } from "@/lib/md";
import { jsonLd } from "@/lib/jsonld";
import { LuCalendar, LuUserRound, LuArrowLeft } from "react-icons/lu";
import SiteImage from "@/components/site/SiteImage";
import PageHeader from "@/components/site/PageHeader";

export const revalidate = 300;
export const dynamicParams = true;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return {};
  const image = p.og_image || p.cover_image;
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.excerpt || undefined,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: p.seo_title || p.title,
      description: p.seo_description || p.excerpt || undefined,
      url: `/blog/${slug}`,
      publishedTime: p.published_at || undefined,
      modifiedTime: p.updated_at,
      authors: p.author ? [p.author] : undefined,
      ...(image ? { images: [image] } : {}),
    },
    ...(image ? { twitter: { card: "summary_large_image", images: [image] } } : {}),
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();

  const image = p.og_image || p.cover_image;
  const date = p.published_at
    ? new Date(p.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    ...(p.excerpt ? { description: p.excerpt } : {}),
    ...(image ? { image: [image] } : {}),
    datePublished: p.published_at || p.created_at,
    dateModified: p.updated_at,
    author: { "@type": p.author ? "Person" : "Organization", name: p.author || "React2u" },
    publisher: {
      "@type": "Organization",
      name: "React2u",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${p.slug}` },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Inzichten", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${SITE}/blog/${p.slug}` },
    ],
  };

  return (
    <>
      <PageHeader crumbs={[{ label: "Inzichten", href: "/blog" }, { label: p.title, href: `/blog/${p.slug}` }]}
        eyebrow="Inzichten" title={p.title} narrow>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[16px] text-primary/80">
          {date && <span className="flex items-center gap-2"><LuCalendar aria-hidden /> {date}</span>}
          {p.author && <span className="flex items-center gap-2"><LuUserRound aria-hidden /> {p.author}</span>}
        </div>
      </PageHeader>

      {p.cover_image && (
        <div className="container-site -mt-6 max-w-[980px] md:-mt-10">
          <SiteImage src={p.cover_image} alt="" priority sizes="(min-width: 980px) 980px, 100vw"
            className="w-full rounded-[28px] object-cover shadow-[0_30px_60px_-40px_rgba(34,32,90,0.5)]" />
        </div>
      )}

      <article className="py-14 md:py-20">
        <div className="container-site max-w-[760px]">
          {p.excerpt && <p className="mb-8 text-[21px] leading-relaxed text-primary/85">{p.excerpt}</p>}
          <MiniMarkdown text={p.body_md || ""} className="text-[18.5px]" />
          <Link href="/blog" className="link-arrow mt-12"><LuArrowLeft aria-hidden /> Alle artikelen</Link>
        </div>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />
    </>
  );
}
