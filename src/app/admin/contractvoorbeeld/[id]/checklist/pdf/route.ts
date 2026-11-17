import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { checklistPdfBijlage } from "@/lib/contractChecklistBestand";
import { heeftChecklist, type ChecklistStand } from "@/lib/contractChecklist";
import type { Contract } from "@/lib/contracten";
import { pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * Dezelfde checklist-pdf als de klant krijgt, vanuit het beheer (recht
 * `bellijst`): ingevuld als de klant dat deed, anders leeg om te printen of mee
 * te nemen naar het gesprek. Ook voor een concept.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data }, { data: stand }] = await Promise.all([
    sb.from("contracten").select("*").eq("id", id).maybeSingle(),
    sb.from("contract_checklists").select("*").eq("contract_id", id).maybeSingle(),
  ]);
  const c = data as Contract | null;
  if (!c || !heeftChecklist(c)) notFound();
  const pdf = await checklistPdfBijlage(c, (stand as ChecklistStand | null) ?? null);
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
