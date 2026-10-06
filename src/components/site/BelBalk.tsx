"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";
import { LuPhone, LuPhoneCall, LuX } from "react-icons/lu";
import type { ContactInfo } from "@/lib/content";
import { toontBelbalk } from "@/lib/belbalk";
import { TERUGBEL_MOMENTEN } from "@/lib/formulier";
import { DOCUMENTEN } from "@/lib/documenten";
import { submitTerugbel, type FormState } from "@/app/(site)/actions";
import { Bedankt, Field, fieldClass } from "./FormField";
import { Arrow } from "./Arrow";
import TurnstileField from "./TurnstileField";

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
 */
export default function BelBalk({ contact }: { contact: ContactInfo }) {
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

  const nummer = contact.phoneDisplay.replace(/\s*[-–]\s*/g, " ");
  const sluit = () => dialog.current?.close();

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden print:hidden">
        <div className="grid grid-cols-2 gap-2">
          {/* Alleen het nummer: "Bel 085 620 58 00" past niet op een halve
              telefoonbreedte; het pictogram zegt al wat de knop doet. */}
          <a href={`tel:${contact.phone}`} aria-label={`Bel ${nummer}`} className="btn btn-outline whitespace-nowrap !px-2.5 text-[14.5px]">
            <LuPhone aria-hidden className="shrink-0 text-[18px]" /> {nummer}
          </a>
          <button type="button" onClick={() => dialog.current?.showModal()} className="btn !px-3 text-[15px]">
            <LuPhoneCall aria-hidden className="text-[18px]" /> Bel mij terug
          </button>
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        className="belbalk-paneel m-0 mb-0 mt-auto w-full max-w-none rounded-t-[20px] bg-white p-0 text-body backdrop:bg-[rgba(25,23,38,0.55)]"
      >
        <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          <button type="button" onClick={sluit} aria-label="Sluiten" className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-soft text-primary hover:bg-line">
            <LuX aria-hidden className="text-[18px]" />
          </button>
          <p className="eyebrow mb-2">Terugbelverzoek</p>
          <h2 id={titleId} className="pr-12 text-[22px] font-bold leading-tight tracking-[-0.01em] text-primary">Wanneer mogen we je bellen?</h2>
          {state?.ok ? (
            <div className="mt-5">
              <Bedankt>Bedankt! We bellen je zoals afgesproken. Liever nu al iemand spreken? Bel {nummer}.</Bedankt>
            </div>
          ) : (
            <form action={action} className="mt-4 space-y-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Naam">
                  <input className={fieldClass} name="name" autoComplete="name" required maxLength={200} />
                </Field>
                <Field label="Telefoonnummer">
                  <input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} />
                </Field>
              </div>
              <Field label="Organisatie" optional>
                <input className={fieldClass} name="company" autoComplete="organization" maxLength={200} />
              </Field>
              <Field label="Wanneer">
                <select className={fieldClass} name="moment" defaultValue={TERUGBEL_MOMENTEN[0]}>
                  {TERUGBEL_MOMENTEN.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <TurnstileField resetKey={state?.error} />
              {state?.error && <p role="alert" className="text-[15px] font-medium text-accent">{state.error}</p>}
              <button className="btn w-full" disabled={pending}>
                {pending ? "Versturen…" : <>Bel mij terug <Arrow /></>}
              </button>
              <p className="text-[13px] leading-snug">
                We bellen op werkdagen tussen 9.00 en 17.00 uur.{" "}
                <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-accent">Privacy</a>
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
