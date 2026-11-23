"use client";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LuCalendarPlus, LuPrinter } from "react-icons/lu";
import { datumLangNl, isoDatum, nogTeDoen, parseDatum, termijnen } from "@/lib/poortwachter";
import { NAVY, BODY, MUTE, LINE, SOFT, kop, Pijl } from "@/components/blocks/Gedeeld";

/*
 * De Poortwachter-planner: één datum invoeren, alle termijnen op datum. Het
 * rekenwerk staat in lib/poortwachter.ts; de datum staat in de adresbalk
 * (?datum=), zodat een planner te delen is, en het agenda-bestand komt van
 * /kennis/poortwachter-planner/agenda.ics met dezelfde datum. Niets wordt
 * opgeslagen of verstuurd.
 */

const VELD =
  "h-[56px] rounded-[14px] border bg-white px-4 text-[17px] outline-none transition-[border-color,box-shadow] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

export default function PoortwachterPlanner() {
  // De datum uit de adresbalk (?datum=), zodat een planner te delen is; de pagina zet dit in een Suspense.
  const uitAdres = useSearchParams().get("datum");
  const [waarde, setWaarde] = useState(uitAdres && parseDatum(uitAdres) ? uitAdres : "");
  const id = useId();
  const datum = useMemo(() => parseDatum(waarde), [waarde]);
  const lijst = useMemo(() => (datum ? termijnen(datum) : []), [datum]);
  const vandaag = useMemo(() => new Date(), []);
  const { komend, verstreken } = useMemo(() => nogTeDoen(lijst, vandaag), [lijst, vandaag]);
  const eerstvolgende = komend[0]?.sleutel;
  const wekenZiek = datum ? Math.floor((vandaag.getTime() - datum.getTime()) / (7 * 86400000)) + 1 : null;

  // De datum in de adresbalk, zodat de link te delen is. `null` als state: Next 16
  // ziet history.state als zijn eigen aanroep en synchroniseert dan niet.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (datum) url.searchParams.set("datum", waarde);
    else url.searchParams.delete("datum");
    window.history.replaceState(null, "", url.toString());
  }, [datum, waarde]);

  const vandaagIso = isoDatum(vandaag);
  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 rounded-[24px] border bg-white p-6 md:flex-row md:items-end md:gap-5 md:p-7" style={{ borderColor: LINE }}>
        <label htmlFor={id} className="flex grow flex-col gap-2">
          <span className="text-[15px] font-bold" style={{ color: NAVY }}>Eerste ziektedag</span>
          <input id={id} type="date" value={waarde} max={vandaagIso} onChange={(e) => setWaarde(e.target.value)} className={VELD} style={{ borderColor: LINE, color: NAVY }} />
          <span className="text-[13.5px]" style={{ color: MUTE }}>De dag waarop je werknemer zich ziek meldde; vanaf die dag tellen de weken.</span>
        </label>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => setWaarde(vandaagIso)} className="hv-btn hv-btn-rand inline-flex h-[56px] items-center rounded-full px-5 text-[15px] font-bold">Vandaag</button>
          {waarde && <button type="button" onClick={() => setWaarde("")} className="hv-btn hv-btn-rand inline-flex h-[56px] items-center rounded-full px-5 text-[15px] font-bold">Wissen</button>}
        </div>
      </form>

      {datum ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-[24px] p-6 md:flex-row md:items-center md:justify-between md:p-7" style={{ background: SOFT }}>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>Eerste ziektedag {datumLangNl(datum)}</span>
              <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: NAVY }}>
                {wekenZiek !== null && wekenZiek >= 1 ? `Week ${wekenZiek} van het verzuim` : "Het verzuim begint nog"}
                {komend[0] ? `, eerstvolgende termijn: ${komend[0].titel.toLowerCase()}` : ", alle termijnen zijn verstreken"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a href={`/kennis/poortwachter-planner/agenda.ics?datum=${waarde}`} download={`poortwachter-${waarde}.ics`} className="hv-btn hv-btn-roze inline-flex h-[52px] items-center gap-2.5 rounded-full px-5 text-[15px] font-bold">
                <LuCalendarPlus size={18} aria-hidden />Zet in je agenda
              </a>
              <button type="button" onClick={() => window.print()} className="hv-btn hv-btn-rand inline-flex h-[52px] items-center gap-2.5 rounded-full px-5 text-[15px] font-bold">
                <LuPrinter size={18} aria-hidden />Afdrukken
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: LINE }}>
            <table className="w-full border-collapse text-left max-md:block">
              <caption className="sr-only">De termijnen van de Wet verbetering poortwachter vanaf {datumLangNl(datum)}</caption>
              <thead className="max-md:hidden">
                <tr style={{ background: NAVY }}>
                  {["Week", "Termijn", "Uiterlijk op", "Wie"].map((k) => (
                    <th key={k} scope="col" className="px-6 py-4 text-[12.5px] font-bold uppercase tracking-[1.2px] md:px-7" style={{ color: "rgba(255,255,255,0.85)" }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="max-md:block">
                {lijst.map((t) => {
                  const voorbij = verstreken.includes(t);
                  const nu = t.sleutel === eerstvolgende;
                  const week = t.aard === "herhalend" ? "Elke 6 weken" : `Week ${t.week}`;
                  return (
                    <tr key={t.sleutel} className="border-t align-top max-md:block max-md:px-5 max-md:py-4" style={{ borderColor: LINE, background: nu ? "#FDECF4" : voorbij ? "#FFFFFF" : SOFT, opacity: voorbij ? 0.6 : 1 }}>
                      <td data-kolom="Week" className="text-[15px] font-bold max-md:block max-md:before:mb-0.5 max-md:before:block max-md:before:text-[12px] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[1px] max-md:before:text-[#67657F] max-md:before:content-[attr(data-kolom)] md:px-6 md:py-4 lg:px-7" style={{ color: NAVY }}>{week}</td>
                      <td data-kolom="Termijn" className="text-[15.5px] leading-[1.55] max-md:block max-md:py-1 max-md:before:mb-0.5 max-md:before:block max-md:before:text-[12px] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[1px] max-md:before:text-[#67657F] max-md:before:content-[attr(data-kolom)] md:px-6 md:py-4 lg:px-7" style={{ color: NAVY }}>
                        <span className="font-bold">{t.titel}</span>
                        {nu && <span className="ml-2 rounded-full px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.8px]" style={{ background: "#D4136A", color: "#fff" }}>Eerstvolgende</span>}
                        <span className="block text-[14.5px]" style={{ color: BODY }}>{t.tekst}</span>
                      </td>
                      <td data-kolom="Uiterlijk op" className="whitespace-nowrap text-[15.5px] font-bold max-md:block max-md:py-1 max-md:before:mb-0.5 max-md:before:block max-md:before:text-[12px] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[1px] max-md:before:text-[#67657F] max-md:before:content-[attr(data-kolom)] md:px-6 md:py-4 lg:px-7" style={{ color: NAVY }}>
                        <time dateTime={t.iso}>{t.aard === "rond" ? "rond " : ""}{datumLangNl(t.datum)}</time>
                      </td>
                      <td data-kolom="Wie" className="text-[15px] max-md:block max-md:py-1 max-md:before:mb-0.5 max-md:before:block max-md:before:text-[12px] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[1px] max-md:before:text-[#67657F] max-md:before:content-[attr(data-kolom)] md:px-6 md:py-4 lg:px-7" style={{ color: BODY }}>{t.wie}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.65]" style={{ color: MUTE }}>
            De datums zijn de laatste dag van de week uit de wet; eerder mag altijd. De 42e-weeksmelding valt op de eerste werkdag na 42 weken. Wordt je werknemer binnen vier weken na herstel opnieuw ziek, dan tellen de periodes bij elkaar op en kloppen deze datums niet meer; bel dan even. Dit hulpmiddel bewaart niets en vervangt geen advies van je casemanager.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-[24px] p-6 md:p-7" style={{ background: SOFT }}>
          <span className={`${kop} text-[21px]`} style={{ color: NAVY }}>Vul de eerste ziektedag in</span>
          <p className="m-0 max-w-[640px] text-[15.5px] leading-[1.65]" style={{ color: BODY }}>Dan zie je hier alle termijnen van de Wet verbetering poortwachter op datum: de probleemanalyse in week 6, het plan van aanpak in week 8, de melding bij UWV in week 42, de eerstejaarsevaluatie in week 52 en de WIA-aanvraag in week 93. Met één klik zet je ze in je agenda.</p>
          <Link href="/wet-verbetering-poortwachter" className="inline-flex items-center gap-2 self-start text-[15px] font-bold" style={{ color: NAVY }}>Eerst de stappen lezen<Pijl size={14} /></Link>
        </div>
      )}
    </div>
  );
}
