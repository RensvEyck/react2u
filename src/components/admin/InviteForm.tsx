"use client";
import { useActionState, useState } from "react";
import { inviteUser, type InviteState } from "@/app/admin/actions";
import { LuUserPlus, LuCopy, LuCheck, LuMail, LuCircleAlert, LuCircleCheck, LuRefreshCw } from "react-icons/lu";

type Role = { id: string; label: string };

const IDLE: InviteState = { status: "idle" };

/** Het formulier bovenaan Gebruikers. */
export default function InviteForm({ roles, ready, mailAan }: { roles: Role[]; ready: boolean; mailAan: boolean }) {
  const [state, action, pending] = useActionState(inviteUser, IDLE);

  return (
    <div className="acard p-6">
      <h2 className="mb-4 font-heading text-[15px] font-bold text-[#312e82]">Collega uitnodigen</h2>
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <div>
          <label className="alabel" htmlFor="invite-email">E-mailadres</label>
          <input
            id="invite-email" className="ainput" name="email" type="email" required
            autoComplete="off" placeholder="collega@react2u.nl"
          />
        </div>
        <div>
          <label className="alabel" htmlFor="invite-role">Rol</label>
          <select id="invite-role" className="ainput" name="role_id" required defaultValue="">
            <option value="" disabled>Kies een rol…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <button className="abtn" disabled={!ready || pending}>
          <LuUserPlus /> {pending ? "Bezig…" : "Uitnodigen"}
        </button>
      </form>
      {state.status === "idle" ? (
        <p className="mt-3 text-[13px] text-black/45">
          {mailAan
            ? "Het systeem mailt je collega een link waarmee hij zelf een wachtwoord kiest, en daarna tweestapsverificatie instelt."
            : "Automatisch mailen staat nog niet aan (Instellingen → E-mail). Tot dan krijg je de link hier, om zelf door te sturen."}
        </p>
      ) : (
        <div className="mt-4"><InviteResult state={state} /></div>
      )}
    </div>
  );
}

/**
 * Een nieuwe link voor wie de vorige niet gebruikte, of een wachtwoordlink
 * voor wie zijn wachtwoord kwijt is. Dezelfde actie als het formulier: voor een
 * account dat nog niet bevestigd is maakt Supabase een nieuwe uitnodiging (de
 * oude vervalt), voor een bestaand account een herstellink.
 */
export function NewLinkButton({
  email, roleId, label = "Nieuwe link", title,
}: { email: string; roleId: string; label?: string; title?: string }) {
  const [state, action, pending] = useActionState(inviteUser, IDLE);
  return (
    <>
      <form action={action}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="role_id" value={roleId} />
        <button className="abtn-ghost !px-3 !py-1.5 text-[13px]" disabled={pending} title={title}>
          <LuRefreshCw className={`text-[13px] ${pending ? "animate-spin" : ""}`} /> {label}
        </button>
      </form>
      {state.status !== "idle" && <div className="order-last basis-full"><InviteResult state={state} /></div>}
    </>
  );
}

function InviteResult({ state }: { state: Exclude<InviteState, { status: "idle" }> }) {
  if (state.status === "error") {
    return (
      <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">
        <LuCircleAlert className="mt-0.5 shrink-0 text-[15px]" />
        <p>{state.message}</p>
      </div>
    );
  }

  const { email, roleLabel, existing, link, mail, mailMelding } = state;
  // Een bestaand account kan al een wachtwoord hebben; de link is dan een uitweg, geen verplichting.
  const bestaand = existing ? " Kent die collega zijn wachtwoord nog, dan kan hij gewoon inloggen." : "";

  // Het systeem heeft gemaild: dat is het bericht. De link blijft bereikbaar
  // voor als de mail niet aankomt, maar hoeft niet meer in beeld.
  if (mail === "verstuurd") {
    return (
      <div aria-live="polite" className="space-y-3">
        <Notice tone="ok">
          {existing ? "Link voor een nieuw wachtwoord gemaild naar " : "Uitnodiging gemaild naar "}
          <strong>{email}</strong>{existing ? "." : ` (${roleLabel}).`}{bestaand}
        </Notice>
        <details className="group">
          <summary className="cursor-pointer list-none text-[13px] font-medium text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:hidden hover:underline">Komt de mail niet aan? Stuur de link zelf door</span>
            <span className="hidden group-open:inline">Link zelf doorsturen</span>
          </summary>
          <div className="mt-2"><LinkTools email={email} roleLabel={roleLabel} link={link} existing={existing} /></div>
        </details>
      </div>
    );
  }

  return (
    <div aria-live="polite" className="space-y-3">
      <Notice tone={mail === "uit" ? "todo" : "fout"}>
        <strong>{email}</strong> {existing ? `heeft toegang als ${roleLabel}.` : `staat klaar als ${roleLabel}.`}
        {bestaand}{" "}
        {mail === "uit"
          ? "Automatisch mailen staat nog niet aan, dus deze keer stuur je de link zelf door. Zodra de mailkoppeling staat (Instellingen → E-mail), doet het systeem dit."
          : `Mailen lukte niet${mailMelding ? ` (${mailMelding})` : ""}. Stuur de link zelf door, of gebruik Open in mail.`}
      </Notice>
      <LinkTools email={email} roleLabel={roleLabel} link={link} existing={existing} />
    </div>
  );
}

function LinkTools({ email, roleLabel, link, existing }: { email: string; roleLabel: string; link: string; existing: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Geen klembord (oude browser, geen https): het veld is selecteerbaar.
    }
  }

  // Vanuit je eigen mailbox komt hij beter aan dan vanuit een systeemadres:
  // react2u.nl zit achter Sophos en DMARC p=reject.
  const body = existing
    ? `Hoi,\n\nVia deze link kies je een nieuw wachtwoord voor het beheer van react2u.nl:\n\n${link}\n\nDe link werkt één keer.`
    : `Hoi,\n\nJe hebt toegang gekregen tot het beheer van react2u.nl als ${roleLabel}. ` +
      `Kies via deze link je wachtwoord:\n\n${link}\n\nDe link werkt één keer.`;
  const onderwerp = existing ? "Nieuw wachtwoord voor het beheer van react2u.nl" : "Je toegang tot het beheer van react2u.nl";
  const mailto = `mailto:${email}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#fafafd] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly value={link} aria-label="Uitnodigingslink"
          onFocus={(e) => e.currentTarget.select()}
          className="ainput min-w-0 flex-1 basis-full !bg-white !py-2 font-mono !text-[12px] text-black/60 sm:basis-0"
        />
        <button type="button" onClick={copy} className="abtn flex-1 justify-center whitespace-nowrap !px-3 !py-2 text-[13.5px] sm:flex-none">
          {copied ? <><LuCheck /> Gekopieerd</> : <><LuCopy /> Kopieer</>}
        </button>
        <a href={mailto} className="abtn-ghost flex-1 justify-center whitespace-nowrap !px-3 !py-2 text-[13.5px] sm:flex-none">
          <LuMail /> Open in mail
        </a>
      </div>
      <p className="mt-2 text-[12.5px] text-black/45">
        Werkt één keer. Stuur hem alleen naar {email}: wie de link heeft, kiest het wachtwoord.
      </p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "todo" | "fout"; children: React.ReactNode }) {
  const kleur = { ok: "bg-[#e6f7f4] text-[#0b6b5d]", todo: "bg-[#eef0ff] text-[#312e82]", fout: "bg-[#fff4e5] text-[#8a5300]" }[tone];
  const Icoon = tone === "ok" ? LuCircleCheck : tone === "fout" ? LuCircleAlert : LuMail;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13.5px] ${kleur}`}>
      <Icoon className="mt-0.5 shrink-0 text-[15px]" />
      <p>{children}</p>
    </div>
  );
}
