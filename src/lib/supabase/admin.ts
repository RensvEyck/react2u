import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client met de service-role-sleutel. **Omzeilt alle RLS.**
 *
 * De rest van dit project werkt bewust zonder deze sleutel — zie CONTEXT.md.
 * Er zijn precies drie dingen die niet zonder kunnen, en meer horen er niet
 * bij te komen:
 *
 * - auth-beheer voor iemand anders (`auth.admin`): een account aanmaken bij het
 *   uitnodigen, en bij Gebruikers de authenticators van een collega tonen en
 *   wissen als die zijn telefoon kwijt is;
 * - een cv uit het publieke formulier in de bucket zetten (src/lib/cvs.ts),
 *   zodat de publieke sleutel daar geen schrijfrecht meer nodig heeft;
 * - de dagelijkse opschoning van verlopen sollicitaties (api/cron/opruimen),
 *   want daar is geen ingelogde beheerder.
 *
 * Regels die hier gelden:
 *
 * 1. **Niet voor het adminpaneel.** Daar lees en schrijf je met de ingelogde
 *    client uit `server.ts`, zodat de policies blijven gelden. Zou je hier ook
 *    content mee schrijven, dan is elke rolcontrole in dit project zinloos.
 * 2. **Nooit zonder eigen controle aanroepen.** Uitnodigen en tweestaps
 *    herstellen controleren eerst `requirePerm("gebruikers")` (herstellen ook
 *    dat je zelf met een code bent ingelogd); het cv-formulier honeypot, limiet, type en
 *    grootte; de cron-route het geheim in de Authorization-header.
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
      "SUPABASE_SERVICE_ROLE_KEY ontbreekt — uitnodigen en automatisch opschonen werken pas als die in Vercel staat."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Of de sleutel er is. Alleen of hij gezet is, nooit de waarde. */
export function serviceRoleAvailable(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Of uitnodigen überhaupt kan. Gebruikt om de knop uit te leggen in plaats van te laten falen. */
export const canInvite = serviceRoleAvailable;
