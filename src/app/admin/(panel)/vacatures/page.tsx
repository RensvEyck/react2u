import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteVacancy } from "@/app/admin/actions";
import type { Vacancy } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = { draft: "Concept", published: "Gepubliceerd", closed: "Gesloten" };
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-black/10 text-black/60",
  published: "bg-[#00aa98]/15 text-[#00806f]",
  closed: "bg-[#f19000]/15 text-[#b06a00]",
};

export default async function VacanciesAdmin({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const { opgeslagen } = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("vacancies").select("*").order("created_at", { ascending: false });
  const vacancies = (data as Vacancy[]) || [];
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#312e82]">Vacatures</h1>
        <Link href="/admin/vacatures/nieuw" className="btn !py-2.5 !px-6 text-[15px]">+ Nieuwe vacature</Link>
      </div>
      {opgeslagen && (
        <div className="mb-6 rounded-xl bg-[#00aa98]/10 border border-[#00aa98]/30 px-4 py-3 text-[#00806f]">
          Vacature opgeslagen — de site is bijgewerkt.
        </div>
      )}
      <div className="space-y-3">
        {vacancies.length === 0 && <p className="text-black/50">Nog geen vacatures.</p>}
        {vacancies.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="font-medium text-[#312e82]">{v.title}</p>
              <p className="text-sm text-black/50">/vacatures/{v.slug} · {v.location}{v.hours ? ` · ${v.hours}` : ""}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[v.status]}`}>{STATUS_LABEL[v.status]}</span>
              <Link href={`/admin/vacatures/${v.id}`} className="text-[#e75387] font-medium hover:underline">Bewerken</Link>
              <form action={deleteVacancy.bind(null, v.id)}>
                <button className="text-black/40 hover:text-[#e51673] text-sm">Verwijderen</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
