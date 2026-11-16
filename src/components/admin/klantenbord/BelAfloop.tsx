"use client";
import { useEffect, useState, useTransition } from "react";
import { LuPhone, LuPhoneOff, LuThumbsDown, LuX } from "react-icons/lu";
import { openBel, wisBel, type Bel } from "@/lib/belAfloop";
import type { Gesprek, Klant } from "@/lib/klanten";
import { morgen } from "@/lib/werkrij";
import { voegGesprekToe, zetKlantStatus } from "@/app/admin/klantenActions";

/**
 * "Je belde net …, wat is er afgesproken?" Komt omhoog zodra je terug bent in
 * de browser nadat je op een telefoonnummer tikte (lib/belAfloop.ts). Drie
 * knoppen: niet bereikt (morgen opnieuw), gesproken (kort wat en de volgende
 * stap), geen interesse (de kaart naar inactief). Zonder dit typt niemand na
 * een telefoontje in de auto nog iets in.
 */
export default function BelAfloop({ vandaag, onKlant }: { vandaag: string; onKlant: (k: Klant, g?: Gesprek | null) => void }) {
  const [bel, setBel] = useState<Bel | null>(null);
  const [vorm, setVorm] = useState(false);
  const [tekst, setTekst] = useState("");
  const [vervolg, setVervolg] = useState("");
  const [vervolgOp, setVervolgOp] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();

  useEffect(() => {
    const kijk = () => {
      if (document.visibilityState !== "visible") return;
      const b = openBel();
      if (b) setBel(b);
    };
    kijk();
    document.addEventListener("visibilitychange", kijk);
    window.addEventListener("focus", kijk);
    window.addEventListener("pageshow", kijk);
    return () => {
      document.removeEventListener("visibilitychange", kijk);
      window.removeEventListener("focus", kijk);
      window.removeEventListener("pageshow", kijk);
    };
  }, []);

  if (!bel) return null;
  const sluit = () => {
    wisBel();
    setBel(null);
    setVorm(false);
    setTekst("");
    setVervolg("");
    setVervolgOp("");
    setFout(null);
  };
  const doe = (fn: () => Promise<{ ok: boolean; fout?: string; klant?: Klant; gesprek?: Gesprek | null }>) => {
    setFout(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) return setFout(r.fout || "Er ging iets mis.");
      if (r.klant) onKlant(r.klant, r.gesprek ?? null);
      sluit();
    });
  };
  const wie = bel.naam ? `${bel.naam} (${bel.bedrijf})` : bel.bedrijf;

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="kb-bel-titel" className="kb-bel fixed inset-x-3 bottom-3 z-[95] mx-auto max-w-[560px] rounded-[18px] border border-black/[0.08] bg-white p-4 shadow-[0_20px_60px_-20px_rgba(18,16,60,0.5)] sm:inset-x-6 sm:bottom-6 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[16px] text-[#312e82]"><LuPhone /></span>
          <div>
            <p id="kb-bel-titel" className="text-[15px] font-bold text-[#1c1a4e]">Je belde net {wie}</p>
            <p className="text-[13px] text-black/50">Wat is er afgesproken?</p>
          </div>
        </div>
        <button type="button" onClick={sluit} className="rounded-lg p-1.5 text-black/40 hover:bg-black/[0.05] hover:text-[#1c1a4e]" aria-label="Sluiten"><LuX /></button>
      </div>
      {fout && <p className="mt-3 rounded-xl bg-[#fdeef4] px-3 py-2 text-[13px] font-semibold text-[#e0356b]" role="alert">{fout}</p>}
      {!vorm ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={bezig}
            onClick={() => doe(() => voegGesprekToe(bel.id, { soort: "gesprek", tekst: "Niet bereikt", volgende_actie: "Opnieuw bellen", volgende_actie_op: morgen(vandaag) }))}
            className="abtn-ghost justify-center !py-2.5 text-[13.5px]"
          >
            <LuPhoneOff /> Niet bereikt
          </button>
          <button type="button" disabled={bezig} onClick={() => { setVorm(true); setVervolgOp(morgen(vandaag)); }} className="abtn justify-center !py-2.5 text-[13.5px]">
            <LuPhone /> Gesproken
          </button>
          <button
            type="button"
            disabled={bezig}
            onClick={() =>
              doe(async () => {
                const r = await voegGesprekToe(bel.id, { soort: "gesprek", tekst: "Geen interesse", volgende_actie: null, volgende_actie_op: null, status: "inactief" });
                if (!r.ok) return r;
                const s = await zetKlantStatus(bel.id, "inactief");
                return s.ok ? { ok: true, klant: s.klant, gesprek: r.gesprek } : s;
              })
            }
            className="abtn-ghost justify-center !py-2.5 text-[13.5px]"
          >
            <LuThumbsDown /> Geen interesse
          </button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tekst.trim() && !vervolg) return;
            doe(() => voegGesprekToe(bel.id, { soort: "gesprek", tekst, volgende_actie: vervolg || null, volgende_actie_op: vervolg ? vervolgOp || null : null }));
          }}
        >
          <textarea className="ainput !py-2 font-sans !text-[14px]" rows={2} value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Kort wat er besproken is" autoFocus />
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
            <input className="ainput !py-2 !text-[14px]" value={vervolg} onChange={(e) => setVervolg(e.target.value)} placeholder="Volgende stap" aria-label="Volgende stap" />
            <input className="ainput !py-2 !text-[14px]" type="date" value={vervolgOp} onChange={(e) => setVervolgOp(e.target.value)} aria-label="Datum" />
            <button className="abtn !py-2 text-[13.5px] disabled:opacity-40" disabled={bezig || (!tekst.trim() && !vervolg)}>Vastleggen</button>
          </div>
        </form>
      )}
    </div>
  );
}
