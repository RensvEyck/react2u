// Klantenbord (0040) van begin tot eind: het lege bord en het menu, een nieuwe lead via het zijpaneel, een
// gesprek vastleggen met in één keer de volgende stap en een nieuwe kolom, de vinkjes en de gegevens, slepen
// naar een andere kolom, de koppelingen met de bellijst en een getekende offerte (met de hint), de import van
// een Excelbestand in de vorm van de klantlijst (controlerapport, dan importeren, dan nog eens zonder
// dubbelen), zoeken, de lijstweergave, het bord op een telefoon, en een kaart van het bord halen.
// Draaien via e2e/run.mjs (E2E_ALLEEN=klantenbord).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql, maakXlsx } = require("./hulp.cjs");

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
  await page.fill("#kb-bron", "beurs");
  await page.fill("#kb-actie", "Kennismaking inplannen");
  await page.fill("#kb-actie-op", vandaag);
  await shot(page, "02-nieuw");
  await page.click("button:has-text('Op het bord zetten')");
  await page.waitForSelector(`aside[role=dialog] h2:has-text('${BEDRIJF}')`, { timeout: 20000 });
  const id = sql(`select id from public.klanten where bedrijf = '${BEDRIJF}'`);
  check(/^[0-9a-f-]{36}$/.test(id), `kaart in de database (${id})`);
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
  check(sql(`select (volgende_actie_op - current_date) from public.klanten where id = '${id}'`) === "7", "over een week");
  await shot(page, "04-paneel-gevuld");
  await page.keyboard.press("Escape");
  await page.waitForSelector("aside[role=dialog]", { state: "detached" });

  stap("Slepen naar Offerte uit");
  await page.dragAndDrop(`#klant-${id}`, 'section[data-kolom="offerte"]');
  check((await tot(`select status from public.klanten where id = '${id}'`, "offerte")) === "offerte", "gesleept: status offerte");
  await page.waitForSelector(`section[data-kolom="offerte"] #klant-${id}`);
  check(sql(`select count(*) from public.klant_gesprekken where klant_id = '${id}' and soort = 'status'`) === "3", "elke verplaatsing in de tijdlijn");
  await shot(page, "05-bord", { fullPage: false });

  stap("Koppelingen met de bellijst en een getekende offerte");
  sql(`insert into public.leads (name, company, status, follow_up_on) values ('Fatima El Amrani', '${BEDRIJF}', 'terugbellen', current_date + 2)`);
  sql(`insert into public.offertes (bedrijf, contactpersoon, email, status, verstuurd_at, getekend_at, afzender_naam, afzender_email)
    values ('Bakkerij de Korenaar B.V.', 'Fatima El Amrani', 'fatima@korenaar.test', 'getekend', now() - interval '2 days', now(), 'Rens van Eyck', 'sales@react2u.nl')`);
  await page.reload();
  await page.waitForSelector(`#klant-${id}`);
  check(await page.locator(`#klant-${id} a[href^="/admin/offertes/"]:has-text('getekend')`).count(), "de getekende offerte als label op de kaart (andere schrijfwijze van de naam)");
  check(await page.locator(`#klant-${id} a[href^="/admin/bellijst"]:has-text('terugbellen')`).count(), "de bellijstlead als label op de kaart");
  check(await page.locator(`#klant-${id} button:has-text('Zet op Akkoord?')`).count(), "hint: de offerte is getekend, zet op akkoord");
  await page.click(`#klant-${id} button:has-text('Zet op Akkoord?')`);
  check((await tot(`select status from public.klanten where id = '${id}'`, "akkoord")) === "akkoord", "hint gevolgd: status akkoord");
  await page.waitForSelector(`section[data-kolom="akkoord"] #klant-${id}`);

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
  const cijfer = async (label) => page.locator(`div[role=dialog] p:has-text('${label}') + p`).first().innerText();
  check((await cijfer("Nieuw op het bord")) === "4", "4 nieuw");
  check((await cijfer("Bijwerken")) === "1", "1 bijwerken (de bakkerij, met B.V.)");
  check((await cijfer("Overslaan")) === "1", "1 overslaan (dubbel in het bestand)");
  check(await page.locator("div[role=dialog] li:has-text('I') >> text=Laatste stand").count() && (await page.locator("div[role=dialog] li:has-text('I') >> text=(aan de inhoud)").count()), "kolom I zonder kop herkend als laatste stand");
  check(await page.locator("div[role=dialog] li:has-text('J') >> text=Contactpersoon").count(), "kolom J zonder kop herkend als contactpersoon");
  check(await page.locator("div[role=dialog] >> text=Startdatum 1 januari 2026 ligt in het verleden; bedoel je 2027?").count(), "waarschuwing: startdatum 1-1 is dit jaar, bedoel je volgend jaar?");
  check(await page.locator("div[role=dialog] >> text=Staat al eerder in het bestand").count(), "waarschuwing: dubbele rij");
  check(await page.locator("div[role=dialog] tr:has-text('Bakkerij de Korenaar B.V.') >> text=status Akkoord → Inrichten").count(), "de bakkerij gaat van akkoord naar inrichten");
  check(await page.locator("div[role=dialog] tr:has-text('Hoveniersbedrijf Groen') >> text=Klant").count(), "'ingericht' wordt klant");
  await shot(page, "06-import-rapport");

  stap("Importeren, en nog een keer zonder dubbelen");
  await page.click("div[role=dialog] button:has-text('Importeer 5 rijen')");
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
  check((await cijfer("Ongewijzigd")) === "5", "tweede keer: alles ongewijzigd");
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

  check(paginafouten.length === 0, `geen fouten in de browser${paginafouten.length ? `: ${paginafouten.join(" | ")}` : ""}`);

  await browser.close();
  fs.writeFileSync(path.join(SHOTS, "resultaat.json"), JSON.stringify({ fout }, null, 2));
  console.log(fout.length ? `\n${fout.length} controle(s) mislukt:\n- ${fout.join("\n- ")}` : "\nKlantenbord: alles in orde.");
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
