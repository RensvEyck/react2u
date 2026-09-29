import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage, getPublishedPages, getPublishedPosts } from "@/lib/content";
import BlockRenderer, { needsPosts } from "@/components/blocks/BlockRenderer";
import Pills from "@/components/site/Pills";
import { Arrow } from "@/components/site/DotCloud";
import { PIJLERS, crumbsVoor, dienstVoor } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
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
    // Op een dienstpagina kleurt alles mee met de dienst: bovenkopjes, het
    // heropaneel, vinkjes en nummering lezen --k uit kleurVars().
    <div style={hit ? kleurVars(hit.dienst.kleur) : undefined}>
      <BlockRenderer blocks={res.blocks} ctx={{ posts, crumbs }} />
      {hit && <MeerDiensten huidig={path} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </div>
  );
}

/**
 * Onder elke dienstpagina: de andere vijf diensten, zodat een bezoeker niet
 * terug hoeft naar het menu. Elke tegel houdt zijn eigen dienstkleur.
 */
function MeerDiensten({ huidig }: { huidig: string }) {
  const andere = PIJLERS.flatMap((p) => p.diensten).filter((d) => d.href !== huidig);
  return (
    <section data-tone="soft" className="bg-soft py-16 md:py-24">
      <div className="container-site">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" data-reveal>
          <div>
            <p className="eyebrow mb-4">Diensten</p>
            <h2 className="text-[1.85rem] font-extrabold leading-[1.08] tracking-[-0.022em] sm:text-[2.1rem] md:text-[2.75rem]">Meer van React2u</h2>
          </div>
          <Link href="/diensten" className="link-arrow shrink-0">Alle diensten <Arrow /></Link>
        </div>
        <Pills items={andere.map((d) => ({ label: d.label, href: d.href, kleur: d.kleur }))} />
      </div>
    </section>
  );
}
