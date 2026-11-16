import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { werknemersbestand } from "@/lib/onboardingBestanden";
import type { Onboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * Het werknemersbestand van een onboarding als .xlsx, in het formaat van het
 * lege importbestand van XpertSuite (37 kolommen, blad "Sheet 1"). Alleen met
 * het salesrecht, net als de rest van de onboarding.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("onboardings").select("nummer, bedrijf, debiteurnummer, antwoorden").eq("id", id).maybeSingle();
  const o = data as Pick<Onboarding, "nummer" | "bedrijf" | "debiteurnummer" | "antwoorden"> | null;
  return (o && werknemersbestand(o)) || new NextResponse("Geen werknemersbestand.", { status: 404 });
}
