import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { overdrachtPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import { OVERDRACHT_BRIEF, type MachtigingenGetekend, type Onboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** De opdracht tot overdracht als pdf (0039): de brief namens de werkgever met alle getekende machtigingen erachter. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data: o } = await sb.from("onboardings").select("token, bedrijf").eq("id", id).maybeSingle();
  const ob = o as Pick<Onboarding, "token" | "bedrijf"> | null;
  if (!ob) return new NextResponse("Onbekende onboarding.", { status: 404 });
  const [{ data }, { contact }] = await Promise.all([sb.rpc("onboarding_machtigingen_getekend", { p_token: ob.token }), offerteHuisstijl()]);
  const g = data as MachtigingenGetekend | null;
  if (!g || !g.machtigingen.length) return new NextResponse("Nog geen getekende machtiging.", { status: 404 });
  const pdf = await overdrachtPdf(g, contact);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${OVERDRACHT_BRIEF.onderwerp(g.bedrijf).replace(/[^\w .-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
