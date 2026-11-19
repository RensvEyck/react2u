// Prognose van de werkdruk (0049) van begin tot eind: klanten, getekende offertes en de pijplijn als bron, de
// casemanagers uit Omzet → Uren als bezetting, de weekevaluaties als controle. Eerst zonder norm (een klant zonder
// aantal werknemers), dan het aantal aanvullen vanuit de prognose (het komt op de stamkaart en in de tijdlijn), de
// afgeleide norm, het wervingsadvies, de werkdruk per casemanager naast zijn weekevaluatie, normen instellen, een
// scenario doorrekenen, de ingangsdatum op een open en op een getekende offerte, en het advies op het dashboard.
// Draaien via e2e/run.mjs (E2E_ALLEEN=prognose); maakt offertes, klanten en medewerkers leeg voor een vaste set.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "prognose");
fs.mkdirSync(SHOTS, { recursive: true });
const GEHEIM = geheim();
const stap = (s) => console.log(`\n▶ ${s}`);
const fout = [];
const check = (cond, s) => (cond ? console.log(`  ✓ ${s}`) : (fout.push(s), console.log(`  ✗ ${s}`)));
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
async function totDat(f, ms = 15000) {
  for (const eind = Date.now() + ms; Date.now() < eind; await wacht(300)) if (f()) return true;
  return false;
}

const RENS_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const DAG = 86_400_000;
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const dag = (n) => new Date(new Date(`${vandaag}T12:00:00Z`).getTime() + n * DAG).toISOString().slice(0, 10);
const plusMaanden = (maand, n) => {
  const [j, m] = maand.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const dezeMaand = vandaag.slice(0, 7);
const maandLang = (maand) => new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${maand}-01T00:00:00Z`));
const maandag = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  return new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAG).toISOString().slice(0, 10);
};
const dezeWeek = maandag(vandaag);
const week = (n) => new Date(new Date(`${dezeWeek}T00:00:00Z`).getTime() + n * 7 * DAG).toISOString().slice(0, 10);
const SMIT_START = `${plusMaanden(dezeMaand, 2)}-01`;

function vulDatabase() {
  sql(`set session_replication_role = replica;
truncate public.offertes, public.brochures, public.contracten, public.klanten, public.medewerkers, public.abonnementen_gestopt, public.losse_opdrachten, public.weekevaluaties cascade;
delete from public.prognose_normen;
insert into public.medewerkers (naam, functie, contracturen, norm, actief, user_id, sort) values
 ('Sanne Verbeek', 'Casemanager Verzuim', 36, 75, true, '${RENS_ID}', 1),
 ('Carla Dekker', 'Casemanager', 18, 75, true, null, 2),
 ('Ruud de Boer', 'Algemeen Directeur', 40, 0, true, null, 3);
insert into public.klanten (bedrijf, status, medewerkers, startdatum, casemanager) values
 ('Bakkerij De Korenaar', 'klant', 900, '2025-01-01', 'Sanne'),
 ('Jansen Bouw B.V.', 'klant', null, '2025-06-01', null),
 ('Smit Installatie', 'akkoord', null, null, 'Carla');
insert into public.offertes (vorm, bedrijf, email, medewerkers, status, created_at, verstuurd_at, getekend_at, ingangsdatum, geldig_tot, herkomst, afzender_naam) values
 ('verzuimbegeleiding', 'Smit Installatie', 'anna@smit.test', 500, 'getekend', now() - interval '35 days', now() - interval '30 days', now() - interval '20 days', '${SMIT_START}', null, 'google', 'Carla Dekker'),
 ('verzuimbegeleiding', 'De Vries Logistiek', 'jan@devries.test', 300, 'afgewezen', now() - interval '45 days', now() - interval '40 days', null, null, null, 'linkedin', 'Carla Dekker'),
 ('verzuimbegeleiding', 'Peters Metaal', 'piet@peters.test', 1000, 'verstuurd', now() - interval '6 days', now() - interval '5 days', null, null, '${dag(30)}', 'google', 'Carla Dekker'),
 ('rie', 'Bakkerij De Korenaar', 'info@korenaar.test', null, 'getekend', now() - interval '10 days', null, now() - interval '8 days', '${plusMaanden(dezeMaand, 1)}-10', null, 'verwijzing', 'Sanne Verbeek');
-- Wat een echte ondertekening vastlegt, zodat de pagina van de getekende offerte opent.
update public.offertes set getekend_inhoud = jsonb_build_object('nummer', nummer, 'bedrijf', bedrijf, 'contactpersoon', null, 'medewerkers', medewerkers, 'titel', titel, 'intro', null, 'regels', '[]'::jsonb, 'keuze', '[]'::jsonb, 'getekend_at', getekend_at, 'getekend_naam', 'Anna Smit', 'getekend_functie', 'Directeur', 'getekend_email', email),
  getekend_naam = 'Anna Smit', getekend_functie = 'Directeur', getekend_email = email, getekend_hash = repeat('a', 64)
where status = 'getekend';
insert into public.weekevaluaties (user_id, week, antwoorden, door) values
 ('${RENS_ID}', '${week(-1)}', '{"energie":6,"tijd":5,"emotie":6,"cijfer":6}', '${BEHEERDER.email}'),
 ('${RENS_ID}', '${week(-2)}', '{"energie":5,"tijd":5,"emotie":6,"cijfer":6}', '${BEHEERDER.email}'),
 ('${RENS_ID}', '${week(-9)}', '{"energie":8,"tijd":8,"emotie":7,"cijfer":8}', '${BEHEERDER.email}');`);
}

(async () => {
  stap("Database: een vaste set klanten, offertes, casemanagers en weekevaluaties");
  vulDatabase();
  check(sql("select count(*) from public.klanten") === "3" && sql("select count(*) from public.offertes") === "4", "drie klanten en vier offertes");
  check(sql("select data_type from information_schema.columns where table_name = 'offertes' and column_name = 'ingangsdatum'") === "date", "de offerte heeft een ingangsdatum");
  let anon = true;
  try { sql("set role anon; select count(*) from public.prognose_normen"); } catch { anon = false; }
  check(!anon, "anon kan de normen niet lezen");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const body = () => page.locator("body").innerText();

  stap("Inloggen");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });

  stap("Zonder norm: een lopende klant zonder aantal werknemers");
  await page.goto(`${BASIS}/admin`);
  check(await page.locator('aside nav a[href="/admin/prognose"]').count(), "Prognose staat in het menu");
  await page.goto(`${BASIS}/admin/prognose`);
  await page.waitForSelector("h1:has-text('Prognose')");
  let tekst = await body();
  check(tekst.includes("Nog geen advies over het aantal casemanagers") && tekst.includes("Van 1 lopende klant weet het systeem het aantal werknemers niet"), "geen advies zolang een lopende klant geen aantal heeft");
  check(/Werknemers nu\s*900\s*bij 2 klanten\s*1 klant zonder aantal/i.test(tekst), "900 werknemers nu, één klant zonder aantal");
  check(/Bezetting casemanagement\s*1,5 fte/i.test(tekst), "bezetting 1,5 fte: Sanne 36 uur en Carla 18, de directeur telt niet");
  check(tekst.includes("Werknemers onder contract, komende 12 maanden"), "de grafiek toont werknemers zolang er geen norm is");
  // De koppen van de bronnen staan in hoofdletters (CSS); innerText neemt dat over.
  check(/Pijplijn, met 50% kans/i.test(tekst) && tekst.includes("de eigen hitrate van het laatste halfjaar (50%)"), "kans 50%: Smit getekend, De Vries afgewezen");
  check(/Getekend, gaat nog in[\s\S]*Smit Installatie[\s\S]*ingangsdatum offerte/i.test(tekst), "Smit gaat in op de ingangsdatum van de offerte");
  check(/Pijplijn, met 50% kans\s*1\.000\s*werknemers/i.test(tekst), "Peters Metaal in de pijplijn met 1.000 werknemers");
  check(tekst.includes("RI&E Bakkerij De Korenaar") && tekst.includes("nog zonder urennorm"), "de RI&E als eenmalige opdracht, nog zonder urennorm");
  await page.screenshot({ path: path.join(SHOTS, "01-zonder-norm-1440.png"), fullPage: true });

  stap("Het aantal aanvullen vanuit de prognose");
  // Jansen staat ook bij "zonder casemanager"; pak de rij met het aantal.
  const rij = page.locator('#aanvullen li:has(input[aria-label="Aantal werknemers van Jansen Bouw B.V."])');
  check((await rij.locator('input[aria-label^="Aantal werknemers"]').inputValue()) === "", "zonder getekende offerte geen voorstel");
  await rij.locator('input[aria-label^="Aantal werknemers"]').fill("600");
  await rij.locator("button:has-text('Bewaar')").click();
  check(await totDat(() => sql("select medewerkers from public.klanten where bedrijf = 'Jansen Bouw B.V.'") === "600"), "Jansen Bouw: 600 werknemers op de stamkaart");
  check(sql("select count(*) from public.klant_gesprekken g join public.klanten k on k.id = g.klant_id where k.bedrijf = 'Jansen Bouw B.V.' and g.soort = 'stamkaart'") === "1", "en een regel in de tijdlijn van de klant");
  await page.waitForFunction(() => document.body.innerText.includes("Begin uiterlijk in"), null, { timeout: 15000 });
  tekst = await body();

  stap("De afgeleide norm en het advies");
  check(/1 fte op 1\.000 werknemers, de huidige verhouding/.test(tekst), "de norm is de huidige verhouding: 1.500 werknemers op 1,5 fte");
  check(tekst.includes(`Begin uiterlijk in ${maandLang(dezeMaand)} met werven: vanaf ${maandLang(plusMaanden(dezeMaand, 2))} is er 0,5 fte te weinig`), `werven: vanaf ${plusMaanden(dezeMaand, 2)} komt Smit erbij (2.000 werknemers, 2 fte)`);
  check(tekst.includes("Dat volgt al uit de lopende en getekende klanten"), "dat volgt al zonder de pijplijn");
  check(tekst.includes("Nodig tegenover de bezetting, komende 12 maanden"), "de grafiek rekent nu in fte");
  await page.click("text=Per maand: wie erbij komt en wat het vraagt");
  const tabel = await page.locator("#prognose-per-maand").innerText();
  check(tabel.includes(`${maandLang(plusMaanden(dezeMaand, 2))}\t2.000`) && tabel.includes("Smit Installatie"), "in de tabel: 2.000 werknemers en Smit erbij");

  stap("De werkdruk volgens de weekevaluaties");
  check(/Werkdruk volgens het team\s*5\s*werk paste in de tijd\s*krap/i.test(tekst), "het team geeft een 5 voor werk paste in de tijd: krap");
  check(tekst.includes("Bij 1 fte op 1.000 werknemers geven de casemanagers gemiddeld een 5") && tekst.includes("Zet de norm lager"), "de controle: deze verhouding is krap, zet de norm lager");
  const radar = await page.locator("#prognose-radar").innerText();
  check(/Sanne Verbeek[\s\S]*900\s*90%\s*5\s*5,5/.test(radar), `Sanne: 900 werknemers, 90% belast, tijd 5, energie 5,5 (${radar.replace(/\s+/g, " ").slice(0, 160)})`);
  check(/Carla Dekker[\s\S]*\+500 op komst[\s\S]*niet gekoppeld/.test(radar), "Carla: Smit komt eraan, niet gekoppeld aan een weekevaluatie");
  await page.screenshot({ path: path.join(SHOTS, "02-prognose-1440.png"), fullPage: true });

  stap("Normen instellen");
  await page.fill('input[name="werknemersPerFte"]', "800");
  await page.fill('input[name="inrichtingUren"]', "20");
  await page.fill('input[name="uren_rie"]', "24");
  await page.click("button:has-text('Normen opslaan')");
  await page.waitForURL(/opgeslagen=normen/, { timeout: 20000 });
  check(sql("select (normen->>'werknemersPerFte') || '/' || (normen->>'inrichtingUren') || '/' || (normen->'urenPerOpdracht'->>'rie') from public.prognose_normen") === "800/20/24", "normen bewaard: 800 per fte, 20 uur inrichten, RI&E 24 uur");
  tekst = await body();
  check(tekst.includes("1 fte op 800 werknemers") && !tekst.includes("werknemers, de huidige verhouding"), "de prognose rekent met de ingestelde norm");
  check(tekst.includes(`Begin uiterlijk in ${maandLang(dezeMaand)} met werven: vanaf ${maandLang(dezeMaand)}`), "met 800 per fte is het nu al krap");
  check(tekst.includes("RI&E Bakkerij De Korenaar") && tekst.includes("24 uur"), "de RI&E telt nu 24 uur");

  stap("Een scenario doorrekenen");
  await page.fill('input[name="extra"]', "1");
  await page.selectOption('select[name="vanaf"]', plusMaanden(dezeMaand, 1));
  await page.click("button:has-text('Doorrekenen')");
  await page.waitForURL(/extra=1/, { timeout: 20000 });
  tekst = await body();
  check(tekst.includes("met een scenario"), "het scenario staat aan");
  await page.click("text=Per maand: wie erbij komt en wat het vraagt");
  const scen = await page.locator("#prognose-per-maand").innerText();
  check(new RegExp(`${maandLang(dezeMaand)}[^\\n]*\\t1,5\\t`).test(scen) && new RegExp(`${maandLang(plusMaanden(dezeMaand, 1))}[^\\n]*\\t2,5\\t`).test(scen), "bezetting 1,5 nu en 2,5 vanaf volgende maand");
  check(sql("select count(*) from public.prognose_normen") === "1" && !sql("select normen::text from public.prognose_normen").includes("extra"), "het scenario wordt niet opgeslagen");
  await page.click("a:has-text('Wissen')");
  await page.waitForURL((u) => !u.search.includes("extra"), { timeout: 20000 });

  stap("De ingangsdatum op de offerte");
  const peters = sql("select id from public.offertes where bedrijf = 'Peters Metaal'");
  await page.goto(`${BASIS}/admin/offertes/${peters}`);
  await page.waitForSelector("#of-ingang");
  const nieuw = `${plusMaanden(dezeMaand, 3)}-01`;
  await page.fill("#of-ingang", nieuw);
  await page.click('button.abtn:has-text("Opslaan")');
  check(await totDat(() => sql(`select ingangsdatum from public.offertes where id = '${peters}'`) === nieuw), `Peters gaat in op ${nieuw}`);
  const smit = sql("select id from public.offertes where bedrijf = 'Smit Installatie'");
  await page.goto(`${BASIS}/admin/offertes/${smit}`);
  await page.waitForSelector("#notitie-ingang");
  const later = `${plusMaanden(dezeMaand, 4)}-01`;
  await page.fill("#notitie-ingang", later);
  await page.click("section:has(#notitie-ingang) button:has-text('Opslaan')");
  check(await totDat(() => sql(`select ingangsdatum from public.offertes where id = '${smit}'`) === later), "ook een getekende offerte kan verschuiven");
  // De trigger geldt voor iedereen, ook rechtstreeks in de database.
  let getekendWijzigt = true;
  try { sql(`update public.offertes set medewerkers = 1 where id = '${smit}'`); } catch { getekendWijzigt = false; }
  check(!getekendWijzigt && sql(`select medewerkers from public.offertes where id = '${smit}'`) === "500", "de rest van een getekende offerte blijft op slot");
  await page.goto(`${BASIS}/admin/prognose`);
  tekst = await body();
  check(/Pijplijn, met 50% kans[\s\S]*Peters Metaal[\s\S]*ingangsdatum offerte/i.test(tekst), "de prognose neemt de nieuwe datums over");

  stap("Het advies op het dashboard");
  await page.goto(`${BASIS}/admin`);
  const advies = await page.locator("#prognose-advies").innerText().catch(() => "");
  check(advies.includes("met werven") && advies.includes("fte casemanagement te weinig"), `het dashboard noemt het wervingsadvies (${advies.split("\n")[0]})`);

  stap("Telefoon");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASIS}/admin/prognose`);
  await page.waitForSelector("h1");
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overloop <= 0, `geen horizontale scroll op 390 px (${overloop})`);
  // Een kaart met overflow-hidden verbergt te brede inhoud; kijk daarom ook per kaart.
  const teBreed = await page.evaluate(() =>
    [...document.querySelectorAll("main .acard")].filter((k) => k.getBoundingClientRect().right > window.innerWidth + 1 || k.scrollWidth > k.clientWidth + 1).map((k) => k.querySelector("h2")?.textContent || k.id || "kaart"),
  );
  check(teBreed.length === 0, `geen kaart breder dan het scherm op 390 px (${teBreed.join(", ") || "geen"})`);
  await page.addStyleTag({ content: ".sticky { position: static !important; }" });
  await page.screenshot({ path: path.join(SHOTS, "03-prognose-390.png"), fullPage: true });

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
