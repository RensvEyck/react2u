import { test, expect } from "@playwright/test";

/**
 * Elke URL uit sitemap.xml bestaat (200) en heeft precies één h1. De sitemap
 * noemt de productie-URL's; de test vervangt het domein door baseURL.
 */
test.describe("sitemap", () => {
  test("elke URL uit sitemap.xml geeft 200 en heeft precies één h1", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name === "mobiel", "één keer is genoeg");
    test.setTimeout(10 * 60_000);
    const xml = await (await request.get("/sitemap.xml")).text();
    const paden = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1].trim()).pathname)
      .filter((p, i, all) => all.indexOf(p) === i);
    expect(paden.length).toBeGreaterThan(10);
    expect(paden).toContain("/werkgevers");

    const fouten: string[] = [];
    for (const pad of paden) {
      await test.step(pad, async () => {
        const res = await page.goto(pad, { waitUntil: "domcontentloaded" });
        const status = res?.status();
        const h1s = await page.locator("h1").count();
        if (status !== 200) fouten.push(`${pad}: status ${status}`);
        if (h1s !== 1) fouten.push(`${pad}: ${h1s} h1's`);
      });
    }
    expect(fouten, `${fouten.length} van ${paden.length} URL's`).toEqual([]);
  });
});
