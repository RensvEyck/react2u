import { NextResponse, type NextRequest } from "next/server";
import { LINKEDIN_CLIENT_ID, LI_PROFIEL_COOKIE, LI_STATE_COOKIE, redirectUri, veiligPad } from "@/lib/linkedin";

/**
 * LinkedIn stuurt de kandidaat hierheen terug. We wisselen de code in voor
 * naam en e-mail, zetten die tien minuten in een cookie voor het formulier en
 * sturen de kandidaat terug naar het sollicitatieformulier.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let bewaard: { state?: string; terug?: string } = {};
  try {
    bewaard = JSON.parse(req.cookies.get(LI_STATE_COOKIE)?.value || "{}");
  } catch {
    bewaard = {};
  }
  const terug = new URL(`${veiligPad(bewaard.terug ?? null)}#solliciteren`, url.origin);
  const klaar = (res: NextResponse) => {
    res.cookies.delete(LI_STATE_COOKIE);
    return res;
  };

  const code = url.searchParams.get("code");
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  // Geannuleerd, verlopen of geknoeid: gewoon terug naar het formulier.
  if (!code || !secret || !LINKEDIN_CLIENT_ID || !bewaard.state || url.searchParams.get("state") !== bewaard.state) {
    return klaar(NextResponse.redirect(terug));
  }

  try {
    const token = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: secret,
        redirect_uri: redirectUri(url.origin),
      }),
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null));
    if (!token?.access_token) return klaar(NextResponse.redirect(terug));

    const info = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null));

    const naam = String(info?.name || [info?.given_name, info?.family_name].filter(Boolean).join(" ")).slice(0, 200);
    const email = String(info?.email || "").slice(0, 200);
    const res = klaar(NextResponse.redirect(terug));
    if (naam || email) {
      res.cookies.set(LI_PROFIEL_COOKIE, encodeURIComponent(JSON.stringify({ naam, email })), {
        httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 600,
      });
    }
    return res;
  } catch {
    return klaar(NextResponse.redirect(terug));
  }
}
