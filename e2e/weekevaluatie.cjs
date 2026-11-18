// Weekevaluatie (0044) van begin tot eind: de rol werknemer en het recht in de database, een collega met die rol
// die na het inloggen alleen het dashboard, zijn weekevaluatie en Account ziet (omzet en het kwartaaloverzicht
// sturen hem weg), het signaal op het dashboard, deze week en vorige week invullen, een gesloten week die niet
// meer kan (ook niet rechtstreeks in de database), alleen de eigen rijen zien, dan de beheerder met het
// kwartaaloverzicht (gemiddelden, trend, gemiste weken, de teksten), de koppeling aan een medewerker zodat de
// uren ernaast staan (ook bij de collega zelf), de export als Excelbestand en de vrijdagherinnering via de cron
// (wie al invulde krijgt niets; de super admin pas als hij zelf meedoet). Beide collega's werken in een eigen
// browsercontext, zodat niemand twee keer hoeft in te loggen.
// Draaien via e2e/run.mjs (E2E_ALLEEN=weekevaluatie), na omzet.cjs: die maakt de medewerkers leeg.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "weekevaluatie");
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

/** De testcollega met de rol werknemer (alleen in de testomgeving). */
const WERKNEMER = { id: "bbbbbbbb-0000-4000-8000-000000000002", email: "noor@react2u.test", wachtwoord: "Test-wachtwoord-456", naam: "Noor de Vries" };

// Dezelfde weekregels als lib/weekevaluatie.ts, om de verwachting uit te rekenen.
const DAG = 86_400_000;
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const utc = (d) => new Date(`${d}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const maandag = (d) => iso(new Date(utc(d).getTime() - ((utc(d).getUTCDay() + 6) % 7) * DAG));
const plusWeken = (m, n) => iso(new Date(utc(m).getTime() + n * 7 * DAG));
const weeknr = (m) => {
  const don = new Date(utc(m).getTime() + 3 * DAG);
  const v = new Date(Date.UTC(don.getUTCFullYear(), 0, 4));
  const start = new Date(v.getTime() - ((v.getUTCDay() + 6) % 7) * DAG);
  return 1 + Math.round((utc(m).getTime() - start.getTime()) / (7 * DAG));
};
const kwartaalVan = (m) => {
  const don = new Date(utc(m).getTime() + 3 * DAG);
  return { jaar: don.getUTCFullYear(), kwartaal: Math.floor(don.getUTCMonth() / 3) + 1 };
};
const dezeWeek = maandag(vandaag);
const vorigeWeek = plusWeken(dezeWeek, -1);
const kwartaal = kwartaalVan(dezeWeek);
const kwartaalSleutel = `${kwartaal.jaar}-Q${kwartaal.kwartaal}`;
// De gesloten weken van dit kwartaal (van oud naar nieuw), en die van het kwartaal ervoor.
const geslotenDitKwartaal = [];
for (let w = plusWeken(dezeWeek, -2); kwartaalVan(w).jaar === kwartaal.jaar && kwartaalVan(w).kwartaal === kwartaal.kwartaal; w = plusWeken(w, -1)) geslotenDitKwartaal.unshift(w);
const eersteWeekKwartaal = geslotenDitKwartaal[0] || vorigeWeek;
const vorigKwartaalWeken = [plusWeken(eersteWeekKwartaal, -1), plusWeken(eersteWeekKwartaal, -2)];

/** Een authenticator voor een collega instellen (tweestaps is verplicht); het geheim gaat naar de test. */
async function stelAuthenticatorIn(email, wachtwoord) {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-werknemer-${Date.now()}` });
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

/** Als de collega zelf: SQL met de rechten van de ingelogde gebruiker (RLS geldt). Alleen de laatste regel is het antwoord. */
function alsCollega(userId, q) {
  return sql(`set role authenticated; set request.jwt.claim.sub = '${userId}'; set request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ${q}`).split("\n").pop();
}
const inKwartaal = (wk) => kwartaalVan(wk).jaar === kwartaal.jaar && kwartaalVan(wk).kwartaal === kwartaal.kwartaal;
// De open weken die bij dit kwartaal horen (aan het begin van een kwartaal valt vorige week er nog buiten).
const openInKwartaal = [vorigeWeek, dezeWeek].filter(inKwartaal);

const schaal = async (page, naam, waarde) => page.click(`label:has(input[name="${naam}"][value="${waarde}"])`);

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);

  stap("Database: het recht, de rol werknemer en de testcollega");
  check(sql("select permissions::text from public.roles where key = 'werknemer'") === "{weekevaluatie}", "de rol werknemer heeft alleen het recht weekevaluatie");
  check(sql("select is_system from public.roles where key = 'werknemer'") === "f", "en is geen systeemrol");
  check(sql("select 'weekevaluatie' = any(permissions) from public.roles where key = 'superadmin'") === "t", "de super admin heeft het recht ook");
  check(sql("select 'weekevaluatie' = any(permissions) from public.roles where key = 'beheerder'") === "t", "de beheerder ook");
  check(sql("select coalesce('weekevaluatie' = any(permissions), false) from public.roles where key = 'redacteur'") === "f", "de redacteur niet");
  sql(`delete from public.weekevaluaties; delete from public.medewerkers;
delete from public.admins where user_id = '${WERKNEMER.id}'; delete from auth.identities where user_id = '${WERKNEMER.id}'; delete from auth.users where id = '${WERKNEMER.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', '${WERKNEMER.id}', 'authenticated', 'authenticated', '${WERKNEMER.email}', extensions.crypt('${WERKNEMER.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${WERKNEMER.id}', '${WERKNEMER.id}', '{"sub":"${WERKNEMER.id}","email":"${WERKNEMER.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${WERKNEMER.id}', '${WERKNEMER.email}', id, '${eersteWeekKwartaal}' from public.roles where key = 'werknemer';`);
  check(sql(`select r.key from public.admins a join public.roles r on r.id = a.role_id where a.user_id = '${WERKNEMER.id}'`) === "werknemer", "de testcollega heeft de rol werknemer");
  let anonLeest = true;
  try { sql("set role anon; select count(*) from public.weekevaluaties"); } catch { anonLeest = false; }
  check(!anonLeest, "anon kan weekevaluaties niet lezen");
  const geheimWerknemer = await stelAuthenticatorIn(WERKNEMER.email, WERKNEMER.wachtwoord);

  const browser = await chromium.launch();
  const paginafouten = [];
  const nieuwePagina = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => paginafouten.push(String(e)));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    return page;
  };
  const w = await nieuwePagina(); // de werknemer
  const b = await nieuwePagina(); // de beheerder (super admin)

  stap("De werknemer logt in en ziet alleen zijn eigen onderdelen");
  await inloggen(w, WERKNEMER.email, WERKNEMER.wachtwoord, geheimWerknemer);
  await w.goto(`${BASIS}/admin`);
  const menu = await w.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(JSON.stringify(menu) === JSON.stringify(["/admin", "/admin/weekevaluatie", "/admin/account"]), `menu: alleen Dashboard, Weekevaluatie en Account (${menu.join(", ")})`);
  check((await w.locator("body").innerText()).includes("Werknemer"), "de rol staat onder in het menu");
  const signaal = await w.locator("#weekevaluatie-open").innerText();
  check(/weekevaluaties van week \d+ en \d+ staan nog open/.test(signaal), `dashboard: beide weken staan nog open (${signaal.split("\n")[0]})`);
  // De melding (?fout=geen-rechten) haalt de Toast meteen uit de URL; het pad zegt genoeg.
  await w.goto(`${BASIS}/admin/omzet`);
  check(new URL(w.url()).pathname === "/admin", "omzet stuurt de werknemer terug naar het dashboard");
  await w.goto(`${BASIS}/admin/weekevaluatie/team`);
  check(new URL(w.url()).pathname === "/admin", "het kwartaaloverzicht ook");
  await w.goto(`${BASIS}/admin/bellijst`);
  check(new URL(w.url()).pathname === "/admin", "de bellijst ook");

  stap("Deze week invullen");
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  await w.waitForSelector("h1:has-text('Mijn weekevaluatie')");
  check(await w.locator(`h2:has-text("Week ${weeknr(dezeWeek)}")`).count(), `het formulier staat op week ${weeknr(dezeWeek)}`);
  check((await w.locator('input[type="radio"]').count()) === 50, "vijf schalen van tien");
  for (const [naam, waarde] of [["energie", 7], ["werkdruk", 6], ["voldoening", 8], ["samenwerking", 9], ["cijfer", 8]]) await schaal(w, naam, waarde);
  await w.fill("#we-goed", "Twee werknemers zijn weer gestart en de werkgever van de bakkerij belde zelf terug.");
  await w.fill("#we-beter", "Ik heb te lang gewacht met terugbellen.");
  await w.fill("#we-nodig", "Een uur samen door de spoor 2-dossiers.");
  await w.screenshot({ path: path.join(SHOTS, "01-formulier-1440.png"), fullPage: true });
  await w.click("button.abtn:has-text('Weekevaluatie bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(sql(`select (antwoorden->>'energie') || '/' || (antwoorden->>'cijfer') || '/' || door from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${dezeWeek}'`) === `7/8/${WERKNEMER.email}`, "bewaard: energie 7, cijfer 8, door de collega zelf");
  check(sql(`select antwoorden->>'goed' from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${dezeWeek}'`).startsWith("Twee werknemers"), "de tekst staat erin");
  check(sql(`select antwoorden ? 'trots' from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${dezeWeek}'`) === "f", "een leeg veld wordt niet opgeslagen");
  let tekst = await w.locator("body").innerText();
  check(tekst.includes("Bewaard op") && tekst.includes("Wijzigingen bewaren"), "het formulier zegt dat hij bewaard is en blijft te wijzigen");
  check(/Deze week[\s\S]*Ingevuld · cijfer 8/i.test(tekst), "de weekkaart toont ingevuld met het cijfer");
  check(await w.locator('input[name="cijfer"][value="8"]').isChecked(), "de keuze staat aangevinkt");

  stap("Vorige week aanpassen, een gesloten week niet");
  await w.goto(`${BASIS}/admin/weekevaluatie?week=${vorigeWeek}`);
  for (const [naam, waarde] of [["energie", 5], ["werkdruk", 4], ["voldoening", 6], ["samenwerking", 7], ["cijfer", 6]]) await schaal(w, naam, waarde);
  await w.fill("#we-knelpunt", "De bedrijfsarts was pas donderdag beschikbaar.");
  await w.click("button.abtn:has-text('Weekevaluatie bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(sql(`select count(*) from public.weekevaluaties where user_id = '${WERKNEMER.id}'`) === "2", "twee weken ingevuld");
  await w.goto(`${BASIS}/admin`);
  check(!(await w.locator("#weekevaluatie-open").count()), "dashboard: geen signaal meer");
  const gesloten = plusWeken(dezeWeek, -3);
  await w.goto(`${BASIS}/admin/weekevaluatie?week=${gesloten}`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("gesloten") && tekst.includes("niet ingevuld, en hij is inmiddels gesloten"), "een gesloten week zonder evaluatie is alleen tekst");
  check(!(await w.locator("button.abtn:has-text('bewaren')").count()), "zonder knop om te bewaren");
  let geslotenKon = true;
  try { alsCollega(WERKNEMER.id, `insert into public.weekevaluaties (user_id, week, antwoorden) values ('${WERKNEMER.id}', '${gesloten}', '{"cijfer":7}')`); } catch { geslotenKon = false; }
  check(!geslotenKon, "de database weigert een gesloten week, ook rechtstreeks");
  let anderKon = true;
  try { alsCollega(WERKNEMER.id, `insert into public.weekevaluaties (user_id, week, antwoorden) values ('aaaaaaaa-0000-4000-8000-000000000001', '${dezeWeek}', '{"cijfer":7}')`); } catch { anderKon = false; }
  check(!anderKon, "en een rij voor iemand anders");
  // Geschiedenis en een vergelijking voor het overzicht: gesloten weken van dit kwartaal (één laten we open als 'gemist')
  // en twee weken in het vorige kwartaal. Rechtstreeks als postgres: dat is het verleden.
  const seed = geslotenDitKwartaal.slice(-5);
  const gemist = seed.length > 1 ? seed[0] : null;
  const ingevuldSeed = seed.filter((x) => x !== gemist);
  const cijfers = [6, 7, 8, 7]; // gemiddeld 7 bij vier weken
  sql(ingevuldSeed.map((wk, i) => `insert into public.weekevaluaties (user_id, week, antwoorden, door, created_at, updated_at) values ('${WERKNEMER.id}', '${wk}', '{"energie":${cijfers[i % 4]},"werkdruk":${cijfers[i % 4]},"voldoening":7,"samenwerking":8,"cijfer":${cijfers[i % 4]},"goed":"Week ${weeknr(wk)} liep lekker.","trots":"De werkgever van de bakkerij voelde zich gehoord."}', '${WERKNEMER.email}', '${wk}T16:00:00Z', '${wk}T16:00:00Z');`).join("\n")
    + vorigKwartaalWeken.map((wk) => `insert into public.weekevaluaties (user_id, week, antwoorden, door, created_at, updated_at) values ('${WERKNEMER.id}', '${wk}', '{"energie":5,"werkdruk":5,"voldoening":6,"samenwerking":7,"cijfer":6}', '${WERKNEMER.email}', '${wk}T16:00:00Z', '${wk}T16:00:00Z');`).join("\n"));
  // De beheerder krijgt een rij van iemand anders om het lezen te testen: de werknemer mag die niet zien.
  sql(`insert into public.weekevaluaties (user_id, week, antwoorden, door) values ('aaaaaaaa-0000-4000-8000-000000000001', '${vorigeWeek}', '{"energie":9,"werkdruk":9,"voldoening":9,"samenwerking":9,"cijfer":9}', '${BEHEERDER.email}')`);
  check(alsCollega(WERKNEMER.id, "select count(*) from public.weekevaluaties") === String(2 + ingevuldSeed.length + vorigKwartaalWeken.length), "de werknemer ziet alleen zijn eigen rijen");
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("Jouw laatste twaalf weken") && tekst.includes("Eerdere weken"), "grafiek en geschiedenis staan er");
  if (gemist) check(tekst.includes("niet ingevuld"), "de gemiste week staat als niet ingevuld in de geschiedenis");
  // De eerste uitklapbare in de geschiedenis (de grafiek heeft er ook een, "Toon als tabel").
  await w.locator('section[aria-labelledby="geschiedenis-kop"] details summary').first().click();
  check((await w.locator("body").innerText()).includes("liep lekker"), "een eerdere week is terug te lezen");
  await w.screenshot({ path: path.join(SHOTS, "02-ingevuld-1440.png"), fullPage: true });
  sql(`delete from public.weekevaluaties where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'`);

  stap("De beheerder: het kwartaaloverzicht");
  await inloggen(b, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await b.goto(`${BASIS}/admin`);
  check(await b.locator('aside nav a[href="/admin/weekevaluatie"]').count(), "Weekevaluatie staat in het menu van de beheerder");
  await b.goto(`${BASIS}/admin/weekevaluatie`);
  check(await b.locator('a[href="/admin/weekevaluatie/team"]:has-text("Kwartaaloverzicht")').count(), "met de knop naar het kwartaaloverzicht");
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  await b.waitForSelector("h1:has-text('Weekevaluaties van het team')");
  tekst = await b.locator("body").innerText();
  check(tekst.includes(`Q${kwartaal.kwartaal} ${kwartaal.jaar}`) && tekst.includes("dit kwartaal"), "het lopende kwartaal staat open");
  check((await b.locator("section[id^=collega-]").count()) === 1, "één collega doet mee (de super admin vulde nooit in)");
  const kaart = b.locator(`#collega-${WERKNEMER.id}`);
  const kaartTekst = await kaart.innerText();
  check(kaartTekst.includes(WERKNEMER.email) && kaartTekst.includes("koppel aan een medewerker"), "nog niet gekoppeld: e-mailadres en de koppellink");
  const verwacht = openInKwartaal.length + geslotenDitKwartaal.length;
  const ingevuldAantal = openInKwartaal.length + ingevuldSeed.length;
  check(kaartTekst.includes(`${ingevuldAantal} van ${verwacht} ${verwacht === 1 ? "week" : "weken"} ingevuld`), `${ingevuldAantal} van ${verwacht} weken ingevuld (${kaartTekst.match(/\d+ van \d+ wek\w* ingevuld/)?.[0]})`);
  const alleGemist = geslotenDitKwartaal.filter((x) => !ingevuldSeed.includes(x));
  if (alleGemist.length) check(kaartTekst.includes(`gemist: ${alleGemist.map((x) => `wk ${weeknr(x)}`).join(", ")}`), `gemist: ${alleGemist.map(weeknr).join(", ")}`);
  else check(!kaartTekst.includes("gemist"), "niets gemist");
  // Gemiddeld cijfer: deze week 8, vorige week 6 (als die in dit kwartaal valt), plus de seed.
  const alle = [...openInKwartaal.map((wk) => (wk === dezeWeek ? 8 : 6)), ...ingevuldSeed.map((_, i) => cijfers[i % 4])];
  const gem = Math.round((alle.reduce((s, x) => s + x, 0) / alle.length) * 10) / 10;
  const gemTekst = Number.isInteger(gem) ? String(gem) : gem.toFixed(1).replace(".", ",");
  const t = Math.round((gem - 6) * 10) / 10;
  const trendTekst = t === 0 ? "±0" : `${t > 0 ? "+" : "−"}${Number.isInteger(Math.abs(t)) ? Math.abs(t) : Math.abs(t).toFixed(1).replace(".", ",")}`;
  check(new RegExp(`Cijfer\\s*${gemTekst}\\s*${trendTekst.replace("+", "\\+")}`, "i").test(kaartTekst), `cijfer gemiddeld ${gemTekst}, trend ${trendTekst} t.o.v. vorig kwartaal (6) (${kaartTekst.match(/Cijfer\s*[\d,]+\s*\S*/i)?.[0]})`);
  check(kaartTekst.includes("Lees wat Noor schreef"), "de teksten zijn uit te klappen, met de voornaam uit het e-mailadres");
  await kaart.locator("summary").last().click();
  check((await kaart.innerText()).includes("Twee werknemers zijn weer gestart") && (await kaart.innerText()).includes("voelde zich gehoord"), "de open antwoorden per week");
  check(/Ingevuld\s*\d+%/i.test(tekst) && tekst.includes("Het team per week"), "kerncijfers en de teamgrafiek");
  check((await b.locator("text=Toon als tabel").count()) >= 2, "grafieken hebben een tabel");
  check(await b.locator(`a[href="/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel}"]`).count(), "exportknop voor dit kwartaal");
  await b.screenshot({ path: path.join(SHOTS, "03-kwartaal-1440.png"), fullPage: true });
  await b.click('nav[aria-label="Kwartaal"] a[aria-label="Vorig kwartaal"]');
  await b.waitForURL(/kwartaal=/);
  tekst = await b.locator("body").innerText();
  check(/\d+ van \d+ weken ingevuld/.test(tekst) && tekst.includes("Lees wat Noor schreef") === false, "vorig kwartaal: alleen cijfers, geen teksten");

  stap("Koppelen aan een medewerker: uren naast de evaluatie");
  await b.goto(`${BASIS}/admin/omzet/uren`);
  await b.fill("#mw-naam-nieuw", WERKNEMER.naam);
  await b.fill("#mw-functie-nieuw", "Casemanager");
  await b.fill("#mw-uren-nieuw", "36");
  await b.fill("#mw-norm-nieuw", "75");
  await b.selectOption("#mw-account-nieuw", WERKNEMER.id);
  await b.click("#nieuw button:has-text('Toevoegen')");
  await b.waitForURL(/opgeslagen=medewerker/, { timeout: 20000 });
  check(sql(`select naam from public.medewerkers where user_id = '${WERKNEMER.id}'`) === WERKNEMER.naam, "medewerker gekoppeld aan het account");
  const mwId = sql(`select id from public.medewerkers where user_id = '${WERKNEMER.id}'`);
  sql(`insert into public.uren (medewerker_id, week, declarabel, afwezig) values ('${mwId}', '${dezeWeek}', 27, 0), ('${mwId}', '${vorigeWeek}', 21, 8)`);
  // Een tweede medewerker aan hetzelfde account mag niet.
  await b.fill("#mw-naam-nieuw", "Dubbel");
  await b.selectOption("#mw-account-nieuw", WERKNEMER.id);
  await b.click("#nieuw button:has-text('Toevoegen')");
  await b.waitForURL(/fout=medewerker-account/, { timeout: 20000 });
  check(sql("select count(*) from public.medewerkers") === "1", "een account hoort bij één medewerker");
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  const gekoppeld = await b.locator(`#collega-${WERKNEMER.id}`).innerText();
  check(gekoppeld.includes(WERKNEMER.naam) && gekoppeld.includes("Casemanager") && !gekoppeld.includes("koppel aan"), "het overzicht toont nu naam en functie");
  check(/declarabel\s*75%/.test(gekoppeld.replace(/\n/g, " ")) && gekoppeld.includes("48 van 64 uur"), `declarabel 75% (27 + 21 van 36 + 28 uur) (${gekoppeld.match(/declarabel[^\n]*/)?.[0]})`);
  check(alsCollega(WERKNEMER.id, "select declarabel from public.uren where week = '" + dezeWeek + "'") === "27.00", "de collega mag zijn eigen uren lezen");
  let urenSchrijven = true;
  try { alsCollega(WERKNEMER.id, `update public.uren set declarabel = 40 where medewerker_id = '${mwId}'`); urenSchrijven = sql(`select declarabel from public.uren where medewerker_id = '${mwId}' and week = '${dezeWeek}'`) === "40.00"; } catch { urenSchrijven = false; }
  check(!urenSchrijven, "maar niet wijzigen");
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("Jouw uren deze week") && tekst.includes("27 declarabel") && tekst.includes("75% declarabel bij een norm van 75%"), "de collega ziet zijn uren bij het formulier");

  stap("Export");
  const exp = await b.request.get(`${BASIS}/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel}`);
  check(exp.status() === 200 && (exp.headers()["content-type"] || "").includes("spreadsheetml"), `export: ${exp.status()} ${exp.headers()["content-type"]}`);
  check((exp.headers()["content-disposition"] || "").includes(`weekevaluaties-${kwartaalSleutel}.xlsx`), "met de bestandsnaam van het kwartaal");
  const xlsx = (await exp.body()).toString("latin1");
  check(xlsx.startsWith("PK") && xlsx.includes(WERKNEMER.naam) && xlsx.includes("Twee werknemers zijn weer gestart") && xlsx.includes("gemist") === Boolean(alleGemist.length) && xlsx.includes("Declarabele uren"), "het Excelbestand bevat naam, tekst, status en de urenkolom");
  fs.writeFileSync(path.join(SHOTS, `weekevaluaties-${kwartaalSleutel}.xlsx`), await exp.body());
  const expW = await w.request.get(`${BASIS}/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel}`);
  check(!(expW.headers()["content-type"] || "").includes("spreadsheetml"), "de werknemer krijgt de export niet");

  stap("De vrijdagherinnering (api/cron/weekevaluatie)");
  const cron = (q = "") => b.request.get(`${BASIS}/api/cron/weekevaluatie${q}`, { headers: { authorization: "Bearer e2e-cron-geheim" } });
  check((await b.request.get(`${BASIS}/api/cron/weekevaluatie`)).status() === 401, "zonder geheim: 401");
  let cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.ok && cr.week === dezeWeek && cr.deelnemers === 2, `twee collega's met het recht, week ${cr.week}`);
  check(cr.plannen.length === 0, "niemand te herinneren: de werknemer vulde in, de super admin doet niet mee");
  sql(`delete from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${dezeWeek}'`);
  cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.plannen.length === 1 && cr.plannen[0].aan === WERKNEMER.email && cr.plannen[0].onderwerp === `Hoe was je week ${weeknr(dezeWeek)}?`, `droog: alleen de werknemer (${JSON.stringify(cr.plannen)})`);
  check(cr.verstuurd === 0, "droog: niets verstuurd");
  cr = await (await cron("?altijd=1")).json();
  check(cr.verstuurd === 1 && cr.mislukt.length === 0, "verstuurd: 1");
  check(await totDat(() => mails().some((m) => m.to.includes(WERKNEMER.email))), "de mail is onderschept");
  const mail = mails().find((m) => m.to.includes(WERKNEMER.email));
  check(mail && mail.subject === `Hoe was je week ${weeknr(dezeWeek)}?` && mail.html.includes("Hoi Noor,") && mail.html.includes("/admin/weekevaluatie") && mail.html.includes("kwartaalmeeting") && mail.html.includes("Vul je weekevaluatie in"), "aanhef, knop naar het scherm en de uitleg");
  fs.writeFileSync(path.join(SHOTS, "mail-herinnering.html"), mail?.html || "");
  // De super admin doet mee zodra hij zelf een keer invulde: dan hoort hij bij het team en krijgt hij de herinnering.
  sql(`insert into public.weekevaluaties (user_id, week, antwoorden, door) values ('aaaaaaaa-0000-4000-8000-000000000001', '${vorigeWeek}', '{"energie":8,"werkdruk":7,"voldoening":8,"samenwerking":8,"cijfer":8}', '${BEHEERDER.email}')`);
  cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.plannen.length === 2 && cr.plannen.some((p) => p.aan === BEHEERDER.email), "nu ook de super admin, die vorige week invulde maar deze week nog niet");
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  check((await b.locator("section[id^=collega-]").count()) === 2, "en hij staat in het kwartaaloverzicht");
  await b.goto(`${BASIS}/admin`);
  check(/weekevaluatie van week \d+ staat nog open/.test(await b.locator("#weekevaluatie-open").innerText()), "dashboard van de beheerder: deze week staat nog open");

  for (const [page, url, naam] of [[w, "/admin/weekevaluatie", "werknemer"], [b, "/admin/weekevaluatie/team", "kwartaal"], [w, "/admin", "dashboard-werknemer"]]) {
    stap(`Telefoon: ${naam}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASIS}${url}`);
    await page.waitForSelector("h1");
    const overloop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overloop <= 0, `${naam}: geen horizontale scroll op 390 px (${overloop})`);
    await page.addStyleTag({ content: ".sticky { position: static !important; }" });
    await page.screenshot({ path: path.join(SHOTS, `04-${naam}-390.png`), fullPage: true });
  }

  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
