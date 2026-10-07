import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPages, getPublishedPosts, getSetting } from "@/lib/content";
import BlockRenderer, { needsPosts, needsTarieven } from "@/components/blocks/BlockRenderer";
import { normalizeTarieven } from "@/lib/tarieven";
import { crumbsVoor } from "@/lib/nav";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { metOmschrijving, omschrijving } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import { conceptSlugs } from "@/lib/concept";
import { inhoud } from "@/lib/pagina";
import { isGeindexeerd, plaatsVoorSlug, provincieHref, provincieVoorSlug } from "@/lib/gemeenten";
import { plaatsTekst } from "@/lib/plaatsteksten";
import { PlaatsPagina, ProvinciePagina } from "@/components/blocks/PlaatsPagina";
import { hreflangVoor } from "@/lib/taal";
import { coveredByWordpress } from "@/lib/redirects";

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

// Welke inhoud een pagina toont (concept, database of reserve) staat in
// lib/pagina.ts, samen met de regel dat de publicatiestatus leidend is.

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  const slugs = new Set([...pages.map((p) => p.slug), ...conceptSlugs()]);
  slugs.delete("home");
  // Een pagina met een vaste doorverwijzing (zoals de oude dienstpagina's,
  // nu een label) bereikt niemand: de redirect gaat voor. Niet bouwen.
  return [...slugs].filter((slug) => !coveredByWordpress(`/${slug}`)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const gebied = werkgebied(slug);
  if (gebied) {
    const title = `Arbodienst ${gebied.naam} • Persoonlijke verzuimbegeleiding • React2u`;
    // Alleen een gemeente met een eigen tekst (en de kern rond Eindhoven) hoort
    // in Google; de andere gemeentepagina's bestaan wel, maar met noindex
    // (lib/gemeenten.ts). De omschrijving komt uit die eigen tekst.
    const noindex = gebied.soort === "plaats" && !isGeindexeerd(gebied.plaats.slug);
    const eigen = gebied.soort === "plaats" ? plaatsTekst(gebied.plaats.slug)?.seo : undefined;
    return {
      title: { absolute: title },
      description: omschrijving(eigen) ?? `Arbodienst in ${gebied.naam}: persoonlijke verzuimbegeleiding met één vaste casemanager, preventie en re-integratie. SBCA en ISO gecertificeerd.`,
      alternates: { canonical: `/${slug}` },
      openGraph: await openGraphVoor({ pad: `/${slug}` }),
      ...(noindex ? { robots: { index: false, follow: true } } : {}),
    };
  }
  const res = await inhoud(slug);
  if (!res) return {};
  const title = res.page.seo_title || `${res.page.title} • React2u`;
  return {
    title: { absolute: title },
    // Zonder eigen omschrijving de sleutel weglaten: dan erft de pagina de
    // site-brede standaardtekst uit (site)/layout.tsx. `description: undefined`
    // zou die juist wissen (shallow merge). Zie lib/seo.ts en CONTEXT.md, *SEO*.
    ...metOmschrijving(omschrijving(res.page.seo_description)),
    // hreflang alleen voor pagina's die ook in het Engels bestaan (lib/taal.ts).
    alternates: { canonical: `/${slug}`, languages: hreflangVoor(`/${slug}`) ?? undefined },
    // Het hele Open Graph-object, met de eigen url en de eigen of de
    // standaardafbeelding; zie lib/og.ts voor waarom dat compleet moet.
    openGraph: await openGraphVoor({ pad: `/${slug}`, afbeelding: res.page.og_image }),
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gebied = werkgebied(slug);
  if (gebied) {
    // Kruimelpad als structured data, net als de gewone pagina's hieronder.
    const crumbs = [
      { label: "Werkgebied", href: "/sitemap#werkgebied" },
      ...(gebied.soort === "plaats"
        ? [{ label: gebied.plaats.provincie.naam, href: provincieHref(gebied.plaats.provincie.naam) }, { label: gebied.naam, href: `/${slug}` }]
        : [{ label: gebied.naam, href: `/${slug}` }]),
    ];
    return (
      <>
        {gebied.soort === "plaats"
          ? <PlaatsPagina plaats={gebied.plaats} />
          : <ProvinciePagina provincie={gebied.provincie} regio={gebied.regio} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
      </>
    );
  }
  const res = await inhoud(slug);
  if (!res) notFound();
  const path = `/${slug}`;
  const [posts, tarieven] = await Promise.all([
    needsPosts(res.blocks) ? getPublishedPosts() : [],
    // Het tarievenjaar uit de instellingen, alleen voor pagina's met een tariefblok.
    needsTarieven(res.blocks) ? getSetting<unknown>("tarieven").then(normalizeTarieven) : undefined,
  ]);
  const crumbs = crumbsVoor(path, res.page.title);

  return (
    <>
      <BlockRenderer blocks={res.blocks} ctx={{ posts, crumbs, tarieven }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
