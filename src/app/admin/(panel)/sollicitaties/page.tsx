import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { saveApplicationNote, setApplicationStatus } from "@/app/admin/actions";
import StatusSelect from "@/components/admin/StatusSelect";
import type { Application } from "@/lib/types";
import { LuMail, LuPhone, LuFileText, LuLinkedin } from "react-icons/lu";

/**
 * Sollicitaties als pijplijn: nieuw, gebeld, gesprek, aanbod, aangenomen,
 * afgewezen (migratie 0018). Bovenaan per fase het aantal; een nieuwe
 * sollicitatie die langer dan 2 werkdagen wacht, valt op. Per sollicitant de
 * bron (aanbrenger, campagne, verwijzer) en een interne notitie.
 */

const FASEN: [string, string][] = [
  ["nieuw", "Nieuw"],
  ["gebeld", "Gebeld"],
  ["gesprek", "Gesprek"],
  ["aanbod", "Aanbod"],
  ["aangenomen", "Aangenomen"],
  ["afgewezen", "Afgewezen"],
];
// Oudere rijen kunnen nog "in_behandeling" hebben; die tonen we als gebeld.
const fase = (s: string) => (s === "in_behandeling" ? "gebeld" : s);

function werkdagenSinds(iso: string) {
  let d = new Date(iso);
  const nu = new Date();
  let n = 0;
  while (d < nu) {
    d = new Date(d.getTime() + 86400000);
    const dag = d.getDay();
    if (d <= nu && dag !== 0 && dag !== 6) n++;
  }
  return n;
}

export default async function ApplicationsAdmin({ searchParams }: { searchParams: Promise<{ fase?: string }> }) {
  const { sb } = await requirePerm("postvak");
  const { fase: gekozen = "actief" } = await searchParams;
  const { data } = await sb.from("applications").select("*").order("created_at", { ascending: false });
  const alle = (data as Application[]) || [];
  const telling = Object.fromEntries(FASEN.map(([k]) => [k, alle.filter((a) => fase(a.status) === k).length]));
  const actief = alle.filter((a) => !["aangenomen", "afgewezen"].includes(fase(a.status)));
  const apps = gekozen === "actief" ? actief : gekozen === "alle" ? alle : alle.filter((a) => fase(a.status) === gekozen);
  const tab = (k: string, label: string, aantal: number) => (
    <Link key={k} href={`/admin/sollicitaties?fase=${k}`}
      className={`apill !px-3 !py-1.5 text-[13px] ${gekozen === k ? "bg-[#312e82] text-white" : "bg-black/[0.05] text-black/60 hover:bg-black/[0.08]"}`}>
      {label} <span className="opacity-70">{aantal}</span>
    </Link>
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Sollicitaties</h1>
        <p className="text-[14.5px] text-black/50">
          Zet de fase direct via het menu. Bel nieuwe kandidaten binnen 2 werkdagen: daarna haken de meesten af.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tab("actief", "Lopend", actief.length)}
        {FASEN.map(([k, l]) => tab(k, l, telling[k]))}
        {tab("alle", "Alle", alle.length)}
      </div>

      {apps.length === 0 && (
        <div className="acard px-6 py-10 text-center text-black/45">Geen sollicitaties in deze fase.</div>
      )}

      <div className="space-y-3">
        {apps.map((a) => {
          const wacht = fase(a.status) === "nieuw" ? werkdagenSinds(a.created_at) : 0;
          return (
            <div key={a.id} className={`acard p-6 ${wacht > 2 ? "ring-2 ring-[#e0356b]/40" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[16px] font-bold text-[#312e82]">
                    {(a.name[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-[16px] font-bold text-[#1c1a4e]">
                      {a.name}
                      {a.lang === "en" && (
                        <span className="apill bg-[#e6f0fb] text-[#1d5fa8]" title="Binnengekomen via de Engelse site (/en)" lang="en">EN</span>
                      )}
                      {wacht > 0 && (
                        <span className={`apill ${wacht > 2 ? "bg-[#fdeef4] text-[#e0356b]" : "bg-[#fff4e5] text-[#c77700]"}`}>
                          wacht {wacht} {wacht === 1 ? "werkdag" : "werkdagen"}
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] text-black/45">
                      {a.vacancy_title || "Sollicitatie"} ·{" "}
                      {new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                      {a.bron && <> · <span className="font-medium text-[#312e82]">{a.bron}</span></>}
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
                      {a.linkedin && (
                        <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                          <LuLinkedin className="text-[13px]" /> LinkedIn-profiel
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
                  <StatusSelect action={setApplicationStatus.bind(null, a.id)} current={fase(a.status)} options={FASEN} />
                </div>
              </div>
              {a.motivation && (
                <p className="mt-4 whitespace-pre-line rounded-xl bg-[#fafafd] p-4 text-[14px] leading-relaxed text-black/70">
                  {a.motivation}
                </p>
              )}
              <form action={saveApplicationNote.bind(null, a.id)} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                <textarea name="notitie" rows={2} defaultValue={a.notitie || ""} placeholder="Interne notitie, bijv. gebeld op dinsdag, gesprek donderdag 10:00"
                  className="ainput flex-1 text-[13.5px]" />
                <button className="abtn-ghost !py-2 text-[13px]">Notitie opslaan</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
