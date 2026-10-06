import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bestaan de Engelse kolommen van `vacancies` (migratie 0015) al? De
 * vacature-editor schakelt de Engelse velden uit zolang dat niet zo is, met
 * de uitleg erbij, in plaats van bij het opslaan op een onbekende kolom te
 * breken. Eén lichte query (geen rijen); bij een andere fout gaan we uit van
 * "bestaat", zodat een haperende verbinding de velden niet verbergt.
 */
export async function engelseVeldenBestaan(sb: SupabaseClient): Promise<boolean> {
  const { error } = await sb.from("vacancies").select("title_en").limit(0);
  if (!error) return true;
  return !(error.code === "42703" || error.code === "PGRST204");
}
