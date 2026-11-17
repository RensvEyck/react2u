import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { evaluatiePdfAntwoord } from "@/lib/evaluatieBestanden";
import type { EvaluatiePubliek } from "@/lib/evaluatie";

export const dynamic = "force-dynamic";

/** De evaluatie als pdf (lib/evaluatiePdf.tsx): leeg om te printen, of ingevuld. Alleen met het token. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("evaluatie_bekijken", { p_token: token, p_tel: false });
  const e = data as EvaluatiePubliek | null;
  if (!e || e.status === "ingetrokken") notFound();
  return evaluatiePdfAntwoord(e, new URL(req.url).searchParams.has("download"));
}
