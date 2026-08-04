import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";
import { LuCalendar, LuUserRound } from "react-icons/lu";

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
      <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
        <div className="container-site py-14 lg:py-20 max-w-[820px]">
          <p className="eyebrow mb-4">BLOG</p>
          <h1 className="text-4xl md:text-5xl mb-5">Kennis die je verder helpt</h1>
          <p className="text-xl text-primary/80">
            Artikelen over verzuim, preventie en vitaliteit — praktisch en zonder omhaal.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-site max-w-[1100px]">
          {posts.length === 0 ? (
            <p className="text-primary/70">Er zijn nog geen artikelen gepubliceerd.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <article key={p.id} className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg">
                  <Link href={`/blog/${p.slug}`} className="block overflow-hidden bg-soft">
                    {p.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_image}
                        alt=""
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-48 w-full bg-gradient-to-br from-soft to-secondary/20" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-primary/50">
                      {p.published_at && (
                        <span className="flex items-center gap-1.5"><LuCalendar className="text-[12px]" /> {fmt(p.published_at)}</span>
                      )}
                      {p.author && (
                        <span className="flex items-center gap-1.5"><LuUserRound className="text-[12px]" /> {p.author}</span>
                      )}
                    </div>
                    <h2 className="text-2xl mb-2">
                      <Link href={`/blog/${p.slug}`} className="hover:text-accent">{p.title}</Link>
                    </h2>
                    {p.excerpt && <p className="text-primary/75 mb-4">{p.excerpt}</p>}
                    <Link href={`/blog/${p.slug}`} className="mt-auto font-semibold text-accent hover:underline">
                      Lees verder →
                    </Link>
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
