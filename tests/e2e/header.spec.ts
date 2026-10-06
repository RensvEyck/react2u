import { test, expect } from "@playwright/test";
import { sluitCookiemelding } from "./helpers";

const ZIEKMELDEN = "Medewerker ziek melden in het klantportaal";

test.describe("werkgevers-header", () => {
  test("heeft de links Kennismaken en Ziek melden", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "op mobiel staan ze in het menu, zie de test hieronder");
    await page.goto("/werkgevers");
    await sluitCookiemelding(page);
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Kennismaken" })).toBeVisible();
    const ziek = header.getByRole("link", { name: ZIEKMELDEN });
    await expect(ziek).toBeVisible();
    await expect(ziek).toHaveText(/Ziek melden/);
    await expect(ziek).toHaveAttribute("target", "_blank");
    await expect(ziek).toHaveAttribute("href", /^https:\/\//);
    await expect(ziek).toHaveAttribute("title", ZIEKMELDEN);
    // De rij past binnen het scherm: niets loopt rechts buiten beeld.
    const overloop = await header.evaluate((h) => h.scrollWidth - h.clientWidth);
    expect(overloop).toBeLessThanOrEqual(0);
  });

  test("toont Ziek melden niet in de werknemers-header", async ({ page }) => {
    await page.goto("/werknemers");
    await expect(page.locator("header").getByRole("link", { name: ZIEKMELDEN })).toHaveCount(0);
  });

  test("menu werkt op 390px breed, met Ziek melden als eerste", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/werkgevers");
    await sluitCookiemelding(page);
    const knop = page.getByRole("button", { name: "Menu openen" });
    await expect(knop).toBeVisible();
    await knop.click();
    await expect(page.getByRole("button", { name: "Menu sluiten" })).toBeVisible();
    const paneel = page.locator("header .menu-panel");
    await expect(paneel).toBeVisible();
    // Ziek melden staat bovenaan, vóór het eerste menu-item.
    const links = paneel.getByRole("link");
    await expect(links.first()).toHaveAttribute("aria-label", ZIEKMELDEN);
    await expect(paneel.getByRole("link", { name: "Kennismaken" })).toBeVisible();
    // Een menulink navigeert en sluit het menu.
    await paneel.getByRole("link", { name: "Werkwijze" }).first().click();
    await expect(page).toHaveURL(/\/werkgevers#werkwijze$/);
    await expect(page.getByRole("button", { name: "Menu openen" })).toBeVisible();
    await expect(paneel).toHaveCount(0);
  });
});
