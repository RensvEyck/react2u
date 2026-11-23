import Link from "next/link";
import { LuArrowRight, LuPlus, LuUserRoundCheck } from "react-icons/lu";
import { collegaBij, standTekst, voornaamVan, type Waarneming } from "@/lib/waarneming";
import type { WaarnemingKort } from "@/lib/waarnemingDb";

/**
 * Op het dashboard (0060): waar jij nu of binnenkort voor waarneemt, wie er
 * voor jou is als je er niet bent, en voor het beheer wat nog te regelen is.
 * In Mijn React2u staat de kaart altijd; in Beheer alleen als er iets speelt.
 */
export default function WaarnemingKaart({ kort, vandaag, userId }: { kort: WaarnemingKort; vandaag: string; userId: string }) {
  const naam = (id: string | null, email: string | null) => voornaamVan(collegaBij(id, kort.collegas, email), email);
  const samenvatting = kort.ikNeemWaar[0]
    ? <><span className="font-semibold text-[#1c1a4e]">Je neemt waar voor {naam(kort.ikNeemWaar[0].afwezige, kort.ikNeemWaar[0].afwezige_email)}</span> · {standTekst(kort.ikNeemWaar[0], vandaag)}</>
    : kort.voorMij[0]
      ? kort.voorMij[0].waarnemer
        ? <><span className="font-semibold text-[#1c1a4e]">{naam(kort.voorMij[0].waarnemer, kort.voorMij[0].waarnemer_email)} neemt voor je waar</span> · {standTekst(kort.voorMij[0], vandaag)}</>
        : <><span className="font-semibold text-[#b86e00]">Nog geen waarnemer</span> voor je afwezigheid {standTekst(kort.voorMij[0], vandaag)}</>
      : <><span className="font-semibold text-[#1c1a4e]">{kort.afwezigNu === 0 ? "Iedereen is er vandaag" : kort.afwezigNu === 1 ? "1 collega is er vandaag niet" : `${kort.afwezigNu} collega's zijn er vandaag niet`}</span></>;
  const Regel = ({ w, wie }: { w: Waarneming; wie: "afwezige" | "waarnemer" }) => (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
      <Link href={`/admin/waarneming/${w.id}`} className="min-w-0 text-[#1c1a4e] hover:underline">
        {wie === "afwezige" ? naam(w.afwezige, w.afwezige_email) : w.waarnemer ? naam(w.waarnemer, w.waarnemer_email) : <span className="font-semibold text-[#b86e00]">nog geen waarnemer</span>}
      </Link>
      <span className="shrink-0 text-[12px] text-black/40">{standTekst(w, vandaag)}</span>
    </li>
  );
  return (
    <section className="acard p-6" id="waarneming" aria-labelledby="waarneming-kop">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="waarneming-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuUserRoundCheck className="text-[16px] text-black/35" /> Waarneming
          </h2>
          <p className="mt-0.5 text-[13.5px] text-black/55" data-waarneming-samenvatting>{samenvatting}</p>
        </div>
        <span className="flex flex-wrap items-center gap-3 pt-0.5">
          <Link href="/admin/waarneming" className="flex items-center gap-1 text-[13px] font-semibold text-[#312e82] hover:underline">
            Wie is er <LuArrowRight className="text-[13px]" />
          </Link>
          <Link href="/admin/waarneming#nieuw" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            <LuPlus className="text-[13px]" /> Ik ben er even niet
          </Link>
        </span>
      </div>
      {kort.ikNeemWaar.length > 0 && (
        <div className="mt-4" id="waarneming-ik">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Jij neemt waar voor</p>
          <ul className="space-y-1.5">{kort.ikNeemWaar.slice(0, 4).map((w) => <Regel key={w.id} w={w} wie="afwezige" />)}</ul>
        </div>
      )}
      {kort.voorMij.length > 0 && (
        <div className="mt-4" id="waarneming-voor-mij">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Als jij er niet bent</p>
          <ul className="space-y-1.5">{kort.voorMij.slice(0, 4).map((w) => <Regel key={w.id} w={w} wie="waarnemer" />)}</ul>
        </div>
      )}
      {kort.teRegelen.filter((w) => w.afwezige !== userId).length > 0 && (
        <div className="mt-4" id="waarneming-te-regelen-kort">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#b86e00]">Nog te regelen</p>
          <ul className="space-y-1.5">{kort.teRegelen.filter((w) => w.afwezige !== userId).slice(0, 4).map((w) => <Regel key={w.id} w={w} wie="afwezige" />)}</ul>
        </div>
      )}
    </section>
  );
}

