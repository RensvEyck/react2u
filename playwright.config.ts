import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (tests/e2e). Twee manieren om te draaien:
 *
 *   npm run test:e2e              bouwt de site (next build) en start hem
 *                                 lokaal in testmodus, dan de tests;
 *   BASE_URL=https://… npm run test:e2e
 *                                 tegen een bestaande deploy (staging). Zet
 *                                 daar TEST_MODE_SECRET in de omgeving en geef
 *                                 hetzelfde geheim hier mee, anders maken de
 *                                 formuliertests echte inzendingen.
 *
 * Lokaal draait de server met VERCEL_ENV=preview (staging-opbouw: concepten,
 * HeaderR2u, geen onderhoudspoort) en TEST_MODE=1 (server actions schrijven
 * niets naar Supabase en versturen geen mail; zie src/lib/testmodus.ts).
 * E2E_SKIP_BUILD=1 slaat de build over als .next al actueel is.
 */
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "");
const LOCAL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL || LOCAL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "nl-NL",
    extraHTTPHeaders: {
      // Testmodus op een deploy (zie src/lib/testmodus.ts) …
      ...(process.env.TEST_MODE_SECRET ? { "x-test-mode": process.env.TEST_MODE_SECRET } : {}),
      // … en langs de Vercel-login van een preview-deploy.
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
        : {}),
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobiel", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD ? "npm run start" : "npm run build && npm run start",
        url: LOCAL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { VERCEL_ENV: "preview", TEST_MODE: "1" },
      },
});
