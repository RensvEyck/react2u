import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createPage } from "@/app/admin/actions";
import type { Page } from "@/lib/types";

const input =
  "rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

export default async function PagesAdmin({ searchParams }: { searchParams: Promise<{ fout?: string }> }) {
  const { fout } = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("pages").select("*").order("sort");
  const pages = (data as Page[]) || [];
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Pagina&apos;s</h1>
      {fout && (
        <div className="mb-6 rounded-xl bg-[#e51673]/10 border border-[#e51673]/30 px-4 py-3 text-[#e51673]">
          {fout === "slug-bestaat-al" ? "Er bestaat al een pagina met deze URL-slug." : "Vul een titel en URL-slug in."}
        </div>
      )}
      <form action={createPage} className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/60">Titel</span>
          <input className={input} name="title" placeholder="Bijv. Werken bij" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/60">URL-slug</span>
          <input className={input} name="slug" placeholder="bijv. werken-bij" required />
        </label>
        <button className="btn !py-2.5 !px-6 text-[15px]">+ Nieuwe pagina</button>
        <span className="text-sm text-black/40">Nieuwe pagina&apos;s starten als concept.</span>
      </form>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#312e82]/5 text-sm text-black/60">
            <tr>
              <th className="px-5 py-3">Pagina</th>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-black/[0.02]">
                <td className="px-5 py-3.5 font-medium text-[#312e82]">{p.title}</td>
                <td className="px-5 py-3.5 text-black/60">/{p.slug === "home" ? "" : p.slug}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${p.published ? "bg-[#00aa98]/15 text-[#00806f]" : "bg-black/10 text-black/60"}`}>
                    {p.published ? "Gepubliceerd" : "Concept"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/paginas/${p.slug}`} className="text-[#e75387] font-medium hover:underline">
                    Bewerken
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
