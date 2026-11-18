import { LuLock } from "react-icons/lu";
import { weekevaluatieOpslaan } from "@/app/admin/weekevaluatieActions";
import { cijferTekst, SCHALEN, sluitOp, TEKSTVRAGEN, weekBereikDag, type Antwoorden } from "@/lib/weekevaluatie";
import { urenTekst } from "@/lib/uren";

/**
 * Het formulier van één week: vijf schalen van 1 tot 10 als rij knoppen (radio's
 * zonder JavaScript, `peer` doet de opmaak), vijf open vragen, en als de collega
 * aan een medewerker gekoppeld is zijn uren van die week uit de omzetmodule.
 * Gesloten weken tonen hetzelfde, maar dan alleen om te lezen.
 */

export type UrenVanWeek = { declarabel: number; afwezig: number; beschikbaar: number; procent: number | null; norm: number } | null;

export default function WeekevaluatieForm({
  week, antwoorden, open, bijgewerkt, uren,
}: {
  week: string;
  antwoorden: Antwoorden | null;
  /** Nog te wijzigen (deze of vorige week). */
  open: boolean;
  /** Wanneer de collega hem het laatst bewaarde, als tekst. */
  bijgewerkt: string | null;
  uren: UrenVanWeek;
}) {
  const a = antwoorden || {};
  const slot = sluitOp(week);
  return (
    <form action={weekevaluatieOpslaan} className="space-y-7">
      <input type="hidden" name="week" value={week} />

      <ol className="space-y-6">
        {SCHALEN.map((s, i) => {
          const waarde = a[s.sleutel];
          return (
            <li key={s.sleutel}>
              <fieldset disabled={!open} className="min-w-0">
                <legend className="flex items-baseline gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[12px] font-bold text-[#312e82]">{i + 1}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-[#1c1a4e]">{s.label}</span>
                    <span className="block text-[12.5px] text-black/45">{s.hint}</span>
                  </span>
                </legend>
                <div className="mt-3 pl-0 sm:pl-[34px]">
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5" role="radiogroup" aria-label={s.label}>
                    {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
                      <label key={n} className="relative block cursor-pointer">
                        <input
                          type="radio"
                          name={s.sleutel}
                          value={n}
                          defaultChecked={waarde === n}
                          required
                          className="peer sr-only"
                          aria-label={`${s.kort} ${n}`}
                        />
                        <span
                          className={`flex h-10 items-center justify-center rounded-lg border text-[14px] font-semibold tabular-nums transition sm:h-11 sm:rounded-xl sm:text-[15px] ${
                            open ? "border-black/[0.1] bg-white text-[#1c1a4e] hover:border-[#312e82]/50 hover:bg-[#f7f7fc]" : "border-black/[0.06] bg-[#fafafd] text-black/35"
                          } peer-checked:border-[#312e82] peer-checked:bg-[#312e82] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#e75387]/50 peer-focus-visible:ring-offset-1`}
                        >
                          {n}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11.5px] text-black/40">
                    <span>1 · {s.laag}</span>
                    <span>10 · {s.hoog}</span>
                  </div>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      {uren && (
        <div className="rounded-2xl bg-[#f6f2ec] px-5 py-4 text-[13.5px] text-black/60">
          <p className="font-semibold text-[#1c1a4e]">Jouw uren deze week, uit de urenregistratie</p>
          <p className="mt-0.5">
            {urenTekst(uren.declarabel)} declarabel{uren.afwezig ? `, ${urenTekst(uren.afwezig)} afwezig` : ""} van {urenTekst(uren.beschikbaar)} beschikbare uren
            {uren.procent !== null ? ` · ${uren.procent}% declarabel bij een norm van ${uren.norm}%` : ""}. Ter info, dit vul je niet zelf in.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {TEKSTVRAGEN.map((t, i) => (
          <div key={t.sleutel}>
            <label htmlFor={`we-${t.sleutel}`} className="flex items-baseline gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[12px] font-bold text-[#312e82]">{SCHALEN.length + i + 1}</span>
              <span>
                <span className="block text-[15px] font-semibold text-[#1c1a4e]">{t.label}</span>
                <span className="block text-[12.5px] text-black/45">{t.hint}</span>
              </span>
            </label>
            <div className="mt-2.5 sm:pl-[34px]">
              {open ? (
                <textarea
                  id={`we-${t.sleutel}`}
                  name={t.sleutel}
                  rows={3}
                  maxLength={2000}
                  defaultValue={a[t.sleutel] || ""}
                  placeholder={t.voorbeeld}
                  className="ainput min-h-[84px] resize-y text-[14.5px] leading-relaxed placeholder:text-black/30"
                />
              ) : (
                <p id={`we-${t.sleutel}`} className={`whitespace-pre-line rounded-xl px-4 py-3 text-[14.5px] leading-relaxed ${a[t.sleutel] ? "bg-[#fafafd] text-[#1c1a4e]" : "text-black/35"}`}>
                  {a[t.sleutel] || "Niet ingevuld."}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
        <p className="text-[13px] text-black/45">
          {open ? (
            <>
              {bijgewerkt ? `Bewaard op ${bijgewerkt}. ` : ""}
              Nog aan te passen tot en met zondag {weekBereikDag(slot)}.
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5"><LuLock className="text-[12px]" /> Deze week is gesloten{bijgewerkt ? `; bewaard op ${bijgewerkt}` : ""}.</span>
          )}
        </p>
        {open && <button className="abtn">{antwoorden ? "Wijzigingen bewaren" : "Weekevaluatie bewaren"}</button>}
      </div>
      {!open && antwoorden && (
        <p className="sr-only">Cijfers: {SCHALEN.map((s) => `${s.kort} ${cijferTekst(a[s.sleutel])}`).join(", ")}</p>
      )}
    </form>
  );
}
