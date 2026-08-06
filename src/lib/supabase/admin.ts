import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client met de service-role-sleutel. **Omzeilt alle RLS.**
 *
 * De rest van dit project werkt bewust zonder deze sleutel — zie CONTEXT.md.
 * Er is één ding dat niet zonder kan: een auth-account aanmaken voor iemand
 * anders. Uitnodigen per e-mail vereist `auth.admin`, en dat is service-role.
 *
 * Regels die hier gelden:
 *
 * 1. **Alleen voor auth-beheer.** Gewone tabellen lees en schrijf je met de
 *    ingelogde client uit `server.ts`, zodat de policies blijven gelden. Zou je
 *    hier ook content mee schrijven, dan is elke rolcontrole in dit project
 *    zinloos geworden.
 * 2. **Nooit zonder rechtencontrole aanroepen.** Elke aanroeper controleert
 *    eerst `requirePerm("gebruikers")`.
 * 3. **Nooit in de browser.** De import van `server-only` bovenaan laat de
 *    build falen zodra dit bestand in een client component belandt — dat is een
 *    hardere garantie dan een afspraak.
 *
 * De sleutel heet bewust niet `NEXT_PUBLIC_*`; die prefix zou hem in de
 * client-bundel zetten en daarmee publiceren.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ontbreekt — uitnodigen werkt pas als die in Vercel staat."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Of uitnodigen überhaupt kan. Gebruikt om de knop uit te leggen in plaats van te laten falen. */
export function canInvite(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
