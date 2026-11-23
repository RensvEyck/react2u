// Weekevaluatie (0044, 0045) van begin tot eind: de rol werknemer en het recht in de database, een collega met die
// rol die na het inloggen alleen het dashboard, zijn weekevaluatie en Account ziet, het signaal op het dashboard,
// deze week invullen met de nieuwe vragen (zeven cijfers, thema's bij het knelpunt, "welke kennis miste je" alleen
// bij een lage kennis, de voortgang op een doel uit de kwartaalmeeting, bespreekvinkjes), vorige week invullen
// waarna twee zware weken een mail aan de beheerder geven (één keer), een gesloten week die niet meer kan, de
// maandvragen en de terugblik in gesloten weken, alleen de eigen rijen zien, dan de beheerder met het
// kwartaaloverzicht als agenda (doelen, hoe het ging, toewijding per maand, knelpunten en kennis, bespreekpunten,
// terugblik, nieuwe doelen vastleggen), de koppeling aan een medewerker, het signaal op zijn dashboard, de export
// en de vrijdagherinnering via de cron. Beide collega's werken in een eigen browsercontext.
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
const RENS_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const DOEL = "dddddddd-0000-4000-8000-000000000001";

// Dezelfde weekregels als lib/weekevaluatie.ts, om de verwachting uit te rekenen.
const DAG = 86_400_000;
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const utc = (d) => new Date(`${d}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const maandag = (d) => iso(new Date(utc(d).getTime() - ((utc(d).getUTCDay() + 6) % 7) * DAG));
const plusWeken = (m, n) => iso(new Date(utc(m).getTime() + n * 7 * DAG));
const donderdag = (m) => new Date(utc(m).getTime() + 3 * DAG);
const weeknr = (m) => {
  const don = donderdag(m);
  const v = new Date(Date.UTC(don.getUTCFullYear(), 0, 4));
  const start = new Date(v.getTime() - ((v.getUTCDay() + 6) % 7) * DAG);
  return 1 + Math.round((utc(m).getTime() - start.getTime()) / (7 * DAG));
};
const kwartaalVan = (m) => ({ jaar: donderdag(m).getUTCFullYear(), kwartaal: Math.floor(donderdag(m).getUTCMonth() / 3) + 1 });
const maandVan = (m) => iso(donderdag(m)).slice(0, 7);
const isMaandEinde = (m) => maandVan(m) !== maandVan(plusWeken(m, 1));
const isKwartaalEinde = (m) => JSON.stringify(kwartaalVan(m)) !== JSON.stringify(kwartaalVan(plusWeken(m, 1)));
const dezeWeek = maandag(vandaag);
const vorigeWeek = plusWeken(dezeWeek, -1);
const kwartaal = kwartaalVan(dezeWeek);
const kwartaalSleutel = `${kwartaal.jaar}-Q${kwartaal.kwartaal}`;
const volgend = kwartaal.kwartaal === 4 ? { jaar: kwartaal.jaar + 1, kwartaal: 1 } : { jaar: kwartaal.jaar, kwartaal: kwartaal.kwartaal + 1 };
const inKwartaal = (wk) => JSON.stringify(kwartaalVan(wk)) === JSON.stringify(kwartaal);
// De gesloten weken van dit kwartaal (van oud naar nieuw), en die van het kwartaal ervoor.
const geslotenDitKwartaal = [];
for (let w = plusWeken(dezeWeek, -2); inKwartaal(w); w = plusWeken(w, -1)) geslotenDitKwartaal.unshift(w);
const eersteWeekKwartaal = geslotenDitKwartaal[0] || (inKwartaal(vorigeWeek) ? vorigeWeek : dezeWeek);
const vorigKwartaalWeken = [plusWeken(eersteWeekKwartaal, -1), plusWeken(eersteWeekKwartaal, -2)];
// De open weken die bij dit kwartaal horen (aan het begin van een kwartaal valt vorige week er nog buiten).
const openInKwartaal = [vorigeWeek, dezeWeek].filter(inKwartaal);
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const gemiddelde = (l) => Math.round((l.reduce((s, x) => s + x, 0) / l.length) * 10) / 10;

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

const schaal = (page, naam, waarde) => page.click(`label:has(input[name="${naam}"][value="${waarde}"])`);
const keuze = (page, veld, sleutel) => page.click(`label:has(input[name="${veld}"][value="${sleutel}"])`);
const bespreek = (page, sleutel) => page.check(`input[name="bespreken"][value="${sleutel}"]`);
const antwoord = (week, q) => sql(`select ${q} from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${week}'`);
const MAAND = { trots: 8, inzet: 9, waardering: 5, ruimte: 7, geleerd: 6, steun: 8 };
const json = (o) => JSON.stringify(o).replace(/'/g, "''");

/** Vult de lagen die deze week extra gevraagd worden. */
async function vulExtra(page, week) {
  if (isMaandEinde(week)) for (const [naam, waarde] of Object.entries(MAAND)) await schaal(page, naam, waarde);
  if (isKwartaalEinde(week)) {
    await schaal(page, "blijven", 7);
    await page.fill("#we-blijven_waarom", "Het team en de vrijheid in mijn dossiers.");
  }
}

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);

  stap("Database: het recht, de rol werknemer, de testcollega en een doel uit de vorige kwartaalmeeting");
  check(sql("select permissions::text from public.roles where key = 'werknemer'") === "{weekevaluatie,overleg,ideeen,waarneming}", "de rol werknemer heeft de rechten weekevaluatie, CM-overleg (0053) en ideeënbord (0055)");
  check(sql("select is_system from public.roles where key = 'werknemer'") === "f", "en is geen systeemrol");
  check(sql("select 'weekevaluatie' = any(permissions) from public.roles where key = 'superadmin'") === "t", "de super admin heeft het recht ook");
  check(sql("select coalesce('weekevaluatie' = any(permissions), false) from public.roles where key = 'redacteur'") === "f", "de redacteur niet");
  sql(`delete from public.weekevaluaties; delete from public.weekevaluatie_doelen; delete from public.medewerkers;
delete from public.admins where user_id = '${WERKNEMER.id}'; delete from auth.identities where user_id = '${WERKNEMER.id}'; delete from auth.users where id = '${WERKNEMER.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', '${WERKNEMER.id}', 'authenticated', 'authenticated', '${WERKNEMER.email}', extensions.crypt('${WERKNEMER.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${WERKNEMER.id}', '${WERKNEMER.id}', '{"sub":"${WERKNEMER.id}","email":"${WERKNEMER.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${WERKNEMER.id}', '${WERKNEMER.email}', id, '${plusWeken(eersteWeekKwartaal, -2)}' from public.roles where key = 'werknemer';
insert into public.weekevaluatie_doelen (id, user_id, jaar, kwartaal, titel, toelichting, sort) values ('${DOEL}', '${WERKNEMER.id}', ${kwartaal.jaar}, ${kwartaal.kwartaal}, 'Spoor 2 zelfstandig doen', 'Twee dossiers van begin tot eind', 1);`);
  check(sql(`select r.key from public.admins a join public.roles r on r.id = a.role_id where a.user_id = '${WERKNEMER.id}'`) === "werknemer", "de testcollega heeft de rol werknemer");
  let anonLeest = true;
  try { sql("set role anon; select count(*) from public.weekevaluaties"); } catch { anonLeest = false; }
  check(!anonLeest, "anon kan weekevaluaties niet lezen");
  let doelZelf = true;
  try { alsCollega(WERKNEMER.id, `insert into public.weekevaluatie_doelen (user_id, jaar, kwartaal, titel) values ('${WERKNEMER.id}', ${kwartaal.jaar}, ${kwartaal.kwartaal}, 'Zelf bedacht')`); } catch { doelZelf = false; }
  check(!doelZelf, "een werknemer kan zelf geen doelen vastleggen");
  check(alsCollega(WERKNEMER.id, "select count(*) from public.weekevaluatie_doelen") === "1", "maar leest zijn eigen doel wel");
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
  check(JSON.stringify(menu) === JSON.stringify(["/admin", "/admin/weekevaluatie", "/admin/overleg", "/admin/ideeen", "/admin/waarneming"]), `menu: alleen Dashboard, Weekevaluatie, CM-overleg en Ideeënbord (${menu.join(", ")})`);
  check(await w.locator('aside a[href="/admin/account"]').count(), "Account via je naam onder in de zijbalk");
  const signaal = await w.locator("#weekevaluatie-open").innerText();
  check(/weekevaluaties van week \d+ en \d+ staan nog open/.test(signaal), `dashboard: beide weken staan nog open (${signaal.split("\n")[0]})`);
  check(signaal.includes("Zeven cijfers en een paar zinnen"), "dashboard: zeven cijfers, net als het formulier en de vrijdagmail");
  const zijbalk = await w.locator("aside").first().innerText();
  check(zijbalk.includes("Mijn React2u") && !zijbalk.includes("SYSTEEMBEHEER"), "Mijn React2u bovenaan, geen Systeembeheer");
  check(!(await w.locator('button[aria-label="Zoeken (⌘K)"]').count()) && !(await w.locator('a[aria-label="Bekijk website"]').count()), "geen zoekveld en geen Bekijk website in de balk");
  check(!(await w.locator("text=Tip: druk op").count()), "geen tip over ⌘K");
  await w.keyboard.press("Meta+k");
  await wacht(300);
  check(!(await w.locator('[role="dialog"]').count()), "⌘K opent geen zoekpalet");
  await w.click('button[aria-label^="Account:"]');
  check(await w.locator('[role="menu"] >> text=Account en beveiliging').count() && !(await w.locator('[role="menu"] >> text=Bekijk website').count()), "het accountmenu zonder Bekijk website");
  await w.keyboard.press("Escape");
  check((await w.locator("#mijn-verloop").innerText()).includes("Na je eerste weekevaluatie"), "Mijn verloop wacht op de eerste week van het kwartaal");
  check(!(await w.locator("#weekevaluatie-signalen").count()), "geen signalen over collega's voor een werknemer");
  for (const pad of ["/admin/omzet", "/admin/weekevaluatie/team", "/admin/bellijst"]) {
    await w.goto(`${BASIS}${pad}`);
    check(new URL(w.url()).pathname === "/admin", `${pad} stuurt de werknemer terug naar het dashboard`);
  }

  stap(`Deze week invullen (week ${weeknr(dezeWeek)})`);
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  await w.waitForSelector("h1:has-text('Mijn weekevaluatie')");
  let tekst = await w.locator("body").innerText();
  check(tekst.includes("nooit voor beoordeling of salaris") && tekst.includes("niet naar je gezondheid"), "de uitleg waar de antwoorden voor zijn staat erboven");
  check(tekst.includes("om inzicht te houden en samen te blijven verbeteren") && !/\bRens\b/.test(tekst), "inzicht en verbeteren als doel, zonder een naam erin");
  const schalen = 7 + 1 + (isMaandEinde(dezeWeek) ? 6 : 0) + (isKwartaalEinde(dezeWeek) ? 1 : 0);
  check((await w.locator('input[type="radio"]:not([name="melding_soort"])').count()) === schalen * 10, `${schalen} vragen met cijfers van 1 tot 10 (zeven per week, één doel${isMaandEinde(dezeWeek) ? ", zes maandvragen" : ""})`);
  check(tekst.includes(`Je doelen voor Q${kwartaal.kwartaal} ${kwartaal.jaar}`) && tekst.includes("Spoor 2 zelfstandig doen"), "het doel uit de kwartaalmeeting staat in het formulier");
  check(!(await w.locator("#we-kennis_mist").count()), "welke kennis je miste staat er nog niet");
  for (const [naam, waarde] of [["energie", 4], ["plezier", 6], ["tijd", 3], ["emotie", 6], ["herstel", 5], ["kennis", 5], ["cijfer", 6], [`doel_${DOEL}`, 6]]) await schaal(w, naam, waarde);
  check(await w.locator("#we-kennis_mist").isVisible(), "na een 5 voor kennis vraagt het formulier welke kennis je miste");
  await vulExtra(w, dezeWeek);
  await w.fill(`input[name="doel_${DOEL}_tekst"]`, "Eerste dossier samen met Susanne doorgenomen.");
  await w.fill("#we-cijfers_toelichting", "Maandag twee ziekmeldingen tegelijk, daarna ging het beter.");
  await w.fill("#we-hoogtepunt", "Twee werknemers zijn weer gestart en de werkgever van de bakkerij belde zelf terug.");
  await w.fill("#we-beter", "Ik heb te lang gewacht met terugbellen.");
  await w.fill("#we-nodig", "Een uur samen door de spoor 2-dossiers.");
  await w.fill("#we-volgende_week", "Elke ochtend eerst de terugbelverzoeken.");
  check(await w.locator("text=Iets melden of delen").count() && (await w.locator('input[name="melding_soort"]').count()) === 5, "een eigen blok om iets te melden of te delen, met vijf soorten");
  await keuze(w, "melding_soort", "idee");
  await keuze(w, "melding_soort", "compliment");
  await w.fill("#we-melding", "Susanne nam deze week twee van mijn dossiers over toen ik vastliep. Dat mag gezien worden.");
  await w.check('input[name="melding_nu"]');
  await keuze(w, "knelpunt_themas", "werkdruk");
  await keuze(w, "knelpunt_themas", "planning");
  await w.fill("#we-knelpunt", "Drie spoedgevallen op één dag, en de bedrijfsarts pas donderdag.");
  await bespreek(w, "knelpunt");
  await keuze(w, "kennis_themas", "reintegratie");
  await w.fill("#we-kennis_mist", "Wanneer een loonsanctie dreigt bij een te late eerstejaarsevaluatie.");
  await bespreek(w, "kennis_mist");
  await w.screenshot({ path: path.join(SHOTS, "01-formulier-1440.png"), fullPage: true });
  await w.click("button.abtn:has-text('Weekevaluatie bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(antwoord(dezeWeek, "(antwoorden->>'energie') || '/' || (antwoorden->>'tijd') || '/' || (antwoorden->>'kennis') || '/' || door") === `4/3/5/${WERKNEMER.email}`, "bewaard: energie 4, tijd 3, kennis 5, door de collega zelf");
  check(antwoord(dezeWeek, "antwoorden->'knelpunt_themas'") === '["werkdruk", "planning"]', "de knelpuntthema's");
  check(antwoord(dezeWeek, "antwoorden->'kennis_themas'") === '["reintegratie"]' && antwoord(dezeWeek, "antwoorden->>'kennis_mist'").startsWith("Wanneer een loonsanctie"), "de kennis die gemist werd");
  check(antwoord(dezeWeek, "antwoorden->'bespreken'") === '["knelpunt", "kennis_mist"]', "twee punten voor de kwartaalmeeting");
  check(antwoord(dezeWeek, `antwoorden->'doelen'->'${DOEL}'->>'cijfer'`) === "6" && antwoord(dezeWeek, `antwoorden->'doelen'->'${DOEL}'->>'tekst'`).startsWith("Eerste dossier"), "de voortgang op het doel");
  if (isMaandEinde(dezeWeek)) check(antwoord(dezeWeek, "antwoorden->>'trots'") === "8", "de maandvragen");
  check(antwoord(dezeWeek, "antwoorden ? 'hoogtepunt' and not antwoorden ? 'kwartaal_anders'") === "t", "de terugblik alleen in de laatste week van het kwartaal");
  tekst = await w.locator("body").innerText();
  check(tekst.includes("Bewaard op") && tekst.includes("Wijzigingen bewaren"), "het formulier zegt dat hij bewaard is en blijft te wijzigen");
  check(antwoord(dezeWeek, "antwoorden->>'nodig'") === "Een uur samen door de spoor 2-dossiers." && antwoord(dezeWeek, "antwoorden->>'volgende_week'").startsWith("Elke ochtend") && antwoord(dezeWeek, "antwoorden->>'cijfers_toelichting'").startsWith("Maandag twee"), "de vrije velden: toelichting, kon beter, nodig, volgende week");
  check(antwoord(dezeWeek, "antwoorden->'melding_soort'") === '["compliment"]' && antwoord(dezeWeek, "antwoorden->>'melding_nu'") === "true", "de melding: één soort, meteen doorsturen");
  check(await totDat(() => mails().some((m) => m.subject === "Noor deelt een compliment")), "de melding is meteen gemaild");
  const meld = mails().find((m) => m.subject === "Noor deelt een compliment");
  check(meld && meld.to.includes(BEHEERDER.email) && meld.reply_to === WERKNEMER.email && meld.html.includes("twee van mijn dossiers over") && meld.html.includes(`#collega-${WERKNEMER.id}`), "aan de super admin, met de tekst, antwoorden gaat naar Noor");
  fs.writeFileSync(path.join(SHOTS, "mail-melding.html"), meld?.html || "");
  check(/^[0-9a-f]{32}$/.test(antwoord(dezeWeek, "antwoorden->>'melding_verstuurd'")), "de database onthoudt dat deze melding verstuurd is");
  check(tekst.includes("Deze melding is al doorgestuurd"), "het formulier zegt dat hij al doorgestuurd is");
  check(!/\bRens\b/.test(tekst), "ook na het bewaren met een melding staat er geen naam");
  await w.click("button.abtn:has-text('Wijzigingen bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  await wacht(800);
  check(mails().filter((m) => / deelt een compliment$/.test(m.subject || "")).length === 1, "opnieuw bewaren mailt dezelfde melding niet nog een keer");
  await w.fill("#we-melding", "Susanne nam deze week twee van mijn dossiers over toen ik vastliep. En Cindy hielp met de werkgever.");
  await w.click("button.abtn:has-text('Wijzigingen bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(await totDat(() => mails().filter((m) => / deelt een compliment$/.test(m.subject || "")).length === 2), "een aangepaste melding gaat wel opnieuw");
  check(await w.locator('input[name="bespreken"][value="knelpunt"]').isChecked() && await w.locator('input[name="knelpunt_themas"][value="planning"]').isChecked(), "vinkjes en thema's staan er weer");
  check(!mails().some((m) => /Twee zware weken/.test(m.subject || "")), "één zware week geeft nog geen melding");

  stap(`Vorige week invullen (week ${weeknr(vorigeWeek)}): twee zware weken`);
  await w.goto(`${BASIS}/admin/weekevaluatie?week=${vorigeWeek}`);
  for (const [naam, waarde] of [["energie", 3], ["plezier", 5], ["tijd", 4], ["emotie", 5], ["herstel", 4], ["kennis", 8], ["cijfer", 5]]) await schaal(w, naam, waarde);
  if (inKwartaal(vorigeWeek)) await schaal(w, `doel_${DOEL}`, 5);
  await vulExtra(w, vorigeWeek);
  check(!(await w.locator("#we-kennis_mist").count()), "bij een 8 voor kennis vraagt het formulier niet wat je miste");
  await w.click("button.abtn:has-text('Weekevaluatie bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(sql(`select count(*) from public.weekevaluaties where user_id = '${WERKNEMER.id}'`) === "2", "twee weken ingevuld");
  check(await totDat(() => mails().some((m) => m.subject === "Twee zware weken voor Noor")), "twee zware weken: een mail aan de beheerder");
  const zwaar = mails().find((m) => m.subject === "Twee zware weken voor Noor");
  check(zwaar && zwaar.to.includes(BEHEERDER.email) && zwaar.html.includes(`week ${weeknr(vorigeWeek)} en ${weeknr(dezeWeek)}`) && zwaar.html.includes("energie en werk paste in de tijd"), "aan de super admin, met de weken en de schalen");
  check(zwaar && !zwaar.html.includes("spoedgevallen") && zwaar.html.includes(`#collega-${WERKNEMER.id}`), "zonder de antwoorden zelf, met een link naar de collega");
  fs.writeFileSync(path.join(SHOTS, "mail-signaal.html"), zwaar?.html || "");
  check(antwoord(dezeWeek, "signaal_at is not null") === "t", "de database onthoudt dat het gemeld is");
  await w.click("button.abtn:has-text('Wijzigingen bewaren')");
  await w.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  await wacht(800);
  check(mails().filter((m) => m.subject === "Twee zware weken voor Noor").length === 1, "opnieuw bewaren mailt niet nog een keer");
  await w.goto(`${BASIS}/admin`);
  check(!(await w.locator("#weekevaluatie-open").count()), "dashboard: geen open week meer");
  {
    const twee = inKwartaal(vorigeWeek);
    const volgorde = await w.locator("#mijn-verloop [data-schaal]").evaluateAll((els) => els.map((e) => e.getAttribute("data-schaal")).join(","));
    check(volgorde === "energie,tijd,plezier", `Mijn verloop: energie, tijd en plezier (${volgorde})`);
    const paneel = async (s) => (await w.locator(`#mijn-verloop [data-schaal="${s}"]`).innerText()).replace(/\s+/g, " ");
    const [en, ti, pl] = [await paneel("energie"), await paneel("tijd"), await paneel("plezier")];
    check(en.includes(`laatst in wk ${weeknr(dezeWeek)}`) && / 4 /.test(` ${en} `) && ti.includes(" 3 ") && pl.includes(" 6 "), `het laatste cijfer per lijn: energie 4, tijd 3, plezier 6 (${en} | ${ti} | ${pl})`);
    if (twee) check(en.includes(`+1 t.o.v. wk ${weeknr(vorigeWeek)}`) && ti.includes("−1 t.o.v.") && pl.includes("+1 t.o.v."), "met het verschil tegenover vorige week");
    const stippen = await w.locator('#mijn-verloop [data-schaal="energie"] [data-punt]').count();
    check(stippen === (twee ? 2 : 1), `een stip per ingevulde week (${stippen})`);
    await w.screenshot({ path: path.join(SHOTS, "05-mijn-react2u-1440.png"), fullPage: true });
  }

  stap("Gesloten weken, de maandvragen en de terugblik");
  const gesloten = plusWeken(dezeWeek, -3);
  await w.goto(`${BASIS}/admin/weekevaluatie?week=${gesloten}`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("niet ingevuld, en hij is inmiddels gesloten") && !(await w.locator("button.abtn:has-text('bewaren')").count()), "een gesloten week zonder evaluatie is alleen tekst, zonder knop");
  let geslotenKon = true;
  try { alsCollega(WERKNEMER.id, `insert into public.weekevaluaties (user_id, week, antwoorden) values ('${WERKNEMER.id}', '${gesloten}', '{"cijfer":7}')`); } catch { geslotenKon = false; }
  check(!geslotenKon, "de database weigert een gesloten week, ook rechtstreeks");
  let anderKon = true;
  try { alsCollega(WERKNEMER.id, `insert into public.weekevaluaties (user_id, week, antwoorden) values ('${RENS_ID}', '${dezeWeek}', '{"cijfer":7}')`); } catch { anderKon = false; }
  check(!anderKon, "en een rij voor iemand anders");
  // Het verleden, rechtstreeks als postgres: gesloten weken van dit kwartaal (de oudste laten we leeg als 'gemist'),
  // met de maandvragen in de laatste week van een maand, en twee weken van het vorige kwartaal met de terugblik.
  const seed = geslotenDitKwartaal.slice(-5);
  const gemist = seed.length > 1 ? seed[0] : null;
  const ingevuldSeed = seed.filter((x) => x !== gemist);
  const cijfers = [6, 7, 8, 7];
  const seedAntwoorden = (wk, i) => ({
    energie: cijfers[i % 4], plezier: 7, tijd: cijfers[i % 4], emotie: 7, herstel: 6, kennis: 7, cijfer: cijfers[i % 4],
    hoogtepunt: `Week ${weeknr(wk)} liep lekker.`, knelpunt_themas: ["werkdruk"], ...(i === 0 ? { bespreken: ["hoogtepunt"] } : {}),
    doelen: { [DOEL]: { cijfer: 4 + i } },
    ...(isMaandEinde(wk) ? MAAND : {}),
  });
  const vorigAntwoorden = (wk) => ({
    energie: 5, plezier: 6, tijd: 5, emotie: 6, herstel: 5, kennis: 6, cijfer: 6,
    ...(isMaandEinde(wk) ? { trots: 7, inzet: 8, waardering: 6, ruimte: 6, geleerd: 5, steun: 7 } : {}),
    ...(isKwartaalEinde(wk) ? { blijven: 6, blijven_waarom: "Ik twijfel over de reistijd.", kwartaal_anders: "Vaste belmomenten afspreken." } : {}),
  });
  sql([
    ...ingevuldSeed.map((wk, i) => `insert into public.weekevaluaties (user_id, week, antwoorden, door, created_at, updated_at) values ('${WERKNEMER.id}', '${wk}', '${json(seedAntwoorden(wk, i))}', '${WERKNEMER.email}', '${wk}T16:00:00Z', '${wk}T16:00:00Z');`),
    ...vorigKwartaalWeken.map((wk) => `insert into public.weekevaluaties (user_id, week, antwoorden, door, created_at, updated_at) values ('${WERKNEMER.id}', '${wk}', '${json(vorigAntwoorden(wk))}', '${WERKNEMER.email}', '${wk}T16:00:00Z', '${wk}T16:00:00Z');`),
    // Een rij van iemand anders: de werknemer mag die niet zien.
    `insert into public.weekevaluaties (user_id, week, antwoorden, door) values ('${RENS_ID}', '${vorigeWeek}', '{"energie":9,"tijd":9,"cijfer":9}', '${BEHEERDER.email}');`,
  ].join("\n"));
  check(alsCollega(WERKNEMER.id, "select count(*) from public.weekevaluaties") === String(2 + ingevuldSeed.length + vorigKwartaalWeken.length), "de werknemer ziet alleen zijn eigen rijen");
  sql(`delete from public.weekevaluaties where user_id = '${RENS_ID}'`);
  const maandWeek = [...ingevuldSeed].reverse().find(isMaandEinde);
  if (maandWeek) {
    await w.goto(`${BASIS}/admin/weekevaluatie?week=${maandWeek}`);
    tekst = await w.locator("body").innerText();
    check(tekst.includes("Maandvragen") && tekst.includes("Ik ben trots op het werk") && await w.locator('input[name="trots"][value="8"]').isChecked(), `de maandvragen van week ${weeknr(maandWeek)} zijn terug te lezen`);
    check(await w.locator('input[name="trots"][value="8"]').isDisabled(), "maar niet meer te wijzigen");
  }
  const kwartaalWeek = vorigKwartaalWeken.find(isKwartaalEinde);
  if (kwartaalWeek) {
    await w.goto(`${BASIS}/admin/weekevaluatie?week=${kwartaalWeek}`);
    tekst = await w.locator("body").innerText();
    check(tekst.includes("Terugblik op") && tekst.includes("Ik twijfel over de reistijd."), `de terugblik van week ${weeknr(kwartaalWeek)} is terug te lezen`);
  }
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("Jouw laatste twaalf weken") && tekst.includes("Eerdere weken"), "grafiek en geschiedenis staan er");
  if (gemist) check(tekst.includes("niet ingevuld"), "de gemiste week staat als niet ingevuld in de geschiedenis");
  if (ingevuldSeed.length) {
    await w.locator('section[aria-labelledby="geschiedenis-kop"] details summary').first().click();
    check((await w.locator("body").innerText()).includes("liep lekker"), "een eerdere week is terug te lezen");
  }
  await w.screenshot({ path: path.join(SHOTS, "02-ingevuld-1440.png"), fullPage: true });

  stap("De beheerder: het kwartaaloverzicht als agenda");
  await inloggen(b, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await b.goto(`${BASIS}/admin`);
  const dash = await b.locator("#weekevaluatie-signalen").innerText().catch(() => "");
  check((await b.locator("aside").first().innerText()).includes("SYSTEEMBEHEER") && await b.locator('button[aria-label="Zoeken (⌘K)"]').count() && !(await b.locator("#mijn-verloop").count()), "de super admin houdt het systeembeheer, met zoeken en zonder Mijn verloop");
  check(dash.includes("Twee zware weken") && dash.includes("Noor") && dash.includes(`wk ${weeknr(dezeWeek)}`), `dashboard van de beheerder: het signaal over Noor (${dash.split("\n").slice(0, 2).join(" ")})`);
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  await b.waitForSelector("h1:has-text('Weekevaluaties van het team')");
  tekst = await b.locator("body").innerText();
  check(tekst.includes(`Q${kwartaal.kwartaal} ${kwartaal.jaar}`) && tekst.includes("dit kwartaal"), "het lopende kwartaal staat open");
  check(/Twee zware weken achter elkaar[\s\S]*Noor/.test(tekst), "bovenaan het signaal");
  check((await b.locator("article[id^=collega-]").count()) === 1, "één collega doet mee (de super admin vulde nooit in)");
  check(tekst.includes("Waar het team tegenaan liep") && /Werkdruk\s*\d+×/.test(tekst) && /Re-integratie spoor 1 en 2\s*1×/.test(tekst), "de thema's van het team, het begin van het opleidingsplan");
  const kaart = b.locator(`#collega-${WERKNEMER.id}`);
  let kaartTekst = await kaart.innerText();
  check(kaartTekst.includes(WERKNEMER.email) && kaartTekst.includes("koppel aan een medewerker"), "nog niet gekoppeld: e-mailadres en de koppellink");
  for (const punt of ["Doelen voor", "Hoe ging het", "Toewijding en groei, per maand", "Knelpunten, kennis en wat nodig is", "Gemeld en gedeeld", "Wil Noor bespreken", "Terugblik op het kwartaal"]) check(kaartTekst.includes(punt), `agendapunt: ${punt}`);
  check(/Toelichting bij de cijfers[\s\S]*Maandag twee ziekmeldingen/i.test(kaartTekst), "de toelichting bij de cijfers staat bij hoe het ging");
  check(/Wat Noor nodig heeft[\s\S]*Een uur samen door de spoor 2-dossiers/i.test(kaartTekst), "wat ze nodig heeft staat bij de knelpunten");
  check(/Een compliment\s*· wk \d+\s*meteen doorgestuurd\s*Susanne nam deze week/.test(kaartTekst), "de melding met soort, week en meteen doorgestuurd");
  check(/Gemeld en gedeeld[\s\S]*Een compliment[\s\S]*Noor[\s\S]*En Cindy hielp met de werkgever/.test(tekst), "bovenaan: wat het team meldde en deelde, met de naam");
  const verwacht = openInKwartaal.length + geslotenDitKwartaal.length;
  const ingevuldAantal = openInKwartaal.length + ingevuldSeed.length;
  check(kaartTekst.includes(`${ingevuldAantal} van ${verwacht} ${verwacht === 1 ? "week" : "weken"} ingevuld`), `${ingevuldAantal} van ${verwacht} weken ingevuld (${kaartTekst.match(/\d+ van \d+ wek\w* ingevuld/)?.[0]})`);
  // 1. Het doel: de voortgang van de seed (4, 5, …) en van deze en vorige week (6, 5).
  const doelCijfers = [...ingevuldSeed.map((_, i) => 4 + i), ...openInKwartaal.map((wk) => (wk === dezeWeek ? 6 : 5))];
  check(new RegExp(`Spoor 2 zelfstandig doen\\s*${fmt(gemiddelde(doelCijfers))}\\s*voortgang`).test(kaartTekst), `doel met voortgang ${fmt(gemiddelde(doelCijfers))}`);
  check(kaartTekst.includes("Eerste dossier samen met Susanne"), "en de laatste toelichting");
  // 2. Energie: gemiddeld en de trend tegenover het vorige kwartaal (5).
  const energie = [...openInKwartaal.map((wk) => (wk === dezeWeek ? 4 : 3)), ...ingevuldSeed.map((_, i) => cijfers[i % 4])];
  const gem = gemiddelde(energie);
  const t = Math.round((gem - 5) * 10) / 10;
  const trendTekst = t === 0 ? "±0" : `${t > 0 ? "\\+" : "−"}${fmt(Math.abs(t))}`;
  check(new RegExp(`Energie\\s*${fmt(gem)}\\s*${trendTekst}`, "i").test(kaartTekst), `energie gemiddeld ${fmt(gem)}, trend tegenover het vorige kwartaal (${kaartTekst.match(/Energie\s*[\d,]+\s*\S*/i)?.[0]})`);
  if (energie.length >= 3) check(kaartTekst.includes("Zwaarste weken:") && kaartTekst.includes(`wk ${weeknr(vorigeWeek)}`), "de twee zwaarste weken, met vorige week erbij");
  check(new RegExp(`wk ${weeknr(vorigeWeek)} en wk ${weeknr(dezeWeek)}: twee keer een 4 of lager`).test(kaartTekst), "het signaal staat bij de collega");
  // 3. De maandvragen, 4. thema's en kennis, 5. bespreekpunten.
  if (maandWeek || isMaandEinde(dezeWeek) || isMaandEinde(vorigeWeek)) check(/Trots op het werk\s*[\s\S]*8/.test(kaartTekst), "de maandvragen per maand");
  else check(kaartTekst.includes("Nog geen maandvragen in dit kwartaal"), "nog geen maandvragen");
  check(/Liep tegenaan:[\s\S]*Werkdruk\s*\d+×[\s\S]*Planning\s*1×/.test(kaartTekst), "de knelpunten van Noor, geteld");
  check(/Miste kennis over:[\s\S]*Re-integratie spoor 1 en 2\s*1×/.test(kaartTekst) && kaartTekst.includes("Wanneer een loonsanctie dreigt"), "de kennis die ze miste");
  check(kaartTekst.includes("Drie spoedgevallen op één dag") && /KNELPUNT · WK \d+\s*Werkdruk · Planning/i.test(kaartTekst), "het knelpunt dat ze wil bespreken, met de thema's");
  if (ingevuldSeed.length) check(kaartTekst.includes(`Week ${weeknr(ingevuldSeed[0])} liep lekker.`), "en het hoogtepunt dat ze wilde bespreken");
  check(kaartTekst.includes("De terugblik staat in de laatste week van het kwartaal"), "de terugblik komt nog");
  await b.screenshot({ path: path.join(SHOTS, "03-kwartaal-1440.png"), fullPage: true });

  stap(`Doelen voor ${volgend.jaar}-Q${volgend.kwartaal} vastleggen in de meeting`);
  check(kaartTekst.includes(`Doelen voor Q${volgend.kwartaal} ${volgend.jaar}`) && kaartTekst.includes("Nog geen doelen voor volgend kwartaal"), "agendapunt 7 is nog leeg");
  for (const [titel, toelichting] of [["Gesprekstechniek verdiepen", "Training in februari"], ["Spoor 2 zelfstandig", ""], ["Eén vast belmoment per dag", ""]]) {
    await kaart.locator('input[name="titel"]').fill(titel);
    if (toelichting) await kaart.locator('input[name="toelichting"]').fill(toelichting);
    await kaart.locator("button:has-text('Doel toevoegen')").click();
    await b.waitForURL(/opgeslagen=doel/, { timeout: 20000 });
  }
  check(sql(`select count(*) || ':' || min(jaar) || '-' || min(kwartaal) from public.weekevaluatie_doelen where user_id = '${WERKNEMER.id}' and not (jaar = ${kwartaal.jaar} and kwartaal = ${kwartaal.kwartaal})`) === `3:${volgend.jaar}-${volgend.kwartaal}`, "drie doelen voor volgend kwartaal");
  check(!(await kaart.locator("button:has-text('Doel toevoegen')").count()), "bij drie doelen verdwijnt het formulier");
  let vierde = true;
  try { sql(`insert into public.weekevaluatie_doelen (user_id, jaar, kwartaal, titel) values ('${WERKNEMER.id}', ${volgend.jaar}, ${volgend.kwartaal}, 'Vierde')`); } catch { vierde = false; }
  check(!vierde, "ook de database houdt het bij drie");
  await kaart.locator("li", { hasText: "Eén vast belmoment per dag" }).locator("button").click();
  await b.waitForURL(/opgeslagen=doel-weg/, { timeout: 20000 });
  check(sql(`select count(*) from public.weekevaluatie_doelen where user_id = '${WERKNEMER.id}' and jaar = ${volgend.jaar} and kwartaal = ${volgend.kwartaal}`) === "2", "een doel verwijderd");
  kaartTekst = await kaart.innerText();
  check(kaartTekst.includes("Gesprekstechniek verdiepen") && kaartTekst.includes("Training in februari"), "de doelen staan in de agenda");

  stap("Het vorige kwartaal: de terugblik");
  const vorigKwartaal = kwartaal.kwartaal === 1 ? `${kwartaal.jaar - 1}-Q4` : `${kwartaal.jaar}-Q${kwartaal.kwartaal - 1}`;
  await b.click('nav[aria-label="Kwartaal"] a[aria-label="Vorig kwartaal"]');
  // Het adres heeft na het vastleggen van de doelen al ?kwartaal=; wacht op het vorige kwartaal zelf.
  await b.waitForURL(new RegExp(`kwartaal=${vorigKwartaal}`));
  await b.waitForSelector(`text=Q${vorigKwartaal.slice(-1)} ${vorigKwartaal.slice(0, 4)}`);
  tekst = await b.locator("body").innerText();
  // Het label staat in hoofdletters (CSS), en innerText neemt dat over.
  if (kwartaalWeek) check(/Over een jaar nog bij React2u\s*6\s*van 10/i.test(tekst) && tekst.includes("Ik twijfel over de reistijd.") && tekst.includes("Vaste belmomenten afspreken."), "de terugblik van het vorige kwartaal");
  check(/\d+ van \d+ weken ingevuld/.test(tekst), "vorig kwartaal: de weken uit de seed");

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
  await b.fill("#mw-naam-nieuw", "Dubbel");
  await b.selectOption("#mw-account-nieuw", WERKNEMER.id);
  await b.click("#nieuw button:has-text('Toevoegen')");
  await b.waitForURL(/fout=medewerker-account/, { timeout: 20000 });
  check(sql("select count(*) from public.medewerkers") === "1", "een account hoort bij één medewerker");
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  const gekoppeld = await b.locator(`#collega-${WERKNEMER.id}`).innerText();
  check(gekoppeld.includes(WERKNEMER.naam) && gekoppeld.includes("Casemanager") && !gekoppeld.includes("koppel aan"), "het overzicht toont nu naam en functie");
  const urenVerwacht = openInKwartaal.reduce((s, wk) => s + (wk === dezeWeek ? 27 : 21), 0);
  if (urenVerwacht) check(/declarabel\s*\d+%/.test(gekoppeld.replace(/\n/g, " ")), `declarabel naast de evaluatie (${gekoppeld.match(/declarabel[^\n]*/)?.[0]})`);
  check(alsCollega(WERKNEMER.id, `select declarabel from public.uren where week = '${dezeWeek}'`) === "27.00", "de collega mag zijn eigen uren lezen");
  let urenSchrijven = true;
  try { alsCollega(WERKNEMER.id, `update public.uren set declarabel = 40 where medewerker_id = '${mwId}'`); urenSchrijven = sql(`select declarabel from public.uren where medewerker_id = '${mwId}' and week = '${dezeWeek}'`) === "40.00"; } catch { urenSchrijven = false; }
  check(!urenSchrijven, "maar niet wijzigen");
  await w.goto(`${BASIS}/admin/weekevaluatie`);
  tekst = await w.locator("body").innerText();
  check(tekst.includes("Jouw uren deze week") && tekst.includes("27 declarabel"), "de collega ziet zijn uren bij het formulier");

  stap("Export");
  const exp = await b.request.get(`${BASIS}/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel}`);
  check(exp.status() === 200 && (exp.headers()["content-type"] || "").includes("spreadsheetml"), `export: ${exp.status()} ${exp.headers()["content-type"]}`);
  check((exp.headers()["content-disposition"] || "").includes(`weekevaluaties-${kwartaalSleutel}.xlsx`), "met de bestandsnaam van het kwartaal");
  const xlsx = (await exp.body()).toString("utf8");
  check(xlsx.startsWith("PK") && xlsx.includes(WERKNEMER.naam) && xlsx.includes("Knelpuntthema's") && xlsx.includes("Werkdruk, Planning") && xlsx.includes("Spoor 2 zelfstandig doen: 6") && xlsx.includes("Twee zware weken") && xlsx.includes("Declarabele uren") && xlsx.includes("Gemeld of gedeeld") && xlsx.includes("En Cindy hielp met de werkgever") && xlsx.includes("Een uur samen door de spoor 2-dossiers."), "het Excelbestand bevat naam, thema's, doelen, het signaal, de melding, de vrije velden en de uren");
  fs.writeFileSync(path.join(SHOTS, `weekevaluaties-${kwartaalSleutel}.xlsx`), await exp.body());
  const expW = await w.request.get(`${BASIS}/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel}`);
  check(!(expW.headers()["content-type"] || "").includes("spreadsheetml"), "de werknemer krijgt de export niet");

  stap("De vrijdagherinnering (api/cron/weekevaluatie)");
  const cron = (q = "") => b.request.get(`${BASIS}/api/cron/weekevaluatie${q}`, { headers: { authorization: "Bearer e2e-cron-geheim" } });
  check((await b.request.get(`${BASIS}/api/cron/weekevaluatie`)).status() === 401, "zonder geheim: 401");
  let cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.ok && cr.week === dezeWeek && cr.deelnemers === 2 && cr.plannen.length === 0, "niemand te herinneren: de werknemer vulde in, de super admin doet niet mee");
  sql(`delete from public.weekevaluaties where user_id = '${WERKNEMER.id}' and week = '${dezeWeek}'`);
  cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.plannen.length === 1 && cr.plannen[0].aan === WERKNEMER.email && cr.plannen[0].onderwerp === `Hoe was je week ${weeknr(dezeWeek)}?` && cr.verstuurd === 0, `droog: alleen de werknemer, niets verstuurd (${JSON.stringify(cr.plannen)})`);
  cr = await (await cron("?altijd=1")).json();
  check(cr.verstuurd === 1 && cr.mislukt.length === 0, "verstuurd: 1");
  check(await totDat(() => mails().some((m) => m.to.includes(WERKNEMER.email))), "de mail is onderschept");
  const mail = mails().find((m) => m.to.includes(WERKNEMER.email));
  check(mail && mail.html.includes("Hoi Noor,") && mail.html.includes("/admin/weekevaluatie") && mail.html.includes("Zeven cijfers") && mail.html.includes("Vul je weekevaluatie in"), "aanhef, knop naar het scherm en de uitleg");
  if (isMaandEinde(dezeWeek)) check(mail && mail.html.includes("laatste week van de"), "met de maandvragen erbij genoemd");
  fs.writeFileSync(path.join(SHOTS, "mail-herinnering.html"), mail?.html || "");
  sql(`insert into public.weekevaluaties (user_id, week, antwoorden, door) values ('${RENS_ID}', '${vorigeWeek}', '{"energie":8,"tijd":7,"cijfer":8}', '${BEHEERDER.email}')`);
  cr = await (await cron("?dry=1&altijd=1")).json();
  check(cr.plannen.length === 2 && cr.plannen.some((p) => p.aan === BEHEERDER.email), "nu ook de super admin, die vorige week invulde maar deze week nog niet");
  await b.goto(`${BASIS}/admin/weekevaluatie/team`);
  check((await b.locator("article[id^=collega-]").count()) === 2, "en hij staat in het kwartaaloverzicht");
  check(await b.locator('nav[aria-label="Collega\'s"] a').count() === 2, "met een snelle navigatie naar elke collega");

  for (const [page, url, naam] of [[w, "/admin", "mijn-react2u"], [w, "/admin/weekevaluatie", "werknemer"], [b, "/admin/weekevaluatie/team", "kwartaal"], [b, "/admin", "dashboard-beheerder"]]) {
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
