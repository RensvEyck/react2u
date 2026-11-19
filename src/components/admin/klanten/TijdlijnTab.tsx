"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuExternalLink, LuSend } from "react-icons/lu";
import { GESPREK_SOORTEN, type GesprekSoort, type TijdlijnRegel } from "@/lib/klanten";
import { verwijderGesprek, voegGesprekToe } from "@/app/admin/klantenActions";
import { GesprekIcoon } from "@/components/admin/klantenbord/bits";
import Tijdlijn from "@/components/admin/klantenbord/Tijdlijn";

/**
 * Het tabblad Tijdlijn: dezelfde tijdlijn als het zijpaneel op het bord (de
 * gesprekken, wat de modules melden, de wijzigingen van de stamkaart en het
 * sitebezoek), met een kort formulier om een gesprek vast te leggen. De
 * volgende stap en de kolom wijzig je op het bord.
 */
export default function TijdlijnTab({ klantId, regels, vandaag }: { klantId: string; regels: TijdlijnRegel[]; vandaag: string }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [soort, setSoort] = useState<GesprekSoort>("gesprek");
  const [op, setOp] = useState(vandaag);
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);

  const legVast = () => {
    setFout(null);
    start(async () => {
      const r = await voegGesprekToe(klantId, { soort, op, tekst });
      if (!r.ok) return setFout(r.fout);
      setTekst("");
      setOp(vandaag);
      router.refresh();
    });
  };
  const verwijder = (id: string) => {
    setFout(null);
    start(async () => {
      const r = await verwijderGesprek(klantId, id);
      if (!r.ok) return setFout(r.fout);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section className="acard p-4 sm:p-5" aria-labelledby="kl-tijdlijn">
        <h2 id="kl-tijdlijn" className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Tijdlijn</h2>
        <Tijdlijn regels={regels} onVerwijder={verwijder} bezig={bezig} />
      </section>
      <aside className="acard p-4 sm:p-5 lg:sticky lg:top-24" aria-labelledby="kl-vastleggen">
        <h2 id="kl-vastleggen" className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Gesprek vastleggen</h2>
        <form onSubmit={(e) => { e.preventDefault(); legVast(); }} className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Soort contact">
            {GESPREK_SOORTEN.map((x) => (
              <button key={x.key} type="button" role="radio" aria-checked={soort === x.key} onClick={() => setSoort(x.key)} className={`apill !py-1.5 text-[12.5px] ${soort === x.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}>
                <GesprekIcoon soort={x.key} className="text-[12px]" /> {x.label}
              </button>
            ))}
          </div>
          <div>
            <label className="alabel" htmlFor="kl-op">Op</label>
            <input id="kl-op" type="date" className="ainput !py-2 !text-[14px]" value={op} max={vandaag} onChange={(e) => setOp(e.target.value)} />
          </div>
          <div>
            <label className="alabel" htmlFor="kl-tekst">Wat is er besproken of afgesproken?</label>
            <textarea
              id="kl-tekst"
              className="ainput min-h-[96px] !py-2 !text-[14px]"
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") legVast(); }}
              placeholder="Kort en concreet; de volgende stap zet je op het bord"
            />
          </div>
          {fout && <p role="alert" className="text-[13px] font-semibold text-[#e0356b]">{fout}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="submit" disabled={bezig || !tekst.trim()} className="abtn !py-1.5 text-[13px] disabled:opacity-50"><LuSend /> {bezig ? "Bezig…" : "Vastleggen"}</button>
            <Link href={`/admin/klantenbord#klant-${klantId}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline">Volgende stap op het bord <LuExternalLink className="text-[11px]" /></Link>
          </div>
        </form>
      </aside>
    </div>
  );
}
