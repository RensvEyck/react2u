// CM-overleg (0053) van begin tot eind: het recht overleg en de policies, het beheer plant het overleg uit het ritme
// (met de vaste punten), de kaart van Nederland met klanten per casemanager en het werkgebied (lagen aan en uit, een
// casemanager uitlichten, wie nog niet op de kaart staat), een werknemer in Mijn React2u die een punt inbrengt en
// weghaalt, het beheer dat afvinkt wat besproken is en een actiepunt maakt, de werknemer die het op het dashboard ziet
// en afvinkt, notulen, afronden (archief, het volgende overleg uit het ritme, niet besproken punten schuiven door),
// de herinnering per mail de werkdag ervoor, het ritme aanpassen, en 390 px zonder zijwaarts scrollen.
// Verzonnen klanten en collega's. Draaien via e2e/run.mjs (E2E_ALLEEN=overleg).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "overleg");
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

const LOTTE = { id: "bbbbbbbb-0000-4000-8000-000000000004", email: "lotte@react2u.test", wachtwoord: "Test-wachtwoord-321", naam: "Lotte Visser" };
const RENS_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const DAG = 86_400_000;
const plus = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAG).toISOString().slice(0, 10);
const weekdag = (d) => ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
const herinneringVoor = (d) => plus(d, weekdag(d) === 5 ? 3 : weekdag(d) === 6 ? 2 : 1);
// Hetzelfde als volgendeDatum in lib/overleg.ts zonder eerder overleg: de eerstvolgende dinsdag na vandaag.
const eersteDinsdag = (() => { let d = plus(vandaag, 1); while (weekdag(d) !== 2) d = plus(d, 1); return d; })();

const KLANTEN = [
  ["Bakkerij De Korenaar", "klant", "Fleur", 12, "5611 AB", "Eindhoven"],
  ["Garage Van Dijk", "klant", "Fleur", 30, "5612", null],
  ["Drukkerij Het Blad", "inrichten", "Jasper", 50, "5038", "Tilburg"],
  ["Zonder Adres BV", "klant", "Jasper", 8, null, null],
  ["Haven Logistiek", "klant", "Sanne", 80, "3011", "Rotterdam"],
  ["Kantoor Hofstad", "akkoord", "Sanne", 20, null, "Den Haag"],
  ["Nog Te Verdelen BV", "klant", null, 15, "6511", "Nijmegen"],
  ["Alleen Een Lead BV", "lead", "Fleur", 99, "5611", "Eindhoven"],
];
const lit = (v) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

async function stelAuthenticatorIn(email, wachtwoord) {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-overleg-${Date.now()}` });
  if (e2) throw e2;
  const { error: e3 } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: totp(data.totp.secret) });
  if (e3) throw e3;
  return data.totp.secret;
}

async function inloggen(page, email, wachtwoord, secret) {
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", email);
  await page.fill("#login-wachtwoord", wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(secret));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });
}

function alsCollega(userId, email, q) {
  return sql(`set role authenticated; set request.jwt.claim.sub = '${userId}'; set request.jwt.claims = '{"sub":"${userId}","role":"authenticated","email":"${email}","aal":"aal2"}'; ${q}`).split("\n").pop();
}
const mag = (f) => { try { f(); return true; } catch { return false; } };
const overloop = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  stap("Database: het recht, het ritme, de testcollega en klanten op de kaart");
  sql(`delete from public.cm_overleggen;
update public.cm_ritme set elke_weken = 2, weekdag = 2, tijd = '09:30', duur_minuten = 60, locatie = 'Kantoor Eindhoven',
  vaste_punten = array['Check in', 'Dossiers', 'Klanten', 'Punten voor het MT-overleg', 'Behoeftes', 'Vakantie en verlof'];
delete from public.klanten where bedrijf in (${KLANTEN.map((k) => lit(k[0])).join(", ")});
delete from public.medewerkers where user_id = '${LOTTE.id}';
delete from public.admins where user_id = '${LOTTE.id}'; delete from auth.identities where user_id = '${LOTTE.id}'; delete from auth.users where id = '${LOTTE.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', '${LOTTE.id}', 'authenticated', 'authenticated', '${LOTTE.email}', extensions.crypt('${LOTTE.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${LOTTE.id}', '${LOTTE.id}', '{"sub":"${LOTTE.id}","email":"${LOTTE.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${LOTTE.id}', '${LOTTE.email}', id, now() from public.roles where key = 'werknemer';
insert into public.medewerkers (naam, functie, user_id) values ('${LOTTE.naam}', 'Casemanager Verzuim', '${LOTTE.id}');
insert into public.klanten (bedrijf, status, casemanager, medewerkers, bezoek_postcode, bezoek_plaats) values
${KLANTEN.map((k) => `(${k.map(lit).join(", ")})`).join(",\n")};`);
  check(sql("select permissions::text from public.roles where key = 'werknemer'") === "{weekevaluatie,overleg}", "de rol werknemer heeft het recht overleg");
  check(sql("select 'overleg' = any(permissions) from public.roles where key = 'superadmin'") === "t" && sql("select 'overleg' = any(permissions) from public.roles where key = 'beheerder'") === "t", "de super admin en de beheerder ook");
  check(sql("select coalesce('overleg' = any(permissions), false) from public.roles where key = 'redacteur'") === "f", "de redacteur niet");
  check(!mag(() => sql("set role anon; select count(*) from public.cm_overleggen")), "anon leest geen overleggen");
  check(sql("select has_function_privilege('anon', 'public.cm_kaart()', 'execute')") === "f" && sql("select has_function_privilege('authenticated', 'public.cm_kaart()', 'execute')") === "t", "anon kan de kaart niet opvragen, een ingelogde collega wel");
  const kaartTelling = alsCollega(LOTTE.id, LOTTE.email, `select count(*) from public.cm_kaart() where bedrijf in (${KLANTEN.map((k) => lit(k[0])).join(", ")})`);
  check(kaartTelling === "7", `de werknemer krijgt de zeven echte klanten voor de kaart, niet de lead (${kaartTelling})`);
  check(!mag(() => alsCollega(LOTTE.id, LOTTE.email, "insert into public.cm_overleggen (datum) values (now())")), "een werknemer plant zelf geen overleg");
  check(!mag(() => alsCollega(LOTTE.id, LOTTE.email, "select count(*) from public.klanten")) || alsCollega(LOTTE.id, LOTTE.email, "select count(*) from public.klanten") === "0", "en leest de klantenlijst zelf niet");
  const geheimLotte = await stelAuthenticatorIn(LOTTE.email, LOTTE.wachtwoord);

  const browser = await chromium.launch();
  const paginafouten = [];
  const nieuwePagina = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => paginafouten.push(String(e)));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    return page;
  };
  const b = await nieuwePagina();
  const w = await nieuwePagina();

  stap("Het beheer plant het overleg uit het ritme");
  await inloggen(b, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await b.goto(`${BASIS}/admin`);
  check(await b.locator('aside nav a[href="/admin/overleg"]').count(), "CM-overleg in het menu van het beheer");
  await b.goto(`${BASIS}/admin/overleg`);
  await b.waitForSelector("h1:has-text('CM-overleg')");
  check((await b.locator("#volgend-kop").innerText()).includes("Nog niet gepland"), "nog geen overleg gepland");
  check((await b.inputValue("#plan-datum")) === eersteDinsdag && (await b.inputValue("#plan-tijd")) === "09:30" && (await b.inputValue("#plan-eind")) === "10:30" && (await b.inputValue("#plan-locatie")) === "Kantoor Eindhoven", `het ritme stelt de eerstvolgende dinsdag van 09:30 tot 10:30 voor (${eersteDinsdag})`);
  await b.fill("#plan-eind", "10:45");
  await b.click("button:has-text('Overleg plannen')");
  await b.waitForURL(/opgeslagen=overleg-gepland/, { timeout: 20000 });
  const OVERLEG = sql("select id from public.cm_overleggen where afgerond_at is null");
  check(sql(`select to_char(datum at time zone 'Europe/Amsterdam', 'YYYY-MM-DD HH24:MI') || '-' || to_char(einde at time zone 'Europe/Amsterdam', 'HH24:MI') || '|' || locatie from public.cm_overleggen where id = '${OVERLEG}'`) === `${eersteDinsdag} 09:30-10:45|Kantoor Eindhoven`, "gepland in Nederlandse tijd, van tot, met de plek");
  check(sql(`select string_agg(titel, '|' order by sort) from public.cm_agendapunten where overleg_id = '${OVERLEG}' and vast`) === "Check in|Dossiers|Klanten|Punten voor het MT-overleg|Behoeftes|Vakantie en verlof", "met de structurele punten van het team op de agenda");
  check((await b.locator("#volgend-kop").innerText()).toLowerCase().includes("dinsdag") && (await b.locator("#volgend").innerText()).includes("09:30 tot 10:45"), "de kop noemt de dag en de tijd van tot");
  // Aanwezigen en notulist: de werknemer notuleert.
  await b.locator("#bezetting-formulier label:has(input[value='" + LOTTE.id + "'])").click();
  await b.locator("#bezetting-formulier label:has(input[value='" + RENS_ID + "'])").click();
  await b.fill("#bezet-extra", "Gast van een partner");
  await b.selectOption("#bezet-notulist", LOTTE.id);
  await b.click("#bezetting-formulier button:has-text('Bewaren')");
  await b.waitForURL(/opgeslagen=overleg-bezetting/, { timeout: 20000 });
  check(sql(`select string_agg(naam || ':' || coalesce(user_id::text, '-'), '|' order by sort) from public.cm_aanwezigen where overleg_id = '${OVERLEG}'`).split("|").length === 3, "drie aanwezigen bewaard, waarvan één zonder inlog");
  check(sql(`select notulist || '|' || notulist_naam from public.cm_overleggen where id = '${OVERLEG}'`) === `${LOTTE.id}|${LOTTE.naam}`, "de werknemer is notulist");
  check((await b.locator("#bezetting").innerText()).includes(LOTTE.naam) && (await b.locator("#bezetting").innerText()).includes("Gast van een partner"), "aanwezigen en notulist staan bij het overleg");

  stap("De kaart van Nederland");
  const kaart = b.locator("#verdeling-kaart");
  check((await kaart.locator("path").count()) >= 342, "alle gemeenten staan op de kaart");
  const punten = await kaart.locator("circle.kaart-punt").evaluateAll((cs) => cs.map((c) => c.getAttribute("data-klant")).filter((n) => n !== null));
  const testPunten = punten.filter((n) => KLANTEN.some((k) => k[0] === n));
  check(testPunten.length === 6 && !testPunten.includes("Alleen Een Lead BV") && !testPunten.includes("Zonder Adres BV"), `zes klanten als stip, zonder de lead en zonder wie geen plek heeft (${testPunten.join(", ")})`);
  check(testPunten.includes("Kantoor Hofstad"), "een klant zonder postcode maar met Den Haag als plaats staat op de kaart");
  const legenda = (await b.locator("#kaart-legenda").innerText()).replace(/\s+/g, " ");
  check(legenda.includes("Fleur 2 klanten · 42 werknemers · 1 gemeente") && legenda.includes("Jasper 2 klanten · 58 werknemers · 1 gemeente") && legenda.includes("Sanne 2 klanten · 100 werknemers · 2 gemeenten"), `per casemanager klanten, werknemers en gemeenten (${legenda.slice(0, 200)})`);
  const vlakken = await kaart.locator(".laag-werkgebied path.kaart-vlak title").allTextContents();
  check(["Eindhoven: Fleur", "Tilburg: Jasper", "Rotterdam: Sanne", "'s-Gravenhage: Sanne"].every((v) => vlakken.includes(v)), `het werkgebied kleurt de gemeenten per casemanager (${vlakken.join(", ")})`);
  check((await b.locator("#zonder-plek").innerText()).includes("Zonder Adres BV") && (await b.locator("#zonder-cm").innerText()).includes("Nog Te Verdelen BV"), "wie nog geen plek of casemanager heeft, staat eronder");
  check(await b.locator('#zonder-plek a[href^="/admin/klanten/"]').count(), "het beheer klikt door naar de stamkaart");
  await b.click("label[for='laag-werkgebied']");
  check(await b.locator(".laag-werkgebied").evaluate((g) => getComputedStyle(g).display) === "none", "de laag werkgebied gaat uit");
  await b.click("label[for='laag-werkgebied']");
  await b.click("#kaart-legenda button[data-cm-naam='Sanne']");
  await wacht(500);
  const dim = await kaart.locator("circle.kaart-punt[data-klant='Bakkerij De Korenaar']").evaluate((c) => Number(getComputedStyle(c).opacity));
  const fel = await kaart.locator("circle.kaart-punt[data-klant='Haven Logistiek']").evaluate((c) => Number(getComputedStyle(c).opacity));
  check(dim < 0.5 && fel === 1, `Sanne uitlichten verbleekt de rest (${dim} tegen ${fel})`);
  await b.screenshot({ path: path.join(SHOTS, "01-overleg-beheer-1440.png"), fullPage: true });
  await b.click("#kaart-legenda button[data-cm-naam='Sanne']");

  stap("De werknemer: Mijn React2u met het CM-overleg, een punt inbrengen");
  await inloggen(w, LOTTE.email, LOTTE.wachtwoord, geheimLotte);
  await w.goto(`${BASIS}/admin`);
  const menu = await w.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(JSON.stringify(menu) === JSON.stringify(["/admin", "/admin/weekevaluatie", "/admin/overleg"]), `menu: Dashboard, Weekevaluatie, CM-overleg (${menu.join(", ")})`);
  check((await w.locator("aside").first().innerText()).includes("Mijn React2u"), "nog steeds Mijn React2u");
  const kaartje = (await w.locator("#cm-overleg").innerText()).replace(/\s+/g, " ");
  check(kaartje.includes("6 punten op de agenda") && /dinsdag/i.test(kaartje), `het dashboard toont het volgende overleg (${kaartje.slice(0, 120)})`);
  await w.goto(`${BASIS}/admin/overleg`);
  check(!(await w.locator("#plannen, #ritme, #afronden, #bezet-notulist").count()), "geen plannen, afronden, ritme of notulist kiezen voor een werknemer");
  check(await w.locator("#notulen-formulier").count() && await w.locator("#actie-maken").count() && await w.locator("#bezetting-formulier").count(), "maar als notulist wel de notulen, actiepunten en aanwezigen");
  check((await w.locator("#agenda-structureel li[data-punt]").count()) === 6, "de zes structurele punten");
  check(!(await w.locator('#agenda form button:has(.sr-only)').count()), "vaste punten haalt een werknemer niet weg");
  check(!(await w.locator('#zonder-plek a').count()) && await w.locator("#verdeling-kaart circle.kaart-punt").count(), "de kaart staat er ook voor de werknemer, zonder links naar de stamkaart");
  await w.fill("#punt-titel", "Even weg");
  await w.click("button:has-text('Op de agenda')");
  await w.waitForURL(/opgeslagen=agendapunt/, { timeout: 20000 });
  await w.locator("li[data-punt='Even weg'] form button").click();
  await w.waitForURL(/opgeslagen=agendapunt-weg/, { timeout: 20000 });
  check(sql("select count(*) from public.cm_agendapunten where titel = 'Even weg'") === "0", "een eigen punt weer weghalen");
  await w.fill("#punt-titel", "Verdeling na de twee nieuwe klanten in Tilburg");
  await w.fill("#punt-toelichting", "Jasper heeft er nu veel in die hoek.");
  await w.click("button:has-text('Op de agenda')");
  await w.waitForURL(/opgeslagen=agendapunt/, { timeout: 20000 });
  check(sql(`select door || '|' || door_email || '|' || vast from public.cm_agendapunten where titel like 'Verdeling na de twee%'`) === `${LOTTE.id}|${LOTTE.email}|false`, "een punt ingebracht, op naam van de werknemer");
  check((await w.locator("li[data-punt^='Verdeling na de twee']").innerText()).includes("jouw punt"), "het punt staat erbij als jouw punt");
  await w.fill("#punt-titel", "Wie doet de spoor 2-aanmeldingen?");
  await w.check("input[name='voor_volgend']");
  await w.click("button:has-text('Op de agenda')");
  await w.waitForURL(/opgeslagen=agendapunt-volgend/, { timeout: 20000 });
  check((await w.locator("#volgend-overleg").innerText()).includes("Wie doet de spoor 2-aanmeldingen?") && (await w.locator("#volgend-overleg").innerText()).includes("Inbrenger: jij"), "een punt voor het volgende overleg, met de inbrenger");
  const VAST = sql(`select id from public.cm_agendapunten where overleg_id = '${OVERLEG}' and titel = 'Behoeftes'`);
  check(alsCollega(LOTTE.id, LOTTE.email, `with weg as (delete from public.cm_agendapunten where id = '${VAST}' returning 1) select count(*) from weg`) === "0", "een vast punt weghalen laat de database niet toe");
  check(!mag(() => alsCollega(LOTTE.id, LOTTE.email, `insert into public.cm_agendapunten (overleg_id, titel, vast) values ('${OVERLEG}', 'Zelf vast', true)`)), "en zelf een vast punt maken ook niet");

  stap("Tijdens het overleg: de notulist vinkt af, notuleert en maakt actiepunten");
  await w.goto(`${BASIS}/admin/overleg`);
  await w.click("button[role='checkbox'][aria-label='Besproken: Check in']");
  check(await totDat(() => sql(`select besproken from public.cm_agendapunten where overleg_id = '${OVERLEG}' and titel = 'Check in'`) === "t"), "de notulist vinkt af wat besproken is");
  const formulier = w.locator("#notulen-formulier");
  check((await formulier.locator("textarea[name^='checkin:']").count()) === 3, "bij de check-in een veld per aanwezige");
  check((await formulier.locator("[data-notulen-punt='Dossiers']").innerText()).includes("geen namen, geen diagnoses"), "bij Dossiers de regel: alleen werkwijze en afspraken");
  await formulier.locator(`textarea[aria-label='Check in van ${LOTTE.naam}']`).fill("Gaat goed, twee nieuwe klanten opgestart.");
  await formulier.locator("textarea[aria-label='Check in van Gast van een partner']").fill("Even meegekeken.");
  await formulier.locator("textarea[aria-label='Notulen bij Klanten']").fill("Klantevaluaties worden gepland.");
  await formulier.locator("textarea[aria-label='Notulen bij Dossiers']").fill("Bij een vraag over een vaststellingsovereenkomst verwijzen we naar een jurist.");
  await formulier.locator("button:has-text('Notulen bewaren')").click();
  await w.waitForURL(/opgeslagen=overleg-notulen/, { timeout: 20000 });
  check(sql(`select checkin from public.cm_aanwezigen where overleg_id = '${OVERLEG}' and user_id = '${LOTTE.id}'`).startsWith("Gaat goed") && sql(`select notulen from public.cm_agendapunten where overleg_id = '${OVERLEG}' and titel = 'Klanten'`) === "Klantevaluaties worden gepland.", "de check-in en de notulen per punt bewaard, door de notulist");
  await w.fill("#actie-wat", "Werkgever bellen over de evaluatie");
  await w.selectOption("#actie-wie", LOTTE.id);
  await w.fill("#actie-wanneer", plus(vandaag, -1));
  await w.click("button:has-text('Actiepunt maken')");
  await w.waitForURL(/opgeslagen=actiepunt/, { timeout: 20000 });
  check(sql(`select wie || '|' || wie_naam || '|' || wanneer from public.cm_actiepunten where wat = 'Werkgever bellen over de evaluatie'`) === `${LOTTE.id}|${LOTTE.naam}|${plus(vandaag, -1)}`, "de notulist maakt een actiepunt, met naam en datum");
  sql(`insert into public.cm_actiepunten (overleg_id, wat, wie, wie_naam) values ('${OVERLEG}', 'Prijslijst nalopen', '${RENS_ID}', 'Rens')`);
  // Zonder notulist mag een werknemer niet notuleren.
  sql(`update public.cm_overleggen set notulist = null where id = '${OVERLEG}'`);
  check(alsCollega(LOTTE.id, LOTTE.email, `with u as (update public.cm_agendapunten set notulen = 'stiekem' where overleg_id = '${OVERLEG}' and titel = 'Behoeftes' returning 1) select count(*) from u`) === "0", "wie geen notulist is, schrijft geen notulen");
  sql(`update public.cm_overleggen set notulist = '${LOTTE.id}' where id = '${OVERLEG}'`);

  await w.goto(`${BASIS}/admin`);
  const dash = (await w.locator("#cm-overleg").innerText()).replace(/\s+/g, " ");
  check(dash.includes("Werkgever bellen over de evaluatie") && /te laat/i.test(dash), "de werknemer ziet het actiepunt op het dashboard, als te laat");
  await w.goto(`${BASIS}/admin/overleg`);
  check(!(await w.locator("button[role='checkbox'][aria-label='Gedaan: Prijslijst nalopen']").count()), "het actiepunt van een ander vinkt de werknemer niet af");
  const ANDER = sql("select id from public.cm_actiepunten where wat = 'Prijslijst nalopen'");
  check(alsCollega(LOTTE.id, LOTTE.email, `select public.cm_actiepunt_zetten('${ANDER}', true)`) === "f", "ook niet via de database");
  await w.click("button[role='checkbox'][aria-label='Gedaan: Werkgever bellen over de evaluatie']");
  check(await totDat(() => sql(`select gedaan_door from public.cm_actiepunten where wat = 'Werkgever bellen over de evaluatie'`) === LOTTE.email), "het eigen actiepunt afgevinkt, door de werknemer zelf");
  await w.screenshot({ path: path.join(SHOTS, "02-overleg-werknemer-1440.png"), fullPage: true });

  stap("Afronden: archief, volgend overleg en de notulen per mail");
  await b.goto(`${BASIS}/admin/overleg`);
  const voorAfronden = mails().length;
  await b.click("button:has-text('Overleg afronden')");
  await b.waitForURL(/opgeslagen=overleg-afgerond/, { timeout: 30000 });
  check(new URL(b.url()).searchParams.get("opgeslagen") === "overleg-afgerond", "afgerond, met mail");
  check(sql(`select (afgerond_at is not null) || '|' || (gemaild_at is not null) from public.cm_overleggen where id = '${OVERLEG}'`) === "true|true", "het overleg is afgerond en de notulen zijn gemaild");
  const VOLGEND = sql("select id from public.cm_overleggen where afgerond_at is null");
  check(VOLGEND && sql(`select to_char(datum at time zone 'Europe/Amsterdam', 'YYYY-MM-DD HH24:MI') || '-' || to_char(einde at time zone 'Europe/Amsterdam', 'HH24:MI') from public.cm_overleggen where id = '${VOLGEND}'`) === `${plus(eersteDinsdag, 14)} 09:30-10:30`, "het volgende staat twee weken later klaar, van 09:30 tot 10:30");
  check(sql(`select count(*) from public.cm_agendapunten where overleg_id = '${VOLGEND}' and vast`) === "6", "met de structurele punten");
  check(sql(`select overleg_id || '|' || doorgeschoven from public.cm_agendapunten where titel like 'Verdeling na de twee%'`) === `${VOLGEND}|true`, "het niet besproken punt van de werknemer schuift door, als uit vorig overleg");
  check(sql(`select string_agg(overleg_id || '|' || voor_volgend || '|' || doorgeschoven, ' ' order by voor_volgend desc) from public.cm_agendapunten where titel = 'Wie doet de spoor 2-aanmeldingen?'`) === `${OVERLEG}|true|false ${VOLGEND}|false|true`, "het punt voor het volgende overleg blijft bij de notulen en staat als kopie op de nieuwe agenda");
  check(sql(`select overleg_id from public.cm_agendapunten where titel = 'Klanten' and notulen is not null`) === OVERLEG, "wat genotuleerd is, blijft bij het oude overleg");
  check(await totDat(() => mails().slice(voorAfronden).filter((m) => (m.subject || "").startsWith("Notulen CM-overleg")).length === 2), "de notulen gaan naar de twee aanwezigen met een inlog");
  const notulenMail = mails().slice(voorAfronden).find((m) => m.to.includes(LOTTE.email) && (m.subject || "").startsWith("Notulen CM-overleg"));
  check(notulenMail && notulenMail.html.includes("Wie doet de spoor 2-aanmeldingen?"), "de mail noemt de punten voor het volgende overleg");
  check(notulenMail && notulenMail.html.includes("Gaat goed, twee nieuwe klanten opgestart.") && notulenMail.html.includes("Klantevaluaties worden gepland.") && notulenMail.html.includes("Gast van een partner") && notulenMail.html.includes(`/admin/overleg/${OVERLEG}`), "met de check-in, de notulen per punt en de aanwezigen");
  const rensMail = mails().slice(voorAfronden).find((m) => m.to.includes(BEHEERDER.email) && (m.subject || "").startsWith("Notulen CM-overleg"));
  check(rensMail && rensMail.html.includes("Jouw actiepunten") && rensMail.html.includes("Prijslijst nalopen"), "wie nog een actiepunt open heeft, ziet dat bovenaan");
  fs.writeFileSync(path.join(SHOTS, "mail-notulen.html"), notulenMail?.html || "");
  await b.goto(`${BASIS}/admin/overleg`);
  check((await b.locator("#agenda-vorig").innerText()).includes("Verdeling na de twee nieuwe klanten in Tilburg"), "op de nieuwe agenda onder uit vorig overleg");
  check((await b.locator("#archief").innerText()).includes("gemaild"), "het oude overleg staat in het archief, gemaild");

  stap("Het archief, in de vorm van het team");
  await w.goto(`${BASIS}/admin/overleg/${OVERLEG}`);
  const archief = (await w.locator("main").innerText()).replace(/\s+/g, " ");
  check(archief.includes(`Notulist ${LOTTE.naam}`) && archief.includes("Gast van een partner") && archief.includes("09:30 tot 10:45"), "gegevens: tijd van tot, aanwezigen en notulist");
  check(archief.includes(`${LOTTE.naam}: Gaat goed, twee nieuwe klanten opgestart.`) && archief.includes("Gast van een partner: Even meegekeken."), "de check-in per persoon");
  check(archief.includes("Bij een vraag over een vaststellingsovereenkomst verwijzen we naar een jurist.") && archief.includes("Werkgever bellen over de evaluatie"), "de notulen per punt en de actiepunten");
  check(/Actie en gemaakte afspraken/i.test(archief) && /Gedaan|Lopend/.test(archief), "actie en gemaakte afspraken met de status");
  check(archief.includes("Wie doet de spoor 2-aanmeldingen?"), "en de punten voor het volgende overleg, met de inbrenger");
  check(!(await w.locator("textarea").count()), "zonder de notulen te kunnen wijzigen");
  await w.screenshot({ path: path.join(SHOTS, "03-archief-1440.png"), fullPage: true });
  await b.goto(`${BASIS}/admin/overleg/${OVERLEG}`);
  check(await b.locator("summary:has-text('Notulen aanvullen')").count(), "het beheer kan de notulen achteraf aanvullen");

  stap("De herinnering per mail, de werkdag ervoor");
  const doel = herinneringVoor(vandaag);
  sql(`update public.cm_overleggen set datum = ('${doel} 09:30'::timestamp at time zone 'Europe/Amsterdam'), herinnerd_at = null where id = '${VOLGEND}'`);
  const cron = (q = "") => b.request.get(`${BASIS}/api/cron/overleg${q}`, { headers: { authorization: "Bearer e2e-cron-geheim" } });
  check((await b.request.get(`${BASIS}/api/cron/overleg`)).status() === 401, "zonder geheim: 401");
  let cr = await (await cron("?dry=1")).json();
  const aanLotte = (cr.plannen || []).find((p) => p.aan === LOTTE.email);
  check(cr.ok && aanLotte && aanLotte.onderwerp.startsWith("CM-overleg ") && aanLotte.onderwerp.endsWith("om 09:30") && (cr.plannen || []).some((p) => p.aan === BEHEERDER.email), `droog: een herinnering voor de werknemer en het beheer (${aanLotte?.onderwerp})`);
  const voor = mails().length;
  cr = await (await cron()).json();
  check(cr.verstuurd >= 2 && cr.mislukt.length === 0, `verstuurd: ${cr.verstuurd}`);
  check(await totDat(() => mails().slice(voor).some((m) => m.to.includes(LOTTE.email))), "de mail is onderschept");
  const mail = mails().slice(voor).find((m) => m.to.includes(LOTTE.email));
  check(mail && mail.html.includes("Verdeling na de twee nieuwe klanten in Tilburg") && mail.html.includes("Vakantie en verlof") && mail.html.includes("/admin/overleg") && mail.html.includes("Hoi Lotte"), "met de agenda, de aanhef en een knop naar het overleg");
  fs.writeFileSync(path.join(SHOTS, "mail-herinnering.html"), mail?.html || "");
  check(sql(`select herinnerd_at is not null from public.cm_overleggen where id = '${VOLGEND}'`) === "t", "de database onthoudt dat er herinnerd is");
  cr = await (await cron("?dry=1")).json();
  check(String(cr.reden || "").startsWith("geen overleg"), "een tweede keer gaat er niets uit");

  stap("Het ritme aanpassen");
  await b.goto(`${BASIS}/admin/overleg#ritme`);
  await b.selectOption("#ritme-weken", "1");
  await b.selectOption("#ritme-dag", "4");
  await b.fill("#ritme-tijd", "14:00");
  await b.click("button:has-text('Ritme bewaren')");
  await b.waitForURL(/opgeslagen=overleg-ritme/, { timeout: 20000 });
  check(sql("select elke_weken || '|' || weekdag || '|' || to_char(tijd, 'HH24:MI') from public.cm_ritme") === "1|4|14:00", "elke week op donderdag om 14:00");

  stap("Wisselen tussen Beheer en Mijn React2u");
  await w.goto(`${BASIS}/admin`);
  check(!(await w.locator("#weergave-wisselen").count()), "een werknemer heeft geen wisselknop: die zit altijd in Mijn React2u");
  await b.goto(`${BASIS}/admin`);
  check((await b.locator("#weergave-wisselen").innerText()).includes("Naar Mijn React2u"), "het beheer heeft onderaan een knop naar Mijn React2u");
  await b.click("#weergave-wisselen");
  await b.waitForSelector("#weergave-wisselen:has-text('Naar Beheer')", { timeout: 20000 });
  check((await b.locator("aside").first().innerText()).includes("Mijn React2u") && !(await b.locator("aside").first().innerText()).includes("SYSTEEMBEHEER"), "de zijbalk zegt Mijn React2u");
  const menuMijn = await b.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(JSON.stringify(menuMijn) === JSON.stringify(["/admin", "/admin/weekevaluatie", "/admin/overleg"]), `in Mijn React2u het menu van een werknemer (${menuMijn.join(", ")})`);
  check(!(await b.locator('button[aria-label="Zoeken (⌘K)"]').count()) && await b.locator("#cm-overleg").count(), "zonder zoekveld, met het overleg op het dashboard");
  check(!(await b.locator('main a[href="/admin/postvak-in"], main a[href="/admin/bellijst"]').count()), "zonder de beheeronderdelen op het dashboard");
  await b.goto(`${BASIS}/admin/overleg`);
  check(!(await b.locator("#plannen, #notulen-formulier, #ritme, #actie-maken, #afronden").count()) && await b.locator("#inbrengen").count(), "het overleg zoals een casemanager het ziet: inbrengen wel, plannen en notulen niet");
  await b.goto(`${BASIS}/admin/weekevaluatie`);
  check(!(await b.locator('a[href="/admin/weekevaluatie/team"]').count()), "geen link naar het kwartaaloverzicht");
  await b.screenshot({ path: path.join(SHOTS, "05-beheer-in-mijn-react2u-1440.png"), fullPage: true });
  check((await b.locator("#weergave-wisselen").innerText()).includes("Naar Beheer"), "de knop gaat nu terug naar Beheer");
  await b.click("#weergave-wisselen");
  await b.waitForSelector("#weergave-wisselen:has-text('Naar Mijn React2u')", { timeout: 20000 });
  check(await b.locator('aside nav a[href="/admin/klantenbord"]').count(), "terug in Beheer, met het volledige menu");
  await b.goto(`${BASIS}/admin/overleg`);
  check(await b.locator("#notulen-formulier").count() && await b.locator("#afronden").count(), "en weer de notulen en het afronden");

  for (const [page, url, naam] of [[w, "/admin", "dashboard"], [w, "/admin/overleg", "overleg-werknemer"], [b, "/admin/overleg", "overleg-beheer"], [w, `/admin/overleg/${OVERLEG}`, "archief"]]) {
    stap(`Telefoon: ${naam}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASIS}${url}`);
    await page.waitForSelector("h1");
    const o = await overloop(page);
    check(o <= 0, `${naam}: geen horizontale scroll op 390 px (${o})`);
    await page.addStyleTag({ content: ".sticky { position: static !important; }" });
    await page.screenshot({ path: path.join(SHOTS, `04-${naam}-390.png`), fullPage: true });
  }

  sql(`delete from public.cm_overleggen;
update public.cm_ritme set elke_weken = 2, weekdag = 2, tijd = '09:30', locatie = null;
delete from public.klanten where bedrijf in (${KLANTEN.map((k) => lit(k[0])).join(", ")});
delete from public.medewerkers where user_id = '${LOTTE.id}';`);
  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
