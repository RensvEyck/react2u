import { requireAdmin } from "@/lib/admin";
import { setApplicationStatus } from "@/app/admin/actions";
import type { Application } from "@/lib/types";

const STATUS_OPTIONS = [
  ["nieuw", "Nieuw"],
  ["in_behandeling", "In behandeling"],
  ["afgewezen", "Afgewezen"],
  ["aangenomen", "Aangenomen"],
] as const;

export default async function ApplicationsAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("applications").select("*").order("created_at", { ascending: false });
  const apps = (data as Application[]) || [];
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Sollicitaties</h1>
      {apps.length === 0 && <p className="text-black/50">Nog geen sollicitaties ontvangen.</p>}
      <div className="space-y-4">
        {apps.map((a) => (
          <div key={a.id} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold text-[#312e82] text-lg">{a.name}</p>
                <p className="text-sm text-black/60">
                  {a.vacancy_title || "Onbekende vacature"} · {new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="mt-2 text-[15px]">
                  <a href={`mailto:${a.email}`} className="text-[#e75387] hover:underline">{a.email}</a>
                  {a.phone && <> · <a href={`tel:${a.phone}`} className="text-[#e75387] hover:underline">{a.phone}</a></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.cv_path && (
                  <a href={`/admin/cv?path=${encodeURIComponent(a.cv_path)}`} target="_blank"
                    className="rounded-full border border-[#312e82]/30 px-4 py-1.5 text-sm font-medium text-[#312e82] hover:bg-[#312e82] hover:text-white">
                    CV bekijken
                  </a>
                )}
                <form action={setApplicationStatus.bind(null, a.id)} className="flex items-center gap-2">
                  <select name="status" defaultValue={a.status}
                    className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-sm outline-none">
                    {STATUS_OPTIONS.map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <button className="rounded-full bg-[#e75387] px-4 py-1.5 text-sm text-white hover:opacity-90">Opslaan</button>
                </form>
              </div>
            </div>
            {a.motivation && (
              <p className="mt-4 rounded-xl bg-[#f6f5fb] p-4 text-[15px] whitespace-pre-line">{a.motivation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
