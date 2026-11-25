import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockRenderer, { needsKeurmerken, needsTarieven } from "@/components/blocks/BlockRenderer";
import { getSetting } from "@/lib/content";
import { normalizeTarieven } from "@/lib/tarieven";
import { alleConceptSlugsEn, conceptEn } from "@/lib/concept";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { serviceLd } from "@/lib/organisatie";
import { crumbsVoor, normalizeCertificates } from "@/lib/nav";
import { openGraphVoor } from "@/lib/og";
import { paginaBestaat } from "@/lib/pagina";
import { metOmschrijving, omschrijving } from "@/lib/seo";
import { hreflangVoor, vertaalPad } from "@/lib/taal";

/**
 * Een Engelse pagina onder /en, uit src/content/en/. De slug mag genest zijn
 * (services/recover), daarom een catch-all; een onbekend adres onder /en komt
 * zo ook hier uit en wordt de Engelse 404 (en/not-found.tsx).
 */
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return alleConceptSlugsEn().map((s) => ({ slug: s.split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const pad = slug.join("/");
  const c = conceptEn(pad);
  if (!c) return {};
  const path = `/en/${pad}`;
  // hreflang alleen als de Nederlandse tegenhanger ook echt publiek is: een
  // pagina die een beheerder verborg mag niet via de Engelse versie als
  // taalvariant worden aangemeld (publicatiestatus leidend, lib/pagina.ts).
  const nlSlug = vertaalPad(path, "nl").slice(1);
  const nlPubliek = nlSlug ? await paginaBestaat(nlSlug) : false;
  return {
    title: { absolute: c.seo_title || `${c.title} • React2u` },
    // Zonder eigen omschrijving erft de pagina de Engelse standaardtekst uit en/layout.tsx.
    ...metOmschrijving(omschrijving(c.seo_description)),
    alternates: { canonical: path, languages: nlPubliek ? hreflangVoor(path) ?? undefined : undefined },
    openGraph: await openGraphVoor({ pad: path, taal: "en" }),
  };
}

export default async function EnglishPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const pad = slug.join("/");
  const c = conceptEn(pad);
  if (!c) notFound();
  const path = `/en/${pad}`;
  const crumbs = crumbsVoor(path, c.title, "en");
  // /en/services/<label>: de dienst als Service van de organisatie, net als op de Nederlandse pagina.
  const dienst = pad.startsWith("services/") ? serviceLd(pad.slice("services/".length), "en") : null;
  // Het tarievenjaar uit de instellingen, alleen voor /en/pricing (dgTarieven).
  const [tarieven, certificaten] = await Promise.all([
    needsTarieven(c.blocks) ? getSetting<unknown>("tarieven").then(normalizeTarieven) : undefined,
    // De certificaten uit de instellingen, voor de keurmerken op /en/about-us, de dienstpagina's en /en/certifications.
    needsKeurmerken(c.blocks) ? getSetting<unknown>("certificates").then(normalizeCertificates) : undefined,
  ]);
  return (
    <>
      <BlockRenderer blocks={c.blocks} ctx={{ crumbs, lang: "en", tarieven, certificaten }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, "en")) }} />
      {dienst && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dienst) }} />}
    </>
  );
}
