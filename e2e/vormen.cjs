// Offertevormen (0025): kiezer, RI&E van begin tot eind, spoor 2, training, PAGO, sjabloon bewaren en
// terugzetten. Draait na e2e/offerte.cjs op dezelfde database, via e2e/run.mjs.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, offerteLink, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "vormen");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });

async function maak(page, sjabloon, velden) {
  await page.goto(`${BASIS}/admin/offertes/nieuw?sjabloon=${sjabloon}`);
  await page.waitForSelector("#of-bedrijf");
  for (const [sel, waarde] of Object.entries(velden)) await page.fill(sel, waarde);
  await page.click("button:has-text('Offerte aanmaken')");
  await page.waitForURL(/\/admin\/offertes\/[0-9a-f-]{36}$/, { timeout: 30000 });
  return page.url();
}

async function openLink(page) {
  await page.click("text=Liever zelf versturen");
  await page.click("button:has-text('Zet de link open')");
  await page.waitForSelector("text=De link staat open");
  return page.inputValue("input[aria-label^='Link naar de offerte']");
}

async function teken(klant, naam) {
  await klant.click("aside button:has-text('Naar ondertekenen')");
  await klant.waitForTimeout(900);
  await klant.fill("#akkoord input[autocomplete=name]", naam);
  await klant.click("#akkoord [role=tab]:has-text('Typen')");
  await klant.waitForTimeout(600);
  await klant.check("#akkoord input[type=checkbox]");
  // Factuurgegevens en de code uit de mail (0026)
  if (!(await klant.inputValue("#of-fadres"))) {
    await klant.fill("#of-fadres", "Teststraat 1");
    await klant.fill("#of-fpostcode", "1234 AB");
    await klant.fill("#of-fplaats", "Eindhoven");
  }
  const voor = mails().length;
  await klant.click("#akkoord button[type=submit]");
  await klant.waitForSelector("#of-code", { timeout: 20000 });
  const codeMail = mails().slice(voor).find((m) => /is je code voor offerte/.test(m.subject));
  await klant.fill("#of-code", codeMail.subject.slice(0, 6));
  await klant.waitForSelector("text=Ondertekend", { timeout: 30000 });
}

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

  stap("Kiezer: eerst de vorm");
  await page.goto(`${BASIS}/admin/offertes/nieuw`);
  await page.waitForSelector("text=Re-integratie");
  for (const naam of ["Verzuimbegeleiding: klant kiest", "RI&E", "PAGO", "Verzuimtraining", "Spoor 2", "Werkfittraject", "Arbeidsdeskundig onderzoek"]) {
    check(await page.locator(`a:has-text("${naam}")`).count(), `sjabloon ${naam}`);
  }
  await shot(page, "01-kiezer");

  stap("RI&E samenstellen");
  await page.click("a:has-text('RI&E')");
  await page.waitForSelector("#of-bedrijf");
  check((await page.inputValue("#of-titel")).startsWith("Risico-inventarisatie"), "titel uit het sjabloon");
  check((await page.inputValue("#of-inhoud")).includes("## Inleiding"), "uitleg uit het sjabloon");
  check(await page.locator("label[for=of-betreft]:has-text('Locatie')").count(), "betreft heet Locatie");
  await page.fill("#of-bedrijf", "Bouwbedrijf Hendriks");
  await page.fill("#of-cp", "Sanne Hendriks");
  await page.fill("#of-email", "sanne@hendriks.test");
  await page.fill("#of-betreft", "Vestiging Helmond");
  await page.locator("[role=tab]:has-text('Voorbeeld')").first().click();
  await page.locator("#of-inhoud").evaluate((el) => el.closest("div").parentElement.scrollIntoView());
  await shot(page, "02-editor-rie-voorbeeld", { fullPage: false });
  await page.locator("[role=tab]:has-text('Bewerken')").first().click();
  await page.click("button:has-text('Offerte aanmaken')");
  await page.waitForURL(/\/admin\/offertes\/[0-9a-f-]{36}$/);
  const rieUrl = page.url();
  check(await page.locator("text=RI&E · Vestiging Helmond").count(), "vorm en betreft in de kop");
  await page.fill("#vs-bericht", "Zoals besproken stuur ik je hierbij ons voorstel voor de RI&E.");
  await page.click("button:has-text('Verstuur offerte')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const mail = mails().find((m) => m.to?.includes("sanne@hendriks.test"));
  check(mail?.html.includes("Risico-inventarisatie en -evaluatie (RI&amp;E)"), "titel van de offerte in de mail");
  const rieLink = offerteLink(mail?.html);

  stap("RI&E bij de klant");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => paginafouten.push(String(e)));
  await klant.goto(rieLink);
  await klant.waitForSelector("h1");
  check(await klant.locator("text=Beste Sanne Hendriks,").count(), "aanhef ingevuld");
  check(await klant.locator("text=voor Bouwbedrijf Hendriks.").count(), "{bedrijf} ingevuld in de aanhef");
  check(await klant.locator("dl div:has(dt:has-text('Locatie')) dd:has-text('Vestiging Helmond')").count(), "betreft op de omslag");
  check(await klant.locator("h3:has-text('Stap 1: Inventariseren van de risico')").count(), "tussenkoppen uit de uitleg");
  check(await klant.locator(":is(h2,h3):has-text('Voorwaarden')").count() && (await klant.locator("text=De betalingstermijn is 30 dagen.").count()), "voorwaarden");
  check(await klant.locator("text=We plannen de inventarisatie").count(), "eigen vervolgstappen");
  check((await klant.locator("aside [aria-live]").first().innerText()).trim() === "€2.825", "totaal €2.825 eenmalig");
  check((await klant.locator("text={bedrijf}").count()) === 0, "geen losse invulvelden zichtbaar");
  await shot(klant, "03-klant-rie");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(rieLink);
  await tp.waitForSelector("h1");
  check((await tp.evaluate(() => document.documentElement.scrollWidth)) <= 390, "telefoon: geen horizontale scroll");
  await shot(tp, "04-klant-rie-telefoon");
  await tel.close();

  stap("RI&E tekenen");
  await teken(klant, "Sanne Hendriks");
  check(await klant.locator("text=Opdrachtnemer").count() && (await klant.locator("text=Getekend voor akkoord").count()), "opdrachtnemer en opdrachtgever");
  check(await klant.locator("h2:has-text('Over deze offerte')").count(), "uitleg terug te lezen");
  await klant.click("summary:has-text('Lees de volledige tekst')");
  await shot(klant, "05-rie-getekend");
  const vast = sql("select (getekend_inhoud->>'vorm') || '|' || (getekend_inhoud->>'betreft') || '|' || (position('30 dagen' in getekend_inhoud->>'voorwaarden') > 0)::text from public.offertes where bedrijf = 'Bouwbedrijf Hendriks'");
  check(vast === "rie|Vestiging Helmond|true", `vorm, betreft en voorwaarden zitten in de getekende versie (${vast})`);

  stap("Spoor 2");
  await maak(page, "spoor2", { "#of-bedrijf": "Logistiek Van Beek", "#of-cp": "Peter van Beek", "#of-email": "peter@vanbeek.test", "#of-betreft": "M. de Wit" });
  check(await page.locator("text=Spoor 2 · M. de Wit").count(), "spoor 2 met werknemer");
  const s2Link = await openLink(page);
  await klant.goto(s2Link);
  await klant.waitForSelector("h1");
  check(await klant.locator("dl div:has(dt:has-text('Werknemer')) dd:has-text('M. de Wit')").count(), "werknemer op de omslag");
  check(await klant.locator("h3:has-text('1. Opstellen trajectplan')").count(), "fases als tussenkoppen");
  check((await klant.locator("aside [aria-live]").first().innerText()).trim() === "€3.365", "spoor 2 tegen de prijslijst 2027");
  check(await klant.locator("text=Verlenging na zes maanden").count(), "verlenging als tarief");
  await shot(klant, "06-klant-spoor2");

  stap("Verzuimtraining");
  await maak(page, "verzuimtraining", { "#of-bedrijf": "Zorggroep De Linde", "#of-cp": "Fatima El Amrani", "#of-email": "fatima@delinde.test", "#of-betreft": "12 leidinggevenden" });
  const trLink = await openLink(page);
  await klant.goto(trLink);
  await klant.waitForSelector("h1");
  check(await klant.locator("blockquote:has-text('leiderschapsvaardigheid')").count(), "uitgelichte zin");
  check(await klant.locator("text=€89 p.p. en €0,42 per km").count(), "reiskosten als prijstekst");
  check((await klant.locator("text=Inbegrepen").count()) >= 2, "voorbereiding en materiaal inbegrepen");
  check(await klant.locator("button[role=switch]:has-text('Vervolgtraining')").count(), "vervolgtraining als optie");
  await shot(klant, "07-klant-training");

  stap("PAGO per medewerker");
  await maak(page, "pago", { "#of-bedrijf": "FlexWerk BV", "#of-email": "hr@flexwerk.test", "#of-mw": "5" });
  const pagoLink = await openLink(page);
  await klant.goto(pagoLink);
  await klant.waitForSelector("h1");
  check((await klant.locator("aside [aria-live]").first().innerText()).trim() === "€212,50", "5 × €42,50 = €212,50");
  check(await klant.locator("text=Beste heer, mevrouw,").count(), "zonder contactpersoon: heer, mevrouw");
  await shot(klant, "08-klant-pago", { fullPage: false });

  stap("Bewaar als sjabloon");
  await page.goto(rieUrl);
  await page.selectOption("#sj-keuze", "rie");
  await page.fill("#sj-geldig", "21");
  await page.click("button:has-text('Bewaren als sjabloon')");
  await page.waitForSelector("text=Bewaard als sjabloon", { timeout: 20000 });
  await page.goto(`${BASIS}/admin/offertes/sjablonen`);
  check(await page.locator("details:has-text('RI&E') >> text=aangepast").count(), "RI&E staat op aangepast");
  await shot(page, "09-sjablonen");
  await page.goto(`${BASIS}/admin/offertes/nieuw?sjabloon=rie`);
  const geldig = await page.inputValue("#of-geldig");
  const verwacht = new Date(Date.now() + 21 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  check(geldig === verwacht, `nieuwe RI&E is 21 dagen geldig (${geldig})`);
  await page.goto(`${BASIS}/admin/offertes/sjablonen`);
  await page.click("details:has-text('RI&E') summary");
  await page.click("details:has-text('RI&E') button:has-text('Terug naar standaard')");
  await page.waitForSelector("text=Terug naar de standaardversie", { timeout: 20000 });
  check((await page.locator("details:has-text('RI&E') >> text=aangepast").count()) === 0, "RI&E weer standaard");

  stap("Overzicht met vorm");
  await page.goto(`${BASIS}/admin/offertes`);
  check(await page.locator("td:has-text('Spoor 2')").count(), "vorm in de lijst");
  await shot(page, "10-overzicht", { fullPage: false });
  await page.goto(`${BASIS}/admin/offertes?vorm=rie`);
  check((await page.locator("tbody tr").count()) === 1, "filter op vorm");

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
