/**
 * Solliciteren met LinkedIn ("Sign In with LinkedIn using OpenID Connect").
 *
 * De knop stuurt de kandidaat naar LinkedIn. Na toestemming komt die terug op
 * de vacature met naam en e-mailadres al ingevuld. LinkedIn geeft via deze
 * koppeling geen profiellink of werkervaring mee, alleen naam, e-mail en foto.
 *
 * Aanzetten: maak een app in het LinkedIn Developer Portal met het product
 * "Sign In with LinkedIn using OpenID Connect", voeg als redirect-URL
 * https://react2u.nl/api/linkedin/callback toe en zet in Vercel
 * NEXT_PUBLIC_LINKEDIN_CLIENT_ID en LINKEDIN_CLIENT_SECRET. Zonder client-id
 * blijft de knop verborgen.
 */
export const LINKEDIN_CLIENT_ID = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "";

/** Cookie met de toestand van de inlogronde (alleen server). */
export const LI_STATE_COOKIE = "r2u_li_state";
/** Kortlevende cookie met naam en e-mail, leesbaar voor het formulier. */
export const LI_PROFIEL_COOKIE = "r2u_li";

export type LinkedInProfiel = { naam: string; email: string };

/** Alleen een relatief pad op de eigen site is een geldige terugweg. */
export function veiligPad(pad: string | null): string {
  if (!pad || !pad.startsWith("/") || pad.startsWith("//") || pad.startsWith("/\\")) return "/vacatures";
  return pad.slice(0, 300);
}

export function redirectUri(origin: string) {
  return `${origin}/api/linkedin/callback`;
}

/** Leest de profielcookie in de browser; leeg als er geen is. */
export function leesLinkedInProfiel(cookie: string): LinkedInProfiel | null {
  const rij = cookie.split("; ").find((c) => c.startsWith(`${LI_PROFIEL_COOKIE}=`));
  if (!rij) return null;
  try {
    const p = JSON.parse(decodeURIComponent(rij.slice(LI_PROFIEL_COOKIE.length + 1)));
    if (typeof p?.naam === "string" && typeof p?.email === "string") return { naam: p.naam, email: p.email };
  } catch {
    /* kapotte cookie: negeren */
  }
  return null;
}
