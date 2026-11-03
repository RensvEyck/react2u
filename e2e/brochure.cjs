// Brochures (0030) van begin tot eind: aanmaken in het beheer, als collega bekijken (telt niet),
// de acht hoofdstukken en de prijslijst, versturen, de prospect opent hem (melding aan sales), de pdf, de offerte die
// eruit volgt, intrekken en een onbekende link. Draaien via e2e/run.mjs, na offerte.cjs en vormen.cjs.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, brochureLink, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "brochure");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const LABELS = ["Recover", "Resist", "Restart", "Reflex", "Ready", "Reward"];

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));
  page.on("dialog", (d) => d.accept().catch(() => {}));

  stap("Inloggen");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });

  stap("Overzicht");
  await page.goto(`${BASIS}/admin/brochures`);
  await page.waitForSelector("h1:has-text('Brochures')");
  check(await page.locator("a:has-text('Nieuwe brochure')").count(), "knop Nieuwe brochure");
  await shot(page, "01-overzicht", { fullPage: false });

  stap("Nieuwe brochure");
  await page.goto(`${BASIS}/admin/brochures/nieuw`);
  await page.waitForSelector("#br-bedrijf");
  check((await page.inputValue("#br-bericht")).includes("{bedrijf}"), "persoonlijk woord met invulveld");
  check((await page.inputValue("#br-ae")) === "sales@react2u.nl", "afzender is de salesbox");
  await page.fill("#br-bedrijf", "Transportbedrijf Vermeulen");
  await page.fill("#br-cp", "Karin Vermeulen");
  await page.fill("#br-email", "karin@vermeulen.test");
  await page.fill("#br-tel", "040 123 45 67");
  await page.fill("#br-an", "Rens van Eyck");
  await page.fill("#br-af", "Eigenaar");
  await page.click("button:has-text('Brochure aanmaken')");
  await page.waitForURL(/\/admin\/brochures\/[0-9a-f-]{36}/, { timeout: 30000 });
  const adminUrl = page.url().split("?")[0];
  const id = adminUrl.split("/").pop();
  check(await page.locator("text=/B\\d{4}-\\d{4}/").count(), "nummer B<jaar>-<volgnummer>");
  check(await page.locator("span:has-text('Concept')").count(), "status concept");
  const link = await page.getAttribute("a:has-text('Voorbeeld')", "href");
  check(/\/brochure\/[a-f0-9]{48,}$/.test(link || ""), `link naar de brochure (${link})`);
  await shot(page, "02-beheer-concept");

  stap("Voorbeeld als collega (telt niet mee)");
  const collega = await ctx.newPage();
  collega.on("pageerror", (e) => paginafouten.push(String(e)));
  await collega.goto(link);
  await collega.waitForSelector("h1");
  check(await collega.locator("text=Je bekijkt deze brochure als collega").count(), "melding voor de collega");
  check(await collega.locator("h1:has-text('Grip op verzuim')").count(), "belofte van de brochure in de kop");
  check((await collega.locator("#inhoud ol > li").count()) === 8, "inhoud met acht hoofdstukken");
  for (const id of ["hoe-het-gaat", "voorwoord", "werkwijze", "kosten", "diensten", "jouw-rol", "tarieven", "overstappen"]) {
    check(await collega.locator(`section#${id}`).count(), `hoofdstuk ${id}`);
  }
  check(await collega.locator("#hoe-het-gaat >> text=Maandagochtend, 08:12").count(), "01: de maandagochtend");
  check(await collega.locator("#kosten >> text=€94.500").count(), "04: de rekensom");
  check(await collega.locator("#kosten >> text=Eén voorkomen sanctie betaalt 4,5 jaar dienstverlening.").count(), "04: Compleet uit de prijslijst");
  check(await collega.locator("#jouw-rol >> text=Of hij onder een vangnetregeling van de Ziektewet valt (niet welke)").count(), "06: vangnetregeling mag je vragen");
  check(await collega.locator("#overstappen >> text=instemmingsrecht").count(), "08: de OR");
  check(await collega.locator('#overstappen a[href="https://flexhero.com"]').count(), "08: de zusterlabels");
  check(await collega.locator("text=Beste Karin,").count(), "aanhef met de voornaam");
  check(await collega.locator("text=voor Transportbedrijf Vermeulen kan betekenen").count(), "{bedrijf} ingevuld in het persoonlijke woord");
  for (const l of LABELS) check(await collega.locator(`#diensten article:has-text("${l}")`).count(), `dienst ${l}`);
  check(await collega.locator("#tarieven h2:has-text('Heldere prijzen, vooraf bekend')").count(), "de prijslijst in de brochure");
  check(await collega.locator("#tarieven >> text=/Tarieven 20\\d{2}, geldig tot en met/").count(), "geldigheid van de tarieven");
  check(await collega.locator("#tarieven article:has-text('Verrichtingenbasis') >> text=€38,50").count(), "Verrichtingenbasis €38,50 per werknemer");
  check(await collega.locator("#tarieven-uur >> text=Casemanager").count(), "tarieven per uur");
  for (const l of LABELS) check(await collega.locator(`#tarieven-${l.toLowerCase()}`).count(), `tarieven van ${l}`);
  check(await collega.locator("#tarieven-reflex >> text=Casemanagement Reflex").count(), "Reflex-abonnement in de prijslijst");
  check(await collega.locator('#diensten a[href="#tarieven-recover"]').count(), "een dienst linkt naar zijn tarieven");
  check(await collega.locator("#tarieven >> text=Maatwerk en specialisten").count(), "maatwerk en specialisten");
  await collega.locator("#tarieven").screenshot({ path: path.join(SHOTS, "03b-tarieven.png") });
  check(await collega.locator("#voorwoord h3:has-text('Waarom we React2u zijn begonnen')").count(), "02: het verhaal van Cindy en Susanne");
  check(await collega.locator("a:has-text('Plan een kennismaking')").count(), "knop om kennis te maken");
  check(sql(`select aantal_bekeken from public.brochures where id = '${id}'`) === "0", "bezoek van een collega telt niet");
  await shot(collega, "03-brochure-collega");
  await collega.close();

  stap("Versturen");
  await page.goto(adminUrl);
  await page.waitForSelector("#vs-aan");
  check((await page.inputValue("#vs-aan")) === "karin@vermeulen.test", "aan: het adres van de prospect");
  check((await page.inputValue("#vs-bericht")).includes("brochure voor Transportbedrijf Vermeulen"), "standaardbericht over de brochure");
  await page.click("button:has-text('Verstuur brochure')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const mail = mails().find((m) => m.to?.includes("karin@vermeulen.test"));
  check(mail?.subject === "Brochure van React2u voor Transportbedrijf Vermeulen", `onderwerp: ${mail?.subject}`);
  check(mail?.html.includes("Bekijk de brochure"), "knop in de mail");
  check(LABELS.every((l) => mail?.html.includes(`>${l}</span>`)), "de zes diensten in de mail");
  check(mail?.html.includes("Beste Karin,"), "aanhef in de mail");
  const mailLink = brochureLink(mail?.html);
  check(mailLink === link, "dezelfde link als in het beheer");
  await page.reload();
  await page.waitForSelector("span:has-text('Verstuurd')");
  check(await page.locator("text=Verstuurd naar karin@vermeulen.test").count(), "verstuurd in de tijdlijn");
  await shot(page, "04-beheer-verstuurd");

  stap("De prospect opent de brochure");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => paginafouten.push(String(e)));
  await klant.goto(link);
  await klant.waitForSelector("h1");
  check((await klant.locator("text=Je bekijkt deze brochure als collega").count()) === 0, "geen collega-melding");
  check(await klant.locator("text=Beste Karin,").count(), "aanhef");
  check(sql(`select aantal_bekeken from public.brochures where id = '${id}'`) === "1", "bezoek geteld");
  check(sql(`select count(*) from public.brochure_gebeurtenissen where brochure_id = '${id}' and soort = 'bekeken'`) === "1", "bekeken in de tijdlijn");
  let melding = null;
  for (let i = 0; i < 20 && !melding; i++) {
    melding = mails().find((m) => /bekijkt je brochure/.test(m.subject || ""));
    if (!melding) await wacht(500);
  }
  check(melding?.to?.includes("sales@react2u.nl"), `melding aan sales: ${melding?.subject}`);
  await shot(klant, "05-brochure-prospect");

  stap("Pdf");
  const pdfAntw = await klant.request.get(`${link}/pdf`);
  const pdfBody = await pdfAntw.body();
  check(pdfAntw.status() === 200 && pdfAntw.headers()["content-type"] === "application/pdf" && pdfBody.subarray(0, 5).toString() === "%PDF-", `GET /brochure/<token>/pdf: ${pdfAntw.status()} ${pdfAntw.headers()["content-type"]}`);
  fs.writeFileSync(path.join(SHOTS, "brochure.pdf"), pdfBody);
  const download = await klant.request.get(`${link}/pdf?download=1`);
  check(/^attachment;/.test(download.headers()["content-disposition"] || ""), "download als bestand");
  check(sql(`select aantal_bekeken from public.brochures where id = '${id}'`) === "1", "een pdf ophalen telt niet als bezoek");

  stap("Telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  check((await tp.evaluate(() => document.documentElement.scrollWidth)) <= 390, "telefoon: geen horizontale scroll");
  await shot(tp, "06-brochure-telefoon", { fullPage: false });
  await tp.locator("#tarieven").screenshot({ path: path.join(SHOTS, "06b-tarieven-telefoon.png") });
  await tel.close();

  stap("Overzicht met status");
  await page.goto(`${BASIS}/admin/brochures`);
  check(await page.locator("td:has-text('Bekeken')").count(), "bekeken in de lijst");
  await shot(page, "07-overzicht", { fullPage: false });

  stap("Offerte vanuit de brochure");
  await page.goto(`${BASIS}/admin/offertes/nieuw?brochure=${id}`);
  await page.waitForSelector("text=Flexbranche");
  await page.click("a:has-text('RI&E')");
  await page.waitForSelector("#of-bedrijf");
  check((await page.inputValue("#of-bedrijf")) === "Transportbedrijf Vermeulen", "bedrijf uit de brochure");
  check((await page.inputValue("#of-cp")) === "Karin Vermeulen", "contactpersoon uit de brochure");
  check((await page.inputValue("#of-email")) === "karin@vermeulen.test", "e-mail uit de brochure");

  stap("Intrekken");
  await page.goto(adminUrl);
  await page.click("button:has-text('Intrekken')");
  await page.waitForSelector("span:has-text('Ingetrokken')", { timeout: 20000 });
  await klant.goto(link);
  check(await klant.locator("text=niet meer beschikbaar").count(), "de prospect ziet dat de brochure is ingetrokken");
  await shot(klant, "08-ingetrokken", { fullPage: false });
  const pdfWeg = await klant.request.get(`${link}/pdf`);
  check(pdfWeg.status() === 404, "pdf van een ingetrokken brochure: 404");

  stap("Onbekende link");
  const onbekend = await klant.goto(`${BASIS}/brochure/${"b".repeat(64)}`);
  check(onbekend?.status() === 404, "onbekend token: 404");
  await kctx.close();

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
