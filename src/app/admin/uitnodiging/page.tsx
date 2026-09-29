"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { parseInviteUrl } from "@/lib/invite";
import { LuLock, LuCircleCheck } from "react-icons/lu";

type Stand = "laden" | "klaar" | "ongeldig";
type Uitkomst = { email: string } | { ongeldig: true };

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
  if (url.kind === "token_hash") {
    const { data, error } = await sb.auth.verifyOtp({ token_hash: url.tokenHash, type: url.type });
    if (error || !data.user) return { ongeldig: true };
    return { email: data.user.email || "" };
  }
  if (url.kind === "tokens") {
    // Een uitnodiging die Supabase zelf mailde. De PKCE-client leest die hash
    // niet uit zichzelf; setSession controleert het token bij Supabase.
    const { data, error } = await sb.auth.setSession({ access_token: url.accessToken, refresh_token: url.refreshToken });
    if (error || !data.user) return { ongeldig: true };
    return { email: data.user.email || "" };
  }
  // Geen token in de URL: teruggekomen na herladen, met de sessie al gezet.
  const { data } = await sb.auth.getUser();
  return data.user ? { email: data.user.email || "" } : { ongeldig: true };
}

/**
 * Landingspagina van een uitnodiging.
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
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inwisselen ??= wisselIn();
    inwisselen.then((u) => {
      if ("email" in u) {
        setEmail(u.email);
        setStand("klaar");
      } else {
        setStand("ongeldig");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError("Kies een wachtwoord van minimaal 10 tekens.");
    if (password !== confirm) return setError("De wachtwoorden komen niet overeen.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setError("Instellen mislukt: " + error.message);
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
          <p className="py-6 text-center text-[14px] text-black/45">Uitnodiging controleren…</p>
        )}

        {stand === "ongeldig" && (
          <>
            <h1 className="mb-2 text-center font-heading text-[22px] font-bold text-[#312e82]">
              Deze link werkt niet meer
            </h1>
            <p className="mb-3 text-center text-[13.5px] text-black/55">
              Een uitnodigingslink werkt één keer, een beperkte tijd, en alleen de nieuwste.
              Vraag je collega om een nieuwe link — dat is één klik bij Gebruikers.
            </p>
            <p className="mb-6 text-center text-[13px] text-black/45">
              Heb je al een wachtwoord gekozen? Dan kun je gewoon inloggen.
            </p>
            <Link href="/admin/login" className="abtn w-full justify-center !py-3">Naar het inlogscherm</Link>
          </>
        )}

        {stand === "klaar" && (
          <form onSubmit={onSubmit}>
            <h1 className="mb-1 text-center font-heading text-[22px] font-bold text-[#312e82]">
              Welkom bij React2u
            </h1>
            <p className="mb-6 text-center text-[13.5px] text-black/45">
              Kies een wachtwoord voor <span className="font-medium text-black/70">{email}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="alabel">Wachtwoord (min. 10 tekens)</label>
                <input
                  className="ainput" type="password" value={password} required autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="alabel">Herhaal wachtwoord</label>
                <input
                  className="ainput" type="password" value={confirm} required autoComplete="new-password"
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
                Daarna kun je meteen aan de slag
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
