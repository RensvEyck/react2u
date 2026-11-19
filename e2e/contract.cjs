// Basiscontract (0031) van begin tot eind: aanmaken in het beheer (ook vanuit een offerte), versturen, de klant
// leest het, vult zijn organisatie in, krijgt een code, tekent en ontvangt de pdf; daarna staat het vast.
// Sinds 0042 ook de Checklist arbeidsomstandigheden: als pdf bij de contractmail, de klant vult hem online in
// (en werkt hem bij), de kopie en het seintje, de pdf's, de band op de contractpagina en de antwoorden in het beheer.
// Draaien via e2e/run.mjs (E2E_ALLEEN=contract).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "contract");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? ok(s) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const contractLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/contract\/[a-f0-9]{48,})"/)?.[1];

/** Wacht tot een element stilstaat (vloeiend scrollen) en geeft zijn plek. */
async function stil(page, sel) {
  let doos = await page.locator(sel).boundingBox();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(150);
    const nu = await page.locator(sel).boundingBox();
    if (nu && doos && Math.abs(nu.y - doos.y) < 0.5) return nu;
    doos = nu;
  }
  return doos;
}

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
  ok("ingelogd");

  stap("Overzicht (leeg) en het menu");
  await page.goto(`${BASIS}/admin/contracten`);
  await page.waitForSelector("h1:has-text('Contracten')");
  check(await page.locator("text=Nog geen contracten").count(), "lege staat");
  check(await page.locator('aside nav a[href="/admin/documenten"][aria-current="page"]').count(), "Contracten valt onder Documenten in het menu");
  await shot(page, "01-overzicht-leeg");

  stap("Vanuit een offerte: alles staat klaar");
  const offerte = sql(`insert into public.offertes (bedrijf, contactpersoon, email, status, verstuurd_at, factuur, afzender_naam, afzender_email)
    values ('Fietsenmaker Peters', 'Piet Peters', 'piet@peters.test', 'verstuurd', now(), '{"adres":"Kerkstraat 4","postcode":"5611 AB","plaats":"Eindhoven","kvk":"87654321","email":"piet@peters.test"}', 'Rens van Eyck', 'sales@react2u.nl')
    returning id || ' ' || nummer`).split("\n")[0].split(" ");
  await page.goto(`${BASIS}/admin/offertes/${offerte[0]}`);
  check(await page.locator("a:has-text('Basiscontract')").count(), "knop Basiscontract bij de offerte");
  await page.click("a:has-text('Basiscontract')");
  await page.waitForSelector("h1:has-text('Nieuw basiscontract')");
  check((await page.inputValue("#ct-bedrijf")) === "Fietsenmaker Peters", "bedrijf uit de offerte");
  check((await page.inputValue("#ct-kenmerk")).startsWith(`Offerte ${offerte[1]}`), `kenmerk van de offerte: ${await page.inputValue("#ct-kenmerk")}`);
  check((await page.inputValue("#ct-okvk")) === "87654321" && (await page.inputValue("#ct-oadres")) === "Kerkstraat 4", "KvK en adres uit de factuurgegevens");
  check((await page.inputValue("#ct-offerte")) === offerte[0], "offerte gekoppeld");
  await shot(page, "02-nieuw-vanuit-offerte");

  stap("Nieuw contract");
  await page.goto(`${BASIS}/admin/contracten/nieuw`);
  const ingang = await page.inputValue("#ct-ingang");
  const einde = await page.inputValue("#ct-einde");
  check(/^\d{4}-\d{2}-01$/.test(ingang), `begint de eerste van de maand (${ingang})`);
  check(await page.locator("text=1 jaar").count(), `looptijd 1 jaar (${ingang} tot ${einde})`);
  await page.fill("#ct-bedrijf", "Bakkerij De Gouden Korst");
  await page.fill("#ct-cp", "Marieke Jansen");
  await page.fill("#ct-email", "marieke@goudenkorst.test");
  await page.fill("#ct-onaam", "Bakkerij De Gouden Korst B.V.");
  await page.fill("#ct-oadres", "Korenstraat 8");
  await page.fill("#ct-opostcode", "5611 KL");
  await page.fill("#ct-oplaats", "Eindhoven");
  await page.fill("#ct-aanvullend", "Het eerste jaar is het open spreekuur gratis.");
  // Twee jaar: de einddatum loopt mee.
  await page.click("button:has-text('2 jaar')");
  check(await page.locator("text=2 jaar").count() >= 2, "looptijd 2 jaar gekozen");
  await page.click("button:has-text('1 jaar')");
  await page.click("button.abtn:has-text('Contract aanmaken')");
  await page.waitForURL(/\/admin\/contracten\/[0-9a-f-]{36}/, { timeout: 20000 });
  const contractUrl = page.url().split("?")[0];
  const id = contractUrl.split("/").pop();
  check(await page.locator("h1:has-text('Bakkerij De Gouden Korst')").count(), "contract aangemaakt");
  check(await page.locator("text=Standaardtekst, versie").count(), "standaardtekst herkend");
  check(await page.locator("#checklist >> text=Nog open").count(), "kaart Checklist arbeidsomstandigheden, nog open");
  await shot(page, "03-beheer-concept");

  stap("Voorbeeld en concept-pdf vanuit het beheer");
  const vb = await ctx.newPage();
  await vb.goto(`${BASIS}/admin/contractvoorbeeld/${id}`);
  await vb.waitForSelector("h1");
  check(await vb.locator("text=Voorbeeld: zo ziet de klant het contract").count(), "voorbeeldmelding");
  check(await vb.locator("#checklist >> text=Nog niet ingevuld").count(), "voorbeeld: de band van de checklist");
  await shot(vb, "04-voorbeeld");
  await vb.goto(`${BASIS}/admin/contractvoorbeeld/${id}/checklist`);
  await vb.waitForSelector("#checklist-formulier");
  check(await vb.locator("#checklist-formulier button[type=submit][disabled]").count(), "in het voorbeeld kan de checklist niet worden opgeslagen");
  check((await vb.locator("#checklist-formulier li[id^=onderdeel-]").count()) === 8, "voorbeeld: acht onderdelen");
  await shot(vb, "04b-voorbeeld-checklist");
  await vb.close();
  const clpdf = await page.request.get(`${BASIS}/admin/contractvoorbeeld/${id}/checklist/pdf?download=1`);
  check(clpdf.status() === 200 && (await clpdf.body()).subarray(0, 5).toString() === "%PDF-" && /\(leeg\)/.test(clpdf.headers()["content-disposition"] || ""), `lege checklist-pdf uit het beheer: ${clpdf.status()}`);
  const cpdf = await page.request.get(`${BASIS}/admin/contractvoorbeeld/${id}/concept?download=1`);
  const cbody = await cpdf.body();
  check(cpdf.status() === 200 && cbody.subarray(0, 5).toString() === "%PDF-", `concept-pdf uit het beheer: ${cpdf.status()}`);
  fs.writeFileSync(path.join(SHOTS, "concept-beheer.pdf"), cbody);

  stap("Versturen");
  await page.fill("#vs-aan", "marieke@goudenkorst.test");
  await page.click("button:has-text('Verstuur contract')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const verstuurMail = mails().find((m) => /^Basiscontract C\d{4}-\d{4} voor Bakkerij De Gouden Korst/.test(m.subject));
  check(Boolean(verstuurMail) && verstuurMail.to.includes("marieke@goudenkorst.test"), `mail naar de klant: ${verstuurMail?.subject}`);
  check(verstuurMail?.reply_to === "sales@react2u.nl", `antwoorden naar de salesbox (${verstuurMail?.reply_to})`);
  fs.writeFileSync(path.join(SHOTS, "mail-contract.html"), verstuurMail?.html || "");
  const link = contractLink(verstuurMail?.html);
  check(Boolean(link), `link in de mail: ${link}`);
  const bijlageMail = verstuurMail?.attachments?.[0];
  check(Boolean(bijlageMail) && /^Checklist arbeidsomstandigheden C\d{4}-\d{4} .*\(leeg\)\.pdf$/.test(bijlageMail.filename), `lege checklist als pdf bij de contractmail: ${bijlageMail?.filename}`);
  check(/Bij dit contract/.test(verstuurMail?.html || "") && /Checklist arbeidsomstandigheden/.test(verstuurMail?.html || ""), "de contractmail noemt de checklist");

  stap("De klant opent het contract");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => consoleFouten.push(String(e)));
  const r = await klant.goto(link);
  check(r.status() === 200, `pagina 200 (${r.status()})`);
  check(/noindex/.test(r.headers()["x-robots-tag"] || "") && r.headers()["referrer-policy"] === "no-referrer", "noindex en no-referrer");
  await klant.waitForSelector("h1:has-text('Basiscontract')");
  check(await klant.locator("text=In het kort").count(), "In het kort");
  const artikelen = await klant.locator("section[id^=artikel-]").count();
  check(artikelen === 9, `acht artikelen plus de aanvullende afspraken (${artikelen})`);
  check(await klant.locator("#artikel-9 >> text=Het eerste jaar is het open spreekuur gratis.").count(), "aanvullende afspraak als artikel 9");
  const art1 = await klant.locator("#artikel-1").innerText();
  check(/De Overeenkomst start op \d{1,2} \w+ \d{4} en heeft als einddatum \d{1,2} \w+ \d{4}\./.test(art1), "looptijd ingevuld in artikel 1.1");
  const partijen = await klant.locator("#partijen").innerText();
  check(partijen.includes("KvK-nummer 95076824") && partijen.includes("de heer R. van Eyck in de hoedanigheid van bestuurder"), "React2u in de kop, uit Instellingen");
  check(partijen.includes("Bakkerij De Gouden Korst B.V., gevestigd en kantoorhoudende te Eindhoven aan de Korenstraat 8, 5611 KL Eindhoven"), "klant in de kop, vooraf ingevuld");
  const d = await klant.locator("#overwegingen").innerText();
  check(d.includes("met kenmerk: Bakkerij De Gouden Korst B.V."), "zonder offerte: naam van de klant als kenmerk");
  await shot(klant, "05-klant-boven", { fullPage: false });
  await shot(klant, "06-klant-heel");
  await klant.locator("#contract").scrollIntoViewIfNeeded();
  await klant.locator("#artikel-3").scrollIntoViewIfNeeded();
  await klant.waitForTimeout(400);
  await shot(klant, "06b-klant-artikelen", { fullPage: false });
  check(await klant.locator('nav[aria-label="Inhoud van het contract"] a[aria-current="true"]').count(), "inhoudsopgave loopt mee");
  check((await klant.locator("#checklist").innerText()).includes("Nog niet ingevuld") && (await klant.locator("#checklist ol li").count()) === 8, "band Checklist arbeidsomstandigheden met de acht onderdelen, nog niet ingevuld");
  check(await klant.locator('header nav a[href="#checklist"]').count(), "Checklist in de kopbalk");
  const bekeken = mails().find((m) => /bekijkt het basiscontract/.test(m.subject));
  check(Boolean(bekeken), "seintje aan de afzender bij eerste keer openen");

  stap("Concept-pdf voor de klant");
  const kc = await klant.request.get(`${link}/concept`);
  const kcBody = await kc.body();
  check(kc.status() === 200 && kcBody.subarray(0, 5).toString() === "%PDF-" && kcBody.toString("latin1").includes("arbodienstverlening, concept"), `concept-pdf: ${kc.status()}`);
  fs.writeFileSync(path.join(SHOTS, "concept.pdf"), kcBody);

  stap("De checklist arbeidsomstandigheden");
  const leegPdf = await klant.request.get(`${link}/checklist/pdf`);
  check(leegPdf.status() === 200 && (await leegPdf.body()).subarray(0, 5).toString() === "%PDF-" && /\(leeg\)/.test(leegPdf.headers()["content-disposition"] || ""), `lege checklist-pdf voor de klant: ${leegPdf.status()}`);
  await klant.locator("#checklist").scrollIntoViewIfNeeded();
  await klant.waitForTimeout(400);
  await shot(klant, "06c-klant-checklist-band", { fullPage: false });
  await klant.click("#checklist a:has-text('Vul de checklist in')");
  await klant.waitForURL(/\/checklist$/, { timeout: 20000 });
  await klant.waitForSelector("#checklist-formulier");
  check((await klant.inputValue("#cl-naam")) === "Marieke Jansen" && (await klant.inputValue("#cl-bedrijf")) === "Bakkerij De Gouden Korst B.V.", "naam en statutaire naam vooringevuld");
  check((await klant.inputValue("#cl-plaats")) === "Eindhoven", "plaats: de vestigingsplaats");
  check(/^\d{4}-\d{2}-\d{2}$/.test(await klant.inputValue("#cl-datum")), "datum van vandaag vooringevuld");
  check((await klant.locator("#checklist-formulier li[id^=onderdeel-]").count()) === 8, "acht onderdelen");
  check(await klant.locator("text=Iedere organisatie moet 1 preventiemedewerker aanstellen").count(), "toelichting bij de preventiemedewerker, zoals in het Word-bestand");
  check(await klant.locator("text=Checklist arbeidsomstandigheden wet").count(), "de titel van het Word-bestand");
  await shot(klant, "06d-checklist-boven", { fullPage: false });
  await shot(klant, "06e-checklist-heel");
  // Leeg opslaan wordt geweigerd, en zonder naam ook.
  await klant.fill("#cl-naam", "");
  await klant.click("#checklist-formulier button[type=submit]");
  await klant.waitForSelector("#checklist-formulier [role=alert]", { timeout: 15000 });
  check((await klant.locator("#checklist-formulier [role=alert]").innerText()).includes("minstens één onderdeel"), "lege checklist geweigerd");
  check(sql(`select count(*) from public.contract_checklists where contract_id = '${id}'`) === "0", "niets opgeslagen bij een fout");
  await klant.fill("#cl-naam", "Marieke Jansen");
  await klant.fill("#cl-functie", "directeur");
  await klant.fill("#cl-casemanager-actie", "Piet de Vries (HR) is de interne casemanager.");
  await klant.fill("#cl-rie-actie", "RI&E is van 2024; toetsing door de kerndeskundige van React2u inplannen.");
  await klant.fill("#cl-rie-datum", "2027-03-01");
  await klant.fill("#cl-preventiemedewerker-actie", "Marieke Jansen zelf (minder dan 25 werknemers).");
  check(await klant.locator("#checklist-formulier >> text=3 van 8 beantwoord").count(), "de teller loopt mee: 3 van 8");
  await klant.locator("#opslaan").scrollIntoViewIfNeeded();
  await klant.waitForTimeout(300);
  await shot(klant, "06f-checklist-ingevuld", { fullPage: false });
  const voorChecklist = mails().length;
  await klant.click("#checklist-formulier button[type=submit]");
  await klant.waitForSelector("#checklist-formulier [role=status]", { timeout: 20000 });
  check((await klant.locator("#checklist-formulier [role=status]").innerText()).includes("Opgeslagen"), "opgeslagen");
  check(sql(`select (data->>'casemanager_actie') || '|' || door || '|' || versie from public.contract_checklists where contract_id = '${id}'`) === "Piet de Vries (HR) is de interne casemanager.|Marieke Jansen|1", "antwoorden in de database, op naam, versie 1");
  check(sql(`select count(*) from public.contract_gebeurtenissen where contract_id = '${id}' and soort = 'checklist'`) === "1", "gebeurtenis checklist in de tijdlijn");
  check(sql(`select count(*) from public.klant_gesprekken where tekst like 'Checklist arbeidsomstandigheden ingevuld%'`) === "1", "regel op het klantenbord");
  await klant.waitForTimeout(3000);
  const naChecklist = mails().slice(voorChecklist);
  const kopie = naChecklist.find((m) => /^Opgeslagen: checklist arbeidsomstandigheden/.test(m.subject));
  const seintje = naChecklist.find((m) => /vulde de checklist arbeidsomstandigheden in/.test(m.subject));
  check(Boolean(kopie) && kopie.to.includes("marieke@goudenkorst.test") && /\(ingevuld\)\.pdf$/.test(kopie.attachments?.[0]?.filename || ""), `kopie met de ingevulde pdf aan de klant: ${kopie?.subject}`);
  check(Boolean(seintje) && seintje.to.includes("sales@test.local") && seintje.to.includes("sales@react2u.nl") && /3 van 8/.test(seintje.html || ""), `seintje aan sales: ${seintje?.subject}`);
  fs.writeFileSync(path.join(SHOTS, "mail-checklist.html"), kopie?.html || "");
  if (kopie?.attachments?.[0]) fs.writeFileSync(path.join(SHOTS, "checklist-uit-mail.pdf"), Buffer.from(kopie.attachments[0].content, "base64"));
  const volPdf = await klant.request.get(`${link}/checklist/pdf`);
  const volBody = await volPdf.body();
  check(volPdf.status() === 200 && /\(ingevuld\)/.test(volPdf.headers()["content-disposition"] || "") && volBody.toString("latin1").includes("basiscontract, ingevuld"), "ingevulde checklist-pdf voor de klant");
  fs.writeFileSync(path.join(SHOTS, "checklist-ingevuld.pdf"), volBody);
  // Bijwerken: een onderdeel erbij, versie 2.
  await klant.reload();
  await klant.waitForSelector("#checklist-formulier button:has-text('Wijzigingen opslaan')", { timeout: 20000 });
  check((await klant.inputValue("#cl-casemanager-actie")) === "Piet de Vries (HR) is de interne casemanager.", "na herladen staan de antwoorden er");
  await klant.fill("#cl-klachtenregeling-actie", "Klachtenregeling staat op react2u.nl; medewerkers horen het via het verzuimprotocol.");
  await klant.click("#checklist-formulier button[type=submit]");
  await klant.waitForSelector("#checklist-formulier [role=status]", { timeout: 20000 });
  check(sql(`select versie from public.contract_checklists where contract_id = '${id}'`) === "2", "bijgewerkt: versie 2");
  await klant.waitForTimeout(2500);
  check(mails().some((m) => /^Bijgewerkt: checklist arbeidsomstandigheden/.test(m.subject)), "kopie bij het bijwerken");
  await klant.goto(link);
  await klant.waitForSelector("#checklist");
  check((await klant.locator("#checklist").innerText()).includes("4 van 8 beantwoord") && (await klant.locator("#checklist a:has-text('Bekijk of vul aan')").count()) === 1, "de band op het contract toont 4 van 8 beantwoord");

  stap("Telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  const breed = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breed <= 390, `geen horizontale scroll op 390 px (${breed})`);
  await shot(tp, "07-telefoon-boven", { fullPage: false });
  await shot(tp, "08-telefoon-heel");
  await tp.click("div.fixed button:has-text('Ondertekenen')");
  const naarTekenen = await stil(tp, "#ondertekenen");
  check(naarTekenen.y < 200, `knop onderaan brengt je naar ondertekenen (${Math.round(naarTekenen.y)})`);
  await shot(tp, "09-telefoon-tekenen", { fullPage: false });
  await tp.goto(`${link}/checklist`);
  await tp.waitForSelector("#checklist-formulier");
  const breedCl = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breedCl <= 390, `checklist: geen horizontale scroll op 390 px (${breedCl})`);
  check(await tp.locator("div.fixed button:has-text('Opslaan')").count(), "telefoon: knop Opslaan onderaan");
  await shot(tp, "09b-telefoon-checklist", { fullPage: false });
  await shot(tp, "09c-telefoon-checklist-heel");
  await tel.close();

  stap("Ondertekenen");
  await klant.click("header button:has-text('Ondertekenen')");
  await stil(klant, "#ondertekenen");
  check((await klant.inputValue("#ct-naam")) === "Marieke Jansen", "naam vooringevuld");
  check((await klant.inputValue("#ct-onaam")) === "Bakkerij De Gouden Korst B.V.", "statutaire naam vooringevuld");
  check(await klant.locator('#ondertekenen img[alt="Handtekening van Rens van Eyck"]').count(), "handtekening van de bestuurder in het vak Opdrachtnemer");
  check(await klant.locator("text=Al ingevuld door Rens").count(), "uitleg: al ingevuld door de afzender");
  await klant.click("#ondertekenen button[type=submit]");
  check((await klant.locator("#ondertekenen [role=alert]").innerText()).includes("handtekening"), "zonder handtekening een melding");
  await klant.locator("#ondertekenen canvas").scrollIntoViewIfNeeded();
  const doek = await stil(klant, "#ondertekenen canvas");
  // Het lila tekenblok mag nooit opzij schuiven (overflow-clip, zie ContractPagina).
  check((await klant.evaluate(() => document.querySelector("#ondertekenen > div").scrollLeft)) === 0, "tekenblok staat recht");
  await klant.mouse.move(doek.x + 40, doek.y + doek.height * 0.6);
  await klant.mouse.down();
  for (let i = 0; i <= 40; i++) {
    await klant.mouse.move(doek.x + 40 + i * ((doek.width - 80) / 40), doek.y + doek.height * 0.6 - Math.sin(i / 3) * 28 - (i % 7) * 2, { steps: 2 });
  }
  await klant.mouse.up();
  await klant.click("#ondertekenen button[type=submit]");
  check((await klant.locator("#ondertekenen [role=alert]").innerText()).includes("functie"), "functie is verplicht");
  await klant.fill("#ct-functie", "directeur");
  await klant.fill("#ct-kvk", "1234");
  await klant.check("#ondertekenen input[type=checkbox]");
  await klant.click("#ondertekenen button[type=submit]");
  check((await klant.locator("#ondertekenen [role=alert]").innerText()).includes("8 cijfers"), "KvK-nummer met te weinig cijfers geweigerd");
  await klant.fill("#ct-kvk", "12345678");
  const zin = await klant.locator("text=Zo staat het in het contract").locator("..").innerText();
  check(zin.includes("KvK-nummer 12345678") && zin.includes("vertegenwoordigd door Marieke Jansen, directeur"), "live: zo staat het in het contract");
  check((await klant.locator("#partijen").innerText()).includes("KvK-nummer 12345678"), "de kop van het contract vult mee");
  check((await klant.inputValue("#ct-tekenplaats")) === "Eindhoven", "getekend te: de vestigingsplaats");
  await klant.locator("#ondertekenen").scrollIntoViewIfNeeded();
  await shot(klant, "10-tekenen", { fullPage: false });
  await klant.locator("#ondertekenen").screenshot({ path: path.join(SHOTS, "10b-tekenen-heel.png") });
  const voorCode = mails().length;
  await klant.click("#ondertekenen button[type=submit]");
  await klant.waitForSelector("text=Nog één stap", { timeout: 20000 });
  check(await klant.locator("#ct-naam").isDisabled(), "gegevens vast tijdens de codestap");
  const codeMail = mails().slice(voorCode).find((m) => /is je code voor contract/.test(m.subject));
  check(Boolean(codeMail) && codeMail.to.includes("marieke@goudenkorst.test"), `codemail: ${codeMail?.subject}`);
  fs.writeFileSync(path.join(SHOTS, "mail-code.html"), codeMail?.html || "");
  const code = codeMail?.subject.match(/^(\d{6})/)?.[1] || "";
  await klant.locator("#ct-code").scrollIntoViewIfNeeded();
  await shot(klant, "11-code", { fullPage: false });
  await klant.fill("#ct-code", code === "000000" ? "111111" : "000000");
  await klant.waitForSelector("#ondertekenen [role=alert]", { timeout: 15000 });
  check((await klant.locator("#ondertekenen [role=alert]").innerText()).includes("klopt niet"), "verkeerde code geweigerd");
  await klant.fill("#ct-code", code);
  await klant.waitForSelector("text=Kenmerk van de ondertekende versie", { timeout: 30000 });
  check(await klant.locator("text=Het contract is rond").count(), "felicitatie na het tekenen");
  check(await klant.locator("text=E-mailadres bevestigd met een code").count(), "bevestigd-label");
  check(await klant.locator("text=Ondergetekende: Marieke Jansen, directeur").count(), "handtekening van de klant met naam en functie");
  check(await klant.locator("text=Te Eindhoven").count() >= 2, "plaats bij beide handtekeningen");
  await klant.waitForTimeout(1200);
  await shot(klant, "12-getekend", { fullPage: false });
  await shot(klant, "12b-getekend-heel");

  stap("Mails na ondertekening");
  await klant.waitForTimeout(3000);
  const alle = mails();
  const bevestiging = alle.find((m) => m.to?.includes("marieke@goudenkorst.test") && /^Ondertekend: basiscontract/.test(m.subject));
  const melding = alle.find((m) => /^Getekend: basiscontract/.test(m.subject));
  check(Boolean(bevestiging?.attachments?.[0]), `bevestiging met pdf: ${bevestiging?.subject}`);
  check(bevestiging?.attachments?.length === 2 && /^Checklist arbeidsomstandigheden .*\(ingevuld\)\.pdf$/.test(bevestiging.attachments[1].filename), `de ingevulde checklist als tweede bijlage (${(bevestiging?.attachments || []).map((a) => a.filename).join(", ")})`);
  check(/ingevulde Checklist arbeidsomstandigheden zit er ook bij/.test(bevestiging?.html || ""), "de bevestiging noemt de checklist");
  check(Boolean(melding) && melding.to.includes("sales@test.local") && melding.to.includes("sales@react2u.nl"), `melding naar sales: ${melding?.to}`);
  check(/KvK 12345678/.test(melding?.html || "") && /directeur/.test(melding?.html || ""), "melding aan sales met de organisatie en functie");
  fs.writeFileSync(path.join(SHOTS, "mail-bevestiging.html"), bevestiging?.html || "");
  fs.writeFileSync(path.join(SHOTS, "mail-getekend.html"), melding?.html || "");
  const bijlage = bevestiging?.attachments?.[0];
  if (bijlage) fs.writeFileSync(path.join(SHOTS, "getekend-uit-mail.pdf"), Buffer.from(bijlage.content, "base64"));

  stap("Pdf en concept na het tekenen");
  const dl = await klant.request.get(`${link}/pdf?download=1`);
  const pdfBody = await dl.body();
  check(dl.status() === 200 && pdfBody.subarray(0, 5).toString() === "%PDF-", `getekende pdf: ${dl.status()}`);
  check(/attachment; filename=.*Basiscontract.*Gouden Korst.*getekend/.test(dl.headers()["content-disposition"] || ""), `download met nette naam: ${dl.headers()["content-disposition"]}`);
  check(pdfBody.toString("latin1").includes("ondertekeningscertificaat"), "pdf met ondertekeningscertificaat");
  fs.writeFileSync(path.join(SHOTS, "getekend.pdf"), pdfBody);
  const na = await klant.request.get(`${link}/concept`);
  check(na.status() === 404, `na het tekenen geen concept meer: ${na.status()}`);

  stap("Getekend is getekend");
  let geweigerd = "";
  try {
    sql(`update public.contracten set tekst = tekst || ' ' where id = '${id}'`);
  } catch (e) {
    geweigerd = String(e.stderr || e.message);
  }
  check(/kan niet meer worden gewijzigd/.test(geweigerd), "de database weigert een wijziging aan een getekend contract");

  stap("Beheer na ondertekening");
  await page.goto(contractUrl);
  await page.waitForSelector("text=Ondertekening");
  check(await page.locator("text=Getekend door Marieke Jansen").count(), "tijdlijn: getekend");
  check(await page.locator("text=bevestigd met code").count(), "beheer: e-mail bevestigd met code");
  check(await page.locator("text=Opzeggen kan uiterlijk").count(), "beheer: tot wanneer opzeggen kan");
  check((await page.locator("#ct-bedrijf").count()) === 0, "formulier weg na ondertekening");
  check(await page.locator("#checklist >> text=Piet de Vries (HR) is de interne casemanager.").count(), "beheer: de antwoorden van de checklist");
  check(await page.locator("#checklist >> text=4/8 beantwoord").count(), "beheer: 4 van 8 beantwoord");
  check(await page.locator("#checklist >> text=Geen actiepunten ingevuld").count() === 4, "beheer: de open onderdelen staan erbij");
  check(await page.locator("text=Checklist arbeidsomstandigheden ingevuld door Marieke Jansen").count(), "tijdlijn: checklist ingevuld");
  check(await page.locator("text=Checklist arbeidsomstandigheden bijgewerkt door Marieke Jansen").count(), "tijdlijn: checklist bijgewerkt");
  await shot(page, "13-beheer-getekend");
  const aclpdf = await page.request.get(`${BASIS}/admin/contractvoorbeeld/${id}/checklist/pdf`);
  check(aclpdf.status() === 200 && /\(ingevuld\)/.test(aclpdf.headers()["content-disposition"] || ""), `ingevulde checklist-pdf uit het beheer: ${aclpdf.status()}`);
  await page.goto(`${BASIS}/admin/contracten`);
  check(await page.locator("text=Opzeggen uiterlijk").count(), "overzicht: opzegdatum in het register");
  check(await page.locator("table >> text=Checklist").count(), "register: checklist ingevuld");
  await shot(page, "14-overzicht");
  const apdf = await page.request.get(`${BASIS}/admin/contractvoorbeeld/${id}/pdf`);
  check(apdf.status() === 200, `pdf uit het beheer: ${apdf.status()}`);

  stap("Collega opent de link");
  await page.goto(link);
  check(await page.locator("text=Je bekijkt dit contract als collega").count(), "collega-melding");
  await page.goto(`${link}/checklist`);
  await page.waitForSelector("#checklist-formulier");
  check(await page.locator("#checklist-formulier button[type=submit][disabled]").count() && (await page.locator("text=invullen doet de klant via zijn link").count()), "collega kan de checklist bekijken, niet opslaan");

  stap("Onbekende link");
  const onbekend = await klant.goto(`${BASIS}/contract/${"a".repeat(64)}`);
  check(onbekend.status() === 404 && (await klant.locator("text=Deze link werkt niet").count()), `nette 404 (${onbekend.status()})`);

  stap("Mails renderen");
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 680, height: 900 });
  for (const naam of ["mail-contract", "mail-code", "mail-bevestiging", "mail-checklist"]) {
    await mp.goto("file://" + path.join(SHOTS, `${naam}.html`));
    await mp.waitForTimeout(400);
    await shot(mp, naam);
  }

  console.log(`\nPaginafouten: ${consoleFouten.length ? consoleFouten.join("\n") : "geen"}`);
  check(!consoleFouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  process.exit(2);
});
