import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { machtigingGetekendPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { MachtigingenGetekend } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** De getekende machtiging van de werknemer zelf, als pdf (0038). Alleen na het tekenen. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const [{ data }, { contact }] = await Promise.all([supabasePublic().rpc("onboarding_machtiging_getekend", { p_token: token }), offerteHuisstijl()]);
  const g = data as MachtigingenGetekend | null;
  const m = g?.machtigingen[0];
  if (!g || !m) notFound();
  const pdf = await machtigingGetekendPdf(g, m, contact);
  const naam = `Machtiging overdracht verzuimdossier ${m.gegevens.naam}.pdf`.replace(/[^\w .-]/g, "");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${naam}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
