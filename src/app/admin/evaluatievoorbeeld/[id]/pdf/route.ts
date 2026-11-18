import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { evaluatiePdfAntwoord } from "@/lib/evaluatieBestanden";
import type { Evaluatie } from "@/lib/evaluatie";

export const dynamic = "force-dynamic";

/** Dezelfde pdf als de klant krijgt, vanuit het beheer (recht `bellijst`), ook van een concept. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("evaluaties").select("*").eq("id", id).maybeSingle();
  const e = data as Evaluatie | null;
  if (!e) notFound();
  return evaluatiePdfAntwoord(e, new URL(req.url).searchParams.has("download"));
}
