import "server-only";

/**
 * Cloudflare Turnstile: een onzichtbare spamcontrole, zonder plaatjes
 * aanklikken. Volledig optioneel: zonder TURNSTILE_SECRET_KEY (server) en
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY (browser) staat hij uit en verandert er
 * niets aan de formulieren. Zet je hem aan, vermeld Cloudflare dan in de
 * cookie- en privacyverklaring: het widget laadt vanaf challenges.cloudflare.com.
 *
 * De limiet per IP (rateLimit.ts) werkt ook zonder Turnstile; dit is de extra
 * laag voor als die niet genoeg blijkt.
 */

const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/**
 * Controleert het token uit het formulier. Alleen als Turnstile aan staat;
 * anders altijd goed. Bij een storing bij Cloudflare laten we de inzending
 * door — de limiet per IP vangt dan op, en een echte bezoeker mag niet
 * vastlopen op een dienst waar hij niets van weet.
 */
export async function verifyTurnstile(token: string | null, ip: string | null): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY, { method: "POST", body, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return true;
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return true;
  }
}

export const TURNSTILE_MELDING = "De spamcontrole is niet gelukt. Vernieuw de pagina en probeer het opnieuw.";
