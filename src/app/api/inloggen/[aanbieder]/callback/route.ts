import { NextResponse, type NextRequest } from "next/server";
import { PROFIEL_COOKIE, STATE_COOKIE, isAanbieder, veiligPad } from "@/lib/inloggen";
import { haalProfiel } from "@/lib/inloggenServer";

/**
 * De aanbieder stuurt de kandidaat hierheen terug (LinkedIn en Google met GET,
 * Apple met POST). We wisselen de code in, zetten naam, e-mail en foto tien
 * minuten in een cookie voor het formulier en sturen de kandidaat terug naar
 * het sollicitatieformulier. Bij elke fout gaat de kandidaat gewoon terug.
 */
async function afhandelen(req: NextRequest, aanbieder: string, velden: URLSearchParams | FormData) {
  const origin = new URL(req.url).origin;
  let bewaard: { state?: string; terug?: string; aanbieder?: string } = {};
  try {
    bewaard = JSON.parse(req.cookies.get(STATE_COOKIE)?.value || "{}");
  } catch {
    bewaard = {};
  }
  // 303: na een POST (Apple) moet de browser met GET verder.
  const terug = NextResponse.redirect(new URL(`${veiligPad(bewaard.terug)}#solliciteren`, origin), 303);
  terug.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "none", path: "/api/inloggen", maxAge: 0 });

  const code = velden.get("code");
  if (
    !isAanbieder(aanbieder) || bewaard.aanbieder !== aanbieder || !bewaard.state ||
    typeof code !== "string" || velden.get("state") !== bewaard.state
  ) return terug;

  try {
    const gebruiker = velden.get("user");
    const p = await haalProfiel(aanbieder, origin, code, typeof gebruiker === "string" ? gebruiker : null);
    if (p && (p.naam || p.email)) {
      terug.cookies.set(PROFIEL_COOKIE, encodeURIComponent(JSON.stringify({ ...p, via: aanbieder })), {
        httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 600,
      });
    }
  } catch {
    /* aanbieder onbereikbaar: zonder invulling terug */
  }
  return terug;
}

type Ctx = { params: Promise<{ aanbieder: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return afhandelen(req, (await params).aanbieder, new URL(req.url).searchParams);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return afhandelen(req, (await params).aanbieder, await req.formData());
}
