"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { slaEvaluatieOp, type EvaluatieState } from "@/app/(offerte)/evaluatie/actions";
import { kop, LAV, LINE, NAVY, PINK, SOFT, Vink } from "@/components/blocks/Gedeeld";
import {
  ACTIES, antwoordInfo, CHECKLIST, CHECKLIST_ANTWOORDEN, KTO_UITLEG, MAX_ACTIES, VOLGEND_BEZOEK, VRIJE_VELDEN, type Actie, type ChecklistAntwoord, type ChecklistSleutel,
  type EvaluatieAntwoorden,
} from "@/lib/evaluatie";
import { Band, GROEN, knop, Label, MUTE, ONDERDELEN, ROOD, SectieKop } from "./EvaluatieDelen";

/*
 * Het formulier "Klant Evaluatie" zoals de klant het invult (migratie 0043):
 * de vier delen als banden, om en om wit en lila, en onderaan de knop. Eén
 * formulier voor alles, zodat de klant in één keer kan opslaan en later kan
 * aanpassen. Na opslaan ververst de pagina, zodat de voortgang bovenaan klopt.
 */

export type Modus = "klant" | "collega" | "voorbeeld";

const veld =
  "w-full rounded-[14px] border bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F6F5FB] disabled:text-[#A9A7BC]";
const invoer = `${veld} h-[52px]`;
const vlak = `${veld} min-h-[120px] py-3 leading-[1.6]`;
const rand = (fout?: boolean) => (fout ? "border-[#D92D20] bg-[#FFF8F7]" : "border-[#DCDAE8]");
const CONCEPT = "Dit is een voorbeeld. De klant vult de evaluatie in via zijn eigen link, zodra hij verstuurd is.";

/** Wat de klant aan het invullen is: als de antwoorden, maar een punt mag nog zonder keuze zijn (alleen een toelichting). */
type Punt = { antwoord?: ChecklistAntwoord; toelichting?: string; vragen?: Record<string, string> };
type Invoer = Omit<EvaluatieAntwoorden, "checklist"> & { checklist: Partial<Record<ChecklistSleutel, Punt>> };

const leeg = (): Invoer => ({ checklist: {}, acties: [] });
const legeActie = (): Actie => ({ actie: "", door: "", status: "" });

function Melding({ state, klaar }: { state: EvaluatieState | null; klaar: string }) {
  if (!state) return null;
  return state.ok ? (
    <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {klaar}</p>
  ) : (
    <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>
  );
}

export default function EvaluatieFormulier({
  token, modus, begin, contactpersoon, ingevuld, pdfHref,
}: {
  token: string;
  modus: Modus;
  begin: EvaluatieAntwoorden | null;
  contactpersoon: string | null;
  ingevuld: boolean;
  pdfHref: string;
}) {
  const [a, setA] = useState<Invoer>(begin ? { ...leeg(), ...begin, checklist: { ...begin.checklist }, acties: begin.acties.map((x) => ({ ...x })) } : leeg());
  const [naam, setNaam] = useState(contactpersoon || "");
  const [state, setState] = useState<EvaluatieState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.velden || {};
  const uit = modus === "voorbeeld";
  const beantwoord = CHECKLIST.filter((p) => a.checklist[p.sleutel]?.antwoord).length;

  const zetPunt = (s: ChecklistSleutel, patch: Punt) => setA((v) => ({ ...v, checklist: { ...v.checklist, [s]: { ...v.checklist[s], ...patch } } }));
  const zetActie = (i: number, k: keyof Actie, w: string) => setA((v) => ({ ...v, acties: v.acties.map((x, n) => (n === i ? { ...x, [k]: w } : x)) }));

  const verstuur = () => {
    if (uit) return setState({ ok: false, fout: CONCEPT });
    start(async () => {
      const r = await slaEvaluatieOp(token, a, naam);
      setState(r);
      if (r.ok) {
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (r.velden) {
        const eerste = Object.keys(r.velden)[0]?.replace(/\./g, "-");
        document.getElementById(`ev-${eerste}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  // Losse randeigenschappen, geen `border`-verkorting: de kaart wisselt van randkleur (antwoord, fout) zonder dat React over het mengen klaagt.
  const kaart = (tint: boolean): React.CSSProperties =>
    tint ? { background: "#ffffff", boxShadow: "0 30px 70px -40px rgba(50,46,131,0.45)" } : { background: SOFT, borderWidth: 1, borderStyle: "solid", borderColor: LINE };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        verstuur();
      }}
      // Na een geslaagde opslag verdwijnt "opgeslagen" zodra de klant weer iets wijzigt: anders lijkt de wijziging al bewaard.
      onChange={() => { if (state?.ok) setState(null); }}
    >
      {/* Deel 1: de checklist */}
      <Band id="checklist" tint={false} label={ONDERDELEN[0].label}>
        <SectieKop eyebrow={ONDERDELEN[0].eyebrow} titel={ONDERDELEN[0].titel} tekst={ONDERDELEN[0].tekst} />
        <div className="flex items-center gap-3 text-[14px] font-semibold" style={{ color: MUTE }} aria-live="polite">
          <span className="h-1.5 w-32 overflow-hidden rounded-full" style={{ background: LAV }}>
            <span className="block h-full rounded-full transition-[width]" style={{ width: `${(beantwoord / CHECKLIST.length) * 100}%`, background: beantwoord === CHECKLIST.length ? GROEN : PINK }} />
          </span>
          {beantwoord} van {CHECKLIST.length} punten beantwoord
        </div>
        <ol className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
          {CHECKLIST.map((p, i) => {
            const r = a.checklist[p.sleutel];
            const fout = fouten[`checklist.${p.sleutel}`];
            const info = r?.antwoord ? antwoordInfo(r.antwoord) : null;
            return (
              <li
                key={p.sleutel}
                id={`ev-checklist-${p.sleutel}`}
                className="flex scroll-mt-[120px] flex-col gap-4 rounded-[24px] p-6 md:p-7"
                style={{ ...kaart(false), ...(fout ? { borderColor: ROOD, background: "#FFF8F7" } : info ? { borderColor: info.kleur } : {}) }}
                data-reveal
              >
                <div className="flex items-start gap-4">
                  <span className={`${kop} grid h-11 w-11 shrink-0 place-items-center rounded-full text-[16px]`} style={{ background: info ? info.kleur : "#ffffff", color: info ? "#ffffff" : NAVY, border: info ? "none" : `1px solid ${LINE}` }}>
                    {info ? <Vink size={16} /> : i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Label kleur={NAVY}>{p.titel}</Label>
                    <p className="m-0 text-[15px] leading-[1.65]" style={{ color: "#5E5C78" }}>{p.toelichting}</p>
                  </div>
                </div>
                <div role="radiogroup" aria-label={`${p.naam}: geregeld?`} className="flex flex-wrap gap-2">
                  {CHECKLIST_ANTWOORDEN.map((o) => {
                    const aan = r?.antwoord === o.key;
                    return (
                      <label
                        key={o.key}
                        className={`relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14.5px] font-bold transition-colors ${uit ? "cursor-not-allowed opacity-70" : ""}`}
                        style={aan ? { background: o.kleur, borderColor: o.kleur, color: "#ffffff" } : { background: "#ffffff", borderColor: LINE, color: NAVY }}
                      >
                        <input type="radio" name={`checklist-${p.sleutel}`} value={o.key} checked={aan} disabled={uit} onChange={() => zetPunt(p.sleutel, { antwoord: o.key })} className="sr-only" />
                        {aan && <Vink size={12} />}
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {fout && <p className="m-0 text-[14px] font-semibold" style={{ color: ROOD }}>{fout}</p>}
                {p.vragen?.map((v) => (
                  <label key={v.naam} htmlFor={`ev-${p.sleutel}-${v.naam}`} className="flex flex-col gap-1.5">
                    <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{v.label}</span>
                    <input
                      id={`ev-${p.sleutel}-${v.naam}`}
                      className={`${invoer} ${rand()}`}
                      value={r?.vragen?.[v.naam] || ""}
                      disabled={uit}
                      maxLength={5000}
                      onChange={(e) => zetPunt(p.sleutel, { vragen: { ...(r?.vragen || {}), [v.naam]: e.target.value } })}
                    />
                  </label>
                ))}
                <label htmlFor={`ev-${p.sleutel}-toelichting`} className="flex flex-col gap-1.5">
                  <span className="text-[13.5px] font-semibold" style={{ color: MUTE }}>Toelichting (mag leeg)</span>
                  <textarea
                    id={`ev-${p.sleutel}-toelichting`}
                    className={`${veld} ${rand()} min-h-[64px] py-3 leading-[1.5]`}
                    rows={2}
                    value={r?.toelichting || ""}
                    disabled={uit}
                    maxLength={5000}
                    placeholder="Bijvoorbeeld: wanneer het voor het laatst is bijgewerkt, of wat je nog mist."
                    onChange={(e) => zetPunt(p.sleutel, { toelichting: e.target.value })}
                  />
                </label>
              </li>
            );
          })}
        </ol>
      </Band>

      {/* Deel 2: de dienstverlening en de wensen */}
      <Band id="dienstverlening" tint label={ONDERDELEN[1].label}>
        <SectieKop eyebrow={ONDERDELEN[1].eyebrow} titel={ONDERDELEN[1].titel} tekst={ONDERDELEN[1].tekst} />
        <div className="grid gap-4 lg:grid-cols-2">
          {VRIJE_VELDEN.filter((v) => v.sleutel !== "afspraken").map((v, i) => (
            <div key={v.sleutel} className="flex flex-col gap-4 rounded-[24px] p-6 md:p-8" style={kaart(true)} data-reveal>
              <label htmlFor={`ev-${v.sleutel}`} className="flex flex-col gap-1.5">
                <span className={`${kop} text-[20px] leading-[1.3]`} style={{ color: NAVY }}>{v.titel}</span>
                <span className="text-[15px]" style={{ color: MUTE }}>{v.hint}</span>
              </label>
              <textarea id={`ev-${v.sleutel}`} className={`${vlak} ${rand()} min-h-[160px]`} value={a[v.sleutel] || ""} disabled={uit} maxLength={5000} onChange={(e) => setA({ ...a, [v.sleutel]: e.target.value })} />
              {i === 0 && <p className="m-0 text-[13.5px] leading-[1.55]" style={{ color: MUTE }}>{KTO_UITLEG}</p>}
            </div>
          ))}
        </div>
      </Band>

      {/* Deel 3: de afspraken en het volgende bezoek */}
      <Band id="afspraken" tint={false} label={ONDERDELEN[2].label}>
        <SectieKop eyebrow={ONDERDELEN[2].eyebrow} titel={ONDERDELEN[2].titel} tekst={ONDERDELEN[2].tekst} />
        <div className="flex flex-col gap-6 rounded-[24px] p-6 md:p-8" style={kaart(false)} data-reveal>
          <label htmlFor="ev-afspraken" className="flex flex-col gap-1.5">
            <span className={`${kop} text-[20px] leading-[1.3]`} style={{ color: NAVY }}>{VRIJE_VELDEN[2].titel}</span>
            <span className="text-[15px]" style={{ color: MUTE }}>{VRIJE_VELDEN[2].hint}</span>
          </label>
          <textarea id="ev-afspraken" className={`${vlak} ${rand()}`} value={a.afspraken || ""} disabled={uit} maxLength={5000} onChange={(e) => setA({ ...a, afspraken: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label htmlFor="ev-volgend_bezoek-datum" className="flex flex-col gap-1.5">
              <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{VOLGEND_BEZOEK.datum}</span>
              <input
                id="ev-volgend_bezoek-datum"
                type="date"
                className={`${invoer} ${rand(Boolean(fouten["volgend_bezoek.datum"]))}`}
                value={a.volgend_bezoek?.datum || ""}
                disabled={uit}
                aria-invalid={Boolean(fouten["volgend_bezoek.datum"])}
                onChange={(e) => setA({ ...a, volgend_bezoek: { ...(a.volgend_bezoek || {}), datum: e.target.value } })}
              />
              {fouten["volgend_bezoek.datum"] && <span className="text-[13.5px] font-semibold" style={{ color: ROOD }}>{fouten["volgend_bezoek.datum"]}</span>}
            </label>
            <label htmlFor="ev-volgend_bezoek-tijd" className="flex flex-col gap-1.5">
              <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{VOLGEND_BEZOEK.tijd}</span>
              <input id="ev-volgend_bezoek-tijd" className={`${invoer} ${rand()}`} value={a.volgend_bezoek?.tijd || ""} disabled={uit} maxLength={40} placeholder="10.00" onChange={(e) => setA({ ...a, volgend_bezoek: { ...(a.volgend_bezoek || {}), tijd: e.target.value } })} />
            </label>
            <label htmlFor="ev-volgend_bezoek-tot" className="flex flex-col gap-1.5">
              <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{VOLGEND_BEZOEK.tot}</span>
              <input id="ev-volgend_bezoek-tot" className={`${invoer} ${rand()}`} value={a.volgend_bezoek?.tot || ""} disabled={uit} maxLength={40} placeholder="11.30" onChange={(e) => setA({ ...a, volgend_bezoek: { ...(a.volgend_bezoek || {}), tot: e.target.value } })} />
            </label>
          </div>
        </div>
      </Band>

      {/* Deel 4: de acties, en opslaan */}
      <Band id="acties" tint label={ONDERDELEN[3].label}>
        <SectieKop eyebrow={ONDERDELEN[3].eyebrow} titel={ONDERDELEN[3].titel} tekst={ONDERDELEN[3].tekst} />
        <div className="flex flex-col gap-5 rounded-[24px] p-6 md:p-8" style={kaart(true)} data-reveal>
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_44px] gap-3 sm:grid" aria-hidden="true">
            <Label>{ACTIES.kolommen.actie}</Label><Label>{ACTIES.kolommen.door}</Label><Label>{ACTIES.kolommen.status}</Label><span />
          </div>
          {a.acties.length === 0 && <p className="m-0 text-[15px]" style={{ color: MUTE }}>Nog geen acties. Voeg er een toe, of laat dit aan ons over.</p>}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {a.acties.map((r, i) => (
              <li key={i} className="grid gap-3 rounded-[18px] p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_44px] sm:items-center sm:rounded-none sm:p-0" style={{ background: "transparent" }}>
                <label className="flex flex-col gap-1 sm:contents">
                  <span className="text-[13px] font-bold sm:hidden" style={{ color: MUTE }}>{ACTIES.kolommen.actie}</span>
                  <input id={`ev-actie-${i}`} className={`${invoer} ${rand()}`} value={r.actie} disabled={uit} maxLength={300} placeholder="Wat gaat er gebeuren?" onChange={(e) => zetActie(i, "actie", e.target.value)} aria-label={`Actie ${i + 1}`} />
                </label>
                <label className="flex flex-col gap-1 sm:contents">
                  <span className="text-[13px] font-bold sm:hidden" style={{ color: MUTE }}>{ACTIES.kolommen.door}</span>
                  <input className={`${invoer} ${rand()}`} value={r.door} disabled={uit} maxLength={300} placeholder="Wie" onChange={(e) => zetActie(i, "door", e.target.value)} aria-label={`Actie ${i + 1}: door wie`} />
                </label>
                <label className="flex flex-col gap-1 sm:contents">
                  <span className="text-[13px] font-bold sm:hidden" style={{ color: MUTE }}>{ACTIES.kolommen.status}</span>
                  <input className={`${invoer} ${rand()}`} value={r.status} disabled={uit} maxLength={300} placeholder="Open, gepland…" onChange={(e) => zetActie(i, "status", e.target.value)} aria-label={`Actie ${i + 1}: status`} />
                </label>
                <button
                  type="button"
                  disabled={uit}
                  onClick={() => setA({ ...a, acties: a.acties.filter((_, n) => n !== i) })}
                  className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-[20px] transition-colors hover:bg-[#FDECEA] hover:text-[#B42318] disabled:opacity-40"
                  style={{ color: MUTE }}
                  aria-label={`Actie ${i + 1} weghalen`}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          {a.acties.length < MAX_ACTIES && (
            <button type="button" disabled={uit} onClick={() => setA({ ...a, acties: [...a.acties, legeActie()] })} className={`${knop.rand} self-start`}>
              + Actie toevoegen
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5 rounded-[24px] p-6 md:p-8" style={{ background: NAVY }} data-reveal>
          <div className="flex flex-col gap-1">
            <span className={`${kop} text-[22px] text-white`}>{ingevuld ? "Wijzigingen opslaan" : "Klaar? Verstuur je evaluatie."}</span>
            <span className="text-[15px]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {ingevuld ? "Je kunt je antwoorden tot ons gesprek aanpassen; wij werken met de laatste versie." : "Je krijgt een kopie als pdf per mail. Aanpassen kan daarna nog steeds via deze pagina."}
            </span>
          </div>
          <label htmlFor="ev-naam" className="flex max-w-[420px] flex-col gap-1.5">
            <span className="text-[14.5px] font-bold text-white">Ingevuld door</span>
            <input id="ev-naam" className={`${invoer} ${rand()}`} value={naam} disabled={uit} maxLength={200} autoComplete="name" onChange={(e) => setNaam(e.target.value)} />
          </label>
          <Melding state={state} klaar={ingevuld ? "Opgeslagen. Dank je wel!" : "Verstuurd. Dank je wel!"} />
          <div className="flex flex-wrap items-center gap-4">
            <button className={knop.roze} disabled={bezig || uit} title={uit ? CONCEPT : undefined}>
              <Vink /> {bezig ? "Opslaan…" : ingevuld ? "Wijzigingen opslaan" : "Evaluatie versturen"}
            </button>
            {ingevuld && <a href={`${pdfHref}?download=1`} className={knop.wit}>Download als pdf</a>}
            {uit && <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.75)" }}>{CONCEPT}</span>}
          </div>
        </div>
      </Band>
    </form>
  );
}
