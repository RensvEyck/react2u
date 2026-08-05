"use client";
import { useActionState } from "react";
import { submitContact, type FormState } from "@/app/(site)/actions";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[16px] outline-none focus:border-accent";

export default function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, null);
  if (state?.ok)
    return (
      <div className="rounded-2xl bg-secondary/10 border border-secondary/30 p-6 text-primary font-medium">
        Bedankt voor je bericht! We nemen zo snel mogelijk contact met je op.
      </div>
    );
  return (
    <form action={action} className="space-y-3">
      <input className={input} name="name" placeholder="Naam" required maxLength={200} />
      <input className={input} name="email" type="email" placeholder="E-mailadres" required maxLength={200} />
      <input className={input} name="phone" type="tel" placeholder="Telefoonnummer" required maxLength={40} />
      <input className={input} name="subject" placeholder="Onderwerp" maxLength={200} />
      <textarea className={input} name="message" placeholder="Bericht" rows={4} required maxLength={4000} />
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state?.error && <p className="text-accent-pink text-[15px]">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Versturen…" : "Contact opnemen"}
      </button>
    </form>
  );
}
