import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { conceptEn } from "@/lib/concept";
import { kort } from "@/lib/seo";
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
    description: kort(c?.seo_description),
    alternates: { canonical: "/en", languages: hreflangVoor("/") ?? undefined },
  };
}

export default function EnglishHomePage() {
  const c = conceptEn("home");
  if (!c) notFound();
  return <BlockRenderer blocks={c.blocks} ctx={{ lang: "en" }} />;
}
