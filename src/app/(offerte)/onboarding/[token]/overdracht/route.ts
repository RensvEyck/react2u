import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { overdrachtPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import { OVERDRACHT_BRIEF, type MachtigingenGetekend } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * De opdracht tot overdracht als pdf (0038): de brief aan de vorige arbodienst
 * met daarachter alle getekende machtigingen. Voor de werkgever die hem liever
 * zelf verstuurt, of nog eens wil nakijken.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const [{ data }, { contact }] = await Promise.all([supabasePublic().rpc("onboarding_machtigingen_getekend", { p_token: token }), offerteHuisstijl()]);
  const g = data as MachtigingenGetekend | null;
  if (!g || !g.machtigingen.length) notFound();
  const pdf = await overdrachtPdf(g, contact);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${OVERDRACHT_BRIEF.onderwerp(g.bedrijf).replace(/[^\w .-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
