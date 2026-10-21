"use client";
import { useActionState } from "react";
import { submitPartner, type FormState } from "@/app/(site)/actions";
import { PARTNER_OMVANG, PARTNER_SOORTEN } from "@/lib/partners";
import { DOCUMENTEN } from "@/lib/documenten";
import TurnstileField from "@/components/site/TurnstileField";
import { useTaal } from "@/components/site/Taal";
import { NAVY, PINK, BODY, kop, Pijl } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Aanmelden voor het partnerprogramma: een terugbelverzoek met wat we over
 * het kantoor moeten weten. Gaat via submitPartner naar het Postvak IN en per
 * mail naar sales. De teksten staan in de blokdata (`form`); de keuzes in
 * lib/partners.ts, omdat de server alleen die aanneemt.
 */

const veld =
  "h-[52px] w-full rounded-[14px] border-[1.5px] border-[#D9D6E8] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[15px] font-bold" style={{ color: NAVY }}>{children}</span>;
}

function Keuze({ name, opties, leeg }: { name: string; opties: readonly string[]; leeg?: string }) {
  return (
    <span className="relative block">
      <select className={`${veld} appearance-none pr-11`} name={name} defaultValue={leeg ? "" : opties[0]}>
        {leeg && <option value="">{leeg}</option>}
        {opties.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </span>
  );
}

export default function PartnerFormulier({ f }: { f: any }) {
  const { taal, t } = useTaal();
  const [state, action, pending] = useActionState<FormState, FormData>(submitPartner, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h3 className={`${kop} m-0 text-[26px] leading-[1.2]`} style={{ color: NAVY }}>{f.bedankt}</h3>
        <p className="m-0 text-[17px] leading-[1.6]" style={{ color: BODY }}>{f.bedanktTekst}</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="taal" value={taal} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5"><Label>{f.naam}</Label>
          <input className={veld} name="name" autoComplete="name" required maxLength={200} /></label>
        <label className="flex min-w-0 flex-col gap-1.5"><Label>{f.kantoor}</Label>
          <input className={veld} name="company" autoComplete="organization" required maxLength={200} /></label>
        <label className="flex min-w-0 flex-col gap-1.5"><Label>{f.email}</Label>
          <input className={veld} name="email" type="email" autoComplete="email" required maxLength={200} /></label>
        <label className="flex min-w-0 flex-col gap-1.5"><Label>{f.telefoon}</Label>
          <input className={veld} name="phone" type="tel" autoComplete="tel" required maxLength={40} /></label>
      </div>
      <label className="flex flex-col gap-1.5"><Label>{f.soort}</Label>
        <Keuze name="soort" opties={PARTNER_SOORTEN} /></label>
      <label className="flex flex-col gap-1.5"><Label>{f.omvang}</Label>
        <Keuze name="omvang" opties={PARTNER_OMVANG} leeg={f.omvangLeeg} /></label>
      <label className="flex items-start gap-2.5 text-[15px] leading-[1.5]" style={{ color: BODY }}>
        <input type="checkbox" name="privacy" value="ja" required className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[#322E83]" />
        <span>
          {f.privacyVoor}{" "}
          <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-bold underline underline-offset-2" style={{ color: NAVY }}>{f.privacyLink}</a>
          {f.privacyNa}
        </span>
      </label>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <button disabled={pending}
        className="hv-btn hv-btn-roze inline-flex h-[56px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-5 text-[15px] font-bold disabled:opacity-60 sm:px-7 sm:text-[16px]">
        {pending ? t.formulier.bezig : <>{f.knop}<Pijl /></>}
      </button>
    </form>
  );
}
