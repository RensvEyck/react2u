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
  const path = `/${slug}`;
  const posts = needsPosts(res.blocks) ? await getPublishedPosts() : [];
  const crumbs = crumbsVoor(path, res.page.title);
  const hit = dienstVoor(path);

  return (
    // Op een dienstpagina kleurt alles mee met de dienst: bovenkopjes, het
    // heropaneel, vinkjes en nummering lezen --k uit kleurVars().
    <div style={hit ? kleurVars(hit.dienst.kleur) : undefined}>
      <BlockRenderer blocks={res.blocks} ctx={{ posts, crumbs }} />
      {hit && <MeerOplossingen huidig={path} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </div>
  );
}

/**
 * Onder elke dienstpagina: de andere vijf diensten, zodat een bezoeker niet
 * terug hoeft naar het menu. Elke tegel houdt zijn eigen dienstkleur.
 */
function MeerOplossingen({ huidig }: { huidig: string }) {
  const andere = PIJLERS.flatMap((p) => p.diensten).filter((d) => d.href !== huidig);
  return (
    <section data-tone="soft" className="bg-soft py-16 md:py-24">
      <div className="container-site">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" data-reveal>
          <div>
            <p className="eyebrow mb-4">Oplossingen</p>
            <h2 className="text-[1.85rem] font-extrabold leading-[1.08] tracking-[-0.022em] sm:text-[2.1rem] md:text-[2.75rem]">Meer van React2u</h2>
          </div>
          <Link href="/diensten" className="link-arrow shrink-0">Alle oplossingen <Arrow /></Link>
        </div>
        <Pills items={andere.map((d) => ({ label: d.label, href: d.href, kleur: d.kleur }))} />
      </div>
    </section>
  );
}
