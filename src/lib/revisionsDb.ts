import type { supabaseServer } from "./supabase/server";
import { versions, type Revision, type RevisionTable, type Version } from "./revisions";
import { isMissingTable } from "./dbErrors";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * Versies van één rij, nieuwste eerst. Leeg als migratie 0008 nog niet
 * gedraaid is of RLS niets teruggeeft — de editors tonen dan gewoon geen
 * geschiedenis, in plaats van te crashen.
 */
export async function loadVersions(sb: Sb, table: RevisionTable, rowId: string, limit = 60): Promise<Version[]> {
  const { data, error } = await sb
    .from("revisions")
    .select("*")
    .eq("table_name", table)
    .eq("row_id", rowId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return versions(data as Revision[]);
}

/**
 * Staat het versiebeheer aan (migratie 0008 uitgevoerd)? Zo niet, dan is
 * verwijderen definitief — en mag de admin geen prullenbak of "ongedaan maken"
 * beloven.
 */
export async function hasVersions(sb: Sb): Promise<boolean> {
  const { error } = await sb.from("revisions").select("id").limit(1);
  return !isMissingTable(error);
}
