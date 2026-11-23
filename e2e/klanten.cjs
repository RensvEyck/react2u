// Klantenlijst en stamkaart (0048) van begin tot eind: een klant die uit een getekende offerte, een getekend
// contract, een onboarding en een losse opdracht ontstaat; de knop Alle klanten op het bord en de link op de
// kaart; de lijst met alleen echte klanten (leads blijven op het bord), zoeken, het statusfilter en gestopte klanten op verzoek; de stamkaart met het voorstel uit de
// modules (en alles in één keer overnemen, met de bron in de tijdlijn), bewerken met controle van KvK en IBAN;
// de documenten uit alle modules met de pdf; een eigen bestand uploaden, downloaden en zonder sessie niet; de
// tariefafspraken uit de offerte en de losse opdracht en een afwijkende afspraak erbij; de tijdlijn met een
// gesprek vastleggen; alles op een telefoon zonder horizontaal scrollen van de pagina; en de klanten naar Excel en de
// stamkaarten in één keer aanvullen met een geplakt Excelblok (alleen lege velden, of overschrijven als je dat aanzet).
// Draaien via e2e/run.mjs (E2E_ALLEEN=klanten).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "klanten");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const ok = (s) => console.log(`  ✓ ${s}`);
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
/** Breder dan het scherm? Dan scrolt de hele pagina opzij op een telefoon. */
const teBreed = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

const RECOVER = `{"id":"a","sectie":"Aansluiting","label":"React2u Recover","kleur":"#E61674","naam":"Verzuimbegeleiding compleet","prijs":38.5,"eenheid":"medewerker_jaar","soort":"vast"}`;
const RIE = `{"id":"b","sectie":"Preventie","label":"React2u Resist","kleur":"#00A098","naam":"RI&E","prijs":1250,"eenheid":"eenmalig","soort":"optie"}`;
const ARTS = `{"id":"c","sectie":"Tarieven","label":"React2u Recover","kleur":"#E61674","naam":"Bedrijfsarts","prijs":95,"eenheid":"uur","soort":"tarief"}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
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

  stap("Een klant die uit de modules ontstaat: getekende offerte, getekend contract, onboarding en losse opdracht");
  // Een bedrijf dat geen andere test gebruikt: in CI draaien offerte, contract en klantenbord eerder en laten ze hun rijen staan
  // (een getekende offerte mag niet eens weg), en op de stamkaart telt alles met dezelfde bedrijfsnaam mee.
  sql("delete from public.klanten");
  sql("delete from public.losse_opdrachten where bedrijf like 'Houthandel Verhoeven%'");
  const offerte = sql(`insert into public.offertes (vorm, bedrijf, contactpersoon, email, telefoon, medewerkers, regels, keuze, status, verstuurd_at, keuze_at, getekend_at, getekend_naam, getekend_functie, getekend_email, factuur, afzender_naam, afzender_email)
    values ('verzuimbegeleiding', 'Houthandel Verhoeven', 'Joris Verhoeven', 'joris@verhoeven.test', '040 123 45 67', 12, '[${RECOVER},${RIE},${ARTS}]', '["a","b"]', 'getekend', now() - interval '10 days', now() - interval '8 days', now() - interval '7 days', 'Joris Verhoeven', 'Eigenaar', 'joris@verhoeven.test', '{"adres":"Postbus 12","postcode":"5600AA","plaats":"Eindhoven","kvk":"12345678","email":"facturen@verhoeven.test"}', 'Rens van Eyck', 'sales@react2u.nl')
    returning id || ' ' || nummer`).split("\n")[0].split(" ");
  const contract = sql(`insert into public.contracten (bedrijf, contactpersoon, email, status, ingangsdatum, einddatum, tekst, verstuurd_at, getekend_at, getekend_naam, getekend_functie, getekend_email, getekend_plaats, opdrachtgever)
    values ('Houthandel Verhoeven B.V.', 'Joris Verhoeven', 'joris@verhoeven.test', 'getekend', current_date, current_date + 365, repeat('x', 120), now() - interval '6 days', now() - interval '5 days', 'Henk Bax', 'Directeur', 'henk@verhoeven.test', 'Leende', '{"naam":"Houthandel Verhoeven B.V.","adres":"Paaldijk 11","postcode":"5595XL","plaats":"Leende","kvk":"17061007"}')
    returning id || ' ' || nummer`).split("\n")[0].split(" ");
  const onboarding = sql(`insert into public.onboardings (bedrijf, contactpersoon, email, documenten, invullen, status, verstuurd_at, casemanager, antwoorden)
    values ('Houthandel Verhoeven B.V.', 'Joris Verhoeven', 'joris@verhoeven.test', '{welkom,verzuimprotocol,inrichting}', '{inrichting}', 'verstuurd', now() - interval '4 days', 'Iki Jansen',
      '{"inrichting":{"data":{"bedrijfsnaam":"Houthandel Verhoeven B.V.","kvk":"17061007","btw":"NL001234567B01","factuur_straat":"Fabriekslaan 3","factuur_postcode":"5611 NB","factuur_plaats":"Eindhoven","factuur_email":"facturatie@verhoeven.test","contact_naam":"Joris Verhoeven","contact_functie":"HR-manager","contact_telefoon":"06 1234 5678","contact_email":"joris@verhoeven.test"},"at":"2026-11-15T10:00:00Z","door":"Joris Verhoeven"}}')
    returning id || ' ' || nummer`).split("\n")[0].split(" ");
  sql(`insert into public.losse_opdrachten (soort, bedrijf, omschrijving, vorm, bedrag, datum, verkoper) values ('eenmalig', 'Houthandel Verhoeven', 'Werkplekonderzoek', 'rie', 450, current_date - 20, 'Cindy')`);
  // Een lead, een klant in Akkoord, een gestopte klant (ooit contract retour) en een verloren lead op inactief.
  sql(`insert into public.klanten (bedrijf, status, contactpersoon, eigenaar, contract_retour) values ('Kapsalon Knip', 'lead', 'Sanne de Boer', 'Cindy', false), ('Garage Smits', 'akkoord', 'Piet Smits', 'Cindy', false), ('Oud Bedrijf', 'inactief', null, null, true), ('Verloren Lead', 'inactief', null, null, false)`);
  const klant = sql("select id from public.klanten where sleutel = 'houthandel verhoeven'").trim();
  check(klant.length === 36, "één kaart voor de offerte, het contract, de onboarding en de opdracht");
  check(sql(`select status from public.klanten where id = '${klant}'`) === "klant", "de losse opdracht zette de kaart op Klant");
  check(sql("select count(*) from public.klanten") === "5", "vijf kaarten: twee klanten, een lead, een gestopte klant en een verloren lead");

  stap("Van het bord naar de lijst");
  await page.goto(`${BASIS}/admin/klantenbord`);
  await page.waitForSelector("h1:has-text('Klantenbord')");
  await page.waitForSelector(`#klant-${klant}`);
  check(await page.locator(`#klant-${klant} a[href="/admin/klanten/${klant}"]`).count(), "de kaart op het bord linkt naar de stamkaart");
  check(await page.locator("a:has-text('Alle klanten')").count(), "knop Alle klanten op het bord");
  await shot(page, "00-bord", { fullPage: false });
  await page.click("a:has-text('Alle klanten')");
  await page.waitForURL(/\/admin\/klanten$/);
  await page.waitForSelector("h1:has-text('Klanten')");
  check(await page.locator(`tr[data-klant="${klant}"]`).count(), "de klant staat in de lijst");
  check(await page.locator("tr[data-klant]").count() === 2 && (await page.locator("tr[data-klant] >> text=Garage Smits").count()), "alleen echte klanten: de klant en de kaart in Akkoord; de lead en de gestopte niet");
  check((await page.locator("tr[data-klant] >> text=Kapsalon Knip").count()) === 0, "de lead blijft op het bord");
  check(await page.locator("text=2 klanten").count() && (await page.locator("a:has-text('2 op het bord')").count()), "telling: 2 klanten, 2 op het bord (de lead en de verloren lead)");
  check(await page.locator(`tr[data-klant="${klant}"] >> text=Joris Verhoeven`).count() && (await page.locator(`tr[data-klant="${klant}"] >> text=joris@verhoeven.test`).count()), "contactpersoon en mail uit de modules in de rij");
  check(await page.locator(`tr[data-klant="${klant}"] >> text=3/8`).count(), "stamkaart 3 van 8: contactpersoon, telefoon en mail zijn al bekend");
  await shot(page, "01-lijst", { fullPage: false });
  await page.fill("#kl-zoek", "verhoeven");
  await wacht(200);
  check(await page.locator("tr[data-klant]").count() === 1 && (await page.locator("text=1 van 3").count()), "zoeken op bedrijfsnaam");
  await page.fill("#kl-zoek", "");
  check((await page.locator("nav[aria-label='Status'] button:has-text('Lead')").count()) === 0, "geen filter op leads: die horen niet in de lijst");
  await page.click("button:has-text('Akkoord')");
  await wacht(200);
  check((await page.locator("tr[data-klant]").count()) === 1 && (await page.locator("tr[data-klant] >> text=Garage Smits").count()), "filter op de kolom Akkoord");
  await page.click("button:has-text('Alle')");
  await page.check("label:has-text('Ook gestopt') input");
  await wacht(200);
  check((await page.locator("tr[data-klant]").count()) === 3 && (await page.locator("tr[data-klant] >> text=Oud Bedrijf").count()) && (await page.locator("tr[data-klant] >> text=Verloren Lead").count()) === 0, "ook gestopt: de klant die ooit contract retour had erbij, de verloren lead niet");
  await page.click("label:has-text('Ook gestopt')");
  await page.click(`tr[data-klant="${klant}"] a`);
  await page.waitForURL(new RegExp(`/admin/klanten/${klant}$`));

  stap("De stamkaart met het voorstel uit de modules");
  await page.waitForSelector("h1:has-text('Houthandel Verhoeven')");
  const voorstel = Number(await page.getAttribute("[data-voorstel]", "data-voorstel"));
  check(voorstel >= 12, `${voorstel} gegevens al bekend uit de modules`);
  check((await page.locator('[data-veld="kvk"]').innerText()).includes("17061007") && (await page.locator('[data-veld="kvk"]').innerText()).includes(`contract ${contract[1]}`), "KvK uit het getekende contract, niet uit de offerte");
  check((await page.locator('[data-veld="bezoekadres"]').innerText()).includes("Paaldijk 11"), "bezoekadres uit het contract");
  check((await page.locator('[data-veld="postadres"]').innerText()).includes("Fabriekslaan 3"), "postadres uit de onboarding");
  check((await page.locator('[data-veld="medewerkers"]').innerText()).includes("12") && (await page.locator('[data-veld="medewerkers"]').innerText()).includes(`offerte ${offerte[1]}`), "aantal werknemers uit de offerte");
  check((await page.locator('[data-veld="casemanager"]').innerText()).includes("Iki Jansen"), "casemanager uit de onboarding");
  check((await page.locator('[data-veld="ondertekenaar"]').innerText()).includes("Henk Bax"), "bevoegd ondertekenaar: wie het contract tekende");
  check((await page.locator('[data-veld="website"]').innerText()).includes("verhoeven.test"), "website uit het e-mailadres");
  await shot(page, "02-stamkaart-voorstel");
  await page.click("button:has-text('Alles overnemen')");
  await page.waitForSelector("text=gegevens overgenomen uit de modules", { timeout: 20000 });
  check((await tot(`select kvk from public.klanten where id = '${klant}'`, "17061007")) === "17061007", "KvK overgenomen");
  const over = sql(`select bezoekadres || '|' || bezoek_postcode || '|' || bezoek_plaats || '|' || btw || '|' || factuur_email || '|' || medewerkers || '|' || casemanager || '|' || contact_functie || '|' || ondertekenaar || '|' || website || '|' || startdatum::text from public.klanten where id = '${klant}'`);
  check(over === `Paaldijk 11|5595 XL|Leende|NL001234567B01|facturatie@verhoeven.test|12|Iki Jansen|HR-manager|Henk Bax|https://verhoeven.test|${sql("select current_date")}`, `alles overgenomen, netjes gemaakt (${over})`);
  check(sql(`select contactpersoon || '|' || email from public.klanten where id = '${klant}'`) === "Joris Verhoeven|joris@verhoeven.test", "wat er al stond, bleef staan");
  const regel = sql(`select tekst || ' | ' || contact::text from public.klant_gesprekken where klant_id = '${klant}' and soort = 'stamkaart' order by created_at desc limit 1`);
  check(regel.startsWith(`Stamkaart aangevuld uit de modules: KvK-nummer (contract ${contract[1]}), `) && regel.endsWith(" | false"), `in de tijdlijn met de bron, geen contact (${regel.slice(0, 80)}…)`);
  check((await page.locator("[data-voorstel]").count()) === 0, "geen voorstel meer: alles is overgenomen");
  check(await page.locator("text=Stamkaart compleet").count(), "stamkaart compleet");
  await shot(page, "03-stamkaart");

  stap("Bewerken, met controle van KvK en IBAN");
  await page.click("button:has-text('Bewerken')");
  await page.waitForSelector("#sk-iban");
  await page.fill("#sk-kvk", "123");
  await page.fill("#sk-iban", "nl91 abna 0417 1643 00");
  await page.fill("#sk-rechtsvorm", "B.V.");
  await page.fill("#sk-iban_naam", "Houthandel Verhoeven B.V.");
  await shot(page, "04-bewerken");
  await page.click("button:has-text('Opslaan')");
  await page.waitForSelector("text=Een KvK-nummer heeft acht cijfers.");
  await page.fill("#sk-kvk", "17061007");
  await page.fill("#sk-iban", "NL91ABNA0417164301");
  await page.click("button:has-text('Opslaan')");
  await page.waitForSelector("text=Het IBAN klopt niet");
  await page.fill("#sk-iban", "nl91 abna 0417 1643 00");
  await page.click("button:has-text('Opslaan')");
  await page.waitForSelector("text=Stamkaart opgeslagen.", { timeout: 20000 });
  check((await tot(`select iban from public.klanten where id = '${klant}'`, "NL91ABNA0417164300")) === "NL91ABNA0417164300", "IBAN opgeslagen zoals de bank hem schrijft");
  check(sql(`select rechtsvorm || '|' || iban_naam from public.klanten where id = '${klant}'`) === "B.V.|Houthandel Verhoeven B.V.", "rechtsvorm en tenaamstelling");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${klant}' and soort = 'stamkaart' order by created_at desc limit 1`) === "Stamkaart bijgewerkt: Rechtsvorm, IBAN, Tenaamstelling", "alleen wat veranderde in de tijdlijn");
  check(await page.locator("text=NL91 ABNA 0417 1643 00").count(), "IBAN in groepjes van vier");

  stap("Documenten uit alle modules");
  await page.click("nav[aria-label='Stamkaart'] a:has-text('Documenten')");
  await page.waitForURL(/tab=documenten/);
  await page.waitForSelector("tr[data-document]");
  const docs = async (soort) => page.locator(`tr[data-document="${soort}"]`).count();
  check((await docs("offerte")) === 1 && (await docs("contract")) === 1 && (await docs("checklist")) === 1 && (await docs("onboarding")) === 1, `offerte, basiscontract, checklist en onboarding in de lijst (${await docs("offerte")}, ${await docs("contract")}, ${await docs("checklist")}, ${await docs("onboarding")})`);
  check(await page.locator(`text=Offerte Recover ${offerte[1]}`).count(), "de offerte met zijn label en nummer");
  check(await page.locator("text=getekend door Joris Verhoeven").count(), "wie de offerte tekende");
  check(await page.locator("tr[data-document='checklist'] >> text=nog niet ingevuld").count(), "de checklist bij het contract, nog niet ingevuld");
  check(await page.locator(`a[href="/admin/offertevoorbeeld/${offerte[0]}/pdf?download=1"]`).count(), "pdf van de getekende offerte");
  check(await page.locator(`a[href="/admin/contractvoorbeeld/${contract[0]}/pdf?download=1"]`).count(), "pdf van het getekende contract");
  check(await page.locator(`a[href="/admin/onboardingvoorbeeld/${onboarding[0]}/pdf/verzuimprotocol"]`).count(), "verzuimprotocol van de onboarding");
  await page.click("button:has-text('Basiscontract')");
  await wacht(200);
  check((await page.locator("tr[data-document]").count()) === 1, "filter op soort");
  await page.click("button:has-text('Alles')");
  await shot(page, "05-documenten");

  stap("Een eigen bestand uploaden, downloaden, en zonder sessie niet");
  const pdfPad = path.join(SHOTS, "Contract Verhoeven per post (getekend).pdf");
  fs.writeFileSync(pdfPad, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const txtPad = path.join(SHOTS, "notities.txt");
  fs.writeFileSync(txtPad, "niet toegestaan");
  await page.check('input[name="kb-soort"][value="overeenkomst"]');
  await page.fill("#kb-omschrijving", "per post ontvangen");
  await page.setInputFiles("#kb-bestand", [pdfPad, txtPad]);
  await page.waitForSelector("text=Bestand geüpload.", { timeout: 20000 });
  await page.waitForSelector("a:has-text('Contract Verhoeven per post (getekend).pdf')");
  check(await page.locator("text=notities.txt: alleen pdf, Word").count(), "een tekstbestand mag niet, de pdf wel");
  const rij = sql(`select id || '|' || soort || '|' || coalesce(omschrijving, '') || '|' || pad || '|' || type from public.klant_bestanden where klant_id = '${klant}'`).trim().split("|");
  check(rij[1] === "overeenkomst" && rij[2] === "per post ontvangen" && rij[3].startsWith(`${klant}/`) && rij[4] === "application/pdf", `in de database: ${rij.slice(1).join(" | ")}`);
  check(sql(`select count(*) from storage.objects where bucket_id = 'klantbestanden' and name = '${rij[3]}'`).trim() === "1", "het bestand staat in de privébucket");
  const dl = await page.request.get(`${BASIS}/admin/klantbestand/${rij[0]}`);
  check(dl.status() === 200 && (await dl.body()).subarray(0, 5).toString() === "%PDF-", `download: ${dl.status()}`);
  check(/attachment; filename=".*per post \(getekend\)\.pdf"/.test(dl.headers()["content-disposition"] || "") && dl.headers()["x-content-type-options"] === "nosniff", `als download met de originele naam: ${dl.headers()["content-disposition"]}`);
  const vreemd = await browser.newContext();
  const anoniem = await vreemd.request.get(`${BASIS}/admin/klantbestand/${rij[0]}`, { maxRedirects: 0 });
  check(anoniem.status() !== 200 || (await anoniem.body()).subarray(0, 5).toString() !== "%PDF-", `zonder sessie geen bestand (${anoniem.status()})`);
  await vreemd.close();
  await page.waitForSelector("tr[data-document='bestand']", { timeout: 10000 });
  check(await page.locator("tr[data-document='bestand'] >> text=getekend stuk").count(), "het bestand staat ook in de documentenlijst");
  await shot(page, "06-bestand");

  stap("Tariefafspraken uit de offerte en de losse opdracht, en een afwijkende afspraak erbij");
  await page.click("nav[aria-label='Stamkaart'] a:has-text('Tariefafspraken')");
  await page.waitForURL(/tab=tarieven/);
  await page.waitForSelector(`[data-offerte="${offerte[1]}"]`);
  // innerText geeft de tekst zoals hij op het scherm staat, dus de labels in hoofdletters (uppercase in CSS).
  const kaart = (await page.locator(`[data-offerte="${offerte[1]}"]`).innerText()).toLowerCase();
  check(kaart.includes("verzuimbegeleiding compleet") && kaart.includes("€38,50 per medewerker per jaar") && kaart.includes("12 medewerkers"), "de vaste regel met het bedrag zoals op de offerte");
  check(kaart.includes("react2u resist") && kaart.includes("ri&e") && kaart.includes("€1.250 eenmalig"), "de gekozen optie onder haar eigen label");
  check(kaart.includes("bedrijfsarts") && kaart.includes("€95 per uur") && kaart.includes("bij gebruik"), "het tarief bij gebruik");
  check(kaart.includes("€38,50") && kaart.includes("per maand") && kaart.includes("€1.250") && kaart.includes("eenmalig"), "de totalen van de offerte");
  check(await page.locator("text=Werkplekonderzoek").count() && (await page.locator("[data-los] >> text=€450").count()), "de losse opdracht met het bedrag");
  await page.click("button:has-text('Afspraak toevoegen')");
  await page.fill("#ta-omschrijving", "Uurtarief bedrijfsarts op locatie");
  await page.selectOption("#ta-label", "recover");
  await page.fill("#ta-bedrag", "95");
  await page.selectOption("#ta-eenheid", "uur");
  await page.fill("#ta-notitie", "Afgesproken met Henk bij het tekenen");
  await page.click("button:has-text('Afspraak vastleggen')");
  await page.waitForSelector("[data-tarief]", { timeout: 20000 });
  const tarief = sql(`select id || '|' || label || '|' || bedrag || '|' || eenheid || '|' || coalesce(ingangsdatum::text, '') from public.klant_tarieven where klant_id = '${klant}'`).trim().split("|");
  check(tarief[1] === "recover" && tarief[2] === "95.00" && tarief[3] === "uur" && tarief[4] === sql("select current_date"), `in de database: ${tarief.slice(1).join(" | ")}`);
  check(await page.locator("[data-tarief] >> text=€95 per uur").count(), "op de stamkaart: €95 per uur");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${klant}' and soort = 'stamkaart' order by created_at desc limit 1`) === "Tariefafspraak vastgelegd: Uurtarief bedrijfsarts op locatie", "in de tijdlijn");
  await shot(page, "07-tarieven");
  await page.click("button[aria-label='Wijzig Uurtarief bedrijfsarts op locatie']");
  await page.fill("#ta-bedrag", "100");
  await page.click("button:has-text('Wijziging opslaan')");
  check((await tot(`select bedrag::text from public.klant_tarieven where id = '${tarief[0]}'`, "100.00")) === "100.00", "wijzigen");
  await page.waitForSelector("[data-tarief] >> text=€100 per uur");

  stap("De tijdlijn, met een gesprek vastleggen");
  await page.click("nav[aria-label='Stamkaart'] a:has-text('Tijdlijn')");
  await page.waitForURL(/tab=tijdlijn/);
  await page.waitForSelector("text=Stamkaart aangevuld uit de modules");
  check(await page.locator("text=Tariefafspraak vastgelegd").count(), "de tariefafspraak in de tijdlijn");
  await page.fill("#kl-tekst", "Gebeld over de eerste factuur");
  await page.click("button:has-text('Vastleggen')");
  await page.waitForSelector("li >> text=Gebeld over de eerste factuur", { timeout: 20000 });
  check((await tot(`select laatste_contact from public.klanten where id = '${klant}'`, "Gebeld over de eerste factuur")) === "Gebeld over de eerste factuur", "het laatste contact op de kaart");
  await shot(page, "08-tijdlijn");

  stap("Op een telefoon");
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL", storageState: await ctx.storageState() });
  const mp = await tel.newPage();
  mp.on("pageerror", (e) => paginafouten.push(String(e)));
  await mp.goto(`${BASIS}/admin/klanten`);
  await mp.waitForSelector("tr[data-klant]");
  check(!(await teBreed(mp)), "de lijst maakt de pagina niet breder dan het scherm");
  await shot(mp, "09-telefoon-lijst", { fullPage: false });
  await mp.goto(`${BASIS}/admin/klanten/${klant}`);
  await mp.waitForSelector("h1:has-text('Houthandel Verhoeven')");
  check(!(await teBreed(mp)), "de stamkaart past op het scherm");
  await shot(mp, "10-telefoon-stamkaart");
  await mp.goto(`${BASIS}/admin/klanten/${klant}?tab=documenten`);
  await mp.waitForSelector("tr[data-document]");
  check(!(await teBreed(mp)), "de documenten passen op het scherm");
  await shot(mp, "11-telefoon-documenten", { fullPage: false });
  await mp.goto(`${BASIS}/admin/klanten/${klant}?tab=tarieven`);
  await mp.waitForSelector(`[data-offerte="${offerte[1]}"]`);
  check(!(await teBreed(mp)), "de tarieven passen op het scherm");
  await shot(mp, "12-telefoon-tarieven");
  await tel.close();

  stap("Alle klanten naar Excel, en de stamkaarten in één keer aanvullen (Rens, 23 nov 2026)");
  await page.goto(`${BASIS}/admin/klanten`);
  await page.waitForSelector("tr[data-klant]");
  const paneel = page.locator("section[aria-label='Stamkaarten']");
  check((await paneel.locator("[data-stamkaarten-compleet]").getAttribute("data-stamkaarten-compleet")) === "1/2", "het paneel: 1 van de 2 stamkaarten compleet");
  check(await paneel.locator("text=Ontbreekt het vaakst").count() && (await paneel.locator("li:has-text('KvK-nummer')").count()), "wat het vaakst ontbreekt");
  check(await paneel.locator("button:has-text('Vul aan uit Excel')").count() && (await paneel.locator("button:has-text('Exporteer naar Excel')").count()), "de twee acties in het paneel");
  await paneel.screenshot({ path: path.join(SHOTS, "13a-paneel.png") });
  const [download] = await Promise.all([page.waitForEvent("download"), paneel.locator("button:has-text('Exporteer naar Excel')").click()]);
  const exportPad = path.join(SHOTS, "export-klanten.xlsx");
  await download.saveAs(exportPad);
  const exportTekst = fs.readFileSync(exportPad).toString("latin1");
  check(/^Klanten React2u \d{4}-\d{2}-\d{2}\.xlsx$/.test(download.suggestedFilename()), `bestandsnaam ${download.suggestedFilename()}`);
  check(exportTekst.startsWith("PK") && exportTekst.includes("KvK-nummer") && exportTekst.includes("Houthandel Verhoeven") && exportTekst.includes("17061007"), "het Excelbestand met de stamkaart als kolommen");
  check(!exportTekst.includes("Kapsalon Knip"), "alleen echte klanten in de export, geen leads");

  // Wat een werknemer in Excel bijhield: straat en huisnummer apart, een KvK die niet klopt, en een bedrijf dat er nog niet is.
  const plak = [
    ["Klant", "KvK-nummer", "Straat", "Huisnummer", "Postcode", "Plaats", "Factuur e-mail", "IBAN", "Aantal werknemers", "Branche", "Debiteurnummer"],
    ["Houthandel Verhoeven B.V.", "12345678", "Paaldijk", "11", "5595XL", "Leende", "nieuw@verhoeven.test", "NL91 ABNA 0417 1643 00", "14", "Houthandel", "D-1042"],
    ["Garage Smits", "17061008", "Markt", "3", "5611 nb", "Eindhoven", "admin@smits.test", "NL91ABNA0417164300", "8", "Garage", "D-2001"],
    ["Drukkerij Van Dam", "12", "Industrieweg", "40", "5612 AB", "Eindhoven", "", "", "", "Drukkerij", ""],
  ].map((r) => r.join("\t")).join("\n");
  await paneel.locator("button:has-text('Vul aan uit Excel')").click();
  await page.waitForSelector("div[role=dialog] h2:has-text('Stamkaarten aanvullen')");
  check(await page.locator("div[role=dialog] [aria-current=step]:has-text('Bestand')").count(), "stap 1: bestand");
  check(await page.locator("div[role=dialog] button:has-text('Download Excel (2 klanten)')").count(), "in stap 1 de lijst downloaden om in te vullen");
  check(await page.locator("div[role=dialog] li:has-text('KvK-nummer')").count(), "de stamkaartkolommen die we herkennen");
  await shot(page, "13b-import-bestand", { fullPage: false });
  await page.click("div[role=dialog] summary:has-text('Of plak de rijen uit Excel')");
  await page.fill("#kb-plak", plak);
  await page.click("div[role=dialog] button:has-text('Rijen lezen')");
  await page.waitForSelector("div[role=dialog] [aria-label='Stamkaart']", { timeout: 20000 });
  check(await page.locator("div[role=dialog] [aria-current=step]:has-text('Controleren')").count(), "stap 2: controleren");
  check(await page.locator("div[role=dialog] >> text=15 gegevens").count() && (await page.locator("div[role=dialog] >> text=voor 3 stamkaarten").count()), "in één zin: 15 gegevens voor 3 stamkaarten");
  check((await page.locator("div[role=dialog] li[data-kolom='kvk']").count()) === 1 && (await page.locator("div[role=dialog] li[data-kolom='huisnummer']").count()) === 1 && (await page.locator("div[role=dialog] li[data-kolom='debiteurnummer']").count()) === 1, "KvK, huisnummer en debiteurnummer herkend");
  const velden = async (bedrijf, soort) => (await page.locator(`div[role=dialog] [data-wat="${bedrijf}"] [data-gegeven="${soort}"]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-velden")))).join(",");
  check((await velden("Houthandel Verhoeven B.V.", "aangevuld")) === "branche,debiteurnummer", `Verhoeven: alleen wat leeg is (${await velden("Houthandel Verhoeven B.V.", "aangevuld")})`);
  check((await velden("Houthandel Verhoeven B.V.", "behouden")) === "kvk,medewerkers,factuur_email", `Verhoeven: wat anders is, blijft staan (${await velden("Houthandel Verhoeven B.V.", "behouden")})`);
  check((await page.locator('div[role=dialog] [data-wat="Houthandel Verhoeven B.V."] [data-velden="kvk"]').innerText()).includes("in het bestand: 12345678"), "bij wat blijft staan: wat er in het bestand stond");
  check((await velden("Garage Smits", "aangevuld")) === "kvk,branche,medewerkers,bezoekadres,bezoek_postcode,bezoek_plaats,factuur_email,iban,debiteurnummer", "Garage Smits: de hele stamkaart");
  check((await page.locator('div[role=dialog] [data-wat="Garage Smits"] [data-velden="bezoekadres,bezoek_postcode,bezoek_plaats"]').innerText()).includes("Markt 3, 5611 NB Eindhoven"), "het adres als één regel, netjes gemaakt");
  check((await page.locator('div[role=dialog] [data-wat="Garage Smits"] [data-velden="iban"]').innerText()).includes("NL91 ABNA 0417 1643 00"), "het IBAN zoals de bank hem schrijft");
  check((await page.locator("div[role=dialog] li[data-regel='3'] [data-volledig]").getAttribute("data-volledig")) === "1-6", "de stamkaart van Garage Smits gaat van 1 naar 6 van 8");
  check(await page.locator("div[role=dialog] li[data-regel]:has-text('Drukkerij Van Dam') >> text=KvK-nummer \"12\" heeft geen acht cijfers").count(), "een KvK die niet klopt, staat erbij en laat de rest door");
  check(await page.locator("div[role=dialog] li[data-regel]:has-text('Drukkerij Van Dam') >> text=Klant").count(), "een nieuw bedrijf komt als klant binnen");
  check(await page.locator("div[role=dialog] >> text=3 gegevens staan al anders op de stamkaart").count(), "het rapport telt wat blijft staan");
  await shot(page, "13-import-rapport");
  await page.click("div[role=dialog] button[role=tab]:has-text('Aandacht')");
  check((await page.locator("div[role=dialog] li[data-regel]").count()) === 1, "filter Aandacht: alleen de drukkerij");
  await page.click("div[role=dialog] button[role=tab]:has-text('Alles')");
  await page.setViewportSize({ width: 390, height: 844 });
  await wacht(300);
  check(!(await teBreed(page)), "het rapport past op een telefoon");
  await shot(page, "14-import-rapport-telefoon", { fullPage: false });
  await page.locator("div[role=dialog] li[data-regel='3']").scrollIntoViewIfNeeded();
  await shot(page, "14b-import-rij-telefoon", { fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click("div[role=dialog] button:has-text('Importeer 3 rijen')");
  await page.waitForSelector("div[role=dialog] [data-klaar]", { timeout: 30000 });
  check(await page.locator("div[role=dialog] [data-klaar] h3:has-text('3 stamkaarten aangevuld')").count() && (await page.locator("div[role=dialog] [data-klaar] >> text=15 gegevens · 1 nieuwe klant · 2 bijgewerkt").count()), "stap 3: 3 stamkaarten aangevuld, 15 gegevens, 1 nieuwe klant");
  check((await page.locator("div[role=dialog] [data-klaar] a[href^='/admin/klanten/']").count()) === 3, "met een link naar elke stamkaart");
  await shot(page, "13c-import-klaar", { fullPage: false });
  await page.click("div[role=dialog] button:has-text('Sluiten')");
  await page.waitForSelector("section[aria-label='Stamkaarten'] [role=status]:has-text('3 stamkaarten aangevuld en 1 nieuwe klant.')", { timeout: 20000 });
  ok("na Sluiten: de melding in het paneel");
  const smits = sql("select id from public.klanten where sleutel = 'garage smits'");
  check(sql(`select concat_ws('|', kvk, bezoekadres, bezoek_postcode, bezoek_plaats, factuur_email, iban, medewerkers, branche, debiteurnummer, status) from public.klanten where id = '${smits}'`) === "17061008|Markt 3|5611 NB|Eindhoven|admin@smits.test|NL91ABNA0417164300|8|Garage|D-2001|akkoord", "Garage Smits: de stamkaart gevuld, netjes gemaakt, de status ongemoeid");
  check(sql(`select concat_ws('|', kvk, factuur_email, medewerkers, branche, debiteurnummer) from public.klanten where id = '${klant}'`) === "17061007|facturatie@verhoeven.test|12|Houthandel|D-1042", "Verhoeven: alleen de lege velden aangevuld");
  check(sql("select concat_ws('|', status, coalesce(kvk, '-'), bezoekadres, branche) from public.klanten where sleutel = 'drukkerij van dam'") === "klant|-|Industrieweg 40|Drukkerij", "Drukkerij Van Dam: nieuw als klant, zonder de KvK die niet klopte");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${smits}' and soort = 'stamkaart' order by created_at desc limit 1`).startsWith("Stamkaart aangevuld uit de klantlijst (regel 3): KvK-nummer, Branche"), "in de tijdlijn van Garage Smits");
  check(sql(`select count(*) from public.klant_gesprekken where klant_id = '${klant}' and soort = 'import' and created_at > now() - interval '1 minute'`) === "0", "geen lege importregel als alleen de stamkaart veranderde");
  await page.waitForSelector("tr[data-klant] >> text=Drukkerij Van Dam");
  ok("de nieuwe klant staat in de lijst");
  check((await page.locator("section[aria-label='Stamkaarten'] [data-stamkaarten-compleet]").getAttribute("data-stamkaarten-compleet")) === "1/3", "het paneel telt mee: nu 3 klanten");

  stap("Overschrijven, als je dat aanzet");
  await page.click("section[aria-label='Stamkaarten'] button:has-text('Vul aan uit Excel')");
  await page.click("div[role=dialog] summary:has-text('Of plak de rijen uit Excel')");
  await page.fill("#kb-plak", "Klant\tKvK-nummer\nHouthandel Verhoeven\t12345678");
  await page.click("div[role=dialog] button:has-text('Rijen lezen')");
  await page.waitForSelector("div[role=dialog] [data-gegeven='behouden']", { timeout: 20000 });
  check(await page.locator("div[role=dialog] button:has-text('Niets te importeren')").count(), "zonder overschrijven: niets te doen");
  await page.click("#kb-overschrijven");
  await page.waitForSelector("div[role=dialog] [data-gegeven='overschreven']");
  const vervangt = await page.locator("div[role=dialog] [data-gegeven='overschreven']").innerText();
  check(vervangt.includes("12345678") && vervangt.includes("was 17061007"), `met overschrijven: de nieuwe KvK en wat er stond (${vervangt.replace(/\n/g, " ")})`);
  await shot(page, "15-import-overschrijven", { fullPage: false });
  await page.click("div[role=dialog] button:has-text('Importeer 1 rij')");
  await page.waitForSelector("div[role=dialog] [data-klaar] h3:has-text('1 stamkaart aangevuld')", { timeout: 30000 });
  await page.click("div[role=dialog] button:has-text('Sluiten')");
  check((await tot(`select kvk from public.klanten where id = '${klant}'`, "12345678")) === "12345678", "de KvK overschreven");
  check(sql(`select tekst from public.klant_gesprekken where klant_id = '${klant}' and soort = 'stamkaart' order by created_at desc limit 1`) === "Stamkaart bijgewerkt uit de klantlijst (regel 2): overschreven: KvK-nummer", "overschreven in de tijdlijn");
  sql(`update public.klanten set kvk = '17061007' where id = '${klant}'`);
  sql("delete from public.klanten where sleutel = 'drukkerij van dam'");

  stap("Weer terug op het bord");
  await page.goto(`${BASIS}/admin/klanten/${klant}`);
  await page.click("a:has-text('Op het bord')");
  await page.waitForURL(/\/admin\/klantenbord#klant-/);
  await page.waitForSelector("aside[role=dialog] h2:has-text('Houthandel Verhoeven')");
  check(await page.locator(`aside[role=dialog] a[href="/admin/klanten/${klant}"]`).count(), "het paneel linkt terug naar de stamkaart");
  check(await page.locator("aside[role=dialog] >> text=Stamkaart bijgewerkt: Rechtsvorm, IBAN, Tenaamstelling").count(), "de wijziging van de stamkaart staat in de tijdlijn van het paneel");

  // De losse opdracht weer weg: e2e/dashboard.cjs verwacht later een lege verkoop.
  sql("delete from public.losse_opdrachten where bedrijf = 'Houthandel Verhoeven'");

  check(paginafouten.length === 0, `geen fouten in de browser${paginafouten.length ? `: ${paginafouten.join(" | ")}` : ""}`);

  await browser.close();
  fs.writeFileSync(path.join(SHOTS, "resultaat.json"), JSON.stringify({ fout }, null, 2));
  console.log(fout.length ? `\n${fout.length} controle(s) mislukt:\n- ${fout.join("\n- ")}` : "\nKlantenlijst en stamkaart: alles in orde.");
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
