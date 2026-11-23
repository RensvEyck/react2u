"use client";
import { useState } from "react";

/**
 * De bediening van de kaart: de lagen Klanten en Werkgebied aan of uit, en een
 * casemanager uitlichten door op de naam te klikken (de rest verbleekt). De
 * kaart zelf komt als children van de server; dit zet alleen data-attributen,
 * de CSS doet de rest. Zo blijft de kaart zonder JavaScript gewoon zichtbaar.
 */
export default function KaartLagen({
  casemanagers, children,
}: {
  casemanagers: { naam: string; kleur: string; klanten: number; werknemers: number; gemeenten: number }[];
  children: React.ReactNode;
}) {
  const [klanten, setKlanten] = useState(true);
  const [werkgebied, setWerkgebied] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);

  const schakelaar = (aan: boolean, zet: (v: boolean) => void, label: string, id: string) => (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#1c1a4e]" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={aan} onChange={(e) => zet(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={`relative h-5 w-9 rounded-full transition-colors peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#e75387]/25 ${aan ? "bg-[#312e82]" : "bg-black/20"}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${aan ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </label>
  );

  return (
    <div
      className="kaart-lagen grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      data-klanten={klanten ? "aan" : "uit"}
      data-werkgebied={werkgebied ? "aan" : "uit"}
      data-focus={focus ?? ""}
    >
      <style>{`
        .kaart-lagen[data-klanten="uit"] .laag-klanten, .kaart-lagen[data-werkgebied="uit"] .laag-werkgebied { display: none; }
        .kaart-lagen .kaart-punt, .kaart-lagen .kaart-vlak { transition: opacity .15s; }
        ${casemanagers.map((_, i) => `.kaart-lagen[data-focus="${i}"] .kaart-punt:not([data-cm="${i}"]), .kaart-lagen[data-focus="${i}"] .kaart-vlak:not([data-cm="${i}"]) { opacity: .12; }`).join("\n")}
        .kaart-lagen .kaart-punt:hover { stroke-width: 20; }
      `}</style>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2" aria-label="Lagen op de kaart" role="group">
          {schakelaar(klanten, setKlanten, "Klanten", "laag-klanten")}
          {schakelaar(werkgebied, setWerkgebied, "Werkgebied", "laag-werkgebied")}
        </div>
        {children}
      </div>
      <div className="min-w-0">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Per casemanager</p>
        {casemanagers.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Nog geen klant heeft een casemanager op de stamkaart.</p>
        ) : (
          <ul className="space-y-1.5" id="kaart-legenda">
            {casemanagers.map((c, i) => {
              const aan = focus === i;
              return (
                <li key={c.naam}>
                  <button
                    type="button"
                    aria-pressed={aan}
                    onClick={() => setFocus(aan ? null : i)}
                    className={`flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors ${aan ? "bg-[#eef0ff] ring-1 ring-[#312e82]/20" : "hover:bg-black/[0.03]"}`}
                    data-cm-naam={c.naam}
                  >
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: c.kleur }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[#1c1a4e]">{c.naam}</span>
                      <span className="block text-[12.5px] tabular-nums text-black/50">
                        {c.klanten} {c.klanten === 1 ? "klant" : "klanten"} · {c.werknemers} werknemers · {c.gemeenten} {c.gemeenten === 1 ? "gemeente" : "gemeenten"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {focus !== null && (
          <button type="button" onClick={() => setFocus(null)} className="mt-2 text-[12.5px] font-semibold text-[#312e82] hover:underline">Iedereen tonen</button>
        )}
      </div>
    </div>
  );
}
