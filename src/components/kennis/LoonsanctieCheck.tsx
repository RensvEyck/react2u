"use client";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { CHECK_VRAGEN, RISICO_TEKST, uitkomst, type Antwoord } from "@/lib/loonsanctieCheck";
import { NAVY, BODY, MUTE, LINE, SOFT, kop, Pijl } from "@/components/blocks/Gedeeld";

/*
 * De loonsanctie-check: twaalf vragen, drie antwoorden, meteen een uitkomst.
 * De rekensom staat in lib/loonsanctieCheck.ts. Niets wordt opgeslagen of
 * verstuurd; de uitkomst is een eerste indruk, geen oordeel van UWV.
 */

const ANTWOORDEN: { waarde: Antwoord; label: string }[] = [
  { waarde: "ja", label: "Ja" },
  { waarde: "nee", label: "Nee" },
  { waarde: "onbekend", label: "Weet ik niet" },
];

const RISICO_KLEUR = { laag: { bg: "#E5F5F4", tekst: "#0B5F5A" }, verhoogd: { bg: "#FEF3E3", tekst: "#8A4300" }, hoog: { bg: "#FDECF4", tekst: "#A50F52" } } as const;

export default function LoonsanctieCheck() {
  const [antwoorden, setAntwoorden] = useState<Partial<Record<string, Antwoord>>>({});
  const [week, setWeek] = useState("");
  const [toon, setToon] = useState(false);
  const id = useId();
  const weekGetal = /^\d{1,3}$/.test(week) ? Number(week) : null;
  const u = useMemo(() => uitkomst(antwoorden, weekGetal), [antwoorden, weekGetal]);
  const actueel = CHECK_VRAGEN.filter((v) => !u.nogNiet.includes(v));
  const beantwoord = actueel.filter((v) => antwoorden[v.id]).length;
  const klaar = beantwoord === actueel.length;
  const kleur = RISICO_KLEUR[u.risico];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-[24px] border bg-white p-6 md:flex-row md:items-end md:gap-6 md:p-7" style={{ borderColor: LINE }}>
        <label htmlFor={`${id}-week`} className="flex flex-col gap-2 md:max-w-[320px]">
          <span className="text-[15px] font-bold" style={{ color: NAVY }}>Hoeveel weken is je werknemer ziek? <span className="font-normal" style={{ color: MUTE }}>(optioneel)</span></span>
          <input id={`${id}-week`} inputMode="numeric" value={week} onChange={(e) => setWeek(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Bijvoorbeeld 30"
            className="h-[56px] rounded-[14px] border bg-white px-4 text-[17px] outline-none transition-[border-color,box-shadow] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]" style={{ borderColor: LINE, color: NAVY }} />
        </label>
        <p className="m-0 text-[14.5px] leading-[1.6] md:pb-3" style={{ color: MUTE }}>Met de week erbij laten we de vragen weg die nog niet aan de orde zijn. {u.nogNiet.length > 0 && `Nu ${u.nogNiet.length} vragen nog niet aan de orde.`}</p>
      </div>

      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {actueel.map((v, i) => {
          const gekozen = antwoorden[v.id];
          return (
            <li key={v.id}>
              <fieldset className="flex flex-col gap-4 rounded-[22px] border bg-white p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6" style={{ borderColor: gekozen ? NAVY : LINE }}>
                <legend className="sr-only">Vraag {i + 1}</legend>
                <div className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold" style={{ background: SOFT, color: NAVY }}>{i + 1}</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[16.5px] font-bold leading-[1.35]" style={{ color: NAVY }}>{v.vraag}</span>
                    <span className="text-[14px] leading-[1.5]" style={{ color: MUTE }}>{v.waarom}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 md:pl-4" role="radiogroup" aria-label={v.vraag}>
                  {ANTWOORDEN.map((a) => {
                    const actief = gekozen === a.waarde;
                    return (
                      <label key={a.waarde} className={`hv-btn inline-flex min-h-[44px] cursor-pointer items-center rounded-full border-[1.5px] px-4 text-[14.5px] font-bold ${actief ? "" : "hover:bg-[#F6F5FB]"}`}
                        style={actief ? { background: NAVY, borderColor: NAVY, color: "#fff" } : { background: "#fff", borderColor: "#D9D8E6", color: NAVY }}>
                        <input type="radio" name={`${id}-${v.id}`} value={a.waarde} checked={actief} onChange={() => setAntwoorden({ ...antwoorden, [v.id]: a.waarde })} className="sr-only" />
                        {a.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-4 rounded-[24px] p-6 md:flex-row md:items-center md:justify-between md:p-7" style={{ background: SOFT }}>
        <span className="text-[15.5px]" style={{ color: BODY }}>{beantwoord} van {actueel.length} vragen beantwoord{!klaar && ". Een vraag die je overslaat telt als onbekend."}</span>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => setToon(true)} className="hv-btn hv-btn-roze inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Bekijk de uitkomst<Pijl /></button>
          {(toon || beantwoord > 0) && <button type="button" onClick={() => { setAntwoorden({}); setToon(false); }} className="hv-btn hv-btn-rand inline-flex h-[52px] items-center rounded-full px-5 text-[15px] font-bold">Opnieuw</button>}
        </div>
      </div>

      {toon && (
        <section aria-live="polite" aria-label="Uitkomst" className="flex flex-col gap-6 rounded-[28px] p-6 md:p-10" style={{ background: kleur.bg }}>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: kleur.tekst }}>Uitkomst · {u.score} van {u.max} punten</span>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[38px]`} style={{ color: NAVY }}>{RISICO_TEKST[u.risico].kop}</h2>
            <p className="m-0 max-w-[720px] text-[16.5px] leading-[1.65]" style={{ color: BODY }}>{RISICO_TEKST[u.risico].tekst}</p>
          </div>
          {u.zwak.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className={`${kop} m-0 text-[20px]`} style={{ color: NAVY }}>Wat ontbreekt of onzeker is, zwaarste eerst</h3>
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                {u.zwak.map((v) => (
                  <li key={v.id} className="flex flex-col gap-1.5 rounded-[18px] bg-white p-5">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[16px] font-bold leading-[1.35]" style={{ color: NAVY }}>{v.vraag}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.8px]" style={{ background: SOFT, color: MUTE }}>{v.antwoord === "nee" ? "Nee" : "Onbekend"} · weegt {v.gewicht}</span>
                    </span>
                    <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}><strong style={{ color: NAVY }}>Herstel:</strong> {v.herstel}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
            <span className="max-w-[560px] text-[15.5px] leading-[1.6]" style={{ color: BODY }}>Wil je dat iemand met je meekijkt? We beoordelen je dossier en zeggen eerlijk wat er nog moet gebeuren, ook als je nog geen klant bent.</span>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/kennismaken" className="hv-btn hv-btn-roze inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Laat ons meekijken<Pijl /></Link>
              <Link href="/loonsanctie" className="hv-btn hv-btn-rand inline-flex h-[52px] items-center gap-2.5 rounded-full px-5 text-[15px] font-bold">Lees de gids<Pijl size={14} /></Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
