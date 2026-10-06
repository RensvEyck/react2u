#!/usr/bin/env node
// Maakt de aanvullingen van 6 oktober 2026 op de privacy- en cookieverklaring
// (public/documenten/*.pdf) en plakt ze achter de oorspronkelijke PDF's.
//
// De oorspronkelijke documenten zijn buiten de repo opgesteld; er is geen
// bronbestand. Daarom staat de wijziging als gedateerde aanvulling achteraan,
// in dezelfde huisstijl (indigo band, logo-rondje, oranje streep). Wijzigt er
// weer iets — bijvoorbeeld bedrijfsherkenning op gerechtvaardigd belang in
// plaats van toestemming — pas dan de tekst hieronder aan en draai:
//
//   node scripts/juridische-aanvulling.mjs
//
// Vereist: playwright (devDependency) en pdfunite (poppler, `brew install poppler`).
// Het script leest de originelen uit git (HEAD van vóór deze aanvulling, zie
// ORIGINEEL), zodat herhaald draaien niet steeds een extra aanvulling toevoegt.
// Pas daarna de paginatellingen in src/content/juridische-documenten.json aan.
import { chromium } from "playwright";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = new URL("..", import.meta.url).pathname;
const DOCS = join(ROOT, "public", "documenten");
// De commit met de oorspronkelijke PDF's (versie oktober 2026, zonder aanvulling).
const ORIGINEEL = "af0efc3";
const LOGO = "https://tumwtappyegkjabtmold.supabase.co/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg";
const font = (f) => `data:font/woff2;base64,${readFileSync(join(ROOT, "public", "fonts", f)).toString("base64")}`;

const css = `
@font-face { font-family: "DM Sans"; src: url(${font("dm-sans-latin.woff2")}) format("woff2"); font-weight: 400 700; }
@font-face { font-family: "Figtree"; src: url(${font("figtree-latin.woff2")}) format("woff2"); font-weight: 600 800; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "DM Sans", system-ui, sans-serif; color: #1c1a4e; font-size: 10.6pt; line-height: 1.4; }
h2, h3 { break-after: avoid; }
table, .kader { break-inside: avoid; }
tr { break-inside: avoid; }
h1 { font-family: "Figtree", system-ui, sans-serif; font-weight: 700; font-size: 20pt; color: #312e82; margin: 0 0 2mm; letter-spacing: -0.01em; }
.versie { font-style: italic; margin: 0 0 7mm; font-size: 10.5pt; }
h2 { font-family: "Figtree", system-ui, sans-serif; font-weight: 700; font-size: 12.5pt; color: #312e82; margin: 5.5mm 0 1.5mm; }
p { margin: 0 0 3mm; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 10pt; }
th { background: #312e82; color: #fff; text-align: left; padding: 2mm 2.5mm; font-weight: 700; }
td { border: 1px solid #c9c6dc; padding: 2mm 2.5mm; vertical-align: top; }
.kader { background: #f6f2ec; border-radius: 3mm; padding: 4mm 5mm; margin: 2mm 0 4mm; }
`;

const kop = (titel) => `<h1>${titel}</h1><p class="versie">Aanvulling van 6 oktober 2026 op de versie van oktober 2026</p>`;

const privacy = `${kop("Aanvulling privacyverklaring React2u")}
<p>Deze aanvulling hoort bij de privacyverklaring van oktober 2026 en beschrijft wat er op onze website is veranderd. Zij vult de hoofdstukken 4 (welke gegevens), 5 (grondslag), 7 (verstrekking) en 10 (bewaartermijnen) aan. Bij strijdigheid gaat deze aanvulling voor. De volledige privacyverklaring staat hierboven.</p>

<h2>A. Bezoekstatistiek zonder cookies</h2>
<p>Wij tellen de bezoeken aan onze website zonder cookies. Van elk bezoek leggen wij de bezochte pagina, het land en de verwijzende website vast, samen met een code die met een geheime sleutel is afgeleid van uw IP-adres, uw browser en de datum. Die code verandert elke nacht: herhaald bezoek binnen één dag is herkenbaar, maar niemand is over meerdere dagen te volgen. Uw IP-adres zelf bewaren wij niet. Grondslag: ons gerechtvaardigd belang om te weten hoe onze website wordt gebruikt. Bewaartermijn: twaalf maanden.</p>

<h2>B. Herkenning van organisaties</h2>
<p>Alleen als u daarvoor toestemming geeft, via de keuze <b>Statistiek</b> in de cookiebanner, leiden wij uit uw IP-adres af of uw bezoek afkomstig is van het netwerk van een organisatie en, zo ja, van welke. Dat gebeurt op twee manieren:</p>
<p>&bull; aan de hand van de geregistreerde eigenaar van het netwerk, via de dienst ipinfo.io van IPinfo (Verenigde Staten). Wij sturen daarvoor alleen uw IP-adres door en bewaren het zelf niet. Voor deze doorgifte buiten de Europese Economische Ruimte gelden de waarborgen uit hoofdstuk 7;<br>
&bull; aan de hand van de naam die een organisatie zelf aan haar internetverbinding heeft gegeven (reverse DNS), zonder tussenkomst van een derde.</p>
<p>Wij leggen uitsluitend de naam van de organisatie vast, nooit de naam van een persoon. Bij een eenmanszaak kan de naam van de organisatie een persoonsnaam zijn. Wilt u niet dat wij uw organisatie herkennen, laat het ons dan weten via info@react2u.nl: wij verwijderen de naam dan en leggen hem niet meer vast. Grondslag: uw toestemming, die u altijd kunt intrekken via <i>Cookie-instellingen</i> onderaan iedere pagina. Zonder toestemming wordt uw bezoek wel geteld (onderdeel A), maar zonder organisatie, en gaat uw IP-adres niet naar een derde partij. Bewaartermijn: twaalf maanden.</p>

<h2>C. Terugbelverzoek</h2>
<p>Op de pagina's voor werkgevers kunt u op uw telefoon vragen of wij u terugbellen. Wij verwerken dan uw naam, uw telefoonnummer, de naam van uw organisatie als u die invult, en het moment waarop u gebeld wilt worden. Dit valt onder <i>Contactformulier en offerteaanvraag</i> in de hoofdstukken 5 en 10: de grondslag is ons gerechtvaardigd belang om op uw verzoek te reageren, en wij bewaren de gegevens zolang nodig om uw verzoek af te handelen en daarna maximaal één jaar.</p>

<h2>D. Bescherming van de formulieren tegen misbruik</h2>
<p>Om te voorkomen dat onze formulieren geautomatiseerd worden misbruikt, tellen wij hoe vaak vanaf één internetadres een formulier wordt verstuurd. Daarvoor bewaren wij een met een geheime sleutel versleutelde afleiding van uw IP-adres, maximaal twee dagen. Uw IP-adres zelf bewaren wij niet. Grondslag: ons gerechtvaardigd belang bij een veilige en werkende website. Daarnaast controleren wij of een ingevuld e-mailadres de vorm van een e-mailadres heeft.</p>

<h2>E. Sollicitaties: langer bewaren met uw toestemming</h2>
<p>In het sollicitatieformulier kunt u aangeven dat wij uw gegevens en cv één jaar mogen bewaren, bijvoorbeeld voor toekomstige vacatures. Geeft u die toestemming niet, dan verwijderen wij uw gegevens en cv automatisch uiterlijk vier weken na afloop van de sollicitatieprocedure. Het verwijderen gebeurt dagelijks en automatisch, cv inbegrepen. Uw toestemming kunt u altijd intrekken via info@react2u.nl; wij verwijderen uw gegevens dan alsnog.</p>

<h2>F. Meten van aanvragen</h2>
<p>Wij houden bij hoeveel formulieren er via welke pagina van onze website worden verstuurd, bijvoorbeeld &ldquo;drie offerteaanvragen via de tarievenpagina&rdquo;. Daarbij leggen wij alleen het soort formulier en de pagina vast, geen gegevens over u. Bewaartermijn: twaalf maanden.</p>

<h2>G. Samenvatting van de nieuwe verwerkingen</h2>
<table>
<tr><th>Verwerking</th><th>Grondslag</th><th>Bewaartermijn</th></tr>
<tr><td>Bezoekstatistiek zonder cookies (A)</td><td>Gerechtvaardigd belang</td><td>Twaalf maanden</td></tr>
<tr><td>Herkenning van organisaties (B)</td><td>Uw toestemming (keuze Statistiek)</td><td>Twaalf maanden</td></tr>
<tr><td>Terugbelverzoek (C)</td><td>Gerechtvaardigd belang: reageren op uw verzoek</td><td>Zolang nodig, daarna maximaal één jaar</td></tr>
<tr><td>Bescherming van de formulieren (D)</td><td>Gerechtvaardigd belang: beveiliging</td><td>Maximaal twee dagen</td></tr>
<tr><td>Sollicitatie met toestemming om langer te bewaren (E)</td><td>Uw toestemming</td><td>Maximaal één jaar</td></tr>
<tr><td>Meten van aanvragen (F)</td><td>Gerechtvaardigd belang; geen persoonsgegevens</td><td>Twaalf maanden</td></tr>
</table>
<div class="kader"><p style="margin:0">Verwerkt u een verzoek over deze aanvulling, dan gelden dezelfde rechten en dezelfde route als in hoofdstuk 11 van de privacyverklaring: info@react2u.nl, ter attentie van de functionaris gegevensbescherming.</p></div>`;

const cookies = `${kop("Aanvulling cookieverklaring React2u")}
<p>Deze aanvulling hoort bij de cookieverklaring van oktober 2026 en beschrijft wat er in de cookiebanner is veranderd. Bij strijdigheid gaat deze aanvulling voor.</p>

<h2>1. De keuze &ldquo;Statistiek&rdquo; in de cookiebanner</h2>
<p>De cookiebanner heeft sinds 6 oktober 2026 één keuze: <b>Statistiek</b>. Deze keuze gaat niet over een cookie. Met Statistiek geeft u toestemming om uw bezoek, als het afkomstig is van het netwerk van een organisatie, aan die organisatie te koppelen. Daarvoor sturen wij uw IP-adres naar de dienst ipinfo.io; hoe dat precies werkt leest u in onderdeel B van de aanvulling op onze privacyverklaring. Zonder uw toestemming gebeurt dit niet: uw bezoek wordt dan wel geteld, maar zonder organisatie, en uw IP-adres gaat niet naar een derde partij. Weigeren is net zo eenvoudig als accepteren. U kunt uw keuze altijd wijzigen via <i>Cookie-instellingen</i> onderaan iedere pagina.</p>

<h2>2. Bezoekstatistiek zonder cookies</h2>
<p>Wij tellen bezoeken met een code die met een geheime sleutel is afgeleid van uw IP-adres, uw browser en de datum. Die code wordt niet in uw browser opgeslagen en verandert elke nacht. Hiervoor plaatsen wij geen cookie en bewaren wij niets in uw browser. De tabel met cookies in hoofdstuk 2 van de cookieverklaring blijft daarom ongewijzigd; de regel dat wij geen analytische cookies of statistiekcookies gebruiken, blijft juist.</p>

<h2>3. De cookie r2u_cookie_consent</h2>
<p>Deze cookie onthoudt voortaan ook uw keuze voor Statistiek (aan of uit), zodat wij u die vraag niet bij ieder bezoek opnieuw stellen. De bewaartermijn blijft twaalf maanden. Wijzigen wij later waarvoor wij toestemming vragen, dan stellen wij de vraag opnieuw.</p>

<h2>4. Formulieren</h2>
<p>Hoofdstuk 5 van de cookieverklaring blijft gelden: voor de formulieren gebruiken wij geen cookies. Nieuw is dat wij, om misbruik tegen te gaan, kort bijhouden hoe vaak vanaf één internetadres een formulier wordt verstuurd. Dat gebeurt op onze server en niet in uw browser; meer daarover in onderdeel D van de aanvulling op de privacyverklaring.</p>`;

// Kop en voet van elke pagina als template van Chromium: daar werken alleen
// inline stijlen en data-URI's. De bovenmarge (48mm) houdt de tekst onder het
// logo-rondje, dat tot 41mm reikt.
const logoUri = `data:image/svg+xml;base64,${Buffer.from(await (await fetch(LOGO)).text()).toString("base64")}`;
const headerTemplate = `<div style="-webkit-print-color-adjust:exact;width:100%;height:40mm;position:relative;margin:0;font-size:0">
  <div style="position:absolute;left:0;top:0;width:100%;height:24mm;background:#312e82;border-bottom-right-radius:40mm"></div>
  <div style="position:absolute;left:12mm;top:3mm;width:38mm;height:38mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${logoUri}" style="width:26mm"></div>
</div>`;
const footerTemplate = `<div style="-webkit-print-color-adjust:exact;width:100%;height:26mm;position:relative;margin:0;font-family:system-ui,sans-serif">
  <div style="position:absolute;left:0;top:0;height:3mm;width:65%;background:#f19000;border-top-right-radius:3mm;border-bottom-right-radius:3mm"></div>
  <div style="position:absolute;left:12mm;right:12mm;top:7mm;display:flex;justify-content:space-between;font-size:8pt;color:#6d6a92">
    <span>www.react2u.nl | info@react2u.nl</span><span>React2u | KVK 95076824 | BTW NL866991906B01</span><span>Stratumsedijk 29 | 5611 NB Eindhoven</span>
  </div>
</div>`;

const tmp = mkdtempSync(join(tmpdir(), "aanvulling-"));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [bestand, body] of [["privacyverklaring", privacy], ["cookieverklaring", cookies]]) {
  await page.setContent(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  const aanvulling = join(tmp, `${bestand}-aanvulling.pdf`);
  await page.pdf({
    path: aanvulling, format: "A4", printBackground: true,
    displayHeaderFooter: true, headerTemplate, footerTemplate,
    margin: { top: "48mm", bottom: "30mm", left: "25mm", right: "25mm" },
  });
  const origineel = join(tmp, `${bestand}-origineel.pdf`);
  writeFileSync(origineel, execFileSync("git", ["show", `${ORIGINEEL}:public/documenten/${bestand}-react2u.pdf`], { cwd: ROOT, maxBuffer: 50_000_000 }));
  const uit = join(DOCS, `${bestand}-react2u.pdf`);
  execFileSync("pdfunite", [origineel, aanvulling, uit]);
  console.log(`${bestand}: aanvulling achter het origineel gezet → ${uit}`);
}
await browser.close();
