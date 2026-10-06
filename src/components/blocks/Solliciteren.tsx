"use client";
import { useActionState, useState } from "react";
import { submitApplication, type FormState } from "@/app/(site)/actions";
import { NAVY, PINK, BODY, MUTE, SOFT, TEAL, kop, Pijl } from "./Gedeeld";
import { DOCUMENTEN } from "@/lib/documenten";

/*
 * Snel solliciteren (canvas: Werken bij en Vacature). Kort formulier:
 * functie kiezen, naam, e-mail, telefoon en optioneel een cv. Gaat via
 * submitApplication naar Sollicitaties in de admin.
 */

const veld =
  "h-[52px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-bijtekst focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

export type Keuze = { id: string; title: string };

export default function Solliciteren({ keuzes, vast, kopTekst = "Snel solliciteren", duur = "2 minuten" }: {
  keuzes: Keuze[];
  /** Op een vacaturepagina ligt de functie vast. */
  vast?: Keuze;
  kopTekst?: string;
  duur?: string;
}) {
  const opties: Keuze[] = vast ? [vast] : [...keuzes, { id: "", title: "Open sollicitatie" }];
  const [keuze, setKeuze] = useState<Keuze>(opties[0]);
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null);

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h3 className={`${kop} m-0 text-[26px] leading-[1.2]`} style={{ color: NAVY }}>Bedankt voor je sollicitatie</h3>
        <p className="m-0 text-[17px] leading-[1.65]" style={{ color: BODY }}>Je hoort binnen vijf werkdagen van ons.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${kop} m-0 text-[24px]`} style={{ color: NAVY }}>{kopTekst}</h3>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold" style={{ background: "#E5F5F4", color: TEAL }}>{duur}</span>
      </div>
      <input type="hidden" name="vacancy_id" value={keuze.id} />
      <input type="hidden" name="vacancy_title" value={keuze.title} />
      {!vast && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-[14px] font-semibold" style={{ color: NAVY }}>Ik solliciteer op</legend>
          <div className="flex flex-wrap gap-2">
            {opties.map((o) => {
              const aan = o.title === keuze.title;
              return (
                <button key={o.title} type="button" onClick={() => setKeuze(o)} aria-pressed={aan}
                  className="inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-left text-[14.5px] font-semibold leading-[1.3] transition-colors"
                  style={{ borderColor: aan ? PINK : "#D9D8E6", background: aan ? "#fef0f7" : "#ffffff", color: NAVY }}>
                  {o.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>Naam</span>
          <input className={veld} name="name" autoComplete="name" required maxLength={200} placeholder="Je voor- en achternaam" /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>E-mailadres</span>
          <input className={veld} name="email" type="email" autoComplete="email" required maxLength={200} placeholder="naam@voorbeeld.nl" /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>Telefoonnummer</span>
          <input className={veld} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="06 12345678" /></label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Cv <span className="font-normal" style={{ color: MUTE }}>(optioneel, mag ook later)</span></span>
          <input name="cv" type="file" accept=".pdf,.doc,.docx"
            className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#CFCDE2] px-4 py-3.5 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-[#322E83]"
            style={{ background: SOFT, color: BODY }} />
          <span className="text-[13px]" style={{ color: MUTE }}>PDF of Word, maximaal 8 MB</span>
        </label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <button disabled={pending}
        className="hv-btn hv-btn-roze mt-1 inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full px-7 text-[16px] font-bold disabled:opacity-60">
        {pending ? "Versturen…" : <>Verstuur sollicitatie<Pijl size={18} /></>}
      </button>
      <span className="text-center text-[13px] leading-[1.5]" style={{ color: MUTE }}>
        We gaan zorgvuldig om met je gegevens, lees onze <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>privacyverklaring</a>.
      </span>
    </form>
  );
}
