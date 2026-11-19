import Link from "next/link";
import { LuArrowDownRight, LuArrowRight, LuArrowUpRight, LuChartLine, LuMinus } from "react-icons/lu";
import { Lijn } from "@/components/admin/Grafiek";
import { cijferTekst, kwartaalLabel, trendTekst, vraag, weekKort, weekTitel, type Kwartaal, type Verloop } from "@/lib/weekevaluatie";

/**
 * Mijn verloop (Rens, 19 nov 2026: "lijntjes van de eigen energie, tijd en
 * plezier over het kwartaal"): op het dashboard van een werknemer de eigen
 * cijfers per week, één kleine grafiek per schaal met dezelfde as van 1 tot
 * 10. Wie zijn eigen verloop terugziet, krijgt iets terug voor het invullen.
 * Het is hetzelfde verloop dat in de kwartaalmeeting op tafel ligt; dat staat
 * er ook bij, zodat niemand denkt dat het alleen voor zichzelf is.
 */
export default function MijnVerloop({ kwartaal, lijnen }: { kwartaal: Kwartaal; lijnen: Verloop[] }) {
  const leeg = lijnen.every((l) => !l.laatste);
  const weken = lijnen[0]?.punten.filter((p) => !p.later) ?? [];

  return (
    <section className="acard p-6" id="mijn-verloop" aria-labelledby="mijn-verloop-kop">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="mijn-verloop-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuChartLine className="text-[16px] text-black/35" /> Mijn verloop
          </h2>
          <p className="mt-0.5 text-[12.5px] text-black/45">
            Je eigen cijfers per week in {kwartaalLabel(kwartaal)}. Hetzelfde verloop bespreek je in de kwartaalmeeting.
          </p>
        </div>
        <Link href="/admin/weekevaluatie" className="flex items-center gap-1 pt-0.5 text-[13px] font-semibold text-[#e75387] hover:underline">
          Mijn weekevaluatie <LuArrowRight className="text-[13px]" />
        </Link>
      </div>

      {leeg ? (
        <p className="rounded-[12px] bg-[#f6f5fb] px-4 py-3 text-[13.5px] leading-[1.55] text-black/55">
          Na je eerste weekevaluatie van {kwartaalLabel(kwartaal)} zie je hier hoe je weken gaan: je energie, of het werk in de tijd paste en je plezier.
        </p>
      ) : (
        <>
          <div className="grid gap-x-8 gap-y-7 md:grid-cols-3">
            {lijnen.map((l) => {
              const v = vraag(l.schaal);
              const Pijl = l.verschil === null ? null : l.verschil > 0 ? LuArrowUpRight : l.verschil < 0 ? LuArrowDownRight : LuMinus;
              return (
                <div key={l.schaal} className="min-w-0" data-schaal={l.schaal}>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold leading-tight text-[#1c1a4e]">{v.kort}</h3>
                      <p className="mt-0.5 text-[12px] text-black/40">{l.laatste ? `laatst in ${weekKort(l.laatste.week)}` : "nog geen cijfer"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading text-[26px] font-bold leading-none tabular-nums text-[#1c1a4e]">{cijferTekst(l.laatste?.waarde)}</p>
                      {Pijl && l.vorigeWeek && (
                        <p className="mt-1 flex items-center justify-end gap-0.5 text-[12px] tabular-nums text-black/50">
                          <Pijl className="text-[13px]" aria-hidden /> {trendTekst(l.verschil)} <span className="text-black/35">t.o.v. {weekKort(l.vorigeWeek)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Lijn
                    titel={`${v.kort} per week, ${kwartaalLabel(kwartaal)}`}
                    reeks={v.kort}
                    formaat={cijferTekst}
                    punten={l.punten.map((p) => ({ key: p.week, label: weekKort(p.week), titel: weekTitel(p.week), waarde: p.waarde, later: p.later }))}
                  />
                </div>
              );
            })}
          </div>

          <details className="group/tabel mt-5">
            <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
              <span className="group-open/tabel:hidden">Toon als tabel</span>
              <span className="hidden group-open/tabel:inline">Verberg tabel</span>
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                  <tr className="border-b border-black/[0.06]">
                    <th className="py-2 pr-3 font-semibold">Week</th>
                    {lijnen.map((l) => <th key={l.schaal} className="px-3 py-2 text-right font-semibold">{vraag(l.schaal).kort}</th>)}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {weken.map((p) => (
                    <tr key={p.week} className="border-b border-black/[0.04]">
                      <td className="py-1.5 pr-3 text-black/60">{weekTitel(p.week)}</td>
                      {lijnen.map((l) => <td key={l.schaal} className="px-3 py-1.5 text-right text-[#1c1a4e]">{cijferTekst(l.punten.find((x) => x.week === p.week)?.waarde)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
