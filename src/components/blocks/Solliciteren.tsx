"use client";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { leesBron } from "@/components/site/BronOnthouden";
import { submitApplication, type FormState } from "@/app/(site)/actions";
import { NAVY, PINK, BODY, MUTE, SOFT, TEAL, kop, Pijl } from "./Gedeeld";
import { DOCUMENTEN } from "@/lib/documenten";
import TurnstileField from "@/components/site/TurnstileField";
import { useTaal } from "@/components/site/Taal";
import { LINKEDIN_CLIENT_ID, LI_PROFIEL_COOKIE, leesLinkedInProfiel } from "@/lib/linkedin";

const geenAbonnement = () => () => {};
const cookieNu = () => document.cookie;
const geenCookie = () => "";

function LinkedInLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>
  );
}

/*
 * Snel solliciteren (canvas: Werken bij en Vacature). Kort formulier:
 * functie kiezen, naam, e-mail, telefoon en optioneel een cv. Gaat via
 * submitApplication naar Sollicitaties in de admin. De teksten komen uit het
 * woordenboek; het veld `taal` gaat mee, zodat de foutmeldingen in dezelfde
 * taal terugkomen en het Postvak IN ziet uit welke taal de sollicitatie kwam.
 */

const veld =
  "h-[52px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

export type Keuze = { id: string; title: string };

export default function Solliciteren({ keuzes, vast, kopTekst, duur }: {
  keuzes: Keuze[];
  /** Op een vacaturepagina ligt de functie vast. */
  vast?: Keuze;
  kopTekst?: string;
  duur?: string;
}) {
  const { taal, t } = useTaal();
  const f = t.formulier;
  const s = f.sollicitatie;
  const opties: Keuze[] = vast ? [vast] : [...keuzes, { id: "", title: s.open }];
  const [keuze, setKeuze] = useState<Keuze>(opties[0]);
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null);
  const pad = usePathname();
  // Na "Solliciteer met LinkedIn" staan naam en e-mail tien minuten in een cookie.
  const profiel = leesLinkedInProfiel(useSyncExternalStore(geenAbonnement, cookieNu, geenCookie));
  useEffect(() => {
    if (state?.ok) document.cookie = `${LI_PROFIEL_COOKIE}=; Max-Age=0; path=/`;
  }, [state?.ok]);

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h3 className={`${kop} m-0 text-[26px] leading-[1.2]`} style={{ color: NAVY }}>{s.bedankt}</h3>
        <p className="m-0 text-[17px] leading-[1.65]" style={{ color: BODY }}>{s.bedanktTekst}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" onSubmit={(e) => {
      // De bron (BronOnthouden) pas bij het versturen invullen.
      const bronVeld = e.currentTarget.elements.namedItem("bron");
      if (bronVeld instanceof HTMLInputElement) bronVeld.value = leesBron();
    }}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${kop} m-0 text-[24px]`} style={{ color: NAVY }}>{kopTekst || s.kop}</h3>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold" style={{ background: "#E5F5F4", color: TEAL }}>{duur || s.duur2}</span>
      </div>
      <input type="hidden" name="taal" value={taal} />
      <input type="hidden" name="vacancy_id" value={keuze.id} />
      <input type="hidden" name="vacancy_title" value={keuze.title} />
      <input type="hidden" name="bron" defaultValue="" />
      <input type="hidden" name="via_linkedin" value={profiel ? "1" : ""} />
      {LINKEDIN_CLIENT_ID && (profiel ? (
        <p className="m-0 flex items-center gap-2 rounded-[12px] px-4 py-3 text-[14.5px] font-semibold" style={{ background: "#E8F1FA", color: "#0A66C2" }}>
          <LinkedInLogo /> {s.linkedinIngevuld}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <a href={`/api/linkedin/start?terug=${encodeURIComponent(pad || "/vacatures")}`}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0A66C2" }}>
            <LinkedInLogo /> {s.linkedinKnop}
          </a>
          <span className="text-center text-[13px]" style={{ color: MUTE }}>{s.linkedinOf}</span>
        </div>
      ))}
      {!vast && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-[14px] font-semibold" style={{ color: NAVY }}>{s.ikSolliciteerOp}</legend>
          <div className="flex flex-wrap gap-2">
            {opties.map((o) => {
              const aan = o.title === keuze.title;
              return (
                <button key={o.title} type="button" onClick={() => setKeuze(o)} aria-pressed={aan}
                  className="inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-left text-[14.5px] font-semibold leading-[1.3] transition-colors"
                  style={{ borderColor: aan ? PINK : "#D9D8E6", background: aan ? "#FDECF4" : "#ffffff", color: NAVY }}>
                  {o.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.naam}</span>
          <input key={profiel ? "li" : "leeg"} defaultValue={profiel?.naam} className={veld} name="name" autoComplete="name" required maxLength={200} placeholder={f.naamPlaceholder} /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.email}</span>
          <input key={profiel ? "li" : "leeg"} defaultValue={profiel?.email} className={veld} name="email" type="email" autoComplete="email" required maxLength={200} placeholder={f.emailPlaceholder} /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.telefoon}</span>
          <input className={veld} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder={f.telefoonPlaceholder} /></label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{s.linkedin} <span className="font-normal" style={{ color: MUTE }}>{s.linkedinOptioneel}</span></span>
          <input className={veld} name="linkedin" type="url" inputMode="url" autoComplete="url" maxLength={300} placeholder="https://www.linkedin.com/in/..." />
          <span className="text-[13px]" style={{ color: MUTE }}>{s.linkedinHint}</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{s.cv} <span className="font-normal" style={{ color: MUTE }}>{s.cvOptioneel}</span></span>
          <input name="cv" type="file" accept=".pdf,.doc,.docx"
            className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#CFCDE2] px-4 py-3.5 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-[#322E83]"
            style={{ background: SOFT, color: BODY }} />
          <span className="text-[13px]" style={{ color: MUTE }}>{s.cvHint}</span>
        </label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="flex items-start gap-3 text-[14.5px] leading-[1.5]" style={{ color: BODY }}>
        <input type="checkbox" name="retain_longer" className="mt-1 h-4 w-4 shrink-0 accent-[#322E83]" />
        <span>
          {s.bewaren}{" "}
          <span style={{ color: MUTE }}>{s.bewarenUitleg}</span>
        </span>
      </label>
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <button disabled={pending}
        className="hv-btn hv-btn-roze mt-1 inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full px-7 text-[16px] font-bold disabled:opacity-60">
        {pending ? f.bezig : <>{s.verstuur}<Pijl size={18} /></>}
      </button>
      <span className="text-center text-[13px] leading-[1.5]" style={{ color: MUTE }}>
        {s.privacyVoor}<a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>{s.privacyLink}</a>{s.privacyNa}
      </span>
    </form>
  );
}
