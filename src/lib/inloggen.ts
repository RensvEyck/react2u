/**
 * Solliciteren met LinkedIn, Google of Apple (OpenID Connect).
 *
 * De kandidaat logt in bij de aanbieder en komt terug op de vacature met naam,
 * e-mailadres en (bij LinkedIn en Google) profielfoto al ingevuld. Geen van de
 * aanbieders geeft via deze route een cv, profiellink of werkervaring mee.
 *
 * Per aanbieder aanzetten in Vercel (zonder client-id blijft de knop weg):
 * - LinkedIn: NEXT_PUBLIC_LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 * - Google:   NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * - Apple:    NEXT_PUBLIC_APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID,
 *             APPLE_KEY_ID, APPLE_PRIVATE_KEY (inhoud van het .p8-bestand)
 * Redirect-URL bij elke aanbieder: https://react2u.nl/api/inloggen/<aanbieder>/callback
 */

export const AANBIEDERS = ["linkedin", "google", "apple"] as const;
export type Aanbieder = (typeof AANBIEDERS)[number];

// NEXT_PUBLIC_* moet letterlijk in de code staan, anders vult Next het niet in.
export const CLIENT_IDS: Record<Aanbieder, string> = {
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "",
  google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  apple: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
};

export const NAMEN: Record<Aanbieder, string> = { linkedin: "LinkedIn", google: "Google", apple: "Apple" };

export function isAanbieder(x: unknown): x is Aanbieder {
  return typeof x === "string" && (AANBIEDERS as readonly string[]).includes(x);
}

export function actieveAanbieders(): Aanbieder[] {
  return AANBIEDERS.filter((a) => CLIENT_IDS[a]);
}

/** Cookie met de toestand van de inlogronde (alleen server). */
export const STATE_COOKIE = "r2u_inlog_state";
/** Kortlevende cookie met naam, e-mail en foto, leesbaar voor het formulier. */
export const PROFIEL_COOKIE = "r2u_profiel";

export type Profiel = { naam: string; email: string; foto: string; via: Aanbieder };

/** Alleen een relatief pad op de eigen site is een geldige terugweg. */
export function veiligPad(pad: string | null | undefined): string {
  if (!pad || !pad.startsWith("/") || pad.startsWith("//") || pad.startsWith("/\\")) return "/vacatures";
  return pad.slice(0, 300);
}

export function redirectUri(origin: string, a: Aanbieder) {
  return `${origin}/api/inloggen/${a}/callback`;
}

/** Profielfoto's alleen van de aanbieders zelf, en altijd via https. */
export function veiligeFoto(url: unknown): string {
  if (typeof url !== "string" || !url) return "";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "";
    if (!/(^|\.)licdn\.com$|(^|\.)googleusercontent\.com$/i.test(u.hostname)) return "";
    return u.toString().slice(0, 1000);
  } catch {
    return "";
  }
}

/** Leest de profielcookie in de browser; null als er geen (geldige) is. */
export function leesProfiel(cookie: string): Profiel | null {
  const rij = cookie.split("; ").find((c) => c.startsWith(`${PROFIEL_COOKIE}=`));
  if (!rij) return null;
  try {
    const p = JSON.parse(decodeURIComponent(rij.slice(PROFIEL_COOKIE.length + 1)));
    if (typeof p?.naam !== "string" || typeof p?.email !== "string" || !isAanbieder(p?.via)) return null;
    return { naam: p.naam, email: p.email, foto: veiligeFoto(p.foto), via: p.via };
  } catch {
    return null;
  }
}
