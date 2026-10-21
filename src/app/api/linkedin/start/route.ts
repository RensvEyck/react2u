import { NextResponse, type NextRequest } from "next/server";
import { LINKEDIN_CLIENT_ID, LI_STATE_COOKIE, redirectUri, veiligPad } from "@/lib/linkedin";

/** Stuurt de kandidaat naar LinkedIn om in te loggen (zie src/lib/linkedin.ts). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const terug = veiligPad(url.searchParams.get("terug"));
  if (!LINKEDIN_CLIENT_ID) return NextResponse.redirect(new URL(terug, url.origin));

  const state = crypto.randomUUID();
  const naar = new URL("https://www.linkedin.com/oauth/v2/authorization");
  naar.searchParams.set("response_type", "code");
  naar.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
  naar.searchParams.set("redirect_uri", redirectUri(url.origin));
  naar.searchParams.set("state", state);
  naar.searchParams.set("scope", "openid profile email");

  const res = NextResponse.redirect(naar);
  res.cookies.set(LI_STATE_COOKIE, JSON.stringify({ state, terug }), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
  });
  return res;
}
