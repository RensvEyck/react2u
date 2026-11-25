"use client";
import { useActionState, useId } from "react";
import { LuDownload, LuMailCheck } from "react-icons/lu";
import { submitChecklist, type FormState } from "@/app/(site)/actions";
import { metHerkomst } from "@/components/site/BronOnthouden";
import TurnstileField from "@/components/site/TurnstileField";
import { NAVY, BODY, MUTE, LINE, kop, Pijl } from "@/components/blocks/Gedeeld";

/*
 * Het formulier bij de checklist poortwachterdossier: naam, e-mail en bedrijf,
 * dan de pdf per mail en meteen als download. De aanvraag komt als bericht in
 * het Postvak IN (zodat een collega kan bellen), met dezelfde spamcontrole als
 * de andere formulieren (honeypot, limiet, Turnstile). Zie submitChecklist in
 * app/(site)/actions.ts.
 */

async function verstuur(prev: FormState, fd: FormData): Promise<FormState> {
  return submitChecklist(prev, metHerkomst(fd));
}

const VELD =
  "h-[54px] w-full rounded-[14px] border bg-white px-4 text-[16px] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

export default function ChecklistAanvraag({ pdfHref }: { pdfHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verstuur, null);
  const id = useId();
  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4 rounded-[24px] p-6 md:p-8" style={{ background: "#E5F5F4" }} aria-live="polite">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white" style={{ color: "#007A6D" }}><LuMailCheck size={24} aria-hidden /></span>
        <span className={`${kop} text-[24px] leading-[1.2]`} style={{ color: NAVY }}>De checklist is onderweg</span>
        <p className="m-0 max-w-[560px] text-[16px] leading-[1.65]" style={{ color: BODY }}>Je vindt de pdf binnen een paar minuten in je mailbox. Wil je niet wachten? Download hem hier meteen.</p>
        <a href={pdfHref} className="hv-btn hv-btn-roze inline-flex h-[54px] items-center gap-2.5 self-start rounded-full px-6 text-[15px] font-bold"><LuDownload size={18} aria-hidden />Download de checklist (pdf)</a>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4 rounded-[24px] border bg-white p-6 md:p-8" style={{ borderColor: LINE }} noValidate>
      <div className="flex flex-col gap-1">
        <span className={`${kop} text-[24px] leading-[1.2]`} style={{ color: NAVY }}>Stuur mij de checklist</span>
        <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>Als pdf in je mailbox, om af te vinken per dossier. Geen nieuwsbrief, geen verplichtingen.</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor={`${id}-naam`} className="flex flex-col gap-2">
          <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>Naam</span>
          <input id={`${id}-naam`} name="name" required autoComplete="name" className={VELD} style={{ borderColor: LINE, color: NAVY }} />
        </label>
        <label htmlFor={`${id}-email`} className="flex flex-col gap-2">
          <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>E-mailadres</span>
          <input id={`${id}-email`} name="email" type="email" required autoComplete="email" inputMode="email" className={VELD} style={{ borderColor: LINE, color: NAVY }} />
        </label>
        <label htmlFor={`${id}-bedrijf`} className="flex flex-col gap-2 md:col-span-2">
          <span className="flex items-baseline justify-between text-[14.5px] font-bold" style={{ color: NAVY }}>Bedrijf <span className="text-[13px] font-normal" style={{ color: MUTE }}>optioneel</span></span>
          <input id={`${id}-bedrijf`} name="company" autoComplete="organization" className={VELD} style={{ borderColor: LINE, color: NAVY }} />
        </label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="taal" value="nl" />
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="m-0 rounded-[14px] px-4 py-3 text-[15px]" style={{ background: "#FDECF4", color: "#A50F52" }}>{state.error}</p>}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button type="submit" disabled={pending} className="hv-btn hv-btn-roze inline-flex h-[54px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold disabled:opacity-60">
          {pending ? "Bezig met versturen…" : <>Stuur de checklist<Pijl /></>}
        </button>
        <span className="text-[13.5px] leading-[1.5]" style={{ color: MUTE }}>We gebruiken je gegevens alleen om de checklist te sturen en je vraag te beantwoorden.</span>
      </div>
    </form>
  );
}
