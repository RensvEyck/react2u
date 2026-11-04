// Het Verkoopblok op het dashboard (lib/opvolgen.ts): een vaste set offertes, brochures en
// contracten rechtstreeks in de database, dan kijken of het dashboard de juiste stukken in de
// juiste volgorde opvolgt, met de cijfers erboven, op drie breedtes. Draaien via e2e/run.mjs,
// als laatste: hij begint met het leegmaken van de verkooptabellen.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "dashboard");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));

// 25 of 10 medewerkers × €120 per jaar: €250 of €100 per maand.
const VAST = `'[{"id":"a","sectie":"Aansluiting","naam":"Compleet","prijs":120,"eenheid":"medewerker_jaar","soort":"vast"}]'::jsonb`;
const RIE = `'[{"id":"r","sectie":"RI&E","naam":"RI&E met plan van aanpak","prijs":1450,"eenheid":"eenmalig","soort":"vast"}]'::jsonb`;
const TEKST = "repeat('Artikel. ', 20)";

function vulDatabase() {
  // Triggers uit (replica): die bewaken de statusovergangen van het beheer, en hier zetten we
  // de eindstand in één keer neer, inclusief tijden in het verleden.
  sql(`set session_replication_role = replica;
truncate public.offertes, public.brochures, public.contracten cascade;
insert into public.offertes (vorm, bedrijf, contactpersoon, email, telefoon, medewerkers, regels, status, geldig_tot, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, keuze, keuze_at, getekend_at, afgewezen_at) values
 ('verzuimbegeleiding', 'Jansen Bouw B.V.', 'Kees Jansen', 'kees@jansenbouw.test', '06 1234 5678', 25, ${VAST}, 'verstuurd', current_date + 20, now() - interval '3 days', now() - interval '3 days', now() - interval '2 days', now() - interval '1 hour', 3, '["a"]', now() - interval '1 hour', null, null),
 ('verzuimbegeleiding', 'Bakkerij De Korenschoof', 'Mieke de Wit', 'mieke@korenschoof.test', '040 222 33 44', 10, ${VAST}, 'verstuurd', current_date + 2, now() - interval '6 days', now() - interval '6 days', null, null, 0, null, null, null, null),
 ('verzuimbegeleiding', 'Van der Linden Logistiek', 'Ruud van der Linden', 'ruud@vdlinden.test', null, 10, ${VAST}, 'verstuurd', current_date + 18, now() - interval '12 days', now() - interval '12 days', now() - interval '10 days', now() - interval '10 days', 1, null, null, null, null),
 ('verzuimbegeleiding', 'Hoveniersbedrijf Groen', 'Sanne Groen', 'sanne@groen.test', '06 9876 5432', 10, ${VAST}, 'verstuurd', current_date - 4, now() - interval '34 days', now() - interval '34 days', now() - interval '30 days', now() - interval '30 days', 1, null, null, null, null),
 ('verzuimbegeleiding', 'Meijer Schoonmaak', 'Tom Meijer', 'tom@meijer.test', '06 1111 2222', 10, ${VAST}, 'verstuurd', current_date + 24, now() - interval '6 days', now() - interval '6 days', null, null, 0, null, null, null, null),
 ('verzuimbegeleiding', 'Smulders Installatietechniek', 'Eva Smulders', 'eva@smulders.test', '013 555 66 77', 10, ${VAST}, 'getekend', current_date + 22, now() - interval '8 days', now() - interval '8 days', now() - interval '7 days', now() - interval '3 days', 4, '["a"]', now() - interval '3 days', now() - interval '3 days', null),
 ('rie', 'Drukkerij Peeters', 'Jan Peeters', 'jan@peeters.test', null, 10, ${RIE}, 'getekend', current_date + 10, now() - interval '15 days', now() - interval '15 days', now() - interval '14 days', now() - interval '12 days', 2, '["r"]', now() - interval '12 days', now() - interval '12 days', null),
 ('verzuimbegeleiding', 'Dijkstra Zorg', 'Lotte Dijkstra', 'lotte@dijkstra.test', null, 10, ${VAST}, 'afgewezen', current_date + 5, now() - interval '25 days', now() - interval '25 days', now() - interval '24 days', now() - interval '20 days', 2, null, null, null, now() - interval '20 days');
insert into public.offerte_gebeurtenissen (offerte_id, soort, door, at)
 select id, 'herinnering', 'rens@react2u.nl', now() - interval '1 day' from public.offertes where bedrijf = 'Meijer Schoonmaak';
insert into public.brochures (bedrijf, contactpersoon, email, telefoon, status, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken) values
 ('Vermeulen Transport', 'Karin Vermeulen', 'karin@vermeulen-transport.test', '040 123 45 67', 'verstuurd', now() - interval '4 days', now() - interval '4 days', now() - interval '3 hours', now() - interval '3 hours', 2),
 ('Kapsalon Knip', 'Ilse Knip', 'ilse@knip.test', null, 'verstuurd', now() - interval '8 days', now() - interval '8 days', null, null, 0);
insert into public.contracten (bedrijf, contactpersoon, email, telefoon, status, ingangsdatum, einddatum, tekst, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, getekend_at) values
 ('Peters Metaal', 'Piet Peters', 'piet@petersmetaal.test', '0499 33 44 55', 'verstuurd', current_date + 27, (current_date + 27 + interval '1 year' - interval '1 day')::date, ${TEKST}, now() - interval '5 days', now() - interval '5 days', now() - interval '50 hours', now() - interval '50 hours', 1, null),
 ('Bosman Techniek', 'Henk Bosman', 'henk@bosman.test', null, 'getekend', (current_date + interval '3 months 14 days' - interval '1 year' + interval '1 day')::date, (current_date + interval '3 months 14 days')::date, ${TEKST}, now() - interval '360 days', now() - interval '360 days', now() - interval '359 days', now() - interval '359 days', 1, now() - interval '358 days');
delete from public.page_views where visitor_hash like 'e2e-dashboard-%';
insert into public.page_views (path, is_company, company, company_domain, company_source, visitor_hash, created_at) values
 ('/verzuimbegeleiding', true, 'Jansen Bouw', 'jansenbouw.test', 'rdns', 'e2e-dashboard-1', now() - interval '50 minutes'),
 ('/tarieven', true, 'Jansen Bouw', 'jansenbouw.test', 'rdns', 'e2e-dashboard-1', now() - interval '45 minutes'),
 ('/kennismaken', true, 'Jansen Bouw', 'jansenbouw.test', 'rdns', 'e2e-dashboard-1', now() - interval '40 minutes');`);
}

(async () => {
  stap("Testgegevens");
  vulDatabase();
  check(sql("select count(*) from public.offertes") === "8", "acht offertes neergezet");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));

  stap("Inloggen");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });

  stap("Verkoopblok");
  await page.goto(`${BASIS}/admin`);
  const blok = page.locator("section#verkoop");
  await blok.waitFor({ timeout: 30000 });
  const tekst = await blok.innerText();
  check(/8 op te volgen/.test(tekst), "kop: 8 op te volgen (alles behalve de informatieve)");

  // Alleen de zichtbare rijen: de rest staat ingeklapt in een <details> eronder.
  const rijen = page.locator("section#verkoop > div.divide-y > div");
  const namen = await rijen.locator("a span.truncate").allInnerTexts();
  console.log(`  volgorde: ${namen.join(" | ")}`);
  check(namen.length === 6, "zes zichtbaar, de rest ingeklapt");
  check(namen[0] === "Jansen Bouw B.V.", "bovenaan: de klant die net onderdelen koos");
  check(namen[1] === "Vermeulen Transport", "daarna: de brochure die net bekeken is");

  const jansen = rijen.first();
  const jansenTekst = await jansen.innerText();
  check(jansenTekst.includes("Koos onderdelen"), "Jansen: Koos onderdelen");
  check(jansenTekst.includes("3× bekeken, laatst 1 uur geleden"), "Jansen: hoe vaak en wanneer bekeken");
  check(jansenTekst.includes("€250 per maand"), "Jansen: de waarde per maand");
  check(/Op de site \d+ min geleden, 3 pagina's/.test(jansenTekst), "Jansen: op de site, met het aantal pagina's");
  check((await jansen.locator('a[href^="tel:"]').getAttribute("href")) === "tel:0612345678", "Jansen: belknop met het nummer");
  check((await jansen.locator("a").first().getAttribute("href"))?.startsWith("/admin/offertes/"), "Jansen: rij gaat naar de offerte");

  const rij = (naam) => blok.locator(`div.divide-y > div:has-text("${naam}")`).first();
  check((await rij("Bakkerij De Korenschoof").innerText()).includes("verloopt over 2 dagen"), "Korenschoof: verloopt over 2 dagen");
  check((await rij("Smulders Installatietechniek").locator("a").first().getAttribute("href"))?.startsWith("/admin/contracten/nieuw?offerte="), "Smulders: getekend, door naar het basiscontract");
  check(!tekst.includes("Meijer Schoonmaak"), "Meijer: net een herinnering gestuurd, dus niet op de lijst");
  check(!tekst.includes("Drukkerij Peeters"), "Peeters: RI&E getekend, geen basiscontract nodig");
  check(!tekst.includes("Dijkstra Zorg"), "Dijkstra: niet akkoord, niets op te volgen");

  stap("Cijfers");
  // De labels staan in hoofdletters (text-transform), en innerText neemt dat over: vandaar /i.
  check(/Open offertes\s*€550\s*per maand\s*4 open · 2 bekeken/i.test(tekst), "open: €550 per maand, 4 open, 2 bekeken");
  check(/Getekend, 30 dagen\s*€100\s*per maand\s*2 getekend · €1\.450 eenmalig/i.test(tekst), "getekend: €100 per maand en €1.450 eenmalig");
  check(/Hitrate, 90 dagen\s*50%\s*2 van 4 afgerond/i.test(tekst), "hitrate 50%, 2 van 4");
  check(/Basiscontracten\s*1\s*getekend\s*1 wacht op handtekening/i.test(tekst), "contracten: 1 getekend, 1 wacht");
  await blok.screenshot({ path: path.join(SHOTS, "01-verkoop-1440.png") });
  await page.screenshot({ path: path.join(SHOTS, "02-dashboard-1440.png"), fullPage: true });

  stap("Uitklappen");
  await blok.locator("summary:has-text('Nog 3 tonen')").click();
  await blok.locator("text=Kapsalon Knip").waitFor({ timeout: 5000 });
  check(await blok.locator("text=Kapsalon Knip").isVisible(), "na uitklappen: de brochure die nog niet geopend is");
  check(await blok.locator("summary:has-text('Minder tonen')").isVisible(), "knop wordt Minder tonen");
  await blok.screenshot({ path: path.join(SHOTS, "03-verkoop-uitgeklapt-1440.png") });

  stap("Dashboardkop");
  const kop = await page.locator("h1 + p").first().innerText();
  check(/Er vragen \d+ dingen je aandacht/.test(kop), `kop telt verkoop mee: "${kop}"`);

  stap("Offertepagina: dezelfde hitrate");
  await page.goto(`${BASIS}/admin/offertes`);
  await page.waitForSelector("h1:has-text('Offertes')");
  check(/Hitrate, laatste 90 dagen\s*50%/i.test(await page.locator("body").innerText()), "offertes: ook 50%");

  for (const [b, h] of [[1024, 900], [390, 844]]) {
    stap(`Breedte ${b}`);
    await page.setViewportSize({ width: b, height: h });
    await page.goto(`${BASIS}/admin`);
    await blok.waitFor();
    const overloop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overloop <= 0, `geen horizontale scroll op ${b} px (${overloop})`);
    // De menubalk blijft bovenaan staan en zou in een opname van alleen het blok over de cijfers vallen.
    await page.addStyleTag({ content: ".sticky { position: static !important; }" });
    await blok.screenshot({ path: path.join(SHOTS, `04-verkoop-${b}.png`) });
  }

  stap("Leeg");
  sql("set session_replication_role = replica; truncate public.offertes, public.brochures, public.contracten cascade;");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASIS}/admin`);
  await blok.waitFor();
  check((await blok.innerText()).includes("Geen lopende offertes, brochures of contracten."), "zonder stukken: een begin met twee knoppen");
  await blok.screenshot({ path: path.join(SHOTS, "05-verkoop-leeg.png") });

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
