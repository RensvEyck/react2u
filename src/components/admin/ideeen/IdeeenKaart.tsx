import Link from "next/link";
import { LuArrowRight, LuLightbulb, LuPlus } from "react-icons/lu";
import { meldingTekst } from "@/lib/ideeen";
import type { IdeeenKort } from "@/lib/ideeenDb";

/**
 * Op het dashboard van Mijn React2u (0055): wat er deze week op het bord kwam,
 * wat van jou is opgepakt, en wat je nog niet las over je eigen ideeën.
 */
export default function IdeeenKaart({ kort }: { kort: IdeeenKort }) {
  const opgepakt = kort.mijnOpgepakt.length;
  return (
    <section className="acard p-6" id="ideeenbord" aria-labelledby="ideeenbord-kop">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="ideeenbord-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuLightbulb className="text-[16px] text-black/35" /> Ideeënbord
          </h2>
          <p className="mt-0.5 text-[13.5px] text-black/55" data-ideeen-samenvatting>
            <span className="font-semibold text-[#1c1a4e]">{kort.nieuw === 0 ? "Geen nieuwe ideeën" : kort.nieuw === 1 ? "1 nieuw idee" : `${kort.nieuw} nieuwe ideeën`}</span> deze week
            {" · "}
            {opgepakt === 0 ? "nog niets van jou opgepakt" : opgepakt === 1 ? "1 idee van jou opgepakt" : `${opgepakt} ideeën van jou opgepakt`}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-3 pt-0.5">
          <Link href="/admin/ideeen" className="flex items-center gap-1 text-[13px] font-semibold text-[#312e82] hover:underline">
            Het bord <LuArrowRight className="text-[13px]" />
          </Link>
          <Link href="/admin/ideeen#nieuw" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            <LuPlus className="text-[13px]" /> Idee indienen
          </Link>
        </span>
      </div>
      {kort.meldingen.length > 0 && (
        <div className="mt-4" id="ideeen-nieuw-voor-jou">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Nieuw voor jou</p>
          <ul className="space-y-2">
            {kort.meldingen.slice(0, 4).map((m) => {
              const t = meldingTekst(m, m.titel);
              return (
                <li key={m.id} className="text-[14px]">
                  <Link href={`/admin/ideeen/${m.idee_id}`} className="font-medium text-[#1c1a4e] hover:underline">{t.kop}</Link>
                  {t.sub && <span className="block text-[12.5px] text-black/45">{t.sub}</span>}
                </li>
              );
            })}
          </ul>
          {kort.meldingen.length > 4 && <p className="mt-1.5 text-[12.5px] text-black/40">En nog {kort.meldingen.length - 4}.</p>}
        </div>
      )}
    </section>
  );
}
