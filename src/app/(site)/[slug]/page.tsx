import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CONTACT_FALLBACK, getPage, getPublishedPages, getPublishedPosts, getSetting } from "@/lib/content";
import BlockRenderer, { needsPosts, needsTarieven } from "@/components/blocks/BlockRenderer";
import { normalizeTarieven } from "@/lib/tarieven";
import FotoTegel from "@/components/site/FotoTegel";
import { Arrow } from "@/components/site/Arrow";
import { PIJLERS, crumbsVoor, dienstVoor } from "@/lib/nav";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { kort } from "@/lib/seo";
import { concept, conceptSlugs, reserveConcept, type Concept } from "@/lib/concept";
import type { Block, Page } from "@/lib/types";
import { isGeindexeerd, plaatsVoorSlug, provincieVoorSlug } from "@/lib/gemeenten";
import { PlaatsPagina, ProvinciePagina } from "@/components/blocks/Werkgebied";
import { hreflangVoor } from "@/lib/taal";

/**
 * Werkgebied: /arbodienst-provincie-<provincie> en /arbodienst-<gemeente>.
 * Geen database: de gemeenten staan in lib/gemeenten.ts.
 */
function werkgebied(slug: string) {
  if (slug.startsWith("arbodienst-provincie-")) {
    const p = provincieVoorSlug(slug.slice("arbodienst-provincie-".length));
    return p ? { soort: "provincie" as const, naam: p.provincie.naam, ...p } : null;
  }
  if (slug.startsWith("arbodienst-")) {
    const plaats = plaatsVoorSlug(slug.slice("arbodienst-".length));
    return plaats ? { soort: "plaats" as const, naam: plaats.naam, plaats } : null;
  }
  return null;
}

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
  const gebied = werkgebied(slug);
  if (gebied) {
    const title = `Arbodienst ${gebied.naam} • Persoonlijke verzuimbegeleiding • React2u`;
    // Alleen de gemeenten uit GEINDEXEERDE_GEMEENTEN horen in Google; de
    // andere gemeentepagina's bestaan wel, maar met noindex (lib/gemeenten.ts).
    const noindex = gebied.soort === "plaats" && !isGeindexeerd(gebied.plaats.slug);
    return {
      title: { absolute: title },
      description: `Arbodienst in ${gebied.naam}: persoonlijke verzuimbegeleiding met één vaste casemanager, preventie en re-integratie. SBCA en ISO gecertificeerd.`,
      alternates: { canonical: `/${slug}` },
      ...(noindex ? { robots: { index: false, follow: true } } : {}),
    };
  }
  const res = await inhoud(slug);
  if (!res) return {};
  const title = res.page.seo_title || `${res.page.title} • React2u`;
  const description = kort(res.page.seo_description);
  return {
    title: { absolute: title },
    description,
    // hreflang alleen voor pagina's die ook in het Engels bestaan (lib/taal.ts).
    alternates: { canonical: `/${slug}`, languages: hreflangVoor(`/${slug}`) ?? undefined },
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
            description,
            images: [res.page.og_image],
          },
        }
      : {}),
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gebied = werkgebied(slug);
  if (gebied?.soort === "plaats") return <PlaatsPagina plaats={gebied.plaats} />;
  if (gebied?.soort === "provincie") return <ProvinciePagina provincie={gebied.provincie} regio={gebied.regio} />;
  const res = await inhoud(slug);
  if (!res) notFound();
  const path = `/${slug}`;
  const [posts, tarieven] = await Promise.all([
    needsPosts(res.blocks) ? getPublishedPosts() : [],
    // Het tarievenjaar uit de instellingen, alleen voor pagina's met een tariefblok.
    needsTarieven(res.blocks) ? getSetting<unknown>("tarieven").then(normalizeTarieven) : undefined,
  ]);
  const crumbs = crumbsVoor(path, res.page.title);
  const hit = dienstVoor(path);

  return (
    <>
      {/* Een dienstpagina zonder knoppen in de kop krijgt de twee die daar horen:
          een afspraak maken en direct bellen. */}
      <BlockRenderer blocks={res.blocks} ctx={{
        posts, crumbs, tarieven,
        knoppen: hit
          ? [{ label: "Maak een afspraak", href: "/contact" }, { label: `Bel ${CONTACT_FALLBACK.phoneDisplay}`, href: `tel:${CONTACT_FALLBACK.phone}` }]
          : undefined,
      }} />
      {hit && <MeerDiensten huidig={path} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}

/**
 * Onder elke dienstpagina: de andere vijf diensten als fototegels, zodat een
 * bezoeker niet terug hoeft naar het menu. Op de telefoon een rij om door te
 * vegen (snap), vanaf een laptop vijf naast elkaar.
 */
function MeerDiensten({ huidig }: { huidig: string }) {
  const andere = PIJLERS.flatMap((p) => p.diensten).filter((d) => d.href !== huidig);
  return (
    <section data-tone="white" className="py-16 md:py-20">
      <div className="container-site">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3">Diensten</p>
            <h2 className="text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem]">Meer van React2u</h2>
          </div>
          <Link href="/diensten" className="link-arrow shrink-0">Alle diensten <Arrow /></Link>
        </div>
      </div>
      {/* De rij loopt op de telefoon door tot de rand van het scherm; de eerste
          tegel lijnt uit met de tekst erboven (scroll-padding). */}
      <ul className="container-site flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scroll-padding-inline:1.25rem] sm:[scroll-padding-inline:2rem] lg:grid lg:snap-none lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {andere.map((d) => (
          <li key={d.href} className="w-[64%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
            <FotoTegel href={d.href} image={d.image} kicker={d.situatie} title={d.label} klein
              ratio="aspect-[4/5]" sizes="(min-width: 1024px) 240px, 64vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
