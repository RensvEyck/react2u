"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import TweeStapsInstellen from "@/components/admin/TweeStapsInstellen";
import { LuLock, LuShieldCheck, LuShieldOff, LuShieldPlus } from "react-icons/lu";

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

  async function schakelUit() {
    if (!factor) return;
    if (!window.confirm(
      "Tweestapsverificatie uitschakelen? Je account is daarna alleen nog met een wachtwoord beveiligd, " +
      "terwijl je bij sollicitaties en cv's kunt."
    )) return;
    const { error } = await supabaseBrowser().auth.mfa.unenroll({ factorId: factor.id });
    if (error) setMfaMsg({ ok: false, text: "Uitschakelen mislukt: " + error.message });
    else {
      setMfaMsg({ ok: true, text: "Tweestapsverificatie is uitgeschakeld." });
      await laadFactor();
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
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setInstellen(true)} className="abtn-ghost !py-2 text-[13.5px]">
                <LuShieldPlus className="text-[13px]" /> Nieuwe telefoon instellen
              </button>
              <button onClick={schakelUit} className="abtn-ghost !py-2 text-[13.5px] !text-[#e0356b]">
                <LuShieldOff className="text-[13px]" /> Uitschakelen
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
              setMfaMsg({ ok: true, text: "Tweestapsverificatie is ingeschakeld." });
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
    </div>
  );
}
