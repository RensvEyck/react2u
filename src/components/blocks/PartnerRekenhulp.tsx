"use client";
import { useState } from "react";
import { euroRond, euroTarief, partnerVergoeding } from "@/lib/partners";
import { vul } from "@/lib/taal";
import { NAVY, BODY, MUTE, LINE, kop } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Het rekenvoorbeeld op /partners, in de vorm van de prijskaarten van de site:
 * een witte kaart met links de twee schuiven en rechts een indigo vlak (zoals
 * de uitgelichte prijskaart) met de vergoeding in jaar één, daarna, en per jaar
 * een staaf voor de eerste vijf jaar. Tarief en percentages komen uit de
 * blokdata; de voetnoot noemt ze met {tarief}, {jaar}, {pctJaarEen} en
 * {pctVervolg}.
 */

const JAREN = 5;

function Schuif({ id, label, waarde, min, max, stap, onChange }: {
  id: string; label: string; waarde: number; min: number; max: number; stap: number; onChange: (n: number) => void;
}) {
  const vol = ((waarde - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4 text-[15px] font-bold" style={{ color: NAVY }}>
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
    <div className="grid overflow-hidden rounded-[26px] border bg-white lg:grid-cols-2" style={{ borderColor: LINE }}>
      <div className="flex flex-col gap-7 p-6 md:p-10">
        <div className="flex flex-col gap-1.5">
          <h3 className={`${kop} m-0 text-[21px]`} style={{ color: NAVY }}>{r.kop}</h3>
          {r.tekst && <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{r.tekst}</p>}
        </div>
        <div className="flex flex-col gap-6">
          <Schuif id="partner-klanten" label={r.klantenLabel} waarde={klanten} min={1} max={50} stap={1} onChange={setKlanten} />
          <Schuif id="partner-medewerkers" label={r.medewerkersLabel} waarde={medewerkers} min={5} max={250} stap={5} onChange={setMedewerkers} />
        </div>
        {r.voetnoot && (
          <p className="m-0 mt-auto border-t pt-5 text-[13.5px] leading-[1.55]" style={{ color: MUTE, borderColor: LINE }}>
            {vul(r.voetnoot, { tarief: euroTarief(tarief), jaar, pctJaarEen, pctVervolg })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-7 p-6 text-white md:p-10" style={{ background: NAVY }}>
        <div aria-live="polite" className="grid grid-cols-2 gap-5 border-b pb-6" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          <span className="flex flex-col gap-1">
            <span className="text-[14px] text-white/70">{r.jaarEenLabel}</span>
            <span className={`${kop} text-[32px] leading-none tracking-[-0.8px] tabular-nums sm:text-[44px] sm:tracking-[-1.2px]`}>{euroRond(v.jaarEen)}</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[14px] text-white/70">{r.vervolgLabel}</span>
            <span className={`${kop} text-[32px] leading-none tracking-[-0.8px] tabular-nums sm:text-[44px] sm:tracking-[-1.2px]`}>{euroRond(v.vervolg)}</span>
          </span>
        </div>
        {r.jarenKop && (
          <figure className="m-0 flex flex-1 flex-col gap-4">
            <figcaption className="flex flex-col gap-0.5 text-[14px] text-white/70 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <span className="font-bold text-white">{r.jarenKop}</span>
              <span>{r.totaalLabel} <strong className="whitespace-nowrap tabular-nums text-white">{euroRond(totaal)}</strong></span>
            </figcaption>
            <ol className="m-0 mt-auto grid h-[150px] list-none grid-cols-5 items-end gap-2 p-0 sm:gap-3">
              {perJaar.map((b, i) => (
                <li key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="hidden text-[12px] font-bold tabular-nums text-white sm:block">{euroRond(b)}</span>
                  <span className="block w-full rounded-t-[8px] transition-[height] duration-300"
                    style={{ height: `${Math.max(6, (b / hoogste) * 96)}px`, background: i === 0 ? "#ffffff" : "rgba(255,255,255,0.32)" }} />
                  <span className="text-[12px] text-white/70">{r.jaarLabel} {i + 1}</span>
                </li>
              ))}
            </ol>
          </figure>
        )}
      </div>
    </div>
  );
}
