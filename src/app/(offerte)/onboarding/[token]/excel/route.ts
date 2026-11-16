import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { XPERT_KOLOMMEN, type OnboardingPubliek } from "@/lib/onboarding";
import { xlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/**
 * Het lege werknemersbestand (import XpertSuite) voor een klant die het niet
 * online invult: de 37 kolommen, om in Excel in te vullen en terug te mailen.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  const o = data as OnboardingPubliek | null;
  if (!o || o.status === "ingetrokken" || !o.documenten.includes("werknemers")) notFound();
  const naam = `Werknemersbestand React2u ${o.bedrijf}`.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 90);
  return new NextResponse(new Uint8Array(xlsx([[...XPERT_KOLOMMEN]])), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${naam}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
