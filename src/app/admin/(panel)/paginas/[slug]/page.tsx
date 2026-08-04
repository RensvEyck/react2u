import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { updatePageMeta, moveBlock, addBlock, deleteBlock, deletePage } from "@/app/admin/actions";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import type { Block, Page } from "@/lib/types";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero (kop + afbeelding)",
  intro: "Introtekst (gecentreerd)",
  animatedHeadline: "Typende kop",
  imageText: "Tekst + afbeelding",
  servicesGrid: "Dienstenkaarten",
  ctaBanner: "Call-to-action banner",
  subSections: "Subsecties (verwachtingen)",
  twoColumnLists: "Twee kolommen met lijsten",
  valueCards: "Waardenkaarten",
  contactFaq: "Contactformulier + FAQ",
  faqAccordion: "FAQ (uitklapbaar)",
  logoCarousel: "Logocarrousel",
  richText: "Tekstsectie",
  imagesBlock: "Afbeelding(en)",
  contactDetails: "Contactgegevens + formulier",
};

export default async function PageAdmin({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ opgeslagen?: string }>;
}) {
  const { slug } = await params;
  const { opgeslagen } = await searchParams;
  const { sb } = await requireAdmin();
  const { data: page } = await sb.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const { data: blocksData } = await sb.from("blocks").select("*").eq("page_id", page.id).order("sort");
  const blocks = (blocksData as Block[]) || [];
  const p = page as Page;
  const updateAction = updatePageMeta.bind(null, slug);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/admin/paginas" className="text-sm text-black/50 hover:text-[#e75387]">← Alle pagina&apos;s</Link>
          <h1 className="text-3xl font-bold text-[#312e82]">{p.title}</h1>
        </div>
        <a href={`/${slug === "home" ? "" : slug}`} target="_blank" className="text-[#e75387] font-medium hover:underline">
          Bekijk pagina ↗
        </a>
      </div>

      {opgeslagen && (
        <div className="mb-6 rounded-xl bg-[#00aa98]/10 border border-[#00aa98]/30 px-4 py-3 text-[#00806f]">
          Wijzigingen opgeslagen — de site is bijgewerkt.
        </div>
      )}

      <form action={updateAction} className="rounded-2xl bg-white p-6 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-[#312e82] mb-4">SEO &amp; instellingen</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/60">Paginanaam</span>
            <input className={input} name="title" defaultValue={p.title} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/60">SEO-titel (browsertab &amp; Google)</span>
            <input className={input} name="seo_title" defaultValue={p.seo_title || ""} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-black/60">Meta-omschrijving (Google-snippet)</span>
            <textarea className={input} name="seo_description" rows={2} defaultValue={p.seo_description || ""} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-black/60">Social share afbeelding (URL)</span>
            <input className={input} name="og_image" defaultValue={p.og_image || ""} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked={p.published} className="h-4 w-4 accent-[#e75387]" />
            <span className="text-sm font-medium text-black/70">Gepubliceerd</span>
          </label>
        </div>
        <button className="btn mt-5 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>

      <h2 className="text-xl font-bold text-[#312e82] mb-4">Contentblokken</h2>
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="font-medium text-[#312e82]">{b.label || TYPE_LABELS[b.type] || b.type}</p>
              <p className="text-sm text-black/50">{TYPE_LABELS[b.type] || b.type}</p>
            </div>
            <div className="flex items-center gap-3">
              <form action={moveBlock.bind(null, b.id, slug, "up")}>
                <button className="rounded-lg border border-black/10 px-2.5 py-1 text-sm hover:bg-black/5" disabled={i === 0}>↑</button>
              </form>
              <form action={moveBlock.bind(null, b.id, slug, "down")}>
                <button className="rounded-lg border border-black/10 px-2.5 py-1 text-sm hover:bg-black/5" disabled={i === blocks.length - 1}>↓</button>
              </form>
              <Link href={`/admin/paginas/${slug}/blok/${b.id}`} className="text-[#e75387] font-medium hover:underline">
                Bewerken
              </Link>
              <form action={deleteBlock.bind(null, b.id, slug)}>
                <button className="text-black/30 hover:text-[#e51673] text-sm">✕</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <form action={addBlock.bind(null, slug)} className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-black/20 bg-white/60 px-5 py-4">
        <select name="type" className="rounded-xl border border-black/15 bg-white px-3 py-2 text-[15px] outline-none">
          {Object.entries(BLOCK_TEMPLATES).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>
        <button className="btn !py-2 !px-5 text-[15px]">+ Blok toevoegen</button>
      </form>

      <form action={deletePage.bind(null, slug)} className="mt-10 border-t border-black/10 pt-6">
        <button className="text-sm text-black/40 hover:text-[#e51673] underline">
          Pagina verwijderen (inclusief alle blokken)
        </button>
      </form>
    </div>
  );
}
