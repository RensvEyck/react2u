"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";
import { LuPhone, LuPhoneCall, LuX } from "react-icons/lu";
import type { ContactInfo } from "@/lib/content";
import { toontBelbalk } from "@/lib/belbalk";
import { TERUGBEL_MOMENTEN } from "@/lib/formulier";
import { DOCUMENTEN } from "@/lib/documenten";
import { submitTerugbel, type FormState } from "@/app/(site)/actions";
import { Bedankt } from "./FormField";
import TurnstileField from "./TurnstileField";
import { useTaal } from "./Taal";
import { telefoonInTaal, vul } from "@/lib/taal";
import { K, letter } from "./r2uStijl";

/**
 * Vaste balk onderaan het scherm op de telefoon, alleen op de
 * werkgeverspagina's (lib/belbalk.ts): direct bellen, of een terugbelmoment
 * aanvragen in een paneel dat van onderen omhoogschuift. Op een laptop staat
 * het nummer al in de header; daar is de balk weg.
 *
 * Staat in SiteShell binnen <main>, zodat hij met het mobiele menu mee
 * `inert` wordt en onder de header (z-50) blijft. Zolang hij zichtbaar is,
 * zet hij `data-belbalk` op <html>: globals.css geeft de pagina dan onderaan
 * ruimte en schuift de cookiemelding erboven.
 *
 * Vormgeving als de header en footer van het nieuwe ontwerp (DM Sans, pillen,
 * magenta voor de hoofdactie), zodat de balk niet als een vreemd element
 * onder de pagina hangt.
 */

const VELD =
  "h-[52px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

function Veld({ label, optioneel, children }: { label: string; optioneel?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-[14px] font-semibold" style={{ color: K.indigo }}>
        {label}
        {optioneel && <span className="text-[13px] font-normal" style={{ color: K.klein }}>{optioneel}</span>}
      </span>
      {children}
    </label>
  );
}

function Pijl() {
  return (
    <svg className="hn-pijl" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function BelBalk({ contact }: { contact: ContactInfo }) {
  const { taal, t } = useTaal();
  const b = t.belbalk;
  const f = t.formulier;
  const path = usePathname() || "/";
  const zichtbaar = toontBelbalk(path);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(submitTerugbel, null);

  useEffect(() => {
    if (!zichtbaar) return;
    document.documentElement.dataset.belbalk = "1";
    return () => {
      delete document.documentElement.dataset.belbalk;
    };
  }, [zichtbaar]);

  if (!zichtbaar) return null;

  const nummer = telefoonInTaal(contact.phoneDisplay, taal);
  const sluit = () => dialog.current?.close();

  return (
    <>
      <div className={`rk ${letter.className} fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 md:hidden print:hidden`}
        style={{ borderColor: K.lijn }}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2.5">
          {/* Alleen het nummer: "Bel 085 620 58 00" past niet op een halve
              telefoonbreedte; het pictogram zegt al wat de knop doet. */}
          <a href={`tel:${contact.phone}`} aria-label={vul(t.algemeen.belOns, { tel: nummer })}
            className="hv-btn hv-btn-rand inline-flex h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-[15px] font-bold">
            <LuPhone aria-hidden className="shrink-0 text-[18px]" /> {nummer}
          </a>
          <button type="button" onClick={() => dialog.current?.showModal()}
            className="hv-btn hv-btn-roze inline-flex h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-[15px] font-bold">
            <LuPhoneCall aria-hidden className="shrink-0 text-[18px]" /> {b.belMijTerug}
          </button>
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        className={`belbalk-paneel ${letter.className} m-0 mb-0 mt-auto w-full max-w-none rounded-t-[28px] bg-white p-0 backdrop:bg-[rgba(25,23,38,0.55)]`}
        style={{ color: K.tekst2 }}
      >
        <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6">
          <button type="button" onClick={sluit} aria-label={b.sluiten} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full" style={{ background: K.zacht, color: K.indigo }}>
            <LuX aria-hidden className="text-[18px]" />
          </button>
          <p className="m-0 mb-2.5 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: K.magenta }}>
            <span className="h-2 w-2 rounded-full" style={{ background: K.magenta }} />{b.eyebrow}
          </p>
          <h2 id={titleId} className="m-0 pr-12 text-[24px] font-bold leading-[1.15] tracking-[-0.5px]" style={{ color: K.indigo }}>{b.kop}</h2>
          {state?.ok ? (
            <div className="mt-5">
              <Bedankt>{vul(b.bedankt, { tel: nummer })}</Bedankt>
            </div>
          ) : (
            <form action={action} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="taal" value={taal} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Veld label={f.naam}>
                  <input className={VELD} name="name" autoComplete="name" required maxLength={200} />
                </Veld>
                <Veld label={f.telefoon}>
                  <input className={VELD} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} />
                </Veld>
              </div>
              <Veld label={f.organisatie} optioneel={f.optioneel}>
                <input className={VELD} name="company" autoComplete="organization" maxLength={200} />
              </Veld>
              <Veld label={b.wanneer}>
                {/* De waarde blijft de Nederlandse tekst (die leest het team in het Postvak IN); het label staat in de taal van de pagina. */}
                <span className="relative block">
                  <select className={`${VELD} appearance-none pr-11`} name="moment" defaultValue={TERUGBEL_MOMENTEN[0]}>
                    {TERUGBEL_MOMENTEN.map((m, i) => <option key={m} value={m}>{b.momenten[i] ?? m}</option>)}
                  </select>
                  <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={K.indigo} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </Veld>
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <TurnstileField resetKey={state?.error} />
              {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: K.magenta }}>{state.error}</p>}
              <button className="hv-btn hv-btn-roze inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-bold disabled:opacity-60" disabled={pending}>
                {pending ? f.bezig : <>{b.belMijTerug} <Pijl /></>}
              </button>
              <p className="m-0 text-[13.5px] leading-[1.55]" style={{ color: K.klein }}>
                {b.tijden}{" "}
                <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2" style={{ color: K.indigo }}>{f.privacy}</a>
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
