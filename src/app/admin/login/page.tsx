"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "geen-toegang" ? "Dit account heeft geen toegang tot het beheer." : null
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[16px] outline-none focus:border-[#e75387]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5fb] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://react2u.nl/wp-content/uploads/2023/07/cropped-cropped-Logo_react2u.png"
          alt="React2u"
          className="mx-auto mb-6 h-16 w-auto"
        />
        <h1 className="mb-6 text-center text-2xl font-bold text-[#312e82]">Systeembeheer</h1>
        <div className="space-y-3">
          <input className={input} type="email" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-[#e51673]">{error}</p>}
          <button className="btn w-full" disabled={busy}>
            {busy ? "Inloggen…" : "Inloggen"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
