import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_IDS, STATE_COOKIE, isAanbieder, veiligPad } from "@/lib/inloggen";
import { autorisatieUrl } from "@/lib/inloggenServer";

/** Stuurt de kandidaat naar LinkedIn, Google of Apple om in te loggen (zie src/lib/inloggen.ts). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ aanbieder: string }> }) {
  const { aanbieder } = await params;
  const url = new URL(req.url);
  const terug = veiligPad(url.searchParams.get("terug"));
  if (!isAanbieder(aanbieder) || !CLIENT_IDS[aanbieder]) return NextResponse.redirect(new URL(terug, url.origin));

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(autorisatieUrl(aanbieder, url.origin, state));
  // SameSite=None: Apple post terug vanaf zijn eigen domein, en dan moet deze cookie mee.
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, terug, aanbieder }), {
    httpOnly: true, secure: true, sameSite: "none", path: "/api/inloggen", maxAge: 600,
  });
  return res;
}
