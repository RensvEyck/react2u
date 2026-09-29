import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage, getPublishedPages, getPublishedPosts } from "@/lib/content";
import BlockRenderer, { needsPosts } from "@/components/blocks/BlockRenderer";
import SiteImage from "@/components/site/SiteImage";
import { Arrow } from "@/components/site/Arrow";
import { PIJLERS, crumbsVoor, dienstVoor } from "@/lib/nav";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { concept, conceptSlugs, reserveConcept, type Concept } from "@/lib/concept";
import type { Block, Page } from "@/lib/types";

type Inhoud = { page: Pick<Page, "title" | "seo_title" | "seo_description" | "og_image">; blocks: Block[] };

function alsInhoud(c: Concept): Inhoud {
  return { page: { title: c.title, seo_title: c.seo_title ?? null, seo_description: c.seo_description ?? null, og_image: null }, blocks: c.blocks };
}

/**
 * Pagina-inhoud: op staging het concept als dat er is (zie lib/concept.ts),
 * anders de gepubliceerde pagina uit de database, en bestaat die niet, het
 * concept als reserve (zodat een nieuwe pagina als /werkgevers er meteen is).
 */
async function inhoud(slug: string): Promise<Inhoud | null> {
  const c = concept(slug);
  if (c) return alsInhoud(c);
  const db = await getPage(slug);
  if (db) return db;
  const reserve = reserveConcept(slug);
  return reserve ? alsInhoud(reserve) : null;
}

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  const slugs = new Set([...pages.map((p) => p.slug), ...conceptSlugs()]);
  slugs.delete("home");
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await inhoud(slug);
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
  const res = await inhoud(slug);
  if (!res) notFound();
  const path = `/${slug}`;
  const posts = needsPosts(res.blocks) ? await getPublishedPosts() : [];
  const crumbs = crumbsVoor(path, res.page.title);
  const hit = dienstVoor(path);

  return (
    <>
      <BlockRenderer blocks={res.blocks} ctx={{ posts, crumbs }} />
      {hit && <MeerDiensten huidig={path} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}

/**
 * Onder elke dienstpagina: de andere vijf diensten, zodat een bezoeker niet
 * terug hoeft naar het menu.
 */
function MeerDiensten({ huidig }: { huidig: string }) {
  const andere = PIJLERS.flatMap((p) => p.diensten).filter((d) => d.href !== huidig);
  return (
    <section data-tone="soft" className="border-t border-line bg-soft py-16 md:py-20">
      <div className="container-site">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3">Diensten</p>
            <h2 className="text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem]">Meer van React2u</h2>
          </div>
          <Link href="/diensten" className="link-arrow shrink-0">Alle diensten <Arrow /></Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {andere.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="lift group flex h-full items-center gap-4 rounded-2xl border border-line bg-white p-3 pr-4">
                <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-xl bg-soft">
                  <SiteImage src={d.image} alt="" sizes="64px" widths={[160]} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <span className="min-w-0 flex-1 font-semibold leading-snug text-primary">{d.label}</span>
                <Arrow className="shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
