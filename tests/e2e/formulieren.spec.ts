import { test, expect } from "@playwright/test";
import { foutmelding, sluitCookiemelding, verstuurZonderBrowservalidatie, verwachtFoutmelding } from "./helpers";

/**
 * De drie formulieren: verplichte velden geven een foutmelding, een geldige
 * inzending toont de bedankmelding met wat er nu gebeurt. De server draait in
 * testmodus (src/lib/testmodus.ts): niets wordt opgeslagen of gemaild.
 */
const TEST = { naam: "Test Playwright", email: "playwright@example.com", tel: "0612345678" };

test.describe("offerteformulier (/kennismaken)", () => {
  test("verplichte velden geven een foutmelding", async ({ page }) => {
    await page.goto("/kennismaken");
    await sluitCookiemelding(page);
    const form = page.locator("form").filter({ has: page.locator('input[name="company"]') });
    await expect(form.locator('input[name="company"]')).toHaveAttribute("required", "");
    await expect(form.locator('input[name="email"]')).toHaveAttribute("required", "");
    await verstuurZonderBrowservalidatie(page, form);
    await verwachtFoutmelding(page);
    await expect(foutmelding(page)).toContainText(/bedrijfsnaam/i);
  });

  test("een geldige aanvraag toont de bedankmelding", async ({ page }) => {
    await page.goto("/kennismaken");
    await sluitCookiemelding(page);
    const form = page.locator("form").filter({ has: page.locator('input[name="company"]') });
    await form.locator('input[name="company"]').fill("Testbedrijf");
    await form.locator('input[name="name"]').fill(TEST.naam);
    await form.locator('input[name="email"]').fill(TEST.email);
    await form.locator('input[name="phone"]').fill(TEST.tel);
    await form.locator('select[name="employees"]').selectOption("50");
    await form.locator('button:not([type="button"])').last().click();
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("Bedankt voor je aanvraag");
    await expect(status).toContainText("binnen twee werkdagen");
  });
});

test.describe("contactformulier (/contact)", () => {
  test("verplichte velden geven een foutmelding", async ({ page }) => {
    await page.goto("/contact");
    await sluitCookiemelding(page);
    const form = page.locator("form").filter({ has: page.locator('textarea[name="message"]') });
    await expect(form.locator('textarea[name="message"]')).toHaveAttribute("required", "");
    await verstuurZonderBrowservalidatie(page, form);
    await verwachtFoutmelding(page);
  });

  test("een geldig bericht toont de bedankmelding", async ({ page }) => {
    await page.goto("/contact");
    await sluitCookiemelding(page);
    const form = page.locator("form").filter({ has: page.locator('textarea[name="message"]') });
    await form.locator('input[name="name"]').fill(TEST.naam);
    await form.locator('input[name="email"]').fill(TEST.email);
    await form.locator('input[name="phone"]').fill(TEST.tel);
    await form.locator('textarea[name="message"]').fill("Dit is een testbericht van de e2e-tests.");
    await form.locator('button:not([type="button"])').last().click();
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("Bedankt voor je bericht");
    await expect(status).toContainText("binnen één werkdag");
  });
});

test.describe("sollicitatieformulier (/vacatures)", () => {
  // Op staging staat het formulier op /vacatures (Werken bij), in productie op
  // /vacatures/open-sollicitatie. De test zoekt het formulier met een cv-veld.
  async function openFormulier(page: import("@playwright/test").Page) {
    await page.goto("/vacatures");
    await sluitCookiemelding(page);
    let form = page.locator("form").filter({ has: page.locator('input[name="cv"]') });
    if ((await form.count()) === 0) {
      await page.goto("/vacatures/open-sollicitatie");
      form = page.locator("form").filter({ has: page.locator('input[name="cv"]') });
    }
    await expect(form).toHaveCount(1);
    await form.scrollIntoViewIfNeeded();
    return form;
  }

  test("verplichte velden geven een foutmelding", async ({ page }) => {
    const form = await openFormulier(page);
    await expect(form.locator('input[name="name"]')).toHaveAttribute("required", "");
    await verstuurZonderBrowservalidatie(page, form);
    await verwachtFoutmelding(page);
    await expect(foutmelding(page)).toContainText(/naam/i);
  });

  test("een geldige sollicitatie toont de bedankmelding", async ({ page }) => {
    const form = await openFormulier(page);
    await form.locator('input[name="name"]').fill(TEST.naam);
    await form.locator('input[name="email"]').fill(TEST.email);
    await form.locator('button:not([type="button"])').last().click();
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toContainText(/Bedankt voor je (open )?sollicitatie/);
    await expect(status).toContainText(/binnen \S+ werkdag/);
  });
});
