// Klantevaluatie (0043) van begin tot eind: de ingang Documenten in het menu, aanmaken in het beheer, het voorbeeld
// en de pdf, versturen, de klant opent de link (melding aan sales), vult de evaluatie in (eerst met een fout, dan
// compleet: de checklist met een aandachtspunt, de vrije vakken, het volgende bezoek en de acties), de bevestiging
// met de pdf, het beheer met de antwoorden, het register, het klantenbord (kaart en tijdlijn), een collega die de
// link opent, intrekken en een onbekende link. Draaien via e2e/run.mjs (E2E_ALLEEN=evaluatie).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, evaluatieLink, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "evaluatie");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? ok(s) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const BEDRIJF = "Fysiotherapie De Beweging";
const KLANT_EMAIL = "sanne@debeweging.test";

/** Wacht op een mail met dit onderwerp (de seintjes gaan na het antwoord, via after()). */
async function mailMet(re, vanaf = 0) {
  for (let i = 0; i < 30; i++) {
    const m = mails().slice(vanaf).find((x) => re.test(x.subject || ""));
    if (m) return m;
    await wacht(500);
  }
  return null;
}
/** Wacht tot een SQL-vraag het verwachte antwoord geeft. */
async function tot(q, verwacht, ms = 8000) {
  const eind = Date.now() + ms;
  let w = sql(q);
  while (w !== verwacht && Date.now() < eind) {
    await wacht(250);
    w = sql(q);
  }
  return w;
}
const isPdf = (r, body) => r.status() === 200 && r.headers()["content-type"] === "application/pdf" && body.subarray(0, 5).toString() === "%PDF-";
const bijlagePdf = (m) => Boolean(m?.attachments?.[0]?.filename?.endsWith(".pdf")) && Buffer.from(m.attachments[0].content, "base64").subarray(0, 5).toString() === "%PDF-";
const kies = (pagina, punt, label) => pagina.click(`#ev-checklist-${punt} label:has-text('${label}')`);

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);
  // Een eigen klant, los van de kaarten die de andere tests maken.
  sql(`delete from public.klanten where sleutel = public.bedrijf_sleutel('${BEDRIJF}')`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));
  page.on("dialog", (d) => d.accept().catch(() => {}));

  stap("Inloggen met tweestaps");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });
  ok("ingelogd");

  stap("Documenten in het menu, de ingang en het lege register");
  await page.goto(`${BASIS}/admin/documenten`);
  await page.waitForSelector("h1:has-text('Documenten')");
  check(await page.locator('nav a[href="/admin/documenten"]').count(), "Documenten staat in het menu");
  check((await page.locator('nav a[href="/admin/documenten/evaluaties"]').count()) === 0, "de evaluaties zelf niet apart in het menu (wel in het palet)");
  check(await page.locator("h3:has-text('Klantevaluatie')").count() && (await page.locator('article[data-soort="evaluatie"] a[href="/admin/documenten/evaluaties/nieuw"]').count()), "de tegel Klantevaluaties met de knop Nieuw");
  // Alle documenten op één plek (19 nov 2026): vijf soorten in de volgorde van de klantreis, plus de resellerovereenkomst.
  const soorten = await page.locator("article[data-soort]").evaluateAll((els) => els.map((e) => e.getAttribute("data-soort")));
  check(soorten.join(",") === "brochure,offerte,contract,onboarding,evaluatie,reseller", `alle documentsoorten als tegel (${soorten.join(",")})`);
  check(await page.locator("#bij-de-klant-lijst h2:has-text('Ligt bij de klant')").count(), "bovenaan wat bij de klant ligt");
  // Het zijmenu kort: losse ingangen plus drie inklapbare groepen; de documentsoorten zelf niet los.
  const regels = await page.locator("aside nav > *").count();
  check(regels <= 11, `het zijmenu heeft ${regels} regels (was 25)`);
  for (const h of ["/admin/offertes", "/admin/contracten", "/admin/onboarding", "/admin/brochures"]) {
    check((await page.locator(`aside nav a[href="${h}"]`).count()) === 0, `${h} staat niet meer los in het menu`);
  }
  const groepen = await page.locator("aside nav button[aria-expanded]").evaluateAll((els) => els.map((e) => `${e.textContent.trim()}:${e.getAttribute("aria-expanded")}`));
  check(groepen.join(",") === "Cijfers:false,Website:false,Beheer:false", `drie groepen, dicht buiten hun schermen (${groepen.join(",")})`);
  check(await page.locator('aside nav a[href="/admin/documenten"][aria-current="page"]').count(), "Documenten licht op");
  // Dicht staan de links nog in de pagina (inert), afgeknipt door een rij van hoogte 0; Playwright noemt ze dan nog "zichtbaar".
  const websiteHoogte = () => page.evaluate(() => document.getElementById("menu-website").getBoundingClientRect().height);
  check((await websiteHoogte()) < 1, "Pagina's zit dicht in Website");
  check((await page.locator("#menu-website[inert]").count()) === 1, "en is dan niet te bereiken met Tab");
  await page.click("aside nav button:has-text('Website')");
  await page.waitForFunction(() => document.getElementById("menu-website").getBoundingClientRect().height > 200);
  check((await page.locator("#menu-website[inert]").count()) === 0, "open is de lijst weer bereikbaar");
  check((await page.locator("aside nav button:has-text('Website')").getAttribute("aria-expanded")) === "true", "Website klapt open");
  check(await page.locator('aside nav a[href="/admin/paginas"]').isVisible(), "en dan staat Pagina's erin");
  await shot(page, "01-documenten", { fullPage: false });
  await page.goto(`${BASIS}/admin/documenten/evaluaties`);
  await page.waitForSelector("h1:has-text('Klantevaluaties')");
  check(await page.locator("text=Nog geen evaluaties").count(), "lege staat");
  await shot(page, "02-register-leeg", { fullPage: false });

  stap("Nieuwe evaluatie");
  await page.goto(`${BASIS}/admin/documenten/evaluaties/nieuw`);
  await page.waitForSelector("#ev-bedrijf");
  check((await page.inputValue("#ev-bericht")).includes("{bedrijf}"), "persoonlijk woord met invulveld");
  check((await page.inputValue("#ev-ae")) === "sales@react2u.nl", "afzender is de salesbox");
  await page.fill("#ev-bedrijf", BEDRIJF);
  await page.fill("#ev-cp", "Sanne Vos");
  await page.fill("#ev-email", KLANT_EMAIL);
  await page.fill("#ev-tel", "040 234 56 78");
  await page.fill("#ev-datum", "2026-12-04");
  await page.fill("#ev-tijd", "10.00 uur");
  await page.fill("#ev-an", "Rens van Eyck");
  await page.fill("#ev-af", "Bestuurder");
  await page.fill("#ev-at", "06 12345678");
  await shot(page, "03-nieuw");
  await page.click("button:has-text('Evaluatie aanmaken')");
  await page.waitForURL(/\/admin\/documenten\/evaluaties\/[0-9a-f-]{36}/, { timeout: 30000 });
  const adminUrl = page.url().split("?")[0];
  const id = adminUrl.split("/").pop();
  check(await page.locator("text=/KE\\d{4}-\\d{4}/").count(), "nummer KE<jaar>-<volgnummer>");
  check(await page.locator("span:has-text('Concept')").count(), "status concept");
  check(await page.locator("text=4 december 2026, 10.00 uur").count(), "het bezoek staat erbij");
  check(await page.locator("text=Nog niet verstuurd. De klant vult de evaluatie in via zijn eigen link.").count(), "nog niets van de klant");
  const vbLink = await page.getAttribute("a:has-text('Voorbeeld')", "href");
  check(vbLink === `/admin/evaluatievoorbeeld/${id}`, `voorbeeld in het beheer (${vbLink})`);
  check(sql(`select status || ' ' || bezoek_datum || ' ' || bezoek_tijd from public.evaluaties where id = '${id}'`) === "concept 2026-12-04 10.00 uur", "concept met het bezoek in de database");
  check(sql(`select count(*) from public.klanten where sleutel = public.bedrijf_sleutel('${BEDRIJF}') and status = 'klant' and bron = 'evaluatie'`) === "1", "klantenbord: een kaart in de kolom Klant, bron evaluatie");
  await shot(page, "04-beheer-concept");

  stap("Voorbeeld en pdf vanuit het beheer");
  const vb = await ctx.newPage();
  vb.on("pageerror", (e) => paginafouten.push(String(e)));
  await vb.goto(`${BASIS}${vbLink}`);
  await vb.waitForSelector("h1");
  check(await vb.locator("text=Voorbeeld van een concept").count(), "voorbeeldmelding bij een concept");
  check(await vb.locator("h1:has-text('Hoe gaat het')").count(), "de kop");
  check(await vb.locator("text=Beste Sanne,").count(), "aanhef met de voornaam");
  check(await vb.locator(`text=Fijn dat we voor ${BEDRIJF} mogen zorgen`).count(), "{bedrijf} ingevuld in het persoonlijke woord");
  check((await vb.locator("#checklist [role=radiogroup]").count()) === 9, "negen punten van de checklist");
  check(await vb.locator("#checklist >> text=AANSTELLINGSKEURING (van toepassing)").count() && (await vb.locator("#checklist >> text=U heeft een actuele Risico-inventarisatie").count()), "de kopjes en toelichting letterlijk uit het document");
  check(await vb.locator("#dienstverlening >> text=Evaluatie dienstverlening (tevens wijzen op het KTO)").count() && (await vb.locator("#afspraken >> text=Datum volgend bezoek").count()), "de vrije vakken en het volgende bezoek, letterlijk");
  check(await vb.locator("#acties >> text=Actie door").count(), "de actietabel");
  check(await vb.locator("#acties button:has-text('Evaluatie versturen')[disabled]").count(), "in het voorbeeld kan niets worden opgeslagen");
  check((await vb.locator('nav[aria-label="Delen van de evaluatie"] a').count()) === 5, "de vier delen en het vervolg in de kopbalk");
  await shot(vb, "05-voorbeeld");
  await vb.close();
  const vbPdf = await page.request.get(`${BASIS}/admin/evaluatievoorbeeld/${id}/pdf?download=1`);
  const vbBody = await vbPdf.body();
  check(isPdf(vbPdf, vbBody) && /^attachment;/.test(vbPdf.headers()["content-disposition"] || ""), `lege pdf uit het beheer: ${vbPdf.status()}, ${vbBody.length} bytes`);
  fs.writeFileSync(path.join(SHOTS, "klantevaluatie-leeg.pdf"), vbBody);

  stap("Versturen");
  await page.goto(adminUrl);
  await page.waitForSelector("#vs-aan");
  check((await page.inputValue("#vs-aan")) === KLANT_EMAIL, "aan: het adres van de klant");
  check((await page.inputValue("#vs-bericht")).includes("jaarlijkse klantevaluatie"), "standaardbericht over de evaluatie");
  await page.click("button:has-text('Verstuur evaluatie')");
  // Niet `text=Verstuurd.`: dat vindt ook "Nog niet verstuurd." in het blok van het bezoek.
  await page.waitForSelector("[role=status]:has-text('Verstuurd.')", { timeout: 20000 });
  const mail = mails().find((m) => m.to?.includes(KLANT_EMAIL));
  check(mail?.subject === `Klantevaluatie React2u voor ${BEDRIJF}`, `onderwerp: ${mail?.subject}`);
  check(mail?.reply_to === "sales@react2u.nl", `antwoorden naar de salesbox (${mail?.reply_to})`);
  check(mail?.html.includes("Vul de evaluatie in") && mail?.html.includes("Beste Sanne,") && mail?.html.includes("4 december 2026"), "knop, aanhef en het bezoek in de mail");
  fs.writeFileSync(path.join(SHOTS, "mail-evaluatie.html"), mail?.html || "");
  const link = evaluatieLink(mail?.html);
  check(Boolean(link), `link in de mail: ${link}`);
  await page.reload();
  await page.waitForSelector("span.apill:has-text('Verstuurd')");
  check(await page.locator(`text=Verstuurd naar ${KLANT_EMAIL}`).count(), "verstuurd in de tijdlijn");
  // Verstuurd en nog niet geopend: dan ligt hij bij de klant, bovenaan Documenten.
  await page.goto(`${BASIS}/admin/documenten`);
  const uitRij = page.locator(`#bij-de-klant-lijst a[href="/admin/documenten/evaluaties/${id}"]`);
  const uitTekst = (await uitRij.count()) === 1 ? await uitRij.innerText() : "";
  check(["Klantevaluatie", "nog niet geopend", "vandaag"].every((w) => uitTekst.includes(w)), `Documenten: de evaluatie ligt bij de klant, nog niet geopend, sinds vandaag (${uitTekst.replace(/\s+/g, " ")})`);
  await shot(page, "03b-documenten-bij-de-klant");
  const telDoc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL", storageState: await ctx.storageState() });
  const tdp = await telDoc.newPage();
  await tdp.goto(`${BASIS}/admin/documenten`);
  await tdp.waitForSelector("h1:has-text('Documenten')");
  check((await tdp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "Documenten op 390 px zonder zijwaarts scrollen");
  await shot(tdp, "03c-documenten-390");
  await tdp.click("button[aria-label='Menu']");
  // Op een telefoon is de zijbalk een la; de vaste zijbalk van de laptop staat er verborgen naast.
  await tdp.waitForSelector("div.fixed.inset-0 aside nav");
  check((await tdp.locator("div.fixed.inset-0 aside nav > *").count()) <= 11, "ook het telefoonmenu is kort");
  await shot(tdp, "03d-menu-390", { fullPage: false });
  await telDoc.close();
  await page.goto(adminUrl);
  await page.waitForSelector("span.apill:has-text('Verstuurd')");
  const nummer = sql(`select nummer from public.evaluaties where id = '${id}'`);
  check((await tot(`select count(*) from public.klant_gesprekken where bron = 'evaluatie' and bron_id = '${id}' and tekst = 'Klantevaluatie ${nummer} verstuurd naar ${KLANT_EMAIL}'`, "1")) === "1", "klantenbord: verstuurd in de tijdlijn");
  await shot(page, "06-beheer-verstuurd");

  stap("De klant opent de evaluatie");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => paginafouten.push(String(e)));
  const r = await klant.goto(link);
  check(r.status() === 200, `pagina 200 (${r.status()})`);
  check(/noindex/.test(r.headers()["x-robots-tag"] || "") && r.headers()["referrer-policy"] === "no-referrer", "noindex en no-referrer");
  await klant.waitForSelector("h1:has-text('Hoe gaat het')");
  check((await klant.locator("text=Je bekijkt deze evaluatie als collega").count()) === 0, "geen collega-melding");
  check(await klant.locator("text=Beste Sanne,").count(), "aanhef");
  check(await klant.locator("text=0 van 9 beantwoord").count(), "nog niets beantwoord");
  check(await klant.locator("text=Rens van Eyck").count(), "het aanspreekpunt");
  check(await klant.locator("a.hv-btn-roze:has-text('Begin met de checklist')").count(), "knop naar de checklist");
  check(sql(`select aantal_bekeken from public.evaluaties where id = '${id}'`) === "1", "bezoek geteld");
  const geopend = await mailMet(/heeft de klantevaluatie geopend/);
  check(geopend?.to?.includes("sales@react2u.nl"), `seintje aan de afzender: ${geopend?.subject}`);
  check((await tot(`select count(*) from public.klant_gesprekken where bron = 'evaluatie' and bron_id = '${id}' and tekst = 'Klantevaluatie ${nummer} geopend' and door = 'klant'`, "1")) === "1", "klantenbord: geopend in de tijdlijn, door de klant");
  await shot(klant, "07-klant-boven", { fullPage: false });
  await shot(klant, "08-klant-pagina");

  stap("Telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  const breed = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breed <= 390, `geen horizontale scroll op 390 px (${breed})`);
  check(sql(`select aantal_bekeken from public.evaluaties where id = '${id}'`) === "1", "meteen opnieuw openen telt niet als nieuw bezoek");
  await shot(tp, "09-telefoon-boven", { fullPage: false });
  await tp.locator("#checklist").scrollIntoViewIfNeeded();
  await shot(tp, "10-telefoon-checklist", { fullPage: false });
  await tel.close();

  stap("Invullen, eerst met open punten");
  await kies(klant, "rie", "Ja, geregeld");
  await kies(klant, "psa", "Nee, nog niet");
  await klant.fill("#ev-psa-toelichting", "We hebben een vertrouwenspersoon, maar nog geen beleid op papier.");
  await kies(klant, "aanstellingskeuring", "Niet van toepassing");
  await kies(klant, "bedrijfsarts", "Ja, geregeld");
  check(await klant.locator("#checklist >> text=4 van 9 punten beantwoord").count(), "de teller loopt mee");
  await klant.click("#acties button:has-text('Evaluatie versturen')");
  await klant.waitForSelector("[role=alert]:has-text('Nog 5 punten van de checklist zonder antwoord')", { timeout: 20000 });
  ok("melding bij vijf open punten");
  check((await klant.locator("#ev-checklist-pmo >> text=Kies ja, nee of niet van toepassing.").count()) === 1, "het open punt zegt wat er moet gebeuren");
  check(sql(`select antwoorden is null from public.evaluaties where id = '${id}'`) === "t", "niets opgeslagen bij een fout");
  await shot(klant, "11-klant-fout", { fullPage: false });

  stap("Compleet invullen");
  await kies(klant, "pmo", "Niet van toepassing");
  await kies(klant, "preventiemedewerker", "Ja, geregeld");
  await klant.fill("#ev-preventiemedewerker-training", "Basiscursus preventiemedewerker in 2024.");
  await klant.fill("#ev-preventiemedewerker-interesse", "Ja, een opfriscursus.");
  await kies(klant, "ondernemingsraad", "Niet van toepassing");
  await kies(klant, "klachtenprocedure", "Ja, geregeld");
  await kies(klant, "verzuimprotocol", "Ja, geregeld");
  check(await klant.locator("#checklist >> text=9 van 9 punten beantwoord").count(), "alle punten beantwoord");
  await klant.fill("#ev-evaluatie", "Prettig contact met de casemanager, snelle terugkoppeling.");
  await klant.fill("#ev-wensen", "Een PMO voor de behandelaren.");
  await klant.fill("#ev-afspraken", "React2u stuurt een voorstel voor het PSA-beleid.");
  await klant.fill("#ev-volgend_bezoek-datum", "2027-12-03");
  await klant.fill("#ev-volgend_bezoek-tijd", "10.00");
  await klant.fill("#ev-volgend_bezoek-tot", "11.30");
  await klant.click("#acties button:has-text('Actie toevoegen')");
  await klant.fill("#ev-actie-0", "PSA-beleid opstellen");
  await klant.fill("[aria-label='Actie 1: door wie']", "React2u");
  await klant.fill("[aria-label='Actie 1: status']", "Open");
  await klant.click("#acties button:has-text('Actie toevoegen')");
  await klant.fill("#ev-actie-1", "Weg");
  await klant.click("[aria-label='Actie 2 weghalen']");
  check((await klant.locator("#acties input[id^=ev-actie-]").count()) === 1, "een actie weer weggehaald");
  check((await klant.inputValue("#ev-naam")) === "Sanne Vos", "ingevuld door: de contactpersoon vooringevuld");
  await klant.click("#acties button:has-text('Evaluatie versturen')");
  await klant.waitForSelector("[role=status]:has-text('Verstuurd. Dank je wel!')", { timeout: 20000 });
  await klant.waitForSelector("text=Dank je wel, je evaluatie is binnen", { timeout: 20000 });
  check(sql(`select status || ' ' || ingevuld_door from public.evaluaties where id = '${id}'`) === "ingevuld Sanne Vos", "status ingevuld, op naam van de contactpersoon");
  check(sql(`select antwoorden->'checklist'->'psa'->>'antwoord' from public.evaluaties where id = '${id}'`) === "nee", "het aandachtspunt opgeslagen");
  check(sql(`select antwoorden->'checklist'->'preventiemedewerker'->'vragen'->>'interesse' from public.evaluaties where id = '${id}'`) === "Ja, een opfriscursus.", "de open vraag bij de preventiemedewerker");
  check(sql(`select jsonb_array_length(antwoorden->'acties') || ' ' || (antwoorden->'volgend_bezoek'->>'datum') from public.evaluaties where id = '${id}'`) === "1 2027-12-03", "een actie en het volgende bezoek");
  check(await klant.locator("header >> text=9/9").count(), "kopbalk: 9/9");
  check(await klant.locator("text=1 aandachtspunt voor ons gesprek").count(), "de kaart telt het aandachtspunt");
  check(await klant.locator("#acties button:has-text('Wijzigingen opslaan')").count(), "daarna: wijzigingen opslaan");
  const ingevuld = await mailMet(/heeft de klantevaluatie ingevuld/);
  check(ingevuld?.to?.includes("sales@react2u.nl") && ingevuld.html.includes("PSA") && ingevuld.html.includes("Sanne Vos"), `seintje aan de afzender met het aandachtspunt: ${ingevuld?.subject}`);
  const ontvangen = await mailMet(/^Ontvangen: de klantevaluatie van/);
  check(ontvangen?.to?.includes(KLANT_EMAIL) && bijlagePdf(ontvangen) && ontvangen.html.includes("PSA"), `bevestiging aan de klant met de pdf en het aandachtspunt: ${ontvangen?.subject}`);
  fs.writeFileSync(path.join(SHOTS, "mail-ontvangen.html"), ontvangen?.html || "");
  const kPdf = await klant.request.get(`${link}/pdf?download=1`);
  const kBody = await kPdf.body();
  check(isPdf(kPdf, kBody), `de ingevulde pdf voor de klant: ${kPdf.status()}, ${kBody.length} bytes`);
  fs.writeFileSync(path.join(SHOTS, "klantevaluatie-ingevuld.pdf"), kBody);
  check((await tot(`select count(*) from public.klant_gesprekken where bron = 'evaluatie' and bron_id = '${id}' and tekst = 'Klantevaluatie ${nummer} ingevuld door Sanne Vos'`, "1")) === "1", "klantenbord: ingevuld in de tijdlijn");
  await shot(klant, "12-klant-ingevuld", { fullPage: false });

  stap("De klant past iets aan");
  const voorWijziging = mails().length;
  await klant.fill("#ev-wensen", "Een PMO voor de behandelaren en een training voor leidinggevenden.");
  check((await klant.locator("[role=status]").count()) === 0, "de melding 'verstuurd' verdwijnt zodra er weer iets wijzigt");
  await klant.click("#acties button:has-text('Wijzigingen opslaan')");
  await klant.waitForSelector("[role=status]:has-text('Opgeslagen. Dank je wel!')", { timeout: 20000 });
  check((await tot(`select antwoorden->>'wensen' like '%leidinggevenden%' from public.evaluaties where id = '${id}'`, "t")) === "t", "de wijziging staat erin");
  check((await tot(`select count(*) from public.evaluatie_gebeurtenissen where evaluatie_id = '${id}' and soort = 'ingevuld' and (details->>'opnieuw') = 'true'`, "1")) === "1", "aangepast in de tijdlijn");
  const aangepast = await mailMet(/heeft de klantevaluatie aangepast/, voorWijziging);
  check(Boolean(aangepast), `seintje aan de afzender: ${aangepast?.subject}`);
  await wacht(1500);
  check(mails().slice(voorWijziging).filter((m) => /^Ontvangen/.test(m.subject || "")).length === 0, "de klant krijgt de bevestiging één keer");

  stap("Beheer: de antwoorden");
  await page.goto(adminUrl);
  await page.waitForSelector("span:has-text('Ingevuld')");
  check(await page.locator("text=Eén aandachtspunt voor het gesprek: PSA.").count(), "banner met het aandachtspunt");
  check(await page.locator("#antwoorden >> text=Nee, nog niet").count() && (await page.locator("#antwoorden >> text=We hebben een vertrouwenspersoon").count()), "de checklist met de toelichting van de klant");
  check(await page.locator("#antwoorden >> text=Ja, een opfriscursus.").count(), "de open vraag bij de preventiemedewerker");
  check(await page.locator("#antwoorden td:has-text('PSA-beleid opstellen')").count(), "de actie in de tabel");
  check(await page.locator("text=Datum volgend bezoek: 3 december 2027, 10.00 tot 11.30").count(), "het volgende bezoek");
  check(await page.locator("text=Evaluatie ingevuld door Sanne Vos").count() && (await page.locator("text=Evaluatie aangepast door Sanne Vos").count()), "ingevuld en aangepast in de tijdlijn");
  const aPdf = await page.request.get(`${BASIS}/admin/evaluatievoorbeeld/${id}/pdf`);
  check(isPdf(aPdf, await aPdf.body()), `de ingevulde pdf in het beheer: ${aPdf.status()}`);
  await shot(page, "13-beheer-ingevuld");

  stap("Register, de ingang en het klantenbord");
  await page.goto(`${BASIS}/admin/documenten/evaluaties`);
  check(await page.locator("td:has-text('Ingevuld')").count() && (await page.locator("td >> text=1 punt").count()), "ingevuld met een aandachtspunt in de lijst");
  await page.goto(`${BASIS}/admin/documenten/evaluaties?filter=klant`);
  check(await page.locator("text=Geen evaluaties in deze selectie").count(), "filter: niets meer bij de klant");
  await page.goto(`${BASIS}/admin/documenten/evaluaties?filter=ingevuld&q=beweging`);
  check(await page.locator(`td a:has-text('${BEDRIJF}')`).count(), "filter en zoeken");
  await shot(page, "14-register", { fullPage: false });
  await page.goto(`${BASIS}/admin/documenten`);
  const tegel = await page.locator('article[data-soort="evaluatie"]').innerText();
  check(/Ingevuld\s*1\b/i.test(tegel), `de tegel telt de ingevulde evaluatie (${tegel.replace(/\s+/g, " ").slice(0, 120)})`);
  check((await page.locator(`#bij-de-klant-lijst a:has-text('${BEDRIJF}')`).count()) === 0, "een ingevulde evaluatie ligt niet meer bij de klant");
  const kid = sql(`select id from public.klanten where sleutel = public.bedrijf_sleutel('${BEDRIJF}')`);
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector(`section[data-kolom="klant"] #klant-${kid}`, { timeout: 20000 });
  ok("de kaart staat in de kolom Klant");
  await page.click(`#klant-${kid}`);
  await page.waitForSelector("aside[role=dialog]", { timeout: 20000 });
  check((await page.locator(`aside[role=dialog] a[href="/admin/documenten/evaluaties/${id}"]`).count()) >= 1, "doorklikken naar de evaluatie vanuit het paneel");
  check(await page.locator("aside[role=dialog] >> text=Klantevaluatie").count(), "de bron Klantevaluatie in de tijdlijn");
  check(await page.locator(`aside[role=dialog] >> text=Klantevaluatie ${nummer} ingevuld door Sanne Vos`).count(), "ingevuld in de tijdlijn van het paneel");
  check(sql(`select laatste_contact from public.klanten where id = '${kid}'`) === `Klantevaluatie ${nummer} aangepast door Sanne Vos`, "het laatste contact op de kaart");
  await shot(page, "15-klantenbord-paneel");

  stap("Collega opent de link");
  await page.goto(link);
  check(await page.locator("text=Je bekijkt deze evaluatie als collega").count(), "collega-melding");
  check(sql(`select aantal_bekeken from public.evaluaties where id = '${id}'`) === "1", "bezoek van een collega telt niet");

  stap("Intrekken");
  await page.goto(adminUrl);
  await page.click("button:has-text('Intrekken')");
  await page.waitForSelector("span:has-text('Ingetrokken')", { timeout: 20000 });
  await klant.goto(link);
  check(await klant.locator("text=niet meer beschikbaar").count(), "de klant ziet dat de evaluatie is ingetrokken");
  await shot(klant, "16-ingetrokken", { fullPage: false });
  const pdfWeg = await klant.request.get(`${link}/pdf`);
  check(pdfWeg.status() === 404, "pdf van een ingetrokken evaluatie: 404");
  await page.click("button:has-text('Heropenen')");
  // Niet `span:has-text('Ingevuld')`: de tijdlijn zegt ook "Evaluatie ingevuld door".
  await page.waitForSelector("span.apill:has-text('Ingevuld')", { timeout: 20000 });
  check((await tot(`select status from public.evaluaties where id = '${id}'`, "ingevuld")) === "ingevuld", "heropend: weer ingevuld");

  stap("Onbekende link");
  const onbekend = await klant.goto(`${BASIS}/evaluatie/${"c".repeat(64)}`);
  check(onbekend.status() === 404 && (await klant.locator("text=Deze link werkt niet").count()), `nette 404 (${onbekend.status()})`);
  check((await klant.request.get(`${BASIS}/evaluatie/${"c".repeat(64)}/pdf`)).status() === 404, "onbekende link naar de pdf: 404");
  await kctx.close();

  stap("Mail renderen");
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 680, height: 900 });
  await mp.goto("file://" + path.join(SHOTS, "mail-evaluatie.html"));
  await mp.waitForTimeout(400);
  await shot(mp, "mail-evaluatie");
  await mp.goto("file://" + path.join(SHOTS, "mail-ontvangen.html"));
  await mp.waitForTimeout(400);
  await shot(mp, "mail-ontvangen");

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
