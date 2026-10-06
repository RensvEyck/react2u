"use client";
import { useActionState } from "react";
import { submitContact, type FormState } from "@/app/(site)/actions";
import { Field, Bedankt, fieldClass } from "./FormField";
import { Arrow } from "./Arrow";
import TurnstileField from "./TurnstileField";
import { DOCUMENTEN } from "@/lib/documenten";

export default function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, null);
  if (state?.ok) return <Bedankt>Bedankt voor je bericht! We nemen zo snel mogelijk contact met je op.</Bedankt>;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam">
          <input className={fieldClass} name="name" autoComplete="name" required maxLength={200} />
        </Field>
        <Field label="Telefoonnummer">
          <input className={fieldClass} name="phone" type="tel" autoComplete="tel" required maxLength={40} />
        </Field>
      </div>
      <Field label="E-mailadres">
        <input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={200} />
      </Field>
      <Field label="Onderwerp" optional>
        <input className={fieldClass} name="subject" maxLength={200} />
      </Field>
      <Field label="Bericht">
        <textarea className={fieldClass} name="message" rows={4} required maxLength={4000} />
      </Field>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="text-[15px] font-medium text-accent">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <button className="btn" disabled={pending}>
          {pending ? "Versturen…" : <>Verstuur bericht <Arrow /></>}
        </button>
        <p className="text-[13.5px] text-body">
          Lees in onze <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-accent">privacyverklaring</a> wat we met je gegevens doen.
        </p>
      </div>
    </form>
  );
}
