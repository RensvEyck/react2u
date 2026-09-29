import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { updatePageMeta, addBlock, deletePage, restoreRevision } from "@/app/admin/actions";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import ConfirmButton from "@/components/admin/ConfirmButton";
import BlockList from "@/components/admin/BlockList";
import VersionHistory from "@/components/admin/VersionHistory";
import { hasVersions, loadVersions } from "@/lib/revisionsDb";
import { trash, type Revision } from "@/lib/revisions";
import { blockText } from "@/lib/search";
import { when } from "@/lib/dashboard";
import type { Block, Page } from "@/lib/types";
import { LuArrowLeft, LuExternalLink, LuPlus, LuChevronDown, LuRotateCcw, LuTrash2 } from "react-icons/lu";

export default async function PageAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { sb, admin } = await requirePerm("paginas");
  const { data: page } = await sb.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const p = page as Page;

  const [{ data: blocksData }, history, { data: deletedData }, versionsOn] = await Promise.all([
    sb.from("blocks").select("*").eq("page_id", p.id).order("sort"),
    loadVersions(sb, "pages", p.id),
    // Verwijderde blokken van deze pagina. Zonder migratie 0008 geeft dit een
    // fout en blijft de lijst leeg.
    sb.from("revisions")
      .select("*")
      .eq("table_name", "blocks")
      .filter("data->>page_id", "eq", p.id)
      .order("created_at", { ascending: false })
      .limit(100),
    hasVersions(sb),
  ]);
  const blocks = (blocksData as Block[]) || [];
  const deleted = trash((deletedData as Revision[]) || [], new Set(blocks.map((b) => `blocks:${b.id}`))).slice(0, 8);
  const updateAction = updatePageMeta.bind(null, slug);
  const back = `/admin/paginas/${slug}`;
  const path = slug === "home" ? "/" : `/${slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/paginas" className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
            <LuArrowLeft className="text-[12px]" /> Alle pagina&apos;s
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{p.title}</h1>
            <span className={`apill ${p.published ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-black/[0.06] text-black/50"}`}>
              {p.published ? "Live" : "Concept"}
            </span>
          </div>
          <p className="font-mono text-[12.5px] text-black/35">{path}</p>
        </div>
        <a href={path} target="_blank" className="abtn-ghost">
          Bekijk pagina <LuExternalLink className="text-[13px]" />
        </a>
      </div>

      <div>
        <BlockList
          slug={slug}
          canUndo={versionsOn}
          blocks={blocks.map((b) => ({
            id: b.id,
            title: b.label || BLOCK_TEMPLATES[b.type]?.label || b.type,
            snippet: blockText(b.data, 140),
            href: `/admin/paginas/${slug}/blok/${b.id}`,
          }))}
        />

        <details className="group mt-3 rounded-2xl border border-dashed border-black/15 bg-white/50 open:border-solid open:bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[14px] font-semibold text-[#312e82] transition hover:text-[#e75387] [&::-webkit-details-marker]:hidden">
            <LuPlus className="text-[16px]" /> Blok toevoegen
            <LuChevronDown className="ml-auto text-[14px] text-black/30 transition group-open:rotate-180" />
          </summary>
          <form action={addBlock.bind(null, slug)} className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(BLOCK_TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                name="type"
                value={key}
                className="rounded-xl border border-black/[0.08] bg-[#fafafd] px-4 py-3 text-left text-[13.5px] font-semibold text-[#1c1a4e] transition hover:border-[#e75387]/50 hover:bg-white hover:text-[#e75387]"
              >
                {t.label}
              </button>
            ))}
          </form>
        </details>
        <p className="mt-2 text-[12.5px] text-black/35">Een nieuw blok komt onderaan; sleep het daarna naar de juiste plek.</p>
      </div>

      <form action={updateAction} className="acard p-6">
        <h2 className="mb-4 font-heading text-[16px] font-bold text-[#312e82]">SEO &amp; instellingen</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="alabel">Paginanaam</label>
            <input className="ainput" name="title" defaultValue={p.title} required />
          </div>
          <div>
            <label className="alabel">SEO-titel (browsertab &amp; Google)</label>
            <input className="ainput" name="seo_title" defaultValue={p.seo_title || ""} />
          </div>
          <div className="md:col-span-2">
            <label className="alabel">Meta-omschrijving (Google-snippet, ±155 tekens)</label>
            <textarea className="ainput" name="seo_description" rows={2} defaultValue={p.seo_description || ""} />
          </div>
          <div className="md:col-span-2">
            <label className="alabel">Social share afbeelding (URL)</label>
            <input className="ainput" name="og_image" defaultValue={p.og_image || ""} />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-[14px] font-medium text-black/70">
            <input type="checkbox" name="published" defaultChecked={p.published} className="h-4 w-4 accent-[#e75387]" />
            Gepubliceerd
          </label>
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      {deleted.length > 0 && (
        <section className="acard overflow-hidden">
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4">
            <LuTrash2 className="text-[15px] text-black/35" />
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Verwijderde blokken</h2>
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {deleted.map((r) => {
              const d = r.data as Partial<Block>;
              const title = d.label || BLOCK_TEMPLATES[d.type || ""]?.label || d.type || "Blok";
              return (
                <li key={r.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#1c1a4e]">{title}</p>
                    <p className="truncate text-[12.5px] text-black/40">
                      Verwijderd {when(r.created_at)} · {blockText(d.data, 100)}
                    </p>
                  </div>
                  <form action={restoreRevision.bind(null, r.id, back)}>
                    <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#312e82] transition hover:bg-[#eef0ff]">
                      <LuRotateCcw className="text-[13px]" /> Terugzetten
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <VersionHistory
        versions={history}
        currentUserId={admin.userId}
        back={back}
        canRestore
        title="Geschiedenis van titel en SEO"
      />

      <div className="flex justify-end">
        <ConfirmButton
          action={deletePage.bind(null, slug)}
          message={
            versionsOn
              ? `Pagina "${p.title}" met alle blokken verwijderen? Je kunt hem terughalen uit de prullenbak.`
              : `Pagina "${p.title}" met alle blokken definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`
          }
          className="text-[13px] text-black/35 underline hover:text-[#e0356b]"
        >
          Pagina verwijderen
        </ConfirmButton>
      </div>
    </div>
  );
}
