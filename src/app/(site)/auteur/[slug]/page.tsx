import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import { organisatieRef } from "@/lib/organisatie";
import { kort } from "@/lib/seo";
import { AUTEURS, auteurVoor, gidsenVan } from "@/lib/auteurs";
import { ONDERWERPEN } from "@/lib/kennis";
import AuteurPagina from "@/components/kennis/AuteurPagina";

export const revalidate = 3600;
export const dynamicParams = false;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

/** De auteurspagina's (lib/auteurs.ts): de mensen achter de gidsen, als Person voor Google. */
export function generateStaticParams() {
  return AUTEURS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = auteurVoor((await params).slug);
  if (!a) return {};
  return {
    title: { absolute: `${a.naam}, ${a.functie.replace(/^van /, "").toLowerCase()} • React2u` },
    description: kort(a.bio[0]),
    alternates: { canonical: `/auteur/${a.slug}` },
    openGraph: { ...(await openGraphVoor({ pad: `/auteur/${a.slug}` })), type: "profile" },
  };
}

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const a = auteurVoor((await params).slug);
  if (!a) notFound();
  const url = `${SITE}/auteur/${a.slug}`;
  // ProfilePage met de auteur als Person: dezelfde @id als in de Article van elke gids.
  const profiel = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url,
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#persoon`,
      name: a.naam,
      jobTitle: a.functie,
      description: a.bio[0],
      url,
      worksFor: organisatieRef(),
      knowsAbout: ONDERWERPEN.filter((o) => a.onderwerpen.includes(o.slug)).map((o) => o.naam),
      ...(a.registraties.length ? { hasCredential: a.registraties.map((r) => ({ "@type": "EducationalOccupationalCredential", name: r })) } : {}),
      ...(a.linkedin ? { sameAs: [a.linkedin] } : {}),
    },
    hasPart: gidsenVan(a.slug).map((g) => ({ "@type": "Article", "@id": `${SITE}/${g.slug}#article`, headline: g.vraag, url: `${SITE}/${g.slug}` })),
  };
  const crumbs = [{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: a.naam, href: `/auteur/${a.slug}` }];
  return (
    <>
      <AuteurPagina auteur={a} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(profiel) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
