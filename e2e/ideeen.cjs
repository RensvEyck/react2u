// Ideeënbord (0055) van begin tot eind: het recht ideeen en de policies, een collega met de rol werknemer die een idee
// indient en een melding in haar weekevaluatie schrijft (die via de trigger op het bord komt; met "stuur dit meteen door"
// alleen voor het beheer), een tweede collega die stemt (één keer, intrekbaar, niet op het eigen idee) en reageert, de
// terugkoppeling op het dashboard en per mail, het beheer dat de status zet met een reden (en zonder reden geweigerd
// wordt bij Niet nu), het signaal na twee weken, filteren en sorteren, Beheer tegenover Mijn React2u, en 390 px zonder
// zijwaarts scrollen. Verzonnen collega's. Draaien via e2e/run.mjs (E2E_ALLEEN=ideeen).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "ideeen");
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

const FENNA = { id: "bbbbbbbb-0000-4000-8000-000000000005", email: "fenna@react2u.test", wachtwoord: "Test-wachtwoord-555" };
const BRAM = { id: "bbbbbbbb-0000-4000-8000-000000000006", email: "bram@react2u.test", wachtwoord: "Test-wachtwoord-666" };

// Dezelfde weekregels als lib/weekevaluatie.ts, om de lagen van het formulier te kennen.
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
const kwartaalVan = (m) => `${donderdag(m).getUTCFullYear()}-${Math.floor(donderdag(m).getUTCMonth() / 3)}`;
const maandVan = (m) => iso(donderdag(m)).slice(0, 7);
const isMaandEinde = (m) => maandVan(m) !== maandVan(plusWeken(m, 1));
const isKwartaalEinde = (m) => kwartaalVan(m) !== kwartaalVan(plusWeken(m, 1));
const dezeWeek = maandag(vandaag);
const vorigeWeek = plusWeken(dezeWeek, -1);

async function stelAuthenticatorIn(email, wachtwoord) {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-ideeen-${Date.now()}` });
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

/** Als de collega zelf: SQL met de rechten van de ingelogde gebruiker (RLS geldt, met tweestaps). Alleen de laatste regel is het antwoord. */
function alsCollega(c, q) {
  return sql(`set role authenticated; set request.jwt.claim.sub = '${c.id}'; set request.jwt.claims = '{"sub":"${c.id}","role":"authenticated","email":"${c.email}","aal":"aal2"}'; ${q}`).split("\n").pop();
}
const mag = (f) => { try { f(); return true; } catch { return false; } };
const overloop = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const lit = (s) => s.replace(/'/g, "''");

function maakCollega(c) {
  sql(`delete from public.admins where user_id = '${c.id}'; delete from auth.identities where user_id = '${c.id}'; delete from auth.users where id = '${c.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', '${c.id}', 'authenticated', 'authenticated', '${c.email}', extensions.crypt('${c.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${c.id}', '${c.id}', '{"sub":"${c.id}","email":"${c.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${c.id}', '${c.email}', id, now() - interval '30 days' from public.roles where key = 'werknemer';`);
}

const BORD_TITEL = "Vaste belmomenten in de ochtend";
const BORD_TEKST = "Elke ochtend van 9 tot 10 alleen bellen, geen mail. Dan zijn de terugbelverzoeken voor de lunch weg.";
const MELDING = "De planning van de bedrijfsarts loopt steeds vol op donderdag.\nKunnen we een tweede dag erbij krijgen?";
const MELDING_TITEL = "De planning van de bedrijfsarts loopt steeds vol op donderdag.";
const VERTROUWELIJK = "Ik loop vast in de samenwerking met een collega en wil dat graag met het beheer bespreken.";
const MAAND = { trots: 8, inzet: 9, waardering: 5, ruimte: 7, geleerd: 6, steun: 8 };
const schaal = (page, naam, waarde) => page.click(`label:has(input[name="${naam}"][value="${waarde}"])`);

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);

  stap("Database: het recht, de tabellen en twee collega's met de rol werknemer");
  check(sql("select 'ideeen' = any(permissions) from public.roles where key = 'werknemer'") === "t", "de rol werknemer heeft het recht ideeen");
  check(sql("select 'ideeen' = any(permissions) from public.roles where key = 'superadmin'") === "t" && sql("select 'ideeen' = any(permissions) from public.roles where key = 'beheerder'") === "t", "de super admin en de beheerder ook");
  check(sql("select coalesce('ideeen' = any(permissions), false) from public.roles where key = 'redacteur'") === "f", "de redacteur niet");
  check(sql("select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('ideeen', 'idee_stemmen', 'idee_reacties', 'idee_meldingen')") === "4", "de vier tabellen bestaan");
  sql(`delete from public.ideeen; delete from public.weekevaluaties where user_id in ('${FENNA.id}', '${BRAM.id}');`);
  maakCollega(FENNA);
  maakCollega(BRAM);
  check(sql(`select count(*) from public.admins a join public.roles r on r.id = a.role_id where r.key = 'werknemer' and a.user_id in ('${FENNA.id}', '${BRAM.id}')`) === "2", "Fenna en Bram zijn werknemers");
  check(!mag(() => sql("set role anon; select count(*) from public.ideeen")), "anon kan het bord niet lezen");
  check(!mag(() => alsCollega(FENNA, `insert into public.ideeen (titel, tekst, status) values ('Smokkel', 'x', 'gedaan')`)), "een collega kan geen idee indienen dat al op gedaan staat");
  check(sql("select public.idee_titel(E'  Eerste   regel \\n tweede')") === "Eerste regel", "idee_titel: de eerste regel, met enkele spaties");
  const geheimFenna = await stelAuthenticatorIn(FENNA.email, FENNA.wachtwoord);
  const geheimBram = await stelAuthenticatorIn(BRAM.email, BRAM.wachtwoord);

  const browser = await chromium.launch();
  const paginafouten = [];
  const nieuwePagina = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => paginafouten.push(String(e)));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    return page;
  };
  const f = await nieuwePagina(); // Fenna
  const b = await nieuwePagina(); // Bram
  const r = await nieuwePagina(); // het beheer (super admin)

  stap("Fenna: het lege bord in Mijn React2u");
  await inloggen(f, FENNA.email, FENNA.wachtwoord, geheimFenna);
  await f.goto(`${BASIS}/admin`);
  const menu = await f.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(menu.includes("/admin/ideeen") && (await f.locator("aside").first().innerText()).includes("Mijn React2u"), `Ideeënbord in het menu van Mijn React2u (${menu.join(", ")})`);
  let dash = await f.locator("#ideeenbord").innerText();
  check(dash.includes("Geen nieuwe ideeën") && dash.includes("nog niets van jou opgepakt") && dash.includes("Idee indienen"), `dashboard: de kaart van het bord, nog leeg (${dash.split("\n")[1]})`);
  await f.goto(`${BASIS}/admin/ideeen`);
  await f.waitForSelector("h1:has-text('Ideeënbord')");
  check(await f.locator("#bord-leeg").count() && (await f.locator("#bord-leeg").innerText()).includes("Het bord is nog leeg"), "het bord is leeg, met een uitnodiging");
  let tekst = await f.locator("body").innerText();
  check(!/\bRens\b/.test(tekst) && /het beheer/i.test(tekst), "geen naam in de tekst, wel 'het beheer'");

  stap("Fenna dient een idee in");
  await f.click("#nieuw > button");
  await f.fill("#nieuw-titel", BORD_TITEL);
  await f.fill("#nieuw-tekst", BORD_TEKST);
  check((await f.locator('#nieuw input[name="soort"]').count()) === 5 && await f.locator('#nieuw input[name="soort"][value="idee"]').isChecked(), "vijf soorten, Een idee staat voor");
  await f.screenshot({ path: path.join(SHOTS, "01-indienen-1440.png"), fullPage: true });
  await f.click("#nieuw button.abtn:has-text('Op het bord')");
  await f.waitForURL(/\/admin\/ideeen\/[0-9a-f-]{36}\?opgeslagen=idee/, { timeout: 20000 });
  const bordId = new URL(f.url()).pathname.split("/").pop();
  check(sql(`select status || '|' || soort || '|' || bron || '|' || door_email || '|' || vertrouwelijk from public.ideeen where id = '${bordId}'`) === `ingediend|idee|bord|${FENNA.email}|false`, "bewaard: ingediend, een idee, van het bord, door Fenna, niet vertrouwelijk");
  tekst = await f.locator("body").innerText();
  check(tekst.includes(BORD_TITEL) && tekst.includes("jouw idee") && tekst.includes("Nog geen stemmen") && tekst.includes("Op je eigen idee stem je niet"), "de kaart van het idee: jouw idee, nog geen stemmen");
  check((await f.locator('[aria-label="Waar het idee staat"] [aria-current="step"]').innerText()).includes("Ingediend"), "het pad staat op Ingediend");
  check(!(await f.locator("#status").count()) && await f.locator("#wijzigen").count(), "geen statusformulier voor een collega, wel aanpassen zolang het ingediend is");
  check((await f.locator("#nieuw-titel").count()) === 0 && !(await f.locator('button[aria-label^="Stemmen"]').count()), "geen stemknop op je eigen idee");

  stap(`De weekevaluatie van week ${weeknr(dezeWeek)}: de melding komt op het bord`);
  await f.goto(`${BASIS}/admin/weekevaluatie`);
  await f.waitForSelector("h1:has-text('Mijn weekevaluatie')");
  tekst = await f.locator("body").innerText();
  check(tekst.includes("Het komt op het ideeënbord voor je collega's") && tekst.includes("alleen voor het beheer"), "het formulier zegt dat een melding op het bord komt, en wat het vinkje doet");
  for (const [naam, waarde] of [["energie", 7], ["plezier", 7], ["tijd", 6], ["emotie", 7], ["herstel", 7], ["kennis", 8], ["cijfer", 7]]) await schaal(f, naam, waarde);
  if (isMaandEinde(dezeWeek)) for (const [naam, waarde] of Object.entries(MAAND)) await schaal(f, naam, waarde);
  if (isKwartaalEinde(dezeWeek)) {
    await schaal(f, "blijven", 8);
    await f.fill("#we-blijven_waarom", "Fijn team.");
  }
  await f.click('label:has(input[name="melding_soort"][value="zorg"])');
  await f.fill("#we-melding", MELDING);
  await f.click("button.abtn:has-text('Weekevaluatie bewaren')");
  await f.waitForURL(/opgeslagen=weekevaluatie/, { timeout: 20000 });
  check(sql(`select titel || '|' || soort || '|' || bron || '|' || bron_week || '|' || vertrouwelijk from public.ideeen where door = '${FENNA.id}' and bron = 'weekevaluatie'`) === `${MELDING_TITEL}|zorg|weekevaluatie|${dezeWeek}|false`, "de trigger zette de melding op het bord: titel uit de eerste regel, soort zorg, de week erbij");
  const weekId = sql(`select id from public.ideeen where door = '${FENNA.id}' and bron = 'weekevaluatie'`);
  check(!mails().some((m) => m.to.includes(BEHEERDER.email)), "zonder 'meteen doorsturen' gaat er geen mail naar het beheer");
  // Vorige week, met "stuur dit meteen door": vertrouwelijk, alleen voor het beheer.
  sql(`insert into public.weekevaluaties (user_id, week, antwoorden, door) values ('${FENNA.id}', '${vorigeWeek}', '{"energie":6,"plezier":6,"tijd":6,"emotie":6,"herstel":6,"kennis":7,"cijfer":6,"melding":"${lit(VERTROUWELIJK)}","melding_soort":["anders"],"melding_nu":true}', '${FENNA.email}')`);
  check(sql(`select vertrouwelijk || '|' || soort from public.ideeen where door = '${FENNA.id}' and bron_week = '${vorigeWeek}'`) === "true|anders", "met het vinkje is het idee vertrouwelijk");
  // Een aangepaste tekst gaat mee; weggehaald verdwijnt het van het bord zolang het ingediend is.
  sql(`update public.weekevaluaties set antwoorden = antwoorden || '{"melding":"${lit(VERTROUWELIJK)} Graag deze week nog."}' where user_id = '${FENNA.id}' and week = '${vorigeWeek}'`);
  check(sql(`select tekst from public.ideeen where door = '${FENNA.id}' and bron_week = '${vorigeWeek}'`).endsWith("Graag deze week nog."), "een aangepaste melding past het idee aan");
  sql(`update public.weekevaluaties set antwoorden = antwoorden - 'melding' where user_id = '${FENNA.id}' and week = '${vorigeWeek}'`);
  check(sql(`select count(*) from public.ideeen where door = '${FENNA.id}' and bron_week = '${vorigeWeek}'`) === "0", "zonder melding verdwijnt het weer van het bord");
  sql(`update public.weekevaluaties set antwoorden = antwoorden || '{"melding":"${lit(VERTROUWELIJK)}"}' where user_id = '${FENNA.id}' and week = '${vorigeWeek}'`);
  const vertrouwelijkId = sql(`select id from public.ideeen where door = '${FENNA.id}' and bron_week = '${vorigeWeek}'`);
  check(/^[0-9a-f-]{36}$/.test(vertrouwelijkId), "en komt terug als de melding er weer staat");
  await f.goto(`${BASIS}/admin/ideeen`);
  check((await f.locator("#bord article").count()) === 3, "Fenna ziet drie kaarten: haar idee, haar melding en haar vertrouwelijke melding");
  const weekKaart = await f.locator(`#idee-${weekId}`).innerText();
  check(weekKaart.includes(MELDING_TITEL) && weekKaart.includes(`uit de weekevaluatie van week ${weeknr(dezeWeek)}`) && weekKaart.includes("Loopt niet lekker"), "de kaart zegt waar het vandaan komt en wat het is");
  check(weekKaart.split(MELDING_TITEL).length === 2 && weekKaart.includes("Kunnen we een tweede dag erbij krijgen?"), "de eerste regel staat als titel en niet nog eens in de tekst");
  check((await f.locator(`#idee-${vertrouwelijkId}`).innerText()).includes("alleen beheer"), "haar vertrouwelijke melding draagt het slotje");
  check((await f.locator("[data-ideeen-kop]").innerText()).includes("3 ideeën, 3 nieuw deze week"), "de kop telt drie ideeën, drie nieuw deze week");
  await f.screenshot({ path: path.join(SHOTS, "02-bord-fenna-1440.png"), fullPage: true });

  stap("Bram: stemmen en reageren");
  await inloggen(b, BRAM.email, BRAM.wachtwoord, geheimBram);
  await b.goto(`${BASIS}/admin/ideeen`);
  await b.waitForSelector("#bord");
  check((await b.locator("#bord article").count()) === 2 && !(await b.locator("text=alleen beheer").count()), "Bram ziet twee kaarten, de vertrouwelijke niet");
  check(alsCollega(BRAM, `select count(*) from public.ideeen where id = '${vertrouwelijkId}'`) === "0", "ook rechtstreeks in de database niet");
  check(!(await b.locator("#nieuw-voor-jou").count()), "niets nieuw voor Bram");
  const stemKnop = b.locator(`#idee-${bordId} button[aria-label^="Stemmen"]`);
  check(await stemKnop.count(), "een stemknop op het idee van Fenna");
  await stemKnop.click();
  check(await totDat(() => sql(`select count(*) from public.idee_stemmen where idee_id = '${bordId}' and user_id = '${BRAM.id}'`) === "1"), "Brams stem staat in de database");
  await b.waitForSelector(`#idee-${bordId} button[aria-pressed="true"][data-stemmen="1"]`);
  check(!mag(() => alsCollega(BRAM, `insert into public.idee_stemmen (idee_id, user_id) values ('${bordId}', '${BRAM.id}')`)), "een tweede stem weigert de database");
  check(!mag(() => alsCollega(FENNA, `insert into public.idee_stemmen (idee_id, user_id) values ('${bordId}', '${FENNA.id}')`)), "op je eigen idee stemmen weigert de database");
  check(!mag(() => alsCollega(BRAM, `insert into public.idee_stemmen (idee_id, user_id) values ('${bordId}', '${FENNA.id}')`)), "stemmen namens een ander ook");
  await b.locator(`#idee-${bordId} button[aria-label^="Stem intrekken"]`).click();
  check(await totDat(() => sql(`select count(*) from public.idee_stemmen where idee_id = '${bordId}'`) === "0"), "intrekken haalt de stem weg");
  await b.locator(`#idee-${bordId} button[aria-label^="Stemmen"]`).click();
  check(await totDat(() => sql(`select count(*) from public.idee_stemmen where idee_id = '${bordId}'`) === "1"), "en opnieuw stemmen kan");
  await b.goto(`${BASIS}/admin/ideeen/${bordId}`);
  await b.waitForSelector("#reageren");
  tekst = await b.locator("body").innerText();
  check(tekst.includes("Eén collega vindt dit een goed idee") && tekst.includes("Jij stemde"), "de kaart telt de stem en weet dat hij van Bram is");
  check(tekst.includes("Fenna krijgt een bericht van je reactie"), "het formulier zegt dat Fenna een bericht krijgt");
  await b.fill("#reactie-tekst", "Goed idee. Ik doe mee vanaf maandag, dan bellen we samen.");
  await b.click("#reageren button.abtn");
  await b.waitForURL(/opgeslagen=reactie/, { timeout: 20000 });
  check(sql(`select count(*) || '|' || max(door_email) from public.idee_reacties where idee_id = '${bordId}'`) === `1|${BRAM.email}`, "de reactie staat in de database");
  check((await b.locator("#reacties").innerText()).includes("Ik doe mee vanaf maandag") && (await b.locator("#reacties").innerText()).includes("Jij"), "en op de kaart, als van Bram zelf");
  check(sql(`select soort || '|' || door_email || '|' || (gelezen_at is null) from public.idee_meldingen where user_id = '${FENNA.id}' and idee_id = '${bordId}'`) === `reactie|${BRAM.email}|true`, "Fenna heeft een ongelezen melding over de reactie");
  check(await totDat(() => mails().some((m) => m.to.includes(FENNA.email) && /^Bram reageerde op je idee/.test(m.subject || ""))), "en een mail");
  const reactieMail = mails().find((m) => m.to.includes(FENNA.email) && /^Bram reageerde op je idee/.test(m.subject || ""));
  check(reactieMail && reactieMail.reply_to === BRAM.email && reactieMail.html.includes("Ik doe mee vanaf maandag") && reactieMail.html.includes(`/admin/ideeen/${bordId}`), "met de reactie, de link en Bram als antwoordadres");
  fs.writeFileSync(path.join(SHOTS, "mail-reactie.html"), reactieMail?.html || "");
  await b.screenshot({ path: path.join(SHOTS, "03-kaart-bram-1440.png"), fullPage: true });

  stap("Fenna ziet de terugkoppeling op haar dashboard");
  await f.goto(`${BASIS}/admin`);
  dash = await f.locator("#ideeenbord").innerText();
  check(/nieuw voor jou/i.test(dash) && dash.includes(`Bram reageerde op "${BORD_TITEL}"`) && dash.includes("Ik doe mee vanaf maandag"), "dashboard: Bram reageerde, met het begin van de reactie");
  check(dash.includes("3 nieuwe ideeën") && dash.includes("nog niets van jou opgepakt"), "en de telling van deze week");
  check(/vraagt één ding je aandacht|vragen \d+ dingen je aandacht/.test(await f.locator("body").innerText()), "het bericht telt als aandacht");
  await f.goto(`${BASIS}/admin/ideeen`);
  check((await f.locator("#nieuw-voor-jou").innerText()).includes("Bram reageerde"), "het bord toont het ook bovenaan");
  check(await totDat(() => sql(`select count(*) from public.idee_meldingen where user_id = '${FENNA.id}' and gelezen_at is null`) === "0", 8000), "na het bekijken staat de melding op gelezen");
  await f.goto(`${BASIS}/admin`);
  check(!(await f.locator("#ideeen-nieuw-voor-jou").count()), "en het dashboard toont hem niet meer");

  stap("Het beheer: de status zetten met een reden");
  await inloggen(r, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await r.goto(`${BASIS}/admin/ideeen`);
  await r.waitForSelector("#bord");
  check((await r.locator("#bord article").count()) === 3 && (await r.locator(`#idee-${vertrouwelijkId}`).innerText()).includes("alleen beheer"), "het beheer ziet ook de vertrouwelijke melding, met slotje");
  check(!(await r.locator("#ideeen-wachten").count()), "nog geen signaal: niets wacht langer dan twee weken");
  await r.goto(`${BASIS}/admin/ideeen/${bordId}`);
  await r.waitForSelector("#status");
  check((await r.locator("#status").innerText()).includes("Fenna krijgt een bericht op het dashboard en per mail"), "het statusformulier zegt wie een bericht krijgt");
  await r.check('#status input[name="status"][value="opgepakt"]');
  await r.fill("#status-reden", "Vanaf volgende week proberen we het twee weken met het hele team.");
  await r.click("#status button.abtn");
  await r.waitForURL(/opgeslagen=idee-status-opgepakt/, { timeout: 20000 });
  check(sql(`select status || '|' || (status_at is not null) || '|' || status_door from public.ideeen where id = '${bordId}'`) === `opgepakt|true|${BEHEERDER.email}`, "opgepakt, met wanneer en door wie");
  tekst = await r.locator("body").innerText();
  check(/het beheer schreef erbij/i.test(tekst) && tekst.includes("twee weken met het hele team") && (await r.locator('[aria-label="Waar het idee staat"] [aria-current="step"]').innerText()).includes("Opgepakt"), "de kaart toont de reden en het pad op Opgepakt");
  check(sql(`select soort || '|' || status || '|' || (gelezen_at is null) from public.idee_meldingen where user_id = '${FENNA.id}' and idee_id = '${bordId}' and soort = 'status'`) === "status|opgepakt|true", "Fenna heeft een melding over de status");
  check(await totDat(() => mails().some((m) => m.to.includes(FENNA.email) && m.subject === `Je idee "${BORD_TITEL}": opgepakt`)), "en een mail");
  const statusMail = mails().find((m) => m.to.includes(FENNA.email) && m.subject === `Je idee "${BORD_TITEL}": opgepakt`);
  check(statusMail && statusMail.html.includes("Hoi Fenna,") && statusMail.html.includes("is opgepakt") && statusMail.html.includes("twee weken met het hele team") && !/\bRens\b/.test(statusMail.html.replace(/rens@react2u\.nl/g, "")), "aanhef, wat het betekent, de reden, zonder naam");
  fs.writeFileSync(path.join(SHOTS, "mail-status.html"), statusMail?.html || "");
  // Niet nu zonder reden wordt geweigerd; met reden niet.
  await r.goto(`${BASIS}/admin/ideeen/${weekId}`);
  await r.check('#status input[name="status"][value="niet_nu"]');
  await r.fill("#status-reden", "");
  await r.click("#status button.abtn");
  await r.waitForURL(/fout=idee-reden/, { timeout: 20000 });
  check(sql(`select status from public.ideeen where id = '${weekId}'`) === "ingediend", "Niet nu zonder reden: geweigerd, de status blijft");
  check(!mag(() => sql(`update public.ideeen set status = 'niet_nu', reden = null where id = '${weekId}'`)), "ook de database eist een reden bij Niet nu");
  await r.check('#status input[name="status"][value="niet_nu"]');
  await r.fill("#status-reden", "De bedrijfsarts heeft op dit moment geen tweede dag; we kijken er in januari opnieuw naar.");
  await r.click("#status button.abtn");
  await r.waitForURL(/opgeslagen=idee-status-niet_nu/, { timeout: 20000 });
  check(sql(`select status from public.ideeen where id = '${weekId}'`) === "niet_nu", "Niet nu met reden: gezet");
  check(await totDat(() => mails().filter((m) => m.to.includes(FENNA.email) && /^Je idee/.test(m.subject || "")).length === 2), "Fenna krijgt ook daarvan een mail");
  // Een collega zet geen status, ook niet rechtstreeks.
  alsCollega(FENNA, `update public.ideeen set status = 'gedaan' where id = '${weekId}'`);
  check(sql(`select status from public.ideeen where id = '${weekId}'`) === "niet_nu", "een collega verandert de status niet, ook niet rechtstreeks");
  alsCollega(FENNA, `update public.ideeen set titel = 'Anders' where id = '${weekId}'`);
  check(sql(`select titel from public.ideeen where id = '${weekId}'`) === MELDING_TITEL, "en past een idee niet meer aan nadat het beheer het bekeek");
  await r.screenshot({ path: path.join(SHOTS, "04-kaart-beheer-1440.png"), fullPage: true });

  stap("Fenna: wat van jou is opgepakt");
  await f.goto(`${BASIS}/admin`);
  dash = await f.locator("#ideeenbord").innerText();
  check(dash.includes("1 idee van jou opgepakt") && dash.includes(`Je idee "${BORD_TITEL}" staat nu op Opgepakt`) && dash.includes("twee weken met het hele team"), "dashboard: opgepakt, met de reden");
  check(dash.includes(`Je idee "${MELDING_TITEL}" staat nu op Niet nu`) && dash.includes("in januari opnieuw"), "en Niet nu met de reden");
  await f.goto(`${BASIS}/admin/ideeen/${bordId}`);
  tekst = await f.locator("body").innerText();
  check(tekst.includes("Er wordt aan gewerkt") && tekst.includes("twee weken met het hele team") && !(await f.locator("#wijzigen").count()), "Fenna leest de uitkomst en kan haar idee niet meer aanpassen");
  check(!/\bRens\b/.test(tekst), "zonder naam");
  await f.screenshot({ path: path.join(SHOTS, "05-kaart-fenna-1440.png"), fullPage: true });

  stap("Het signaal na twee weken, filteren en sorteren");
  sql(`insert into public.ideeen (titel, tekst, soort, door, door_email, created_at) values ('Een kortere wachttijd aan de telefoon', 'Klanten hangen soms drie minuten in de wacht.', 'idee', '${BRAM.id}', '${BRAM.email}', now() - interval '15 days'),
    ('Pas gisteren ingediend', 'Dit wacht nog niet lang.', 'vraag', '${BRAM.id}', '${BRAM.email}', now() - interval '1 day')`);
  await r.goto(`${BASIS}/admin`);
  const signaal = await r.locator("#ideeen-lang-open").innerText().catch(() => "");
  check(signaal.includes("Eén idee wacht al langer dan twee weken op het beheer") && signaal.includes("Een kortere wachttijd aan de telefoon"), `dashboard van het beheer: het signaal (${signaal.split("\n")[0]})`);
  await r.goto(`${BASIS}/admin/ideeen`);
  const wachten = await r.locator("#ideeen-wachten").innerText();
  check(wachten.includes("Eén idee wacht al langer dan twee weken") && wachten.includes("Een kortere wachttijd aan de telefoon") && !wachten.includes("Pas gisteren"), "het bord noemt alleen wat al twee weken wacht");
  await f.goto(`${BASIS}/admin`);
  check(!(await f.locator("#ideeen-lang-open").count()), "een collega krijgt het signaal niet");
  await r.goto(`${BASIS}/admin/ideeen?status=opgepakt`);
  check((await r.locator("#bord article").count()) === 1 && (await r.locator("#bord article").first().innerText()).includes(BORD_TITEL), "filter Opgepakt: één kaart");
  check(await r.locator('nav[aria-label="Status"] a[aria-current="true"]:has-text("Opgepakt")').count(), "met de knop Opgepakt actief");
  await r.goto(`${BASIS}/admin/ideeen?status=niet_nu`);
  check((await r.locator("#bord article").count()) === 1 && (await r.locator("#bord article").first().innerText()).includes("in januari opnieuw"), "filter Niet nu: één kaart, met de reden erop");
  await r.goto(`${BASIS}/admin/ideeen?sorteer=stemmen`);
  const volgorde = await r.locator("#bord article").evaluateAll((els) => els.map((e) => e.getAttribute("data-idee")));
  check(volgorde[0] === BORD_TITEL && volgorde.length === 5, `meeste stemmen eerst: ${volgorde[0]} (${volgorde.length} kaarten)`);
  await r.goto(`${BASIS}/admin/ideeen`);
  const nieuwste = await r.locator("#bord article").evaluateAll((els) => els.map((e) => e.getAttribute("data-idee")));
  check(nieuwste.slice(0, 3).every((t) => [BORD_TITEL, MELDING_TITEL, VERTROUWELIJK].includes(t)) && nieuwste[3] === "Pas gisteren ingediend" && nieuwste[4] === "Een kortere wachttijd aan de telefoon", `nieuwste eerst, het oudste onderaan (${nieuwste.join(" | ")})`);
  await r.screenshot({ path: path.join(SHOTS, "06-bord-beheer-1440.png"), fullPage: true });

  stap("Beheer tegenover Mijn React2u, en opruimen door de inbrenger");
  await r.click("#weergave-wisselen");
  await r.waitForSelector("#weergave-wisselen:has-text('Naar Beheer')", { timeout: 20000 });
  await r.goto(`${BASIS}/admin/ideeen`);
  check((await r.locator("#bord article").count()) === 4 && !(await r.locator("#ideeen-wachten").count()), "in Mijn React2u ziet de beheerder het bord als collega: zonder vertrouwelijke melding en zonder signaal");
  await r.goto(`${BASIS}/admin/ideeen/${bordId}`);
  check(!(await r.locator("#status").count()), "en zonder statusformulier");
  await r.click("#weergave-wisselen");
  await r.waitForSelector("#weergave-wisselen:has-text('Naar Mijn React2u')", { timeout: 20000 });
  const bramId = sql(`select id from public.ideeen where titel = 'Pas gisteren ingediend'`);
  await b.goto(`${BASIS}/admin/ideeen/${bramId}`);
  await b.click("#wijzigen summary");
  await b.fill("#wijzig-titel", "Pas gisteren ingediend, iets scherper");
  await b.click("#wijzigen button:has-text('Bewaren')");
  await b.waitForURL(/opgeslagen=idee-bewaard/, { timeout: 20000 });
  check(sql(`select titel from public.ideeen where id = '${bramId}'`) === "Pas gisteren ingediend, iets scherper", "Bram past zijn eigen idee aan zolang het ingediend is");
  await b.click("#wijzigen form:has(button:has-text('Van het bord halen')) button");
  await b.waitForURL(/opgeslagen=idee-weg/, { timeout: 20000 });
  check(sql(`select count(*) from public.ideeen where id = '${bramId}'`) === "0", "en haalt het van het bord");
  check(!mag(() => alsCollega(BRAM, `delete from public.ideeen where id = '${bordId}' returning id`)) || sql(`select count(*) from public.ideeen where id = '${bordId}'`) === "1", "het idee van Fenna haalt hij niet weg");

  for (const [page, url, naam] of [[f, "/admin/ideeen", "bord-fenna"], [f, `/admin/ideeen/${bordId}`, "kaart-fenna"], [f, "/admin", "dashboard-fenna"], [r, "/admin/ideeen", "bord-beheer"], [r, `/admin/ideeen/${weekId}`, "kaart-beheer"]]) {
    stap(`Telefoon: ${naam}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASIS}${url}`);
    await page.waitForSelector("h1");
    const over = await overloop(page);
    check(over <= 0, `${naam}: geen horizontale scroll op 390 px (${over})`);
    await page.addStyleTag({ content: ".sticky { position: static !important; }" });
    await page.screenshot({ path: path.join(SHOTS, `07-${naam}-390.png`), fullPage: true });
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
