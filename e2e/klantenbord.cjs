// Klantenbord (0040, 0041) van begin tot eind: het lege bord en het menu, een nieuwe lead via het zijpaneel,
// een gesprek vastleggen met in één keer de volgende stap en een nieuwe kolom, de vinkjes en de gegevens,
// slepen naar een andere kolom, de koppelingen met de bellijst en een offerte die getekend wordt (de kaart gaat
// zelf naar Akkoord, de tijdlijn vult zich), de import van een Excelbestand in de vorm van de klantlijst
// (controlerapport, dan importeren, dan nog eens zonder dubbelen), zoeken, de lijstweergave, het bord op een
// telefoon, een kaart van het bord halen, en kaarten die vanzelf ontstaan uit een brochure, contract,
// onboarding en losse opdracht, met het sitebezoek erbij. Dan de werkdag: de werkrij Vandaag met het toetsenbord,
// het telefoontje dat zichzelf vastlegt, mailen vanuit de kaart en de ochtendmail via de cron.
// Draaien via e2e/run.mjs (E2E_ALLEEN=klantenbord).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql, maakXlsx } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "klantenbord");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wacht tot een SQL-vraag het verwachte antwoord geeft (de server action is net klaar als de browser het zegt). */
async function tot(q, verwacht, ms = 8000) {
  const eind = Date.now() + ms;
  let w = sql(q);
  while (w !== verwacht && Date.now() < eind) {
    await wacht(250);
    w = sql(q);
  }
  return w;
}
const BEDRIJF = "Bakkerij De Korenaar";
const vandaag = sql("select (now() at time zone 'Europe/Amsterdam')::date");

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);
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

  stap("Het lege bord, het menu en de sleutel in de database");
  sql("delete from public.klanten");
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector("h1:has-text('Klantenbord')");
  check(await page.locator("text=Het bord is nog leeg").count(), "lege staat");
  check(await page.locator('nav a[href="/admin/klantenbord"]').count(), "Klantenbord staat in het menu");
  check(sql("select public.bedrijf_sleutel('Hoveniersbedrijf Groen B.V.')") === "hoveniersbedrijf groen", "bedrijf_sleutel: rechtsvorm en leestekens weg");
  check(sql("select public.bedrijf_sleutel('  Son & Koot ')") === "son koot", "bedrijf_sleutel: ampersand en spaties");
  check(sql("select public.bedrijf_sleutel('Café Zeezicht')") === "cafe zeezicht", "bedrijf_sleutel: accenten");
  await shot(page, "01-leeg", { fullPage: false });

  stap("Een nieuwe lead via het zijpaneel");
  await page.click("button:has-text('Nieuwe lead of klant')");
  await page.waitForSelector("#kb-bedrijf");
  await page.fill("#kb-bedrijf", BEDRIJF);
  await page.fill("#kb-cp", "Fatima El Amrani");
  await page.fill("#kb-eigenaar", "Cindy");
  await page.fill("#kb-tel", "040 123 45 67");
  await page.fill("#kb-email", "fatima@korenaar.test");
  await page.selectOption("#kb-herkomst", "verwijzing");
  await page.fill("#kb-herkomst-toelichting", "beurs");
  await page.fill("#kb-actie", "Kennismaking inplannen");
  await page.fill("#kb-actie-op", vandaag);
  await shot(page, "02-nieuw");
  await page.click("button:has-text('Op het bord zetten')");
  await page.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`, { timeout: 20000 });
  const id = sql(`select id from public.klanten where bedrijf = '${BEDRIJF}'`);
  check(/^[0-9a-f-]{36}$/.test(id), `kaart in de database (${id})`);
  check(sql(`select herkomst || ' ' || herkomst_toelichting from public.klanten where id = '${id}'`) === "verwijzing beurs", "herkomst en toelichting opgeslagen (0047)");
  check(sql(`select status || ' ' || sleutel || ' ' || eigenaar || ' ' || volgende_actie_op from public.klanten where id = '${id}'`) === `lead bakkerij de korenaar Cindy ${vandaag}`, "status lead, sleutel, eigenaar en de volgende actie");
  check(sql(`select count(*) from public.klant_gesprekken where klant_id = '${id}' and soort = 'status'`) === "1", "op het bord gezet staat in de tijdlijn");
  await page.waitForSelector(`section[data-kolom="lead"] #klant-${id}`);
  check(await page.locator(`section[data-kolom="lead"] #klant-${id}`).count(), "de kaart staat in de kolom Lead");
  check(await page.locator(`#klant-${id} >> text=Kennismaking inplannen`).count() && (await page.locator(`#klant-${id} >> text=vandaag`).count()), "volgende actie met 'vandaag' op de kaart");
  check(await page.locator("aside[role=dialog] >> text=Op het bord gezet als lead").count(), "de tijdlijn begint met 'op het bord gezet'");
  await shot(page, "03-paneel");

  stap("Een gesprek vastleggen, met de volgende stap en een nieuwe kolom");
  await page.fill("#kb-tekst", "Fatima wil een offerte voor 25 medewerkers, liefst voor 1 december.");
  await page.click("aside[role=dialog] label:has-text('Meteen de volgende stap zetten')");
  await page.fill("aside[role=dialog] input[aria-label='Volgende actie na dit gesprek']", "Offerte maken");
  await page.selectOption("aside[role=dialog] select[aria-label='Kaart verplaatsen naar']", "gesprek");
  await page.click("aside[role=dialog] button:has-text('Vastleggen')");
  await page.waitForSelector("text=Vastgelegd.", { timeout: 20000 });
  check((await tot(`select status from public.klanten where id = '${id}'`, "gesprek")) === "gesprek", "kaart naar In gesprek");
  check(sql(`select laatste_contact from public.klanten where id = '${id}'`).startsWith("Fatima wil een offerte"), "laatste contact op de kaart via de trigger");
  check(sql(`select laatste_contact_op::text from public.klanten where id = '${id}'`) === vandaag, "laatste contact vandaag");
  check(sql(`select volgende_actie from public.klanten where id = '${id}'`) === "Offerte maken", "volgende actie gezet in dezelfde handeling");
  check(await page.locator("aside[role=dialog] >> text=Van lead naar in gesprek").count(), "de verplaatsing staat in de tijdlijn");
  check(await page.locator("aside[role=dialog] >> text=Fatima wil een offerte").count(), "het gesprek staat in de tijdlijn");
  await page.waitForSelector(`section[data-kolom="gesprek"] #klant-${id}`);
  check(await page.locator(`#klant-${id} >> text=Fatima wil een offerte`).count(), "het laatste gesprek staat op de kaart");

  stap("Vinkjes en gegevens");
  await page.click("aside[role=dialog] button[role=checkbox]:has-text('Offerte retour')");
  check((await tot(`select offerte_retour::text from public.klanten where id = '${id}'`, "true")) === "true", "offerte retour aangevinkt");
  await page.fill("#kb-g-stand", "Offerte voor 25 medewerkers verstuurd");
  await page.click("aside[role=dialog] button:has-text('Gegevens opslaan')");
  await page.waitForSelector("text=Gegevens opgeslagen.", { timeout: 20000 });
  check((await tot(`select stand from public.klanten where id = '${id}'`, "Offerte voor 25 medewerkers verstuurd")) === "Offerte voor 25 medewerkers verstuurd", "stand opgeslagen");
  await page.fill("aside[role=dialog] input[aria-label='Volgende actie']", "Offerte nabellen");
  await page.click("aside[role=dialog] button:has-text('Over een week')");
  await page.click("aside[role=dialog] button:has-text('Bewaar')");
  check((await tot(`select volgende_actie from public.klanten where id = '${id}'`, "Offerte nabellen")) === "Offerte nabellen", "volgende stap bijgewerkt");
  check(sql(`select (volgende_actie_op - (now() at time zone 'Europe/Amsterdam')::date) from public.klanten where id = '${id}'`) === "7", "over een week");
  await shot(page, "04-paneel-gevuld");
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("Slepen naar Offerte uit");
  await page.dragAndDrop(`#klant-${id}`, 'section[data-kolom="offerte"]');
  check((await tot(`select status from public.klanten where id = '${id}'`, "offerte")) === "offerte", "gesleept: status offerte");
  await page.waitForSelector(`section[data-kolom="offerte"] #klant-${id}`);
  check(sql(`select count(*) from public.klant_gesprekken where klant_id = '${id}' and soort = 'status'`) === "3", "elke verplaatsing in de tijdlijn");
  await shot(page, "05-bord", { fullPage: false });

  stap("Koppelingen met de bellijst en een offerte die getekend wordt");
  sql(`insert into public.leads (name, company, status, follow_up_on) values ('Fatima El Amrani', '${BEDRIJF}', 'terugbellen', current_date + 2)`);
  const offerte = sql(`insert into public.offertes (bedrijf, contactpersoon, email, status, verstuurd_at, afzender_naam, afzender_email)
    values ('Bakkerij de Korenaar B.V.', 'Fatima El Amrani', 'fatima@korenaar.test', 'verstuurd', now() - interval '2 days', 'Rens van Eyck', 'sales@react2u.nl')
    returning id || ' ' || nummer`).split("\n")[0].split(" ");
  check(sql(`select count(*) from public.klanten`) === "1", "een offerte met een andere schrijfwijze van de naam maakt geen tweede kaart");
  sql(`insert into public.offerte_gebeurtenissen (offerte_id, soort, at) values ('${offerte[0]}', 'bekeken', now() - interval '1 day')`);
  sql(`update public.offertes set keuze_at = now() - interval '20 hours' where id = '${offerte[0]}'`);
  sql(`update public.offertes set status = 'getekend', getekend_at = now() where id = '${offerte[0]}'`);
  sql(`insert into public.offerte_gebeurtenissen (offerte_id, soort, door) values ('${offerte[0]}', 'getekend', 'Fatima El Amrani')`);
  check((await tot(`select status from public.klanten where id = '${id}'`, "akkoord")) === "akkoord", "offerte getekend: de kaart gaat zelf naar Akkoord");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${id}' and soort = 'status' order by created_at desc limit 1`) === `Van offerte uit naar akkoord (offerte ${offerte[1]} getekend door Fatima El Amrani)`, "de verplaatsing staat in de tijdlijn met de reden");
  check(sql(`select string_agg(tekst, ' | ' order by created_at) from public.klant_gesprekken where klant_id = '${id}' and soort = 'systeem'`) === `Offerte ${offerte[1]} bekeken | Koos zelf onderdelen in offerte ${offerte[1]} | Offerte ${offerte[1]} getekend door Fatima El Amrani`, "bekeken, gekozen en getekend uit de module in de tijdlijn");
  check(sql(`select laatste_contact || ' ' || laatste_contact_op from public.klanten where id = '${id}'`) === `Offerte ${offerte[1]} getekend door Fatima El Amrani ${vandaag}`, "het laatste contact op de kaart is wat de klant deed");
  check(sql(`select door || ' ' || contact::text from public.klant_gesprekken where klant_id = '${id}' and soort = 'systeem' and tekst like '%bekeken'`) === "klant true", "bekeken: door de klant, en een echt contact");
  await page.reload();
  await page.waitForSelector(`section[data-kolom="akkoord"] #klant-${id}`);
  check(await page.locator(`#klant-${id} a[href^="/admin/offertes/"]:has-text('getekend')`).count(), "de getekende offerte als label op de kaart");
  check(await page.locator(`#klant-${id} a[href^="/admin/bellijst"]:has-text('terugbellen')`).count(), "de bellijstlead als label op de kaart");
  check(await page.locator(`#klant-${id} >> text=Offerte ${offerte[1]} getekend`).count(), "het laatste contact op de kaart komt uit de offerte");
  await page.click(`#klant-${id} h3`);
  await page.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`);
  check(await page.locator("aside[role=dialog] >> text=Koos zelf onderdelen").count(), "de keuze van de klant in de tijdlijn van het paneel");
  check(await page.locator(`aside[role=dialog] a[href="/admin/offertes/${offerte[0]}"]`).count() >= 1, "doorklikken naar de offerte vanuit de tijdlijn");
  check((await page.locator("aside[role=dialog] li:has-text('getekend door Fatima') button[aria-label='Deze regel verwijderen']").count()) === 0, "een systeemregel kun je niet verwijderen");
  await shot(page, "05b-paneel-tijdlijn");
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("Import van de klantlijst (controlerapport)");
  const xlsxPad = path.join(SHOTS, "klantlijst-test.xlsx");
  fs.writeFileSync(xlsxPad, maakXlsx([
    ["startdatum klant", "klant", "offerte retour", "contract retour", "koppeling", "formulieren retour", "", "naar excact/facturatie verzonden"],
    [{ d: "2026-09-01" }, "Hoveniersbedrijf Groen", "ja", "ja", "nee", "ja", "", "", "ingericht"],
    [{ d: "2026-10-01" }, "Zorggroep Oost", "ja", "ja", "ja", "ja", "", "", "Wordt ingericht door Iki met koppeling"],
    [{ d: "2026-01-01" }, "Transport Vermeulen", "ja"],
    [{ d: "2026-11-01" }, "Kinderopvang Zonnetje", "", "", "", "", "", "", "Gaat Cindy naartoe begin dec", "Henk de Jong"],
    [{ d: "2026-10-01" }, "Bakkerij de Korenaar B.V.", "ja", "ja", "nee", "ja", "", "", "Contract retour, inrichting gepland"],
    ["", "", "", ""],
    [{ d: "2026-10-01" }, "Zorggroep Oost", "ja"],
  ]));
  await page.click("button:has-text('Klantlijst importeren')");
  await page.waitForSelector("#kb-bestand");
  await page.setInputFiles("#kb-bestand", xlsxPad);
  await page.waitForSelector("text=Gelezen uit klantlijst-test.xlsx", { timeout: 20000 });
  const cijfer = async (soort) => page.locator(`div[role=dialog] [data-telling='${soort}'] b`).first().innerText();
  check((await cijfer("nieuw")) === "4", "4 nieuw");
  check((await cijfer("bijwerken")) === "1", "1 bijwerken (de bakkerij, met B.V.)");
  check((await cijfer("overslaan")) === "1", "1 overslaan (dubbel in het bestand)");
  check(await page.locator("div[role=dialog] li:has-text('I') >> text=Laatste stand").count() && (await page.locator("div[role=dialog] li:has-text('I') >> text=(aan de inhoud)").count()), "kolom I zonder kop herkend als laatste stand");
  check(await page.locator("div[role=dialog] li:has-text('J') >> text=Contactpersoon").count(), "kolom J zonder kop herkend als contactpersoon");
  check(await page.locator("div[role=dialog] >> text=Startdatum 1 januari 2026 ligt in het verleden; bedoel je 2027?").count(), "waarschuwing: startdatum 1-1 is dit jaar, bedoel je volgend jaar?");
  check(await page.locator("div[role=dialog] >> text=Staat al eerder in het bestand").count(), "waarschuwing: dubbele rij");
  check(await page.locator("div[role=dialog] li[data-regel]:has-text('Bakkerij de Korenaar B.V.') >> text=status Akkoord → Inrichten").count(), "de bakkerij gaat van akkoord naar inrichten");
  check(await page.locator("div[role=dialog] li[data-regel]:has-text('Hoveniersbedrijf Groen') >> text=Klant").count(), "'ingericht' wordt klant");
  await shot(page, "06-import-rapport");

  stap("Importeren, en nog een keer zonder dubbelen");
  await page.click("div[role=dialog] button:has-text('Importeer 5 rijen')");
  await page.waitForSelector("div[role=dialog] [data-klaar]", { timeout: 30000 });
  check(await page.locator("div[role=dialog] [data-klaar] >> text=4 nieuw op het bord · 1 bijgewerkt").count(), "de bevestiging in het venster");
  await shot(page, "06b-import-klaar", { fullPage: false });
  await page.click("div[role=dialog] button:has-text('Sluiten')");
  await page.waitForSelector("text=Klantlijst geïmporteerd: 4 nieuw, 1 bijgewerkt.", { timeout: 30000 });
  check(sql("select count(*) from public.klanten") === "5", "vijf kaarten op het bord");
  check(sql("select status from public.klanten where bedrijf = 'Hoveniersbedrijf Groen'") === "klant", "Hoveniersbedrijf Groen: klant");
  check(sql("select status || ' ' || koppeling::text from public.klanten where bedrijf = 'Zorggroep Oost'") === "inrichten true", "Zorggroep Oost: inrichten, koppeling ja");
  check(sql("select status || ' ' || startdatum::text from public.klanten where bedrijf = 'Transport Vermeulen'") === "akkoord 2026-01-01", "Transport Vermeulen: akkoord, startdatum zoals in het bestand");
  check(sql("select status || ' ' || contactpersoon from public.klanten where bedrijf = 'Kinderopvang Zonnetje'") === "gesprek Henk de Jong", "Kinderopvang Zonnetje: in gesprek, contactpersoon uit de kolom zonder kop");
  check(sql(`select status || ' ' || contract_retour::text || ' ' || bedrijf from public.klanten where id = '${id}'`) === `inrichten true ${BEDRIJF}`, "de bakkerij bijgewerkt: inrichten, contract retour, de naam blijft zoals hij op het bord stond");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${id}' and soort = 'import'`).includes("status akkoord → inrichten"), "de import staat in de tijdlijn");
  check(sql("select count(*) from public.klant_gesprekken where soort = 'import'") === "5", "elke geïmporteerde kaart heeft een importregel");
  await page.waitForSelector("section[data-kolom='klant'] >> text=Hoveniersbedrijf Groen");
  await page.click("button:has-text('Klantlijst importeren')");
  await page.setInputFiles("#kb-bestand", xlsxPad);
  await page.waitForSelector("text=Gelezen uit klantlijst-test.xlsx", { timeout: 20000 });
  check((await cijfer("ongewijzigd")) === "5", "tweede keer: alles ongewijzigd");
  check(await page.locator("div[role=dialog] button:has-text('Niets te importeren')[disabled]").count(), "niets te importeren");
  await page.click("div[role=dialog] button:has-text('Annuleren')");
  check(sql("select count(*) from public.klanten") === "5", "geen dubbelen");
  await shot(page, "07-bord-gevuld", { fullPage: false });

  stap("Zoeken, filteren en de lijst");
  await page.fill("input[aria-label='Zoek op het klantenbord']", "zonnetje");
  await wacht(300);
  check((await page.locator(".kb-kaart").count()) === 1, "zoeken: één kaart over");
  check(await page.locator("text=1 van 5").count(), "telling bij het zoeken");
  await page.fill("input[aria-label='Zoek op het klantenbord']", "");
  await page.selectOption("select[aria-label='Eigenaar']", "Cindy");
  await wacht(300);
  check((await page.locator(".kb-kaart").count()) === 1, "filter op eigenaar");
  await page.selectOption("select[aria-label='Eigenaar']", "");
  await page.click("button[role=tab]:has-text('Lijst')");
  await page.waitForSelector("table");
  check(page.url().includes("weergave=lijst"), "de lijst staat in de URL");
  check((await page.locator("tbody tr").count()) === 5, "vijf rijen in de lijst");
  await page.click("th button:has-text('Bedrijf')");
  check((await page.locator("tbody tr").first().innerText()).includes(BEDRIJF), "gesorteerd op bedrijf");
  await shot(page, "08-lijst");
  await page.goto(`${BASIS}/admin/klantenbord?weergave=lijst`);
  await page.waitForSelector("table");
  check(await page.locator("button[role=tab][aria-selected=true]:has-text('Lijst')").count(), "lijst via de URL");

  stap("Op een telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL", storageState: await ctx.storageState() });
  const mp = await tel.newPage();
  mp.on("pageerror", (e) => paginafouten.push(String(e)));
  await mp.goto(`${BASIS}/admin/klantenbord`);
  await mp.waitForSelector("h1:has-text('Klantenbord')");
  await mp.waitForSelector(`#klant-${id}`);
  check(await mp.locator(`#status-${id}`).isVisible(), "op de telefoon: status kiezen op de kaart");
  await shot(mp, "09-telefoon-bord", { fullPage: false });
  // Tikken, niet klikken: de kaart staat in een horizontaal scrollende rij onder de cijfers.
  await mp.locator(`#klant-${id}`).scrollIntoViewIfNeeded();
  await wacht(400);
  await mp.locator(`#klant-${id} h3`).tap({ timeout: 5000 }).catch(() => mp.locator(`#klant-${id}`).dispatchEvent("click"));
  await mp.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`);
  await shot(mp, "10-telefoon-paneel", { fullPage: false });
  await tel.close();

  stap("Een kaart van het bord halen");
  await page.goto(`${BASIS}/admin/klantenbord`);
  const zonnetje = sql("select id from public.klanten where bedrijf = 'Kinderopvang Zonnetje'");
  await page.waitForSelector(`#klant-${zonnetje}`);
  await page.click(`#klant-${zonnetje} h3`);
  await page.waitForSelector("aside[role=dialog] h2:has-text('Kinderopvang Zonnetje')");
  await page.click("aside[role=dialog] button:has-text('Van het bord halen')");
  check((await tot("select count(*) from public.klanten", "4")) === "4", "kaart weg, met zijn gesprekken");
  check(sql(`select count(*) from public.klant_gesprekken where klant_id = '${zonnetje}'`) === "0", "gesprekken mee verwijderd (cascade)");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("Kaarten ontstaan zelf uit een brochure, contract, onboarding en losse opdracht");
  const brochure = sql(`insert into public.brochures (bedrijf, contactpersoon, email, status, verstuurd_at, afzender_naam, afzender_email)
    values ('Kapsalon Knip & Co', 'Sanne de Boer', 'sanne@knip.test', 'verstuurd', now(), 'Rens van Eyck', 'sales@react2u.nl') returning id || ' ' || nummer`).split("\n")[0].split(" ");
  const kapsalon = sql("select id || '|' || status || '|' || coalesce(contactpersoon, '-') || '|' || coalesce(bron, '-') from public.klanten where sleutel = 'kapsalon knip co'").split("|");
  check(kapsalon[1] === "lead" && kapsalon[2] === "Sanne de Boer" && kapsalon[3] === "brochure", `brochure: kaart als lead met de contactpersoon (${kapsalon.slice(1).join(", ")})`);
  sql(`insert into public.brochure_gebeurtenissen (brochure_id, soort, door, details) values ('${brochure[0]}', 'verstuurd', 'rens@react2u.nl', '{"aan":"sanne@knip.test"}')`);
  sql(`insert into public.brochure_gebeurtenissen (brochure_id, soort) values ('${brochure[0]}', 'bekeken')`);
  check(sql(`select string_agg(tekst, ' | ' order by created_at) from public.klant_gesprekken where klant_id = '${kapsalon[0]}' and soort = 'systeem'`) === `Brochure ${brochure[1]} verstuurd naar sanne@knip.test | Brochure ${brochure[1]} bekeken`, "brochure verstuurd en bekeken in de tijdlijn");
  check(sql(`select status from public.klanten where id = '${kapsalon[0]}'`) === "lead", "een brochure verplaatst niet");

  const contract = sql(`insert into public.contracten (bedrijf, contactpersoon, email, status, ingangsdatum, einddatum, tekst, verstuurd_at)
    values ('Installatiebedrijf Pieters', 'Henk Pieters', 'henk@pieters.test', 'verstuurd', current_date, current_date + 365, repeat('x', 120), now()) returning id || ' ' || nummer`).split("\n")[0].split(" ");
  const pieters = sql("select id || ' ' || status from public.klanten where sleutel = 'installatiebedrijf pieters'").split(" ");
  check(pieters[1] === "akkoord", "contract verstuurd: kaart als akkoord");
  sql(`insert into public.contract_gebeurtenissen (contract_id, soort, door) values ('${contract[0]}', 'getekend', 'Henk Pieters')`);
  check((await tot(`select status from public.klanten where id = '${pieters[0]}'`, "inrichten")) === "inrichten", "contract getekend: naar Inrichten");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${pieters[0]}' and soort = 'systeem' order by created_at desc limit 1`) === `Contract ${contract[1]} getekend door Henk Pieters`, "getekend contract in de tijdlijn");
  sql(`insert into public.contracten (bedrijf, soort, tekst) values ('Accountants Noord', 'reseller', repeat('x', 120))`);
  check(sql("select count(*) from public.klanten where sleutel = 'accountants noord'") === "0", "een resellerovereenkomst is een partner, geen kaart");

  const onboarding = sql(`insert into public.onboardings (bedrijf, contactpersoon, email, documenten, status, verstuurd_at)
    values ('Zorg aan Huis Twente', 'Ilse Kamp', 'ilse@zorgaanhuis.test', '{welkom,inrichting}', 'verstuurd', now()) returning id || ' ' || nummer`).split("\n")[0].split(" ");
  const zorg = sql("select id || ' ' || status from public.klanten where sleutel = 'zorg aan huis twente'").split(" ");
  check(zorg[1] === "inrichten", "onboarding: kaart als inrichten");
  sql(`insert into public.onboarding_gebeurtenissen (onboarding_id, soort) values ('${onboarding[0]}', 'bekeken')`);
  sql(`insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details) values ('${onboarding[0]}', 'ingevuld', '{"document":"inrichting"}')`);
  sql(`insert into public.onboarding_gebeurtenissen (onboarding_id, soort, door, details) values ('${onboarding[0]}', 'live', 'rens@react2u.nl', '{"aan":"ilse@zorgaanhuis.test"}')`);
  check((await tot(`select status from public.klanten where id = '${zorg[0]}'`, "klant")) === "klant", "onboarding live: naar Klant");
  check(sql(`select string_agg(tekst, ' | ' order by created_at) from public.klant_gesprekken where klant_id = '${zorg[0]}' and soort = 'systeem'`) === `Onboarding ${onboarding[1]} geopend | Inrichting nieuwe klant ingevuld (onboarding ${onboarding[1]}) | Live: onboarding ${onboarding[1]} is ingericht`, "geopend, ingevuld en live in de tijdlijn");

  sql(`insert into public.losse_opdrachten (soort, bedrijf, bedrag, datum, contactpersoon) values ('abonnement', 'Autobedrijf Van Dijk', 250, current_date - 40, 'Kees van Dijk')`);
  const vandijk = sql("select status || ' ' || (laatste_contact is null)::text from public.klanten where sleutel = 'autobedrijf van dijk'");
  check(vandijk === "klant true", `losse klant: kaart als klant zonder contact (${vandijk})`);
  check(sql("select tekst from public.klant_gesprekken where klant_id = (select id from public.klanten where sleutel = 'autobedrijf van dijk') and soort = 'systeem'").startsWith("Opgevoerd als klant met een abonnement sinds "), "losse klant in de tijdlijn");

  // In CI draaiden de andere tests eerder: hun offertes en contracten staan nog in de modules, maar hun kaarten
  // gingen weg bij het begin van deze test. De eerste keer inlezen mag die dus terugzetten; de tweede keer niets.
  sql("select public.klantenbord_inlezen()");
  const inlezen = JSON.parse(sql("select public.klantenbord_inlezen()") || "{}");
  check(inlezen.kaarten === 0 && inlezen.regels === 0, `inlezen nog een keer: niets dubbel (${JSON.stringify(inlezen)})`);
  // De losse opdracht weer weg: e2e/dashboard.cjs verwacht later een lege verkoop, en die tabel maakt hij niet zelf leeg.
  sql("delete from public.losse_opdrachten where bedrijf = 'Autobedrijf Van Dijk'");

  stap("Sitebezoek op de kaart");
  sql(`insert into public.page_views (path, is_company, company, company_domain, company_source, visitor_hash, created_at) values
    ('/verzuimbegeleiding', true, 'Bakkerij De Korenaar', 'korenaar.test', 'rdns', 'e2e-kb-1', now() - interval '45 minutes'),
    ('/tarieven', true, 'Bakkerij De Korenaar', 'korenaar.test', 'rdns', 'e2e-kb-1', now() - interval '40 minutes')`);
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector(`#klant-${id}`);
  check(await page.locator(`#klant-${id} >> text=Op de site`).count() && (await page.locator(`#klant-${id} >> text=40 min geleden`).count()) && (await page.locator(`#klant-${id} >> text=2 pagina's`).count()), "op de kaart: op de site 40 min geleden, 2 pagina's");
  check(
    (await page.locator("section[data-kolom='klant'] .kb-kaart:has-text('Hoveniersbedrijf Groen')").count()) === 1 &&
      (await page.locator("section[data-kolom='klant'] .kb-kaart:has-text('Zorg aan Huis Twente')").count()) === 1 &&
      (await page.locator("section[data-kolom='klant'] .kb-kaart:has-text('Autobedrijf Van Dijk')").count()) === 1,
    "in Klant: de kaart uit de import, die uit de onboarding en die uit de losse opdracht",
  );
  await page.click(`#klant-${id} h3`);
  await page.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`);
  check(await page.locator("aside[role=dialog] li:has-text('Op de site') >> text=2 pagina's: verzuimbegeleiding, tarieven").count(), "de sessie met de pagina's in de tijdlijn");
  await shot(page, "11-bord-automatisch", { fullPage: false });
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("Gekoppeld aan een reseller");
  const partnerId = sql(`insert into public.partners (code, kantoor, naam, email, model) values ('NOORDTEST', 'Accountants Noord', 'Nora Noord', 'nora@noord.test', 'reseller') returning id`).split("\n")[0].trim();
  sql(`insert into public.partner_klanten (partner_id, bedrijf, medewerkers, tarief, start) values ('${partnerId}', 'Tandartspraktijk Molenstraat', 6, 38.5, current_date - 10)`);
  const molen = sql("select id || '|' || status || '|' || coalesce(partner_id::text, '-') from public.klanten where sleutel = 'tandartspraktijk molenstraat'").split("|");
  check(molen[1] === "klant" && molen[2] === partnerId, `aangemeld bij een partner: kaart als klant met de partner erbij (${molen.slice(1).join(", ")})`);
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${molen[0]}' and bron = 'partner'`).startsWith("Aangemeld via Accountants Noord: 6 medewerkers, start "), "de aanmelding in de tijdlijn");
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector(`#klant-${molen[0]}`);
  check(await page.locator(`#klant-${molen[0]} a[href="/admin/partners/${partnerId}"]:has-text('via Accountants Noord')`).count(), "de partner als label op de kaart, met een link naar de partner");
  await page.selectOption("select[aria-label='Reseller of partner']", partnerId);
  await wacht(300);
  check((await page.locator(".kb-kaart").count()) === 1, "filter op partner: één kaart");
  await page.selectOption("select[aria-label='Reseller of partner']", "");
  // Met de hand: de bakkerij aan dezelfde reseller koppelen.
  await page.click(`#klant-${id} h3`);
  await page.waitForSelector("#kb-g-partner");
  await page.selectOption("#kb-g-partner", partnerId);
  await page.click("aside[role=dialog] button:has-text('Gegevens opslaan')");
  await page.waitForSelector("text=Gegevens opgeslagen.", { timeout: 20000 });
  check((await tot(`select coalesce(partner_id::text, '-') from public.klanten where id = '${id}'`, partnerId)) === partnerId, "met de hand gekoppeld in het paneel");
  check(await page.locator("aside[role=dialog] >> text=via Accountants Noord").count(), "de partner in de kop van het paneel");
  await shot(page, "11b-partner");
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });
  await page.reload();
  await page.waitForSelector(`#klant-${id}`);
  check(await page.locator(`#klant-${id} >> text=via Accountants Noord`).count(), "na herladen staat de partner op de kaart van de bakkerij");

  stap("De werkrij Vandaag, met het toetsenbord");
  const morgen = sql("select ((now() at time zone 'Europe/Amsterdam')::date + 1)::text");
  sql(`update public.klanten set volgende_actie = 'Offerte nabellen', volgende_actie_op = (now() at time zone 'Europe/Amsterdam')::date - 3 where id = '${id}'`);
  sql(`update public.klanten set volgende_actie = 'Bellen over de brochure', volgende_actie_op = (now() at time zone 'Europe/Amsterdam')::date where id = '${kapsalon[0]}'`);
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector("h1:has-text('Klantenbord')");
  check(await page.locator('a[href="/admin/klantenbord/vandaag"] span:has-text("2")').count() || (await page.locator('a[href="/admin/klantenbord/vandaag"] span').count()), "de knop Vandaag telt de rij");
  await page.click('a[href="/admin/klantenbord/vandaag"]');
  await page.waitForSelector("h1:has-text('Vandaag')");
  const rijenVoor = await page.locator("ol[aria-label='Werkrij'] > li").count();
  check(rijenVoor >= 2, `minstens twee rijen (${rijenVoor})`);
  check(await page.locator("ol[aria-label='Werkrij'] >> text=Te laat: Offerte nabellen").count(), "te laat staat erin met de actie");
  check(await page.locator("ol[aria-label='Werkrij'] >> text=3 dagen te laat").count(), "hoe lang te laat");
  check(await page.locator("ol[aria-label='Werkrij'] >> text=Vandaag: Bellen over de brochure").count(), "wat vandaag moet staat erin");
  check(await page.locator("ol[aria-label='Werkrij'] li:has-text('Bakkerij De Korenaar') >> text=Op de site").count(), "het sitebezoek als reden");
  await shot(page, "12-vandaag", { fullPage: false });
  // Met het toetsenbord: de rij van de bakkerij kiezen (in CI staan er ook kaarten van eerdere tests), dan N = niet bereikt.
  await page.locator("ol[aria-label='Werkrij'] li:has-text('Bakkerij De Korenaar')").click();
  await page.keyboard.press("n");
  check((await tot(`select count(*) from public.klant_gesprekken where klant_id = '${id}' and tekst = 'Niet bereikt'`, "1")) === "1", "N: niet bereikt vastgelegd");
  check(sql(`select volgende_actie || ' ' || volgende_actie_op from public.klanten where id = '${id}'`) === `Offerte nabellen ${morgen}`, "en morgen opnieuw, met dezelfde actie");
  await page.waitForSelector("text=Bakkerij De Korenaar: niet bereikt, morgen opnieuw.");
  check((await page.locator("ol[aria-label='Werkrij'] li:has-text('Bakkerij De Korenaar')").count()) === 0, "de rij is weg");
  // Enter = gesproken, met de volgende stap en een nieuwe kolom.
  const kapsalonRij = page.locator("ol[aria-label='Werkrij'] li:has-text('Kapsalon Knip')");
  await kapsalonRij.click();
  await page.keyboard.press("Enter");
  await page.waitForSelector("ol[aria-label='Werkrij'] textarea");
  await page.fill("ol[aria-label='Werkrij'] textarea", "Sanne wil een offerte voor 8 medewerkers.");
  await page.fill("ol[aria-label='Werkrij'] input[aria-label='Volgende stap']", "Offerte maken");
  await page.selectOption("ol[aria-label='Werkrij'] select[aria-label='Kaart verplaatsen naar']", "gesprek");
  await page.click("ol[aria-label='Werkrij'] button:has-text('Vastleggen')");
  check((await tot(`select status from public.klanten where id = '${kapsalon[0]}'`, "gesprek")) === "gesprek", "gesproken: kaart naar In gesprek");
  check(sql(`select volgende_actie || ' | ' || laatste_contact from public.klanten where id = '${kapsalon[0]}'`) === "Offerte maken | Sanne wil een offerte voor 8 medewerkers.", "volgende stap en laatste contact gezet");
  // De rest: D = klaar, tot de rij leeg is (in CI ook de kaarten van eerdere tests).
  for (let i = 0; i < 60 && (await page.locator("ol[aria-label='Werkrij'] > li").count()) > 0; i++) {
    await page.keyboard.press("d");
    await wacht(350);
  }
  await page.waitForSelector("text=De rij is leeg. Mooi werk.", { timeout: 15000 });
  check(true, "de rij is leeg");
  await shot(page, "13-vandaag-leeg", { fullPage: false });

  stap("Het telefoontje legt zichzelf vast");
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector(`#klant-${id}`);
  check((await page.locator(".kb-bel").count()) === 0, "zonder telefoontje geen vraag");
  await page.evaluate(({ id, naam, bedrijf }) => localStorage.setItem("kb-bel", JSON.stringify({ id, bedrijf, naam, at: Date.now() - 20000 })), { id, naam: "Fatima El Amrani", bedrijf: BEDRIJF });
  await page.reload();
  await page.waitForSelector(".kb-bel");
  check(await page.locator(".kb-bel >> text=Je belde net Fatima El Amrani (Bakkerij De Korenaar)").count(), "na terugkomen: je belde net Fatima");
  await shot(page, "14-bel-afloop", { fullPage: false });
  await page.click(".kb-bel button:has-text('Gesproken')");
  await page.fill(".kb-bel textarea", "Fatima tekent volgende week het contract.");
  await page.fill(".kb-bel input[aria-label='Volgende stap']", "Contract versturen");
  await page.click(".kb-bel button:has-text('Vastleggen')");
  await page.waitForSelector(".kb-bel", { state: "detached" });
  check((await tot(`select laatste_contact from public.klanten where id = '${id}'`, "Fatima tekent volgende week het contract.")) === "Fatima tekent volgende week het contract.", "gesprek vastgelegd vanuit de vraag");
  check(sql(`select volgende_actie || ' ' || volgende_actie_op from public.klanten where id = '${id}'`) === `Contract versturen ${morgen}`, "volgende stap morgen");
  check((await page.evaluate(() => localStorage.getItem("kb-bel"))) === null, "de vraag komt niet nog eens");
  // Een misklik op het nummer (korter dan acht seconden geleden) vraagt niets.
  await page.evaluate(({ id }) => localStorage.setItem("kb-bel", JSON.stringify({ id, bedrijf: "X", naam: null, at: Date.now() - 2000 })), { id });
  await page.reload();
  await page.waitForSelector(`#klant-${id}`);
  await wacht(500);
  check((await page.locator(".kb-bel").count()) === 0, "een misklik op het nummer vraagt niets");
  await page.evaluate(() => localStorage.removeItem("kb-bel"));

  stap("Mailen vanuit de kaart");
  await page.click(`#klant-${id} h3`);
  await page.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`);
  await page.click("aside[role=dialog] button:has-text('Schrijf een mail')");
  await page.waitForSelector("#kb-mail-onderwerp");
  await page.click("aside[role=dialog] button[role=radio]:has-text('Offerte nabellen')");
  check((await page.inputValue("#kb-mail-onderwerp")) === "Je offerte van React2u", "sjabloon: onderwerp");
  check((await page.inputValue("#kb-mail-tekst")).startsWith("Beste Fatima,\n\nEen tijdje geleden stuurde ik je onze offerte voor Bakkerij De Korenaar."), "sjabloon: voornaam en bedrijf ingevuld");
  check((await page.inputValue("#kb-mail-aan")) === "fatima@korenaar.test", "aan: het adres van de kaart");
  check((await page.inputValue("#kb-mail-van")) === "Rens", "afzender uit het e-mailadres");
  await shot(page, "15-mail");
  await page.click("aside[role=dialog] button:has-text('Verstuur mail')");
  await page.waitForSelector("text=Mail verstuurd naar fatima@korenaar.test.", { timeout: 20000 });
  const mail = mails().find((m) => m.subject === "Je offerte van React2u");
  check(Boolean(mail) && mail.to.includes("fatima@korenaar.test") && mail.reply_to === BEHEERDER.email, `mail via Resend, antwoorden bij de collega (${mail?.reply_to})`);
  check(Boolean(mail) && mail.html.includes("Beste Fatima,") && mail.html.includes("Met vriendelijke groet,") && mail.html.includes(">Rens<"), "huisstijl met aanhef, groet en naam");
  fs.writeFileSync(path.join(SHOTS, "mail-klant.html"), mail?.html || "");
  check(sql(`select tekst || ' | ' || contact::text from public.klant_gesprekken where klant_id = '${id}' and soort = 'mail'`) === "Gemaild: Je offerte van React2u · Een tijdje geleden stuurde ik je onze offerte voor Bakkerij De Korenaar. | true", "in de tijdlijn als gemaild, en een echt contact");
  check(sql(`select volgende_actie || ' ' || (volgende_actie_op - (now() at time zone 'Europe/Amsterdam')::date) from public.klanten where id = '${id}'`) === "Offerte nabellen 3", "de volgende stap van het sjabloon: offerte nabellen over drie dagen");
  check(await page.locator("aside[role=dialog] >> text=Gemaild: Je offerte van React2u").count(), "de mail staat in de tijdlijn van het paneel");
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("De ochtendmail (api/cron/klantenbord)");
  sql(`update public.klanten set eigenaar = 'Rens van Eyck', volgende_actie_op = (now() at time zone 'Europe/Amsterdam')::date - 2 where id = '${id}'`);
  sql(`update public.klanten set eigenaar = 'Cindy', volgende_actie = 'Kennismaking', volgende_actie_op = (now() at time zone 'Europe/Amsterdam')::date where id = '${kapsalon[0]}'`);
  const cron = (q = "") => page.request.get(`${BASIS}/api/cron/klantenbord${q}`, { headers: { authorization: "Bearer e2e-cron-geheim" } });
  check((await page.request.get(`${BASIS}/api/cron/klantenbord`)).status() === 401, "zonder geheim: 401");
  let cr = await (await cron("?dry=1&weekend=1")).json();
  check(cr.ok && cr.plannen.some((p) => p.aan === BEHEERDER.email && /^Vandaag \d+ acties?, 1 te laat/.test(p.onderwerp)), `droog: een plan voor de beheerder (${JSON.stringify(cr.plannen)})`);
  check(cr.verstuurd === 0, "droog: niets verstuurd");
  cr = await (await cron("?weekend=1")).json();
  check(cr.verstuurd === 1, `verstuurd aan ${cr.ontvangers} ontvanger(s): ${cr.verstuurd}`);
  const ochtend = mails().find((m) => /^Vandaag /.test(m.subject || "") && m.to.includes(BEHEERDER.email));
  check(Boolean(ochtend), `ochtendmail: ${ochtend?.subject}`);
  check(Boolean(ochtend) && ochtend.html.includes("Voor jou") && ochtend.html.includes("Offerte nabellen") && ochtend.html.includes("Rest van het team") && ochtend.html.includes("Kennismaking"), "voor jou (de bakkerij van Rens) en de rest van het team (de kapsalon van Cindy)");
  check(Boolean(ochtend) && ochtend.html.includes("Gisteren bij klanten") && ochtend.html.includes("tekende de offerte"), "gisteren bij klanten: de getekende offerte");
  check(Boolean(ochtend) && ochtend.html.includes("/admin/klantenbord/vandaag"), "knop naar de werkrij");
  fs.writeFileSync(path.join(SHOTS, "mail-ochtend.html"), ochtend?.html || "");

  check(paginafouten.length === 0, `geen fouten in de browser${paginafouten.length ? `: ${paginafouten.join(" | ")}` : ""}`);

  await browser.close();
  fs.writeFileSync(path.join(SHOTS, "resultaat.json"), JSON.stringify({ fout }, null, 2));
  console.log(fout.length ? `\n${fout.length} controle(s) mislukt:\n- ${fout.join("\n- ")}` : "\nKlantenbord: alles in orde.");
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
