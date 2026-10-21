"use client";
import { useState } from "react";
import { euroRond, euroTarief, partnerVergoeding } from "@/lib/partners";
import { vul } from "@/lib/taal";
import { NAVY, BODY, kop } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Het rekenvoorbeeld in de kop van /partners: twee schuiven, en de vergoeding
 * in jaar één en daarna. Tarief en percentages komen uit de blokdata, het
 * tarievenjaar uit de instellingen; de voetnoot noemt ze met {tarief}, {jaar},
 * {pctJaarEen} en {pctVervolg}.
 */

function Schuif({ id, label, waarde, min, max, stap, onChange }: {
  id: string; label: string; waarde: number; min: number; max: number; stap: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4 text-[15px] font-bold md:text-[16px]" style={{ color: NAVY }}>
        <span>{label}</span>
        <span className={`${kop} text-[26px] tabular-nums md:text-[28px]`}>{waarde}</span>
      </label>
      <input id={id} type="range" className="partner-schuif" min={min} max={max} step={stap} value={waarde}
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

  return (
    <div className="relative flex flex-col gap-7 overflow-hidden rounded-[28px] px-6 py-8 md:rounded-[40px] md:px-11 md:pb-10 md:pt-11" style={{ background: "#D9D3F0" }}>
      <span aria-hidden className="absolute right-[-110px] top-[-110px] h-[320px] w-[320px] rounded-full" style={{ background: "#C9C1EA" }} />
      <div className="relative flex flex-col gap-1.5">
        <h2 className={`${kop} m-0 text-[24px] leading-[1.2] md:text-[26px]`} style={{ color: NAVY }}>{r.kop}</h2>
        {r.tekst && <p className="m-0 text-[15px] leading-[1.55]" style={{ color: BODY }}>{r.tekst}</p>}
      </div>
      <div className="relative flex flex-col gap-[22px]">
        <Schuif id="partner-klanten" label={r.klantenLabel} waarde={klanten} min={1} max={50} stap={1} onChange={setKlanten} />
        <Schuif id="partner-medewerkers" label={r.medewerkersLabel} waarde={medewerkers} min={5} max={250} stap={5} onChange={setMedewerkers} />
      </div>
      <div aria-live="polite" className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[24px] px-6 py-6 text-white md:rounded-[28px] md:px-8 md:py-7" style={{ background: NAVY }}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] text-white/75">{r.jaarEenLabel}</span>
          <span className={`${kop} whitespace-nowrap text-[44px] leading-none tracking-[-1px] tabular-nums md:text-[52px]`}>{euroRond(v.jaarEen)}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] text-white/75">{r.vervolgLabel}</span>
          <span className={`${kop} whitespace-nowrap text-[26px] leading-[1.1] tabular-nums md:text-[28px]`}>{euroRond(v.vervolg)} {r.perJaar}</span>
        </span>
      </div>
      {r.voetnoot && (
        <p className="relative m-0 text-[13px] leading-[1.5]" style={{ color: BODY }}>
          {vul(r.voetnoot, { tarief: euroTarief(tarief), jaar, pctJaarEen, pctVervolg })}
        </p>
      )}
    </div>
  );
}
