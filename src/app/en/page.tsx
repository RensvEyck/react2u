import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockRenderer, { needsKeurmerken } from "@/components/blocks/BlockRenderer";
import { conceptEn } from "@/lib/concept";
import { getSetting } from "@/lib/content";
import { normalizeCertificates } from "@/lib/nav";
import { jsonLd } from "@/lib/jsonld";
import { organisatieGraphLd } from "@/lib/organisatie";
import { openGraphVoor } from "@/lib/og";
import { metOmschrijving, omschrijving } from "@/lib/seo";
import { hreflangVoor } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";

export const revalidate = 300;

/**
 * Het Engelse startscherm (/en): het splitscreen werkgever | werknemer en de
 * korte home, uit src/content/en/home.json. Zie docs/adr/0001-tweetalig-nl-en.md.
 */
export async function generateMetadata(): Promise<Metadata> {
  const c = conceptEn("home");
  const title = c?.seo_title || woordenboek("en").seo.homeTitel;
  return {
    title: { absolute: title },
    // Zonder eigen omschrijving erft /en de Engelse standaardtekst uit en/layout.tsx.
    ...metOmschrijving(omschrijving(c?.seo_description)),
    alternates: { canonical: "/en", languages: hreflangVoor("/") ?? undefined },
    openGraph: await openGraphVoor({ pad: "/en", taal: "en" }),
  };
}

export default async function EnglishHomePage() {
  const c = conceptEn("home");
  if (!c) notFound();
  // De certificaten uit de instellingen, alleen als het startscherm keurmerken toont (lib/keurmerken.ts).
  const certificaten = needsKeurmerken(c.blocks) ? normalizeCertificates(await getSetting<unknown>("certificates")) : undefined;
  return (
    <>
      <BlockRenderer blocks={c.blocks} ctx={{ lang: "en", certificaten }} />
      {/* Dezelfde organisatie en website als op /, met hetzelfde @id. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organisatieGraphLd()) }} />
    </>
  );
}
