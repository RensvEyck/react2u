import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { leegWerknemersbestand } from "@/lib/onboardingBestanden";

export const dynamic = "force-dynamic";

/** Het lege werknemersbestand zoals de klant het downloadt, vanuit het beheer. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("onboardings").select("bedrijf, documenten").eq("id", id).maybeSingle();
  const o = data as { bedrijf: string; documenten: string[] } | null;
  if (!o || !o.documenten.includes("werknemers")) notFound();
  return leegWerknemersbestand(o.bedrijf);
}
