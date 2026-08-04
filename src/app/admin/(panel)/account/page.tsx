"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LuLock } from "react-icons/lu";

export default function AccountAdmin() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setMsg({ ok: false, text: "Kies een wachtwoord van minimaal 10 tekens." });
    if (password !== confirm) return setMsg({ ok: false, text: "De wachtwoorden komen niet overeen." });
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg({ ok: false, text: "Wijzigen mislukt: " + error.message });
    else {
      setMsg({ ok: true, text: "Wachtwoord gewijzigd — gebruik voortaan je nieuwe wachtwoord." });
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div className="max-w-[480px] space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Account</h1>
        <p className="text-[14.5px] text-black/50">Beheer je inloggegevens.</p>
      </div>
      <form onSubmit={onSubmit} className="acard space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          <LuLock className="text-[15px]" /> Wachtwoord wijzigen
        </h2>
        <div>
          <label className="alabel">Nieuw wachtwoord (min. 10 tekens)</label>
          <input className="ainput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="alabel">Herhaal nieuw wachtwoord</label>
          <input className="ainput" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
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
