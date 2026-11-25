import { NextResponse } from "next/server";
import { naarIcs, parseDatum } from "@/lib/poortwachter";

/**
 * Het agenda-bestand van de Poortwachter-planner: alle termijnen als hele
 * dagen, de evaluaties elke zes weken (lib/poortwachter.ts). Puur een functie
 * van de datum, dus een uur te cachen; zonder geldige datum een 400.
 */
export async function GET(req: Request) {
  const datum = parseDatum(new URL(req.url).searchParams.get("datum"));
  if (!datum) return new NextResponse("Geef een datum mee als ?datum=JJJJ-MM-DD.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
  const iso = datum.toISOString().slice(0, 10);
  return new NextResponse(naarIcs(datum, site), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="poortwachter-${iso}.ics"`,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
