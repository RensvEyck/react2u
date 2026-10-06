import { test, expect } from "@playwright/test";
import { HOOFDPAGINAS, scrollDoor, vangFouten } from "./helpers";

/** Geen consolefouten of onafgevangen uitzonderingen op de hoofdpagina's. */
for (const pad of HOOFDPAGINAS) {
  test(`geen consolefouten op ${pad}`, async ({ page }) => {
    const fouten = vangFouten(page);
    await page.goto(pad, { waitUntil: "networkidle" });
    await scrollDoor(page);
    expect(fouten()).toEqual([]);
  });
}
