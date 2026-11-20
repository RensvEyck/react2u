// De certificaten uit Instellingen op de site (lib/keurmerken.ts): de lijst in het beheer bepaalt welke
// keurmerken er staan. Zonder certificaten geen keurmerken; twee toevoegen geeft twee tegels in de voet, op
// Over React2u, op een dienstpagina en op Certificeringen, met het logo van de site en de PDF als doorklik;
// één weghalen geeft één, alles weghalen niets. Dat laatste was de melding van 20 november 2026 ("ik haal
// de certificaten weg via de website en het blijft staan op de website"): de voet toonde vijf vaste logo's,
// wat er in Instellingen ook stond. De site draait hier als productiebuild, dus dit test ook dat opslaan
// de cache van de publieke pagina's ververst. Draaien via e2e/run.mjs.
//
// De Nederlandse pagina's komen in deze stack uit de (lege) testdatabase, de Engelse uit de concepten op
// schijf. Daarom de voet op / en /en, en de blokken op /en/about-us, /en/services/recover en /en/certifications.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "certificaten");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));

const VOET_NL = 'footer ul[aria-label="Certificeringen en keurmerken"] li';
const VOET_EN = 'footer ul[aria-label="Certifications and quality marks"] li';
// De logo's van de site in de inhoud; next/image zet het pad gecodeerd in src (…%2Fkeurmerken%2Fsbca.jpg).
const LOGOS = 'main img[src*="keurmerken"]';
const SBCA_PDF = "https://voorbeeld.test/certificaat-sbca.pdf";
const ISO_PDF = "https://voorbeeld.test/certificaat-iso-9001.pdf";

/**
 * Opent een pagina en telt wat er staat. Opslaan ververst de cache meteen; een paar pogingen
 * voor de zekerheid. Niet wachten op "networkidle": ingelogd blijft de pagina verbinding houden.
 */
async function tel(page, pad, selector, verwacht) {
  let n = -1;
  for (let poging = 0; poging < 6; poging++) {
    await page.goto(`${BASIS}${pad}`);
    await page.locator("footer").waitFor();
    n = await page.locator(selector).count();
    if (n === verwacht) break;
    await page.waitForTimeout(1000);
  }
  return n;
}

/** Scrolt naar de logo's en wacht tot ze geladen zijn (next/image laadt ze lui), voor een schermafbeelding die wat laat zien. */
async function logosGeladen(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (sel) => [...document.querySelectorAll(sel)].every((i) => i.complete && i.naturalWidth > 0),
    selector,
    { timeout: 15000 },
  );
  return true;
}

/** Het cookievenster staat voor de voet; één keer weigeren geldt voor de hele sessie. */
async function cookiesWeigeren(page) {
  const weiger = page.getByRole("button", { name: "Weigeren" });
  if (await weiger.count()) await weiger.click();
}

async function inloggen(page) {
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });
}

/** Het formulier Certificaten & keurmerken op /admin/instellingen. */
async function certificatenFormulier(page) {
  await page.goto(`${BASIS}/admin/instellingen`);
  const form = page.locator("form", { has: page.getByRole("heading", { name: "Certificaten & keurmerken" }) });
  await form.waitFor();
  return form;
}

async function opslaan(page, form) {
  await form.getByRole("button", { name: "Opslaan" }).click();
  await page.waitForURL((u) => u.searchParams.get("opgeslagen") === "1", { timeout: 30000 });
}

(async () => {
  stap("Schone start: geen certificaten in Instellingen");
  sql("delete from public.site_settings where key = 'certificates'");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));

  stap("Zonder certificaten staan er nergens keurmerken");
  check((await tel(page, "/", VOET_NL, 0)) === 0, "voet van het startscherm: geen keurmerken");
  await cookiesWeigeren(page);
  await page.locator("footer").screenshot({ path: path.join(SHOTS, "1-voet-leeg.png") });
  check((await tel(page, "/en/about-us", LOGOS, 0)) === 0, "Over React2u (en): geen keurmerken");
  check((await tel(page, "/en/services/recover", LOGOS, 0)) === 0, "dienstpagina Recover (en): geen keurmerken");
  check((await tel(page, "/en/certifications", LOGOS, 0)) === 0, "Certificeringen (en): geen logo's");

  stap("Twee certificaten toevoegen in het beheer");
  await inloggen(page);
  let form = await certificatenFormulier(page);
  await form.getByRole("button", { name: "Certificaat toevoegen" }).click();
  await form.getByRole("button", { name: "Certificaat toevoegen" }).click();
  await form.locator('input[name="alt.0"]').fill("MANAGEMENTSYSTEEM CERTIFICAAT");
  await form.locator('input[name="href.0"]').fill(SBCA_PDF);
  await form.locator('input[name="alt.1"]').fill("ISO 9001:2015");
  await form.locator('input[name="href.1"]').fill(ISO_PDF);
  await opslaan(page, form);
  check(sql("select jsonb_array_length(value) from public.site_settings where key = 'certificates'") === "2", "twee certificaten opgeslagen");

  stap("Twee keurmerken op de site, met het logo van de site en de PDF als doorklik");
  check((await tel(page, "/", VOET_NL, 2)) === 2, "voet van het startscherm: twee keurmerken");
  const eerste = page.locator(VOET_NL).first();
  check((await eerste.locator('img[src*="sbca"]').count()) === 1, "het eerste is het SBCA-logo van de site");
  check((await eerste.locator(`a[href="${SBCA_PDF}"]`).count()) === 1, "met de PDF uit Instellingen als doorklik");
  check((await page.locator(VOET_NL).nth(1).locator('img[alt="DNV ISO 9001 certificaat"]').count()) === 1, "het tweede is ISO 9001, met de alt-tekst van de site");
  check(await logosGeladen(page, `${VOET_NL} img`), "de logo's in de voet zijn geladen");
  await page.locator("footer").screenshot({ path: path.join(SHOTS, "2-voet-twee.png") });
  check((await tel(page, "/en", VOET_EN, 2)) === 2, "voet van /en: twee keurmerken");
  check((await page.locator(VOET_EN).nth(1).locator('img[alt="DNV ISO 9001 certificate"]').count()) === 1, "in het Engels met de Engelse alt-tekst");
  check((await tel(page, "/en/about-us", LOGOS, 2)) === 2, "Over React2u (en): twee keurmerken");
  check(await logosGeladen(page, LOGOS), "de logo's op Over React2u zijn geladen");
  await page.screenshot({ path: path.join(SHOTS, "3-over-react2u-twee.png") });
  check((await tel(page, "/en/services/recover", LOGOS, 2)) === 2, "dienstpagina Recover (en): twee keurmerken bij Waarom React2u");
  // De rij bovenaan (twee) plus het logo bij de twee regels die erbij horen.
  check((await tel(page, "/en/certifications", LOGOS, 4)) === 4, "Certificeringen (en): twee in de rij en twee bij de regels");

  stap("ISO 9001 weghalen");
  form = await certificatenFormulier(page);
  await form.getByRole("button", { name: "Verwijderen" }).nth(1).click();
  await opslaan(page, form);
  check((await tel(page, "/", VOET_NL, 1)) === 1, "voet van het startscherm: nog één keurmerk");
  check((await page.locator(VOET_NL).first().locator('img[src*="sbca"]').count()) === 1, "en dat is SBCA");
  check((await tel(page, "/en/certifications", LOGOS, 2)) === 2, "Certificeringen (en): één in de rij en één bij de regels");

  stap("Alles weghalen: de melding van 20 november 2026");
  form = await certificatenFormulier(page);
  await form.getByRole("button", { name: "Verwijderen" }).first().click();
  await opslaan(page, form);
  check(sql("select value::text from public.site_settings where key = 'certificates'") === "[]", "lege lijst opgeslagen");
  check((await tel(page, "/", VOET_NL, 0)) === 0, "voet van het startscherm: geen keurmerken meer");
  await page.locator("footer").screenshot({ path: path.join(SHOTS, "4-voet-weer-leeg.png") });
  check((await tel(page, "/en", VOET_EN, 0)) === 0, "voet van /en: geen keurmerken meer");
  check((await tel(page, "/en/about-us", LOGOS, 0)) === 0, "Over React2u (en): geen keurmerken meer");
  check((await tel(page, "/en/services/recover", LOGOS, 0)) === 0, "dienstpagina Recover (en): geen keurmerken meer");
  check((await tel(page, "/en/certifications", LOGOS, 0)) === 0, "Certificeringen (en): geen logo's meer");

  check(paginafouten.length === 0, `geen fouten in de browser${paginafouten.length ? `: ${paginafouten.join("; ")}` : ""}`);

  await browser.close();
  if (fout.length) {
    console.log(`\n${fout.length} controle(s) mislukt:\n- ${fout.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nCertificaten: alles in orde.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
