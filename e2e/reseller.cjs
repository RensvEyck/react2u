// Resellerovereenkomst (0033) van begin tot eind: opstellen vanuit een partner (met zijn eigen percentages),
// versturen, de partner leest de overeenkomst, vult zijn kantoor in (met mail en telefoon), krijgt een code,
// tekent en ontvangt de pdf; daarna staat hij vast, gaat hij in op de dag van ondertekening en staat hij bij de
// partner. Draaien via e2e/run.mjs (E2E_ALLEEN=reseller).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "reseller");
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
  // Een code werkt één keer per tijdvak: wacht op de volgende als een vorige test net inlogde.
  await page.waitForTimeout(Math.max(0, 30_000 - (Date.now() % 30_000)) + 500);
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });
  ok("ingelogd");

  stap("Vanuit de partner: kantoor en percentages staan klaar");
  // Spine Services heeft live 50% en 50% afgesproken, niet de 50% en 25% van het Word-bestand.
  const partnerId = sql(`insert into public.partners (code, kantoor, naam, email, telefoon, pct_jaar_een, pct_vervolg)
    values ('SPINETEST', 'Spine Services', 'Sanne de Vries', 'sanne@spine.test', '040 123 45 67', 50, 50) returning id`).split("\n")[0].trim();
  await page.goto(`${BASIS}/admin/partners/${partnerId}`);
  await page.waitForSelector("h2:has-text('Resellerovereenkomst')");
  check(await page.locator("text=Met 50% en 50% in artikel 3.1").count(), "partnerpagina noemt de percentages");
  await shot(page, "01-partner-zonder");
  await page.click("a:has-text('Resellerovereenkomst opstellen')");
  await page.waitForSelector("h1:has-text('Nieuwe resellerovereenkomst')");
  check((await page.inputValue("#ct-bedrijf")) === "Spine Services", "kantoor uit de partner");
  check((await page.inputValue("#ct-cp")) === "Sanne de Vries" && (await page.inputValue("#ct-email")) === "sanne@spine.test", "contactpersoon en mail uit de partner");
  check((await page.inputValue("#ct-partner")) === partnerId, "partner gekoppeld");
  check((await page.inputValue("#ct-pct1")) === "50" && (await page.inputValue("#ct-pct2")) === "50", "vergoeding 50% en 50% van de partner");
  check(await page.locator("text=Standaardtekst, versie").count(), "andere percentages tellen niet als aangepaste tekst");
  check((await page.locator("#ct-ingang").count()) === 0 && (await page.locator("#ct-offerte").count()) === 0, "geen looptijd en geen offerte");
  check((await page.inputValue("#ct-otel")) === "040 123 45 67" && (await page.inputValue("#ct-oemail")) === "sanne@spine.test", "mail en telefoon van het kantoor vooraf");
  // Een percentage wijzigen past de tekst aan; terugzetten maakt hem weer gelijk aan de partner.
  await page.fill("#ct-pct2", "40");
  check((await page.inputValue("#ct-tekst")).includes("ieder volgend Contractjaar: 40% van het Aansluittarief."), "percentage wijzigt artikel 3.1");
  check(await page.locator("text=Bij Spine Services staat 50% en 50% afgesproken").count(), "waarschuwing: wijkt af van de partner");
  await page.fill("#ct-pct2", "50");
  await page.fill("#ct-onaam", "Spine Services B.V.");
  await shot(page, "02-nieuw-vanuit-partner");
  await page.click("button.abtn:has-text('Overeenkomst aanmaken')");
  await page.waitForURL(/\/admin\/contracten\/[0-9a-f-]{36}/, { timeout: 20000 });
  const beheerUrl = page.url().split("?")[0];
  const id = beheerUrl.split("/").pop();
  check(await page.locator("h1:has-text('Spine Services')").count() && (await page.locator(".apill:has-text('Resellerovereenkomst')").count()), "overeenkomst aangemaakt, met label");
  check(await page.locator(`a[href="/admin/partners/${partnerId}"]`).count(), "knop terug naar de partner");
  const rij = sql(`select soort || '|' || coalesce(partner_id::text, '') || '|' || coalesce(ingangsdatum::text, 'leeg') || '|' || coalesce(einddatum::text, 'leeg') || '|' || coalesce(tekst_versie, '') from public.contracten where id = '${id}'`).trim();
  check(rij === `reseller|${partnerId}|leeg|leeg|november 2026`, `in de database: ${rij}`);
  await shot(page, "03-beheer-concept");

  stap("Voorbeeld en concept-pdf");
  const vb = await ctx.newPage();
  await vb.goto(`${BASIS}/admin/contractvoorbeeld/${id}`);
  await vb.waitForSelector("h1");
  check(await vb.locator("text=Voorbeeld: zo ziet de reseller het contract").count(), "voorbeeldmelding");
  await vb.close();
  const cpdf = await page.request.get(`${BASIS}/admin/contractvoorbeeld/${id}/concept?download=1`);
  const cbody = await cpdf.body();
  check(cpdf.status() === 200 && cbody.toString("latin1").includes("resellerovereenkomst, partner, arbodienstverlening, concept"), `concept-pdf: ${cpdf.status()}`);
  check(/Resellerovereenkomst C\d{4}-\d{4} Spine Services \(concept\)\.pdf/.test(cpdf.headers()["content-disposition"] || ""), `bestandsnaam: ${cpdf.headers()["content-disposition"]}`);
  fs.writeFileSync(path.join(SHOTS, "concept-beheer.pdf"), cbody);

  stap("Versturen");
  check((await page.inputValue("#vs-aan")) === "sanne@spine.test", "aan: de mail van de partner");
  check((await page.inputValue("#vs-bericht")).includes("hierbij de resellerovereenkomst voor Spine Services"), "bericht noemt de resellerovereenkomst");
  await page.click("button:has-text('Verstuur overeenkomst')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const verstuurMail = mails().find((m) => /^Resellerovereenkomst C\d{4}-\d{4} voor Spine Services/.test(m.subject));
  check(Boolean(verstuurMail) && verstuurMail.to.includes("sanne@spine.test"), `mail naar de partner: ${verstuurMail?.subject}`);
  check(/Bekijk en onderteken de overeenkomst/.test(verstuurMail?.html || "") && !/Arbowet/.test(verstuurMail?.html || ""), "mail in de woorden van de overeenkomst");
  fs.writeFileSync(path.join(SHOTS, "mail-overeenkomst.html"), verstuurMail?.html || "");
  const link = contractLink(verstuurMail?.html);
  check(Boolean(link), `link in de mail: ${link}`);

  stap("De partner opent de overeenkomst");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => consoleFouten.push(String(e)));
  const r = await klant.goto(link);
  check(r.status() === 200, `pagina 200 (${r.status()})`);
  await klant.waitForSelector("h1:has-text('Reseller')");
  check(await klant.locator("h1:has-text('Overeenkomst arbodienstverlening.')").count(), "woordmerk: Reseller, overeenkomst arbodienstverlening");
  check(await klant.locator("text=Per aangebrachte klant 50% van het aansluittarief in het eerste contractjaar en 50% in elk jaar daarna").count(), "in het kort: de vergoeding van de partner");
  check(await klant.locator("text=Onbepaalde tijd").count(), "kerngegevens: onbepaalde tijd");
  const artikelen = await klant.locator("section[id^=artikel-]").count();
  check(artikelen === 11, `elf artikelen (${artikelen})`);
  const partijen = await klant.locator("#partijen").innerText();
  check(partijen.includes("React2u II B.V., handelend onder de naam React2u, gevestigd aan de Stratumsedijk 29, 5611 NB Eindhoven"), "React2u in de kop zoals het Word-bestand");
  check(partijen.includes("e-mail sales@react2u.nl, telefoon 085 620 58 00, hierna: React2u;"), "met de mail en het telefoonnummer van sales");
  check(partijen.includes("Spine Services B.V., gevestigd aan") && partijen.includes("e-mail sanne@spine.test, telefoon 040 123 45 67, hierna: Reseller;"), "de reseller in de kop, vooraf ingevuld");
  check(partijen.includes("hierna gezamenlijk: Partijen, en ieder afzonderlijk: Partij."), "hierna gezamenlijk: Partijen");
  check(await klant.locator("text=Partijen komen het volgende overeen:").count(), "Partijen komen het volgende overeen");
  const art3 = await klant.locator("#artikel-3").innerText();
  check(/a\.\s*eerste Contractjaar: 50% van het Aansluittarief;/.test(art3) && /b\.\s*ieder volgend Contractjaar: 50% van het Aansluittarief\./.test(art3), "artikel 3.1 met de percentages van de partner");
  check((await klant.locator("text=Documenten bij dit contract").count()) === 0, "geen documenten van het basiscontract");
  check(await klant.locator("text=Aldus overeengekomen en in tweevoud ondertekend.").count(), "slotzin van het Word-bestand");
  await shot(klant, "04-partner-boven", { fullPage: false });
  await shot(klant, "05-partner-heel");
  await klant.locator("#artikel-3").scrollIntoViewIfNeeded();
  await klant.waitForTimeout(400);
  await shot(klant, "05b-artikel-3", { fullPage: false });
  const bekeken = mails().find((m) => /bekijkt de resellerovereenkomst/.test(m.subject));
  check(Boolean(bekeken), "seintje aan de afzender bij eerste keer openen");

  stap("Concept-pdf voor de partner");
  const kc = await klant.request.get(`${link}/concept`);
  check(kc.status() === 200 && (await kc.body()).subarray(0, 5).toString() === "%PDF-", `concept-pdf: ${kc.status()}`);

  stap("Telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  const breed = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breed <= 390, `geen horizontale scroll op 390 px (${breed})`);
  await shot(tp, "06-telefoon-boven", { fullPage: false });
  await tp.locator("#ondertekenen").scrollIntoViewIfNeeded();
  await tp.waitForTimeout(300);
  await shot(tp, "07-telefoon-tekenen", { fullPage: false });
  await tel.close();

  stap("Ondertekenen");
  await klant.click("header button:has-text('Ondertekenen')");
  await stil(klant, "#ondertekenen");
  check((await klant.inputValue("#ct-naam")) === "Sanne de Vries", "naam vooringevuld");
  check(await klant.locator("#ondertekenen >> text=React2u II B.V. h.o.d.n. React2u").count(), "React2u bij de handtekening zoals het Word-bestand");
  check(await klant.locator('#ondertekenen img[alt="Handtekening van Rens van Eyck"]').count(), "handtekening van de bestuurder");
  await klant.locator("#ondertekenen canvas").scrollIntoViewIfNeeded();
  const doek = await stil(klant, "#ondertekenen canvas");
  await klant.mouse.move(doek.x + 40, doek.y + doek.height * 0.6);
  await klant.mouse.down();
  for (let i = 0; i <= 40; i++) {
    await klant.mouse.move(doek.x + 40 + i * ((doek.width - 80) / 40), doek.y + doek.height * 0.6 - Math.sin(i / 3) * 28 - (i % 7) * 2, { steps: 2 });
  }
  await klant.mouse.up();
  await klant.fill("#ct-functie", "eigenaar");
  await klant.fill("#ct-kvk", "87654321");
  await klant.fill("#ct-adres", "Kanaaldijk 12");
  await klant.fill("#ct-postcode", "5683 CR");
  await klant.fill("#ct-plaats", "Best");
  await klant.fill("#ct-otel", "040 12");
  await klant.check("#ondertekenen input[type=checkbox]");
  await klant.click("#ondertekenen button[type=submit]");
  check((await klant.locator("#ondertekenen [role=alert]").innerText()).includes("telefoonnummer"), "te kort telefoonnummer geweigerd");
  await klant.fill("#ct-otel", "040 123 45 67");
  const zin = await klant.locator("text=Zo staat het in de overeenkomst").locator("..").innerText();
  check(zin.includes("Spine Services B.V., gevestigd aan Kanaaldijk 12, 5683 CR Best") && zin.includes("vertegenwoordigd door Sanne de Vries, e-mail sanne@spine.test"), "live: zo staat het in de overeenkomst");
  check((await klant.inputValue("#ct-tekenplaats")) === "Best", "getekend te: de vestigingsplaats");
  check(await klant.locator("text=Ik ga akkoord met deze resellerovereenkomst").count(), "akkoord met de resellerovereenkomst");
  await klant.locator("#ondertekenen").screenshot({ path: path.join(SHOTS, "08-tekenen.png") });
  const voorCode = mails().length;
  await klant.click("#ondertekenen button[type=submit]");
  await klant.waitForSelector("text=Nog één stap", { timeout: 20000 });
  const codeMail = mails().slice(voorCode).find((m) => /is je code voor contract/.test(m.subject));
  check(Boolean(codeMail) && /om de resellerovereenkomst voor Spine Services te ondertekenen\./.test(codeMail.html), `codemail: ${codeMail?.subject}`);
  const code = codeMail?.subject.match(/^(\d{6})/)?.[1] || "";
  await klant.fill("#ct-code", code);
  await klant.waitForSelector("text=Kenmerk van de ondertekende versie", { timeout: 30000 });
  check(await klant.locator("text=Welkom als partner.").count(), "felicitatie na het tekenen");
  check(await klant.locator("text=Ondergetekende: Sanne de Vries, eigenaar").count(), "handtekening van de reseller met naam en functie");
  await klant.waitForTimeout(1200);
  await shot(klant, "09-getekend", { fullPage: false });
  await shot(klant, "09b-getekend-heel");

  stap("Vastgelegd: ingang op de dag van ondertekening, onbepaalde tijd");
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const vast = sql(`select ingangsdatum::text || '|' || coalesce(einddatum::text, 'leeg') || '|' || (getekend_inhoud->>'soort') || '|' || (getekend_inhoud->'opdrachtgever'->>'email') || '|' || (getekend_inhoud->'opdrachtgever'->>'telefoon') from public.contracten where id = '${id}'`).trim();
  check(vast === `${vandaag}|leeg|reseller|sanne@spine.test|040 123 45 67`, `in de database: ${vast}`);
  check(await klant.locator(`text=voor onbepaalde tijd`).count(), "pagina: voor onbepaalde tijd");

  stap("Mails na ondertekening");
  await klant.waitForTimeout(3000);
  const alle = mails();
  const bevestiging = alle.find((m) => m.to?.includes("sanne@spine.test") && /^Ondertekend: resellerovereenkomst/.test(m.subject));
  const melding = alle.find((m) => /^Getekend: resellerovereenkomst/.test(m.subject));
  check(Boolean(bevestiging?.attachments?.[0]) && /Welkom als partner/.test(bevestiging?.html || ""), `bevestiging met pdf: ${bevestiging?.subject}`);
  check(Boolean(melding) && melding.to.includes("sales@test.local"), `melding naar sales: ${melding?.to}`);
  check(/KvK 87654321/.test(melding?.html || "") && /onbepaalde tijd/.test(melding?.html || "") && /040 123 45 67/.test(melding?.html || ""), "melding met kantoor, telefoon en looptijd");
  fs.writeFileSync(path.join(SHOTS, "mail-bevestiging.html"), bevestiging?.html || "");
  fs.writeFileSync(path.join(SHOTS, "mail-getekend.html"), melding?.html || "");

  stap("Pdf na het tekenen");
  const dl = await klant.request.get(`${link}/pdf?download=1`);
  const pdfBody = await dl.body();
  check(dl.status() === 200 && pdfBody.toString("latin1").includes("ondertekeningscertificaat"), `getekende pdf: ${dl.status()}`);
  check(/Resellerovereenkomst.*Spine Services.*getekend/.test(dl.headers()["content-disposition"] || ""), `download met nette naam: ${dl.headers()["content-disposition"]}`);
  fs.writeFileSync(path.join(SHOTS, "getekend.pdf"), pdfBody);

  stap("Getekend is getekend, de partner blijft vrij");
  let geweigerd = "";
  try {
    sql(`update public.contracten set tekst = tekst || ' ' where id = '${id}'`);
  } catch (e) {
    geweigerd = String(e.stderr || e.message);
  }
  check(/kan niet meer worden gewijzigd/.test(geweigerd), "de database weigert een wijziging aan de tekst");
  let partnerVrij = true;
  try {
    sql(`update public.contracten set partner_id = null where id = '${id}'; update public.contracten set partner_id = '${partnerId}' where id = '${id}'`);
  } catch {
    partnerVrij = false;
  }
  check(partnerVrij, "de koppeling met de partner mag ook na het tekenen wijzigen");
  let looptijdFout = "";
  try {
    sql(`insert into public.contracten (bedrijf, soort, ingangsdatum, einddatum, tekst) values ('X', 'reseller', current_date, current_date + 30, repeat('x', 120))`);
  } catch (e) {
    looptijdFout = String(e.stderr || e.message);
  }
  check(/contracten_looptijd/.test(looptijdFout), "een resellerovereenkomst heeft geen einddatum");

  stap("Beheer na ondertekening");
  await page.goto(beheerUrl);
  await page.waitForSelector("text=Ondertekening");
  check(await page.locator(`text=Loopt sinds`).count() && (await page.locator("text=opzegtermijn van één maand").count()), "beheer: onbepaalde tijd, opzegtermijn");
  check(await page.locator("text=50% van het aansluittarief in het eerste contractjaar, 50% daarna").count(), "beheer: de vergoeding");
  await shot(page, "10-beheer-getekend");
  await page.goto(`${BASIS}/admin/contracten?soort=reseller`);
  check(await page.locator("a[aria-current=page]:has-text('Resellerovereenkomsten')").count(), "register: filter resellerovereenkomsten");
  check(await page.locator(`text=Sinds ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" })}`).count(), "register: sinds vandaag");
  await shot(page, "11-register");
  await page.goto(`${BASIS}/admin/partners/${partnerId}`);
  check(await page.locator("text=Getekend op").count() && (await page.locator("a:has-text('Getekende pdf')").count()), "partnerpagina: getekend, met de pdf");
  check((await page.locator("a:has-text('Resellerovereenkomst opstellen')").count()) === 0, "partnerpagina: geen tweede overeenkomst opstellen");
  await shot(page, "12-partner-getekend");

  stap("Mails renderen");
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 680, height: 900 });
  for (const naam of ["mail-overeenkomst", "mail-bevestiging"]) {
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
