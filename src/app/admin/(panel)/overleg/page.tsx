import Link from "next/link";
import {
  LuArchive, LuCalendarClock, LuCircleCheckBig, LuListTodo, LuMapPin, LuMessagesSquare, LuNotebookPen, LuPlus, LuRepeat, LuShieldAlert, LuTrash2, LuUsers,
} from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import {
  NIETS_MEDISCH, nlDelen, overlegDag, overlegTitel, sorteerAgenda, teLaat, tijdVanTot, volgendeDatum, wanneerTekst, WEEKDAGEN, type Agendapunt,
} from "@/lib/overleg";
import { haalKaart, haalOverleg, inbrengerNaam } from "@/lib/overlegDb";
import { inMijnReact2u } from "@/lib/weergave";
import {
  actiepuntMaken, actiepuntWeg, actiepuntZetten, agendapuntBesproken, agendapuntInbrengen, agendapuntWeg, overlegAfronden,
  overlegBezetting, overlegPlannen, overlegVerwijderen, overlegVerzetten, ritmeOpslaan,
} from "@/app/admin/overlegActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StapVink from "@/components/admin/inwerk/StapVink";
import { NotulenFormulier } from "@/components/admin/overleg/Notulen";
import Verdeling from "@/components/admin/overleg/Verdeling";
import WaarnemingBlok from "@/components/admin/waarneming/WaarnemingBlok";

/**
 * CM-overleg (0053, 0054; Rens, 23 nov 2026, met het voorbeeld "CM overleg
 * 18-11"): het overleg van de casemanagers in Mijn React2u, in de vorm van
 * het team. Gegevens (datum, tijd van tot, aanwezigen, notulist), de agenda
 * (structureel, en wat ter tafel komt: uit vorig overleg en nieuw), de
 * notulen per punt met de check-in per aanwezige, actie en gemaakte
 * afspraken, de punten voor het volgende overleg, de kaart met de verdeling
 * van de klanten, en het archief. De notulist schrijft de notulen; het beheer
 * plant, kiest de notulist, rondt af (de notulen gaan dan per mail naar de
 * aanwezigen) en stelt het ritme in.
 */

const DATUM_KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
const deadline = (d: string) => DATUM_KORT.format(new Date(`${d}T00:00:00Z`)).replace(".", "");
const sectieKop = "flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]";

export default async function CmOverleg() {
  const { sb, admin } = await requirePerm("overleg");
  // In Mijn React2u zie je het overleg zoals een casemanager: zonder plannen, afronden en ritme.
  const mijn = await inMijnReact2u(admin.permissions);
  const beheer = admin.permissions.includes("omzet") && !mijn;
  const magStamkaart = admin.permissions.includes("bellijst") && !mijn;
  const vandaag = datumOver(0);
  const [uit, kaart] = await Promise.all([haalOverleg(sb), haalKaart(sb)]);

  if (!uit.ok) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">CM-overleg</h1>
        <p className="acard px-6 py-5 text-[14px] text-black/55">
          {uit.fout === "migratie" ? "Het CM-overleg staat nog niet aan: de migraties 0053 en 0054 moeten eerst in Supabase worden uitgevoerd." : "Het overleg kon niet geladen worden. Probeer het straks nog eens."}
        </p>
      </div>
    );
  }
  const { ritme, volgend, agenda, acties, archief, laatste, aanwezigen, collegas } = uit.data;
  const inbrenger = inbrengerNaam(collegas);
  const notulist = Boolean(volgend && volgend.notulist === admin.userId);
  const notuleert = beheer || notulist;
  const punten = sorteerAgenda(agenda);
  const vast = punten.filter((p) => p.vast);
  const uitVorig = punten.filter((p) => !p.vast && p.doorgeschoven && !p.voor_volgend);
  const nieuw = punten.filter((p) => !p.vast && !p.doorgeschoven && !p.voor_volgend);
  const voorVolgend = punten.filter((p) => !p.vast && p.voor_volgend);
  const open = acties.filter((a) => !a.gedaan_at);
  const gedaan = acties.filter((a) => a.gedaan_at);
  const voorstel = ritme ? volgendeDatum(ritme, vandaag, laatste) : { datum: datumOver(7), tijd: "09:30" };
  const voorstelEind = (() => {
    const [u, m] = voorstel.tijd.split(":").map(Number);
    const t = u * 60 + m + (ritme?.duur_minuten ?? 60);
    return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  })();
  const naAfronden = ritme && volgend ? volgendeDatum(ritme, vandaag, volgend.datum) : null;
  const aanwezigIds = new Set(aanwezigen.map((a) => a.user_id).filter(Boolean));
  const losseNamen = aanwezigen.filter((a) => !a.user_id).map((a) => a.naam).join(", ");

  const puntRegel = (p: Agendapunt, nummer: number | null) => {
    const eigen = p.door === admin.userId;
    const inhoud = (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-[14.5px] font-semibold ${p.besproken ? "text-black/40 line-through decoration-black/25" : "text-[#1c1a4e]"}`}>{p.titel}</span>
          {!p.vast && <span className="apill bg-[#fdecf4] !py-0 text-[11px] text-[#c2185b]">{eigen ? "jouw punt" : `van ${inbrenger(p) || "een collega"}`}</span>}
        </div>
        {p.toelichting && <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-[1.55] text-black/55">{p.toelichting}</p>}
      </div>
    );
    return (
      <li key={p.id} className="flex items-start gap-3 px-6 py-3" data-punt={p.titel}>
        <div className="min-w-0 flex-1">
          {notuleert ? (
            <StapVink gedaan={p.besproken} zet={agendapuntBesproken.bind(null, p.id)} label={`Besproken: ${p.titel}`}>{inhoud}</StapVink>
          ) : (
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6f5fb] text-[12px] font-bold tabular-nums text-[#312e82]" aria-hidden>{nummer ?? "•"}</span>
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">CM-overleg</h1>
        <p className="text-[14.5px] text-black/50">Het overleg van de casemanagers: de agenda, de notulen, wat we afspreken en de verdeling van de klanten.</p>
      </div>

      {/* ---------- gegevens van het volgende overleg ---------- */}
      <section className="acard overflow-hidden" id="volgend" aria-labelledby="volgend-kop">
        <div className="on-dark flex flex-wrap items-start justify-between gap-x-6 gap-y-4 bg-gradient-to-br from-[#312e82] to-[#4b46a8] px-6 py-6 text-white">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white/60">Volgend overleg</p>
            <h2 id="volgend-kop" className="mt-1 font-heading text-[24px] font-bold leading-tight text-white">
              {volgend ? overlegDag(volgend.datum) : "Nog niet gepland"}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/75">
              {volgend ? (
                <>
                  <span className="inline-flex items-center gap-1.5"><LuCalendarClock /> {tijdVanTot(volgend)} · {wanneerTekst(volgend.datum, vandaag)}</span>
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
                <dd className="font-heading text-[22px] font-bold leading-none tabular-nums">{punten.length - voorVolgend.length}</dd>
              </div>
              <div className="rounded-[14px] bg-white/10 px-4 py-2.5">
                <dt className="text-[11.5px] font-semibold text-white/60">Lopende acties</dt>
                <dd className="font-heading text-[22px] font-bold leading-none tabular-nums">{open.length}</dd>
              </div>
            </dl>
          )}
        </div>

        {volgend && (
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3 border-b border-black/[0.06] px-6 py-4 text-[14px]" id="bezetting">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Aanwezig</p>
              {aanwezigen.length ? (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {aanwezigen.map((a) => <li key={a.id} className="apill bg-[#f6f5fb] !py-0.5 text-[12.5px] text-[#1c1a4e]">{a.naam}</li>)}
                </ul>
              ) : <p className="mt-1 text-black/45">Nog niet ingevuld</p>}
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Notulist</p>
              <p className="mt-1 font-semibold text-[#1c1a4e]">{volgend.notulist_naam ? `${volgend.notulist_naam}${notulist ? " (jij)" : ""}` : <span className="font-normal text-black/45">Nog niet gekozen</span>}</p>
            </div>
          </div>
        )}

        {beheer && !volgend && (
          <form action={overlegPlannen} className="grid gap-4 px-6 py-5 sm:grid-cols-[160px_110px_110px_minmax(0,1fr)_auto] sm:items-end" id="plannen">
            <div>
              <label htmlFor="plan-datum" className="alabel">Datum</label>
              <input id="plan-datum" name="datum" type="date" required defaultValue={voorstel.datum} className="ainput" />
            </div>
            <div>
              <label htmlFor="plan-tijd" className="alabel">Van</label>
              <input id="plan-tijd" name="tijd" type="time" required defaultValue={voorstel.tijd} className="ainput" />
            </div>
            <div>
              <label htmlFor="plan-eind" className="alabel">Tot</label>
              <input id="plan-eind" name="eind" type="time" defaultValue={voorstelEind} className="ainput" />
            </div>
            <div>
              <label htmlFor="plan-locatie" className="alabel">Waar</label>
              <input id="plan-locatie" name="locatie" maxLength={120} defaultValue={ritme?.locatie ?? ""} placeholder="Kantoor, of Teams" className="ainput" />
            </div>
            <button className="abtn justify-center"><LuCalendarClock /> Overleg plannen</button>
          </form>
        )}

        {volgend && notuleert && (
          <details className="group/bezet border-b border-black/[0.06] px-6 py-4" open={aanwezigen.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13.5px] font-semibold text-[#312e82] [&::-webkit-details-marker]:hidden">
              <LuUsers /> <span className="group-open/bezet:hidden">Aanwezigen{beheer ? " en notulist" : ""} wijzigen</span><span className="hidden group-open/bezet:inline">Wie is er bij?</span>
            </summary>
            <form action={overlegBezetting} className="mt-3 space-y-4" id="bezetting-formulier">
              <input type="hidden" name="id" value={volgend.id} />
              <fieldset>
                <legend className="alabel">Aanwezig</legend>
                <div className="flex flex-wrap gap-2">
                  {collegas.map((c) => (
                    <label key={c.user_id} className="cursor-pointer">
                      <input type="checkbox" name="aanwezig" value={c.user_id} defaultChecked={aanwezigIds.has(c.user_id)} className="peer sr-only" />
                      <span className="apill border border-black/[0.1] bg-white !px-3.5 !py-1.5 text-[13px] text-black/55 transition peer-checked:border-[#312e82] peer-checked:bg-[#312e82] peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#e75387]/25">{c.naam}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bezet-extra" className="alabel">Anderen <span className="font-normal text-black/35">(zonder inlog, met komma&apos;s)</span></label>
                  <input id="bezet-extra" name="extra" defaultValue={losseNamen} className="ainput" />
                </div>
                {beheer && (
                  <div>
                    <label htmlFor="bezet-notulist" className="alabel">Notulist</label>
                    <select id="bezet-notulist" name="notulist" defaultValue={volgend.notulist ?? ""} className="ainput">
                      <option value="">Nog niemand</option>
                      {collegas.map((c) => <option key={c.user_id} value={c.user_id}>{c.naam}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <button className="abtn-ghost !py-2 text-[13.5px]">Bewaren</button>
              {beheer && <p className="text-[12.5px] text-black/40">De notulist moet ook aanwezig zijn, en schrijft daarna de check-in, de notulen en de actiepunten.</p>}
            </form>
          </details>
        )}

        {beheer && volgend && (
          <details className="group/verzet px-6 py-4">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
              <span className="group-open/verzet:hidden">Datum, tijd of plek wijzigen</span><span className="hidden group-open/verzet:inline">Niet wijzigen</span>
            </summary>
            <form action={overlegVerzetten} className="mt-3 grid gap-4 sm:grid-cols-[160px_110px_110px_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="id" value={volgend.id} />
              <div>
                <label htmlFor="verzet-datum" className="alabel">Datum</label>
                <input id="verzet-datum" name="datum" type="date" required defaultValue={nlDelen(volgend.datum).datum} className="ainput" />
              </div>
              <div>
                <label htmlFor="verzet-tijd" className="alabel">Van</label>
                <input id="verzet-tijd" name="tijd" type="time" required defaultValue={nlDelen(volgend.datum).tijd} className="ainput" />
              </div>
              <div>
                <label htmlFor="verzet-eind" className="alabel">Tot</label>
                <input id="verzet-eind" name="eind" type="time" defaultValue={volgend.einde ? nlDelen(volgend.einde).tijd : ""} className="ainput" />
              </div>
              <div>
                <label htmlFor="verzet-locatie" className="alabel">Waar</label>
                <input id="verzet-locatie" name="locatie" maxLength={120} defaultValue={volgend.locatie ?? ""} className="ainput" />
              </div>
              <button className="abtn-ghost justify-center">Bewaren</button>
            </form>
            <div className="mt-3">
              <ConfirmButton action={overlegVerwijderen.bind(null, volgend.id)} message="Dit overleg verwijderen, met de agenda, de notulen en de actiepunten die eraan hangen?" className="text-[12.5px] font-semibold text-[#e0356b] hover:underline">
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
            <h2 id="agenda-kop" className={sectieKop}><LuListTodo /> Agenda</h2>
            {notuleert && volgend && <p className="text-[12.5px] text-black/40">Vink af wat besproken is.</p>}
          </div>
          {!volgend ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Er is nog geen overleg gepland, dus ook nog geen agenda.</p>
          ) : (
            <>
              <p className="px-6 pt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Structureel</p>
              <ol className="divide-y divide-black/[0.05]" id="agenda-structureel">{vast.map((p, i) => puntRegel(p, i + 1))}</ol>
              <p className="border-t border-black/[0.06] px-6 pt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Wat ter tafel komt</p>
              <div className="px-6 pb-1 pt-2">
                <p className="text-[13px] font-semibold text-[#1c1a4e]">Uit vorig overleg</p>
                {uitVorig.length === 0 && open.length === 0 && <p className="pb-2 text-[13px] text-black/45">Niets blijven liggen.</p>}
              </div>
              {uitVorig.length > 0 && <ul className="divide-y divide-black/[0.05]" id="agenda-vorig">{uitVorig.map((p) => puntRegel(p, null))}</ul>}
              {open.length > 0 && (
                <p className="px-6 pb-2 text-[13px] text-black/55">
                  En <a href="#acties" className="font-semibold text-[#312e82] hover:underline">{open.length} {open.length === 1 ? "lopend actiepunt" : "lopende actiepunten"}</a>.
                </p>
              )}
              <div className="px-6 pb-1 pt-2"><p className="text-[13px] font-semibold text-[#1c1a4e]">Nieuw</p>{nieuw.length === 0 && <p className="pb-2 text-[13px] text-black/45">Nog niets ingebracht.</p>}</div>
              {nieuw.length > 0 && <ul className="divide-y divide-black/[0.05]" id="agenda-nieuw">{nieuw.map((p) => puntRegel(p, null))}</ul>}
              <form action={agendapuntInbrengen} className="space-y-3 border-t border-black/[0.06] bg-[#fbfaff] px-6 py-5" id="inbrengen">
                <input type="hidden" name="overleg_id" value={volgend.id} />
                <p className="font-heading text-[14.5px] font-bold text-[#1c1a4e]">Punt inbrengen</p>
                <div>
                  <label htmlFor="punt-titel" className="alabel">Waar wil je het over hebben?</label>
                  <input id="punt-titel" name="titel" required maxLength={200} placeholder="Bijvoorbeeld: spoor 2 op tijd aanmelden" className="ainput" />
                </div>
                <div>
                  <label htmlFor="punt-toelichting" className="alabel">Toelichting <span className="font-normal text-black/35">(mag leeg)</span></label>
                  <textarea id="punt-toelichting" name="toelichting" rows={2} maxLength={2000} className="ainput resize-y" />
                </div>
                <label className="flex items-center gap-2 text-[13.5px] text-[#1c1a4e]">
                  <input type="checkbox" name="voor_volgend" className="h-4 w-4 accent-[#312e82]" /> Voor het volgende overleg
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="abtn !py-2 text-[13.5px]"><LuPlus /> Op de agenda</button>
                  <p className="flex items-center gap-1.5 text-[12.5px] text-black/45"><LuShieldAlert className="shrink-0 text-[13px]" /> {NIETS_MEDISCH}</p>
                </div>
              </form>
            </>
          )}
        </section>

        {/* ---------- actie en gemaakte afspraken ---------- */}
        <section className="acard overflow-hidden" id="acties" aria-labelledby="acties-kop">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
            <h2 id="acties-kop" className={sectieKop}>
              <LuCircleCheckBig /> Actie en gemaakte afspraken
              <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#312e82]">{open.length}</span>
            </h2>
          </div>
          {open.length === 0 ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Er staan geen actiepunten open.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {open.map((a) => {
                const regel = (
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#1c1a4e]">{a.wat}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-black/45">
                      <span className="font-semibold text-black/60">{a.wie === admin.userId ? `${a.wie_naam} (jij)` : a.wie_naam}</span>
                      <span className="apill bg-[#fff4e5] !py-0 text-[11px] text-[#b86e00]">Lopend</span>
                      {a.wanneer && <span className={teLaat(a, vandaag) ? "font-semibold text-[#b42318]" : ""}>{teLaat(a, vandaag) ? "had af moeten zijn op" : "af op"} {deadline(a.wanneer)}</span>}
                    </p>
                  </div>
                );
                return (
                  <li key={a.id} className="flex items-start gap-2 px-6 py-3" data-actie={a.wat}>
                    <div className="min-w-0 flex-1">
                      {beheer || a.wie === admin.userId ? (
                        <StapVink gedaan={false} zet={actiepuntZetten.bind(null, a.id)} label={`Gedaan: ${a.wat}`}>{regel}</StapVink>
                      ) : (
                        <div className="pl-[38px]">{regel}</div>
                      )}
                    </div>
                    {notuleert && (a.overleg_id === volgend?.id || beheer) && (
                      <ConfirmButton action={actiepuntWeg.bind(null, a.id)} message={`Actiepunt "${a.wat}" verwijderen?`} className="rounded-lg p-1.5 text-black/30 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                        <LuTrash2 aria-hidden /><span className="sr-only">{a.wat} verwijderen</span>
                      </ConfirmButton>
                    )}
                  </li>
                );
              })}
            </ul>
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
          {notuleert && volgend && (
            <form action={actiepuntMaken} className="space-y-3 border-t border-black/[0.06] bg-[#fbfaff] px-6 py-5" id="actie-maken">
              <input type="hidden" name="overleg_id" value={volgend.id} />
              <p className="font-heading text-[14.5px] font-bold text-[#1c1a4e]">Actiepunt maken</p>
              <div>
                <label htmlFor="actie-wat" className="alabel">Actie</label>
                <input id="actie-wat" name="wat" required maxLength={300} placeholder="Wie doet wat, kort en concreet" className="ainput" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                <div>
                  <label htmlFor="actie-wie" className="alabel">Door</label>
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

      {/* ---------- notulen ---------- */}
      {volgend && (
        <section className="acard p-6" id="notulen" aria-labelledby="notulen-kop">
          <h2 id="notulen-kop" className={sectieKop}><LuNotebookPen /> Notulen</h2>
          {notuleert ? (
            <>
              <p className="mb-4 mt-0.5 text-[12.5px] text-black/45">Per agendapunt wat er besproken is; bij de check-in hoe iedereen erbij zit. {NIETS_MEDISCH}</p>
              <NotulenFormulier overlegId={volgend.id} agenda={agenda} aanwezigen={aanwezigen} />
            </>
          ) : (
            <p className="mt-1 text-[13.5px] text-black/50">
              {volgend.notulist_naam ? `${volgend.notulist_naam} notuleert.` : "De notulist schrijft de notulen."} Na afloop krijg je ze per mail en staan ze in het archief.
            </p>
          )}
        </section>
      )}

      {/* ---------- punten voor het volgende overleg ---------- */}
      {volgend && (
        <section className="acard overflow-hidden" id="volgend-overleg" aria-labelledby="volgend-overleg-kop">
          <div className="border-b border-black/[0.06] px-6 py-4">
            <h2 id="volgend-overleg-kop" className={sectieKop}><LuMessagesSquare /> Punten voor het volgende overleg</h2>
            <p className="mt-0.5 text-[12.5px] text-black/45">Vink bij het inbrengen &quot;Voor het volgende overleg&quot; aan; bij het afronden schuiven ze door.</p>
          </div>
          {voorVolgend.length === 0 ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Nog geen.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {voorVolgend.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-6 py-3" data-volgend={p.titel}>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-[#1c1a4e]">{p.titel}</p>
                    <p className="text-[12.5px] text-black/45">Inbrenger: {p.door === admin.userId ? "jij" : inbrenger(p) || "een collega"}</p>
                  </div>
                  {(beheer || p.door === admin.userId) && (
                    <ConfirmButton action={agendapuntWeg.bind(null, p.id)} message={`"${p.titel}" weghalen?`} className="rounded-lg p-1.5 text-black/30 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                      <LuTrash2 aria-hidden /><span className="sr-only">{p.titel} weghalen</span>
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- waarneming (0057): wie er de komende weken niet is ---------- */}
      <WaarnemingBlok sb={sb} vandaag={vandaag} />

      {/* ---------- de kaart ---------- */}
      <section className="acard p-6" id="kaart" aria-labelledby="kaart-kop">
        <div className="mb-5">
          <h2 id="kaart-kop" className={sectieKop}><LuMapPin /> Verdeling van de klanten</h2>
          <p className="mt-0.5 text-[12.5px] text-black/45">Elke klant op zijn vestigingsplaats in de kleur van de casemanager; de vlakken tonen wie in een gemeente de meeste klanten heeft. Klik op een naam om die casemanager uit te lichten.</p>
        </div>
        {kaart === null ? <p className="text-[13.5px] text-black/45">De kaart kon niet geladen worden.</p> : <Verdeling klanten={kaart} magStamkaart={magStamkaart} />}
      </section>

      {/* ---------- afronden (beheer) ---------- */}
      {beheer && volgend && (
        <section className="acard flex flex-wrap items-center gap-3 p-6" id="afronden">
          <ConfirmButton
            action={overlegAfronden.bind(null, volgend.id)}
            message={`Het overleg afronden? De notulen gaan per mail naar de aanwezigen en het overleg naar het archief${naAfronden ? `; het volgende komt op ${naAfronden.datum.split("-").reverse().join("-")} om ${naAfronden.tijd}` : ""}.`}
            className="abtn !py-2 text-[13.5px]"
          >
            <LuArchive /> Overleg afronden
          </ConfirmButton>
          <p className="text-[12.5px] text-black/45">
            De aanwezigen krijgen de notulen per mail. Het volgende overleg wordt gepland{naAfronden ? ` op ${overlegDag(`${naAfronden.datum}T12:00:00Z`).toLowerCase()} om ${naAfronden.tijd}` : ""}; niet besproken punten en de punten voor het volgende overleg schuiven door.
          </p>
        </section>
      )}

      {/* ---------- archief ---------- */}
      <section className="acard overflow-hidden" id="archief" aria-labelledby="archief-kop">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 id="archief-kop" className={sectieKop}><LuArchive /> Eerdere overleggen</h2>
        </div>
        {archief.length === 0 ? (
          <p className="px-6 py-5 text-[13.5px] text-black/45">Nog geen overleg afgerond. Na afloop staan de notulen hier terug te lezen.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {archief.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/overleg/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3.5 transition-colors hover:bg-black/[0.02]" data-archief={nlDelen(o.datum).datum}>
                  <span className="text-[14.5px] font-semibold text-[#1c1a4e]">{overlegTitel(o.datum)}</span>
                  <span className="text-[12.5px] tabular-nums text-black/45">
                    {o.punten} {o.punten === 1 ? "punt" : "punten"} · {o.acties} {o.acties === 1 ? "actiepunt" : "actiepunten"}{o.open ? ` (${o.open} lopend)` : ""}{o.gemaild_at ? " · gemaild" : ""}
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
          <h2 id="ritme-kop" className={sectieKop}><LuRepeat /> Ritme</h2>
          <p className="mb-4 mt-0.5 text-[12.5px] text-black/45">
            Elke {ritme.elke_weken === 1 ? "week" : `${ritme.elke_weken} weken`} op {WEEKDAGEN[ritme.weekdag - 1]} om {ritme.tijd.slice(0, 5)}, {ritme.duur_minuten ?? 60} minuten. Na het afronden plant het volgende overleg zich zo; de werkdag ervoor krijgt iedereen een herinnering met de agenda.
          </p>
          <form action={ritmeOpslaan} className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <div>
                <label htmlFor="ritme-duur" className="alabel">Minuten</label>
                <input id="ritme-duur" name="duur_minuten" type="number" min={15} max={240} step={15} required defaultValue={ritme.duur_minuten ?? 60} className="ainput" />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label htmlFor="ritme-locatie" className="alabel">Waar</label>
                <input id="ritme-locatie" name="locatie" maxLength={120} defaultValue={ritme.locatie ?? ""} placeholder="Kantoor, of Teams" className="ainput" />
              </div>
            </div>
            <div>
              <label htmlFor="ritme-punten" className="alabel">Structurele agendapunten <span className="font-normal text-black/35">(één per regel)</span></label>
              <textarea id="ritme-punten" name="vaste_punten" rows={6} defaultValue={ritme.vaste_punten.join("\n")} className="ainput resize-y" />
            </div>
            <div className="md:col-span-2">
              <button className="abtn-ghost !py-2 text-[13.5px]">Ritme bewaren</button>
              <span className="ml-3 text-[12.5px] text-black/40">Gelden vanaf het volgende overleg dat je plant. Een punt dat met &quot;Check in&quot; begint, krijgt een veld per aanwezige.</span>
            </div>
          </form>
        </section>
      )}

      {!beheer && !notulist && (
        <p className="flex items-center gap-2 text-[12.5px] text-black/40"><LuMessagesSquare className="shrink-0" /> Plannen en afronden doet het beheer, de notulist schrijft de notulen; jij brengt punten in en vinkt je eigen actiepunten af.</p>
      )}
    </div>
  );
}
