import { headers } from "next/headers";

/**
 * Testmodus voor de formulieren: de server actions controleren de invoer en
 * geven de gewone bedankmelding, maar schrijven niets naar Supabase, uploaden
 * geen cv en versturen geen mail. Zo kunnen de e2e-tests (tests/e2e) de
 * formulieren doorlopen zonder echte leads aan te maken.
 *
 * Aan op twee manieren:
 *  - `TEST_MODE=1` in de omgeving van de server (lokaal: playwright.config.ts
 *    zet hem bij `next start`). Nooit in productie zetten.
 *  - de header `x-test-mode` met precies de waarde van `TEST_MODE_SECRET`
 *    (voor tests tegen staging: zet het geheim in Vercel bij de preview-
 *    omgeving en geef het aan Playwright mee). Zonder geheim doet de header
 *    niets, dus een bezoeker kan de modus niet zelf aanzetten.
 */
export async function testModus(): Promise<boolean> {
  if (process.env.TEST_MODE === "1") return true;
  const geheim = process.env.TEST_MODE_SECRET;
  if (!geheim) return false;
  try {
    return (await headers()).get("x-test-mode") === geheim;
  } catch {
    return false;
  }
}
