import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createPage } from "@/app/admin/actions";
import type { Page } from "@/lib/types";
import { LuPlus, LuExternalLink, LuPencil } from "react-icons/lu";

export default async function PagesAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("pages").select("*").order("sort");
  const pages = (data as Page[]) || [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Pagina&apos;s</h1>
          <p className="text-[14.5px] text-black/50">Klik op een pagina om teksten, blokken en SEO aan te passen.</p>
        </div>
      </div>

      <form action={createPage} className="acard flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[200px] flex-1">
          <label className="alabel">Titel</label>
          <input className="ainput" name="title" placeholder="Bijv. Werken bij" required />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="alabel">URL-slug</label>
          <input className="ainput" name="slug" placeholder="bijv. werken-bij" required />
        </div>
        <button className="abtn"><LuPlus /> Nieuwe pagina</button>
      </form>

      <div className="acard overflow-hidden">
        <div className="divide-y divide-black/[0.05]">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4 transition hover:bg-[#fafafd]">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/paginas/${p.slug}`} className="text-[15px] font-semibold text-[#1c1a4e] hover:text-[#e75387]">
                  {p.title}
                </Link>
                <p className="text-[12.5px] text-black/40">/{p.slug === "home" ? "" : p.slug}</p>
              </div>
              <span className={`apill ${p.published ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-black/[0.06] text-black/50"}`}>
                {p.published ? "Live" : "Concept"}
              </span>
              <a href={`/${p.slug === "home" ? "" : p.slug}`} target="_blank"
                className="rounded-lg p-2 text-black/35 transition hover:bg-black/5 hover:text-[#312e82]" title="Bekijk pagina">
                <LuExternalLink />
              </a>
              <Link href={`/admin/paginas/${p.slug}`}
                className="rounded-lg p-2 text-black/35 transition hover:bg-black/5 hover:text-[#e75387]" title="Bewerken">
                <LuPencil />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
