import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import type { Page } from "@/lib/types";

export default async function PagesAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("pages").select("*").order("sort");
  const pages = (data as Page[]) || [];
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Pagina&apos;s</h1>
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
