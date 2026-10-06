"use client";
import { useActionState } from "react";
import { submitApplication, type FormState } from "@/app/(site)/actions";
import { Field, Bedankt, fieldClass } from "./FormField";
import { Arrow } from "./Arrow";
import TurnstileField from "./TurnstileField";
import { DOCUMENTEN } from "@/lib/documenten";

export default function ApplicationForm({ vacancyId, vacancyTitle }: { vacancyId?: string; vacancyTitle: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null);
  if (state?.ok) return <Bedankt>Bedankt voor je sollicitatie! We nemen zo snel mogelijk contact met je op.</Bedankt>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="vacancy_id" value={vacancyId || ""} />
      <input type="hidden" name="vacancy_title" value={vacancyTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam">
          <input className={fieldClass} name="name" autoComplete="name" required maxLength={200} />
        </Field>
        <Field label="E-mailadres">
          <input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={200} />
        </Field>
      </div>
      <Field label="Telefoonnummer" optional>
        <input className={fieldClass} name="phone" type="tel" autoComplete="tel" maxLength={40} />
      </Field>
      <Field label="Korte motivatie" optional>
        <textarea className={fieldClass} name="motivation" rows={4} maxLength={4000} />
      </Field>
      <Field label="Cv (pdf of Word, max. 8 MB)" optional>
        <input
          className={`${fieldClass} file:mr-4 file:rounded-full file:border-0 file:bg-soft file:px-4 file:py-2 file:font-semibold file:text-primary hover:file:bg-primary hover:file:text-white`}
          name="cv" type="file" accept=".pdf,.doc,.docx" />
      </Field>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="flex items-start gap-3 text-[14.5px] text-body">
        <input type="checkbox" name="retain_longer" className="mt-1 size-4 shrink-0 accent-primary" />
        <span>
          Bewaar mijn gegevens een jaar, ook voor toekomstige vacatures.{" "}
          <span className="text-body/70">Zonder vinkje verwijderen we ze uiterlijk vier weken na afloop van de procedure.</span>
        </span>
      </label>
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="text-[15px] font-medium text-accent">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <button className="btn" disabled={pending}>
          {pending ? "Versturen…" : <>Solliciteer direct <Arrow /></>}
        </button>
        <p className="text-[13.5px] text-body">
          Lees in onze <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-accent">privacyverklaring</a> wat we met je gegevens en je cv doen.
        </p>
      </div>
    </form>
  );
}
