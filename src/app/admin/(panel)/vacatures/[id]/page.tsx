import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { saveVacancy } from "@/app/admin/actions";
import VacancyFields from "@/components/admin/VacancyFields";
import VersionHistory from "@/components/admin/VersionHistory";
import { loadVersions } from "@/lib/revisionsDb";
import type { Vacancy } from "@/lib/types";
import { engelseVeldenBestaan } from "@/lib/vacaturesDb";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";

export default async function EditVacancy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb, admin } = await requirePerm("vacatures");
  const { data } = await sb.from("vacancies").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const history = await loadVersions(sb, "vacancies", id);
  const v = data as Vacancy;
  const engels = await engelseVeldenBestaan(sb);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/vacatures" className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
            <LuArrowLeft className="text-[12px]" /> Alle vacatures
          </Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{v.title}</h1>
        </div>
        {v.status === "published" && (
          <a href={`/vacatures/${v.slug}`} target="_blank" className="abtn-ghost">
            Bekijk vacature <LuExternalLink className="text-[13px]" />
          </a>
        )}
      </div>
      <form action={saveVacancy} className="acard overflow-hidden">
        <input type="hidden" name="id" value={v.id} />
        <VacancyFields v={v} engels={engels} />
        <div className="flex justify-end bg-[#fafafd] px-6 py-4">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
      <VersionHistory
        versions={history}
        currentUserId={admin.userId}
        back={`/admin/vacatures/${id}`}
        canRestore
      />
    </div>
  );
}
