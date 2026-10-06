import { defineConfig } from "vitest/config";

/**
 * Unittests staan naast de code (src/**\/*.test.ts). De Playwright-specs in
 * tests/e2e heten ook *.spec.ts; zonder deze afbakening laadt Vitest ze mee
 * en faalt hij op `test()` van Playwright.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
