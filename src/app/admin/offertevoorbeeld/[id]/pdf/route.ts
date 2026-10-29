import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { getekendePdf, pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * Dezelfde pdf als de klant krijgt, vanuit het beheer (recht `bellijst`, via
 * het voorvoegsel /admin/offertevoorbeeld in permissions.ts). Het token komt
 * met je eigen sessie uit de database; de pdf zelf ontstaat net als bij de
 * klant uit de vastgelegde versie.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("offertes").select("token, status").eq("id", id).maybeSingle();
  const rij = data as { token: string; status: string } | null;
  if (!rij || rij.status !== "getekend") notFound();
  const pdf = await getekendePdf(rij.token);
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
