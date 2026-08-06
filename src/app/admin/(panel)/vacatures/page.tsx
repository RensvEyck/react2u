import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { deleteVacancy } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { Vacancy } from "@/lib/types";
import { LuPlus, LuExternalLink, LuPencil, LuTrash2, LuMapPin, LuClock } from "react-icons/lu";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Concept", cls: "bg-black/[0.06] text-black/50" },
  published: { label: "Live", cls: "bg-[#e6f7f4] text-[#0e9f8a]" },
  closed: { label: "Gesloten", cls: "bg-[#fff4e5] text-[#c77700]" },
};

export default async function VacanciesAdmin() {
  const { sb } = await requirePerm("vacatures");
  const { data } = await sb.from("vacancies").select("*").order("created_at", { ascending: false });
  const vacancies = (data as Vacancy[]) || [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Vacatures</h1>
          <p className="text-[14.5px] text-black/50">
            Gepubliceerde vacatures verschijnen op de site én in Google for Jobs.
          </p>
        </div>
        <Link href="/admin/vacatures/nieuw" className="abtn"><LuPlus /> Nieuwe vacature</Link>
      </div>

      <div className="space-y-2.5">
        {vacancies.length === 0 && (
          <div className="acard px-6 py-10 text-center text-black/45">Nog geen vacatures — maak je eerste vacature aan.</div>
        )}
        {vacancies.map((v) => (
          <div key={v.id} className="acard group flex items-center gap-4 px-6 py-4 transition hover:shadow-md">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/vacatures/${v.id}`} className="text-[15px] font-semibold text-[#1c1a4e] hover:text-[#e75387]">
                {v.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-black/45">
                <span className="flex items-center gap-1"><LuMapPin className="text-[11px]" /> {v.location}</span>
                {v.hours && <span className="flex items-center gap-1"><LuClock className="text-[11px]" /> {v.hours}</span>}
                <span className="text-black/30">/vacatures/{v.slug}</span>
              </div>
            </div>
            <span className={`apill ${STATUS[v.status].cls}`}>{STATUS[v.status].label}</span>
            <div className="flex items-center gap-1 opacity-40 transition group-hover:opacity-100">
              {v.status === "published" && (
                <a href={`/vacatures/${v.slug}`} target="_blank" className="rounded-lg p-2 text-black/50 hover:bg-black/5 hover:text-[#312e82]" title="Bekijk">
                  <LuExternalLink />
                </a>
              )}
              <Link href={`/admin/vacatures/${v.id}`} className="rounded-lg p-2 text-black/50 hover:bg-black/5 hover:text-[#e75387]" title="Bewerken">
                <LuPencil />
              </Link>
              <ConfirmButton
                action={deleteVacancy.bind(null, v.id)}
                message={`Vacature "${v.title}" definitief verwijderen?`}
                className="rounded-lg p-2 text-black/50 hover:bg-[#fdeef4] hover:text-[#e0356b]"
              >
                <LuTrash2 />
              </ConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
