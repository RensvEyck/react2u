"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { eersteCode, instelFoutText, parseInviteUrl } from "@/lib/invite";
import { LuLock, LuCircleCheck, LuShieldCheck } from "react-icons/lu";

/**
 * laden → (code →) klaar, of ongeldig.
 *
 * `code`: het account heeft al een authenticator. Supabase weigert dan een
 * nieuw wachtwoord op een sessie met alleen de link (aal1) — de link bewijst
 * het mailadres, de code de telefoon. Zie `eersteCode` in lib/invite.ts.
 */
type Stand = "laden" | "code" | "klaar" | "ongeldig";
type Uitkomst = { email: string; factorId: string | null } | { ongeldig: true };

/**
 * Wisselt de link in voor een sessie. Eén keer per paginabezoek: een token
 * werkt maar één keer, en React draait effecten in dev bewust twee keer. De
 * tweede aanroep krijgt zo dezelfde uitkomst in plaats van "al gebruikt".
 */
let inwisselen: Promise<Uitkomst> | null = null;

async function wisselIn(): Promise<Uitkomst> {
  const sb = supabaseBrowser();
  const url = parseInviteUrl(window.location.search, window.location.hash);
  // De token hoort niet in de geschiedenis, een bladwijzer of een schermafbeelding.
  if (url.kind !== "none") window.history.replaceState(null, "", window.location.pathname);

  // Verlopen, al gebruikt of vervangen door een nieuwere link: Supabase geeft
  // voor alle drie dezelfde code, dus de pagina zegt ook één ding.
  if (url.kind === "error") return { ongeldig: true };
  let email: string | undefined;
  if (url.kind === "token_hash") {
    const { data, error } = await sb.auth.verifyOtp({ token_hash: url.tokenHash, type: url.type });
    if (error || !data.user) return { ongeldig: true };
    email = data.user.email;
  } else if (url.kind === "tokens") {
    // Een uitnodiging die Supabase zelf mailde. De PKCE-client leest die hash
    // niet uit zichzelf; setSession controleert het token bij Supabase.
    const { data, error } = await sb.auth.setSession({ access_token: url.accessToken, refresh_token: url.refreshToken });
    if (error || !data.user) return { ongeldig: true };
    email = data.user.email;
  } else {
    // Geen token in de URL: teruggekomen na herladen, met de sessie al gezet.
    const { data } = await sb.auth.getUser();
    if (!data.user) return { ongeldig: true };
    email = data.user.email;
  }

  // Hangt er een geverifieerde authenticator aan het account, dan eerst de
  // code. listFactors haalt de actuele lijst bij Supabase, dus een zojuist door
  // een collega herstelde tweestaps telt na een keer verversen meteen mee.
  const [{ data: aal }, { data: factors }] = await Promise.all([
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    sb.auth.mfa.listFactors(),
  ]);
  return { email: email || "", factorId: eersteCode(aal?.currentLevel, factors?.totp) };
}

/**
 * Landingspagina van een uitnodiging of wachtwoordlink.
 *
 * Staat bewust buiten `(panel)`: de sessie zit in de URL en wordt pas in de
 * browser uitgelezen, dus de server ziet nog geen ingelogde gebruiker. Zou
 * deze pagina onder de paneel-layout hangen, dan stuurde die de genodigde
 * terug naar het inlogscherm — precies waar hij niet in kan.
 */
export default function UitnodigingPage() {
  const router = useRouter();
  const [stand, setStand] = useState<Stand>("laden");
  const [email, setEmail] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  // Na de codestap is dit een collega die er al was: andere aanhef, geen uitleg over tweestaps.
  const [metCode, setMetCode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inwisselen ??= wisselIn();
    inwisselen.then((u) => {
      if (!("email" in u)) {
        setStand("ongeldig");
      } else if (u.factorId) {
        setEmail(u.email);
        setFactorId(u.factorId);
        setMetCode(true);
        setStand("code");
      } else {
        setEmail(u.email);
        setStand("klaar");
      }
    });
  }, []);

  async function bevestigCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // Tilt de sessie naar aal2; daarna accepteert Supabase het nieuwe wachtwoord.
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setError("Die code klopt niet. Hij verandert elke 30 seconden — probeer de nieuwste.");
      return;
    }
    setStand("klaar");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError("Kies een wachtwoord van minimaal 10 tekens.");
    if (password !== confirm) return setError("De wachtwoorden komen niet overeen.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setError(instelFoutText(error));
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

      <div className="relative w-full max-w-[400px] rounded-3xl bg-white p-8 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/07/cropped-cropped-Logo_react2u.png`}
          alt="React2u"
          className="mx-auto mb-5 h-16 w-auto"
        />

        {stand === "laden" && (
          <p className="py-6 text-center text-[14px] text-black/45">Link controleren…</p>
        )}

        {stand === "ongeldig" && (
          <>
            <h1 className="mb-2 text-center font-heading text-[22px] font-bold text-[#312e82]">
              Deze link werkt niet meer
            </h1>
            <p className="mb-3 text-center text-[13.5px] text-black/55">
              Een link werkt één keer, een beperkte tijd, en alleen de nieuwste.
              Vraag je collega om een nieuwe link — dat is één klik bij Gebruikers.
            </p>
            <p className="mb-6 text-center text-[13px] text-black/45">
              Heb je al een wachtwoord gekozen? Dan kun je gewoon inloggen.
            </p>
            <Link href="/admin/login" className="abtn w-full justify-center !py-3">Naar het inlogscherm</Link>
          </>
        )}

        {stand === "code" && (
          <form onSubmit={bevestigCode}>
            <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">
              Eerst je code
            </h1>
            <p className="mb-6 text-center text-[13.5px] text-black/45">
              Het account van <span className="font-medium text-black/70">{email}</span> is beveiligd met
              tweestapsverificatie. Vul de zescijferige code uit je authenticator-app in; daarna kies je
              een nieuw wachtwoord.
            </p>
            <div className="space-y-3">
              <input
                className="ainput text-center text-[22px] tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-label="Code uit je authenticator-app"
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
              herstellen. Ververs daarna deze pagina: dan kies je je wachtwoord zonder code.
            </p>
          </form>
        )}

        {stand === "klaar" && (
          <form onSubmit={onSubmit}>
            <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">
              {metCode ? "Nieuw wachtwoord" : "Welkom bij React2u"}
            </h1>
            <p className="mb-6 text-center text-[13.5px] text-black/45">
              Kies een {metCode ? "nieuw " : ""}wachtwoord voor <span className="font-medium text-black/70">{email}</span>.
              {!metCode && " Daarna vragen we een code uit een app op je telefoon; heb je die nog niet, dan stel je hem meteen in."}
            </p>
            <div className="space-y-3">
              <div>
                <label className="alabel" htmlFor="wachtwoord">Wachtwoord (min. 10 tekens)</label>
                <input
                  id="wachtwoord" className="ainput" type="password" value={password} required autoComplete="new-password" autoFocus
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="alabel" htmlFor="wachtwoord-herhaal">Herhaal wachtwoord</label>
                <input
                  id="wachtwoord-herhaal" className="ainput" type="password" value={confirm} required autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error && (
                <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{error}</p>
              )}
              <button className="abtn w-full justify-center !py-3" disabled={busy}>
                {busy ? <>Opslaan…</> : <><LuLock className="text-[14px]" /> Wachtwoord instellen</>}
              </button>
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[12.5px] text-black/40">
                <LuCircleCheck className="text-[13px] text-[#0e9f8a]" />
                {metCode ? "Daarna ga je meteen het beheer in" : "Daarna kun je meteen aan de slag"}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
