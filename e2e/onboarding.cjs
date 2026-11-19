// Onboarding (0037) van begin tot eind: aanmaken in het beheer met de documentkeuze, het voorbeeld (hub en een
// stap), versturen, de klant opent de hub (melding aan sales) en gaat per stap naar zijn eigen pagina: afvinken,
// online invullen (inrichting, werknemers met BSN en plakken uit Excel, machtiging), de pdf's en het Excelbestand,
// alles compleet (melding), het beheer vinkt zijn eigen taken af tot de klant is ingericht, het register, intrekken
// en een onbekende link. Draaien via e2e/run.mjs (E2E_ALLEEN=onboarding).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, onboardingLink, totp, geheim, sql, maakXlsx } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "onboarding");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? ok(s) : (fout.push(s), console.log(`  ✗ ${s}`)));
const shot = (page, naam, opts = {}) => page.screenshot({ path: path.join(SHOTS, `${naam}.png`), fullPage: true, ...opts });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const BEDRIJF = "Bakkerij De Korenaar";

/** Wacht op een mail met dit onderwerp (de seintjes gaan na het antwoord, via after()). */
async function mailMet(re) {
  for (let i = 0; i < 30; i++) {
    const m = mails().find((x) => re.test(x.subject || ""));
    if (m) return m;
    await wacht(500);
  }
  return null;
}

const isPdf = (r, body) => r.status() === 200 && r.headers()["content-type"] === "application/pdf" && body.subarray(0, 5).toString() === "%PDF-";
const isXlsx = (r, body) => r.status() === 200 && /spreadsheetml/.test(r.headers()["content-type"] || "") && body.subarray(0, 2).toString() === "PK";
const bijlagePdf = (m) => Boolean(m?.attachments?.[0]?.filename?.endsWith(".pdf")) && Buffer.from(m.attachments[0].content, "base64").subarray(0, 5).toString() === "%PDF-";
const machtigingLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/machtiging\/[a-f0-9]{48,})"/)?.[1];
/** Een handtekening zetten: een golvende lijn over het doek, zoals in e2e/contract.cjs. */
async function teken(pagina, selector) {
  await pagina.locator(selector).scrollIntoViewIfNeeded();
  const doek = await pagina.locator(selector).boundingBox();
  await pagina.mouse.move(doek.x + 30, doek.y + doek.height * 0.6);
  await pagina.mouse.down();
  for (let i = 1; i <= 40; i++) {
    await pagina.mouse.move(doek.x + 30 + i * ((doek.width - 60) / 40), doek.y + doek.height * 0.6 - Math.sin(i / 3) * 22 - (i % 7) * 2, { steps: 2 });
  }
  await pagina.mouse.up();
}

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
  ok("ingelogd");

  stap("Overzicht (leeg) en het menu");
  await page.goto(`${BASIS}/admin/onboarding`);
  await page.waitForSelector("h1:has-text('Onboarding')");
  check(await page.locator("text=Nog geen onboardings").count(), "lege staat");
  check(await page.locator('aside nav a[href="/admin/documenten"][aria-current="page"]').count(), "Onboarding valt onder Documenten in het menu");
  await shot(page, "01-overzicht-leeg", { fullPage: false });

  stap("Nieuwe onboarding met de documentkeuze");
  await page.goto(`${BASIS}/admin/onboarding/nieuw`);
  await page.waitForSelector("#ob-bedrijf");
  check((await page.inputValue("#ob-bericht")).includes("{bedrijf}"), "persoonlijk woord met invulveld");
  check((await page.inputValue("#ob-ae")) === "sales@react2u.nl", "afzender is de salesbox");
  check(await page.locator("text=5 mee · 2 online invullen").count(), "standaard: vijf documenten mee, twee online");
  await page.fill("#ob-bedrijf", BEDRIJF);
  await page.fill("#ob-cp", "Fatima El Amrani");
  await page.fill("#ob-email", "fatima@korenaar.test");
  await page.fill("#ob-tel", "040 123 45 67");
  await page.fill("#ob-an", "Rens van Eyck");
  await page.fill("#ob-af", "Bestuurder");
  await page.fill("#ob-at", "06 12345678");
  // De machtiging (van arbo naar arbo) hoort niet meer bij de documenten van de werkgever: die loopt via Werknemer.
  check((await page.locator("label:has-text('Machtiging overdracht verzuimdossier')").count()) === 0, "geen machtiging in de documentkeuze van de werkgever");
  check(await page.locator("text=5 mee · 2 online invullen").count(), "vijf mee, twee online");
  await shot(page, "02-nieuw");
  await page.click("button:has-text('Onboarding aanmaken')");
  await page.waitForURL(/\/admin\/onboarding\/[0-9a-f-]{36}/, { timeout: 30000 });
  const adminUrl = page.url().split("?")[0];
  const id = adminUrl.split("/").pop();
  check(await page.locator("text=/O\\d{4}-\\d{4}/").count(), "nummer O<jaar>-<volgnummer>");
  check(await page.locator("span:has-text('Concept')").count(), "status concept");
  check((await page.locator("#inrichten").count()) === 0, "checklist van React2u nog niet bij een concept");
  check(await page.locator("text=0 van 5 klaar").count(), "voortgang: 0 van 5");
  const vbLink = await page.getAttribute("a:has-text('Voorbeeld')", "href");
  check(vbLink === `/admin/onboardingvoorbeeld/${id}`, `voorbeeld in het beheer (${vbLink})`);
  check(sql(`select array_to_string(documenten, ',') from public.onboardings where id = '${id}'`) === "welkom,inrichting,werknemers,verzuimprotocol,vragen", "documenten in de volgorde van het verhaal");
  check(sql(`select array_to_string(invullen, ',') from public.onboardings where id = '${id}'`) === "inrichting,werknemers", "twee documenten online in te vullen");
  await shot(page, "03-beheer-concept");

  stap("Voorbeeld (hub en een stap), pdf en Excel vanuit het beheer");
  const vb = await ctx.newPage();
  vb.on("pageerror", (e) => paginafouten.push(String(e)));
  await vb.goto(`${BASIS}${vbLink}`);
  await vb.waitForSelector("h1");
  check(await vb.locator("text=Voorbeeld van een concept").count(), "voorbeeldmelding bij een concept");
  check(await vb.locator("h1:has-text('Welkom')").count(), "de kop");
  check(await vb.locator("text=Beste Fatima,").count(), "aanhef met de voornaam");
  check(await vb.locator(`text=Fijn dat we voor ${BEDRIJF} aan de slag gaan`).count(), "{bedrijf} ingevuld in het persoonlijke woord");
  check((await vb.locator("section[id^=hoofdstuk-]").count()) === 3, "drie hoofdstukken op de hub");
  check((await vb.locator("section[id^=hoofdstuk-] ol > li > a").count()) === 5, "vijf stappen als kaarten, elk naar een eigen pagina");
  check((await vb.locator('nav[aria-label="Hoofdstukken van de onboarding"] a').count()) === 4, "drie hoofdstukken en het vervolg in de kopbalk");
  check(await vb.locator("#verder >> text=Zo gaat het verder").count(), "het vervolg: wat React2u daarna doet");
  check(await vb.locator("text=Handig om bij de hand te hebben").count() && (await vb.locator("text=KvK-nummer").count()), "wat je bij de hand moet hebben");
  check((await vb.locator("text=IBAN").count()) === 0, "geen IBAN meer: React2u incasseert niet");
  check((await vb.locator("div.fixed:has-text('Stap 1')").count()) === 0, "geen balk naar de volgende stap in het voorbeeld");
  await shot(vb, "04-voorbeeld-hub");
  await vb.goto(`${BASIS}${vbLink}/inrichting`);
  await vb.waitForSelector("#stap-inrichting");
  check(await vb.locator("header a:has-text('Overzicht')").count(), "stappagina: terug naar het overzicht in de kopbalk");
  check(await vb.locator("text=Hoofdstuk 2 van 3").count() && (await vb.locator("text=Stap 2 van 5").count()), "stappagina: waar je bent in het verhaal");
  check(await vb.locator("#stap-inrichting button:has-text('Gegevens opslaan')[disabled]").count(), "in het voorbeeld kan niets worden opgeslagen");
  check((await vb.locator("#ob-inrichting-iban").count()) === 0, "geen IBAN-veld");
  check(await vb.locator("a:has-text('Volgende stap: Werknemersbestand')").count(), "volgende stap onderaan");
  await shot(vb, "04b-voorbeeld-stap");
  await vb.close();
  for (const d of ["welkom", "verzuimprotocol", "vragen", "inrichting"]) {
    const r = await page.request.get(`${BASIS}/admin/onboardingvoorbeeld/${id}/pdf/${d}?download=1`);
    const body = await r.body();
    check(isPdf(r, body) && /^attachment;/.test(r.headers()["content-disposition"] || ""), `pdf ${d} uit het beheer: ${r.status()}, ${body.length} bytes`);
    fs.writeFileSync(path.join(SHOTS, `${d}.pdf`), body);
  }
  const xl = await page.request.get(`${BASIS}/admin/onboardingvoorbeeld/${id}/excel`);
  check(isXlsx(xl, await xl.body()), `leeg werknemersbestand uit het beheer: ${xl.status()}`);
  const geenPdf = await page.request.get(`${BASIS}/admin/onboardingvoorbeeld/${id}/pdf/werknemers`);
  check(geenPdf.status() === 404, "het werknemersbestand is geen pdf (404)");
  const geenStap = await page.request.get(`${BASIS}/admin/onboardingvoorbeeld/${id}/onzin`);
  check(geenStap.status() === 404, "een onbekende stap: 404");

  stap("Versturen");
  await page.goto(adminUrl);
  await page.waitForSelector("#vs-aan");
  check((await page.inputValue("#vs-aan")) === "fatima@korenaar.test", "aan: het adres van de klant");
  check((await page.inputValue("#vs-bericht")).includes(`onboarding voor ${BEDRIJF}`), "standaardbericht over de onboarding");
  await page.click("button:has-text('Verstuur onboarding')");
  await page.waitForSelector("text=Verstuurd.", { timeout: 20000 });
  const mail = mails().find((m) => m.to?.includes("fatima@korenaar.test"));
  check(mail?.subject === `Welkom bij React2u: je onboarding voor ${BEDRIJF}`, `onderwerp: ${mail?.subject}`);
  check(mail?.reply_to === "sales@react2u.nl", `antwoorden naar de salesbox (${mail?.reply_to})`);
  check(mail?.html.includes("Start je onboarding"), "knop in de mail");
  check(mail?.html.includes("Beste Fatima,"), "aanhef in de mail");
  check(["Welkom bij React2u", "Inrichting nieuwe klant", "Werknemersbestand", "Verzuimprotocol"].every((t) => mail?.html.includes(t)) && !mail?.html.includes("Machtiging overdracht"), "de documenten als checklist in de mail, zonder de machtiging");
  fs.writeFileSync(path.join(SHOTS, "mail-onboarding.html"), mail?.html || "");
  const link = onboardingLink(mail?.html);
  check(Boolean(link), `link in de mail: ${link}`);
  await page.reload();
  await page.waitForSelector("span:has-text('Verstuurd')");
  check(await page.locator("text=Verstuurd naar fatima@korenaar.test").count(), "verstuurd in de tijdlijn");
  check(await page.locator("#inrichten").count(), "checklist van React2u staat er nu");
  check((await page.locator("#inrichten [role=checkbox]").count()) === 5, "vijf taken, met de import erbij; de dossiers komen pas bij een vorige arbodienst");
  check(await page.locator("#inrichten >> text=Kan zodra de klant inrichting nieuwe klant heeft ingevuld").count(), "een taak wacht op de klant");
  await shot(page, "05-beheer-verstuurd");

  stap("Automatische herinnering (api/cron/onboarding)");
  const cron = (q = "") => page.request.get(`${BASIS}/api/cron/onboarding${q}`, { headers: { authorization: "Bearer e2e-cron-geheim" } });
  check((await page.request.get(`${BASIS}/api/cron/onboarding`)).status() === 401, "zonder geheim: 401");
  let cr = await (await cron("?dry=1")).json();
  check(cr.ok && cr.kandidaten.length === 0, "net verstuurd: nog geen herinnering");
  sql(`update public.onboardings set verstuurd_at = now() - interval '6 days' where id = '${id}'`);
  cr = await (await cron()).json();
  check(cr.verstuurd === 1 && cr.kandidaten[0]?.reden === "niet-geopend", `zes dagen niet geopend: herinnering (${JSON.stringify(cr.kandidaten)})`);
  const her = mails().find((m) => /^Herinnering: je onboarding/.test(m.subject || ""));
  check(Boolean(her) && her.to?.includes("fatima@korenaar.test") && her.html.includes("Ga verder met je onboarding"), "herinneringsmail aan de klant met de knop");
  check(sql(`select details->>'automatisch' from public.onboarding_gebeurtenissen where onboarding_id = '${id}' and soort = 'herinnering'`) === "true", "in de tijdlijn als automatisch");
  cr = await (await cron()).json();
  check(cr.verstuurd === 0, "niet twee keer kort na elkaar");
  sql(`update public.onboardings set verstuurd_at = now() where id = '${id}'`);

  stap("De klant opent de onboarding");
  const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
  const klant = await kctx.newPage();
  klant.on("pageerror", (e) => paginafouten.push(String(e)));
  const r = await klant.goto(link);
  check(r.status() === 200, `pagina 200 (${r.status()})`);
  check(/noindex/.test(r.headers()["x-robots-tag"] || "") && r.headers()["referrer-policy"] === "no-referrer", "noindex en no-referrer");
  await klant.waitForSelector("h1:has-text('Welkom')");
  check((await klant.locator("text=Je bekijkt deze onboarding als collega").count()) === 0, "geen collega-melding");
  check(await klant.locator("text=Beste Fatima,").count(), "aanhef");
  check(await klant.locator("text=Nog 5 stappen te gaan").count(), "voortgang: nog vijf stappen");
  check(await klant.locator("text=Rens van Eyck").count(), "het aanspreekpunt");
  check(await klant.locator("a.hv-btn-roze:has-text('Begin met stap 1')").count(), "knop naar stap 1");
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "1", "bezoek geteld");
  check(sql(`select bekeken_at is not null from public.onboardings where id = '${id}'`) === "t", "bekeken_at gezet");
  const geopend = await mailMet(/heeft de onboarding geopend/);
  check(geopend?.to?.includes("sales@react2u.nl"), `seintje aan de afzender: ${geopend?.subject}`);
  await shot(klant, "06-klant-boven", { fullPage: false });
  await shot(klant, "07-klant-hub");

  stap("Telefoon, een half uur later");
  // Een bezoek telt pas opnieuw na een half uur zonder activiteit (de pagina rendert ook na elke keer opslaan).
  await klant.reload();
  await klant.waitForSelector("h1");
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "1", "meteen opnieuw laden telt niet als nieuw bezoek");
  sql(`update public.onboardings set laatst_bekeken_at = now() - interval '31 minutes' where id = '${id}'`);
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const tp = await tel.newPage();
  await tp.goto(link);
  await tp.waitForSelector("h1");
  const breed = await tp.evaluate(() => document.documentElement.scrollWidth);
  check(breed <= 390, `geen horizontale scroll op 390 px (${breed})`);
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "2", "na een half uur stilte telt het bezoek opnieuw");
  await shot(tp, "08-telefoon-boven", { fullPage: false });
  await tp.click("div.fixed a:has-text('Stap 1')");
  await tp.waitForURL(/\/onboarding\/[a-f0-9]{48,}\/welkom$/, { timeout: 20000 });
  await tp.waitForSelector("#stap-welkom");
  check((await tp.evaluate(() => document.documentElement.scrollWidth)) <= 390, "stappagina op de telefoon: geen horizontale scroll");
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "2", "doorklikken naar een stap telt niet als nieuw bezoek");
  await shot(tp, "09-telefoon-stap", { fullPage: false });
  await tel.close();

  stap("Lezen en afvinken op de stappagina");
  await klant.goto(`${link}/welkom`);
  await klant.waitForSelector("#stap-welkom");
  check(await klant.locator("#stap-welkom >> text=Wij bewaken dit").count(), "de reis met wat React2u bewaakt");
  check(await klant.locator("#stap-welkom button:has-text('Gelezen')").count(), "afvinkknop");
  await klant.locator("#stap-welkom button:has-text('Gelezen')").click();
  await klant.waitForSelector("#stap-welkom >> text=Afgevinkt", { timeout: 20000 });
  check(sql(`select gelezen ? 'welkom' from public.onboardings where id = '${id}'`) === "t", "welkom afgevinkt in de database");
  await klant.waitForSelector("#stap-welkom >> text=Verder met inrichting nieuwe klant", { timeout: 20000 });
  check(await klant.locator("header >> text=1/5").count(), "voortgang in de kopbalk: 1/5");
  const welkomPdf = await klant.request.get(`${link}/pdf/welkom`);
  check(isPdf(welkomPdf, await welkomPdf.body()), "welkom als pdf voor de klant");
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "2", "een pdf ophalen telt niet als bezoek");
  await shot(klant, "10-klant-welkom");

  stap("Inrichting invullen, eerst met een fout");
  await klant.goto(`${link}/inrichting`);
  await klant.waitForSelector("#stap-inrichting");
  const inr = (n) => `#ob-inrichting-${n}`;
  check((await klant.inputValue(inr("bedrijfsnaam"))) === BEDRIJF, "bedrijfsnaam vooringevuld");
  check(await klant.locator("text=Verplichte velden: 1 van 8").count(), "voortgang van de verplichte velden");
  await klant.fill(inr("kvk"), "1234");
  await klant.fill(inr("factuur_straat"), "Korenstraat 8");
  await klant.fill(inr("factuur_postcode"), "5611 KL");
  await klant.fill(inr("factuur_plaats"), "Eindhoven");
  await klant.fill(inr("factuur_email"), "facturen@korenaar.test");
  await klant.fill(inr("contact_naam"), "Fatima El Amrani");
  await klant.fill(inr("contact_email"), "fatima@korenaar.test");
  check(await klant.locator("text=Verplichte velden: 8 van 8").count(), "alle verplichte velden gevuld");
  await klant.click("#stap-inrichting button:has-text('Gegevens opslaan')");
  await klant.waitForSelector("#stap-inrichting >> text=Een KvK-nummer heeft 8 cijfers.", { timeout: 20000 });
  ok("fout bij een KvK-nummer van vier cijfers");
  check(sql(`select antwoorden ? 'inrichting' from public.onboardings where id = '${id}'`) === "f", "niets opgeslagen bij een fout");
  await klant.fill(inr("kvk"), "12345678");
  await klant.click("#stap-inrichting button:has-text('Gegevens opslaan')");
  await klant.waitForSelector("#stap-inrichting >> text=Opgeslagen. Dank je wel!", { timeout: 20000 });
  check(sql(`select antwoorden->'inrichting'->'data'->>'kvk' from public.onboardings where id = '${id}'`) === "12345678", "inrichting opgeslagen");
  check(sql(`select antwoorden->'inrichting'->>'door' from public.onboardings where id = '${id}'`) === "Fatima El Amrani", "op naam van de contactpersoon");
  const ingevuld = await mailMet(/vulde inrichting nieuwe klant in/);
  check(Boolean(ingevuld), `seintje aan de afzender: ${ingevuld?.subject}`);
  const ontvangen = await mailMet(/^Ontvangen: inrichting nieuwe klant/);
  check(ontvangen?.to?.includes("fatima@korenaar.test") && bijlagePdf(ontvangen), `bevestiging aan de klant met een kopie als pdf: ${ontvangen?.subject}`);
  await klant.waitForSelector("#stap-inrichting >> text=Wijzigingen opslaan", { timeout: 20000 });
  await shot(klant, "11-klant-inrichting");

  stap("Werknemers invoeren, met een fout BSN en plakken uit Excel");
  await klant.goto(`${link}/werknemers`);
  await klant.waitForSelector("#stap-werknemers");
  check((await klant.locator("#stap-werknemers [role=radio]").count()) === 2 && (await klant.locator("#wn-0-voorletters").count()) === 0, "eerst kiezen: handmatig of via Excel, nog geen kaart");
  await klant.click("#stap-werknemers [role=radio]:has-text('Handmatig invullen')");
  await klant.waitForSelector("#wn-0-voorletters");
  const wn = (i, n) => `#wn-${i}-${n}`;
  const vul = async (i, w) => { for (const [k, v] of Object.entries(w)) await klant.fill(wn(i, k), v); };
  await vul(0, { voorletters: "J.", roepnaam: "Jan", achternaam: "Jansen", geboortedatum: "1980-05-12", bsn: "123456782", adres: "Kerkstraat", huisnummer: "4", postcode: "5611ab", plaats: "Eindhoven", startdatum: "2024-01-01", functie: "Bakker", uren: "38" });
  await klant.click("#stap-werknemers button:has-text('Medewerker toevoegen')");
  await klant.waitForSelector(wn(1, "voorletters"));
  await vul(1, { voorletters: "S.", roepnaam: "Sanne", achternaam: "de Vries", geboortedatum: "1992-11-03", bsn: "123456789", adres: "Dorpsstraat", huisnummer: "12", postcode: "5612 AB", plaats: "Eindhoven", startdatum: "2025-03-01", functie: "Verkoopster" });
  await klant.click("#stap-werknemers button:has-text('2 medewerkers opslaan')");
  await klant.waitForSelector("#stap-werknemers >> text=Dit BSN klopt niet", { timeout: 20000 });
  ok("fout bij een BSN die de elfproef niet haalt");
  await klant.fill(wn(1, "bsn"), "111222333");
  // Twee medewerkers erbij via Excel, met de kopregel van het importbestand.
  await klant.click("#stap-werknemers [role=radio]:has-text('Via Excel')");
  await klant.waitForSelector("#wn-bestand");
  check(await klant.locator("#stap-werknemers a:has-text('Download het bestand')").count(), "via Excel: eerst het lege bestand downloaden");
  await klant.click("#stap-werknemers summary:has-text('Of plak de rijen uit Excel')");
  await klant.fill("#wn-plak", "Burgerservicenummer\troepnaam\tvoorletters\tEigen_achternaam\tgeboortedatum\tadres\thuisnummer\tpostcode\tplaatsnaam\tstartdatum_dienstverband\n100000009\tPiet\tP.\tPeters\t15-02-1975\tMolenweg\t3\t5613 CD\tEindhoven\t01-06-2020\n200000007\tLeila\tL.\tAzzouzi\t28-09-1998\tHeistraat\t21\t5614 EF\tEindhoven\t15-08-2023\n");
  await klant.click("#stap-werknemers button:has-text('Rijen lezen')");
  await klant.waitForSelector("#stap-werknemers >> text=2 medewerkers gelezen uit het plakvak", { timeout: 20000 });
  check(await klant.locator("#stap-werknemers >> text=Alles ziet er goed uit").count(), "controlerapport: alles goed");
  await klant.click("#stap-werknemers button:has-text('2 medewerkers toevoegen')");
  await klant.waitForSelector("#stap-werknemers >> text=2 medewerkers toegevoegd", { timeout: 20000 });
  check(await klant.locator("#stap-werknemers >> text=Peters").count() && (await klant.locator("#stap-werknemers >> text=Azzouzi").count()), "de geplakte medewerkers staan erbij");
  check(await klant.locator("#stap-werknemers >> text=4 medewerkers om na te kijken").count(), "om na te kijken, ook de twee handmatige");
  // Uploaden: een echt Excelbestand (deflate, gedeelde tekst, datums als getal), met een rij die er al staat en een onvolledige.
  const xlsxPad = path.join(SHOTS, "upload-personeel.xlsx");
  fs.writeFileSync(xlsxPad, maakXlsx([
    ["Burgerservicenummer", "roepnaam", "voorletters", "Eigen_achternaam", "geboortedatum", "adres", "huisnummer", "postcode", "plaatsnaam", "startdatum_dienstverband", "naam_functie", "email_adres_werk"],
    ["300000005", "Karim", "K.", "Bouali", { d: "1990-03-07" }, "Lindelaan", "9", "5615 GH", "Eindhoven", { d: "2022-02-01" }, "Chauffeur", "karim@korenaar.test"],
    ["100000009", "Piet", "P.", "Peters", "15-02-1975", "Molenweg", "3", "5613 CD", "Eindhoven", "01-06-2020", "Hoofdbakker", ""],
    ["400000003", "Eva", "E.", "Smit", "1988-12-24", "", "", "5616 IJ", "Eindhoven", "2021-05-01", "", ""],
  ]));
  await klant.setInputFiles("#wn-bestand", xlsxPad);
  await klant.waitForSelector("#stap-werknemers >> text=3 medewerkers gelezen uit upload-personeel.xlsx", { timeout: 20000 });
  check(await klant.locator("#stap-werknemers >> text=2 nieuw, 1 stond er al en wordt bijgewerkt").count(), "Piet stond er al: wordt bijgewerkt (zelfde BSN)");
  check(await klant.locator("#stap-werknemers >> text=1 rij vraagt aandacht").count() && (await klant.locator("#stap-werknemers >> text=Eva Smit:").count()), "controlerapport: Eva mist straat en huisnummer");
  await klant.click("#stap-werknemers button:has-text('2 medewerkers toevoegen en 1 bijwerken')");
  await klant.waitForSelector("#stap-werknemers >> text=6 medewerkers om na te kijken", { timeout: 20000 });
  check(await klant.locator("#stap-werknemers >> text=1 medewerker vraagt nog aandacht").count(), "na toevoegen: de kaart van Eva vraagt aandacht");
  check(await klant.locator("#stap-werknemers >> text=Karim Bouali").count(), "Karim uit het Excelbestand staat erbij");
  await klant.click("#stap-werknemers button[aria-expanded]:has-text('Eva Smit')");
  await klant.fill(wn(5, "adres"), "Boschdijk");
  await klant.fill(wn(5, "huisnummer"), "200");
  await klant.click("#stap-werknemers button:has-text('6 medewerkers opslaan')");
  await klant.waitForSelector("#stap-werknemers >> text=Opgeslagen: 6 medewerkers", { timeout: 20000 });
  check(sql(`select jsonb_array_length(antwoorden->'werknemers'->'data'->'rijen') from public.onboardings where id = '${id}'`) === "6", "zes medewerkers opgeslagen");
  check(sql(`select antwoorden->'werknemers'->'data'->'rijen'->0->>'postcode' from public.onboardings where id = '${id}'`) === "5611AB", "postcode in hoofdletters");
  check(sql(`select antwoorden->'werknemers'->'data'->'rijen'->2->>'geboortedatum' from public.onboardings where id = '${id}'`) === "1975-02-15", "datum uit het plakvak omgezet");
  check(sql(`select antwoorden->'werknemers'->'data'->'rijen'->4->>'geboortedatum' from public.onboardings where id = '${id}'`) === "1990-03-07", "Exceldatum (getal met datumopmaak) omgezet");
  check(sql(`select antwoorden->'werknemers'->'data'->'rijen'->2->>'functie' from public.onboardings where id = '${id}'`) === "Hoofdbakker", "Piet bijgewerkt uit het Excelbestand, zijn andere gegevens bleven staan");
  // De download bevat nu de zes medewerkers: downloaden, aanvullen in Excel, weer uploaden.
  const dl = await klant.request.get(`${link}/excel`);
  const dlBody = await dl.body();
  check(isXlsx(dl, dlBody) && dlBody.toString("latin1").includes("Azzouzi") && dlBody.toString("latin1").includes("Bouali"), `download bevat de medewerkers die er al staan: ${dl.status()}`);
  const wnOntvangen = await mailMet(/^Ontvangen: het werknemersbestand/);
  check(wnOntvangen?.to?.includes("fatima@korenaar.test") && !wnOntvangen?.attachments, `bevestiging aan de klant, zonder bijlage (BSN's): ${wnOntvangen?.subject}`);
  await shot(klant, "12-klant-werknemers", { fullPage: false });

  stap("Beheer, tabblad Werknemer: de vorige arbodienst");
  await page.goto(adminUrl);
  await page.waitForSelector("nav[aria-label='Onboarding: werkgever of werknemer']");
  check((await page.locator("h2:has-text('Vorige arbodienst')").count()) === 0 && (await page.locator("#machtigingen").count()) === 0, "tabblad Werkgever: geen machtiging");
  check((await page.locator("#inrichten [role=checkbox]").count()) === 5, "nog vijf taken zolang er geen vorige arbodienst is");
  await page.click("nav[aria-label='Onboarding: werkgever of werknemer'] a:has-text('Werknemer')");
  await page.waitForURL(/tab=werknemer/, { timeout: 20000 });
  await page.waitForSelector("#va-arbodienst");
  check(await page.locator("text=Vul eerst de vorige arbodienst in").count(), "uitnodigen kan pas met een vorige arbodienst");
  await page.fill("#va-arbodienst", "ArboNed");
  await page.fill("#va-plaats", "Utrecht");
  await page.fill("#va-bedrijfsarts", "P. de Vries");
  await page.fill("#va-email", "dossiers@arboned.test");
  await page.click("form:has(#va-arbodienst) button:has-text('Vorige arbodienst opslaan')");
  await page.waitForSelector("text=Vorige arbodienst opgeslagen.", { timeout: 20000 });
  check(sql(`select vorige_arbodienst->>'arbodienst' from public.onboardings where id = '${id}'`) === "ArboNed", "vorige arbodienst bij React2u opgeslagen");
  const mPdf = await page.request.get(`${BASIS}/admin/onboardingvoorbeeld/${id}/pdf/machtiging?download=1`);
  const mBody = await mPdf.body();
  check(isPdf(mPdf, mBody), `de lege machtiging met de vorige arbodienst als pdf: ${mPdf.status()}`);
  fs.writeFileSync(path.join(SHOTS, "machtiging-ingevuld.pdf"), mBody);
  check((await klant.request.get(`${link}/machtiging`)).status() === 404, "de klant heeft geen machtigingstap");

  stap("Beheer: een werknemer uitnodigen om online te tekenen");
  await page.waitForSelector("#mu-kies");
  await page.selectOption("#mu-kies", "karim@korenaar.test");
  check((await page.inputValue("#mu-naam")) === "Karim Bouali" && (await page.inputValue("#mu-email")) === "karim@korenaar.test", "gekozen uit het werknemersbestand: naam en e-mail ingevuld");
  await page.click("#machtigingen button:has-text('Uitnodiging sturen')");
  await page.waitForSelector("#machtigingen >> text=Uitnodiging gestuurd naar karim@korenaar.test", { timeout: 20000 });
  const uitn = await mailMet(/^Machtiging overdracht verzuimdossier/);
  check(uitn?.to?.includes("karim@korenaar.test") && uitn.html.includes("Bekijk en teken de machtiging") && uitn.html.includes("ArboNed"), `uitnodiging aan de werknemer: ${uitn?.subject}`);
  const mLink = machtigingLink(uitn?.html);
  check(Boolean(mLink), `persoonlijke link: ${mLink}`);
  await page.waitForSelector("#machtigingen >> text=Karim Bouali", { timeout: 20000 });
  check(await page.locator("#machtigingen >> text=nog niet geopend").count(), "stand: uitgenodigd, nog niet geopend");
  await page.click("#machtigingen button:has-text('Herinneren')");
  await page.waitForSelector("#machtigingen >> text=minder dan een uur geleden", { timeout: 20000 });
  ok("herinneren binnen een uur: nette melding");
  const mid = sql(`select id from public.onboarding_machtigingen where email = 'karim@korenaar.test'`);
  check((await page.locator("#inrichten").count()) === 0, "tabblad Werknemer: geen checklist van de werkgever");
  await shot(page, "18a-beheer-werknemer");

  stap("De werknemer tekent op zijn telefoon, met IP-registratie");
  const wctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "nl-NL" });
  const wn2 = await wctx.newPage();
  wn2.on("pageerror", (e) => paginafouten.push(String(e)));
  const wr = await wn2.goto(mLink);
  check(wr.status() === 200, `pagina van de werknemer 200 (${wr.status()})`);
  await wn2.waitForSelector("h1:has-text('Hallo Karim')");
  check(await wn2.locator("text=ArboNed").count() && (await wn2.locator("text=Stafarts B. Kamzoul").count()), "van ArboNed naar de bedrijfsarts van React2u");
  check((await wn2.evaluate(() => document.documentElement.scrollWidth)) <= 390, "geen horizontale scroll op de telefoon");
  check(sql(`select bekeken_at is not null from public.onboarding_machtigingen where id = '${mid}'`) === "t", "geopend vastgelegd");
  await shot(wn2, "18-werknemer-machtiging", { fullPage: false });
  check((await wn2.inputValue("#mw-naam")) === "Karim Bouali", "naam vooringevuld");
  await wn2.fill("#mw-adres", "Lindelaan 9");
  await wn2.fill("#mw-postcode", "5615 GH");
  await wn2.fill("#mw-plaats", "Eindhoven");
  await wn2.fill("#mw-geboortedatum", "1990-03-07");
  await wn2.fill("#mw-bsn", "300000005");
  await wn2.check("input[type=checkbox]");
  await wn2.click("button:has-text('Machtiging ondertekenen')");
  await wn2.waitForSelector("[role=alert]:has-text('handtekening')", { timeout: 20000 });
  ok("zonder handtekening een melding");
  await teken(wn2, "#handtekening canvas");
  await wn2.click("button:has-text('Machtiging ondertekenen')");
  await wn2.waitForSelector("h1:has-text('Dank je wel, Karim')", { timeout: 30000 });
  check(sql(`select status || ',' || (getekend_hash is not null) || ',' || (getekend_ip is not null) || ',' || (gegevens->>'bsn') from public.onboarding_machtigingen where id = '${mid}'`) === "getekend,true,true,300000005", "getekend, met hash, IP-adres en gegevens");
  const bev = await mailMet(/^Getekend: je machtiging/);
  check(bev?.to?.includes("karim@korenaar.test") && bijlagePdf(bev), `bevestiging aan de werknemer met de getekende pdf: ${bev?.subject}`);
  const wPdf = await wn2.request.get(`${mLink}/pdf?download=1`);
  const wBody = await wPdf.body();
  check(isPdf(wPdf, wBody), `de eigen getekende machtiging als pdf: ${wPdf.status()}`);
  fs.writeFileSync(path.join(SHOTS, "machtiging-getekend.pdf"), wBody);
  const seinGetekend = await mailMet(/tekende de machtiging/);
  check(seinGetekend?.to?.includes("sales@react2u.nl") && seinGetekend.html.includes("IP-registratie"), `seintje aan de afzender: ${seinGetekend?.subject}`);
  await shot(wn2, "19-werknemer-getekend", { fullPage: false });
  await wctx.close();

  stap("Beheer: getekend met IP, en de opdracht namens de werkgever naar de arbodienst");
  await page.reload();
  await page.waitForSelector("#machtigingen >> text=Getekend", { timeout: 20000 });
  check(await page.locator("#machtigingen >> text=IP ").count(), "het IP-adres van de ondertekening staat erbij");
  check(await page.locator("text=1/1 getekend").count(), "telling op het tabblad");
  const aPdf = await page.request.get(`${BASIS}/admin/onboarding/${id}/machtiging/${mid}`);
  check(isPdf(aPdf, await aPdf.body()), `de getekende machtiging als pdf in het beheer: ${aPdf.status()}`);
  check((await page.inputValue("#ov-email")) === "dossiers@arboned.test", "e-mailadres van de arbodienst vooringevuld");
  await page.click("#overdracht button:has-text('Verstuur de opdracht')");
  await page.waitForSelector("#overdracht >> text=Opdracht verstuurd naar dossiers@arboned.test", { timeout: 30000 });
  const opd = await mailMet(/^Opdracht overdracht verzuimdossiers/);
  check(opd?.to?.includes("dossiers@arboned.test") && opd.to.includes("medisch@react2u.nl") && opd.to.includes("fatima@korenaar.test"), `opdracht aan de arbodienst, met de werkgever en medisch erbij: ${opd?.to}`);
  check(opd?.reply_to === "fatima@korenaar.test", "antwoorden gaat naar de werkgever");
  check(bijlagePdf(opd) && opd.attachments[0].filename.startsWith("Opdracht overdracht"), "de brief met de machtiging als pdf in de bijlage");
  check(sql(`select overdracht_at is not null from public.onboarding_machtigingen where id = '${mid}'`) === "t", "overdracht vastgelegd");
  const ovPdf = await page.request.get(`${BASIS}/admin/onboarding/${id}/overdracht?download=1`);
  const ovBody = await ovPdf.body();
  check(isPdf(ovPdf, ovBody), `de opdracht als pdf uit het beheer: ${ovPdf.status()}`);
  fs.writeFileSync(path.join(SHOTS, "opdracht-overdracht.pdf"), ovBody);
  await page.reload();
  await page.waitForSelector("#machtigingen >> text=met de opdracht naar de arbodienst", { timeout: 20000 });
  check(await page.locator("text=Opdracht tot overdracht met 1 machtiging").count() && (await page.locator("text=Karim Bouali tekende de machtiging online").count()), "eigen tijdlijn van de werknemers");
  await shot(page, "20-beheer-werknemer-getekend");
  await page.goto(`${BASIS}/admin/onboarding/werknemers`);
  await page.waitForSelector("h1:has-text('Onboarding werknemer')");
  check(await page.locator("td:has-text('Karim Bouali')").count() && (await page.locator("td a:has-text('Bakkerij De Korenaar')").count()), "register Werknemer: Karim bij de bakkerij");
  check(await page.locator("td >> text=Naar de arbodienst").count(), "met de stand van de opdracht");
  check((await page.locator("td.font-mono").count()) > 0, "met het IP-adres");
  await page.goto(`${BASIS}/admin/onboarding/werknemers?filter=open`);
  check(await page.locator("text=Geen werknemers in deze selectie").count(), "filter: niemand wacht nog op een handtekening");
  await shot(page, "20b-beheer-werknemers-register");
  await klant.goto(link);
  await klant.waitForSelector("h1:has-text('Welkom')");
  check((await klant.locator("section[id^=hoofdstuk-] a[href$='/machtiging']").count()) === 0 && (await klant.locator("text=Nog 2 stappen te gaan").count()), "klant: geen machtigingstap, nog twee stappen");

  stap("Delen met je team: de laatste stappen afvinken, compleet");
  await klant.goto(`${link}/verzuimprotocol`);
  await klant.waitForSelector("#stap-verzuimprotocol");
  check((await klant.locator("#stap-verzuimprotocol >> text=ziektegeld").count()) > 0, "protocol: ziektegeld, zoals op de poster");
  await klant.locator("#stap-verzuimprotocol button:has-text('Gedeeld met mijn medewerkers')").click();
  await klant.waitForSelector("#stap-verzuimprotocol >> text=Afgevinkt", { timeout: 20000 });
  check(sql(`select status from public.onboardings where id = '${id}'`) === "verstuurd", "nog niet compleet na vier van vijf");
  await klant.goto(`${link}/vragen`);
  await klant.waitForSelector("#stap-vragen");
  check(await klant.locator("#stap-vragen >> text=In één oogopslag").count(), "de samenvattingstabel");

  stap("Een stap doorsturen naar een collega");
  await klant.click("button:has-text('Stuur deze stap door')");
  await klant.waitForSelector("#ds-naam");
  check((await klant.inputValue("#ds-van")).length > 0, "eigen naam vooringevuld met de contactpersoon");
  await klant.fill("#ds-naam", "Kees Bakker");
  await klant.fill("#ds-email", "kees@korenaar.test");
  await klant.fill("#ds-bericht", "Kun jij dit oppakken voor de leidinggevenden?");
  await klant.click("button:has-text('Doorsturen')");
  await klant.waitForSelector("text=Verstuurd naar kees@korenaar.test", { timeout: 20000 });
  const door = await mailMet(/stuurt je Wat je wél mag vragen/);
  check(door?.to?.includes("kees@korenaar.test") && door.html.includes("Kun jij dit oppakken") && door.html.includes(`${link}/vragen`), `mail aan de collega met de link naar de stap: ${door?.subject}`);
  check(sql(`select details->>'email' from public.onboarding_gebeurtenissen where onboarding_id = '${id}' and soort = 'doorgestuurd'`) === "kees@korenaar.test", "doorgestuurd in de tijdlijn");
  await klant.locator("#stap-vragen button:has-text('Gelezen')").click();
  await klant.waitForSelector("#stap-vragen >> text=Afgevinkt", { timeout: 20000 });
  check(sql(`select status from public.onboardings where id = '${id}'`) === "afgerond", "status afgerond zodra alles af is");
  await klant.goto(link);
  await klant.waitForSelector("text=Jullie onboarding is compleet", { timeout: 20000 });
  check(await klant.locator("text=Alles klaar, dank je wel!").count(), "de felicitatie op de hub");
  check(await klant.locator("header >> text=5/5").count(), "kopbalk: 5/5");
  check((await klant.locator("div.fixed:has-text('Stap')").count()) === 0, "geen balk naar een volgende stap meer");
  const afgerond = await mailMet(/heeft de onboarding afgerond/);
  check(Boolean(afgerond), `seintje aan de afzender: ${afgerond?.subject}`);
  const klaarMail = await mailMet(/^Jullie deel is klaar/);
  check(klaarMail?.to?.includes("fatima@korenaar.test") && klaarMail.html.includes("Lopende dossiers"), `bevestiging aan de klant met wat React2u nu doet: ${klaarMail?.subject}`);
  check(await klant.locator("#verder >> text=Wij zijn aan zet").count() && (await klant.locator("#verder >> text=Daar werken we nu aan").count()), "de klant ziet dat React2u aan zet is");
  await shot(klant, "13-klant-compleet", { fullPage: false });

  stap("Beheer: de klant is klaar, React2u aan zet");
  await page.goto(adminUrl);
  await page.waitForSelector("span:has-text('Klant klaar')");
  check(await page.locator("text=Nu is React2u aan zet").count(), "banner: React2u aan zet");
  check(await page.locator("text=5 van 5 klaar").count(), "voortgang van de klant: 5 van 5");
  check(await page.locator("text=0 van 6 gedaan").count(), "taken van React2u: 0 van 6, met de dossiers erbij sinds de vorige arbodienst");
  check((await page.locator("#inrichten >> text=Kan zodra de klant").count()) === 0, "geen taak wacht nog op de klant");
  check(await page.locator("dd:has-text('12345678')").count(), "inrichting: KvK zichtbaar");
  check(await page.locator("td:has-text('•••••6782')").count(), "werknemers: BSN gemaskeerd, op het tabblad Werkgever");
  check(await page.locator("td:has-text('Jan Jansen')").count() && (await page.locator("td:has-text('Leila Azzouzi')").count()), "alle medewerkers in de tabel, ook de geplakte");
  check((await page.locator("h2:has-text('Vorige arbodienst')").count()) === 0, "tabblad Werkgever: geen machtiging");
  check(await page.locator("text=doorgestuurd naar Kees Bakker").count(), "doorgestuurd in de tijdlijn");

  await page.goto(adminUrl);
  await page.waitForSelector("#ob-cm");
  check((await page.locator(`a[href="/admin/onboardingvoorbeeld/${id}/welkom"]`).count()) === 1, "per stap een link naar het voorbeeld van die stap");
  await page.fill("#ob-cm", "Cindy Faro");
  await page.fill("#ob-deb", "D-1001");
  await page.click("form:has(#ob-deb) button:has-text('Opslaan')");
  await page.waitForSelector("text=Onboarding opgeslagen.", { timeout: 20000 });
  const imp = await page.request.get(`${BASIS}/admin/onboarding/${id}/werknemers`);
  const impBody = await imp.body();
  check(isXlsx(imp, impBody) && /Import XpertSuite/.test(imp.headers()["content-disposition"] || ""), `Excel voor XpertSuite: ${imp.status()}, ${impBody.length} bytes`);
  fs.writeFileSync(path.join(SHOTS, "import-xpertsuite.xlsx"), impBody);
  await shot(page, "14-beheer-klant-klaar");

  stap("Dashboard: inrichten als signaal");
  await page.goto(`${BASIS}/admin`);
  await page.waitForSelector("#verkoop");
  check(await page.locator(`#verkoop >> text=${BEDRIJF}`).count() && (await page.locator("#verkoop >> text=Klant klaar").count()), "het Verkoopblok zet de onboarding klaar om in te richten");
  check(await page.locator("#verkoop >> text=nog 6 taken om in te richten").count(), "met het aantal taken");
  await page.locator("#verkoop").screenshot({ path: path.join(SHOTS, "15-dashboard.png") });

  stap("De checklist van React2u afvinken");
  await page.goto(adminUrl);
  for (let i = 0; i < 6; i++) {
    await page.locator("#inrichten [role=checkbox][aria-checked=false]").first().click();
    await page.waitForSelector(`text=${i + 1} van 6 gedaan`, { timeout: 20000 });
  }
  check(await page.locator("span:has-text('Ingericht')").count(), "status ingericht als alle taken af zijn");
  check(await page.locator(`text=${BEDRIJF} is live.`).count(), "banner: de klant is live");
  const liveMail = await mailMet(/^Jullie zijn live bij React2u/);
  check(liveMail?.to?.includes("fatima@korenaar.test") && liveMail.html.includes("Cindy Faro"), `mail "jullie zijn live" aan de klant, met de casemanager: ${liveMail?.subject}`);
  check(await page.locator("text=Mail \"jullie zijn live\" naar fatima@korenaar.test").count(), "live in de tijdlijn");
  await klant.goto(link);
  await klant.waitForSelector("text=Jullie zijn live!", { timeout: 20000 });
  check(await klant.locator("#verder >> text=Cindy Faro").count() && ((await klant.locator("#verder >> text=Geregeld op").count()) === 6), "de klant ziet: live, de casemanager en zes keer geregeld");
  await shot(klant, "21-klant-live");
  check(await page.locator("text=Werkgever aangemaakt in XpertSuite: afgevinkt").count(), "taak in de tijdlijn");
  check(sql(`select count(*) from public.onboarding_gebeurtenissen where onboarding_id = '${id}' and soort = 'taak'`) === "6", "zes taken in de tijdlijn");
  await page.locator("#inrichten [role=checkbox][aria-checked=true]").first().click();
  await page.waitForSelector("text=5 van 6 gedaan", { timeout: 20000 });
  check(await page.locator("span:has-text('Klant klaar')").count(), "een taak terug open: weer klant klaar");
  await page.locator("#inrichten [role=checkbox][aria-checked=false]").first().click();
  await page.waitForSelector("text=6 van 6 gedaan", { timeout: 20000 });
  check(sql(`select count(*) from public.onboarding_gebeurtenissen where onboarding_id = '${id}' and soort = 'live'`) === "1", "de live-mail gaat één keer");
  await shot(page, "16-beheer-ingericht");

  stap("Werknemersbestand wissen na de import");
  await page.goto(adminUrl);
  await page.waitForSelector("button:has-text('Wissen na import')");
  await page.click("button:has-text('Wissen na import')");
  await page.waitForSelector("text=Gewist na de import in XpertSuite.", { timeout: 20000 });
  check(sql(`select antwoorden ? 'werknemers' from public.onboardings where id = '${id}'`) === "f", "de BSN's zijn weg");
  check(sql(`select status from public.onboardings where id = '${id}'`) === "afgerond", "blijft afgerond");
  await page.goto(`${BASIS}/admin`);
  await page.waitForSelector("#verkoop");
  check((await page.locator(`#verkoop >> text=${BEDRIJF}`).count()) === 0, "ingericht: niets meer op te volgen");

  stap("Register met filters");
  await page.goto(`${BASIS}/admin/onboarding`);
  check(await page.locator("td:has-text('Ingericht')").count(), "ingericht in de lijst");
  check(await page.locator("text=6/6").count(), "beide voortgangen in de lijst");
  await page.goto(`${BASIS}/admin/onboarding?filter=klant`);
  check(await page.locator("text=Geen onboardings in deze selectie").count(), "filter: niets meer bij de klant");
  await page.goto(`${BASIS}/admin/onboarding?filter=ingericht&q=korenaar`);
  check(await page.locator(`td a:has-text('${BEDRIJF}')`).count(), "filter en zoeken");
  await shot(page, "17-overzicht", { fullPage: false });

  stap("Collega opent de link");
  await page.goto(link);
  check(await page.locator("text=Je bekijkt deze onboarding als collega").count(), "collega-melding");
  check(sql(`select aantal_bekeken from public.onboardings where id = '${id}'`) === "2", "bezoek van een collega telt niet");

  stap("Intrekken");
  await page.goto(adminUrl);
  await page.click("button:has-text('Intrekken')");
  await page.waitForSelector("span:has-text('Ingetrokken')", { timeout: 20000 });
  await klant.goto(link);
  check(await klant.locator("text=niet meer beschikbaar").count(), "de klant ziet dat de onboarding is ingetrokken");
  await klant.goto(`${link}/welkom`);
  check(await klant.locator("text=niet meer beschikbaar").count(), "ook op een stappagina");
  await shot(klant, "18-ingetrokken", { fullPage: false });
  const pdfWeg = await klant.request.get(`${link}/pdf/welkom`);
  check(pdfWeg.status() === 404, "pdf van een ingetrokken onboarding: 404");

  stap("Onbekende link");
  const onbekend = await klant.goto(`${BASIS}/onboarding/${"c".repeat(64)}`);
  check(onbekend.status() === 404 && (await klant.locator("text=Deze link werkt niet").count()), `nette 404 (${onbekend.status()})`);
  const onbekendeStap = await klant.goto(`${BASIS}/onboarding/${"c".repeat(64)}/welkom`);
  check(onbekendeStap.status() === 404, "onbekende link naar een stap: 404");
  await kctx.close();

  stap("Mail renderen");
  const mp = await ctx.newPage();
  await mp.setViewportSize({ width: 680, height: 900 });
  await mp.goto("file://" + path.join(SHOTS, "mail-onboarding.html"));
  await mp.waitForTimeout(400);
  await shot(mp, "mail-onboarding");

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
