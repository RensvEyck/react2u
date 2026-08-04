import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { updatePageMeta, moveBlock, addBlock, deleteBlock, deletePage } from "@/app/admin/actions";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { Block, Page } from "@/lib/types";
import { LuArrowLeft, LuExternalLink, LuChevronUp, LuChevronDown, LuPencil, LuTrash2, LuPlus } from "react-icons/lu";

/* eslint-disable @typescript-eslint/no-explicit-any */

function blockSnippet(data: any): string {
  const d = data || {};
  return d.heading || d.text?.slice?.(0, 80) || d.body?.slice?.(0, 80) || d.before || "";
}

export default async function PageAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { sb } = await requireAdmin();
  const { data: page } = await sb.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const { data: blocksData } = await sb.from("blocks").select("*").eq("page_id", page.id).order("sort");
  const blocks = (blocksData as Block[]) || [];
  const p = page as Page;
  const updateAction = updatePageMeta.bind(null, slug);

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
        </div>
        <a href={`/${slug === "home" ? "" : slug}`} target="_blank" className="abtn-ghost">
          Bekijk pagina <LuExternalLink className="text-[13px]" />
        </a>
      </div>

      <div>
        <h2 className="mb-3 font-heading text-[16px] font-bold text-[#312e82]">Contentblokken</h2>
        <div className="space-y-2.5">
          {blocks.map((b, i) => (
            <div key={b.id} className="acard group flex items-center gap-4 px-5 py-3.5 transition hover:shadow-md">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[13px] font-bold text-[#312e82]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/paginas/${slug}/blok/${b.id}`} className="text-[14.5px] font-semibold text-[#1c1a4e] hover:text-[#e75387]">
                  {b.label || BLOCK_TEMPLATES[b.type]?.label || b.type}
                </Link>
                <p className="truncate text-[12.5px] text-black/40">{blockSnippet(b.data)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-40 transition group-hover:opacity-100">
                <form action={moveBlock.bind(null, b.id, slug, "up")}>
                  <button className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 disabled:opacity-25" disabled={i === 0} aria-label="Omhoog">
                    <LuChevronUp />
                  </button>
                </form>
                <form action={moveBlock.bind(null, b.id, slug, "down")}>
                  <button className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 disabled:opacity-25" disabled={i === blocks.length - 1} aria-label="Omlaag">
                    <LuChevronDown />
                  </button>
                </form>
                <Link href={`/admin/paginas/${slug}/blok/${b.id}`} className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-[#e75387]" aria-label="Bewerken">
                  <LuPencil />
                </Link>
                <ConfirmButton
                  action={deleteBlock.bind(null, b.id, slug)}
                  message="Dit blok definitief verwijderen?"
                  className="rounded-lg p-1.5 text-black/50 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                >
                  <LuTrash2 />
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>

        <form action={addBlock.bind(null, slug)} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white/50 px-5 py-4">
          <select name="type" className="ainput !w-auto min-w-[240px]">
            {Object.entries(BLOCK_TEMPLATES).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
          <button className="abtn"><LuPlus /> Blok toevoegen</button>
        </form>
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

      <div className="flex justify-end">
        <ConfirmButton
          action={deletePage.bind(null, slug)}
          message={`Pagina "${p.title}" inclusief alle blokken definitief verwijderen?`}
          className="text-[13px] text-black/35 underline hover:text-[#e0356b]"
        >
          Pagina verwijderen
        </ConfirmButton>
      </div>
    </div>
  );
}
