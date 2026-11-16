import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import { onboardingPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import { documentInfo, isDocument, type Onboarding, type OnboardingPubliek } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * Eén onboardingdocument als pdf (lib/onboardingPdf.tsx). Alleen met het
 * token en alleen voor een document dat bij deze onboarding hoort. Een
 * ingevuld formulier komt ingevuld mee. `?download=1` geeft hem als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; document: string }> }) {
  const { token, document } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token) || !isDocument(document)) notFound();
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  const o = data as OnboardingPubliek | null;
  if (!o || o.status === "ingetrokken" || !o.documenten.includes(document) || document === "werknemers") notFound();

  // Wat React2u zelf invult op het inrichtingsformulier ziet alleen een collega.
  let intern: { contractsoort: string | null; debiteurnummer: string | null } | undefined;
  if (document === "inrichting") {
    const sb = await supabaseServer();
    const { data: rij } = await sb.from("onboardings").select("contractsoort, debiteurnummer").eq("id", o.id).maybeSingle();
    intern = (rij as Pick<Onboarding, "contractsoort" | "debiteurnummer"> | null) ?? undefined;
  }

  const { contact } = await offerteHuisstijl();
  const pdf = await onboardingPdf({ document, bedrijf: o.bedrijf, nummer: o.nummer, contact, antwoord: o.antwoorden?.[document], intern });
  const download = new URL(req.url).searchParams.has("download");
  const naam = `React2u ${documentInfo(document).titel} ${o.bedrijf}`.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 100);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${naam}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
