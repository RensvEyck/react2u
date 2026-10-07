"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { veiligTerugPad } from "@/lib/terug";
import { signOutAction } from "@/app/admin/actions";
import TweeStapsInstellen from "@/components/admin/TweeStapsInstellen";
import { LuCircleCheck, LuCornerDownRight, LuKeyRound, LuLock, LuShieldCheck, LuShieldPlus } from "react-icons/lu";

/**
 * Inloggen in drie mogelijke stappen.
 *
 * 1. wachtwoord — altijd
 * 2. code — als er al een geverifieerde authenticator aan het account hangt
 * 3. instellen — als die er nog niet is
 *
 * Stap 3 staat bewust hier en niet alleen op Account: iemand die voor het eerst
 * inlogt komt nooit uit zichzelf bij zijn accountinstellingen, en dan blijft
 * tweestapsverificatie een knop waar niemand op drukt.
 */
type Stap = "wachtwoord" | "code" | "instellen";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [stap, setStap] = useState<Stap>("wachtwoord");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "geen-toegang" ? "Dit account heeft geen toegang tot het beheer." : null
  );
  const [busy, setBusy] = useState(false);
  const [vergeten, setVergeten] = useState(false);

  // Waar je heen gaat na het inloggen: terug naar waar je was als je sessie
  // verliep, anders het dashboard. Alleen paden binnen /admin (zie lib/terug.ts).
  const terug = veiligTerugPad(params.get("terug"));
  const uitgelogd = params.get("uitgelogd");

  // Doorgestuurd vanaf requireAdmin(): het wachtwoord is al gegeven, alleen de
  // code ontbreekt nog, of er is nog geen authenticator (verplicht sinds 7 okt
  // 2026). Opnieuw om het wachtwoord vragen zou verwarrend zijn. Welke van de
  // twee volgt uit het account zelf, niet uit de URL.
  useEffect(() => {
    const gevraagd = params.get("stap");
    if (gevraagd !== "code" && gevraagd !== "instellen") return;
    (async () => {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.auth.mfa.listFactors();
      const geverifieerd = (data?.totp ?? []).find((f) => f.status === "verified");
      if (geverifieerd) {
        setFactorId(geverifieerd.id);
        setStap("code");
      } else {
        setStap("instellen");
      }
    })();
  }, [params]);

  function naarPaneel() {
    router.replace(terug ?? "/admin");
    router.refresh();
  }

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

    // Heeft dit account al een authenticator? Dan eerst de code, anders instellen.
    const { data: factors } = await sb.auth.mfa.listFactors();
    const geverifieerd = (factors?.totp ?? []).find((f) => f.status === "verified");
    setBusy(false);
    if (geverifieerd) {
      setFactorId(geverifieerd.id);
      setStap("code");
    } else {
      setStap("instellen");
    }
  }

  async function bevestigCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setError("Die code klopt niet. Hij verandert elke 30 seconden — probeer de nieuwste.");
      return;
    }
    naarPaneel();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#232052] via-[#312e82] to-[#1c1a4e] px-4 py-10">
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#e75387]/20 blur-[120px]" aria-hidden />
      <div className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[#00aa98]/20 blur-[120px]" aria-hidden />

      <div className="relative w-full max-w-[420px] rounded-3xl bg-white p-8 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/07/cropped-cropped-Logo_react2u.png`}
          alt="React2u"
          className="mx-auto mb-5 h-16 w-auto"
        />

        {stap === "wachtwoord" && (
          <form onSubmit={onSubmit}>
            <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">Systeembeheer</h1>
            <p className="mb-6 text-center text-[13.5px] text-black/45">Log in om de website te beheren</p>
            {uitgelogd && !error && (
              <p role="status" className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#e6f7f4] px-4 py-3 text-[13.5px] font-medium text-[#0b6b5d]">
                <LuCircleCheck className="mt-0.5 shrink-0 text-[15px]" />
                {uitgelogd === "overal" ? "Je bent op al je apparaten uitgelogd." : "Je bent uitgelogd."}
              </p>
            )}
            {terug && !uitgelogd && !error && (
              <p className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#eef0ff] px-4 py-3 text-[13.5px] text-[#312e82]">
                <LuCornerDownRight className="mt-0.5 shrink-0 text-[15px]" />
                Na het inloggen ga je verder waar je was.
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="alabel" htmlFor="login-email">E-mailadres</label>
                <input id="login-email" className="ainput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label className="alabel" htmlFor="login-wachtwoord">Wachtwoord</label>
                  <button
                    type="button"
                    onClick={() => setVergeten((v) => !v)}
                    aria-expanded={vergeten}
                    aria-controls="wachtwoord-vergeten"
                    className="mb-1.5 text-[12.5px] font-medium text-[#312e82]/70 underline-offset-2 hover:text-[#e75387] hover:underline"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
                <input id="login-wachtwoord" className="ainput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {vergeten && (
                <div id="wachtwoord-vergeten" className="flex items-start gap-2.5 rounded-xl bg-[#eef0ff] px-4 py-3 text-[13px] leading-relaxed text-[#312e82]">
                  <LuKeyRound className="mt-0.5 shrink-0 text-[15px]" />
                  <p>
                    Vraag een collega die gebruikers beheert om een <strong>wachtwoordlink</strong>: dat staat in het
                    beheer onder Gebruikers, naast je naam. Met die link kies je zelf een nieuw wachtwoord.
                  </p>
                </div>
              )}
              {error && (
                <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{error}</p>
              )}
              <button className="abtn w-full justify-center !py-3" disabled={busy}>
                <LuLock className="text-[14px]" /> {busy ? "Inloggen…" : "Inloggen"}
              </button>
            </div>
            <p className="mt-5 flex items-start gap-2 border-t border-black/[0.06] pt-4 text-[12.5px] text-black/45">
              <LuShieldCheck className="mt-0.5 shrink-0 text-[14px] text-[#0e9f8a]" />
              <span>
                Dit beheer werkt met tweestapsverificatie. Na je wachtwoord vragen we een code
                uit je authenticator-app. Heb je die nog niet ingesteld, dan help je jezelf er
                direct na het inloggen doorheen.
              </span>
            </p>
          </form>
        )}

        {stap === "code" && (
          <form onSubmit={bevestigCode}>
            <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">Nog één stap</h1>
            <p className="mb-6 text-center text-[13.5px] text-black/45">
              Vul de zescijferige code uit je authenticator-app in
            </p>
            <div className="space-y-3">
              <input
                className="ainput text-center text-[22px] tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
                required
              />
              {error && (
                <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{error}</p>
              )}
              <button className="abtn w-full justify-center !py-3" disabled={busy || code.length !== 6}>
                <LuShieldCheck className="text-[14px]" /> {busy ? "Controleren…" : "Bevestigen"}
              </button>
            </div>
            <p className="mt-5 border-t border-black/[0.06] pt-4 text-center text-[12.5px] text-black/45">
              Telefoon kwijt of vervangen? Een collega die gebruikers beheert kan je tweestapsverificatie
              herstellen; daarna stel je een nieuwe telefoon in.
            </p>
          </form>
        )}


        {stap === "instellen" && (
          <>
            <h1 className="mb-1 flex items-center justify-center gap-2 text-center font-heading text-[22px] font-bold text-[#312e82]">
              <LuShieldPlus className="text-[20px]" /> Beveilig je account
            </h1>
            <p className="mb-5 text-center text-[13.5px] text-black/55">
              Dit beheer geeft toegang tot sollicitaties, cv&apos;s en persoonsgegevens. Daarom
              vragen we naast je wachtwoord een code uit een app op je telefoon. Dat is verplicht
              voor iedereen met toegang; het kost je één keer twee minuten.
            </p>
            <TweeStapsInstellen onKlaar={naarPaneel} />
          </>
        )}
        {stap !== "wachtwoord" && (
          <form action={signOutAction} className="mt-3 text-center">
            <button className="text-[13px] font-medium text-black/45 underline-offset-2 hover:text-[#e75387] hover:underline">
              {stap === "instellen" ? "Niet nu? Uitloggen" : "Ander account? Uitloggen"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginFormMetSuspense() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
