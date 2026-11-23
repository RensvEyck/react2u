// Waarneming (0057) van begin tot eind: het recht waarneming en de policies, twee werknemers met klanten op naam op
// de stamkaart, een collega die zegt "ik ben er niet, Bram neemt waar" (mail aan de waarnemer met de klanten), de
// waarnemer die het op zijn dashboard ziet maar niets aanpast, het beheer dat voor een ander plant zonder waarnemer
// (signaal, mail aan de afwezige), de waarnemer erbij zet en de klanten beperkt, de pil op de stamkaart en de
// bordkaart (nu, straks), het blok in het CM-overleg, Beheer tegenover Mijn React2u, aanpassen en weghalen door de
// afwezige, en 390 px zonder zijwaarts scrollen. Verzonnen collega's en klanten. Draaien via e2e/run.mjs
// (E2E_ALLEEN=waarneming).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, MAILS, BEHEERDER, mails, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "waarneming");
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

const FENNA = { id: "bbbbbbbb-0000-4000-8000-000000000005", email: "fenna@react2u.test", wachtwoord: "Test-wachtwoord-555", naam: "Fenna de Vries" };
const BRAM = { id: "bbbbbbbb-0000-4000-8000-000000000006", email: "bram@react2u.test", wachtwoord: "Test-wachtwoord-666", naam: "Bram Bakker" };

// Dezelfde datumregels als lib/waarneming.ts.
const DAG = 86_400_000;
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const utc = (d) => new Date(`${d}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const plusDagen = (d, n) => iso(new Date(utc(d).getTime() + n * DAG));
const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const datumKort = (d) => `${DAGEN[utc(d).getUTCDay()]} ${utc(d).getUTCDate()} ${MND[utc(d).getUTCMonth()]}`;
const periode = (van, tot) => {
  if (van === tot) return datumKort(van);
  const a = utc(van), b = utc(tot);
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear() ? `${DAGEN[a.getUTCDay()]} ${a.getUTCDate()} t/m ${datumKort(tot)}` : `${datumKort(van)} t/m ${datumKort(tot)}`;
};

async function stelAuthenticatorIn(email, wachtwoord) {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-waarneming-${Date.now()}` });
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
  return sql(`set role authenticated; set request.jwt.claim.sub = '${c.id}'; set request.jwt.claims = '{"sub":"${c.id}","role":"authenticated","email":"${c.email}","aal":"aal2"}'; ${q}`).split("\n").pop().trim();
}
const mag = (f) => { try { f(); return true; } catch { return false; } };
const overloop = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

function maakCollega(c) {
  sql(`delete from public.medewerkers where user_id = '${c.id}'; delete from public.admins where user_id = '${c.id}'; delete from auth.identities where user_id = '${c.id}'; delete from auth.users where id = '${c.id}';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '${c.id}', 'authenticated', 'authenticated', '${c.email}', extensions.crypt('${c.wachtwoord}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${c.id}', '${c.id}', '{"sub":"${c.id}","email":"${c.email}"}', 'email', now(), now(), now());
insert into public.admins (user_id, email, role_id, invited_at) select '${c.id}', '${c.email}', id, now() - interval '30 days' from public.roles where key = 'werknemer';
insert into public.medewerkers (naam, functie, user_id) values (${lit(c.naam)}, 'Casemanager Verzuim', '${c.id}');`);
}

// Drie echte klanten en een lead; "fenna" en "Bram" alleen met de voornaam, zoals iemand dat op de stamkaart tikt.
const KLANTEN = [
  ["Bakkerij Bos", "klant", "Fenna de Vries", 12, "Breda"],
  ["Garage Smits", "klant", "fenna", 8, "Tilburg"],
  ["Kapsalon Knip", "klant", "Bram", 3, "Oosterhout"],
  ["Lunchroom Lead", "lead", "Fenna de Vries", 2, "Breda"],
];
const TOELICHTING = "Bakkerij Bos verwacht dinsdag een terugbelletje over het verzuimprotocol. De werkwijze staat in het dossier Werkwijze op de schijf.";

(async () => {
  if (fs.existsSync(MAILS)) fs.unlinkSync(MAILS);

  stap("Database: het recht, de tabel, de hulpfuncties en twee collega's met klanten op naam");
  check(sql("select 'waarneming' = any(permissions) from public.roles where key = 'werknemer'") === "t", "de rol werknemer heeft het recht waarneming");
  check(sql("select 'waarneming' = any(permissions) from public.roles where key = 'superadmin'") === "t" && sql("select 'waarneming' = any(permissions) from public.roles where key = 'beheerder'") === "t", "de super admin en de beheerder ook");
  check(sql("select coalesce('waarneming' = any(permissions), false) from public.roles where key = 'redacteur'") === "f", "de redacteur niet");
  check(sql("select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'waarnemingen'") === "1", "de tabel bestaat");
  sql(`delete from public.waarnemingen; delete from public.klanten where bedrijf in (${KLANTEN.map((k) => lit(k[0])).join(", ")});`);
  maakCollega(FENNA);
  maakCollega(BRAM);
  sql(`insert into public.klanten (bedrijf, status, casemanager, medewerkers, bezoek_plaats) values ${KLANTEN.map((k) => `(${k.map(lit).join(", ")})`).join(", ")};`);
  const klantId = (bedrijf) => sql(`select id from public.klanten where bedrijf = ${lit(bedrijf)}`);
  const BOS = klantId("Bakkerij Bos"), SMITS = klantId("Garage Smits"), KNIP = klantId("Kapsalon Knip");
  check(!mag(() => sql("set role anon; select count(*) from public.waarnemingen")), "anon leest geen waarnemingen");
  check(sql("select has_function_privilege('anon', 'public.wn_klanten()', 'execute')") === "f" && sql("select has_function_privilege('authenticated', 'public.wn_collegas()', 'execute')") === "t", "anon kan de hulpfuncties niet aanroepen, een ingelogde collega wel");
  check(alsCollega(FENNA, "select count(*) from public.wn_klanten()") === "3", "een werknemer krijgt de drie echte klanten, niet de lead");
  check(alsCollega(FENNA, "select string_agg(email, ',' order by email) from public.wn_collegas()").includes("bram@react2u.test") && alsCollega(FENNA, "select naam from public.wn_collegas() where user_id = '" + BRAM.id + "'") === BRAM.naam, "en de collega's die kunnen waarnemen, met hun naam uit de medewerkers");
  check(!mag(() => alsCollega(FENNA, `insert into public.waarnemingen (afwezige, van, tot) values ('${BRAM.id}', current_date, current_date)`)), "een collega plant geen afwezigheid voor een ander");
  check(!mag(() => alsCollega(FENNA, `insert into public.waarnemingen (van, tot, waarnemer) values (current_date, current_date, '${FENNA.id}')`)), "en kan niet voor zichzelf waarnemen (check)");
  check(!mag(() => alsCollega(FENNA, "insert into public.waarnemingen (van, tot) values (current_date, current_date - 1)")), "de einddatum ligt niet vóór de begindatum (check)");
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

  stap("Fenna: het lege scherm in Mijn React2u");
  await inloggen(f, FENNA.email, FENNA.wachtwoord, geheimFenna);
  await f.goto(`${BASIS}/admin`);
  const menu = await f.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(menu.includes("/admin/waarneming") && (await f.locator("aside").first().innerText()).includes("Mijn React2u"), `Waarneming in het menu van Mijn React2u (${menu.join(", ")})`);
  let dash = await f.locator("#waarneming").innerText();
  check(dash.includes("Iedereen is er vandaag") && dash.includes("Ik ben er even niet"), `dashboard: de kaart, niemand is weg (${dash.split("\n")[1]})`);
  await f.goto(`${BASIS}/admin/waarneming`);
  await f.waitForSelector("h1:has-text('Waarneming')");
  check((await f.locator("#nu-leeg").count()) === 1 && (await f.locator("#komend-leeg").count()) === 1, "Nu en Komend zijn leeg");
  const rijFenna = await f.locator(`#per-collega [data-collega="${FENNA.naam}"]`).innerText();
  const rijBram = await f.locator(`#per-collega [data-collega="${BRAM.naam}"]`).innerText();
  check(rijFenna.includes("(jij)") && rijFenna.includes("2 klanten") && /\ber\b/.test(rijFenna), `per collega: Fenna met twee klanten op naam, ook via de voornaam (${rijFenna.replace(/\s+/g, " ")})`);
  check(rijBram.includes("1 klant") && rijBram.includes("Casemanager Verzuim"), `Bram met één klant en zijn functie (${rijBram.replace(/\s+/g, " ")})`);
  check((await f.locator("#nieuw-afwezige").count()) === 0, "een collega plant alleen voor zichzelf: geen keuze Voor wie");
  await f.screenshot({ path: path.join(SHOTS, "01-leeg-fenna.png"), fullPage: true });

  stap("Fenna: ik ben er even niet, Bram neemt waar");
  const VAN1 = vandaag, TOT1 = plusDagen(vandaag, 4);
  await f.click("#nieuw > button");
  await f.fill("#nieuw-van", VAN1);
  await f.fill("#nieuw-tot", TOT1);
  check((await f.locator("#nieuw-waarnemer option").allTextContents()).some((t) => t.includes(BRAM.naam)) && !(await f.locator("#nieuw-waarnemer option").allTextContents()).some((t) => t.includes(FENNA.naam)), "de keuzelijst van waarnemers heeft Bram, niet Fenna zelf");
  await f.selectOption("#nieuw-waarnemer", BRAM.id);
  const uitleg = await f.locator("#nieuw form").innerText();
  check(uitleg.includes("alle 2 klanten") && uitleg.includes("niets medisch") && uitleg.includes("Toeqan"), "het formulier zegt: alle klanten op jouw naam, niets medisch, verlof in Toeqan");
  await f.fill("#nieuw-toelichting", TOELICHTING);
  await f.screenshot({ path: path.join(SHOTS, "02-formulier-fenna.png"), fullPage: true });
  await f.click("#nieuw button.abtn:has-text('Plan de waarneming')");
  await f.waitForURL(/\/admin\/waarneming\/[0-9a-f-]{36}\?opgeslagen=waarneming$/, { timeout: 20000 });
  const w1 = sql(`select id from public.waarnemingen where afwezige = '${FENNA.id}'`);
  check(/^[0-9a-f-]{36}$/.test(w1) && f.url().includes(w1), "de waarneming staat in de database en de kaart opent");
  check(sql(`select waarnemer || '|' || afwezige_email || '|' || waarnemer_email || '|' || coalesce(array_length(klant_ids, 1), 0) || '|' || (door = afwezige) from public.waarnemingen where id = '${w1}'`) === `${BRAM.id}|${FENNA.email}|${BRAM.email}|0|true`, "met Bram als waarnemer, beide adressen via de trigger, alle klanten, door Fenna zelf");
  const titel = await f.locator("[data-waarneming-titel]").innerText();
  check(titel.includes("Jij bent er niet") && titel.includes(periode(VAN1, TOT1)), `de kaart: "${titel}"`);
  check((await f.locator("#klanten [data-klanten]").getAttribute("data-klanten")) === "2" && (await f.locator("#klanten").innerText()).includes("Garage Smits"), "twee klanten op naam, ook Garage Smits via de voornaam");
  check((await f.locator("#toelichting").innerText()).includes(TOELICHTING), "de toelichting staat erbij");
  check((await f.locator("#wijzigen").count()) === 1 && (await f.locator("#wijzig-afwezige").count()) === 0, "Fenna kan haar eigen waarneming aanpassen, zonder Voor wie");
  check(await totDat(() => mails().some((m) => m.to.includes(BRAM.email) && /^Je neemt waar voor Fenna de Vries: /.test(m.subject || ""))), "Bram krijgt een mail");
  const mailBram = mails().find((m) => m.to.includes(BRAM.email) && /^Je neemt waar voor Fenna de Vries: /.test(m.subject || ""));
  check(mailBram && mailBram.subject.includes(periode(VAN1, TOT1)) && mailBram.html.includes("Bakkerij Bos") && mailBram.html.includes("Garage Smits") && mailBram.html.includes("terugbelletje") && mailBram.html.includes(`/admin/waarneming/${w1}`) && mailBram.reply_to === FENNA.email && !/Rens/.test(mailBram.html), "met de periode, de twee klanten, de toelichting, de link en Fenna als antwoordadres; zonder naam");
  fs.writeFileSync(path.join(SHOTS, "mail-waarnemer.html"), mailBram?.html || "");
  await f.screenshot({ path: path.join(SHOTS, "03-kaart-fenna.png"), fullPage: true });

  stap("Bram: hij ziet dat hij waarneemt, maar past niets aan");
  await inloggen(b, BRAM.email, BRAM.wachtwoord, geheimBram);
  await b.goto(`${BASIS}/admin`);
  dash = await b.locator("#waarneming").innerText();
  check(dash.includes("Je neemt waar voor Fenna") && (await b.locator("#waarneming-ik").innerText()).includes("Fenna"), `dashboard van Bram: je neemt waar voor Fenna (${dash.split("\n")[1]})`);
  await b.goto(`${BASIS}/admin/waarneming/${w1}`);
  check((await b.locator("[data-waarneming-titel]").innerText()).includes("Fenna de Vries is er niet") && (await b.locator("#wijzigen").count()) === 0, "op de kaart van Fenna geen Aanpassen voor Bram");
  check(!mag(() => alsCollega(BRAM, `update public.waarnemingen set tot = tot + 1 where id = '${w1}' returning id`)) || alsCollega(BRAM, `update public.waarnemingen set tot = tot + 1 where id = '${w1}' returning id`) !== w1, "en ook rechtstreeks verandert hij hem niet");
  check(!mag(() => alsCollega(BRAM, `delete from public.waarnemingen where id = '${w1}' returning id`)) || sql(`select count(*) from public.waarnemingen where id = '${w1}'`) === "1", "en haalt hem niet weg");
  await b.goto(`${BASIS}/admin/waarneming`);
  const kaartje = await b.locator(`#waarneming-${w1}`).innerText();
  check((await b.locator(`#waarneming-${w1}`).getAttribute("data-fase")) === "actief" && kaartje.includes("jij neemt waar") && kaartje.includes("2 klanten"), `in het overzicht onder Nu, met "jij neemt waar" (${kaartje.replace(/\s+/g, " ").slice(0, 100)})`);

  stap("Het beheer: plannen voor Bram zonder waarnemer, dan de waarnemer erbij en de klanten beperken");
  await inloggen(r, BEHEERDER.email, BEHEERDER.wachtwoord, GEHEIM);
  await r.goto(`${BASIS}/admin/waarneming`);
  check((await r.locator("#nieuw-afwezige").count()) === 1 && (await r.locator("#waarneming-te-regelen").count()) === 0, "het beheer kiest voor wie, en er is nog niets te regelen");
  const VAN2 = plusDagen(vandaag, 10), TOT2 = plusDagen(vandaag, 12);
  await r.click("#nieuw > button");
  await r.selectOption("#nieuw-afwezige", BRAM.id);
  await r.fill("#nieuw-van", VAN2);
  await r.fill("#nieuw-tot", TOT2);
  await r.click("#nieuw button.abtn:has-text('Plan de waarneming')");
  await r.waitForURL(/\/admin\/waarneming\/[0-9a-f-]{36}\?opgeslagen=waarneming$/, { timeout: 20000 });
  const w2 = sql(`select id from public.waarnemingen where afwezige = '${BRAM.id}'`);
  check(sql(`select (waarnemer is null) || '|' || afwezige_email || '|' || (door <> afwezige) from public.waarnemingen where id = '${w2}'`) === `true|${BRAM.email}|true`, "gepland voor Bram, zonder waarnemer, door het beheer");
  check((await r.locator("[data-waarneming-titel]").innerText()).includes("Bram Bakker is er niet") && (await r.locator("h1 ~ p, [data-waarneming-titel] ~ p").first().innerText()).includes("zoekt nog een waarnemer"), "de kaart: Bram is er niet, het beheer zoekt nog een waarnemer");
  check(await totDat(() => mails().some((m) => m.to.includes(BRAM.email) && /^Je waarneming .* is geregeld$/.test(m.subject || ""))), "Bram krijgt een mail dat het beheer het vastlegde");
  const mailBram2 = mails().find((m) => m.to.includes(BRAM.email) && /^Je waarneming .* is geregeld$/.test(m.subject || ""));
  check(mailBram2 && mailBram2.html.includes("nog geen waarnemer") && !/Rens/.test(mailBram2.html), "met: er is nog geen waarnemer; zonder naam");
  await r.goto(`${BASIS}/admin`);
  check((await r.locator("#waarneming-te-regelen-kort").innerText()).includes("Bram"), "dashboard van het beheer: nog te regelen, Bram");
  await r.goto(`${BASIS}/admin/waarneming`);
  const signaal = await r.locator("#waarneming-te-regelen").innerText();
  check(signaal.includes("Eén afwezigheid zonder waarnemer") && signaal.includes("Bram"), `het signaal op het scherm (${signaal.split("\n")[0]})`);
  check((await r.locator(`#waarneming-${w2}`).getAttribute("data-fase")) === "komend", "Bram staat onder Komend");
  await r.screenshot({ path: path.join(SHOTS, "04-overzicht-beheer.png"), fullPage: true });
  const voorMail = mails().length;
  await r.goto(`${BASIS}/admin/waarneming/${w2}#wijzigen`);
  await r.selectOption("#wijzig-waarnemer", FENNA.id);
  await r.click("#wijzigen button.abtn:has-text('Bewaren')");
  await r.waitForURL(/opgeslagen=waarneming-bewaard/, { timeout: 20000 });
  check(sql(`select waarnemer || '|' || waarnemer_email from public.waarnemingen where id = '${w2}'`) === `${FENNA.id}|${FENNA.email}`, "Fenna is nu de waarnemer van Bram");
  check(await totDat(() => mails().some((m) => m.to.includes(FENNA.email) && /^Je neemt waar voor Bram Bakker: /.test(m.subject || ""))), "Fenna krijgt een mail");
  const mailFenna = mails().find((m) => m.to.includes(FENNA.email) && /^Je neemt waar voor Bram Bakker: /.test(m.subject || ""));
  check(mailFenna && mailFenna.html.includes("Het beheer heeft je als waarnemer gezet") && mailFenna.html.includes("Kapsalon Knip") && !mailFenna.reply_to, "van het beheer, met de klant van Bram, zonder antwoordadres");
  check(await totDat(() => mails().filter((m) => m.to.includes(BRAM.email) && /^Je waarneming .* is geregeld$/.test(m.subject || "")).length === 2), "en Bram hoort dat Fenna voor hem waarneemt");
  check(mails().filter((m) => m.to.includes(BRAM.email) && /is geregeld$/.test(m.subject || "")).pop().html.includes("Fenna de Vries voor je waarneemt"), "met haar naam erin");
  // De klanten van Fenna beperken tot Bakkerij Bos: dan staat Garage Smits weer gewoon op naam van Fenna.
  const voorBeperken = mails().length;
  await r.goto(`${BASIS}/admin/waarneming/${w1}#wijzigen`);
  check((await r.locator("#wijzig-afwezige").count()) === 1 && (await r.locator("#wijzig-klantkeuze input").count()) === 2, "het beheer ziet Voor wie en de twee klanten van Fenna om te kiezen");
  await r.click('#wijzigen input[name="klanten"][value="deze"]');
  await r.check(`#wijzig-klantkeuze input[value="${BOS}"]`);
  await r.click("#wijzigen button.abtn:has-text('Bewaren')");
  await r.waitForURL(/opgeslagen=waarneming-bewaard/, { timeout: 20000 });
  check(sql(`select array_length(klant_ids, 1) || '|' || (klant_ids[1] = '${BOS}') from public.waarnemingen where id = '${w1}'`) === "1|true", "alleen Bakkerij Bos gaat over naar Bram");
  check((await r.locator("#klanten [data-klanten]").getAttribute("data-klanten")) === "1" && (await r.locator("#klanten").innerText()).includes("Alleen deze klanten"), "de kaart toont één klant");
  await wacht(800);
  check(mails().length === voorBeperken, "klanten beperken stuurt geen mail: periode en waarnemer bleven gelijk");
  check(voorMail <= mails().length, "mails geteld");

  stap("De stamkaart, het klantenbord en het overleg: wie er nu voor een klant is");
  await r.goto(`${BASIS}/admin/klanten/${BOS}`);
  await r.waitForSelector("h1:has-text('Bakkerij Bos')");
  const pilBos = await r.locator('[data-waarneming-pil="nu"]').innerText();
  check(pilBos === `Bram neemt waar voor Fenna, t/m ${datumKort(TOT1)}`, `stamkaart Bakkerij Bos: "${pilBos}"`);
  check((await r.locator('[data-waarneming-pil="nu"]').getAttribute("href")) === `/admin/waarneming/${w1}`, "de pil linkt naar de waarneming");
  await r.screenshot({ path: path.join(SHOTS, "05-stamkaart-pil.png"), fullPage: false });
  await r.goto(`${BASIS}/admin/klanten/${SMITS}`);
  await r.waitForSelector("h1:has-text('Garage Smits')");
  check((await r.locator("[data-waarneming-pil]").count()) === 0, "Garage Smits valt buiten de beperking: geen pil");
  await r.goto(`${BASIS}/admin/klanten/${KNIP}`);
  await r.waitForSelector("h1:has-text('Kapsalon Knip')");
  const pilKnip = await r.locator('[data-waarneming-pil="straks"]').innerText();
  check(pilKnip === `Fenna neemt waar vanaf ${datumKort(VAN2)} (Bram is er dan niet)`, `Kapsalon Knip, Bram is er over tien dagen niet: "${pilKnip}"`);
  await r.goto(`${BASIS}/admin/klantenbord`);
  await r.waitForSelector(`#klant-${BOS}`);
  check((await r.locator(`#klant-${BOS} [data-waarneming-pil="nu"]`).count()) === 1 && (await r.locator(`#klant-${SMITS} [data-waarneming-pil]`).count()) === 0 && (await r.locator(`#klant-${KNIP} [data-waarneming-pil="straks"]`).count()) === 1, "klantenbord: de pil op de kaarten van Bakkerij Bos (nu) en Kapsalon Knip (straks), niet op Garage Smits");
  await r.goto(`${BASIS}/admin/overleg`);
  await r.waitForSelector("#waarneming-overleg");
  const blok = await r.locator("#waarneming-overleg").innerText();
  check(blok.includes("Wie er de komende weken niet is") && blok.includes(FENNA.naam) && blok.includes(BRAM.naam) && blok.includes("Bram neemt waar") && blok.includes("Fenna neemt waar") && blok.includes("1 klant"), `CM-overleg: het blok met beide (${blok.replace(/\s+/g, " ").slice(0, 160)})`);
  await r.locator("#waarneming-overleg").screenshot({ path: path.join(SHOTS, "06-overleg-blok.png") });

  stap("Beheer tegenover Mijn React2u");
  await r.goto(`${BASIS}/admin`);
  await r.click("#weergave-wisselen");
  await r.waitForSelector("#weergave-wisselen:has-text('Naar Beheer')", { timeout: 20000 });
  await r.goto(`${BASIS}/admin/waarneming`);
  check((await r.locator("#nieuw-afwezige").count()) === 0 && (await r.locator("#waarneming-te-regelen").count()) === 0 && (await r.locator("#per-collega").count()) === 1, "in Mijn React2u plant een beheerder alleen voor zichzelf, zonder signaal");
  await r.goto(`${BASIS}/admin`);
  check((await r.locator("#waarneming").count()) === 1 && (await r.locator("#waarneming-te-regelen-kort").count()) === 0, "en het dashboard toont de kaart als collega");
  await r.click("#weergave-wisselen");
  await r.waitForSelector("#weergave-wisselen:has-text('Naar Mijn React2u')", { timeout: 20000 });

  stap("Fenna past aan en haalt weg; Bram beheert zijn eigen afwezigheid");
  const TOT1B = plusDagen(vandaag, 5);
  await f.goto(`${BASIS}/admin/waarneming/${w1}#wijzigen`);
  await f.fill("#wijzig-tot", TOT1B);
  await f.click("#wijzigen button.abtn:has-text('Bewaren')");
  await f.waitForURL(/opgeslagen=waarneming-bewaard/, { timeout: 20000 });
  check(sql(`select tot::text from public.waarnemingen where id = '${w1}'`) === TOT1B, "Fenna rekt haar afwezigheid een dag");
  check(await totDat(() => mails().filter((m) => m.to.includes(BRAM.email) && /^Je neemt waar voor Fenna de Vries: /.test(m.subject || "")).length === 2), "Bram krijgt opnieuw een mail, want de periode veranderde");
  await b.goto(`${BASIS}/admin/waarneming/${w2}`);
  check((await b.locator("#wijzigen").count()) === 1 && (await b.locator("#wijzig-afwezige").count()) === 0 && (await b.locator("[data-waarneming-titel]").innerText()).includes("Jij bent er niet"), "Bram past zijn eigen afwezigheid aan, die het beheer plande");
  await f.goto(`${BASIS}/admin/waarneming/${w1}`);
  await f.click("#wijzigen form:has(button:has-text('Weghalen')) button");
  await f.waitForURL(/opgeslagen=waarneming-weg/, { timeout: 20000 });
  check(sql(`select count(*) from public.waarnemingen where id = '${w1}'`) === "0", "Fenna haalt haar waarneming weg");
  await r.goto(`${BASIS}/admin/klanten/${BOS}`);
  await r.waitForSelector("h1:has-text('Bakkerij Bos')");
  check((await r.locator("[data-waarneming-pil]").count()) === 0, "en de pil is van de stamkaart");

  for (const [page, url, naam] of [[f, "/admin/waarneming", "lijst-fenna"], [f, "/admin", "dashboard-fenna"], [b, `/admin/waarneming/${w2}`, "kaart-bram"], [r, "/admin/waarneming", "lijst-beheer"], [r, `/admin/waarneming/${w2}`, "kaart-beheer"]]) {
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
