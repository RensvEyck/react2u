"use client";
import { useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase/client";
import { signOutAction, signOutEverywhereAction } from "@/app/admin/actions";
import TweeStapsInstellen from "@/components/admin/TweeStapsInstellen";
import { UitlogForm } from "@/components/admin/AccountMenu";
import { confirmLeave } from "@/lib/unsaved";
import { LuLoaderCircle, LuLock, LuLogOut, LuMonitorSmartphone, LuShieldCheck, LuShieldPlus } from "react-icons/lu";

type Factor = { id: string; friendly_name?: string; status: string };

export default function AccountAdmin() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [factor, setFactor] = useState<Factor | null>(null);
  const [laden, setLaden] = useState(true);
  const [instellen, setInstellen] = useState(false);
  const [mfaMsg, setMfaMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const laadFactor = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.mfa.listFactors();
    const geverifieerd = (data?.totp ?? []).find((f) => f.status === "verified") ?? null;
    setFactor(geverifieerd as Factor | null);
    setLaden(false);
  }, []);

  useEffect(() => {
    let leeft = true;
    supabaseBrowser().auth.mfa.listFactors().then(({ data }) => {
      if (!leeft) return;
      setFactor(((data?.totp ?? []).find((f) => f.status === "verified") ?? null) as Factor | null);
      setLaden(false);
    });
    return () => { leeft = false; };
  }, []);

  async function wijzigWachtwoord(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) return setMsg({ ok: false, text: "Kies een wachtwoord van minimaal 12 tekens." });
    if (password !== confirm) return setMsg({ ok: false, text: "De wachtwoorden komen niet overeen." });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg({ ok: false, text: "Wijzigen mislukt: " + error.message });
    else {
      setMsg({ ok: true, text: "Wachtwoord gewijzigd — gebruik voortaan je nieuwe wachtwoord." });
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div className="max-w-[520px] space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Account</h1>
        <p className="text-[14.5px] text-black/50">Beheer je inloggegevens en beveiliging.</p>
      </div>

      <div className="acard space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          <LuShieldCheck className="text-[15px]" /> Tweestapsverificatie
        </h2>

        {laden && <p className="text-[14px] text-black/45">Laden…</p>}

        {!laden && factor && !instellen && (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-[#e6f7f4] px-4 py-3 text-[13.5px] font-medium text-[#0e9f8a]">
              <LuShieldCheck className="text-[15px]" /> Ingeschakeld — bij het inloggen vragen we een code.
            </p>
            <p className="text-[13px] text-black/50">
              Verplicht voor iedereen met toegang tot dit beheer. Nieuwe telefoon? Stel hem hier in; de oude
              werkt daarna niet meer.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setInstellen(true)} className="abtn-ghost !py-2 text-[13.5px]">
                <LuShieldPlus className="text-[13px]" /> Nieuwe telefoon instellen
              </button>
            </div>
          </>
        )}

        {!laden && !factor && !instellen && (
          <>
            <p className="rounded-xl bg-[#fff4e5] px-4 py-3 text-[13.5px] text-[#c77700]">
              Staat uit. Je account geeft toegang tot sollicitaties, cv&apos;s en persoonsgegevens —
              een wachtwoord alleen is daarvoor een dunne beveiliging.
            </p>
            <button onClick={() => setInstellen(true)} className="abtn !py-2 text-[13.5px]">
              <LuShieldPlus className="text-[14px]" /> Nu instellen
            </button>
          </>
        )}

        {instellen && (
          <TweeStapsInstellen
            onKlaar={async () => {
              setInstellen(false);
              setMfaMsg({ ok: true, text: "Je nieuwe telefoon is ingesteld. De vorige werkt niet meer." });
              await laadFactor();
            }}
          />
        )}

        {mfaMsg && (
          <p className={`rounded-xl px-4 py-3 text-[13.5px] font-medium ${mfaMsg.ok ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#fdeef4] text-[#e0356b]"}`}>
            {mfaMsg.text}
          </p>
        )}
      </div>

      <form onSubmit={wijzigWachtwoord} className="acard space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          <LuLock className="text-[15px]" /> Wachtwoord wijzigen
        </h2>
        <div>
          <label className="alabel">Nieuw wachtwoord (min. 12 tekens)</label>
          <input className="ainput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <div>
          <label className="alabel">Herhaal nieuw wachtwoord</label>
          <input className="ainput" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </div>
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-[13.5px] font-medium ${msg.ok ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#fdeef4] text-[#e0356b]"}`}>
            {msg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button className="abtn" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button>
        </div>
      </form>

      <div className="acard space-y-4 p-6" id="uitloggen">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          <LuLogOut className="text-[15px]" /> Uitloggen
        </h2>
        <p className="text-[13.5px] text-black/55">
          Uitloggen sluit alleen dit apparaat af. Op je telefoon of een andere computer blijf je ingelogd.
        </p>
        <UitlogForm
          signOut={signOutAction}
          className="abtn-ghost !py-2 text-[13.5px] disabled:opacity-60"
        />
        <div className="rounded-xl bg-[#fafafd] p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#1c1a4e]">
            <LuMonitorSmartphone className="text-[15px] text-[#312e82]" /> Overal uitloggen
          </p>
          <p className="mt-1 text-[13px] text-black/50">
            Telefoon kwijt, of ingelogd gebleven op een computer die niet van jou is? Hiermee vervalt elke sessie
            van je account, op elk apparaat, ook deze. Daarna log je opnieuw in.
          </p>
          <form
            action={signOutEverywhereAction}
            className="mt-3"
            onSubmit={(e) => {
              if (!confirmLeave() || !window.confirm("Op alle apparaten uitloggen, ook hier?")) e.preventDefault();
            }}
          >
            <OveralKnop />
          </form>
        </div>
      </div>
    </div>
  );
}

function OveralKnop() {
  const { pending } = useFormStatus();
  return (
    <button className="abtn-ghost !py-2 text-[13.5px] !text-[#e0356b] disabled:opacity-60" disabled={pending}>
      {pending ? <LuLoaderCircle className="animate-spin text-[13px]" /> : <LuMonitorSmartphone className="text-[13px]" />}
      {pending ? "Bezig…" : "Overal uitloggen"}
    </button>
  );
}
