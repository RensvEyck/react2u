import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { machtigingGetekendPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { Machtiging, Onboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** Eén getekende machtiging als pdf, voor het beheer (0038). Alleen met het salesrecht. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data: o }, { data: m }, { contact }] = await Promise.all([
    sb.from("onboardings").select("nummer, bedrijf, contactpersoon, email, antwoorden").eq("id", id).maybeSingle(),
    sb.from("onboarding_machtigingen").select("*").eq("id", mid).eq("onboarding_id", id).maybeSingle(),
    offerteHuisstijl(),
  ]);
  const ob = o as Pick<Onboarding, "nummer" | "bedrijf" | "contactpersoon" | "email" | "antwoorden"> | null;
  const ma = m as Machtiging | null;
  if (!ob || !ma || ma.status !== "getekend" || !ma.gegevens || !ma.handtekening) return new NextResponse("Geen getekende machtiging.", { status: 404 });
  const pdf = await machtigingGetekendPdf(
    { nummer: ob.nummer, bedrijf: ob.bedrijf, contactpersoon: ob.contactpersoon, email: ob.email, arbodienst: (ob.antwoorden.machtiging?.data as Record<string, string>) || {}, machtigingen: [] },
    { id: ma.id, naam: ma.naam, email: ma.email, gegevens: ma.gegevens, handtekening: ma.handtekening, getekend_at: ma.getekend_at!, getekend_hash: ma.getekend_hash || "", getekend_ip: ma.getekend_ip, uitgenodigd_at: ma.uitgenodigd_at, overdracht_at: ma.overdracht_at },
    contact,
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="Machtiging ${ma.gegevens.naam.replace(/[^\w .-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
