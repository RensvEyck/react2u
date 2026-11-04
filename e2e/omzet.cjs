// Salesdashboard, omzet en uren (0035) van begin tot eind: medewerkers toevoegen, uren invullen in
// het rooster (bewaren bij verlaten, Enter een rij omlaag, "als vorige"), getekende offertes als
// abonnementen, een abonnement beëindigen, en de cijfers op /admin/omzet en /admin/verkoop.
// Draaien via e2e/run.mjs, na dashboard.cjs: hij maakt de verkooptabellen ook leeg.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { BASIS, UIT, BEHEERDER, totp, geheim, sql } = require("./hulp.cjs");

const SHOTS = path.join(UIT, "omzet");
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

// Dezelfde weekregels als lib/uren.ts, om de verwachting uit te rekenen.
const DAG = 86_400_000;
const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const maandag = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  return new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAG).toISOString().slice(0, 10);
};
const dezeWeek = maandag(vandaag);
const vorigeWeek = new Date(new Date(`${dezeWeek}T00:00:00Z`).getTime() - 7 * DAG).toISOString().slice(0, 10);
const inDezeMaand = (w) => new Date(new Date(`${w}T00:00:00Z`).getTime() + 3 * DAG).toISOString().slice(0, 7) === vandaag.slice(0, 7);
const weeknr = (m) => {
  const d = new Date(`${m}T00:00:00Z`);
  const don = new Date(d.getTime() + 3 * DAG);
  const v = new Date(Date.UTC(don.getUTCFullYear(), 0, 4));
  const start = new Date(v.getTime() - ((v.getUTCDay() + 6) % 7) * DAG);
  return 1 + Math.round((d.getTime() - start.getTime()) / (7 * DAG));
};

const RECOVER = `{"id":"a","sectie":"Aansluiting","label":"React2u Recover","kleur":"#E61674","naam":"Compleet","prijs":120,"eenheid":"medewerker_jaar","soort":"vast"}`;
const RESIST = `{"id":"b","sectie":"Preventie","label":"React2u Resist","kleur":"#00A098","naam":"RI&E-check","prijs":60,"eenheid":"medewerker_jaar","soort":"optie"}`;
const INTAKE = `{"id":"c","sectie":"Start","naam":"Intake","prijs":250,"eenheid":"eenmalig","soort":"vast"}`;

function vulDatabase() {
  sql(`set session_replication_role = replica;
truncate public.offertes, public.brochures, public.contracten, public.medewerkers, public.abonnementen_gestopt cascade;
insert into public.offertes (vorm, bedrijf, email, medewerkers, regels, keuze, status, created_at, verstuurd_at, bekeken_at, keuze_at, getekend_at, afzender_naam) values
 ('verzuimbegeleiding', 'Jansen Bouw B.V.', 'kees@jansenbouw.test', 25, '[${RECOVER},${RESIST},${INTAKE}]', '["a","b","c"]', 'getekend', now() - interval '2 months 10 days', now() - interval '2 months 10 days', now() - interval '2 months 9 days', now() - interval '2 months 5 days', now() - interval '2 months', 'Susanne Linders'),
 ('verzuimbegeleiding', 'Smit Installatie', 'anna@smit.test', 10, '[${RECOVER}]', '["a"]', 'getekend', now() - interval '6 days', now() - interval '6 days', now() - interval '5 days', now() - interval '1 hour', now() - interval '5 minutes', 'Cindy Faro'),
 ('verzuimbegeleiding', 'Bakker Logistiek', 'piet@bakker.test', 20, '[${RECOVER}]', '["a"]', 'getekend', now() - interval '6 months', now() - interval '6 months', now() - interval '6 months', now() - interval '6 months', now() - interval '5 months', 'Susanne Linders'),
 ('verzuimbegeleiding', 'Peters Metaal', 'piet@peters.test', 10, '[${RECOVER}]', null, 'verstuurd', now() - interval '3 days', now() - interval '3 days', now() - interval '2 hours', null, null, 'Cindy Faro');`);
}

(async () => {
  stap("Database");
  vulDatabase();
  check(sql("select 'omzet' = any(permissions) from public.roles where key = 'superadmin'") === "t", "super admin heeft het recht omzet");
  check(sql("select coalesce('omzet' = any(permissions), false) from public.roles where key = 'beheerder'") !== "t", "beheerder heeft het niet");
  let anonLeest = true;
  try { sql("set role anon; select count(*) from public.medewerkers"); } catch { anonLeest = false; }
  check(!anonLeest, "anon kan medewerkers niet lezen");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const paginafouten = [];
  page.on("pageerror", (e) => paginafouten.push(String(e)));
  page.on("dialog", (d) => d.accept().catch(() => {}));

  stap("Inloggen");
  await page.goto(`${BASIS}/admin/login`);
  await page.fill("#login-email", BEHEERDER.email);
  await page.fill("#login-wachtwoord", BEHEERDER.wachtwoord);
  await page.click("button.abtn");
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 30000 });
  await page.fill('input[autocomplete="one-time-code"]', totp(GEHEIM));
  await page.click("button.abtn:not([disabled])");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 30000 });

  stap("Menu");
  await page.goto(`${BASIS}/admin`);
  check(await page.locator('aside nav a[href="/admin/verkoop"]').count(), "Verkoop staat in het menu");
  check(await page.locator('aside nav a[href="/admin/omzet"]').count(), "Omzet staat in het menu");

  stap("Medewerkers toevoegen");
  await page.goto(`${BASIS}/admin/omzet/uren`);
  await page.waitForSelector("h1:has-text('Uren')");
  check((await page.locator("body").innerText()).includes("Nog geen actieve medewerkers"), "leeg rooster zegt wat er moet gebeuren");
  for (const [naam, functie, uren, norm, tarief] of [["Susanne Linders", "Casemanager", "36", "75", "95"], ["Cindy Faro", "Bedrijfsarts", "32", "80", "140,50"]]) {
    await page.fill("#mw-naam-nieuw", naam);
    await page.fill("#mw-functie-nieuw", functie);
    await page.fill("#mw-uren-nieuw", uren);
    await page.fill("#mw-norm-nieuw", norm);
    await page.fill("#mw-tarief-nieuw", tarief);
    await page.click("#nieuw button:has-text('Toevoegen')");
    await page.waitForURL(/opgeslagen=medewerker/, { timeout: 20000 });
  }
  check(sql("select string_agg(naam || ':' || contracturen || ':' || norm || ':' || uurtarief, ',' order by naam) from public.medewerkers") === "Cindy Faro:32.0:80:140.50,Susanne Linders:36.0:75:95.00", "twee medewerkers met uren, norm en tarief");
  const susanne = sql("select id from public.medewerkers where naam = 'Susanne Linders'");
  const cindy = sql("select id from public.medewerkers where naam = 'Cindy Faro'");

  stap("Uren invullen");
  await page.goto(`${BASIS}/admin/omzet/uren`);
  const veld = (naam, week, soort = "Declarabele uren") => page.getByLabel(soort === "afwezig" ? `Uren afwezig ${naam}, week ${weeknr(week)} (verlof, ziekte, feestdag)` : `Declarabele uren ${naam}, week ${weeknr(week)}`, { exact: true });
  await veld("Susanne Linders", vorigeWeek).fill("30");
  await page.keyboard.press("Enter");
  const focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  check(focus === `Declarabele uren Cindy Faro, week ${weeknr(vorigeWeek)}`, "Enter gaat een rij omlaag");
  check(await totDat(() => sql(`select declarabel from public.uren where medewerker_id = '${susanne}' and week = '${vorigeWeek}'`) === "30.00"), "bewaard bij verlaten (30 uur)");
  await veld("Cindy Faro", vorigeWeek).fill("24");
  await veld("Cindy Faro", vorigeWeek).press("Tab");
  check(await totDat(() => sql(`select declarabel from public.uren where medewerker_id = '${cindy}' and week = '${vorigeWeek}'`) === "24.00"), "Cindy 24 uur bewaard");

  await page.locator("th", { has: page.locator(`span:text-is("Week ${weeknr(dezeWeek)}")`) }).locator("button:has-text('als vorige')").click();
  check(await totDat(() => sql(`select count(*) from public.uren where week = '${dezeWeek}'`) === "2"), "als vorige vult deze week voor beiden");

  await veld("Susanne Linders", dezeWeek).fill("27");
  await veld("Susanne Linders", dezeWeek).press("Tab");
  await veld("Cindy Faro", dezeWeek).fill("20");
  await veld("Cindy Faro", dezeWeek, "afwezig").fill("8");
  await veld("Cindy Faro", dezeWeek, "afwezig").press("Tab");
  check(await totDat(() => sql(`select declarabel || '/' || afwezig from public.uren where medewerker_id = '${cindy}' and week = '${dezeWeek}'`) === "20.00/8.00"), "Cindy: 20 declarabel, 8 afwezig");
  check(await totDat(() => sql(`select declarabel from public.uren where medewerker_id = '${susanne}' and week = '${dezeWeek}'`) === "27.00"), "Susanne: 27 uur");
  const rooster = await page.locator("table").first().innerText();
  check(rooster.includes("75%"), "Susanne 27 van 36: 75%, op de norm");
  check(rooster.includes("83%"), "Cindy 20 van 24 (8 afwezig): 83%");

  await veld("Susanne Linders", dezeWeek).fill("abc");
  await veld("Susanne Linders", dezeWeek).press("Tab");
  await wacht(500);
  check(await page.locator('[title="Vul uren in als getal, bijvoorbeeld 7,5."]').count(), "onzin geeft een melding in het vakje");
  check(sql(`select declarabel from public.uren where medewerker_id = '${susanne}' and week = '${dezeWeek}'`) === "27.00", "en bewaart niets");
  await veld("Susanne Linders", dezeWeek).fill("27");
  await veld("Susanne Linders", dezeWeek).press("Tab");
  await page.screenshot({ path: path.join(SHOTS, "01-uren-1440.png"), fullPage: true });

  stap("Omzet");
  await page.goto(`${BASIS}/admin/omzet`);
  await page.waitForSelector("h1:has-text('Omzet')");
  const body = () => page.locator("body").innerText();
  let tekst = await body();
  check(/Abonnementen\s*€675\s*per maand/i.test(tekst), "abonnementen: Jansen 375 + Smit 100 + Bakker 200 = €675");
  check(tekst.includes("Jansen Bouw B.V.") && tekst.includes("Bakker Logistiek"), "klanten in de lijst");

  stap("Abonnement beëindigen");
  const bakker = page.locator("#klanten li", { hasText: "Bakker Logistiek" });
  await bakker.locator("summary").click();
  // Laatste maand met omzet: de vorige, zodat hij deze maand al niet meer telt.
  const opties = await bakker.locator("select[name=vanaf] option").evaluateAll((os) => os.map((o) => o.value));
  const dezeMaand = vandaag.slice(0, 7);
  check(opties.includes(dezeMaand), "deze maand is te kiezen als eerste maand zonder omzet");
  await bakker.locator("select[name=vanaf]").selectOption(dezeMaand);
  await bakker.locator("input[name=reden]").fill("Overgestapt");
  await bakker.locator("button:has-text('Beëindigen')").click();
  await page.waitForURL(/opgeslagen=gestopt/, { timeout: 20000 });
  check(sql("select vanaf || ' ' || reden from public.abonnementen_gestopt") === `${dezeMaand}-01 Overgestapt`, "gestopt vanaf deze maand, met reden");
  tekst = await body();
  check(/Abonnementen\s*€475\s*per maand/i.test(tekst), "nu €475 per maand");
  check(/-17% t\.o\.v\./.test(tekst), "17% minder dan vorige maand (575 → 475)");
  check(/Liep in[^\n]*\s*€575/.test(tekst) && /Nieuw getekend \(1\)\s*\+ €100/.test(tekst) && /Gestopt \(1\)\s*− €200/.test(tekst) && /Loopt nu\s*€475/.test(tekst), "brug: 575 + 100 − 200 = 475");
  check(/Recover\s*2 klanten · €350/.test(tekst) && /Resist\s*1 klant · €125/.test(tekst), "per label: Recover €350, Resist €125");
  check(/Bakker Logistiek\s*€200 per maand, tot en met/.test(tekst), "Bakker staat bij gestopt");
  const urenRij = (await page.locator("#uren tr", { hasText: "Susanne Linders" }).innerText()).replace(/\s+/g, " ");
  // Welke van de twee weken bij deze maand horen, hangt af van de dag (de donderdag telt).
  const urenDezeMaand = (inDezeMaand(dezeWeek) ? 27 : 0) + (inDezeMaand(vorigeWeek) ? 30 : 0);
  const verwacht = `€${(urenDezeMaand * 95).toLocaleString("nl-NL")}`;
  check(urenDezeMaand === 0 ? urenRij.includes("niet ingevuld") : urenRij.includes(verwacht), `uren deze maand: ${urenDezeMaand} × €95 = ${verwacht} (${urenRij})`);
  check((await page.locator("text=Toon als tabel").count()) > 0, "grafiek heeft een tabel");
  await page.screenshot({ path: path.join(SHOTS, "02-omzet-1440.png"), fullPage: true });

  stap("Hervatten");
  await page.locator("#gestopt li", { hasText: "Bakker Logistiek" }).locator("button:has-text('Hervatten')").click();
  await page.waitForURL(/opgeslagen=hervat/, { timeout: 20000 });
  check(sql("select count(*) from public.abonnementen_gestopt") === "0", "hervat: weer zonder einde");
  check(/Abonnementen\s*€675/i.test(await body()), "weer €675 per maand");

  stap("Salesdashboard");
  await page.goto(`${BASIS}/admin/verkoop`);
  await page.waitForSelector("h1:has-text('Verkoop')");
  tekst = await body();
  check(/Getekend, 90 dagen\s*€475\s*per maand\s*2 offertes · €250 eenmalig/i.test(tekst), "90 dagen: Jansen en Smit, €475 per maand en €250 eenmalig");
  check(tekst.includes("Open pijplijn") && /Bekeken\s*1 · €100/.test(tekst), "pijplijn: Peters bekeken, €100");
  check(/Per verkoper/.test(tekst) && tekst.includes("Cindy Faro"), "per verkoper");
  check(tekst.includes("Opvolgen") && tekst.includes("Peters Metaal"), "Peters staat bij opvolgen");
  await page.click("nav[aria-label=Periode] a:has-text('12 maanden')");
  await page.waitForURL(/periode=365/);
  check(/Getekend, 12 maanden\s*€675\s*per maand\s*3 offertes/i.test(await body()), "12 maanden: €675 per maand, 3 offertes");
  await page.click("nav[aria-label=Periode] a:has-text('30 dagen')");
  await page.waitForURL(/periode=30/);
  check(/Getekend, 30 dagen\s*€100\s*per maand\s*1 offerte\b/i.test(await body()), "30 dagen: alleen Smit, €100 per maand");
  await page.screenshot({ path: path.join(SHOTS, "03-verkoop-1440.png"), fullPage: true });

  for (const [url, naam] of [["/admin/verkoop", "verkoop"], ["/admin/omzet", "omzet"], ["/admin/omzet/uren", "uren"]]) {
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
