import { LuShieldAlert } from "react-icons/lu";
import { overlegNotulenBewaren } from "@/app/admin/overlegActions";
import { DOSSIERS_REGEL, isCheckIn, isDossiers, sorteerAgenda, type Aanwezige, type Agendapunt, type Notulen } from "@/lib/overleg";

/**
 * De notulen van het CM-overleg in de vorm van het team (voorbeeld "CM overleg
 * 18-11"): gegevens, agenda, per punt wat er besproken is, actie en gemaakte
 * afspraken, en de punten voor het volgende overleg. NotulenWeergave leest
 * (archief, na afloop); NotulenFormulier is voor de notulist en het beheer.
 */

const kop = "font-heading text-[15px] font-bold text-[#312e82]";

export function NotulenWeergave({ n, overigeNotities }: { n: Notulen; overigeNotities?: string | null }) {
  return (
    <div className="space-y-6" id="notulen-weergave">
      <section aria-labelledby="n-gegevens">
        <h2 id="n-gegevens" className={kop}>Gegevens</h2>
        <dl className="mt-2 grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className="text-black/45">Datum</dt><dd className="text-[#1c1a4e]">{n.gegevens.datum}</dd>
          <dt className="text-black/45">Tijd</dt><dd className="text-[#1c1a4e]">{n.gegevens.tijd}</dd>
          {n.gegevens.locatie && (<><dt className="text-black/45">Waar</dt><dd className="text-[#1c1a4e]">{n.gegevens.locatie}</dd></>)}
          <dt className="text-black/45">Aanwezig</dt><dd className="text-[#1c1a4e]">{n.gegevens.aanwezig.join(", ") || "–"}</dd>
          <dt className="text-black/45">Notulist</dt><dd className="text-[#1c1a4e]">{n.gegevens.notulist || "–"}</dd>
        </dl>
      </section>

      <section aria-labelledby="n-agenda">
        <h2 id="n-agenda" className={kop}>Agenda</h2>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[14px] text-[#1c1a4e]">
          {n.structureel.map((t) => <li key={t}>{t}</li>)}
        </ol>
        {(n.uitVorig.length > 0 || n.nieuw.length > 0) && (
          <div className="mt-2 text-[14px] text-[#1c1a4e]">
            <p className="font-semibold">Wat ter tafel komt</p>
            {n.uitVorig.length > 0 && <p className="text-black/60">Uit vorig overleg: {n.uitVorig.map((x) => x.titel).join("; ")}</p>}
            {n.nieuw.length > 0 && <p className="text-black/60">Nieuw: {n.nieuw.map((x) => x.titel).join("; ")}</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="n-notulen">
        <h2 id="n-notulen" className={kop}>Notulen</h2>
        <div className="mt-2 divide-y divide-black/[0.06]">
          {n.delen.map((d) => (
            <div key={d.titel} className="py-3" data-deel={d.titel}>
              <p className="text-[14.5px] font-semibold text-[#1c1a4e]">
                {d.titel}
                {d.inbrenger && <span className="ml-2 text-[12px] font-normal text-black/40">ingebracht door {d.inbrenger}</span>}
              </p>
              {d.regels.length === 0 ? (
                <p className="text-[13.5px] text-black/40">Niets genoteerd.</p>
              ) : (
                d.regels.map((r, i) => (
                  <p key={i} className="mt-1 whitespace-pre-line text-[14px] leading-[1.6] text-black/70">
                    {r.wie && <span className="font-semibold text-[#1c1a4e]">{r.wie}: </span>}
                    {r.tekst}
                  </p>
                ))
              )}
            </div>
          ))}
          {overigeNotities && (
            <div className="py-3">
              <p className="text-[14.5px] font-semibold text-[#1c1a4e]">Overige notities</p>
              <p className="mt-1 whitespace-pre-line text-[14px] leading-[1.6] text-black/70">{overigeNotities}</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="n-acties">
        <h2 id="n-acties" className={kop}>Actie en gemaakte afspraken</h2>
        {n.acties.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-black/45">Geen actiepunten.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.08]"><th className="py-2 pr-3 font-semibold">Actie</th><th className="px-3 py-2 font-semibold">Door</th><th className="py-2 pl-3 font-semibold">Status</th></tr>
              </thead>
              <tbody>
                {n.acties.map((a, i) => (
                  <tr key={i} className="border-b border-black/[0.05]">
                    <td className="py-2 pr-3 text-[#1c1a4e]">{a.wat}</td>
                    <td className="px-3 py-2 text-black/60">{a.door}</td>
                    <td className="py-2 pl-3"><span className={`apill !py-0.5 text-[11.5px] ${a.status === "Gedaan" ? "bg-[#e3f6ed] text-[#0a7a4b]" : "bg-[#fff4e5] text-[#b86e00]"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="n-volgend">
        <h2 id="n-volgend" className={kop}>Punten voor het volgende overleg</h2>
        {n.volgend.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-black/45">Geen.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[14px] text-[#1c1a4e]">
            {n.volgend.map((v) => <li key={v.titel}>{v.titel}{v.inbrenger && <span className="text-black/45"> · {v.inbrenger}</span>}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Het formulier van de notulist: per agendapunt een veld, bij de check-in een veld per aanwezige. */
export function NotulenFormulier({ overlegId, agenda, aanwezigen, naar }: { overlegId: string; agenda: Agendapunt[]; aanwezigen: Aanwezige[]; naar?: "archief" }) {
  const punten = sorteerAgenda(agenda).filter((p) => !p.voor_volgend);
  const veld = "ainput min-h-[72px] resize-y text-[14.5px]";
  return (
    <form action={overlegNotulenBewaren} className="space-y-5" id="notulen-formulier">
      <input type="hidden" name="id" value={overlegId} />
      {naar && <input type="hidden" name="naar" value={naar} />}
      {punten.map((p) => (
        <div key={p.id} data-notulen-punt={p.titel}>
          <p className="mb-1.5 text-[14px] font-semibold text-[#1c1a4e]">
            {p.titel}
            {!p.vast && <span className="ml-2 text-[12px] font-normal text-black/40">{p.doorgeschoven ? "uit vorig overleg" : "nieuw"}</span>}
          </p>
          {p.vast && isCheckIn(p.titel) ? (
            aanwezigen.length === 0 ? (
              <p className="rounded-[12px] bg-black/[0.03] px-3.5 py-2.5 text-[13px] text-black/50">Kies eerst wie er aanwezig is; dan staat hier per persoon een veld voor de check-in.</p>
            ) : (
              <div className="space-y-2">
                {aanwezigen.map((a) => (
                  <label key={a.id} className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start sm:gap-3">
                    <span className="pt-2 text-[13px] font-semibold text-black/55">{a.naam}</span>
                    <textarea name={`checkin:${a.id}`} rows={2} maxLength={2000} defaultValue={a.checkin ?? ""} placeholder="Hoe zit je erbij?" className={veld} aria-label={`Check in van ${a.naam}`} />
                  </label>
                ))}
              </div>
            )
          ) : (
            <>
              {isDossiers(p.titel) && (
                <p className="mb-1.5 flex items-start gap-1.5 rounded-[10px] bg-[#fff4e5] px-3 py-2 text-[12.5px] text-[#7a4206]"><LuShieldAlert className="mt-0.5 shrink-0" /> {DOSSIERS_REGEL}</p>
              )}
              <textarea name={`punt:${p.id}`} rows={2} maxLength={8000} defaultValue={p.notulen ?? ""} className={veld} aria-label={`Notulen bij ${p.titel}`} />
            </>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button className="abtn !py-2 text-[13.5px]">Notulen bewaren</button>
        <span className="text-[12.5px] text-black/40">Tussendoor bewaren mag; je kunt blijven aanvullen tot het overleg is afgerond.</span>
      </div>
    </form>
  );
}
