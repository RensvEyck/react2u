import "server-only";
import { createSign } from "node:crypto";
import { CLIENT_IDS, redirectUri, veiligeFoto, type Aanbieder } from "./inloggen";

type Eindpunten = { autoriseer: string; token: string; userinfo?: string; scope: string };

const EINDPUNTEN: Record<Aanbieder, Eindpunten> = {
  linkedin: {
    autoriseer: "https://www.linkedin.com/oauth/v2/authorization",
    token: "https://www.linkedin.com/oauth/v2/accessToken",
    userinfo: "https://api.linkedin.com/v2/userinfo",
    scope: "openid profile email",
  },
  google: {
    autoriseer: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid profile email",
  },
  apple: {
    autoriseer: "https://appleid.apple.com/auth/authorize",
    token: "https://appleid.apple.com/auth/token",
    scope: "name email",
  },
};

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Apple wil als client secret een JWT, ondertekend met de .p8-sleutel (ES256). */
function appleSecret(): string | null {
  const team = process.env.APPLE_TEAM_ID;
  const kid = process.env.APPLE_KEY_ID;
  const key = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!team || !kid || !key || !CLIENT_IDS.apple) return null;
  const nu = Math.floor(Date.now() / 1000);
  const kop = b64url(JSON.stringify({ alg: "ES256", kid }));
  const inhoud = b64url(JSON.stringify({ iss: team, iat: nu, exp: nu + 300, aud: "https://appleid.apple.com", sub: CLIENT_IDS.apple }));
  const handtekening = createSign("SHA256").update(`${kop}.${inhoud}`).sign({ key, dsaEncoding: "ieee-p1363" });
  return `${kop}.${inhoud}.${b64url(handtekening)}`;
}

function secret(a: Aanbieder): string | null {
  if (a === "apple") return appleSecret();
  if (a === "linkedin") return process.env.LINKEDIN_CLIENT_SECRET || null;
  return process.env.GOOGLE_CLIENT_SECRET || null;
}

export function autorisatieUrl(a: Aanbieder, origin: string, state: string): URL {
  const e = EINDPUNTEN[a];
  const u = new URL(e.autoriseer);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", CLIENT_IDS[a]);
  u.searchParams.set("redirect_uri", redirectUri(origin, a));
  u.searchParams.set("state", state);
  u.searchParams.set("scope", e.scope);
  // Apple stuurt naam en e-mail alleen mee via een POST terug naar de site.
  if (a === "apple") u.searchParams.set("response_mode", "form_post");
  if (a === "google") u.searchParams.set("prompt", "select_account");
  return u;
}

/** Leest de payload van een JWT zonder handtekeningcontrole; alleen voor een token dat we zelf net bij de aanbieder ophaalden. */
function jwtInhoud(jwt: unknown): Record<string, unknown> {
  if (typeof jwt !== "string") return {};
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1] || "", "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

export type Opgehaald = { naam: string; email: string; foto: string };

/**
 * Wisselt de code in bij de aanbieder en geeft naam, e-mail en foto terug.
 * `appleGebruiker` is het veld `user` dat Apple alleen bij de eerste keer meestuurt.
 */
export async function haalProfiel(a: Aanbieder, origin: string, code: string, appleGebruiker?: string | null): Promise<Opgehaald | null> {
  const geheim = secret(a);
  if (!geheim || !CLIENT_IDS[a]) return null;
  const e = EINDPUNTEN[a];
  const token = await fetch(e.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_IDS[a],
      client_secret: geheim,
      redirect_uri: redirectUri(origin, a),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).then((r) => (r.ok ? r.json() : null));
  if (!token) return null;

  let info: Record<string, unknown> = jwtInhoud(token.id_token);
  if (e.userinfo && token.access_token) {
    const ui = await fetch(e.userinfo, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }).then((r) => (r.ok ? r.json() : null));
    if (ui) info = { ...info, ...ui };
  }

  let naam = String(info.name || [info.given_name, info.family_name].filter(Boolean).join(" ") || "");
  if (!naam && appleGebruiker) {
    try {
      const n = JSON.parse(appleGebruiker)?.name;
      naam = [n?.firstName, n?.lastName].filter(Boolean).join(" ");
    } catch {
      /* geen naam meegestuurd */
    }
  }
  const email = String(info.email || "");
  // Apple's doorstuuradres is bruikbaar, maar zegt niets; dan liever leeg laten.
  const bruikbaarEmail = /@privaterelay\.appleid\.com$/i.test(email) ? "" : email;
  return { naam: naam.slice(0, 200), email: bruikbaarEmail.slice(0, 200), foto: veiligeFoto(info.picture) };
}
