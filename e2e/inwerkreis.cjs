// Inwerkreis (0050) van begin tot eind: drie lege sjablonen per functie, het beheer vult er een (toevoegen,
// bewerken, verplaatsen), start een reis voor een nieuwe collega met een buddy, de collega ziet hem in Mijn React2u
// (menu, dashboard, eigen scherm), vinkt taken en oefencasussen af maar geen mijlpalen, het beheer tekent een
// mijlpaal af, past de buddy aan, rondt af en heropent; de policies (alleen de eigen reis, geen mijlpaal zelf
// aftekenen, sjablonen alleen met het recht omzet), een sjabloon in gebruik kan niet weg, en 390 px zonder
// zijwaarts scrollen. Verzonnen collega's. Draaien via e2e/run.mjs (E2E_ALLEEN=inwerkreis).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "inwerkreis");
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

/** De nieuwe collega, met de rol werknemer (alleen in de testomgeving). */
const NIEUW = { id: "bbbbbbbb-0000-4000-8000-000000000003", email: "sam@react2u.test", wachtwoord: "Test-wachtwoord-789", naam: "Sam Jansen" };
const RENS_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const dagenTerug = (n) => new Date(Date.parse(`${vandaag}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
// Veertig dagen geleden begonnen: dag 41, in de tweede fase, met de eerste fase nog open.
const START = dagenTerug(40);

async function stelAuthenticatorIn(email, wachtwoord) {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-inwerk-${Date.now()}` });
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

/** SQL met de rechten van een collega (RLS geldt). Alleen de laatste regel is het antwoord. */
function alsCollega(userId, q) {
  return sql(`set role authenticated; set request.jwt.claim.sub = '${userId}'; set request.jwt.claims = '{"sub":"${userId}","role":"authenticated","email":"${NIEUW.email}"}'; ${q}`).split("\n").pop();
}
const mag = (f) => { try { f(); return true; } catch { return false; } };

async function stapToevoegen(page, fase, soort, titel, uitleg) {
  await page.locator(`details:has(form[data-nieuw="${fase}"])`).evaluate((d) => { d.open = true; });
  const f = page.locator(`form[data-nieuw="${fase}"]`);
  await f.locator(`label:has(input[name="soort"][value="${soort}"])`).click();
  await f.locator('input[name="titel"]').fill(titel);
  if (uitleg) await f.locator('textarea[name="uitleg"]').fill(uitleg);
  await f.locator("button.abtn").click();
  await page.waitForSelector(`li[data-stap="${titel}"]`, { timeout: 20000 });
}

const overloop = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  stap("Database: drie lege sjablonen, de nieuwe collega en de policies");
  sql(`delete from public.inwerkreizen; delete from public.inwerk_stappen;
delete from public.inwerk_sjablonen where functie not in ('Casemanager Verzuim', 'Backoffice', 'Sales / accountmanager');
delete from public.medewerkers where user_id = '${NIEUW.id}';
delete from public.admins where user_id = '${NIEUW.id}'; delete from auth.identities where user_id = '${NIEUW.id}'; delete from auth.users where id = '${NIEUW.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', '${NIEUW.id}', 'authenticated', 'authenticated', '${NIEUW.email}', extensions.crypt('${NIEUW.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${NIEUW.id}', '${NIEUW.id}', '{"sub":"${NIEUW.id}","email":"${NIEUW.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${NIEUW.id}', '${NIEUW.email}', id, now() from public.roles where key = 'werknemer';
insert into public.medewerkers (naam, functie, user_id) values ('${NIEUW.naam}', 'Casemanager Verzuim', '${NIEUW.id}');`);
  check(sql("select string_agg(functie, ',' order by sort) from public.inwerk_sjablonen") === "Casemanager Verzuim,Backoffice,Sales / accountmanager", "drie sjablonen: Casemanager Verzuim, Backoffice, Sales / accountmanager");
  check(sql("select count(*) from public.inwerk_stappen") === "0", "en ze zijn leeg");
  const CM = sql("select id from public.inwerk_sjablonen where functie = 'Casemanager Verzuim'");
  const BO = sql("select id from public.inwerk_sjablonen where functie = 'Backoffice'");
  check(!mag(() => sql("set role anon; select count(*) from public.inwerk_sjablonen")), "anon leest geen sjablonen");
  check(alsCollega(NIEUW.id, "select count(*) from public.inwerk_sjablonen") === "0", "een werknemer zonder reis ziet geen sjablonen");
  check(!mag(() => alsCollega(NIEUW.id, `insert into public.inwerk_stappen (sjabloon_id, fase, soort, titel) values ('${CM}', 30, 'taak', 'Zelf bedacht')`)), "en kan er geen stap aan toevoegen");
  const geheimNieuw = await stelAuthenticatorIn(NIEUW.email, NIEUW.wachtwoord);

  const browser = await chromium.launch();
  const paginafouten = [];
  const nieuwePagina = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => paginafouten.push(String(e)));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    return page;
  };
  const b = await nieuwePagina(); // het beheer (super admin)
  const n = await nieuwePagina(); // de nieuwe collega

  stap("Het beheer: Inwerken in de groep Beheer, drie lege sjablonen");
  await inloggen(b, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await b.goto(`${BASIS}/admin`);
  check(await b.locator('#menu-beheer a[href="/admin/inwerken"]').count(), "Inwerken staat in de groep Beheer");
  check(!(await b.locator('aside nav a[href="/admin/inwerkreis"]').count()), "zonder eigen reis geen Inwerkreis in het menu");
  await b.goto(`${BASIS}/admin/inwerken`);
  await b.waitForSelector("h1:has-text('Inwerken')");
  let tekst = await b.locator("body").innerText();
  check((await b.locator("article[data-functie]").count()) === 3 && (tekst.match(/Nog leeg/g) || []).length === 3, "drie sjabloonkaarten, alle drie nog leeg");
  check(tekst.includes("Er loopt nu geen inwerkreis"), "nog geen lopende reis");

  stap("Het sjabloon Casemanager Verzuim vullen");
  await b.goto(`${BASIS}/admin/inwerken/sjabloon/${CM}`);
  await b.waitForSelector("h1:has-text('Casemanager Verzuim')");
  await stapToevoegen(b, 30, "taak", "Kennismaken met het team", "Een kop koffie met iedere collega in de eerste week.");
  await stapToevoegen(b, 30, "casus", "Een ziekmelding doorlopen", "Van melding tot plan van aanpak, met een oefendossier.");
  await stapToevoegen(b, 30, "mijlpaal", "Eerste dossier zelfstandig");
  await stapToevoegen(b, 60, "taak", "Spoor 2 uitleggen aan een werkgever");
  await stapToevoegen(b, 90, "mijlpaal", "Evaluatiegesprek na 90 dagen");
  check(sql(`select count(*) from public.inwerk_stappen where sjabloon_id = '${CM}'`) === "5", "vijf stappen bewaard");
  check(sql(`select string_agg(soort || ':' || titel, ' | ' order by sort) from public.inwerk_stappen where sjabloon_id = '${CM}' and fase = 30`) === "taak:Kennismaken met het team | casus:Een ziekmelding doorlopen | mijlpaal:Eerste dossier zelfstandig", "de eerste fase in volgorde, met de goede soorten");
  // Bewerken: de titel van de oefencasus.
  const casus = b.locator('li[data-stap="Een ziekmelding doorlopen"]');
  await casus.locator("summary").click();
  await casus.locator('input[name="titel"]').fill("Een ziekmelding van begin tot eind");
  await casus.locator("form button.abtn").click();
  await b.waitForSelector('li[data-stap="Een ziekmelding van begin tot eind"]', { timeout: 20000 });
  check(sql(`select count(*) from public.inwerk_stappen where titel = 'Een ziekmelding van begin tot eind' and soort = 'casus' and fase = 30`) === "1", "een stap bewerken");
  // Verplaatsen: de mijlpaal een plek omhoog.
  await b.click('button[aria-label="Eerste dossier zelfstandig omhoog"]');
  await totDat(() => sql(`select string_agg(titel, ' | ' order by sort) from public.inwerk_stappen where sjabloon_id = '${CM}' and fase = 30`).startsWith("Kennismaken met het team | Eerste dossier"));
  check(sql(`select string_agg(titel, ' | ' order by sort) from public.inwerk_stappen where sjabloon_id = '${CM}' and fase = 30`) === "Kennismaken met het team | Eerste dossier zelfstandig | Een ziekmelding van begin tot eind", "een stap omhoog verplaatsen");
  await b.goto(`${BASIS}/admin/inwerken/sjabloon/${CM}`);
  check((await b.locator('li[data-stap] >> nth=0').getAttribute("data-stap")) === "Kennismaken met het team", "het scherm volgt de volgorde");
  await b.screenshot({ path: path.join(SHOTS, "01-sjabloon-1440.png"), fullPage: true });

  stap("Een inwerkreis starten voor de nieuwe collega");
  await b.goto(`${BASIS}/admin/inwerken`);
  const opties = await b.locator('#start-collega option').allInnerTexts();
  check(opties.some((o) => o.startsWith(`${NIEUW.naam} · Werknemer`)), `de collega staat in de lijst met naam en rol (${opties.filter((o) => o.startsWith("Sam")).join(", ")})`);
  await b.selectOption("#start-collega", NIEUW.id);
  await b.selectOption("#start-functie", CM);
  await b.fill("#start-datum", START);
  await b.fill("#start-buddy", "Lotte Bakker");
  await b.click("button.abtn:has-text('Inwerkreis starten')");
  await b.waitForURL(/\/admin\/inwerken\/[0-9a-f-]{36}\?opgeslagen=inwerkreis/, { timeout: 20000 });
  const REIS = new URL(b.url()).pathname.split("/").pop();
  check(sql(`select sjabloon_id || '|' || startdatum || '|' || buddy from public.inwerkreizen where user_id = '${NIEUW.id}'`) === `${CM}|${START}|Lotte Bakker`, "de reis is bewaard met sjabloon, eerste werkdag en buddy");
  tekst = await b.locator("main").innerText();
  check(tekst.includes(NIEUW.naam) && tekst.includes("Dag 41 van 90") && tekst.includes("Lotte Bakker") && tekst.includes("1 mijlpaal af te tekenen"), "de reis in het beheer: naam, dag 41, buddy en een mijlpaal af te tekenen");
  await b.goto(`${BASIS}/admin/inwerken`);
  check(!(await b.locator(`#start-collega option[value="${NIEUW.id}"]`).count()), "wie al een reis heeft, staat niet meer in de lijst om te starten");
  check((await b.locator(`[data-reis="${NIEUW.email}"]`).innerText()).includes("0 van 5 stappen gedaan"), "en staat bij de lopende reizen");
  // Een tweede reis, voor de beheerder zelf, om te zien dat een collega alleen de eigen reis ziet.
  sql(`insert into public.inwerkreizen (user_id, sjabloon_id, startdatum, buddy) values ('${RENS_ID}', '${BO}', '${vandaag}', 'Iemand anders')`);
  sql(`insert into public.inwerk_stappen (sjabloon_id, fase, soort, titel) values ('${BO}', 30, 'taak', 'Geheime backofficestap')`);

  stap("De nieuwe collega: Mijn React2u met Inwerkreis");
  await inloggen(n, NIEUW.email, NIEUW.wachtwoord, geheimNieuw);
  await n.goto(`${BASIS}/admin`);
  const menu = await n.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(JSON.stringify(menu) === JSON.stringify(["/admin", "/admin/weekevaluatie", "/admin/inwerkreis"]), `menu: Dashboard, Weekevaluatie, Inwerkreis (${menu.join(", ")})`);
  check((await n.locator("aside").first().innerText()).includes("Mijn React2u"), "Mijn React2u bovenaan");
  const kaart = (await n.locator("#mijn-inwerkreis").innerText()).replace(/\s+/g, " ");
  check(kaart.includes("Casemanager Verzuim") && kaart.includes("Dag 41 van 90") && kaart.includes("0 van 5 stappen") && kaart.includes("buddy Lotte Bakker"), `dashboard: functie, dag, stappen en buddy (${kaart.slice(0, 120)})`);
  check(kaart.includes("Taak Kennismaken met het team Mijlpaal Eerste dossier zelfstandig Oefencasus Een ziekmelding van begin tot eind"), "aan de beurt: eerst wat uit de eerste fase nog openstaat");
  await n.screenshot({ path: path.join(SHOTS, "02-dashboard-1440.png"), fullPage: true });
  await n.goto(`${BASIS}/admin/inwerkreis`);
  await n.waitForSelector("h1:has-text('Mijn inwerkreis')");
  tekst = (await n.locator("main").innerText()).replace(/\s+/g, " ");
  check(tekst.includes("Je buddy Lotte Bakker") && tekst.includes("Dag 41 van 90") && tekst.includes("3 stappen uit een eerdere fase staan nog open"), "het eigen scherm: buddy, dag en de achterstand");
  check(await n.locator("#fase-60 >> text=Nu").count(), "de tweede fase loopt nu");
  check(!tekst.includes("Geheime backofficestap") && !tekst.includes("Iemand anders"), "niets van een andere reis");
  check((await n.locator('button[role="checkbox"]').count()) === 3, "drie vinkjes: twee taken en de oefencasus, geen mijlpalen");
  check((await n.locator("li[data-stap=mijlpaal]").count()) === 2 && tekst.includes("Tekent het beheer af als het zover is."), "de mijlpalen staan erbij, af te tekenen door het beheer");
  check(alsCollega(NIEUW.id, "select count(*) from public.inwerkreizen") === "1" && alsCollega(NIEUW.id, "select count(*) from public.inwerk_sjablonen") === "1" && alsCollega(NIEUW.id, "select count(*) from public.inwerk_stappen") === "5", "de policies: alleen de eigen reis, het eigen sjabloon en zijn vijf stappen");
  await n.goto(`${BASIS}/admin/inwerken`);
  check(new URL(n.url()).pathname === "/admin", "Inwerken stuurt een werknemer terug naar het dashboard");

  stap("Afvinken: taken en oefencasussen wel, mijlpalen niet");
  await n.goto(`${BASIS}/admin/inwerkreis`);
  const taak = n.locator('button[role="checkbox"][aria-label="Taak: Kennismaken met het team"]');
  await taak.click();
  check(await totDat(() => sql(`select count(*) from public.inwerk_voortgang v join public.inwerk_stappen s on s.id = v.stap_id where s.titel = 'Kennismaken met het team' and v.door = '${NIEUW.email}'`) === "1"), "een taak afgevinkt, door de collega zelf");
  check((await taak.getAttribute("aria-checked")) === "true", "het vinkje staat aan");
  const oefen = n.locator('button[role="checkbox"][aria-label="Oefencasus: Een ziekmelding van begin tot eind"]');
  await oefen.click();
  check(await totDat(() => sql("select count(*) from public.inwerk_voortgang") === "2"), "de oefencasus afgevinkt");
  await oefen.click();
  check(await totDat(() => sql("select count(*) from public.inwerk_voortgang") === "1"), "en weer terug open gezet");
  await n.reload();
  check((await n.locator('button[role="checkbox"][aria-label="Taak: Kennismaken met het team"]').getAttribute("aria-checked")) === "true" && (await n.locator("main").innerText()).includes("Gedaan op"), "na herladen staat de taak nog als gedaan");
  const MIJLPAAL = sql("select id from public.inwerk_stappen where titel = 'Eerste dossier zelfstandig'");
  check(!mag(() => alsCollega(NIEUW.id, `insert into public.inwerk_voortgang (reis_id, stap_id) values ('${REIS}', '${MIJLPAAL}')`)), "een mijlpaal zelf aftekenen weigert de database");
  const GEHEIM_STAP = sql("select id from public.inwerk_stappen where titel = 'Geheime backofficestap'");
  check(!mag(() => sql(`insert into public.inwerk_voortgang (reis_id, stap_id) values ('${REIS}', '${GEHEIM_STAP}')`)), "een stap van een ander sjabloon past niet bij deze reis");
  await n.screenshot({ path: path.join(SHOTS, "03-mijn-inwerkreis-1440.png"), fullPage: true });

  stap("Het beheer tekent een mijlpaal af en past de buddy aan");
  await b.goto(`${BASIS}/admin/inwerken/${REIS}`);
  check((await b.locator('button[role="checkbox"]').count()) === 5, "in het beheer heeft elke stap een vinkje, ook de mijlpalen");
  await b.click('button[role="checkbox"][aria-label="Mijlpaal: Eerste dossier zelfstandig"]');
  check(await totDat(() => sql(`select door from public.inwerk_voortgang where stap_id = '${MIJLPAAL}'`) === BEHEERDER.email), "de mijlpaal is afgetekend door het beheer");
  await b.reload();
  check((await b.locator("main").innerText()).includes(`door ${NIEUW.email}`), "het beheer ziet wie wat afvinkte");
  await b.fill("#reis-buddy", "Lotte de Boer");
  await b.click("button.abtn:has-text('Bewaren')");
  await b.waitForURL(/opgeslagen=inwerkreis-bewaard/, { timeout: 20000 });
  check(sql(`select buddy from public.inwerkreizen where id = '${REIS}'`) === "Lotte de Boer", "de buddy aangepast");
  await b.screenshot({ path: path.join(SHOTS, "04-reis-beheer-1440.png"), fullPage: true });
  await n.goto(`${BASIS}/admin/inwerkreis`);
  tekst = (await n.locator("main").innerText()).replace(/\s+/g, " ");
  check(tekst.includes("Afgetekend op") && tekst.includes("Je buddy Lotte de Boer") && tekst.includes("2 van 5 stappen"), "de collega ziet de afgetekende mijlpaal, de nieuwe buddy en 2 van 5");

  stap("Afronden en heropenen");
  await b.click("button:has-text('Inwerkreis afronden')");
  await b.waitForURL(/opgeslagen=inwerkreis-af/, { timeout: 20000 });
  await n.goto(`${BASIS}/admin`);
  check(!(await n.locator("#mijn-inwerkreis").count()), "afgerond: niet meer op het dashboard van de collega");
  await n.goto(`${BASIS}/admin/inwerkreis`);
  check((await n.locator("#reis-kop").innerText()).includes("Afgerond"), "het eigen scherm zegt afgerond");
  await b.goto(`${BASIS}/admin/inwerken`);
  await b.click("summary:has-text('Afgeronde inwerkreizen')");
  check((await b.locator("details:has-text('Afgeronde inwerkreizen')").innerText()).includes(NIEUW.naam), "het beheer vindt de reis bij de afgeronde reizen");
  await b.goto(`${BASIS}/admin/inwerken/${REIS}`);
  await b.click("button:has-text('Weer laten lopen')");
  await b.waitForURL(/opgeslagen=inwerkreis-heropend/, { timeout: 20000 });
  check(sql(`select afgerond_at is null from public.inwerkreizen where id = '${REIS}'`) === "t", "heropend");

  stap("Sjablonen: in gebruik kan niet weg, een nieuwe functie wel");
  await b.goto(`${BASIS}/admin/inwerken/sjabloon/${CM}`);
  check((await b.locator("main").innerText()).includes("Kan niet: dit sjabloon hoort bij een inwerkreis"), "een sjabloon in gebruik kan niet weg");
  await b.goto(`${BASIS}/admin/inwerken`);
  await b.fill("#nieuwe-functie", "Bedrijfsarts");
  await b.click("button:has-text('Sjabloon toevoegen')");
  await b.waitForURL(/\/sjabloon\/[0-9a-f-]{36}\?opgeslagen=inwerk-sjabloon/, { timeout: 20000 });
  check(sql("select count(*) from public.inwerk_sjablonen where functie = 'Bedrijfsarts'") === "1", "een nieuwe functie toegevoegd");
  await b.click("button:has-text('Verwijderen')");
  await b.waitForURL(/opgeslagen=inwerk-sjabloon-weg/, { timeout: 20000 });
  check(sql("select count(*) from public.inwerk_sjablonen where functie = 'Bedrijfsarts'") === "0", "en weer verwijderd");

  for (const [page, url, naam] of [[n, "/admin", "dashboard"], [n, "/admin/inwerkreis", "mijn-inwerkreis"], [b, "/admin/inwerken", "overzicht"], [b, `/admin/inwerken/sjabloon/${CM}`, "sjabloon"], [b, `/admin/inwerken/${REIS}`, "reis-beheer"]]) {
    stap(`Telefoon: ${naam}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASIS}${url}`);
    await page.waitForSelector("h1");
    const o = await overloop(page);
    check(o <= 0, `${naam}: geen horizontale scroll op 390 px (${o})`);
    await page.addStyleTag({ content: ".sticky { position: static !important; }" });
    await page.screenshot({ path: path.join(SHOTS, `05-${naam}-390.png`), fullPage: true });
  }

  sql(`delete from public.inwerkreizen; delete from public.inwerk_stappen; delete from public.medewerkers where user_id = '${NIEUW.id}';`);
  console.log(`\nPaginafouten: ${paginafouten.length ? paginafouten.join("\n") : "geen"}`);
  check(!paginafouten.length, "geen fouten in de browser");
  console.log(fout.length ? `\n${fout.length} MISLUKT:\n- ${fout.join("\n- ")}` : "\nALLES GESLAAGD");
  await browser.close();
  process.exit(fout.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
