/**
 * Uitnodigen zonder de mail en de redirect-instellingen van Supabase.
 *
 * Supabase kan zelf een uitnodiging mailen, maar daar hangen drie dingen aan
 * die buiten deze repo staan en stil falen: de standaard-mailserver bezorgt
 * alleen bij leden van het Supabase-team, de link valt terug op de Site URL als
 * `/admin/uitnodiging` niet in de Redirect URLs staat, en die link draagt de
 * sessie in de hash — die de PKCE-client van `@supabase/ssr` weigert.
 *
 * Daarom maakt de server de link zelf (`generateLink`), met alleen de gehashte
 * token erin. De landingspagina wisselt die in met `verifyOtp`. Mailen is een
 * extra: lukt het niet, dan krijgt wie uitnodigt de link om zelf door te sturen.
 */

export function siteUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://react2u.nl";
  return base.replace(/\/$/, "");
}

/**
 * `invite` voor een nieuw account, `recovery` voor een account dat al bestond:
 * wie nooit inlogde, kent zijn wachtwoord niet, en een "wachtwoord vergeten" is
 * er niet. Beide landen op dezelfde pagina om een wachtwoord te kiezen.
 */
export type LinkType = "invite" | "recovery";

export function inviteLink(base: string, hashedToken: string, type: LinkType = "invite"): string {
  const q = new URLSearchParams({ token_hash: hashedToken, type });
  return `${base.replace(/\/$/, "")}/admin/uitnodiging?${q}`;
}

/** Streng genoeg om typefouten te vangen, los genoeg voor elk echt adres. */
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s);
}

type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

/** Bestaat er al een (bevestigd) account op dit adres? */
export function isExistingAccount(err: AuthErrorLike): boolean {
  if (!err) return false;
  if (err.code === "email_exists" || err.code === "user_already_exists") return true;
  return /already.*(registered|exists)/i.test(err.message || "");
}

/**
 * Wat er misging, in woorden waar wie uitnodigt iets mee kan.
 *
 * De ruwe melding van Supabase gaat naar de logs; hier staat wat je eraan doet.
 */
export function inviteErrorText(err: AuthErrorLike): string {
  const code = err?.code;
  if (code === "email_address_invalid" || code === "validation_failed") {
    return "Supabase accepteert dit e-mailadres niet. Controleer het op typefouten.";
  }
  if (code === "not_admin" || code === "bad_jwt" || code === "no_authorization" || err?.status === 401 || err?.status === 403) {
    return "De sleutel SUPABASE_SERVICE_ROLE_KEY in Vercel klopt niet. Kopieer de service_role-sleutel (niet de anon-sleutel) van dit Supabase-project opnieuw.";
  }
  if (code === "over_request_rate_limit" || err?.status === 429) {
    return "Even te veel verzoeken achter elkaar. Probeer het over een minuut opnieuw.";
  }
  return "Uitnodigen mislukt door een fout bij Supabase. Probeer het opnieuw; blijft het misgaan, kijk dan in de Vercel-logs bij [uitnodigen].";
}

export type InviteUrl =
  | { kind: "token_hash"; tokenHash: string; type: LinkType }
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "error" }
  | { kind: "none" };

/**
 * Leest de landings-URL van een uitnodiging.
 *
 * `token_hash` is onze eigen link. De hash met `access_token` is de vorm van
 * een uitnodiging die Supabase zelf mailde (van vóór deze aanpak, of vanuit het
 * Supabase-dashboard) — die blijft werken. Een `error_code` in de hash is wat
 * Supabase meegeeft als zo'n link al gebruikt of verlopen is.
 */
export function parseInviteUrl(search: string, hash: string): InviteUrl {
  const q = new URLSearchParams(search.replace(/^\?/, ""));
  const h = new URLSearchParams(hash.replace(/^#/, ""));

  if (h.get("error_code") || h.get("error") || q.get("error_code") || q.get("error")) return { kind: "error" };

  const tokenHash = q.get("token_hash");
  // Alleen deze twee soorten; een ander type in een geknutselde URL wordt een uitnodiging, en faalt dan bij Supabase.
  if (tokenHash) return { kind: "token_hash", tokenHash, type: q.get("type") === "recovery" ? "recovery" : "invite" };

  const accessToken = h.get("access_token");
  const refreshToken = h.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken };

  return { kind: "none" };
}

/**
 * Welke authenticator eerst een code moet geven vóór het wachtwoord, of null.
 *
 * Supabase weigert een nieuw wachtwoord op een sessie zonder code (aal1) zodra
 * het account een geverifieerde authenticator heeft: "AAL2 session is required
 * to update email or password when MFA is enabled" (code `insufficient_aal`).
 * Terecht: de link bewijst alleen het mailadres, de code de telefoon. Zonder
 * authenticator — nieuw account, of net hersteld door een collega — is aal1 het
 * hoogste en mag het wachtwoord meteen. Staat de sessie al op aal2 (de pagina
 * ververst na de code), dan ook.
 */
export function eersteCode(
  currentLevel: string | null | undefined,
  totp: { id: string; status: string }[] | null | undefined
): string | null {
  if (currentLevel === "aal2") return null;
  return (totp ?? []).find((f) => f.status === "verified")?.id ?? null;
}

/** Waarom het wachtwoord niet is ingesteld, in woorden waar je iets mee kunt. */
export function instelFoutText(err: AuthErrorLike): string {
  const code = err?.code;
  const m = err?.message || "";
  if (code === "insufficient_aal" || /aal2/i.test(m)) {
    return "Je account vraagt eerst een code uit je authenticator-app. Ververs de pagina en vul die in.";
  }
  if (code === "same_password" || /different from the old/i.test(m)) {
    return "Dit is je huidige wachtwoord al. Kies een ander wachtwoord.";
  }
  if (code === "weak_password" || /weak|easy to guess|pwned/i.test(m)) {
    return "Dit wachtwoord is te makkelijk te raden. Kies een langer of ongebruikelijker wachtwoord.";
  }
  if (code === "session_expired" || code === "session_not_found" || err?.status === 401) {
    return "Je sessie is verlopen. Vraag je collega om een nieuwe link.";
  }
  return "Instellen mislukt: " + (m || "onbekende fout bij Supabase");
}
