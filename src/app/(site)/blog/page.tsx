import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";
import { LuCalendar, LuUserRound } from "react-icons/lu";
import SiteImage from "@/components/site/SiteImage";
import PageHeader from "@/components/site/PageHeader";
import DotCloud, { Arrow } from "@/components/site/DotCloud";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Artikelen over verzuim, preventie en vitaliteit. Praktische kennis van React2u voor werkgevers en werknemers.",
  alternates: { canonical: "/blog" },
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  return (
    <>
      <PageHeader crumbs={[{ label: "Inzichten", href: "/blog" }]} eyebrow="Inzichten" title="Kennis die je verder helpt">
        <p>Artikelen over verzuim, preventie en vitaliteit — praktisch en zonder omhaal.</p>
      </PageHeader>

      <section className="py-16 md:py-24">
        <div className="container-site">
          {posts.length === 0 ? (
            <div className="mx-auto max-w-[640px] rounded-[28px] bg-soft p-10 text-center" data-reveal>
              <DotCloud className="mx-auto mb-6 w-20" />
              <h2 className="text-[26px]">Binnenkort verschijnen hier onze eerste artikelen</h2>
              <p className="mt-3">Tot die tijd beantwoorden we je vragen graag persoonlijk.</p>
              <Link href="/contact" className="btn mt-7">Stel je vraag <Arrow /></Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <article key={p.id} data-reveal style={{ "--ri": i % 3 } as React.CSSProperties}
                  className="lift group relative flex flex-col overflow-hidden rounded-[28px] bg-soft">
                  <div className="aspect-[16/10] overflow-hidden bg-[#e9e7f5]">
                    {p.cover_image ? (
                      <SiteImage
                        src={p.cover_image}
                        alt=""
                        sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                        widths={[480, 800]}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center"><DotCloud className="w-24 opacity-60" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-primary/75">
                      {p.published_at && (
                        <span className="flex items-center gap-1.5"><LuCalendar aria-hidden /> {fmt(p.published_at)}</span>
                      )}
                      {p.author && (
                        <span className="flex items-center gap-1.5"><LuUserRound aria-hidden /> {p.author}</span>
                      )}
                    </div>
                    <h2 className="text-[22px] leading-snug">
                      {/* De hele kaart is klikbaar via de ::after van deze link. */}
                      <Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0">{p.title}</Link>
                    </h2>
                    {p.excerpt && <p className="mt-3 text-[16px]">{p.excerpt}</p>}
                    <span className="link-arrow mt-auto pt-6 text-[15.5px]">Lees verder <Arrow /></span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
