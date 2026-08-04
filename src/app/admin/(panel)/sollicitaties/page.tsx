import { requireAdmin } from "@/lib/admin";
import { setApplicationStatus } from "@/app/admin/actions";
import StatusSelect from "@/components/admin/StatusSelect";
import type { Application } from "@/lib/types";
import { LuMail, LuPhone, LuFileText } from "react-icons/lu";

const STATUS_OPTIONS: [string, string][] = [
  ["nieuw", "Nieuw"],
  ["in_behandeling", "In behandeling"],
  ["afgewezen", "Afgewezen"],
  ["aangenomen", "Aangenomen"],
];

export default async function ApplicationsAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("applications").select("*").order("created_at", { ascending: false });
  const apps = (data as Application[]) || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Sollicitaties</h1>
        <p className="text-[14.5px] text-black/50">Wijzig de status direct via het menu — dit wordt meteen opgeslagen.</p>
      </div>

      {apps.length === 0 && (
        <div className="acard px-6 py-10 text-center text-black/45">Nog geen sollicitaties ontvangen.</div>
      )}

      <div className="space-y-3">
        {apps.map((a) => (
          <div key={a.id} className="acard p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[16px] font-bold text-[#312e82]">
                  {(a.name[0] || "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#1c1a4e]">{a.name}</p>
                  <p className="text-[13px] text-black/45">
                    {a.vacancy_title || "Sollicitatie"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-[13.5px]">
                    <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                      <LuMail className="text-[13px]" /> {a.email}
                    </a>
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                        <LuPhone className="text-[13px]" /> {a.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.cv_path && (
                  <a href={`/admin/cv?path=${encodeURIComponent(a.cv_path)}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]">
                    <LuFileText className="text-[13px]" /> CV bekijken
                  </a>
                )}
                <StatusSelect action={setApplicationStatus.bind(null, a.id)} current={a.status} options={STATUS_OPTIONS} />
              </div>
            </div>
            {a.motivation && (
              <p className="mt-4 whitespace-pre-line rounded-xl bg-[#fafafd] p-4 text-[14px] leading-relaxed text-black/70">
                {a.motivation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
