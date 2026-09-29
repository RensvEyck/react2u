import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockRenderer, { needsPosts } from "@/components/blocks/BlockRenderer";
import { getPublishedPosts } from "@/lib/content";
import type { Block } from "@/lib/types";
import home from "@/content/home.json";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Concept homepage",
  robots: { index: false, follow: false },
};

/**
 * Voorbeeld van een pagina-opbouw die nog niet in de database staat.
 *
 * De inhoud komt uit src/content/home.json in plaats van uit Supabase, zodat je
 * een nieuwe opbouw kunt bekijken zonder de live pagina te raken. Alleen lokaal
 * en op preview-deploys; in productie bestaat deze URL niet. Overzetten naar
 * de database gaat met scripts/concept-naar-sql.mjs — zie CONTEXT.md.
 */
export default async function ConceptPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const blocks: Block[] = home.blocks.map((b, i) => ({
    id: `concept-${i}`,
    page_id: "concept",
    type: b.type,
    label: b.label,
    sort: i,
    data: b.data as Record<string, unknown>,
    updated_at: "",
  }));
  const posts = needsPosts(blocks) ? await getPublishedPosts() : [];
  return <BlockRenderer blocks={blocks} ctx={{ posts }} />;
}
