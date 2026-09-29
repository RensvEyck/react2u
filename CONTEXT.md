# CONTEXT — React2u

De publieke website van React2u (verzuimbegeleiding, Eindhoven) met een eigen
beheeromgeving. Next.js 16 (App Router) + Supabase + Tailwind v4, gehost op Vercel.

Vervangt een WordPress-site. Sinds 29 september 2026 wijst `react2u.nl` naar
Vercel; zie [`docs/dns-omzetting.md`](docs/dns-omzetting.md) voor hoe dat ging
en hoe je terugrolt.

## Woordenlijst

Gebruik deze termen; de code doet dat ook.

| Term | Betekenis |
|---|---|
| **Pagina** (`pages`) | Een publieke URL, geïdentificeerd door `slug`. Alleen zichtbaar bij `published = true`. |
| **Blok** (`blocks`) | Eén sectie binnen een pagina. Heeft een `type` (welk component) en `data` (jsonb, vorm hangt af van het type). Volgorde via `sort`. |
| **Bloktype** | De sleutel die een blok aan een React-component koppelt, bv. `hero`, `ctaBanner`. Zie *Valkuilen*. |
| **Vacature** (`vacancies`) | Statussen: `draft`, `published`, `closed`. Alleen `published` is publiek. |
| **Artikel** (`posts`) | Blogartikel op `/blog/<slug>`. Markdown-body, statussen `draft` en `published`. `published_at` wordt bij de eerste publicatie gezet en blijft daarna staan, zodat een latere correctie de datum niet verzet. |
| **Sollicitatie** (`applications`) | Inzending op een vacature of open sollicitatie. Cv gaat naar de private `cvs`-bucket. |
| **Bericht** (`contact_messages`) | Inzending van het contactformulier. Bevat sinds `0005` een telefoonnummer: het formulier vraagt er verplicht om, zodat een bericht een belbare lead oplevert. Berichten van vóór die migratie hebben er geen — de kolom is nullable. |
| **Postvak IN** | Eén overzicht dat berichten en sollicitaties samenvoegt op volgorde van binnenkomst (`/admin/postvak-in`). Geen eigen tabel — een view over de twee bestaande. De losse pagina's Berichten en Sollicitaties blijven bestaan. |
| **Onbehandeld** | Wat in het Postvak IN als ongelezen telt. Per soort verschillend: een bericht heeft `read = false`, een sollicitatie heeft `status = 'nieuw'`. |
| **Instelling** (`site_settings`) | Key/value (jsonb). In gebruik: `contact`, `documents`, `certificates`, `seo` en `maintenance`. |
| **Onderhoudsmodus** (`maintenance`) | Instelling `{enabled, message}`. Aan: bezoekers krijgen op elke publieke URL een onderhoudspagina (503), ingelogde beheerders zien de site gewoon. Schakelaar op `/admin/instellingen`. Zie *Onderhoudsmodus*. |
| **Footerdocument** (`documents`) | Link onderaan elke pagina, vrije lijst van `{label, href}`. |
| **Certificaat** (`certificates`) | Keurmerklogo in de footer, vrije lijst van `{image, alt, href}`. `href` mag leeg — dan toont het logo zich zonder doorklik. |
| **Lead** (`leads`) | Iemand die gebeld moet worden, met belstatus, notities en een terugbeldatum. Staat op `/admin/bellijst`. Handmatig toe te voegen of vanuit het Postvak IN — zie *Van Postvak IN naar bellijst*. Interne data, zie de RLS-uitzondering hieronder. |
| **Te bellen** | Wat vandaag op de bellijst staat: status `te_bellen`, of `terugbellen` waarvan de datum is bereikt of ontbreekt. Bepaald door `needsCall()` in [`src/lib/leads.ts`](src/lib/leads.ts). |
| **Bezoek** (`page_views`) | Eén paginaweergave. Bevat géén IP-adres: alleen de afgeleide organisatie en een bezoekershash die dagelijks roteert. Zie `/admin/bezoek`. |
| **Bedrijfsbezoek** | Een bezoek waarvan het IP naar een bedrijfsnetwerk herleidt (`is_company`). Providers en datacenters vallen af — zie `isCompanyOrg()` in [`src/lib/analytics.ts`](src/lib/analytics.ts). |
| **Beheerder** (`admins`) | Rij die een Supabase-auth-gebruiker toegang tot `/admin` geeft. Een auth-account zonder rij hier heeft géén toegang. Elke rij heeft precies één rol. |
| **Rol** (`roles`) | Een naam met een lijst rechten. Bewerkbaar op `/admin/gebruikers`, gesorteerd op `sort`. |
| **Super admin** | De toprol (`superadmin`, `sort` 0). Systeemrol: houdt altijd alle tien rechten en is niet te verwijderen. Als enige met het recht `gebruikers` — uitnodigen en rollen verdelen is hieraan voorbehouden. |
| **Beheerder** | Alles behálve `gebruikers` (negen rechten). Kan de hele site en alle inzendingen beheren, maar niemand uitnodigen of van rol wisselen. |
| **Recht** | Toegang tot één onderdeel van het paneel, bv. `bellijst` of `paginas`. De sleutels staan in [`src/lib/permissions.ts`](src/lib/permissions.ts) én in de RLS-policies — hernoemen vraagt dus een migratie. |

## Architectuur

**Twee Supabase-clients, bewust gescheiden** — beide met de anon-sleutel; RLS doet
het autorisatiewerk. Er is nergens een service-role-sleutel, en die hoort er ook
niet te komen.

- [`src/lib/supabase/public.ts`](src/lib/supabase/public.ts) — anoniem, voor publieke reads en formulierinzendingen.
- [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts) — cookie-gebaseerd, voor het ingelogde adminpaneel.
- [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts) — browserclient, voor client components in de admin.

**Bezoekregistratie bewaart geen IP-adressen.** [`src/lib/analytics.ts`](src/lib/analytics.ts)
maakt van IP + user-agent + datum + zout een hash van 32 tekens. Omdat de datum
erin zit roteert die elke nacht: binnen één dag herken je herhaalbezoek, over
dagen heen valt niemand te volgen. Voer hier geen IP-kolom in — dat verandert
de aard van de gegevens en daarmee wat je privacyreglement moet vermelden.
Bedrijfsherkenning vraagt `IPINFO_TOKEN`; zonder die sleutel wordt het bezoek
gewoon zonder bedrijfsnaam vastgelegd.

**`leads` en `page_views` hebben geen publieke leesrechten.** `pages`, `posts` en
`vacancies` hebben een `public read`-policy omdat ze op de site horen. Leads en
bezoekgegevens niet: dat zijn namen, telefoonnummers, gespreksnotities en wie
wanneer op de site was. Er is bewust géén select-policy voor `anon`, dus de
publieke sleutel — die in elke browser meekomt — komt er niet bij. Voeg daar
dus nooit "voor de consistentie" een public read-policy aan toe. Te
controleren met de anon-sleutel: een `select` op `leads` of `page_views` hoort
`[]` te geven terwijl er rijen staan. (`page_views` mag anon wél *inserten* —
de tracker-route schrijft met die sleutel, net als het contactformulier.)

**Autorisatie ligt in de database, niet in het menu.** Elke policy hangt aan
`has_perm('<recht>')` (migratie `0005_roles.sql`). Het menu verbergt onderdelen
waar je geen recht op hebt, en `requirePerm()` stuurt je weg als je de URL
intikt — maar beide zijn comfort. Wie de anon-sleutel uit zijn browser haalt
praat rechtstreeks met de API, en dáár is `has_perm()` de grens. Voeg een nieuw
scherm dus nooit toe zonder bijbehorende policy.

Te controleren zonder de app: zet in SQL `request.jwt.claims` op de gebruiker
die je wilt simuleren en tel de rijen. Een redacteur hoort 0 leads te zien.

**De laatste beheerder is beschermd door de database.** Een trigger weigert elke
wijziging waarna niemand meer het recht `gebruikers` heeft — of dat nu komt door
een verwijderde gebruiker, een gewijzigde rol of een uitgeklede rechtenlijst.
Zonder dat slot is één verkeerde klik genoeg om iedereen buiten te sluiten, en
is alleen een ingreep in de database nog een uitweg.

**Er is nu wél een service-role-sleutel**, maar alleen voor één ding: een
auth-account aanmaken voor iemand anders bij het uitnodigen. Zie
[`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts) — die importeert
`server-only`, zodat de build faalt als het bestand ooit in een client component
belandt. Gebruik hem nooit voor gewone tabellen: die sleutel omzeilt alle RLS,
en daarmee elke rolcontrole in dit project. Ontbreekt `SUPABASE_SERVICE_ROLE_KEY`,
dan werkt alles behalve uitnodigen.

**Toegang tot `/admin`** loopt via [`requireAdmin()`](src/lib/admin.ts): ingelogd
zijn is niet genoeg, er moet ook een rij in `admins` staan. Schermen achter een
recht gebruiken `requirePerm('<recht>')`.
[`src/middleware.ts`](src/middleware.ts) ververst op `/admin` alleen de sessie
— het is géén autorisatiepoort. De echte controle staat in de pagina's zelf. Op
de publieke routes is de middleware de poort van de onderhoudsmodus.

**Rendering.** Publieke pagina's zijn statisch met revalidatie (5 min; sitemap 1 uur).
Alles onder `/admin` is dynamisch.

**Opslag.** Bucket `media` is publiek leesbaar, schrijven alleen door beheerders.
Bucket `cvs` is privé: iedereen mag uploaden, alleen beheerders lezen.

## Valkuilen

**Een nieuw bloktype moet je op twee plekken registreren.** Vergeet je er één, dan
faalt het stil — geen foutmelding, alleen een blok dat niet verschijnt of niet
toe te voegen is.

1. [`src/components/blocks/BlockRenderer.tsx`](src/components/blocks/BlockRenderer.tsx) → `REGISTRY` (koppelt type aan component)
2. [`src/lib/blockTemplates.ts`](src/lib/blockTemplates.ts) → `BLOCK_TEMPLATES` (label + standaarddata voor "Blok toevoegen")

Rendert het blok een kop op paginaniveau, zet het type dan ook in
`HEADING_BLOCKS` in `BlockRenderer` — anders kan het nooit de `<h1>` worden.

**Het menu volgt de database niet.** `MAIN_NAV` in [`src/lib/nav.ts`](src/lib/nav.ts)
is een hardgecodeerde lijst. Een nieuwe pagina in het adminpaneel verschijnt dus
wél op zijn URL, maar niet in de navigatie tot je `nav.ts` bijwerkt. Hetzelfde
geldt voor `PIJLERS` (de zes diensten in drie stappen): daaruit lezen het
menu onder *Diensten*, de footer én het blok `pillars`. Een dienst
erbij of een andere groepering is dus één wijziging in `nav.ts`, niet drie.

**Losse CSS-klassen winnen van Tailwind-utilities.** Tailwind v4 zet utilities
in `@layer utilities`, en CSS buiten een laag wint altijd van CSS in een laag —
ongeacht specificiteit. Stond `.btn { display: inline-block }` los in
`globals.css`, dan deed `btn hidden sm:inline-flex` niets, en `container-site
max-w-[820px]` bleef 1200px breed. Daarom staan de componentklassen (`.btn*`,
`.eyebrow`, `.container-site`, `.link-arrow`, `.lift`) in `@layer components`.
Zet een nieuwe klasse die met utilities gecombineerd wordt daar ook in.

**Ankers op dienstpagina's hangen aan de titel.** Elk onderdeel van een
`subSections`-blok krijgt een `id` uit zijn titel (`anchorId()` in
`BlockRenderer`, accenten eraf: "Eén-op-één coaching op maat" →
`een-op-een-coaching-op-maat`), zodat je er vanuit bv. een blogartikel
rechtstreeks naartoe kunt linken. Hernoem je zo'n titel, dan landt zo'n link
nog wel op de pagina maar niet meer op het onderdeel.

**Kleur hoort bij de pijler, en gaat op naam.** Preventie is blauw, Verzuim
rood, Ontwikkeling teal — drie kleuren uit het logo. Eerder had elke dienst
een eigen kleur; dat werd een regenboog waarin kleur niets meer zei over wat
bij elkaar hoort. De kleuren staan in [`src/lib/brand.ts`](src/lib/brand.ts)
(`KLEUREN`). In blokdata en `nav.ts` staat de naam, `kleurVars()` maakt er
CSS-variabelen van (`--k`, `--k-vlak`, `--k-zacht`, `--k-donker`). Een
onbekende naam valt terug op indigo. Roze is geen pijlerkleur maar de
actiekleur van knoppen — houd die twee gescheiden.

**Tekst uit het CMS wordt bij het tonen netjes gemaakt, niet in de database.**
Knoppen en keurmerken die in hoofdletters zijn ingevoerd ("NEEM CONTACT OP")
verschijnen als gewone zin, afkortingen als WVP blijven staan
(`zinsletters()` in `src/lib/tekst.ts`). Korte woorden met een koppelteken
("re-integratie") breken niet meer af aan het eind van een regel.

**`site_settings.documents` bestaat in twee vormen.** Oorspronkelijk een vast
object met drie sleutels (`algemene_voorwaarden`, `klachtenprocedure`,
`privacy_reglement`), inmiddels een vrije lijst `{label, href}[]`. Rijen die
sinds de omzetting niet opnieuw zijn opgeslagen bevatten nog de oude vorm. Lees
deze instelling daarom altijd via `normalizeDocs()` in `nav.ts` — die accepteert
beide en valt terug op de standaardlinks. Hetzelfde geldt voor
`normalizeCertificates()`, al bestaat daar nog geen oude vorm van.

**`.gitignore` geldt niet voor Vercel-uploads.** Een `vercel --prod` vanaf je
laptop stuurt alles mee wat niet in `.vercelignore` staat — inclusief `.env`.
Daardoor slaagden CLI-deploys lang terwijl de configuratie in het Vercel-project
leeg was; de eerste git-gebaseerde deploy viel meteen om op
`Error: supabaseUrl is required`. Beide `NEXT_PUBLIC_SUPABASE_*`-variabelen staan
nu in de projectinstellingen (production/preview/development) en `.env` is uit de
upload gehaald. **Zet nieuwe variabelen in Vercel, niet alleen in `.env`.**

**Deployen gaat via git.** Het Vercel-project is aan `RensvEyck/react2u` gekoppeld;
elke push naar `master` deployt naar productie. Handmatig `vercel --prod` is niet
meer nodig en levert een deploy op die niet aan een commit vastzit.

**`next build` heeft de Supabase-variabelen nodig**, want de statische generatie
haalt pagina-inhoud op tijdens de build. Zonder `.env` faalt de build lokaal.

**Mail namens react2u.nl wordt geweigerd, niet gefilterd.** Het domein staat op
`DMARC p=reject; sp=reject` — ook voor subdomeinen. Verstuur je vanaf een
(sub)domein waarvoor de verstuurder geen geldige SPF/DKIM heeft, dan komt de
mail helemaal niet aan; je ziet het alleen in de logs. Mail voor react2u.nl
loopt via Microsoft 365 (`MX react2u-nl.mail.protection.outlook.com`), met
Sophos-filtering ervoor en `-all` in de SPF.

## Vormgeving

Acture.nl was de inspiratiebron, geen voorbeeld om na te maken. Wat we ervan
hebben overgenomen is de aanpak: rust en ruimte, diensten overzichtelijk
gegroepeerd, één duidelijke vervolgstap, sociaal bewijs en veelgestelde vragen.
Vorm, woorden en concepten komen uit React2u zelf:

- **Vormtaal: stippen en cirkels**, uit het logo en het REACT-wiel. Foto's
  staan rond (`RondeFoto` in `BlockRenderer`), met de stippenwolk ernaast;
  de afsluitende oproep toont de stippenwolk groot, net als de
  onderhoudspagina.
- **Eigen woorden**: "Jouw mensen, onze aandacht", "Daar zorgen wij voor",
  "Dit is React2u!", "Voor iedereen gezond, menselijk en duidelijk", "Er is
  altijd een oplossing", "Maak een afspraak". Neem geen formuleringen van
  Acture over ("in één oogopslag", "adviesgesprek", "gingen je voor").
- **Eigen concepten**: diensten vanuit de situatie van de werkgever
  (`situatie` in `nav.ts`), het REACT-model als werkwijze (blok `method`) en
  de drie waarden met de feiten erbij (blok `values`).
- **Header** met de topbalk van de oude site; **footer** op indigo met "Er is
  altijd een oplossing."

**Contrast is doorgerekend, niet geschat.** Het roze van de knoppen is
`#c8306a` (5,1:1 met witte tekst); het oude `#e75387` haalde 3,5:1. Tekst in
teal is `--color-secondary-ink` (`#007a6d`); het teal uit het logo is te licht
voor tekst. De dienstkleuren in `brand.ts` hebben een aparte `tekst`-tint die
ook op de eigen lichte tint AA haalt. Gebruik voor grijze tekst niet minder
dan `text-primary/70` of `text-body`.

**Nieuwe bloktypes** naast de bestaande:

| Bloktype | Wat |
|---|---|
| `heroStatement` | De belofte (met `highlight` in de accentkleur), twee knoppen, een keurmerkregel (`badge`) en de ronde foto met de stippenwolk. |
| `pillars` | "Waar kunnen we je mee helpen?": drie stappen (voorkomen, begeleiden, versterken) met per dienst de situatie. Inhoud uit `PIJLERS` in `nav.ts`; het blok zelf heeft alleen de kop. |
| `method` | De werkwijze: het REACT-model. `steps` met `title`, `text` en `kleur`; de letter is de eerste letter van de titel. Met het wiel en een citaat. |
| `values` | De drie waarden (`cards` met `title`, `text`, `value`, `valueLabel`, `kleur`). Een feit onderbouwt elke waarde. |
| `latestPosts` | De nieuwste blogartikelen. Zonder gepubliceerde artikelen verdwijnt het blok. |

Bestaande blokken kregen optionele varianten: `intro` met `layout: "split"`
en `valueCards` met een `heading`. De blokeditor toont alleen velden die al in
de data staan — wil je een bestaand blok omzetten, voeg het opnieuw toe.

**Ritme en raster.** Elke sectie zet `data-tone` (`white`, `soft`, `dark`,
`hero`, `band`). Volgen twee secties met dezelfde toon elkaar op, dan haalt
`globals.css` de bovenruimte van de tweede weg — anders verdubbelt de witruimte.
Een nieuw blok hoort dus een `data-tone` te hebben. Tweekoloms-secties gebruiken
`SPLIT`/`LINKS`/`RECHTS` in `BlockRenderer` (5 + 6 van 12 kolommen), zodat de
rechterkolom op elke pagina op dezelfde lijn begint. In een groep knoppen is
alleen de eerste een volle knop; de rest wordt outline tenzij de data anders
zegt.

**Het eerste blok is de paginakop.** Begint een pagina met `intro` of
`richText`, dan wordt dat een lichte band met kruimelpad en h1 (`HeaderBand`);
een `hero` toont het kruimelpad in zijn tekstpaneel. Het kruimelpad komt uit
`crumbsVoor()` in `nav.ts` en wordt ook als `BreadcrumbList` uitgegeven.

**Dienstpagina's kleuren mee.** `[slug]/page.tsx` zet `kleurVars()` van de
dienst op een wrapper; het heropaneel, bovenkopjes, nummering, vinkjes en
opsommingstekens lezen `--k` en `--k-zacht` (met een terugval voor gewone
pagina's). Onder elke dienstpagina staat automatisch "Meer van React2u" met
de vijf andere diensten.

**Een lichte paginakop schuift onder de header.** De menubalk plakt bovenaan
(de topbalk erboven scrolt weg). `.hero-pull` trekt een paginakop `--hh`
omhoog zodat zijn lavendel achtergrond doorloopt tot onder de balk. `--hh` in
`globals.css` moet gelijk zijn aan de hoogte van die balk (72px mobiel, 84px
desktop). Maak je de balk hoger, verhoog dan `--hh` mee.

**Onthullen bij scrollen is veilig voor als JavaScript faalt.** Elementen met
`data-reveal` komen zacht in beeld. `Reveal.tsx` markeert eerst alles wat al
in beeld staat en zet pas daarna `js-reveal` op `<html>`: zonder JavaScript
blijft alles gewoon zichtbaar. Het werkt alleen binnen `.site-root` (de
`SiteShell`), zodat het voorbeeld in de blokeditor niet leeg blijft, en staat
uit bij `prefers-reduced-motion`. Test je met een script dat met `scrollTo`
springt, dan kunnen secties leeg lijken; scroll dan met het muiswiel.

**Formulieren hebben zichtbare labels** (`FormField.tsx`), geen placeholders
als enige aanduiding.

**404.** `(site)/not-found.tsx` vangt `notFound()` binnen de site;
`app/not-found.tsx` vangt adressen die op geen route passen en zet zelf de
`SiteShell` eromheen.

**Niet verzinnen.** Acture toont cijfers (650+ medewerkers, 6500+ organisaties)
en een klantcitaat. Voor React2u stonden die nergens, dus `values` gebruikt
alleen wat aantoonbaar klopt: zes diensten, een vaste casemanager, de
keurmerken uit `site_settings.certificates`. Ook de uitleg bij de REACT-letters
komt uit bestaande teksten van de site. Echte cijfers of reviews kunnen er via
het CMS bij.

**`latestPosts` heeft gegevens van de pagina nodig.** Blokken renderen ook in
het live voorbeeld van de blokeditor, en dat is een client component — een
blok kan daar niet zelf de database bevragen. De pagina haalt de artikelen
daarom op (`needsPosts()`) en geeft ze via `ctx` door aan `BlockRenderer`. In
de blokeditor ontbreekt `ctx`; daar toont het blok voorbeeldkaarten.

## Concepten

Een nieuwe opbouw van een pagina kun je bekijken zonder de live database te
raken: [`src/content/home.json`](src/content/home.json) bevat de blokken van de
nieuwe homepage, en `/concept` rendert die met de gewone `BlockRenderer`.
Alleen lokaal en op preview-deploys — in productie (`VERCEL_ENV=production`)
geeft `/concept` een 404, en de pagina staat op `noindex`. Op een preview-deploy
staat het concept bovendien op `/` (`conceptOpHome` in `src/lib/concept.ts`),
zodat staging de homepage toont zoals hij live komt.

Lokaal staging nabootsen — geen onderhoudspagina, concept op `/`:

```bash
VERCEL_ENV=preview npm run dev
```

**Staging** is een preview-deploy van een branch: elke push naar een andere
branch dan `master` krijgt van Vercel een eigen URL, plus een vaste per branch
(`react2u-git-<branch>-….vercel.app`). Let op: staging praat met de
productiedatabase. Een contactformulier of sollicitatie die je daar invult komt
echt binnen, en bezoeken tellen mee in `/admin/bezoek`.

Overzetten naar de database:

```bash
node scripts/concept-naar-sql.mjs home > home.sql
```

en plak `home.sql` in de SQL-editor van Supabase. Het script praat zelf niet
met de database. De SQL verwijdert niets: de huidige blokken verhuizen naar een
nieuwe, niet-gepubliceerde pagina `home-oud-<datum>`, en pas daarna komen de
nieuwe blokken erin — alles in één transactie. Terugdraaien kan via het
adminpaneel. Draai je het script twee keer op dezelfde dag, dan faalt de tweede
keer op de bestaande `home-oud-<datum>` en gebeurt er niets.

Let op dat de publieke pagina's 5 minuten gecachet zijn; de nieuwe homepage is
dus niet meteen zichtbaar.

## Onderhoudsmodus

Een schakelaar op `/admin/instellingen` (recht `instellingen`), opgeslagen als
`site_settings.maintenance`. Zolang hij aan staat toont de topbalk van het
adminpaneel aan iedereen *Onderhoudsmodus aan* — beheerders zien de site zelf
gewoon, dus anders valt nergens te merken dat hij dicht is.

**De poort zit in de middleware, niet in de layout.** Een layout kan geen 503
teruggeven: bezoekers zouden de melding krijgen met status 200, en dan kan
Google "we zijn zo terug" opnemen als inhoud van elke pagina. Ook een
`NextResponse.rewrite()` naar een onderhoudsroute helpt niet — Next negeert de
status van een rewrite. Daarom bouwt de middleware de pagina zelf op als losse
HTML ([`src/lib/maintenance.ts`](src/lib/maintenance.ts)), met `503`,
`Retry-After` en `no-store`. De CSS staat inline, want de gebundelde
stylesheet heeft een gehashte naam. Om dezelfde reden staan de lettertypes
(Figtree, DM Sans) los in `public/fonts/` — byte voor byte dezelfde bestanden
die next/font voor de site bundelt, maar op een vaste naam. Het beeld is de stippenwolk uit het logo, als
cirkels overgenomen (`LOGO_DOTS` in `src/lib/brand.ts`, dezelfde bron als
`DotCloud` op de site), met de kop op de plek van het woord "React2u".

**De pagina's zelf veranderen niet.** Aan- of uitzetten revalideert niets; de
statische pagina's blijven in de cache staan en zijn meteen terug zodra de
schakelaar uit gaat.

Wat de poort doorlaat: `/admin`, `/api/` (bezoekregistratie), `/_next/` en alles
met een bestandsextensie (`robots.txt`, `sitemap.xml`, favicon). Op een
preview-deploy (staging, `VERCEL_ENV=preview`) staat de poort helemaal uit:
die deelt de database en dus de schakelaar met productie, en staging is er juist
om te bekijken wat nog niet live mag. Formulieren
posten naar hun paginapad en worden dus ook tegengehouden.

**Beheerders komen erlangs** met één query op `admins` via hun eigen sessie. De
policy *own admin row* geeft een beheerder minstens zijn eigen rij en ieder
ander niets; PostgREST controleert de handtekening van het token, dus een
nagemaakte cookie helpt niet. Zonder `sb-…-auth-token`-cookie wordt die query
overgeslagen. Controleer onderhoud daarom in een privévenster.

**De site gaat open bij twijfel.** Omdat de middleware nu vóór élke publieke
pagina draait, zou een haperend Supabase de hele site laten hangen. Daarom:

- de stand wordt 15 seconden per instantie onthouden (best effort — Next belooft
  niets over globals in middleware, maar het scheelt een query per weergave);
  een wijziging is dus niet op de seconde overal zichtbaar;
- elke query heeft een timeout van 1 seconde;
- bij een fout geldt de laatst bekende stand, en zonder die: open.

`middleware.ts` heet sinds Next 16 officieel `proxy.ts` (en draait dan op
Node.js in plaats van de edge). Nog niet omgezet; bij het omzetten verhuist de
poort mee.

## Notificatiemail

[`src/lib/mail.ts`](src/lib/mail.ts) stuurt een melding bij een nieuw
contactbericht of een nieuwe sollicitatie, via de REST-API van Resend (geen SDK).

Drie variabelen, alle drie verplicht — ontbreekt er één, dan slaat de module
**stil** over en gebeurt er verder niets:

| Variabele | Voorbeeld |
|---|---|
| `RESEND_API_KEY` | `re_…` |
| `NOTIFY_TO` | `info@react2u.nl` (meerdere: komma-gescheiden) |
| `NOTIFY_FROM` | `Website <geen-antwoord@send.react2u.nl>` |

Dat stil overslaan is opzet: de inzending staat dan al in Supabase en is
zichtbaar in het Postvak IN. De mail is een extra, geen voorwaarde — en een
mailstoring mag een bezoeker nooit een foutmelding geven voor iets wat wél
gelukt is. Om dezelfde reden vangt de module al zijn eigen fouten af.

Kies voor `NOTIFY_FROM` het (sub)domein dat je in Resend hebt geverifieerd; zie
de DMARC-valkuil hierboven. Een apart subdomein (`send.react2u.nl`) laat de SPF
van het hoofddomein met rust.

## Van Postvak IN naar bellijst

Elke kaart in het Postvak IN heeft een knop **Op bellijst**. Die maakt een lead
van de inzending: naam, e-mail, telefoon, een herkomst in `source` en de vraag
of motivatie in `notes` — de bellijst linkt niet terug, dus zonder die tekst bel
je iemand zonder te weten waarover. De vertaalslag staat als pure functie in
[`src/lib/leads.ts`](src/lib/leads.ts) (`leadFromMessage`, `leadFromApplication`),
de actie eromheen is `addLeadFromInbox` in `src/app/admin/actions.ts`.

**`leads.source_id` houdt bij uit welke inzending een lead komt.** Daar staat een
unieke index op (partieel: alleen waar de kolom gevuld is, want handmatige leads
hebben er geen). Dát is wat de knop idempotent maakt — niet een controle vooraf,
want tussen lezen en schrijven past een tweede klik. De actie slikt daarom
foutcode `23505` in en laat elke andere fout wél zien.

**De knop raakt de inzending zelf niet aan.** Gelezen/onbehandeld gaat over of je
iets hebt gezien, de bellijst over of je iemand nog moet spreken. Een bericht mag
ongelezen blijven terwijl de lead al op de lijst staat. Verwijder je de lead, dan
komt de knop terug.

## Openstaand

- **DNS is omgezet (29 september 2026)**, door Theiner ICT, die het
  Hostnet-account beheert. Twee restpunten, zie *Na de omzetting* in
  [`docs/dns-omzetting.md`](docs/dns-omzetting.md): het TXT-record
  `MS=ms23148887` (Microsoft 365) is daarbij verdwenen, en de oude
  WordPress-hosting kan pas weg als de nieuwe site een paar dagen goed draait.
- **E-mailnotificaties zijn gebouwd maar staan uit.** De code staat er
  (zie *Notificatiemail*); zolang `RESEND_API_KEY`, `NOTIFY_TO` en `NOTIFY_FROM`
  niet in Vercel staan, wordt er niets verstuurd en mist wie niet inlogt nog
  steeds inzendingen.
- **Toegang.** Het adminwachtwoord en een Vercel-token zijn buiten de repo gedeeld;
  het wachtwoord moet gewijzigd en het token ingetrokken worden.

## SEO

De basis staat: elke route heeft eigen metadata en een canonical, er is een
sitemap en een robots.txt, en de fonts komen via `next/font` (niet via een
render-blocking `<link>` naar Google Fonts — dat kost Core Web Vitals).

Structured data per paginasoort: `Organization` op de home, `JobPosting` op een
vacature, `BlogPosting` + `BreadcrumbList` op een artikel.

**`/admin/seo`** toont per pagina, artikel en vacature wat Google straks écht
ziet — dus mét de fallbacks — plus de lengte en waar iets ontbreekt of afkapt.
De logica staat in [`src/lib/seo.ts`](src/lib/seo.ts) en **spiegelt de
`generateMetadata` van de betreffende route**. Verander je daar een fallback,
pas dan ook `seo.ts` aan; anders toont het overzicht iets anders dan de site.
Concepten tellen niet mee in de aandachtspunten — die staan niet in Google.

Site-brede standaardomschrijving en deelafbeelding zijn instelbaar
(`site_settings.seo`) en worden toegepast in
[`src/app/(site)/layout.tsx`](src/app/(site)/layout.tsx) — niet in de
root-layout, zodat het adminpaneel die query niet draait.

> **`openGraph: undefined` is niet hetzelfde als weglaten.** Next voegt metadata
> van layout en pagina samen als een shallow merge. Zet een pagina de sleutel
> expliciet op `undefined`, dan bestáát hij en overschrijft hij de waarde van de
> layout — de pagina krijgt dan hélemaal geen og-tags. Zo hadden alle
> contentpagina's op één na er nul. Neem de sleutel dus alleen op als er echt
> iets te zetten valt (`...(x ? { openGraph: … } : {})`).
>
> En zet je hem, dan **vervangt** hij het hele object: `type`, `siteName` en
> `locale` moeten dan mee, anders verdwijnen die.
>
> Zet in de layout geen `openGraph.title`/`description`. Next leidt die anders
> netjes af uit de titel en omschrijving van de pagina zelf; hard zetten geeft
> élke pagina dezelfde deeltitel.

De standaard deelafbeelding is het logo — geen echte 1200×630-afbeelding. Wie
link-previews serieus neemt, stelt er een eigen beeld voor in.

`next.config.ts` bevat de permanente redirects van de oude WordPress-site.
Die lijst komt uit `wp-sitemap.xml` van react2u.nl en is opgehaald toen die
site nog live was — na de DNS-omzetting is die bron weg. Voeg een pad hier toe
zodra je een oude URL tegenkomt die 404 geeft.

FAQ-blokken (`faqAccordion` en `contactFaq`) leveren samen één
`FAQPage`-structured-data per pagina, samengesteld in `BlockRenderer`. Google
wil er één per pagina, niet één per blok.

`sitemap.ts` zet op overzichtspagina's de `lastModified` van het nieuwste item.
Altijd `new Date()` melden is een leeg signaal: crawlers leren dan dat het veld
niets zegt.

## Bewaartermijnen en privacy

`pg_cron` draait dagelijks om 03:30 de functie
`public.opruimen_verlopen_gegevens()`. Die verwijdert contactberichten na 12
maanden, leads na 24 maanden en bezoekgegevens na 12 maanden.

**Sollicitaties staan er bewust niet in.** Daar hangt een cv-bestand aan, en dat
moet via de Storage-API weg. Alleen de databaserij verwijderen laat de bytes in
de bucket staan — het lijkt dan gewist terwijl het er nog is, en dat is voor de
AVG slechter dan niets doen. De functie telt ze wel, zodat er zicht op blijft;
verwijderen gaat via de knop in het Postvak IN. Volledige automatisering vraagt
`SUPABASE_SERVICE_ROLE_KEY`.

De **privacyverklaring** staat als gewone pagina in het CMS (`/privacyverklaring`),
gelinkt in de footer en onder beide formulieren. Hij beschrijft precies wat de
site nu doet. **Zet je `IPINFO_TOKEN` of Resend aan, dan moet die verklaring
mee**: er komt dan een verwerker bij (ipinfo.io, Resend) die er nu niet in staat.

Het privacyreglement (PDF, verzuimdossiers) belooft tweefactorauthenticatie voor
toegang tot digitale bestanden. Het adminpaneel heeft dat niet. Los dat op door
MFA aan te zetten in Supabase, of pas de tekst aan.

## Database

Migraties in [`supabase/migrations/`](supabase/migrations/) — `0001_init.sql`
(tabellen, RLS-policies, de twee storage-buckets), `0002_posts.sql`
(blogartikelen), `0003_leads.sql` (bellijst), `0004_page_views.sql`
(bezoekregistratie) en `0005_leads_uit_postvak.sql` (telefoon op berichten,
`leads.source_id`). Supabase-project `tumwtappyegkjabtmold`.
