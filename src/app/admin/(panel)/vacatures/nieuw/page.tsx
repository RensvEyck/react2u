import Link from "next/link";
import { saveVacancy } from "@/app/admin/actions";
import VacancyFields from "@/components/admin/VacancyFields";

export default function NewVacancy() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/vacatures" className="text-sm text-black/50 hover:text-[#e75387]">← Alle vacatures</Link>
        <h1 className="text-3xl font-bold text-[#312e82]">Nieuwe vacature</h1>
      </div>
      <form action={saveVacancy} className="rounded-2xl bg-white p-6 shadow-sm">
        <VacancyFields />
        <button className="btn mt-6 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>
    </div>
  );
}
