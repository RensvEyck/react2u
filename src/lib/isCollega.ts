import "server-only";
import { cookies } from "next/headers";
import { supabaseServer } from "./supabase/server";

/**
 * Is de bezoeker van een klantpagina (/offerte/<token>, /brochure/<token>)
 * een collega met een sessie? Dan telt het bezoek niet mee en kan er niet
 * getekend worden: wie de link uit zijn eigen mail even controleert, moet niet
 * als "bekeken door de klant" in de tijdlijn komen. Alleen met een
 * sessiecookie een query, zoals de onderhoudspoort in de middleware.
 */
export async function isCollega(): Promise<boolean> {
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) return false;
  try {
    const sb = await supabaseServer();
    const { data } = await sb.from("admins").select("user_id").limit(1);
    return Boolean(data?.length);
  } catch {
    return false;
  }
}
