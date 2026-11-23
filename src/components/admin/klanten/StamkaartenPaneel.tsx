"use client";
import { useState } from "react";
import { LuCircleCheck, LuDownload, LuFileSpreadsheet, LuX } from "react-icons/lu";
import type { Klant } from "@/lib/klanten";
import { klantenNaarRijen, stamkaartOverzicht } from "@/lib/stamkaart";
import { xlsx } from "@/lib/xlsx";
import KlantImport from "@/components/admin/klantenbord/KlantImport";
import type { ImportResultaat } from "@/app/admin/klantenActions";

/**
 * Boven de klantenlijst (Rens, 23 nov 2026: de stamkaart van alle klanten in
 * één keer vullen): hoe compleet de stamkaarten zijn, wat het vaakst
 * ontbreekt, en de weg om het aan te vullen: de lijst als Excel downloaden,
 * aanvullen, en weer inlezen (KlantImport, met een nieuw bedrijf als klant).
 * Zijn alle stamkaarten compleet, dan is het paneel één regel. Gestopte
 * klanten tellen niet mee: hun stamkaart hoeft niet meer af.
 */
const KORT: Record<string, string> = { "E-mailadres voor facturen": "Factuur-e-mail" };

export default function StamkaartenPaneel({ klanten: lijst, alle, vandaag }: { klanten: Klant[]; alle: Klant[]; vandaag: string }) {
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const klanten = lijst.filter((k) => k.status !== "inactief");
  const o = stamkaartOverzicht(klanten);
  const deel = o.totaal ? o.compleet / o.totaal : 0;
  const alles = o.totaal > 0 && o.compleet === o.totaal;

  function exporteer() {
    const url = URL.createObjectURL(new Blob([new Uint8Array(xlsx(klantenNaarRijen(klanten), "Klanten"))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Klanten React2u ${vandaag}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function klaar(r: ImportResultaat) {
    setOpen(false);
    if (r.ok && (r.stamkaarten || r.nieuw)) {
      setMelding([r.stamkaarten ? `${r.stamkaarten} ${r.stamkaarten === 1 ? "stamkaart" : "stamkaarten"} aangevuld` : "", r.nieuw ? `${r.nieuw} ${r.nieuw === 1 ? "nieuwe klant" : "nieuwe klanten"}` : ""].filter(Boolean).join(" en ") + ".");
    }
  }

  const knoppen = (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => { setMelding(null); setOpen(true); }} className="abtn"><LuFileSpreadsheet /> Vul aan uit Excel</button>
      <button type="button" onClick={exporteer} className="abtn-ghost" disabled={!klanten.length} title="Alle klanten met de velden van de stamkaart als kolommen">
        <LuDownload /> Exporteer naar Excel
      </button>
    </div>
  );

  return (
    <section className="acard overflow-hidden" aria-label="Stamkaarten">
      {alles ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <p className="flex items-center gap-2.5 text-[14px] text-[#1c1a4e]">
            <LuCircleCheck className="text-[18px] text-[#0a7a4b]" />
            <span><b>Alle {o.totaal} stamkaarten zijn compleet.</b> <span className="text-black/50">KvK, adres, contactpersoon en facturatie zijn bekend.</span></span>
          </p>
          {knoppen}
        </div>
      ) : (
        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-8">
          <div className="flex items-center gap-4">
            <Ring deel={deel} />
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Stamkaarten compleet</p>
              <p className="mt-0.5 font-heading text-[26px] font-bold leading-none text-[#1c1a4e]" data-stamkaarten-compleet={`${o.compleet}/${o.totaal}`}>
                {o.compleet} <span className="text-[16px] font-semibold text-black/40">van {o.totaal}</span>
              </p>
              <p className="mt-1 text-[12.5px] text-black/45">KvK, adres, contactpersoon en factuur-e-mail</p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-black/50">Ontbreekt het vaakst</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {o.ontbreekt.slice(0, 4).map((x) => (
                <li key={x.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <span className="truncate text-[13px] text-[#1c1a4e]">{KORT[x.label] || x.label}</span>
                  <span className="text-[12px] tabular-nums text-black/45">{x.aantal}</span>
                  <span className="col-span-2 h-1 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[#e0356b]/70" style={{ width: `${(x.aantal / o.totaal) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            {knoppen}
            <p className="text-[12px] text-black/45 lg:text-right">Download, vul aan in Excel, lees in. Alleen lege velden worden gevuld.</p>
          </div>
        </div>
      )}

      {melding && (
        <p role="status" className="flex items-center gap-2 border-t border-black/[0.06] bg-[#e3f6ed] px-5 py-2.5 text-[13.5px] font-semibold text-[#0a7a4b] sm:px-6">
          <LuCircleCheck className="shrink-0" /> <span className="flex-1">{melding}</span>
          <button type="button" onClick={() => setMelding(null)} className="rounded p-1 opacity-60 hover:opacity-100" aria-label="Melding sluiten"><LuX /></button>
        </p>
      )}

      {open && (
        <KlantImport bestaande={alle} vandaag={vandaag} nieuwAls="klant" titel="Stamkaarten aanvullen" exportKlanten={klanten} onClose={() => setOpen(false)} onKlaar={klaar} />
      )}
    </section>
  );
}

/** Hoeveel van de stamkaarten compleet is, als ring. */
function Ring({ deel }: { deel: number }) {
  const r = 26;
  const omtrek = 2 * Math.PI * r;
  const kleur = deel >= 1 ? "#0a7a4b" : deel >= 0.5 ? "#b86e00" : "#e0356b";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(13,13,40,0.07)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={kleur} strokeWidth="7" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - Math.max(deel, 0.02))} />
    </svg>
  );
}
