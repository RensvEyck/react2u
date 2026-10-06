import Link from "next/link";
import { saveVacancy } from "@/app/admin/actions";
import VacancyFields from "@/components/admin/VacancyFields";
import { LuArrowLeft } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { engelseVeldenBestaan } from "@/lib/vacaturesDb";

export default async function NewVacancy() {
  const { sb } = await requirePerm("vacatures");
  const engels = await engelseVeldenBestaan(sb);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/vacatures" className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
          <LuArrowLeft className="text-[12px]" /> Alle vacatures
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe vacature</h1>
      </div>
      <form action={saveVacancy} className="acard overflow-hidden">
        <VacancyFields engels={engels} />
        <div className="flex justify-end bg-[#fafafd] px-6 py-4">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}
