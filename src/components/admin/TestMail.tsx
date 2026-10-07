"use client";
import { useActionState } from "react";
import { sendTestMailAction, type TestMailState } from "@/app/admin/actions";
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuSend } from "react-icons/lu";

const IDLE: TestMailState = { status: "idle" };

/** Knop "Stuur testmail naar mij", met wat Resend ervan vond. */
export default function TestMail({ aan, email }: { aan: boolean; email: string }) {
  const [state, action, pending] = useActionState(sendTestMailAction, IDLE);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <button className="abtn-ghost !py-2 text-[13.5px] disabled:opacity-50" disabled={pending || !aan}>
          {pending ? <LuLoaderCircle className="animate-spin text-[14px]" /> : <LuSend className="text-[14px]" />}
          {pending ? "Versturen…" : "Stuur testmail naar mij"}
        </button>
        <span className="text-[12.5px] text-black/40">
          {aan ? `Gaat naar ${email}.` : "Kan pas als de sleutel en de afzender in Vercel staan."}
        </span>
      </form>
      {state.status === "ok" && (
        <p role="status" className="flex items-start gap-2.5 rounded-xl bg-[#e6f7f4] px-4 py-3 text-[13.5px] text-[#0b6b5d]">
          <LuCircleCheck className="mt-0.5 shrink-0 text-[15px]" />
          <span>
            Resend heeft de mail aangenomen. Staat hij binnen een minuut in de inbox van {state.naar}, dan werkt alles.
            Niet in de inbox? Kijk in de quarantaine van Sophos of de map ongewenste e-mail.
          </span>
        </p>
      )}
      {state.status === "fout" && (
        <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] text-[#b4234f]">
          <LuCircleAlert className="mt-0.5 shrink-0 text-[15px]" />
          <span>{state.melding}</span>
        </p>
      )}
    </div>
  );
}
