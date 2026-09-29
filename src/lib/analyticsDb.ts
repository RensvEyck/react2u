import type { supabaseServer } from "./supabase/server";
import type { PageView } from "./types";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

const PAGE = 1000;

/**
 * Alle paginaweergaven sinds een moment, in blokken van 1000.
 *
 * Supabase geeft per verzoek hooguit 1000 rijen terug (max_rows), ook als je
 * om meer vraagt — zonder foutmelding. Eén query met `.limit(20000)` telde dus
 * stil alleen de eerste 1000, en bij meer bezoek klopten de cijfers niet meer.
 *
 * De bovengrens ligt vast op het moment van opvragen: komt er tijdens het
 * bladeren een nieuw bezoek bij, dan schuift anders alles een plek op en telt
 * er een rij dubbel.
 */
export async function fetchPageViews(
  sb: Sb,
  since: string,
  columns = "*",
  { max = 60_000, onlyCompanies = false }: { max?: number; onlyCompanies?: boolean } = {}
): Promise<PageView[]> {
  const until = new Date().toISOString();
  const out: PageView[] = [];
  for (let from = 0; from < max; from += PAGE) {
    let q = sb
      .from("page_views")
      .select(columns)
      .gte("created_at", since)
      .lte("created_at", until);
    if (onlyCompanies) q = q.eq("is_company", true);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...(data as unknown as PageView[]));
    if (data.length < PAGE) break;
  }
  return out;
}
