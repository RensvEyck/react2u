import { test, expect } from "@playwright/test";
import { sluitCookiemelding } from "./helpers";

test.describe("werkgevers-header", () => {
  test("heeft de link Kennismaken", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "op mobiel staat hij in het menu, zie de test hieronder");
    await page.goto("/werkgevers");
    await sluitCookiemelding(page);
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Kennismaken" })).toBeVisible();
    // De rij past binnen het scherm: niets loopt rechts buiten beeld.
    const overloop = await header.evaluate((h) => h.scrollWidth - h.clientWidth);
    expect(overloop).toBeLessThanOrEqual(0);
  });

  test("menu werkt op 390px breed", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/werkgevers");
    await sluitCookiemelding(page);
    const knop = page.getByRole("button", { name: "Menu openen" });
    await expect(knop).toBeVisible();
    await knop.click();
    await expect(page.getByRole("button", { name: "Menu sluiten" })).toBeVisible();
    const paneel = page.locator("header .menu-panel");
    await expect(paneel).toBeVisible();
    await expect(paneel.getByRole("link", { name: "Kennismaken" })).toBeVisible();
    // Een menulink navigeert en sluit het menu.
    await paneel.getByRole("link", { name: "Werkwijze" }).first().click();
    await expect(page).toHaveURL(/\/werkgevers#werkwijze$/);
    await expect(page.getByRole("button", { name: "Menu openen" })).toBeVisible();
    await expect(paneel).toHaveCount(0);
  });
});
