import type { supabaseServer } from "./supabase/server";
import type { Permission } from "./permissions";
import { fetchPageViews } from "./analyticsDb";
import { lastDays } from "./analytics";
import { summarize, type CompanyProfile, type CompanySummary, type LeadRef } from "./companies";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * Alle herkende bedrijven over een periode, samengevat en warmste eerst.
 *
 * `select("*")` op page_views, bewust: zo werkt het vóór én na migratie 0010
 * (company_domain en company_source bestaan dan wel of niet). Zonder de tabel
 * company_profiles is er niets genegeerd of gekoppeld; zonder het recht
 * `bellijst` geen koppeling met leads — RLS zou die toch leeg teruggeven.
 */
export async function loadCompanies(
  sb: Sb,
  days: number,
  permissions: Permission[],
  now = new Date()
): Promise<{ companies: CompanySummary[]; profilesReady: boolean }> {
  const since = `${lastDays(days, now)[0]}T00:00:00Z`;
  const [views, profilesRes, leadsRes] = await Promise.all([
    fetchPageViews(sb, since, "*", { onlyCompanies: true }),
    sb.from("company_profiles").select("key, name, domain, ignored, lead_id"),
    permissions.includes("bellijst")
      ? sb.from("leads").select("id, name, company, email, status")
      : Promise.resolve({ data: [] as LeadRef[] }),
  ]);
  return {
    companies: summarize(views, (profilesRes.data as CompanyProfile[]) || [], (leadsRes.data as LeadRef[]) || [], now),
    profilesReady: !profilesRes.error,
  };
}
