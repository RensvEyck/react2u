"use client";
import { useActionState } from "react";
import { submitContact, type FormState } from "@/app/(site)/actions";
import { outfit } from "./HomeVerhaal";
import { DOCUMENTEN } from "@/lib/documenten";
import { BIJTEKST, ROZE } from "@/lib/kleuren";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Contactpagina (ontwerp "Contact", strak en simpel): links de gegevens onder
 * elkaar, rechts het formulier in een lichtgrijs vlak. Koppen in Outfit, tekst
 * in DM Sans (klassen .hv en .hv-kop in globals.css).
 */

const NAVY = "#322E83";
const PINK = ROZE;
const BODY = "#5E5C78";
const MUTE = BIJTEKST;
const LINE = "#E6E5EF";
const SOFT = "#F6F5FB";

const veld =
  "h-[52px] w-full rounded-[10px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-bijtekst focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

function Pijl() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Label({ children, optioneel }: { children: React.ReactNode; optioneel?: boolean }) {
  return (
    <span className="flex items-baseline justify-between text-[14px] font-semibold" style={{ color: NAVY }}>
      {children}
      {optioneel && <span className="text-[13px] font-normal" style={{ color: MUTE }}>optioneel</span>}
    </span>
  );
}

function Formulier({ heading, note }: { heading: string; note?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h2 className="hv-kop m-0 text-[28px] leading-[1.2] tracking-[-0.4px]" style={{ color: NAVY }}>Bedankt voor je bericht</h2>
        <p className="m-0 text-[17px] leading-[1.65]" style={{ color: BODY }}>We nemen binnen één werkdag contact met je op.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-[22px]">
      <h2 className="hv-kop m-0 text-[26px] leading-[1.2] tracking-[-0.4px] md:text-[28px]" style={{ color: NAVY }}>{heading}</h2>
      <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <label className="flex flex-col gap-2"><Label>Naam</Label>
          <input className={veld} name="name" autoComplete="name" required maxLength={200} placeholder="Voor- en achternaam" /></label>
        <label className="flex flex-col gap-2"><Label optioneel>Organisatie</Label>
          <input className={veld} name="subject" autoComplete="organization" maxLength={200} placeholder="Naam organisatie" /></label>
        <label className="flex flex-col gap-2"><Label>E-mailadres</Label>
          <input className={veld} name="email" type="email" autoComplete="email" required maxLength={200} placeholder="naam@bedrijf.nl" /></label>
        <label className="flex flex-col gap-2"><Label>Telefoonnummer</Label>
          <input className={veld} name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="06 12 34 56 78" /></label>
        <label className="flex flex-col gap-2 sm:col-span-2"><Label>Bericht</Label>
          <textarea className={`${veld} h-[160px] resize-none py-3.5 leading-[1.6]`} name="message" required maxLength={4000} placeholder="Waar kunnen we je mee helpen?" /></label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[14px] leading-[1.55]" style={{ color: MUTE }}>
          {note || "Deel hier geen medische informatie."}{" "}
          <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2">Privacy</a>
        </span>
        <button disabled={pending}
          className="hv-btn hv-btn-roze inline-flex h-[52px] items-center justify-center gap-2.5 self-start whitespace-nowrap rounded-full px-[26px] text-[16px] font-bold disabled:opacity-60 sm:self-auto">
          {pending ? "Versturen…" : <>Versturen<Pijl /></>}
        </button>
      </div>
    </form>
  );
}

export function ContactSimpel({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const rows = ((d.rows as any[]) || []).filter((r) => r?.value);
  const bedrijf = ((d.company as string[]) || []).filter(Boolean);
  return (
    <section aria-label="Contact" className={`hv bg-white ${outfit.variable}`}>
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-24 pt-14 md:px-10 lg:grid-cols-12 lg:gap-6 lg:px-16 xl:px-[120px] lg:pb-[120px] lg:pt-20">
        <div className="flex flex-col lg:col-span-4">
          <H className="hv-kop m-0 mb-4 text-[44px] leading-[1.05] tracking-[-1.1px] md:text-[56px] md:tracking-[-1.4px]" style={{ color: NAVY }}>
            {d.heading || "Contact"}
          </H>
          {d.text && <p className="m-0 mb-10 text-[17px] leading-[1.65]" style={{ color: BODY }}>{d.text}</p>}
          <div className="flex flex-col border-b" style={{ borderColor: LINE }}>
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col gap-1.5 border-t py-6" style={{ borderColor: LINE }}>
                <span className="text-[14px]" style={{ color: MUTE }}>{r.label}</span>
                {r.href ? (
                  <a href={r.href} className="hv-kop whitespace-pre-line text-[22px] leading-[1.3] hover:text-accent" style={{ color: NAVY, fontWeight: 500, fontFamily: "var(--font-outfit), var(--font-dm-sans), sans-serif" }}>{r.value}</a>
                ) : (
                  <span className="hv-kop whitespace-pre-line text-[22px] leading-[1.3]" style={{ color: NAVY, fontWeight: 500, fontFamily: "var(--font-outfit), var(--font-dm-sans), sans-serif" }}>{r.value}</span>
                )}
                {r.sub && <span className="text-[15px]" style={{ color: BODY }}>{r.sub}</span>}
              </div>
            ))}
          </div>
          {bedrijf.length > 0 && (
            <p className="m-0 mt-7 text-[14px] leading-[1.7]" style={{ color: MUTE }}>
              {bedrijf.map((b, i) => <span key={i} className="block">{b}</span>)}
            </p>
          )}
        </div>
        <div className="self-start rounded-[20px] p-6 md:p-12 lg:col-span-7 lg:col-start-6" style={{ background: SOFT }}>
          <Formulier heading={d.formHeading || "Stuur een bericht"} note={d.note} />
        </div>
      </div>
    </section>
  );
}
