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
| **Commandopalet** | Zoekveld over het hele paneel: ⌘K, Ctrl+K of `/`. Vindt schermen, acties, pagina's, tekst ín blokken, artikelen, vacatures, inzendingen, leads en gebruikers — alleen wat je mag zien. Zie *Commandopalet en dashboard*. |
| **Doorverwijzing** (`redirects`) | Een oud adres dat naar een nieuw adres stuurt, beheerd onder SEO → Doorverwijzingen. Permanent (308) of tijdelijk (307). Zie *Doorverwijzingen en 404's*. |
| **404** (`missing_paths`) | Een adres waarop een bezoeker "niet gevonden" kreeg, met een teller en waar de link stond. Geen persoonsgegevens. |
| **Versie** (`revisions`) | Momentopname van een pagina, blok, artikel, vacature of instelling, gemaakt door een databasetrigger bij elke opslag. Zie *Versies en prullenbak*. |
| **Prullenbak** | Wat verwijderd is en nog terug kan (`/admin/prullenbak`). Geen tabel: de laatste versie van rijen die niet meer bestaan. Inzendingen en leads komen er nooit in. |
| **Bewaartermijn** | Voor sollicitaties: hoe lang ze mogen blijven staan. Bepaald in [`src/lib/retention.ts`](src/lib/retention.ts); het Postvak IN wijst aan wat erover is. |

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

**Het menu volgt de database niet.** `MAIN_NAV` in [`src/lib/nav.ts`](src/lib/nav.ts)
is een hardgecodeerde lijst. Een nieuwe pagina in het adminpaneel verschijnt dus
wél op zijn URL, maar niet in de navigatie tot je `nav.ts` bijwerkt.

**Een nieuw adminscherm moet op twee plekken bekend zijn.** `ADMIN_NAV` in
[`src/lib/adminNav.ts`](src/lib/adminNav.ts) zet het in het menu én in het
commandopalet (`paletteOnly: true` voor een tab binnen een scherm, zoals
Doorverwijzingen onder SEO). `PATH_PERMISSIONS` in
[`src/lib/permissions.ts`](src/lib/permissions.ts) zegt welk recht het vraagt;
ontbreekt het daar, dan ziet iedereen met een account het in het menu.

**`src/lib/redirects.ts` wordt ook door `next.config.ts` geladen.** Houd dat
bestand vrij van `@/`-imports en van code die alleen op de server of alleen in
de browser werkt — anders faalt de build al bij het lezen van de config.

**Zoeken loopt via route handlers, niet via server actions.** Server actions uit
één browser lopen na elkaar; bij snel typen zou elke toetsaanslag op de vorige
wachten. `/admin/zoeken` en `/admin/zoeken/inhoud` zijn gewone GET-routes die de
browser kan afbreken zodra er een nieuwere vraag is.

**Klassen buiten een `@layer` winnen in Tailwind v4 altijd van utilities.**
Daarom staan er in de admin `!py-1.5`-achtige uitroeptekens tegen `.abtn` en
`.apill`. Nieuwe componentklassen horen in `@layer components` (zoals `.akbd`),
dan werkt `hidden sm:inline-flex` er gewoon op.

**Supabase Storage meldt geen fout als verwijderen niet mag.** Zonder
DELETE-policy op de bucket geeft `remove()` een lege lijst terug en `error:
null` — het bestand blijft staan. Controleer daarom altijd of de teruggegeven
lijst de bestanden bevat (zie `removeCvs()` in
[`src/app/admin/actions.ts`](src/app/admin/actions.ts)).

**De live database loopt voor op `supabase/migrations/`.** Commit 2a27005
(augustus 2026) paste wijzigingen rechtstreeks in de database toe, zonder
migratiebestand: triggers die velden van anonieme inzendingen vastzetten,
lengtegrenzen op vrije tekstvelden, gesplitste policies voor `site_settings`
en `roles`, bucketlimieten, de verwijderpolicy op `cvs` en het opruimen van
weesfuncties. Ook `opruimen_verlopen_gegevens()` staat nergens in de repo. Een
nieuwe omgeving opbouwen uit alleen de migraties geeft dus een ándere
database. Leg zo'n wijziging voortaan vast als migratie, en haal het verschil
een keer binnen met `supabase db dump`.

**Supabase geeft per query hooguit 1000 rijen terug**, ook met `.limit(20000)`,
en zonder foutmelding. Tel je iets over veel rijen (bezoek), blader dan in
blokken van 1000 — zie [`fetchPageViews()`](src/lib/analyticsDb.ts).

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
cirkels overgenomen, met de kop op de plek van het woord "React2u".

**De pagina's zelf veranderen niet.** Aan- of uitzetten revalideert niets; de
statische pagina's blijven in de cache staan en zijn meteen terug zodra de
schakelaar uit gaat.

Wat de poort doorlaat: `/admin`, `/api/` (bezoekregistratie), `/_next/` en alles
met een bestandsextensie (`robots.txt`, `sitemap.xml`, favicon). Formulieren
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

## Commandopalet en dashboard

**⌘K** (of Ctrl+K, of `/` buiten een invoerveld) opent een zoekveld over het
hele paneel. Twee bronnen, bewust verschillend behandeld
([`src/lib/search.ts`](src/lib/search.ts)):

- **Inhoud** — pagina's, de tekst in blokken, artikelen, vacatures. Klein en
  weinig veranderlijk, dus bij openen in één keer opgehaald
  (`/admin/zoeken/inhoud`, hooguit eens per minuut) en in de browser doorzocht:
  resultaat bij elke toetsaanslag, zonder netwerk. Zoeken negeert accenten.
- **Inzendingen, leads en gebruikers** — persoonsgegevens en groeiende tabellen.
  Per zoekvraag op de server (`/admin/zoeken`, met limiet), nooit als geheel
  naar de browser.

Beide slaan onderdelen over waar de gebruiker geen recht op heeft; RLS zou ze
anders toch leeg teruggeven.

**Het dashboard** toont per rol wat vandaag aandacht vraagt: te behandelen
inzendingen (oudste eerst), wie vandaag gebeld moet worden, bezoek deze week
tegenover vorige week, SEO-problemen en 404's, concepten, vacatures die aflopen,
de laatste wijzigingen, en voor wie instellingen beheert welke koppelingen uit
staan (mail, bezoekregistratie, bedrijfsherkenning, uitnodigen — alleen óf ze
gezet zijn, nooit de waarde). Wie geen tweestapsverificatie heeft, krijgt
bovenaan een oproep. Tijden en de begroeting rekenen in Europe/Amsterdam; de
server draait in UTC.

## Doorverwijzingen en 404's

Onder **SEO → Doorverwijzingen**. Twee lagen, en de volgorde telt:

1. `WORDPRESS_REDIRECTS` (code, via `next.config.ts`) — Next voert die uit vóór
   de middleware, dus die wint altijd. De admin toont de lijst en weigert een
   bron die er al onder valt.
2. De tabel `redirects` — toegepast door de middleware, met dezelfde
   voorzorgen als de onderhoudsmodus: 15 seconden onthouden, 1 seconde timeout,
   bij een storing de laatst bekende lijst. Faalt alleen die query (bijvoorbeeld
   vóór migratie 0007), dan werkt de onderhoudsmodus gewoon door.

Een bron is een pad zonder bestandsextensie (die ziet de middleware nooit),
niet `/`, `/*`, `/admin` of `/api`, en geen adres waarop een bestaande pagina
staat — de doorverwijzing zou die onbereikbaar maken. Eindigt de bron op `/*`,
dan gaat alles eronder mee (en het pad zelf); zo'n wildcard mag geen bestaande
pagina afvangen. Een `*` mag nergens anders staan. Lussen worden geweigerd, ook
een wildcard die naar zichzelf wijst.

**Komt er weer echte inhoud op een adres** — publiceren, terugzetten uit de
prullenbak of een versie, een slug die terugkeert — dan verdwijnen de regels
die dat adres afvangen (`clearRedirect()`, het pad zelf en elke wildcard
erboven). Anders bleef de teruggezette pagina onbereikbaar.

Met de publieke sleutel zijn alleen `source`, `destination` en `permanent` te
lezen; de notitie en wie de regel maakte niet. De querystring van het verzoek gaat mee, zodat utm-parameters aankomen.
Elke keer dat een regel gebruikt wordt telt `redirect_hit()` op, via
`waitUntil`: de bezoeker wacht daar niet op.

**404's** komen van de 404-pagina zelf. `data-niet-gevonden` op
[`NotFound`](src/components/site/NotFound.tsx) vertelt de VisitTracker dat dit
geen bezoek is; `/api/track` roept dan `log_missing_path()` aan in plaats van
een `page_views`-rij te maken. Eén rij per pad met een teller, na 180 dagen
zonder treffer opgeruimd. Hooguit 5000 open paden: is dat vol, dan wijkt het
oudste pad met één treffer. Een script dat willekeurige URL's afloopt kan de
lijst dus niet dichtzetten; echte 404's worden vaker geprobeerd en blijven. Van een externe verwijzer
bewaren we de host, van een link op de eigen site het pad — dat is een kapotte
interne link, en die staat in de lijst in het rood. Omdat het via JavaScript
gaat, tellen bots die geen scripts draaien niet mee; dat is gewenst.

Bij elke 404 stelt de admin een bestemming voor als een bestaande pagina er
duidelijk op lijkt ([`suggestDestination()`](src/lib/redirects.ts)); één klik
maakt de doorverwijzing. Geen duidelijke kandidaat, dan geen voorstel.

**Automatisch:** wijzigt de slug van een gepubliceerd artikel of een
gepubliceerde vacature, dan komt er vanzelf een doorverwijzing van het oude
naar het nieuwe adres, zonder ketens (regels die naar het oude adres wezen,
wijzen voortaan direct naar het nieuwe). Na het verwijderen van een
gepubliceerde pagina of een gepubliceerd artikel opent de admin
Doorverwijzingen met het oude adres ingevuld. Dit vraagt het recht `seo`; zonder
dat blijft alleen de doorverwijzing uit.

## Media: waar staat dit bestand?

Er is geen koppeltabel tussen bestanden en inhoud: een afbeelding staat als
volledige URL in blokdata, een artikel of een instelling. De mediabibliotheek
zoekt daarom bij het openen alle inhoud door op URL's van de `media`-bucket
([`src/lib/mediaUsage.ts`](src/lib/mediaUsage.ts)) en toont per bestand waar het
gebruikt wordt, met een link. Verwijderen van een bestand dat nog in gebruik is
noemt de plekken waar het daarna kapot is. Zonder rechten op pagina's, blog en
vacatures ziet iemand geen concepten, dus gebruik daarin telt dan niet mee —
dat staat er dan bij. Het logo en de favicon staan in de code en tellen apart
mee. Afbeeldingen boven 600 KB krijgen het label *Zwaar*.

## Versies en prullenbak

Een trigger (`record_revision()`, migratie 0008) bewaart bij elke opslag van
`pages`, `blocks`, `posts`, `vacancies` en `site_settings` een versie in
`revisions`, en bij verwijderen de laatste stand. De eerste wijziging van een
rij van vóór het versiebeheer bewaart eerst de oude stand als *beginversie*
(zonder auteur). Alleen `sort` of `updated_at` veranderd, zoals bij slepen? Dan
geen versie.

**Inzendingen en leads krijgen bewust geen versies.** Dat zijn
persoonsgegevens; verwijderd moet daar echt verwijderd zijn. Een kopie in
`revisions` zou elke bewaartermijn en elk verwijderverzoek ondergraven. Voeg de
trigger dus nooit "voor de volledigheid" aan die tabellen toe.

Terugzetten ([`restoreRevision`](src/app/admin/actions.ts)) is een gewone upsert
met de rechten van de gebruiker, dus RLS geldt, en het levert zelf ook weer een
versie op: terugzetten is ongedaan te maken. Een blok dat nog bestaat houdt bij
terugzetten zijn plek. Een pagina komt terug met de blokken die met haar
verdwenen — die herkennen we aan hetzelfde tijdstip, want de cascade gebeurt in
dezelfde transactie en `now()` is daarbinnen overal gelijk. RLS op `revisions`
volgt de rechten per tabel: wie pagina's mag bewerken ziet hun geschiedenis.

Waar het zichtbaar is: de blokeditor (versies bekijken in het voorbeeld en in
de editor laden), de pagina-editor (titel/SEO en verwijderde blokken), artikel-
en vacature-editor, `/admin/prullenbak`, en het wijzigingslog op het dashboard.
Na verwijderen van een blok verschijnt "Ongedaan maken". Versies ouder dan een
jaar ruimt `pg_cron` op.

Vóór migratie 0008 is verwijderen definitief. De admin controleert daarom of
`revisions` bestaat (`hasVersions()`) en belooft alleen dan een prullenbak of
"ongedaan maken"; anders vraagt hij "definitief verwijderen?".

Onopgeslagen werk in de blokeditor wordt bewaakt bij sluiten, bij klikken op
een link én bij navigeren via het commandopalet
([`src/lib/unsaved.ts`](src/lib/unsaved.ts)) — dat laatste gebruikt
`router.push`, en dat zien `beforeunload` en een klik-luisteraar niet.

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
- **Migraties 0007, 0008 en 0009 moeten in Supabase worden uitgevoerd**, vóór
  of met de deploy van doorverwijzingen, versies en de cv-reparatie. Zonder
  draait alles door, maar tonen die schermen een melding in plaats van inhoud,
  en wordt er geen geschiedenis bewaard. 0009 legt de cv-verwijderpolicy vast
  die live waarschijnlijk al bestaat.
- **Schema binnenhalen.** De live database heeft wijzigingen die niet in de
  migraties staan (zie *Valkuilen*). Eén keer `supabase db dump` naar de repo
  maakt het weer één bron.

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

De permanente redirects van de oude WordPress-site staan als
`WORDPRESS_REDIRECTS` in [`src/lib/redirects.ts`](src/lib/redirects.ts) en
worden door `next.config.ts` toegepast. Die lijst komt uit `wp-sitemap.xml` van
react2u.nl en is opgehaald toen die site nog live was — na de DNS-omzetting is
die bron weg. Nieuwe doorverwijzingen horen niet meer in de code maar in de
admin; zie *Doorverwijzingen en 404's*.

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
verwijderen gaat via het Postvak IN. Volledige automatisering vraagt
`SUPABASE_SERVICE_ROLE_KEY`.

Het Postvak IN wijst sollicitaties aan die **over hun bewaartermijn** zijn
([`src/lib/retention.ts`](src/lib/retention.ts)): afgerond (afgewezen of
aangenomen) na acht weken, nog open na drie maanden — volgens de richtlijn van
de Autoriteit Persoonsgegevens (vier weken na afloop, langer alleen met
toestemming). Er is geen datum van afronding, dus de termijn loopt vanaf
binnenkomst met ruimte voor de procedure. Een melding bovenaan leidt naar het
filter *Bewaartermijn verstreken*; daar selecteer je ze en verwijder je ze in
één keer, cv's inbegrepen (`bulkInbox`). Ander beleid? Pas de getallen daar aan,
en de privacyverklaring mee.

De **privacyverklaring** staat als gewone pagina in het CMS (`/privacyverklaring`),
gelinkt in de footer en onder beide formulieren. Hij beschrijft precies wat de
site nu doet. **Zet je `IPINFO_TOKEN` of Resend aan, dan moet die verklaring
mee**: er komt dan een verwerker bij (ipinfo.io, Resend) die er nu niet in staat.

Het privacyreglement (PDF, verzuimdossiers) belooft tweefactorauthenticatie voor
toegang tot digitale bestanden. Het adminpaneel heeft dat: in te stellen onder
Account, en afgedwongen door `requireAdmin()` voor wie hem heeft ingesteld.
Verplicht voor iedereen is het (nog) niet; het dashboard vraagt wie hem niet
heeft om hem aan te zetten.

## Database

Migraties in [`supabase/migrations/`](supabase/migrations/) — `0001_init.sql`
(tabellen, RLS-policies, de twee storage-buckets), `0002_posts.sql`
(blogartikelen), `0003_leads.sql` (bellijst), `0004_page_views.sql`
(bezoekregistratie), `0005_leads_uit_postvak.sql` (telefoon op berichten,
`leads.source_id`), `0005_roles.sql` (rollen en rechten, `has_perm()`),
`0006_superadmin.sql` (super admin boven beheerder),
`0007_doorverwijzingen.sql` (`redirects`, `missing_paths`),
`0008_versies.sql` (`revisions` en de trigger) en `0009_cv_verwijderen.sql`
(verwijderpolicy op de bucket `cvs`). Supabase-project `tumwtappyegkjabtmold`.

**Tests:** `npm test` draait Vitest over de pure modules in `src/lib`
(zoeken, doorverwijzingen, versies, dashboard, bewaartermijn, mediagebruik). Die bevatten de
regels waar het op aankomt; de schermen eromheen zijn dun.
