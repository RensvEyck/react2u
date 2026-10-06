import { test, expect } from "@playwright/test";

/**
 * Taalknop NL/EN: heen en terug naar dezelfde pagina. De site is nu alleen
 * Nederlands; zodra de knop bestaat, verwijder je de skip en zet je in TAALKNOP
 * hoe hij te vinden is.
 */
const TAALKNOP = { naam: /^(EN|English)$/, terug: /^(NL|Nederlands)$/ };

test("taalknop gaat heen en terug naar dezelfde pagina", async ({ page }) => {
  await page.goto("/werkgevers");
  const naarEngels = page.locator("header").getByRole("link", { name: TAALKNOP.naam });
  test.skip((await naarEngels.count()) === 0, "Er is nog geen taalknop (NL/EN) in de header; de site is alleen Nederlands.");
  await naarEngels.first().click();
  await expect(page).toHaveURL(/\/en(\/|$)/);
  await page.locator("header").getByRole("link", { name: TAALKNOP.terug }).first().click();
  await expect(page).toHaveURL(/\/werkgevers$/);
});
