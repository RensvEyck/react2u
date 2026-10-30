// Offertemodule van begin tot eind: aanmaken in het beheer, versturen, de klant kiest, krijgt een code,
// tekent en ontvangt de pdf; daarna afwijzen en een onbekende link. Draaien via e2e/run.mjs.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, offerteLink, totp, geheim } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "offerte");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? ok(s) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const page = await ctx.newPage();
  const consoleFouten = [];
  page.on("pageerror", (e) => consoleFouten.push(String(e)));
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
  ok(`ingelogd, op ${new URL(page.url()).pathname}`);

  stap("Overzicht (leeg)");
  await page.goto(`${BASIS}/admin/offertes`);
  await page.waitForSelector("h1:has-text('Offertes')");
  await shot(page, "01-overzicht-leeg");
  check(await page.locator("text=Nog geen offertes").count(), "lege staat met uitleg");

  stap("Vanuit een offerteaanvraag in het Postvak IN");
  await page.goto(`${BASIS}/admin/postvak-in`);
  await page.click("a:has-text('Offerte maken')");
  await page.waitForURL(/\/admin\/offertes\/nieuw\?bericht=/);
  check((await page.inputValue("#of-bedrijf")) === "Fietsenmaker Peters", "bedrijf uit de aanvraag");
  check((await page.inputValue("#of-mw")) === "12", "medewerkers uit de aanvraag");
  check((await page.inputValue("#of-email")) === "piet@peters.test", "e-mail uit de aanvraag");
  check(await page.locator("text=Casemanagement Compleet").count(), "startpunt Compleet uit de gekozen aansluiting");
  check(await page.locator("text=Ingevuld vanuit de offerteaanvraag").count(), "uitleg bovenaan");
  await shot(page, "01b-vanuit-aanvraag", { fullPage: false });

  stap("Nieuwe offerte samenstellen");
  await page.goto(`${BASIS}/admin/offertes/nieuw`);
  await page.click("a:has-text('Verzuimbegeleiding: klant kiest')");
  await page.waitForSelector("#of-bedrijf");
  await page.fill("#of-bedrijf", "Bakkerij De Gouden Korst BV");
  await page.fill("#of-mw", "42");
  await page.fill("#of-cp", "Marieke Jansen");
  await page.fill("#of-email", "marieke@goudenkorst.test");
  await page.waitForSelector("text=Casemanagement Compleet");
  check(await page.locator("text=Verrichtingenbasis").count(), "startpunt zet de aansluitingen erin");
  // Uit de prijslijst: salarisadministratie als optie en een loopbaanscan
  await page.click("button:has-text('Uit de prijslijst')");
  await page.fill("dialog input[placeholder^='Zoek']", "maandverloning");
  await page.click("dialog label:has-text('Salarisadministratie, maandverloning') input");
  await page.fill("dialog input[placeholder^='Zoek']", "loopbaanscan");
  await page.click("dialog label:has-text('Loopbaanscan') input");
  await page.click("dialog button:has-text('2 toevoegen')");
  check(await page.locator("text=Loopbaanscan").count(), "twee onderdelen uit de prijslijst toegevoegd");
  // Eigen onderdeel: eenmalige intake, vast
  await page.click("button:has-text('Eigen onderdeel')");
  const nieuweRij = page.locator("li:has(input[id$='-naam'])");
  await nieuweRij.locator("input[id$='-naam']").fill("Intake en implementatie");
  await nieuweRij.locator("select[id$='-soort']").selectOption("vast");
  await nieuweRij.locator("input[id$='-prijs']").fill("495");
  await nieuweRij.locator("select[id$='-eenheid']").selectOption("eenmalig");
  await nieuweRij.locator("textarea[id$='-oms']").fill("Kennismaking met je organisatie, inrichten van het verzuimdossier en een startsessie met leidinggevenden.");
  await page.fill("#of-intro", "Beste Marieke,\n\nBedankt voor het fijne gesprek van dinsdag. Zoals besproken vind je hieronder twee manieren om aan te sluiten. Kies wat het beste past; het totaal rekent meteen mee.\n\nVragen? Bel me gerust.");
  check((await page.inputValue("#of-ae")) === "sales@react2u.nl", "afzendermail standaard sales@react2u.nl");
  await page.fill("#of-an", "Rens van Eyck");
  await page.fill("#of-af", "Eigenaar");
  // Factuurgegevens vooraf (0026): de klant ziet ze ingevuld
  await page.click("summary:has-text('Factuurgegevens vooraf invullen')");
  await page.fill("#of-fadres", "Korenstraat 8");
  await page.fill("#of-fpostcode", "5611 KL");
  await page.fill("#of-fplaats", "Eindhoven");
  const totaalTekst = await page.locator("aside .acard").first().innerText();
  check(totaalTekst.includes("€1.617"), `totaal bij standaardkeuze klopt (42 × €38,50 = €1.617): ${totaalTekst.split("\n")[1]}`);
  await shot(page, "02-editor");
  await page.click("button:has-text('Offerte aanmaken')");
  await page.waitForURL(/\/admin\/offertes\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const offerteUrl = page.url();
  ok(`opgeslagen: ${new URL(offerteUrl).pathname}`);
  await page.waitForSelector("text=Offerte aangemaakt");
  await shot(page, "03-offerte-concept");

  stap("Voorbeeld");
  const id = offerteUrl.split("/").pop();
  const vb = await ctx.newPage();
  await vb.goto(`${BASIS}/admin/offertevoorbeeld/${id}`);
  await vb.waitForSelector("text=Voorbeeld: zo ziet de klant");
  await shot(vb, "04-voorbeeld");
  await vb.close();
  const adminConcept = await page.request.get(`${BASIS}/admin/offertevoorbeeld/${id}/concept`);
  check(adminConcept.status() === 200 && (await adminConcept.body()).subarray(0, 5).toString() === "%PDF-", `concept-pdf vanuit het beheer: ${adminConcept.status()}`);

  stap("Versturen");
  await page.fill("#vs-bericht", "Bedankt voor het prettige gesprek. Zoals besproken stuur ik je hierbij onze offerte.");
  await page.click("button:has-text('Verstuur offerte')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const verstuurd = mails().find((m) => m.to?.includes("marieke@goudenkorst.test"));
  check(Boolean(verstuurd), "mail naar de klant verstuurd");
  check(verstuurd?.reply_to === "sales@react2u.nl", `antwoorden naar de salesbox (${verstuurd?.reply_to})`);
  check(!verstuurd?.html.includes(BEHEERDER.email), "geen persoonlijk mailadres in de offertemail");
  const link = offerteLink(verstuurd?.html);
  check(Boolean(link), "mail bevat de offertelink");
  fs.writeFileSync(path.join(SHOTS, "mail-offerte.html"), verstuurd?.html || "");
  await page.reload();
  await shot(page, "05-offerte-verstuurd");

  stap("Collega opent de link");
  await page.goto(link);
  check(await page.locator("text=Je bekijkt deze offerte als collega").count(), "collega-melding, telt niet mee");

  stap("Klant opent de link");
  const klantCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await klantCtx.newPage();
  klant.on("pageerror", (e) => consoleFouten.push(String(e)));
  await klant.goto(link);
  await klant.waitForSelector("h1");
  await shot(klant, "06-klant-desktop");
  const perJaar = async () => (await klant.locator("aside [aria-live]").first().innerText()).trim();
  check((await perJaar()) === "€134,75", `start per maand ${await perJaar()} (42 × €38,50 / 12)`);
  await klant.click("button[role=radio]:has-text('Casemanagement Compleet')");
  check((await perJaar()) === "€488,25", `Compleet gekozen: ${await perJaar()} per maand (42 × €139,50 / 12)`);
  await klant.click("button[role=switch]:has-text('Salarisadministratie')");
  check((await perJaar()) === "€929,25", `plus salarisadministratie: ${await perJaar()} per maand (+ 42 × €126 / 12)`);
  await klant.click("button[role=switch]:has-text('Salarisadministratie')");
  await klant.click("button[role=switch]:has-text('Loopbaanscan')");
  const samenvatting = await klant.locator("aside").first().innerText();
  check(samenvatting.includes("€2.520 eenmalig"), "eenmalig met intake en loopbaanscan: €2.520 (€495 + €2.025)");
  await klant.waitForTimeout(1500); // tussenstand bewaren
  await shot(klant, "07-klant-gekozen");

  stap("Concept-pdf om intern te bespreken");
  const conceptHref = await klant.locator("aside a:has-text('Download als pdf om intern te bespreken')").getAttribute("href");
  check(/\/concept\?keuze=/.test(conceptHref || ""), `link met de huidige keuze: ${conceptHref}`);
  const concept = await klant.request.get(new URL(conceptHref, BASIS).toString());
  const conceptBody = await concept.body();
  check(concept.status() === 200 && concept.headers()["content-type"] === "application/pdf" && conceptBody.subarray(0, 5).toString() === "%PDF-", `concept-pdf: ${concept.status()}`);
  check(/\(concept\)\.pdf/.test(concept.headers()["content-disposition"] || ""), `bestandsnaam met (concept): ${concept.headers()["content-disposition"]}`);
  check(conceptBody.toString("latin1").includes("offerte, concept"), "pdf is gemarkeerd als concept");
  fs.writeFileSync(path.join(SHOTS, "concept.pdf"), conceptBody);

  stap("Telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  const breed = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breed <= 390, `geen horizontale scroll op 390 px (${breed})`);
  check(await tp.locator("div.fixed:has-text('per maand'):has-text('exclusief btw')").first().isVisible(), "vaste balk onderaan met het maandbedrag");
  await shot(tp, "08-klant-telefoon-boven", { fullPage: false });
  await shot(tp, "09-klant-telefoon-heel");
  await tp.click("div.fixed button:has-text('Ondertekenen')");
  await tp.waitForTimeout(1200);
  const top = (await tp.locator("#akkoord").boundingBox()).y;
  check(top < 200, `knop onderaan brengt je naar het akkoord (${Math.round(top)})`);
  await shot(tp, "10-telefoon-akkoord", { fullPage: false });
  await tel.close();

  stap("Admin ziet de tussenstand van de klant");
  await page.goto(offerteUrl);
  check(await page.locator("text=Aangeklikt").count(), "tussenstand zichtbaar in het beheer");
  check(await page.locator("text=Bekeken door de klant").count(), "bekeken in de tijdlijn");
  const bekekenMail = mails().find((m) => /bekijkt je offerte/.test(m.subject));
  check(Boolean(bekekenMail), "seintje aan de afzender bij eerste keer openen");

  stap("Ondertekenen");
  await klant.click("aside button:has-text('Naar ondertekenen')");
  await klant.waitForTimeout(900);
  check((await klant.inputValue("#akkoord input[autocomplete=name]")) === "Marieke Jansen", "naam vooringevuld");
  await klant.click("#akkoord button[type=submit]");
  check(await klant.locator("#akkoord [role=alert]").count(), `zonder handtekening een melding: ${await klant.locator("#akkoord [role=alert]").innerText()}`);
  await klant.fill("#akkoord input[autocomplete=organization-title]", "Directeur");
  // Het tekenvak in beeld (de verzendknop staat nu verder naar beneden) en wachten tot het scrollen klaar is.
  await klant.locator("#akkoord canvas").scrollIntoViewIfNeeded();
  let doek = await klant.locator("#akkoord canvas").boundingBox();
  for (let i = 0; i < 20; i++) {
    await klant.waitForTimeout(150);
    const nu = await klant.locator("#akkoord canvas").boundingBox();
    if (Math.abs(nu.y - doek.y) < 0.5) break;
    doek = nu;
  }
  await klant.mouse.move(doek.x + 40, doek.y + doek.height * 0.6);
  await klant.mouse.down();
  for (let i = 0; i <= 40; i++) {
    const x = doek.x + 40 + i * ((doek.width - 80) / 40);
    const y = doek.y + doek.height * 0.6 - Math.sin(i / 3) * 28 - (i % 7) * 2;
    await klant.mouse.move(x, y, { steps: 2 });
  }
  await klant.mouse.up();
  await klant.check("#akkoord input[type=checkbox]");
  // Factuurgegevens: vooraf ingevuld door sales, de klant vult aan
  check((await klant.inputValue("#of-fadres")) === "Korenstraat 8", "factuuradres vooraf ingevuld door sales");
  check(await klant.locator("text=Al ingevuld door Rens").count(), "uitleg: al ingevuld door de afzender");
  check((await klant.inputValue("#of-femail")) === "marieke@goudenkorst.test", "facturen standaard naar wie tekent");
  await klant.fill("#of-fkvk", "1234");
  await klant.click("#akkoord button[type=submit]");
  check((await klant.locator("#akkoord [role=alert]").innerText()).includes("8 cijfers"), "KvK-nummer met te weinig cijfers geweigerd");
  await klant.fill("#of-fkvk", "12345678");
  await klant.fill("#of-femail", "administratie@goudenkorst.test");
  await klant.fill("#of-finkoop", "PO-2026-118");
  await klant.locator("#akkoord").scrollIntoViewIfNeeded();
  await shot(klant, "11-akkoord", { fullPage: false });
  const voorCode = mails().length;
  await klant.click("#akkoord button[type=submit]");
  // Code per mail (0026)
  await klant.waitForSelector("text=Nog één stap", { timeout: 20000 });
  check(await klant.locator("#akkoord input[autocomplete=name]").isDisabled(), "gegevens vast tijdens de codestap");
  await klant.locator("#of-code").scrollIntoViewIfNeeded();
  await shot(klant, "11b-code", { fullPage: false });
  const codeMail = mails().slice(voorCode).find((m) => /is je code voor offerte/.test(m.subject));
  check(Boolean(codeMail) && codeMail.to.includes("marieke@goudenkorst.test"), `codemail naar wie tekent: ${codeMail?.subject}`);
  fs.writeFileSync(path.join(SHOTS, "mail-code.html"), codeMail?.html || "");
  const code = codeMail?.subject.match(/^(\d{6})/)?.[1] || "";
  check(/^\d{6}$/.test(code), "code van 6 cijfers in het onderwerp");
  await klant.fill("#of-code", code === "000000" ? "111111" : "000000");
  await klant.waitForSelector("#akkoord [role=alert]", { timeout: 15000 });
  check((await klant.locator("#akkoord [role=alert]").innerText()).includes("klopt niet"), "verkeerde code geweigerd");
  await klant.fill("#of-code", code);
  await klant.waitForSelector("text=Gelukt, Marieke!", { timeout: 30000 });
  await shot(klant, "12-getekend");
  check(await klant.locator("text=Kenmerk van de ondertekende versie").count(), "kenmerk (hash) zichtbaar");
  check(await klant.locator("text=E-mailadres bevestigd met een code").count(), "bevestigd-label bij de handtekening");
  check(await klant.locator("text=Inkoopnummer PO-2026-118").count(), "factuurgegevens in de getekende versie");
  await klant.waitForTimeout(4000); // mails (met pdf) na het antwoord

  stap("Mails na ondertekening");
  const alle = mails();
  const bevestiging = alle.find((m) => m.to?.includes("marieke@goudenkorst.test") && /Ondertekend/.test(m.subject));
  const getekendMail = alle.find((m) => /^Getekend/.test(m.subject));
  check(Boolean(bevestiging), `bevestiging naar de klant: ${bevestiging?.subject}`);
  check(Boolean(getekendMail) && getekendMail.to.includes("sales@test.local") && getekendMail.to.includes("sales@react2u.nl") && !getekendMail.to.includes(BEHEERDER.email), `melding naar sales en de salesbox, niet persoonlijk: ${getekendMail?.subject} → ${getekendMail?.to}`);
  fs.writeFileSync(path.join(SHOTS, "mail-bevestiging.html"), bevestiging?.html || "");
  fs.writeFileSync(path.join(SHOTS, "mail-getekend.html"), getekendMail?.html || "");
  const bijlage = bevestiging?.attachments?.[0];
  check(Boolean(bijlage) && /\.pdf$/.test(bijlage.filename) && Buffer.from(bijlage.content, "base64").subarray(0, 5).toString() === "%PDF-", `pdf bij de bevestiging: ${bijlage?.filename}`);
  check(Boolean(getekendMail?.attachments?.[0]), "pdf ook bij de melding aan sales");
  check(/Factuurgegevens/.test(getekendMail?.html || "") && /PO-2026-118/.test(getekendMail?.html || ""), "factuurgegevens met inkoopnummer in de melding aan sales");
  if (bijlage) fs.writeFileSync(path.join(SHOTS, "getekend-uit-mail.pdf"), Buffer.from(bijlage.content, "base64"));

  stap("Pdf-route voor de klant");
  const pdfAntw = await klant.request.get(`${link}/pdf`);
  const pdfBody = await pdfAntw.body();
  check(pdfAntw.status() === 200 && pdfAntw.headers()["content-type"] === "application/pdf" && pdfBody.subarray(0, 5).toString() === "%PDF-", `GET /offerte/<token>/pdf: ${pdfAntw.status()} ${pdfAntw.headers()["content-type"]}`);
  check(/noindex/.test(pdfAntw.headers()["x-robots-tag"] || ""), "pdf met noindex");
  const dl = await klant.request.get(`${link}/pdf?download=1`);
  check(/attachment; filename=.*Gouden Korst.*getekend/.test(dl.headers()["content-disposition"] || ""), `download met nette naam: ${dl.headers()["content-disposition"]}`);
  fs.writeFileSync(path.join(SHOTS, "getekend.pdf"), pdfBody);

  const conceptNa = await klant.request.get(`${link}/concept`);
  check(conceptNa.status() === 404, `na het tekenen geen concept meer: ${conceptNa.status()}`);

  stap("Nog eens tekenen kan niet; de link toont de getekende versie");
  await klant.goto(link);
  check(await klant.locator("text=Ondertekend").count(), "link toont getekende versie");

  stap("Beheer na ondertekening");
  await page.goto(offerteUrl);
  await page.waitForSelector("text=Ondertekening");
  check(await page.locator("text=Getekend door Marieke Jansen").count(), "tijdlijn: getekend");
  check(await page.locator("text=Bevestigingscode gemaild naar marieke@goudenkorst.test").count(), "tijdlijn: code gemaild");
  check(await page.locator("text=bevestigd met code").count(), "beheer: e-mail bevestigd met code");
  check(await page.locator("text=Inkoopnummer PO-2026-118").count(), "beheer: factuurgegevens met inkoopnummer");
  const adminPdf = await page.request.get(`${BASIS}/admin/offertevoorbeeld/${id}/pdf`);
  check(adminPdf.status() === 200 && (await adminPdf.body()).subarray(0, 5).toString() === "%PDF-", `pdf vanuit het beheer: ${adminPdf.status()}`);
  check((await page.locator("#of-bedrijf").count()) === 0, "editor weg na ondertekening");
  await shot(page, "13-beheer-getekend");
  await page.goto(`${BASIS}/admin/offertes`);
  await shot(page, "14-overzicht");

  stap("Tweede offerte: niet akkoord");
  await page.goto(`${BASIS}/admin/offertes/nieuw?start=basis`);
  await page.fill("#of-bedrijf", "Transport Van Dijk");
  await page.fill("#of-mw", "15");
  await page.fill("#of-email", "jan@vandijk.test");
  await page.click("button:has-text('Offerte aanmaken')");
  await page.waitForURL(/\/admin\/offertes\/[0-9a-f-]{36}$/);
  await page.click("text=Liever zelf versturen");
  await page.click("button:has-text('Zet de link open')");
  await page.waitForSelector("text=De link staat open");
  const link2 = await page.inputValue("input[aria-label^='Link naar de offerte']");
  await klant.goto(link2);
  await klant.click("text=Niet akkoord? Laat het ons weten");
  await klant.fill("dialog textarea", "We blijven voorlopig bij onze huidige arbodienst.");
  await klant.click("dialog button:has-text('Laat het weten')");
  await klant.waitForSelector("text=niet akkoord te gaan");
  check(true, "afwijzing verwerkt");
  await klant.waitForTimeout(2000);
  check(mails().some((m) => /^Niet akkoord/.test(m.subject)), "melding niet akkoord naar sales");
  await page.reload();
  check(await page.locator("text=We blijven voorlopig").count(), "reden zichtbaar in het beheer");

  stap("Pdf van een niet-getekende offerte bestaat niet");
  const r404 = await klant.request.get(`${link2}/pdf`);
  check(r404.status() === 404, `afgewezen offerte: pdf geeft ${r404.status()}`);

  stap("Onbekende link");
  await klant.goto(`${BASIS}/offerte/${"a".repeat(64)}`);
  check(await klant.locator("text=Deze link werkt niet").count(), "nette 404");
  const resp = await klant.goto(`${BASIS}/offerte/${"a".repeat(64)}`);
  check(resp.status() === 404, `status 404 (${resp.status()})`);
  check(/noindex/.test(resp.headers()["x-robots-tag"] || ""), "X-Robots-Tag noindex");
  check(resp.headers()["referrer-policy"] === "no-referrer", `Referrer-Policy ${resp.headers()["referrer-policy"]}`);

  stap("Mails renderen");
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 680, height: 900 });
  for (const naam of ["mail-offerte", "mail-bevestiging", "mail-getekend"]) {
    await mp.goto("file://" + path.join(SHOTS, `${naam}.html`));
    await mp.addStyleTag({ content: "body{padding:24px;background:#f6f2ec} body>div{background:#fff;padding:28px;border-radius:14px}" });
    await shot(mp, naam);
  }

  console.log(`\nPaginafouten: ${consoleFouten.length ? consoleFouten.join("\n") : "geen"}`);
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  process.exit(2);
});
