import { expect, type Page } from "@playwright/test";

/** De zes hoofdpagina's waar de meeste tests over gaan. */
export const HOOFDPAGINAS = ["/", "/werkgevers", "/werknemers", "/verzuimabonnementen", "/kennismaken", "/contact"];

/**
 * Consolefouten en onafgevangen uitzonderingen verzamelen vanaf nu. Roep de
 * teruggegeven functie aan om ze te krijgen.
 */
export function vangFouten(page: Page) {
  const fouten: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Vercel Analytics laadt alleen op Vercel; tegen een andere server is dat
    // script een 404 en geen fout van de site.
    if (/_vercel\/insights/.test(m.text()) || /_vercel\/insights/.test(m.location().url)) return;
    fouten.push(`console: ${m.text()} (${m.location().url})`);
  });
  page.on("pageerror", (e) => fouten.push(`pageerror: ${e.message}`));
  return () => fouten;
}

/** De cookiemelding wegklikken als hij er staat, zodat hij niets overlapt. */
export async function sluitCookiemelding(page: Page) {
  const knop = page.getByRole("button", { name: "Prima" });
  if (await knop.isVisible().catch(() => false)) await knop.click();
}

/** Alles in beeld brengen (onthullen bij scrollen) en terug naar boven. */
export async function scrollDoor(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

/**
 * Een formulier insturen zonder de browservalidatie: zo test je de
 * controle op de server en de foutmelding die het formulier daarvan toont.
 */
export async function verstuurZonderBrowservalidatie(page: Page, form: ReturnType<Page["locator"]>) {
  await form.evaluate((f) => ((f as HTMLFormElement).noValidate = true));
  await form.locator('button:not([type="button"])').last().click();
}

/** De foutmelding van het formulier (role=alert); Next's eigen route-announcer heeft dezelfde rol en telt niet mee. */
export function foutmelding(page: Page) {
  return page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
}

export async function verwachtFoutmelding(page: Page) {
  const alert = foutmelding(page);
  await expect(alert).toBeVisible();
  await expect(alert).not.toBeEmpty();
}
