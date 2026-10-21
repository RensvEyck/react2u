"use client";
import { useState } from "react";
import { euroRond, euroTarief, partnerVergoeding } from "@/lib/partners";
import { vul } from "@/lib/taal";
import { NAVY, PINK, BODY, MUTE, LINE, kop } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Het rekenvoorbeeld in de kop van /partners, als witte kaart op de indigo
 * kop: twee schuiven, de vergoeding in jaar één en daarna, en per jaar een
 * staaf voor de eerste vijf jaar. Het zwevende label rekent jaar één terug
 * naar een kwartaal, want zo wordt er uitbetaald. Tarief en percentages komen
 * uit de blokdata; de voetnoot noemt ze met {tarief}, {jaar}, {pctJaarEen} en
 * {pctVervolg}.
 */

const JAREN = 5;

function Schuif({ id, label, waarde, min, max, stap, onChange }: {
  id: string; label: string; waarde: number; min: number; max: number; stap: number; onChange: (n: number) => void;
}) {
  const vol = ((waarde - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4 text-[14.5px] font-bold md:text-[15px]" style={{ color: NAVY }}>
        <span>{label}</span>
        <span className={`${kop} text-[24px] tabular-nums md:text-[26px]`}>{waarde}</span>
      </label>
      <input id={id} type="range" className="partner-schuif" min={min} max={max} step={stap} value={waarde}
        style={{ "--vol": `${vol}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function PartnerRekenhulp({ r, jaar }: { r: any; jaar: string }) {
  const tarief = Number(r.tarief) || 0;
  const pctJaarEen = Number(r.pctJaarEen) || 0;
  const pctVervolg = Number(r.pctVervolg) || 0;
  const [klanten, setKlanten] = useState(Number(r.startKlanten) || 10);
  const [medewerkers, setMedewerkers] = useState(Number(r.startMedewerkers) || 25);
  const v = partnerVergoeding({ klanten, medewerkers, tarief, pctJaarEen, pctVervolg });
  const perJaar = Array.from({ length: JAREN }, (_, i) => (i === 0 ? v.jaarEen : v.vervolg));
  const hoogste = Math.max(...perJaar, 1);
  const totaal = perJaar.reduce((a, b) => a + b, 0);

  return (
    <div className="relative">
      {/* Zwevend label, zoals een melding uit een partnerportaal; alleen waar er ruimte naast de kaart is. */}
      {r.kwartaalLabel && (
        <div aria-hidden className="absolute right-[calc(100%-28px)] top-[-18px] z-10 hidden items-center gap-3 whitespace-nowrap rounded-2xl bg-white py-3 pl-3 pr-5 shadow-[0_18px_40px_-16px_rgba(20,18,70,0.55)] xl:flex">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "#EAF7DB" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E8E0B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <span className="flex flex-col">
            <span className="text-[12.5px]" style={{ color: MUTE }}>{r.kwartaalLabel}</span>
            <span className={`${kop} text-[19px] tabular-nums`} style={{ color: NAVY }}>{euroRond(v.jaarEen / 4)}</span>
          </span>
        </div>
      )}

      <div className="relative flex flex-col gap-6 rounded-[28px] bg-white px-5 py-7 shadow-[0_40px_80px_-40px_rgba(10,8,50,0.6)] sm:px-7 md:rounded-[32px] md:px-9 md:py-9">
        <div className="flex flex-col gap-1">
          <h2 className={`${kop} m-0 text-[22px] leading-[1.2] md:text-[24px]`} style={{ color: NAVY }}>{r.kop}</h2>
          {r.tekst && <p className="m-0 text-[14.5px] leading-[1.55]" style={{ color: BODY }}>{r.tekst}</p>}
        </div>

        <div className="flex flex-col gap-5">
          <Schuif id="partner-klanten" label={r.klantenLabel} waarde={klanten} min={1} max={50} stap={1} onChange={setKlanten} />
          <Schuif id="partner-medewerkers" label={r.medewerkersLabel} waarde={medewerkers} min={5} max={250} stap={5} onChange={setMedewerkers} />
        </div>

        <div aria-live="polite" className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px]" style={{ background: LINE }}>
          <span className="flex flex-col gap-1 px-4 py-4 sm:px-5" style={{ background: NAVY }}>
            <span className="text-[13px] text-white/75">{r.jaarEenLabel}</span>
            <span className={`${kop} text-[28px] leading-none tracking-[-0.6px] text-white tabular-nums sm:text-[34px]`}>{euroRond(v.jaarEen)}</span>
          </span>
          <span className="flex flex-col gap-1 bg-[#F6F5FB] px-4 py-4 sm:px-5">
            <span className="text-[13px]" style={{ color: BODY }}>{r.vervolgLabel}</span>
            <span className={`${kop} text-[28px] leading-none tracking-[-0.6px] tabular-nums sm:text-[34px]`} style={{ color: NAVY }}>{euroRond(v.vervolg)}</span>
          </span>
        </div>

        {r.jarenKop && (
          <figure className="m-0 flex flex-col gap-3">
            <figcaption className="flex flex-col gap-0.5 text-[13.5px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-3" style={{ color: BODY }}>
              <span className="font-bold" style={{ color: NAVY }}>{r.jarenKop}</span>
              <span>{r.totaalLabel} <strong className="whitespace-nowrap tabular-nums" style={{ color: NAVY }}>{euroRond(totaal)}</strong></span>
            </figcaption>
            <ol className="m-0 grid h-[118px] list-none grid-cols-5 items-end gap-2 p-0 sm:gap-3">
              {perJaar.map((b, i) => (
                <li key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="hidden text-[11.5px] font-bold tabular-nums sm:block" style={{ color: i === 0 ? PINK : NAVY }}>{euroRond(b)}</span>
                  <span className="block w-full rounded-t-[8px] transition-[height] duration-300"
                    style={{ height: `${Math.max(6, (b / hoogste) * 70)}px`, background: i === 0 ? PINK : "#C9C1EA" }} />
                  <span className="text-[11.5px]" style={{ color: MUTE }}>{r.jaarLabel} {i + 1}</span>
                </li>
              ))}
            </ol>
          </figure>
        )}

        {r.voetnoot && (
          <p className="m-0 border-t pt-4 text-[12.5px] leading-[1.5]" style={{ color: MUTE, borderColor: LINE }}>
            {vul(r.voetnoot, { tarief: euroTarief(tarief), jaar, pctJaarEen, pctVervolg })}
          </p>
        )}
      </div>
    </div>
  );
}
