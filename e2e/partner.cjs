// Partners (0022) in het beheer: toevoegen zonder dubbele rij bij herhaald klikken, een klant
// wijzigen en weghalen, de gegevens opslaan en de partner verwijderen. De verwijderknoppen
// stonden eerst binnen het opslaanformulier (formulier in formulier), waardoor een klik op
// "Partner verwijderen" alleen opsloeg. Draaien via e2e/run.mjs.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "partner");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
/** Tot `cond()` waar is, hooguit `ms` lang. */
async function totDat(cond, ms = 20000) {
  for (const eind = Date.now() + ms; Date.now() < eind; await wacht(250)) if (cond()) return true;
  return false;
}
const KANTOOR = "Testkantoor Dubbelklik";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));
  page.on("console", (m) => m.type() === "error" && paginafouten.push(`console: ${m.text()}`));
  // Standaard bevestigen; een test die wil annuleren zet `annuleer` even op true.
  let annuleer = false;
  page.on("dialog", (d) => (annuleer ? d.dismiss() : d.accept()).catch(() => {}));

  stap("Inloggen");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });

  stap("Partner toevoegen, drie keer klikken");
  await page.goto(`${BASIS}/admin/partners#nieuw`);
  await page.waitForSelector('#nieuw input[name="kantoor"]');
  await page.fill('#nieuw input[name="kantoor"]', KANTOOR);
  await page.fill('#nieuw input[name="naam"]', "Masha Test");
  // De serveractie anderhalve seconde ophouden, zodat de tweede en derde klik in de wachttijd vallen.
  await page.route("**/admin/partners", async (route) => {
    if (route.request().method() === "POST") await wacht(1500);
    await route.continue();
  });
  const knop = page.locator("#nieuw form button.abtn");
  await knop.click();
  await wacht(250);
  check(await knop.isDisabled(), "knop staat uit zolang het opslaan loopt");
  check((await knop.textContent())?.includes("Bezig"), "knop zegt Bezig…");
  await knop.click({ force: true }).catch(() => {});
  await knop.click({ force: true }).catch(() => {});
  await page.waitForURL(/\/admin\/partners\/[0-9a-f-]{36}/, { timeout: 30000 });
  await page.unroute("**/admin/partners");
  const id = page.url().split("?")[0].split("/").pop();
  await wacht(1000);
  check(sql(`select count(*) from public.partners where kantoor = '${KANTOOR}'`) === "1", "precies één partner aangemaakt");

  stap("Klant toevoegen, wijzigen en weghalen");
  await page.goto(`${BASIS}/admin/partners/${id}#klant-nieuw`);
  await page.waitForSelector('#klant-nieuw input[name="bedrijf"]');
  await page.fill('#klant-nieuw input[name="bedrijf"]', "Bakkerij De Test");
  await page.fill('#klant-nieuw input[name="medewerkers"]', "12");
  await page.click("#klant-nieuw form button.abtn");
  await page.waitForSelector("summary:has-text('Bakkerij De Test')", { timeout: 20000 });
  const klantId = sql(`select id from public.partner_klanten where partner_id = '${id}'`);
  check(/^[0-9a-f-]{36}$/.test(klantId), "klant staat in de database");

  await page.click("summary:has-text('Bakkerij De Test')");
  await page.fill(`#klant-${klantId} input[name="medewerkers"]`, "15");
  await page.click(`button[form="klant-${klantId}"]`);
  await page.waitForSelector("summary:has-text('15 medewerkers')", { timeout: 20000 });
  check(sql(`select medewerkers from public.partner_klanten where id = '${klantId}'`) === "15", "Opslaan bij de klant werkt (15 medewerkers)");

  stap("Partner met klant verwijderen kan niet");
  await page.click("button:has-text('Partner verwijderen')");
  await page.waitForURL(/fout=partner-klanten/, { timeout: 20000 });
  check(sql(`select count(*) from public.partners where id = '${id}'`) === "1", "partner met klant blijft staan");
  check(await page.locator("text=Deze partner heeft klanten en kan niet weg").count(), "melding: eerst de klanten weg of op inactief");

  await page.goto(`${BASIS}/admin/partners/${id}`);
  await page.click("summary:has-text('Bakkerij De Test')");
  await page.click("button:has-text('Weghalen')");
  await page.waitForFunction(() => !document.body.innerText.includes("Bakkerij De Test"), null, { timeout: 20000 });
  check(sql(`select count(*) from public.partner_klanten where partner_id = '${id}'`) === "0", "klant weggehaald");

  stap("Gegevens opslaan");
  await page.goto(`${BASIS}/admin/partners/${id}`);
  await page.fill('#partner-gegevens input[name="naam"]', "Masha Mooy");
  await page.click('button[form="partner-gegevens"]');
  // De toast haalt ?opgeslagen=1 meteen weer uit de adresbalk; daarom op de database wachten.
  const opgeslagen = await totDat(() => sql(`select naam from public.partners where id = '${id}'`) === "Masha Mooy");
  check(opgeslagen, "Opslaan bij de gegevens werkt");
  await shot(page, "01-partner");

  stap("Verwijderen annuleren");
  await page.goto(`${BASIS}/admin/partners/${id}`);
  await page.fill('#partner-gegevens input[name="naam"]', "Niet opslaan");
  annuleer = true;
  await page.click("button:has-text('Partner verwijderen')");
  await wacht(1500);
  annuleer = false;
  check(sql(`select count(*) from public.partners where id = '${id}'`) === "1", "annuleren laat de partner staan");
  check(sql(`select naam from public.partners where id = '${id}'`) === "Masha Mooy", "verwijderknop slaat het formulier niet op");

  stap("Partner verwijderen");
  await page.click("button:has-text('Partner verwijderen')");
  check(await totDat(() => sql(`select count(*) from public.partners where id = '${id}'`) === "0"), "partner verwijderd");
  await page.waitForURL((u) => u.pathname === "/admin/partners", { timeout: 20000 });
  await page.waitForSelector("h1:has-text('Partners')");
  check(!(await page.locator(`a:has-text('${KANTOOR}')`).count()), "niet meer in het overzicht");
  await shot(page, "02-overzicht-na-verwijderen", { fullPage: false });

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
