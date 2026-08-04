"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LuLock } from "react-icons/lu";

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#232052] via-[#312e82] to-[#1c1a4e] px-4">
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#e75387]/20 blur-[120px]" aria-hidden />
      <div className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[#00aa98]/20 blur-[120px]" aria-hidden />
      <form onSubmit={onSubmit} className="relative w-full max-w-[400px] rounded-3xl bg-white p-8 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/07/cropped-cropped-Logo_react2u.png`}
          alt="React2u"
          className="mx-auto mb-5 h-16 w-auto"
        />
        <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">Systeembeheer</h1>
        <p className="mb-6 text-center text-[13.5px] text-black/45">Log in om de website te beheren</p>
        <div className="space-y-3">
          <div>
            <label className="alabel">E-mailadres</label>
            <input className="ainput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="alabel">Wachtwoord</label>
            <input className="ainput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && (
            <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{error}</p>
          )}
          <button className="abtn w-full justify-center !py-3" disabled={busy}>
            <LuLock className="text-[14px]" /> {busy ? "Inloggen…" : "Inloggen"}
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
