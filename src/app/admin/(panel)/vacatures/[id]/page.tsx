import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { saveVacancy } from "@/app/admin/actions";
import VacancyFields from "@/components/admin/VacancyFields";
import type { Vacancy } from "@/lib/types";

export default async function EditVacancy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("vacancies").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const v = data as Vacancy;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/admin/vacatures" className="text-sm text-black/50 hover:text-[#e75387]">← Alle vacatures</Link>
          <h1 className="text-3xl font-bold text-[#312e82]">{v.title}</h1>
        </div>
        {v.status === "published" && (
          <a href={`/vacatures/${v.slug}`} target="_blank" className="text-[#e75387] font-medium hover:underline">
            Bekijk vacature ↗
          </a>
        )}
      </div>
      <form action={saveVacancy} className="rounded-2xl bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={v.id} />
        <VacancyFields v={v} />
        <button className="btn mt-6 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>
    </div>
  );
}
