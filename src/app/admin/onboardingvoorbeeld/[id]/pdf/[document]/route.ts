import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { onboardingPdfAntwoord } from "@/lib/onboardingBestanden";
import { isDocument, type Onboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** Dezelfde pdf als de klant krijgt, vanuit het beheer (recht `bellijst`), ook van een concept. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; document: string }> }) {
  const { id, document } = await params;
  if (!isDocument(document) || document === "werknemers") notFound();
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("onboardings").select("*").eq("id", id).maybeSingle();
  const o = data as Onboarding | null;
  if (!o || !o.documenten.includes(document)) notFound();
  return onboardingPdfAntwoord(o, document, new URL(req.url).searchParams.has("download"));
}
