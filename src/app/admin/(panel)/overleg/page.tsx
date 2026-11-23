import Link from "next/link";
import { LuArchive, LuCalendarClock, LuCircleCheckBig, LuListTodo, LuMapPin, LuMessagesSquare, LuNotebookPen, LuPlus, LuRepeat, LuShieldAlert, LuTrash2 } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { firstName } from "@/lib/dashboard";
import { haalCollegas } from "@/lib/inwerkreisDb";
import { datumOver } from "@/lib/offertes";
import {
  actiesPerPersoon, NIETS_MEDISCH, nlDelen, overlegTitel, sorteerAgenda, teLaat, volgendeDatum, wanneerTekst, WEEKDAGEN,
} from "@/lib/overleg";
import { haalKaart, haalOverleg } from "@/lib/overlegDb";
import { inMijnReact2u } from "@/lib/weergave";
import {
  actiepuntMaken, actiepuntWeg, actiepuntZetten, agendapuntBesproken, agendapuntInbrengen, agendapuntWeg, overlegAfronden,
  overlegNotulen, overlegPlannen, overlegVerwijderen, overlegVerzetten, ritmeOpslaan,
} from "@/app/admin/overlegActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StapVink from "@/components/admin/inwerk/StapVink";
import Verdeling from "@/components/admin/overleg/Verdeling";

/**
 * CM-overleg (0053; Rens, 23 nov 2026): het overleg van de casemanagers in
 * Mijn React2u. Het volgende overleg met de agenda (vaste punten en wat
 * collega's inbrengen), de actiepunten, de kaart met de verdeling van de
 * klanten, en het archief. Wie het recht omzet heeft, plant het overleg,
 * schrijft de notulen, maakt actiepunten, rondt af en stelt het ritme in.
 */

const DATUM_KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
const deadline = (d: string) => DATUM_KORT.format(new Date(`${d}T00:00:00Z`)).replace(".", "");

export default async function CmOverleg() {
  const { sb, admin } = await requirePerm("overleg");
  // In Mijn React2u zie je het overleg zoals een casemanager: zonder plannen, notulen en ritme.
  const mijn = await inMijnReact2u(admin.permissions);
  const beheer = admin.permissions.includes("omzet") && !mijn;
  const magStamkaart = admin.permissions.includes("bellijst") && !mijn;
  const vandaag = datumOver(0);
  const [uit, kaart, collegas] = await Promise.all([haalOverleg(sb), haalKaart(sb), beheer ? haalCollegas(sb) : Promise.resolve([])]);

  if (!uit.ok) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">CM-overleg</h1>
        <p className="acard px-6 py-5 text-[14px] text-black/55">
          {uit.fout === "migratie" ? "Het CM-overleg staat nog niet aan: migratie 0053 moet eerst in Supabase worden uitgevoerd." : "Het overleg kon niet geladen worden. Probeer het straks nog eens."}
        </p>
      </div>
    );
  }
  const { ritme, volgend, agenda, acties, archief, laatste } = uit.data;
  const punten = sorteerAgenda(agenda);
  const open = acties.filter((a) => !a.gedaan_at);
  const gedaan = acties.filter((a) => a.gedaan_at);
  const voorstel = ritme ? volgendeDatum(ritme, vandaag, laatste) : { datum: datumOver(7), tijd: "09:30" };
  const naAfronden = ritme && volgend ? volgendeDatum(ritme, vandaag, volgend.datum) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">CM-overleg</h1>
        <p className="text-[14.5px] text-black/50">Het overleg van de casemanagers: de agenda, de verdeling van de klanten en wat we afspreken.</p>
      </div>

      {/* ---------- het volgende overleg ---------- */}
      <section className="acard overflow-hidden" id="volgend" aria-labelledby="volgend-kop">
        <div className="on-dark flex flex-wrap items-start justify-between gap-x-6 gap-y-4 bg-gradient-to-br from-[#312e82] to-[#4b46a8] px-6 py-6 text-white">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white/60">Volgend overleg</p>
            <h2 id="volgend-kop" className="mt-1 font-heading text-[24px] font-bold leading-tight text-white">
              {volgend ? overlegTitel(volgend.datum) : "Nog niet gepland"}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/75">
              {volgend ? (
                <>
                  <span className="inline-flex items-center gap-1.5"><LuCalendarClock /> {wanneerTekst(volgend.datum, vandaag)}</span>
                  {volgend.locatie && <span className="inline-flex items-center gap-1.5"><LuMapPin /> {volgend.locatie}</span>}
                </>
              ) : (
                <span>{beheer ? "Plan het hieronder; het ritme stelt een datum voor." : "Zodra het gepland is, zie je hier de datum en de agenda."}</span>
              )}
            </p>
          </div>
          {volgend && (
            <dl className="flex gap-3">
              <div className="rounded-[14px] bg-white/10 px-4 py-2.5">
                <dt className="text-[11.5px] font-semibold text-white/60">Agendapunten</dt>
                <dd className="font-heading text-[22px] font-bold leading-none tabular-nums">{punten.length}</dd>
              </div>
              <div className="rounded-[14px] bg-white/10 px-4 py-2.5">
                <dt className="text-[11.5px] font-semibold text-white/60">Open acties</dt>
                <dd className="font-heading text-[22px] font-bold leading-none tabular-nums">{open.length}</dd>
              </div>
            </dl>
          )}
        </div>
        {beheer && !volgend && (
          <form action={overlegPlannen} className="grid gap-4 px-6 py-5 sm:grid-cols-[160px_120px_minmax(0,1fr)_auto] sm:items-end" id="plannen">
            <div>
              <label htmlFor="plan-datum" className="alabel">Datum</label>
              <input id="plan-datum" name="datum" type="date" required defaultValue={voorstel.datum} className="ainput" />
            </div>
            <div>
              <label htmlFor="plan-tijd" className="alabel">Tijd</label>
              <input id="plan-tijd" name="tijd" type="time" required defaultValue={voorstel.tijd} className="ainput" />
            </div>
            <div>
              <label htmlFor="plan-locatie" className="alabel">Waar</label>
              <input id="plan-locatie" name="locatie" maxLength={120} defaultValue={ritme?.locatie ?? ""} placeholder="Kantoor, of Teams" className="ainput" />
            </div>
            <button className="abtn justify-center"><LuCalendarClock /> Overleg plannen</button>
          </form>
        )}
        {beheer && volgend && (
          <details className="group/verzet px-6 py-4">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
              <span className="group-open/verzet:hidden">Datum of plek wijzigen</span><span className="hidden group-open/verzet:inline">Niet wijzigen</span>
            </summary>
            <form action={overlegVerzetten} className="mt-3 grid gap-4 sm:grid-cols-[160px_120px_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="id" value={volgend.id} />
              <div>
                <label htmlFor="verzet-datum" className="alabel">Datum</label>
                <input id="verzet-datum" name="datum" type="date" required defaultValue={nlDelen(volgend.datum).datum} className="ainput" />
              </div>
              <div>
                <label htmlFor="verzet-tijd" className="alabel">Tijd</label>
                <input id="verzet-tijd" name="tijd" type="time" required defaultValue={nlDelen(volgend.datum).tijd} className="ainput" />
              </div>
              <div>
                <label htmlFor="verzet-locatie" className="alabel">Waar</label>
                <input id="verzet-locatie" name="locatie" maxLength={120} defaultValue={volgend.locatie ?? ""} className="ainput" />
              </div>
              <button className="abtn-ghost justify-center">Bewaren</button>
            </form>
            <div className="mt-3">
              <ConfirmButton action={overlegVerwijderen.bind(null, volgend.id)} message="Dit overleg verwijderen, met de agenda en de actiepunten die eraan hangen?" className="text-[12.5px] font-semibold text-[#e0356b] hover:underline">
                Overleg verwijderen
              </ConfirmButton>
            </div>
          </details>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ---------- agenda ---------- */}
        <section className="acard overflow-hidden" id="agenda" aria-labelledby="agenda-kop">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
            <h2 id="agenda-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuListTodo /> Agenda</h2>
            {beheer && volgend && <p className="text-[12.5px] text-black/40">Vink tijdens het overleg af wat besproken is.</p>}
          </div>
          {!volgend ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Er is nog geen overleg gepland, dus ook nog geen agenda.</p>
          ) : (
            <>
              <ol className="divide-y divide-black/[0.05]">
                {punten.map((p, i) => {
                  const eigen = p.door === admin.userId;
                  const inhoud = (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`text-[14.5px] font-semibold ${p.besproken ? "text-black/40 line-through decoration-black/25" : "text-[#1c1a4e]"}`}>{p.titel}</span>
                        {p.vast ? (
                          <span className="apill bg-[#eef0ff] !py-0 text-[11px] text-[#312e82]">vast</span>
                        ) : (
                          <span className="apill bg-[#fdecf4] !py-0 text-[11px] text-[#c2185b]">{eigen ? "jouw punt" : `van ${firstName(p.door_email || "") || "een collega"}`}</span>
                        )}
                      </div>
                      {p.toelichting && <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-[1.55] text-black/55">{p.toelichting}</p>}
                    </div>
                  );
                  return (
                    <li key={p.id} className="flex items-start gap-3 px-6 py-3.5" data-punt={p.titel}>
                      <div className="min-w-0 flex-1">
                        {beheer ? (
                          <StapVink gedaan={p.besproken} zet={agendapuntBesproken.bind(null, p.id)} label={`Besproken: ${p.titel}`}>{inhoud}</StapVink>
                        ) : (
                          <div className="flex items-start gap-3.5">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6f5fb] text-[12px] font-bold tabular-nums text-[#312e82]" aria-hidden>{i + 1}</span>
                            {inhoud}
                          </div>
                        )}
                      </div>
                      {(beheer || (eigen && !p.vast)) && (
                        <ConfirmButton action={agendapuntWeg.bind(null, p.id)} message={`"${p.titel}" van de agenda halen?`} className="rounded-lg p-1.5 text-black/30 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                          <LuTrash2 aria-hidden /><span className="sr-only">{p.titel} van de agenda halen</span>
                        </ConfirmButton>
                      )}
                    </li>
                  );
                })}
              </ol>
              <form action={agendapuntInbrengen} className="space-y-3 border-t border-black/[0.06] bg-[#fbfaff] px-6 py-5" id="inbrengen">
                <input type="hidden" name="overleg_id" value={volgend.id} />
                <p className="font-heading text-[14.5px] font-bold text-[#1c1a4e]">Punt inbrengen</p>
                <div>
                  <label htmlFor="punt-titel" className="alabel">Waar wil je het over hebben?</label>
                  <input id="punt-titel" name="titel" required maxLength={200} placeholder="Bijvoorbeeld: de verdeling na de twee nieuwe klanten in Tilburg" className="ainput" />
                </div>
                <div>
                  <label htmlFor="punt-toelichting" className="alabel">Toelichting <span className="font-normal text-black/35">(mag leeg)</span></label>
                  <textarea id="punt-toelichting" name="toelichting" rows={2} maxLength={2000} className="ainput resize-y" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="abtn !py-2 text-[13.5px]"><LuPlus /> Op de agenda</button>
                  <p className="flex items-center gap-1.5 text-[12.5px] text-black/45"><LuShieldAlert className="shrink-0 text-[13px]" /> {NIETS_MEDISCH}</p>
                </div>
              </form>
            </>
          )}
        </section>

        {/* ---------- actiepunten ---------- */}
        <section className="acard overflow-hidden" id="acties" aria-labelledby="acties-kop">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
            <h2 id="acties-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
              <LuCircleCheckBig /> Actiepunten
              <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#312e82]">{open.length}</span>
            </h2>
            <p className="text-[12.5px] text-black/40">Vink af wat je gedaan hebt.</p>
          </div>
          {open.length === 0 ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Er staan geen actiepunten open.</p>
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {actiesPerPersoon(open).map((g) => (
                <div key={g.wie || g.naam} className="px-6 py-4" data-persoon={g.naam}>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">{g.wie === admin.userId ? `${g.naam} (jij)` : g.naam}</p>
                  <ul className="space-y-2.5">
                    {g.acties.map((a) => {
                      const regel = (
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#1c1a4e]">{a.wat}</p>
                          <p className={`text-[12px] ${teLaat(a, vandaag) ? "font-semibold text-[#b42318]" : "text-black/40"}`}>
                            {a.wanneer ? `${teLaat(a, vandaag) ? "Had af moeten zijn op" : "Af op"} ${deadline(a.wanneer)}` : "Zonder datum"}
                          </p>
                        </div>
                      );
                      return (
                        <li key={a.id} className="flex items-start gap-2" data-actie={a.wat}>
                          <div className="min-w-0 flex-1">
                            {beheer || a.wie === admin.userId ? (
                              <StapVink gedaan={false} zet={actiepuntZetten.bind(null, a.id)} label={`Gedaan: ${a.wat}`}>{regel}</StapVink>
                            ) : (
                              <div className="pl-[38px]">{regel}</div>
                            )}
                          </div>
                          {beheer && (
                            <ConfirmButton action={actiepuntWeg.bind(null, a.id)} message={`Actiepunt "${a.wat}" verwijderen?`} className="rounded-lg p-1.5 text-black/30 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                              <LuTrash2 aria-hidden /><span className="sr-only">{a.wat} verwijderen</span>
                            </ConfirmButton>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {gedaan.length > 0 && (
            <details className="border-t border-black/[0.05] px-6 py-3">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">De laatste twee weken gedaan ({gedaan.length})</summary>
              <ul className="mt-2 space-y-1.5 pb-1">
                {gedaan.map((a) => (
                  <li key={a.id} className="text-[13px] text-black/50"><span className="line-through decoration-black/25">{a.wat}</span> · {a.wie_naam}</li>
                ))}
              </ul>
            </details>
          )}
          {beheer && volgend && (
            <form action={actiepuntMaken} className="space-y-3 border-t border-black/[0.06] bg-[#fbfaff] px-6 py-5" id="actie-maken">
              <input type="hidden" name="overleg_id" value={volgend.id} />
              <p className="font-heading text-[14.5px] font-bold text-[#1c1a4e]">Actiepunt maken</p>
              <div>
                <label htmlFor="actie-wat" className="alabel">Wat</label>
                <input id="actie-wat" name="wat" required maxLength={300} placeholder="Kort en concreet" className="ainput" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                <div>
                  <label htmlFor="actie-wie" className="alabel">Wie</label>
                  <select id="actie-wie" name="wie" required defaultValue="" className="ainput">
                    <option value="" disabled>Kies een collega</option>
                    {collegas.map((c) => <option key={c.user_id} value={c.user_id}>{c.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="actie-wanneer" className="alabel">Af op <span className="font-normal text-black/35">(mag leeg)</span></label>
                  <input id="actie-wanneer" name="wanneer" type="date" className="ainput" />
                </div>
              </div>
              <button className="abtn !py-2 text-[13.5px]"><LuPlus /> Actiepunt maken</button>
            </form>
          )}
        </section>
      </div>

      {/* ---------- de kaart ---------- */}
      <section className="acard p-6" id="kaart" aria-labelledby="kaart-kop">
        <div className="mb-5">
          <h2 id="kaart-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuMapPin /> Verdeling van de klanten</h2>
          <p className="mt-0.5 text-[12.5px] text-black/45">Elke klant op zijn vestigingsplaats in de kleur van de casemanager; de vlakken tonen wie in een gemeente de meeste klanten heeft. Klik op een naam om die casemanager uit te lichten.</p>
        </div>
        {kaart === null ? (
          <p className="text-[13.5px] text-black/45">De kaart kon niet geladen worden.</p>
        ) : (
          <Verdeling klanten={kaart} magStamkaart={magStamkaart} />
        )}
      </section>

      {/* ---------- notulen en afronden (beheer) ---------- */}
      {beheer && volgend && (
        <section className="acard p-6" id="notulen" aria-labelledby="notulen-kop">
          <h2 id="notulen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuNotebookPen /> Notulen</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-black/45">Kort: wat besproken is en wat we afspraken. {NIETS_MEDISCH}</p>
          <form action={overlegNotulen} className="space-y-3">
            <input type="hidden" name="id" value={volgend.id} />
            <textarea name="notulen" rows={6} maxLength={20000} defaultValue={volgend.notulen ?? ""} className="ainput resize-y" aria-label="Notulen" id="notulen-tekst" />
            <button className="abtn-ghost !py-2 text-[13.5px]">Notulen bewaren</button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-5">
            <ConfirmButton
              action={overlegAfronden.bind(null, volgend.id)}
              message={`Het overleg afronden? Het gaat naar het archief${naAfronden ? `, het volgende komt op ${naAfronden.datum.split("-").reverse().join("-")} om ${naAfronden.tijd}` : ""}, en ingebrachte punten die niet besproken zijn schuiven door.`}
              className="abtn !py-2 text-[13.5px]"
            >
              <LuArchive /> Overleg afronden
            </ConfirmButton>
            <p className="text-[12.5px] text-black/45">
              Het gaat naar het archief{naAfronden ? `; het volgende wordt gepland op ${overlegTitel(`${naAfronden.datum}T12:00:00Z`).split(",")[0].toLowerCase()} om ${naAfronden.tijd}` : ""}. Niet besproken punten van collega&apos;s schuiven door.
            </p>
          </div>
        </section>
      )}

      {/* ---------- archief ---------- */}
      <section className="acard overflow-hidden" id="archief" aria-labelledby="archief-kop">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 id="archief-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuArchive /> Eerdere overleggen</h2>
        </div>
        {archief.length === 0 ? (
          <p className="px-6 py-5 text-[13.5px] text-black/45">Nog geen overleg afgerond. Na afloop staan agenda, notulen en actiepunten hier terug te lezen.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {archief.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/overleg/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3.5 transition-colors hover:bg-black/[0.02]" data-archief={nlDelen(o.datum).datum}>
                  <span className="text-[14.5px] font-semibold text-[#1c1a4e]">{overlegTitel(o.datum)}</span>
                  <span className="text-[12.5px] tabular-nums text-black/45">
                    {o.punten} {o.punten === 1 ? "punt" : "punten"} · {o.acties} {o.acties === 1 ? "actiepunt" : "actiepunten"}{o.open ? ` (${o.open} open)` : ""}{o.notulen ? " · notulen" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- ritme (beheer) ---------- */}
      {beheer && ritme && (
        <section className="acard p-6" id="ritme" aria-labelledby="ritme-kop">
          <h2 id="ritme-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuRepeat /> Ritme</h2>
          <p className="mb-4 mt-0.5 text-[12.5px] text-black/45">
            Elke {ritme.elke_weken === 1 ? "week" : `${ritme.elke_weken} weken`} op {WEEKDAGEN[ritme.weekdag - 1]} om {ritme.tijd.slice(0, 5)}. Na het afronden plant het volgende overleg zich zo; de dag ervoor krijgt iedereen een herinnering met de agenda.
          </p>
          <form action={ritmeOpslaan} className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="ritme-weken" className="alabel">Elke</label>
                <select id="ritme-weken" name="elke_weken" defaultValue={ritme.elke_weken} className="ainput">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "week" : `${n} weken`}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ritme-dag" className="alabel">Op</label>
                <select id="ritme-dag" name="weekdag" defaultValue={ritme.weekdag} className="ainput">
                  {WEEKDAGEN.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ritme-tijd" className="alabel">Om</label>
                <input id="ritme-tijd" name="tijd" type="time" required defaultValue={ritme.tijd.slice(0, 5)} className="ainput" />
              </div>
              <div className="col-span-3">
                <label htmlFor="ritme-locatie" className="alabel">Waar</label>
                <input id="ritme-locatie" name="locatie" maxLength={120} defaultValue={ritme.locatie ?? ""} placeholder="Kantoor, of Teams" className="ainput" />
              </div>
            </div>
            <div>
              <label htmlFor="ritme-punten" className="alabel">Vaste agendapunten <span className="font-normal text-black/35">(één per regel)</span></label>
              <textarea id="ritme-punten" name="vaste_punten" rows={6} defaultValue={ritme.vaste_punten.join("\n")} className="ainput resize-y" />
            </div>
            <div className="md:col-span-2">
              <button className="abtn-ghost !py-2 text-[13.5px]">Ritme bewaren</button>
              <span className="ml-3 text-[12.5px] text-black/40">Vaste punten gelden vanaf het volgende overleg dat je plant.</span>
            </div>
          </form>
        </section>
      )}

      {!beheer && (
        <p className="flex items-center gap-2 text-[12.5px] text-black/40"><LuMessagesSquare className="shrink-0" /> Het overleg plannen, notulen en actiepunten doet het beheer; jij brengt punten in en vinkt je eigen actiepunten af.</p>
      )}
    </div>
  );
}
