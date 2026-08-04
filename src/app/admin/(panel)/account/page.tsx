"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

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
      setMsg({ ok: true, text: "Wachtwoord gewijzigd." });
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Account</h1>
      <form onSubmit={onSubmit} className="max-w-[420px] rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-[#312e82]">Wachtwoord wijzigen</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/60">Nieuw wachtwoord</span>
          <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/60">Herhaal nieuw wachtwoord</span>
          <input className={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        {msg && <p className={`text-sm ${msg.ok ? "text-[#00806f]" : "text-[#e51673]"}`}>{msg.text}</p>}
        <button className="btn !py-2.5 !px-6 text-[15px]" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button>
      </form>
    </div>
  );
}
