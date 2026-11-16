import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { machtigingGetekendPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { MachtigingenGetekend } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** Eén getekende machtiging als pdf voor de werkgever (0038): die stuurt hem met de opdracht naar de vorige arbodienst. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; mid: string }> }) {
  const { token, mid } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token) || !/^[0-9a-f-]{36}$/.test(mid)) notFound();
  const [{ data }, { contact }] = await Promise.all([supabasePublic().rpc("onboarding_machtigingen_getekend", { p_token: token, p_id: mid }), offerteHuisstijl()]);
  const g = data as MachtigingenGetekend | null;
  const m = g?.machtigingen[0];
  if (!g || !m) notFound();
  const pdf = await machtigingGetekendPdf(g, m, contact);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="Machtiging ${m.gegevens.naam.replace(/[^\w .-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
