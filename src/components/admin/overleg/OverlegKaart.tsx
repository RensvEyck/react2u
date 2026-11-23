import Link from "next/link";
import { LuArrowRight, LuMessagesSquare } from "react-icons/lu";
import { overlegTitel, teLaat, wanneerTekst, type Actiepunt, type Overleg } from "@/lib/overleg";

const DATUM_KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });

/** Op het dashboard: het volgende CM-overleg en je eigen open actiepunten (0053). */
export default function OverlegKaart({ volgend, punten, mijnActies, vandaag }: { volgend: Overleg | null; punten: number; mijnActies: Actiepunt[]; vandaag: string }) {
  return (
    <section className="acard p-6" id="cm-overleg" aria-labelledby="cm-overleg-kop">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="cm-overleg-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuMessagesSquare className="text-[16px] text-black/35" /> CM-overleg
          </h2>
          <p className="mt-0.5 text-[13.5px] text-black/55">
            {volgend ? (
              <>
                <span className="font-semibold text-[#1c1a4e]">{overlegTitel(volgend.datum)}</span> · {wanneerTekst(volgend.datum, vandaag)} · {punten} {punten === 1 ? "punt" : "punten"} op de agenda
              </>
            ) : (
              "Er is nog geen overleg gepland."
            )}
          </p>
        </div>
        <Link href={volgend ? "/admin/overleg#inbrengen" : "/admin/overleg"} className="flex items-center gap-1 pt-0.5 text-[13px] font-semibold text-[#e75387] hover:underline">
          {volgend ? "Punt inbrengen" : "Naar het overleg"} <LuArrowRight className="text-[13px]" />
        </Link>
      </div>
      {mijnActies.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Jouw actiepunten</p>
          <ul className="space-y-1.5">
            {mijnActies.slice(0, 4).map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
                <Link href="/admin/overleg#acties" className="min-w-0 text-[#1c1a4e] hover:underline">{a.wat}</Link>
                {a.wanneer && (
                  <span className={`shrink-0 text-[12px] tabular-nums ${teLaat(a, vandaag) ? "font-semibold text-[#b42318]" : "text-black/40"}`}>
                    {teLaat(a, vandaag) ? "te laat, " : ""}af op {DATUM_KORT.format(new Date(`${a.wanneer}T00:00:00Z`)).replace(".", "")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {mijnActies.length > 4 && <p className="mt-1.5 text-[12.5px] text-black/40">En nog {mijnActies.length - 4}.</p>}
        </div>
      )}
    </section>
  );
}
