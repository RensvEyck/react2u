import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";
import { LuCalendar, LuUserRound } from "react-icons/lu";
import SiteImage from "@/components/site/SiteImage";
import PageHeader from "@/components/site/PageHeader";
import { Arrow } from "@/components/site/Arrow";
import FotoTegel from "@/components/site/FotoTegel";
import { DOELGROEP_FOTO } from "@/lib/nav";
import { nieuwOntwerp } from "@/lib/concept";
import { BlogOverzicht } from "@/components/blocks/Blog";

export const revalidate = 300;

// Zolang er geen artikelen zijn, hoort de lege blogpagina niet in Google:
// noindex, en sitemap.ts laat hem dan ook weg. Verschijnt het eerste artikel,
// dan verdwijnt de noindex vanzelf (na de revalidatie van vijf minuten).
export async function generateMetadata(): Promise<Metadata> {
  const posts = await getPublishedPosts();
  return {
    title: "Blog",
    description:
      "Artikelen over verzuim, preventie en vitaliteit. Praktische kennis van React2u voor werkgevers en werknemers.",
    alternates: { canonical: "/blog" },
    ...(posts.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  // Het nieuwe ontwerp "Blog"; de oude pagina hieronder is de terugvaloptie.
  if (nieuwOntwerp) return <BlogOverzicht posts={posts} />;

  return (
    <>
      <PageHeader crumbs={[{ label: "Blog", href: "/blog" }]} eyebrow="Blog" title="Kennis die je verder helpt">
        <p>Artikelen over verzuim, preventie en vitaliteit — praktisch en zonder omhaal.</p>
      </PageHeader>

      <section className="py-16 md:py-24">
        <div className="container-site">
          {posts.length === 0 ? (
            // Nog geen artikelen: geen lege plek, maar de weg naar de antwoorden die er al zijn.
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8" data-reveal>
              <div className="lg:col-span-5">
                <h2 className="text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem]">
                  Binnenkort verschijnen hier onze eerste artikelen
                </h2>
                <p className="mt-4 text-[18px] leading-relaxed">
                  Tot die tijd beantwoorden we je vragen graag persoonlijk. En misschien staat het antwoord er al tussen.
                </p>
                <Link href="/contact" className="btn mt-8">Stel je vraag <Arrow /></Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
                <li>
                  <FotoTegel href="/werkgevers#veelgestelde-vragen" image={DOELGROEP_FOTO.werkgever}
                    kicker="Voor werkgevers" title="Veelgestelde vragen over verzuim" sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw" />
                </li>
                <li>
                  <FotoTegel href="/werknemers#ziek-wat-nu" image={DOELGROEP_FOTO.werknemer}
                    kicker="Voor werknemers" title="Ziek, wat nu?" sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw" />
                </li>
              </ul>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <article key={p.id} data-reveal style={{ "--ri": i % 3 } as React.CSSProperties}
                  className="group relative flex flex-col">
                  <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-soft">
                    {p.cover_image ? (
                      <SiteImage
                        src={p.cover_image}
                        alt=""
                        sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                        widths={[480, 800]}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      null
                    )}
                  </div>
                  <div className="flex flex-1 flex-col pt-5">
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
