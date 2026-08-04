import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts, getPost } from "@/lib/content";
import { MiniMarkdown } from "@/lib/md";
import { LuCalendar, LuUserRound, LuArrowLeft } from "react-icons/lu";

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

  const jsonLd = {
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
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${SITE}/blog/${p.slug}` },
    ],
  };

  return (
    <>
      <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
        <div className="container-site py-14 max-w-[820px]">
          <Link href="/blog" className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary/55 hover:text-accent">
            <LuArrowLeft className="text-[13px]" /> Alle artikelen
          </Link>
          <h1 className="text-4xl md:text-5xl mb-5">{p.title}</h1>
          <div className="flex flex-wrap gap-5 text-primary/70">
            {date && <span className="flex items-center gap-2"><LuCalendar /> {date}</span>}
            {p.author && <span className="flex items-center gap-2"><LuUserRound /> {p.author}</span>}
          </div>
        </div>
      </section>

      {p.cover_image && (
        <div className="container-site max-w-[900px] -mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.cover_image} alt="" className="w-full rounded-2xl object-cover" />
        </div>
      )}

      <section className="py-14">
        <div className="container-site max-w-[760px]">
          {p.excerpt && <p className="text-xl text-primary/80 mb-6">{p.excerpt}</p>}
          <MiniMarkdown text={p.body_md || ""} />
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}
