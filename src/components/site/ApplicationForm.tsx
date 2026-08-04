"use client";
import { useActionState } from "react";
import { submitApplication, type FormState } from "@/app/(site)/actions";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[16px] outline-none focus:border-accent";

export default function ApplicationForm({ vacancyId, vacancyTitle }: { vacancyId?: string; vacancyTitle: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null);
  if (state?.ok)
    return (
      <div className="rounded-2xl bg-secondary/10 border border-secondary/30 p-6 text-primary font-medium">
        Bedankt voor je sollicitatie! We nemen zo snel mogelijk contact met je op.
      </div>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="vacancy_id" value={vacancyId || ""} />
      <input type="hidden" name="vacancy_title" value={vacancyTitle} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} name="name" placeholder="Naam" required maxLength={200} />
        <input className={input} name="email" type="email" placeholder="E-mailadres" required maxLength={200} />
      </div>
      <input className={input} name="phone" placeholder="Telefoonnummer" maxLength={40} />
      <textarea className={input} name="motivation" placeholder="Korte motivatie" rows={4} maxLength={4000} />
      <div>
        <label className="mb-1 block text-[15px] font-medium text-primary">CV uploaden (PDF of Word, max 8 MB)</label>
        <input className={`${input} file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-white`} name="cv" type="file" accept=".pdf,.doc,.docx" />
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state?.error && <p className="text-accent-pink text-[15px]">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Versturen…" : "Solliciteer direct"}
      </button>
    </form>
  );
}
