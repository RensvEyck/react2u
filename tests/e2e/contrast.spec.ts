import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HOOFDPAGINAS, scrollDoor, sluitCookiemelding } from "./helpers";

/**
 * WCAG 2.2 AA-contrast (axe-core, alleen de regel color-contrast) op de zes
 * hoofdpagina's, in beide projecten (desktop en mobiel). Op mobiel ook met
 * het menu open, want dat is daar een deel van de pagina.
 */
async function contrastKnelpunten(page: import("@playwright/test").Page) {
  const res = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  return res.violations.flatMap((v) =>
    v.nodes.map((n) => {
      const d = (n.any[0]?.data ?? {}) as Record<string, unknown>;
      return `${d.fgColor} op ${d.bgColor} = ${d.contrastRatio} (eis ${d.expectedContrastRatio}) ${n.target[0]}`;
    })
  );
}

for (const pad of HOOFDPAGINAS) {
  test(`contrast op ${pad}`, async ({ page, isMobile }) => {
    await page.goto(pad, { waitUntil: "networkidle" });
    await sluitCookiemelding(page);
    await scrollDoor(page);
    expect(await contrastKnelpunten(page)).toEqual([]);
    if (isMobile) {
      await page.getByRole("button", { name: "Menu openen" }).click();
      await expect(page.locator("header .menu-panel")).toBeVisible();
      expect(await contrastKnelpunten(page)).toEqual([]);
    }
  });
}
