"use client";
import { useActionState, useState } from "react";
import { saveOnboarding, type OnboardingFormState } from "@/app/admin/onboardingActions";
import { BERICHT_STANDAARD, DOCUMENTEN, type DocumentSleutel, type Onboarding } from "@/lib/onboarding";
import { LuSave, LuCheck, LuPencilLine, LuFileDown, LuSheet } from "react-icons/lu";

/** Waarmee het formulier begint: leeg, vooringevuld of een bestaande onboarding. */
export type OnboardingBegin = Partial<
  Pick<Onboarding, "id" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "bericht" | "documenten" | "invullen" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon">
>;

/**
 * De onboarding in het beheer: voor wie, welke documenten meegaan en welke
 * daarvan de klant online invult, het persoonlijke woord en de afzender.
 */
export default function OnboardingForm({ begin, nieuw, ingevuld = [] }: { begin: OnboardingBegin; nieuw: boolean; ingevuld?: DocumentSleutel[] }) {
  const [state, action, bezig] = useActionState<OnboardingFormState, FormData>(saveOnboarding, null);
  const [mee, setMee] = useState<string[]>(begin.documenten ?? DOCUMENTEN.filter((d) => d.standaard.mee).map((d) => d.sleutel));
  const [invul, setInvul] = useState<string[]>(begin.invullen ?? DOCUMENTEN.filter((d) => d.standaard.invullen).map((d) => d.sleutel));
  const wissel = (lijst: string[], s: string) => (lijst.includes(s) ? lijst.filter((x) => x !== s) : [...lijst, s]);
  const aantalInvul = mee.filter((s) => invul.includes(s) && DOCUMENTEN.find((d) => d.sleutel === s)?.invullen).length;

  return (
    <form action={action} className="space-y-6">
      {begin.id && <input type="hidden" name="id" value={begin.id} />}
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Klant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="ob-bedrijf">Bedrijf *</label>
            <input id="ob-bedrijf" className="ainput" name="bedrijf" defaultValue={begin.bedrijf || ""} required maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-cp">Contactpersoon</label>
            <input id="ob-cp" className="ainput" name="contactpersoon" defaultValue={begin.contactpersoon || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-email">E-mail</label>
            <input id="ob-email" className="ainput" name="email" type="email" defaultValue={begin.email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-tel">Telefoon</label>
            <input id="ob-tel" className="ainput" name="telefoon" defaultValue={begin.telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Documenten</h2>
            <p className="mt-1 text-[13.5px] text-black/50">
              Vink aan wat meegaat. Bij een formulier kies je of de klant het online invult, of het als pdf of Excel krijgt om zelf terug te mailen.
            </p>
          </div>
          <p className="text-[13px] font-semibold text-black/50">{mee.length} mee · {aantalInvul} online invullen</p>
        </div>
        <ul className="mt-5 space-y-2.5">
          {DOCUMENTEN.map((d) => {
            const aan = mee.includes(d.sleutel);
            const online = aan && d.invullen !== null && invul.includes(d.sleutel);
            const heeftAntwoord = ingevuld.includes(d.sleutel);
            return (
              <li
                key={d.sleutel}
                className={`rounded-[14px] border p-4 transition-colors ${aan ? "border-[#312e82]/25 bg-white" : "border-black/[0.07] bg-black/[0.015]"}`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input type="checkbox" name="mee" value={d.sleutel} checked={aan} onChange={() => setMee(wissel(mee, d.sleutel))} className="sr-only" />
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 text-[14px] text-white transition-colors"
                      style={{ background: aan ? d.kleur : "white", borderColor: aan ? d.kleur : "rgba(0,0,0,0.18)" }}
                    >
                      {aan && <LuCheck />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[15px] font-semibold ${aan ? "text-[#1c1a4e]" : "text-black/50"}`}>
                        {d.titel}
                        {heeftAntwoord && <span className="ml-2 rounded-full bg-[#e3f6ed] px-2 py-0.5 text-[11.5px] font-bold text-[#0a7a4b]">al ingevuld</span>}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-[1.5] text-black/50">{d.kort}</span>
                    </span>
                  </label>
                  {d.invullen !== null ? (
                    <div
                      role="radiogroup"
                      aria-label={`Hoe krijgt de klant ${d.titel}`}
                      className={`flex shrink-0 rounded-full bg-black/[0.04] p-1 text-[12.5px] font-semibold ${aan ? "" : "pointer-events-none opacity-40"}`}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={online}
                        onClick={() => setInvul(invul.includes(d.sleutel) ? invul : [...invul, d.sleutel])}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${online ? "bg-white text-[#312e82] shadow-sm" : "text-black/50"}`}
                      >
                        <LuPencilLine /> Online invullen
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={aan && !online}
                        onClick={() => setInvul(invul.filter((x) => x !== d.sleutel))}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${aan && !online ? "bg-white text-[#312e82] shadow-sm" : "text-black/50"}`}
                      >
                        {d.excel ? <LuSheet /> : <LuFileDown />} {d.excel ? "Excel" : "Pdf"} meesturen
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold text-black/40 ${aan ? "" : "opacity-40"}`}>
                      <LuFileDown /> Lezen en pdf
                    </span>
                  )}
                  {online && <input type="hidden" name="invul" value={d.sleutel} />}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Persoonlijk woord</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Staat bovenaan de onboardingpagina. Gebruik {"{bedrijf}"} en {"{voornaam}"}: die vult de pagina zelf in.
        </p>
        <textarea id="ob-bericht" className="ainput mt-4 min-h-[150px]" name="bericht" defaultValue={begin.bericht ?? BERICHT_STANDAARD} maxLength={5000} aria-label="Persoonlijk woord" />
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Afzender</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Staat als aanspreekpunt op de pagina en in de mail, en krijgt een seintje als de klant iets invult.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="ob-an">Naam</label>
            <input id="ob-an" className="ainput" name="afzender_naam" defaultValue={begin.afzender_naam || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-af">Functie</label>
            <input id="ob-af" className="ainput" name="afzender_functie" defaultValue={begin.afzender_functie || ""} maxLength={200} placeholder="Mag leeg" />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-ae">E-mail</label>
            <input id="ob-ae" className="ainput" name="afzender_email" type="email" defaultValue={begin.afzender_email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ob-at">Telefoon</label>
            <input id="ob-at" className="ainput" name="afzender_telefoon" defaultValue={begin.afzender_telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      {state?.fout && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{state.fout}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="abtn" disabled={bezig || mee.length === 0}><LuSave /> {bezig ? "Opslaan…" : nieuw ? "Onboarding aanmaken" : "Opslaan"}</button>
        {nieuw && <span className="text-[13px] text-black/50">Daarna kun je hem bekijken en versturen.</span>}
        {mee.length === 0 && <span className="text-[13px] text-[#b42318]">Kies minstens één document.</span>}
      </div>
    </form>
  );
}
