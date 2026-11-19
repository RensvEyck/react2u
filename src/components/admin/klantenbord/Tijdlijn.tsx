"use client";
import Link from "next/link";
import { LuExternalLink, LuTrash2 } from "react-icons/lu";
import { bronHref, type TijdlijnRegel } from "@/lib/klanten";
import { datumLang, momentLang } from "@/lib/offertes";
import { BRON_ICOON, BRON_LABEL, GesprekIcoon, SiteIcoon, SOORT_LABEL } from "./bits";

/**
 * De tijdlijn van een klant: de regels uit de database (gesprekken, mails,
 * verplaatsingen, wat de modules melden, wijzigingen van de stamkaart) en de
 * sitebezoeken door elkaar, nieuwste eerst. Het zijpaneel op het bord en de
 * stamkaart tonen dezelfde lijst (`tijdlijnRegels` in lib/klanten.ts).
 */

export default function Tijdlijn({
  regels, onVerwijder, bezig, leeg,
}: {
  regels: TijdlijnRegel[];
  /** Een eigen regel (gesprek, mail, bezoek, notitie) weghalen; zonder deze prop geen prullenbakje. */
  onVerwijder?: (id: string) => void;
  bezig?: boolean;
  leeg?: string;
}) {
  if (regels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-center text-[13px] text-black/45">
        {leeg || "Nog niets vastgelegd. Het eerste gesprek komt hierboven; wat er in offertes, contracten en onboardings gebeurt verschijnt hier vanzelf."}
      </p>
    );
  }
  return (
    <ol className="space-y-1.5">
      {regels.map((r) => {
        if (r.sessie) {
          return (
            <li key={r.key} className="flex items-start gap-3 rounded-xl bg-[#f3f8ff] px-3 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6f2ff] text-[13px] text-[#0b6bcb]"><SiteIcoon /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-black/45"><span className="font-semibold text-[#0b6bcb]">Op de site</span> · {momentLang(r.sessie.start)}</p>
                <p className="text-[13.5px] text-[#1c1a4e]">{r.sessie.paginas.length} {r.sessie.paginas.length === 1 ? "pagina" : "pagina's"}: {r.sessie.paginas.slice(0, 4).map((p) => (p === "/" ? "home" : p.replace(/^\//, ""))).join(", ")}{r.sessie.paginas.length > 4 ? ", …" : ""}</p>
              </div>
            </li>
          );
        }
        const x = r.gesprek!;
        const systeem = x.soort === "status" || x.soort === "import" || x.soort === "systeem" || x.soort === "stamkaart";
        const stil = !x.contact;
        const Bron = x.bron ? BRON_ICOON[x.bron] : null;
        const href = bronHref(x.bron, x.bron_id);
        const door = !x.door ? null : x.door === "klant" ? "de klant" : x.door === "automatisch" ? "automatisch" : x.door.split("@")[0];
        return (
          <li key={r.key} className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 ${stil ? "text-black/50" : "bg-white shadow-[0_1px_2px_rgba(18,16,60,0.05)]"}`}>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] ${stil ? "bg-black/[0.04] text-black/40" : x.soort === "systeem" ? "bg-[#e6f2ff] text-[#0b6bcb]" : "bg-[#eef0ff] text-[#312e82]"}`}>
              {Bron ? <Bron /> : <GesprekIcoon soort={x.soort} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-black/45">
                <span className="font-semibold text-black/55">{x.bron ? BRON_LABEL[x.bron] : SOORT_LABEL[x.soort]}</span> · {datumLang(x.op)}{door ? ` · ${door}` : ""}
                {href && (
                  <>
                    {" · "}
                    <Link href={href} className="inline-flex items-center gap-0.5 font-semibold text-[#312e82] hover:underline">open <LuExternalLink className="text-[11px]" /></Link>
                  </>
                )}
              </p>
              <p className={`whitespace-pre-wrap text-[13.5px] ${stil ? "" : "text-[#1c1a4e]"}`}>{x.tekst}</p>
            </div>
            {!systeem && onVerwijder && (
              <button type="button" onClick={() => onVerwijder(x.id)} disabled={bezig} className="rounded-md p-1 text-black/25 opacity-0 transition hover:bg-[#fdeef4] hover:text-[#e0356b] focus:opacity-100 group-hover:opacity-100" aria-label="Deze regel verwijderen"><LuTrash2 className="text-[13px]" /></button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
