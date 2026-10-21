"use client";
import { useState } from "react";
import { euroRond, euroTarief, partnerVergoeding } from "@/lib/partners";
import { vul } from "@/lib/taal";
import { NAVY, BODY, MUTE, LINE, LAV, kop } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Het rekenvoorbeeld op /partners, in de vorm van de kaarten op de
 * dienstpagina's (rand, zachte schaduw): links de twee schuiven, rechts op de
 * tint de vergoeding in jaar één en daarna, met per jaar een staaf voor de
 * eerste vijf jaar. Tarief en percentages komen uit de blokdata; de voetnoot
 * noemt ze met {tarief}, {jaar}, {pctJaarEen} en {pctVervolg}.
 */

const JAREN = 5;

function Schuif({ id, label, waarde, min, max, stap, onChange }: {
  id: string; label: string; waarde: number; min: number; max: number; stap: number; onChange: (n: number) => void;
}) {
  const vol = ((waarde - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4 text-[16px] font-bold" style={{ color: NAVY }}>
        <span>{label}</span>
        <span className={`${kop} text-[26px] tabular-nums`}>{waarde}</span>
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
    <div className="grid overflow-hidden rounded-[28px] border bg-white lg:grid-cols-2"
      style={{ borderColor: LINE, boxShadow: "0 1px 2px rgba(46,42,126,0.04), 0 24px 48px -36px rgba(46,42,126,0.35)" }}>
      <div className="flex flex-col gap-7 p-6 md:p-10">
        <div className="flex flex-col gap-2">
          <h3 className={`${kop} m-0 text-[22px] leading-[1.2] tracking-[-0.4px] md:text-[24px]`} style={{ color: NAVY }}>{r.kop}</h3>
          {r.tekst && <p className="m-0 text-[16px] leading-[1.6]" style={{ color: BODY }}>{r.tekst}</p>}
        </div>
        <div className="flex flex-col gap-6 border-t pt-6" style={{ borderColor: LINE }}>
          <Schuif id="partner-klanten" label={r.klantenLabel} waarde={klanten} min={1} max={50} stap={1} onChange={setKlanten} />
          <Schuif id="partner-medewerkers" label={r.medewerkersLabel} waarde={medewerkers} min={5} max={250} stap={5} onChange={setMedewerkers} />
        </div>
        {r.voetnoot && (
          <p className="m-0 mt-auto text-[13.5px] leading-[1.6]" style={{ color: MUTE }}>
            {vul(r.voetnoot, { tarief: euroTarief(tarief), jaar, pctJaarEen, pctVervolg })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-7 p-6 md:p-10" style={{ background: LAV }}>
        <div aria-live="polite" className="grid grid-cols-2 items-end gap-5">
          <span className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>{r.jaarEenLabel}</span>
            <span className={`${kop} whitespace-nowrap text-[34px] leading-none tracking-[-1px] tabular-nums md:text-[44px] md:tracking-[-1.3px]`} style={{ color: NAVY }}>{euroRond(v.jaarEen)}</span>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>{r.vervolgLabel}</span>
            <span className={`${kop} whitespace-nowrap text-[34px] leading-none tracking-[-1px] tabular-nums md:text-[44px] md:tracking-[-1.3px]`} style={{ color: NAVY }}>{euroRond(v.vervolg)}</span>
          </span>
        </div>
        {r.jarenKop && (
          <figure className="m-0 flex flex-1 flex-col gap-4 rounded-[20px] bg-white p-5 md:p-6">
            <figcaption className="text-[15px] font-bold" style={{ color: NAVY }}>{r.jarenKop}</figcaption>
            <ol className="m-0 mt-auto grid h-[150px] list-none grid-cols-5 items-end gap-2 p-0 sm:gap-3">
              {perJaar.map((b, i) => (
                <li key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="hidden whitespace-nowrap text-[12px] font-bold tabular-nums sm:block" style={{ color: NAVY }}>{euroRond(b)}</span>
                  <span className="block w-full rounded-t-[8px] transition-[height] duration-300"
                    style={{ height: `${Math.max(6, (b / hoogste) * 96)}px`, background: NAVY, opacity: i === 0 ? 1 : 0.35 }} />
                  <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{r.jaarLabel} {i + 1}</span>
                </li>
              ))}
            </ol>
            <div className="flex items-baseline justify-between gap-3 border-t pt-4" style={{ borderColor: LINE }}>
              <span className="text-[15px]" style={{ color: BODY }}>{r.totaalLabel}</span>
              <span className={`${kop} whitespace-nowrap text-[22px] tabular-nums md:text-[24px]`} style={{ color: NAVY }}>{euroRond(totaal)}</span>
            </div>
          </figure>
        )}
      </div>
    </div>
  );
}
