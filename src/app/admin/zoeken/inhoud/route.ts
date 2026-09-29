import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import { blockText, stripMarkdown, type IndexEntry } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageRow = { id: string; slug: string; title: string; published: boolean };
type BlockRow = { id: string; page_id: string; type: string; label: string | null; data: unknown };
type PostRow = { id: string; slug: string; title: string; status: string; excerpt: string | null; body_md: string | null };
type VacancyRow = { id: string; slug: string; title: string; status: string; location: string; intro: string | null; description_md: string | null };

const pagePath = (slug: string) => (slug === "home" ? "/" : `/${slug}`);

/**
 * De doorzoekbare inhoud voor het commandopalet, in één keer.
 *
 * Alleen wat de gebruiker mag zien: de query's per onderdeel worden
 * overgeslagen zonder het recht, en RLS zou ze anders toch leeg teruggeven.
 * Inzendingen zitten hier bewust níet in — zie src/lib/search.ts.
 */
export async function GET() {
  const { sb, admin } = await requireAdmin();
  const can = (p: string) => admin.permissions.includes(p as never);
  const none = Promise.resolve({ data: [] as never[] });

  const [pagesRes, blocksRes, postsRes, vacanciesRes] = await Promise.all([
    can("paginas") ? sb.from("pages").select("id, slug, title, published").order("sort") : none,
    can("paginas") ? sb.from("blocks").select("id, page_id, type, label, data").order("sort") : none,
    can("blog") ? sb.from("posts").select("id, slug, title, status, excerpt, body_md") : none,
    can("vacatures") ? sb.from("vacancies").select("id, slug, title, status, location, intro, description_md") : none,
  ]);

  const pages = (pagesRes.data as PageRow[]) || [];
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const entries: IndexEntry[] = [];

  for (const p of pages) {
    entries.push({
      kind: "pagina",
      id: p.id,
      title: p.title,
      subtitle: pagePath(p.slug),
      href: `/admin/paginas/${p.slug}`,
      text: "",
      status: p.published ? "live" : "concept",
    });
  }

  for (const b of (blocksRes.data as BlockRow[]) || []) {
    const page = pageById.get(b.page_id);
    if (!page) continue;
    const text = blockText(b.data);
    if (!text) continue;
    entries.push({
      kind: "blok",
      id: b.id,
      title: page.title,
      subtitle: b.label || BLOCK_TEMPLATES[b.type]?.label || b.type,
      href: `/admin/paginas/${page.slug}/blok/${b.id}`,
      text,
      status: page.published ? "live" : "concept",
    });
  }

  for (const p of (postsRes.data as PostRow[]) || []) {
    entries.push({
      kind: "artikel",
      id: p.id,
      title: p.title,
      subtitle: `/blog/${p.slug}`,
      href: `/admin/blog/${p.id}`,
      text: stripMarkdown([p.excerpt, p.body_md].filter(Boolean).join(" ")).slice(0, 4000),
      status: p.status === "published" ? "live" : "concept",
    });
  }

  for (const v of (vacanciesRes.data as VacancyRow[]) || []) {
    entries.push({
      kind: "vacature",
      id: v.id,
      title: v.title,
      subtitle: `${v.location} · /vacatures/${v.slug}`,
      href: `/admin/vacatures/${v.id}`,
      text: stripMarkdown([v.intro, v.description_md].filter(Boolean).join(" ")).slice(0, 4000),
      status: v.status === "published" ? "live" : v.status === "closed" ? "gesloten" : "concept",
    });
  }

  return NextResponse.json(entries, { headers: { "Cache-Control": "private, no-store" } });
}
