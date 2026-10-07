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
| **Instelling** (`site_settings`) | Key/value (jsonb). In gebruik: `contact`, `documents`, `certificates`, `seo`, `maintenance`, `tracking` (grondslag bedrijfsherkenning) en `tarieven` (tarievenjaar). |
| **Onderhoudsmodus** (`maintenance`) | Instelling `{enabled, message}`. Aan: bezoekers krijgen op elke publieke URL een onderhoudspagina (503), ingelogde beheerders zien de site gewoon. Schakelaar op `/admin/instellingen`. Zie *Onderhoudsmodus*. |
| **Footerdocument** (`documents`) | Link onderaan elke pagina, vrije lijst van `{label, href}`. |
| **Certificaat** (`certificates`) | Keurmerklogo in de footer, vrije lijst van `{image, alt, href}`. `href` mag leeg — dan toont het logo zich zonder doorklik. |
| **Lead** (`leads`) | Iemand die gebeld moet worden, met belstatus, notities en een terugbeldatum. Staat op `/admin/bellijst`. Handmatig toe te voegen of vanuit het Postvak IN — zie *Van Postvak IN naar bellijst*. Interne data, zie de RLS-uitzondering hieronder. |
| **Te bellen** | Wat vandaag op de bellijst staat: status `te_bellen`, of `terugbellen` waarvan de datum is bereikt of ontbreekt. Bepaald door `needsCall()` in [`src/lib/leads.ts`](src/lib/leads.ts). |
| **Bezoek** (`page_views`) | Eén paginaweergave. Bevat géén IP-adres: alleen de afgeleide organisatie en een bezoekershash die dagelijks roteert. Zie `/admin/bezoek`. |
| **Bedrijfsbezoek** | Een bezoek waarvan het IP naar een organisatie herleidt (`is_company`), via de netwerkeigenaar of reverse DNS. Providers en datacenters vallen af — zie [`src/lib/companies.ts`](src/lib/companies.ts). Zie *Bedrijfsbezoek*. |
| **Warm / lauw / koud** | Interesse-score van een herkend bedrijf, uit bezoeken, terugkomen en welke pagina's (contact en diensten zwaar, vacatures niet). Zie `score()` in `companies.ts`. |
| **Niet volgen** | Een bedrijf dat verborgen is en waarvan nieuwe bezoeken zonder bedrijfsnaam worden opgeslagen (`company_profiles.ignored`). *Vergeten* haalt daarnaast de naam uit eerdere bezoeken. |
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
| **Taal** (`Taal`) | `nl` of `en`. Nederlands op de gewone paden, Engels onder `/en`. Zie *Tweetalig*. |
| **Koppeltabel** (`SLUGS`) | NL-slug ↔ EN-slug in [`src/lib/taal.ts`](src/lib/taal.ts), de enige plek die zegt welke Engelse URL bij een pagina hoort. |
| **Bewaartermijn** | Voor sollicitaties: hoe lang ze mogen blijven staan. Bepaald in [`src/lib/retention.ts`](src/lib/retention.ts); het Postvak IN wijst aan wat erover is, en `api/cron/opruimen` verwijdert het dagelijks. |
| **Conversie** (`conversions`) | Eén verstuurd formulier: het soort (`contact`, `offerte`, `sollicitatie`, `terugbel`) en de pagina waar het stond. Geen persoonsgegevens. Zie *Bewaartermijnen en privacy*, "Conversies". |
| **Belbalk** | Vaste balk onderaan het scherm op de telefoon, alleen op werkgeverspagina's: bellen of een terugbelmoment aanvragen (`BelBalk.tsx`, `lib/belbalk.ts`). Een terugbelverzoek is een bericht met onderwerp "Terugbelverzoek". |
| **Tarievenjaar** (`tarieven`) | Instelling `{jaar, geldigTot}`. De tariefblokken zetten het jaar in hun bovenkopje en tonen de geldigheid; per 1 januari pas je hier het jaar aan en in de blokken de bedragen. |

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

**Er is nu wél een service-role-sleutel**, voor precies drie dingen waar de
sleutel van een ingelogde beheerder niet bij kan: auth-beheer voor iemand anders
(een account aanmaken bij het uitnodigen, en bij Gebruikers zien wie
tweestapsverificatie aan heeft en die herstellen na een kwijtgeraakte telefoon),
het cv uit het publieke sollicitatieformulier in de bucket zetten
([`src/lib/cvs.ts`](src/lib/cvs.ts), ná honeypot, limiet, type- en
groottecontrole — zodat de publieke sleutel geen schrijfrecht op `cvs` meer
nodig heeft, migratie 0014), en de dagelijkse opschoning van verlopen
sollicitaties (`api/cron/opruimen`). Zie
[`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts) — die importeert
`server-only`, zodat de build faalt als het bestand ooit in een client component
belandt. Gebruik hem nooit in het adminpaneel: die sleutel omzeilt alle RLS, en
daarmee elke rolcontrole in dit project. Ontbreekt `SUPABASE_SERVICE_ROLE_KEY`,
dan werkt uitnodigen niet, draait de opschoning niet, en uploadt het cv-formulier
met de anon-sleutel (wat na 0014 niet meer mag).

**Uitnodigen leunt niet op de mail van Supabase.** De server maakt de link zelf
(`auth.admin.generateLink`) en de landingspagina wisselt de gehashte token in met
`verifyOtp`; zie [`src/lib/invite.ts`](src/lib/invite.ts). Supabase's eigen
uitnodigingsmail faalde op drie plekken tegelijk: de standaard-mailserver bezorgt
alleen bij leden van het Supabase-team, de link valt zonder vermelding in de
Redirect URLs terug op de Site URL, en hij zet de sessie in de hash, die de
PKCE-client van `@supabase/ssr` weigert. Nu wordt de link gemaild via Resend als
`RESEND_API_KEY` en `NOTIFY_FROM` gezet zijn, en staat hij altijd op het scherm
om zelf door te sturen (kopiëren of *Open in mail*). Wie een link niet op tijd
gebruikte, krijgt bij Gebruikers met *Nieuwe link* een nieuwe; de oude vervalt.
Had het adres al een account, dan wordt het een herstellink (`type=recovery`):
wie nooit inlogde kent zijn wachtwoord niet. Bij wie wel eens inlogde heet de
knop *Wachtwoordlink*: dat is de route voor een vergeten wachtwoord. *Wachtwoord
vergeten?* op het inlogscherm verwijst ernaar; een zelfbedieningsmail is er bewust
niet: een publiek formulier dat mailt laat accounts raden en vraagt eigen
spambescherming, terwijl de wachtwoordlink via een collega even snel is.

**Tweestapsverificatie herstellen** (Gebruikers → *Tweestaps herstellen*) wist
alle authenticators van een collega; bij de volgende inlog stelt die een nieuwe
in. Alleen met het recht `gebruikers`, niet voor jezelf (dat kan op Account, met
je code), en alleen als je zelf met een code bent ingelogd (aal2): anders kon een
gestolen wachtwoord van één beheerder de beveiliging van iedereen uitzetten.

**Toegang tot `/admin`** loopt via [`requireAdmin()`](src/lib/admin.ts): ingelogd
zijn is niet genoeg, er moet ook een rij in `admins` staan. Schermen achter een
recht gebruiken `requirePerm('<recht>')`.
[`src/middleware.ts`](src/middleware.ts) ververst op `/admin` alleen de sessie
— het is géén autorisatiepoort. De echte controle staat in de pagina's zelf. Op
de publieke routes is de middleware de poort van de onderhoudsmodus.

**Tweestapsverificatie is verplicht** (sinds 7 okt 2026, op verzoek van Rens).
`requireAdmin()` eist aal2: wie in deze sessie alleen een wachtwoord gaf, gaat
naar de codestap (`?stap=code`) of, zonder authenticator, naar het instelscherm
(`?stap=instellen`). Daarvóór kon je het instellen overslaan door `/admin` te
openen, en hadden drie van de vier beheerders het niet aan. Uitschakelen kan
niet meer; *Nieuwe telefoon instellen* op Account vervangt de oude authenticator
(die blijft anders staan en het inlogscherm vroeg dan mogelijk zijn code).
Telefoon kwijt: een collega met `gebruikers` wist hem bij Gebruikers.
Migratie [0017](supabase/migrations/0017_tweestaps_verplicht.sql) legt hetzelfde
vast in de database: `is_admin()` en `has_perm()` eisen de claim `aal = aal2`,
zodat een gestolen wachtwoord ook via de REST-API niets van het beheer laat zien.
Alleen de eigen rij in `admins` blijft op aal1 zichtbaar (inlogscherm en
onderhoudspoort). Draai 0017 pas nadat de code met verplichte tweestaps live staat.

**Terug naar waar je was.** De middleware geeft op `/admin` het huidige pad mee
in de request-header `x-admin-pad`; verloopt de sessie, dan stuurt
`requireAdmin()` naar `/admin/login?terug=<pad>` en na het inloggen ga je daar
weer heen. Dat pad komt van buiten, dus [`veiligTerugPad()`](src/lib/terug.ts)
laat alleen paden binnen `/admin` door (geen `//`, geen andere host, niet terug
naar het inlogscherm): anders is het een open redirect. Wie al ingelogd is en
`/admin/login` opent, gaat meteen door.

**Uitloggen geldt voor dit apparaat** (`signOut({ scope: "local" })`). Supabase
logt standaard overal uit; zo was wie op kantoor uitlogde ook op zijn telefoon
uit. *Overal uitloggen* staat apart op Account. Lukt het afmelden bij Supabase
niet, dan gaan de sessiecookies van dit apparaat alsnog weg: uitloggen moet
altijd lukken. Uitloggen staat in het accountmenu rechtsboven, onderaan het
zijmenu (dat zelf scrolt, zodat het op een laptopscherm in beeld blijft) en in
het commandopalet.

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

**Diensten hebben een foto, geen kleur.** `PIJLERS` in `nav.ts` geeft per
dienst een `image`; die komt terug in overzichten en menu's. De velden `kleur`
en `KLEUREN` in `brand.ts` bestaan nog, maar de site gebruikt ze niet meer:
kleur per dienst maakte de site onrustig. Zet ze niet terug zonder reden.

**Tekst uit het CMS wordt bij het tonen netjes gemaakt, niet in de database.**
Knoppen en keurmerken die in hoofdletters zijn ingevoerd ("NEEM CONTACT OP")
verschijnen als gewone zin, afkortingen als WVP blijven staan
(`zinsletters()` in `src/lib/tekst.ts`). Korte woorden met een koppelteken
("re-integratie") breken niet meer af aan het eind van een regel.

**Een nieuw adminscherm moet op twee plekken bekend zijn.** `ADMIN_NAV` in
[`src/lib/adminNav.ts`](src/lib/adminNav.ts) zet het in het menu én in het
commandopalet (`paletteOnly: true` voor een tab binnen een scherm, zoals
Doorverwijzingen onder SEO). `PATH_PERMISSIONS` in
[`src/lib/permissions.ts`](src/lib/permissions.ts) zegt welk recht het vraagt;
ontbreekt het daar, dan ziet iedereen met een account het in het menu.

**Een `"use server"`-bestand mag alleen async functies exporteren.** Een
constante of gewone functie exporteren uit `app/(site)/actions.ts` breekt de
build. Pure hulpjes voor de formulieren staan daarom in `src/lib/formulier.ts`.

**Foto's gaan via `Beeld`, niet via `<img>`.**
[`src/components/site/Beeld.tsx`](src/components/site/Beeld.tsx) kiest per bron:
lokaal beeld (`/beeld/…`) door `next/image` (kleinere varianten per
schermbreedte, WebP), beeld uit de mediabibliotheek via `SiteImage` (Supabase
schaalt), extern als gewone `<img>`. `sizes` is verplicht en moet kloppen met de
lay-out — zonder kiest de browser de grootste variant. `fill` voor een foto die
zijn (gepositioneerde) vlak vult; anders komen de afmetingen uit
`src/lib/beeldAfmetingen.json`. **Nieuw bestand in `public/beeld`? Draai
`node scripts/beeld-afmetingen.mjs`**, anders valt dat beeld terug op een
onbewerkte `<img>`.

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
object met drie sleutels (`algemene_voorwaarden`, `klachtenprocedure` en
`privacy_reglement`; die laatste, de oude WordPress-PDF, leest `normalizeDocs()`
niet meer en laten beide footers weg), inmiddels een vrije lijst `{label, href}[]`. Rijen die
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

**Warm en menselijk, in de taal van het splitscreen.** Het startscherm
(werkgever | werknemer, twee foto's van rand tot rand) is goedgekeurd en is
de maat voor de rest van de site. Afgewezen, in deze volgorde: stippenpatronen
en grote woordvlakken ("dramatisch"), en daarna een strakke, koele versie met
dunne kaartjes naar het voorbeeld van de markt ("saai en standaard"). De
regels:

- **Mensen, groot**: waar een foto een sectie draagt, loopt hij van rand tot
  rand naast een tekstkolom — het "halve scherm" (`HeroSplit`, `ImageText` met
  `imageFit: "cover"`, `CtaBanner`). De tekstkolom lijnt aan de buitenkant uit
  met de rest van de pagina (`RAND_L`/`RAND_R`). Op de telefoon staat de foto
  erboven.
- **Tekst op een foto** alleen met het donkere indigo verloop erachter, dat
  aan de tekst vastzit en niet aan de foto: achter elke regel minstens 78%
  dekkend, alleen erboven vloeit het weg. Zo blijven gezichten helder en haalt
  wit ook op een witte foto 7:1 (`FotoTegel`, het splitscreen).
- **Diensten als fototegels** (`FotoTegel`): de situatie en de naam op de foto,
  een ronde witte pijl die bij aanwijzen roze wordt — de kleine versie van een
  helft van het startscherm. In `pillars`, `servicesGrid` en "Meer van
  React2u" (op de telefoon een rij om door te vegen).
- **Kleur**: indigo (`primary`) en wit, afgewisseld met zand (`bg-soft`,
  `#f6f2ec`, lijnen `#e6e0d6`) — geen grijs. Roze (`accent`) alleen voor de
  hoofdactie. Geen kleur per dienst. De stippen van het logo staan alleen in
  het logo (en op de onderhoudspagina).
- **Geen kaartjes met dunne randen**: vlakken (wit op zand, zand op wit),
  foto's en ruimte. Pictogrammen en stappen in ronde vlakken.
- **Typografie**: `H1` voor een kop over de volle breedte, `H1_HALF` (3,1rem,
  even groot als "Ik ben werkgever") naast een foto, één h2-maat (`H2`).
  De drie waarden ("Gezond", "Menselijk", "Duidelijk") staan groot, als woorden.
- **Knoppen**: afgerond op 10px, 48px hoog, zonder schaduw.
- **Doorklikken vloeit over**: de foto van een helft van het startscherm heeft
  een ViewTransition-naam (`foto-werkgever`/`foto-werknemer`), net als de foto
  in de paginakop van /werkgevers en /werknemers (`doelgroep` in
  `heroStatement`). Bij doorklikken schuift de foto de nieuwe pagina in, aan
  dezelfde kant: werkgever links, werknemer rechts (`imagePosition`). Met
  verminderde beweging staat dat uit.
- **Het REACT-wiel** staat op een grijs vierkant; `imageRond` in `method` knipt
  het rond uit, zodat het op zand staat zonder grijs vlak.
- **Diepte**: de grote foto's naast tekst (`ImageText`, `CtaBanner`) bewegen
  tijdens het scrollen iets trager dan de pagina (`.diepte`, scroll-driven
  animations in puur CSS). Zonder browserondersteuning of met verminderde
  beweging staat de foto gewoon stil.
- **Menu's met mensen**: het dienstenmenu toont elke dienst met zijn foto en
  rechts iemand aan de telefoon; het mobiele menu vult het scherm onder de
  balk, met de keuze werkgever/werknemer bovenin, de diensten met foto en
  onderaan bellen en mailen. Zolang het open is, scrolt de pagina erachter niet
  en is hij `inert` (Tab blijft in het menu).
- **Pagina's buiten de blokken** (vacatures, open sollicitatie) krijgen via
  `PageHeader` met `image` dezelfde kop als een half scherm. Formulieren staan
  op zand, met witte velden.
- **Dienstpagina's** zonder knoppen in de kop krijgen automatisch "Maak een
  afspraak" en "Bel …" (`knoppen` in de `ctx` van BlockRenderer).

**Contrast is doorgerekend, niet geschat.** Roze knop met witte tekst 5,1:1;
gedempte bovenkopjes 6,0:1 op wit; lopende tekst (`--color-body`) 6,9:1; de
rand van invoervelden 3,7:1 (WCAG vraagt 3:1 voor randen van bedieningselementen).

**Eigen woorden en concepten.** Acture en ArboNed waren inspiratie, geen
voorbeeld. De woorden komen van React2u zelf ("Jouw mensen, onze aandacht",
"Daar zorgen wij voor", "Dit is React2u!", "Voor iedereen gezond, menselijk en
duidelijk", "Er is altijd een oplossing", "Maak een afspraak"); neem geen
formuleringen van concurrenten over. Eigen concepten: diensten vanuit de
situatie van de werkgever (`situatie` in `nav.ts`), het REACT-model als
werkwijze (blok `method`) en de drie waarden met een feit erbij (blok
`values`).

**Bloktypes** naast de bestaande:

| Bloktype | Wat |
|---|---|
| `audienceChoice` | Het startscherm, een splitscreen: een smalle kopregel met de h1, daaronder werkgever \| werknemer als twee paginavullende foto's van rand tot rand (`choices`: `doelgroep`, `title`, `text`, `button`, `image`, `focus`, `href`; `focus` is de `object-position`). Ook op de telefoon naast elkaar, zodat beide keuzes boven de vouw staan; daar vallen `text` en de knoptekst weg (ronde pijl). De helft onder de muis wordt breder (`.split` in `globals.css`). Het donkere verloop zit alleen achter de tekst; wit haalt daarop gemeten 3,2:1+ (kop) en 6:1+ (tekst). Eronder één regel vertrouwen (`trust`). Een terugkerende bezoeker ziet "Je vorige keuze". |
| `heroStatement` | Paginakop voor een doelgroep: tekst op zand, foto van rand tot rand ernaast (`imagePosition`, `focus`), eventueel een keurmerkregel (`badge`). Met `doelgroep` vloeit de foto van het startscherm erin over. Hetzelfde ontwerp als `hero`. |
| `pillars` | "Waar kunnen we je mee helpen?": de zes diensten per stap (voorkomen, begeleiden, versterken), als fototegels met de situatie. De drie kolommen delen hun rijen (subgrid), zodat de tegels op één lijn beginnen. Inhoud uit `PIJLERS`; het blok zelf heeft alleen de kop. |
| `steps` | Een tijdlijn: ronde stappen verbonden door een lijn, zoals het verzuimprotocol (R-E-A-C-T-2U). `steps` met `badge`, `title`, `text`; `anchor` maakt er een #-doel van. |
| `method` | Het REACT-model: vijf letters met uitleg naast het wiel, en een citaat. |
| `values` | De drie waarden op zand, groot als woorden, elk met een feit als label (`value`, `valueLabel`). |
| `latestPosts` | De nieuwste blogartikelen. Zonder gepubliceerde artikelen verdwijnt het blok. |

Bestaande blokken kregen optionele varianten: `intro` met `layout: "center"`,
`imageText` met `imageFit: "cover"` (foto bijsnijden in plaats van heel
tonen), `valueCards` met een `heading`, `twoColumnLists` met `eyebrow`, `text`
en `button`, en `ctaBanner` met `routes` (contactroutes: `icon`, `label`, en
`sub` — het nummer of adres, groot) en een eigen foto (`image`; leeg is de
vaste contactfoto, `CONTACT_FOTO` in `nav.ts`). `routes` staat bewust niet in het sjabloon: de
blokeditor voegt aan een lege lijst een tekstregel toe in plaats van een route.
De blokeditor toont alleen velden die al in de data staan — wil je een
bestaand blok omzetten, voeg het opnieuw toe.

**Ritme en raster.** Elke sectie zet `data-tone` (`white`, `soft`, `band`,
`logos`). Volgen twee secties met dezelfde toon elkaar op, dan haalt
`globals.css` de bovenruimte van de tweede weg — anders verdubbelt de
witruimte. Een nieuw blok hoort dus een `data-tone` te hebben. Tweekoloms-
secties gebruiken `SPLIT`/`LINKS`/`RECHTS` (5 + 6 van 12 kolommen), zodat de
rechterkolom op elke pagina op dezelfde lijn begint. In een groep knoppen is
alleen de eerste een volle knop; de rest wordt outline tenzij de data anders
zegt.

**Het eerste blok is de paginakop.** Begint een pagina met `intro` of
`richText`, dan wordt dat een band met kruimelpad en h1 (`HeaderBand`); een
`hero` toont het kruimelpad boven zijn kop. Het kruimelpad komt uit
`crumbsVoor()` in `nav.ts` en wordt ook als `BreadcrumbList` uitgegeven. Onder
elke dienstpagina staat automatisch "Meer van React2u" met de vijf andere
diensten.

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

## Werkgever en werknemer

De site bedient twee partijen die iets heel anders zoeken: een werkgever wil
diensten en een partner, een zieke werknemer wil weten wat hij moet doen.
Daarom:

- **`/` is een startscherm** (blok `audienceChoice`): eerst kiezen.
- **Elke doelgroep heeft een startpagina**: `/werkgevers` (diensten, werkwijze,
  waarden) en `/werknemers` (ziek, wat nu?, het verzuimprotocol, vragen).
- **Tabbladen Werkgevers | Werknemers** in de topbalk, en per doelgroep een
  eigen menu en knop (`NAV` en `HEADER_CTA` in [`src/lib/nav.ts`](src/lib/nav.ts)).
  Het dienstenmenu staat alleen bij werkgevers.
- **Welke doelgroep geldt**, bepaalt `doelgroepVoorPad()`: `/werknemers` en
  `/verzuimprotocol` zijn van de werknemer; `/werkgevers`, `/diensten` en de
  zes dienstpagina's van de werkgever. Op gedeelde pagina's (contact, blog,
  over ons) geldt de laatste keuze van de bezoeker, bewaard in `localStorage`
  ([`src/lib/doelgroep.ts`](src/lib/doelgroep.ts)); zonder keuze werkgever. De
  server kent die keuze niet — de pagina's zijn statisch — dus op een gedeelde
  pagina rendert eerst het werkgeversmenu en wisselt de browser het direct.
- **Het kruimelpad** laat zien in welk deel je bent: Werkgevers › Diensten ›
  Verzuimbegeleiding WVP, of Werknemers › Verzuimprotocol.

Een nieuwe pagina voor werknemers? Zet het pad in `WERKNEMER_PADEN` in
`nav.ts`, anders krijgt hij het werkgeversmenu.

Het **verzuimprotocol** stond alleen als afbeelding online. Het staat nu als
tekst (blok `steps`) op `/werknemers` en `/verzuimprotocol`, letterlijk
overgenomen uit die afbeelding. Twee kleine aanpassingen: een ontbrekend "je"
("Helaas, je bent ziek") en de verwijzing "waarover je hieronder meer kunt
lezen", die buiten de afbeelding niet meer klopte.

## Tweetalig: Nederlands en Engels

Nederlands staat op de gewone paden, Engels onder `/en` met Engelse slugs
(`/en/employees`, `/en/sick-what-now`, `/en/jobs/...`). De keuzes staan in
[`docs/adr/0001-tweetalig-nl-en.md`](docs/adr/0001-tweetalig-nl-en.md); in het kort:

- **Drie root layouts** (`app/(site)`, `app/en`, `app/admin`) delen `RootHtml`,
  omdat alleen een root layout `lang` op `<html>` zet. Er is geen
  `app/not-found.tsx` meer: `app/(site)/[...rest]` en `app/en/[...slug]` vangen
  onbekende adressen op binnen de juiste sitelayout.
- **De koppeltabel NL-slug ↔ EN-slug** staat in [`src/lib/taal.ts`](src/lib/taal.ts)
  (`SLUGS`), met `EN_KLAAR` voor de pagina's die er in het Engels al zijn.
  `pad()`, `vertaalPad()` en `hreflangVoor()` rekenen daarop: menu's, footer,
  taalknop, hreflang-tags en `sitemap.xml`. Een pagina zonder Engelse versie
  linkt naar het Nederlandse adres; de taalknop gaat dan naar `/en`.
- **Engelse inhoud** staat als JSON in `src/content/en/` (dezelfde blokstructuur
  als het Nederlandse concept, Engelse slug als `slug`) en wordt gelezen door
  `conceptEn()` in `lib/concept.ts`, in elke omgeving: er is geen Engelse
  databasepagina. De Engelse site gebruikt altijd de header en footer van het
  nieuwe ontwerp (`HeaderR2u`/`FooterR2u`).
- **Vaste interfaceteksten** staan in één woordenboek per taal
  (`src/lib/woordenboek/nl.ts`, de bron van het type, en `en.ts`). Server
  components: `woordenboek(taal)`; client components: `useTaal()` uit
  `components/site/Taal.tsx` (de provider zit in `SiteShell`). Blokken krijgen
  de taal als `ctx.lang`.
- **Formulieren** sturen een veld `taal` mee; de server action kiest de
  foutmelding in die taal en bewaart de taal in `contact_messages.lang` en
  `applications.lang` (migratie 0015), met een terugval zonder die kolom. Het
  Postvak IN toont dan een EN-label.
- **Vacatures** hebben optionele Engelse velden (`title_en`, `intro_en`,
  `description_en_md`, migratie 0015). Zonder Engelse titel toont `/en/jobs/<slug>`
  de Nederlandse tekst met "This vacancy is in Dutch".
- **`/en/services`** en **`/diensten`** tonen allebei de vijf labels in de
  blokken van het nieuwe ontwerp, met dezelfde opbouw.
- **Blijft Nederlands:** gemeentepagina's, blog, de juridische PDF's (in de
  Engelse footer met "(Dutch)" erachter), `/inloggen`, `/juridische-documenten`
  en de HTML-sitemap.

Een nieuwe vertaalde pagina: JSON in `src/content/en/`, de slug in `SLUGS` en
`EN_KLAAR`, een import in `concept.ts`. `src/lib/taal.test.ts` controleert dat die
drie kloppen en dat de Engelse teksten geen gedachtestreepjes of Nederlandse
resten bevatten.

## Concepten

Een nieuwe opbouw van een pagina kun je bekijken zonder de live database te
raken. Per pagina staat een concept in [`src/content/`](src/content/) (`home`,
`werkgevers`, `werknemers`, `verzuimprotocol`, `diensten` (het overzicht van de
vijf labels) en `tarieven`, waar alleen de volgorde is hersteld: de oproep stond
boven de paginakop): de blokken, de titel en voor een nieuwe pagina de
SEO-teksten. [`src/lib/concept.ts`](src/lib/concept.ts)
somt ze op.

Het **werkgebied** staat niet in de database: `/arbodienst-provincie-<provincie>`
en `/arbodienst-<gemeente>` komen uit [`src/lib/gemeenten.ts`](src/lib/gemeenten.ts)
(alle 342 gemeenten), met eigen tekst per gemeente in `src/content/plaatsen.json`.
Omdat die pagina's voor negentig procent dezelfde tekst hebben, staan alleen de
gemeenten in `GEINDEXEERDE_GEMEENTEN` (vijftien rond Eindhoven en in Limburg) in
Google, in `sitemap.xml` en op `/sitemap`; de overige gemeentepagina's bestaan
wel, maar met `noindex, follow`. De twaalf provinciepagina's tonen alle gemeenten
en blijven geïndexeerd.

**Alleen op staging** (`VERCEL_ENV=preview`) tonen `/` en `[slug]` het concept
in plaats van de databasepagina — zo zie je de site zoals hij live komt. In
productie komt alles uit de database. Het *ontwerp* eromheen (header en footer
uit het Design-canvas, blog, Werken bij, vacature, 404) hangt sinds de livegang
van oktober 2026 aan `nieuwOntwerp` in `lib/concept.ts` en staat overal aan;
tot die tijd zat ook dat achter `conceptenActief`, waardoor productie na het
overzetten van de concepten nog de oude header en footer zou tonen. Lokaal
staging nabootsen, zonder onderhoudspagina en met de concepten:

```bash
VERCEL_ENV=preview npm run dev
```

**Staging** is een preview-deploy van een branch: elke push naar een andere
branch dan `master` krijgt van Vercel een eigen URL, plus een vaste per branch
(`react2u-git-<branch>-….vercel.app`). De redesign-branch
`redesign-acture-opbouw` heeft daarnaast een korte vaste naam:
**react2u-v5.vercel.app** (in Vercel als domein aan die branch gekoppeld, dus
elke push komt daar vanzelf te staan). Staging vraagt om een Vercel-login. Alleen
react2u.nl is indexeerbaar: elk `*.vercel.app`-adres (ook dat van productie)
krijgt in `next.config.ts` een `X-Robots-Tag: noindex`, en een preview sluit
zijn `robots.txt` (`app/robots.ts`). Let op: staging praat met de
productiedatabase. Een contactformulier of sollicitatie die je daar invult komt
echt binnen, en bezoeken tellen mee in `/admin/bezoek`.

Overzetten naar de database:

```bash
node scripts/concept-naar-sql.mjs --alle > concept.sql
node scripts/concept-naar-sql.mjs --alle --datum 20261006 --seo > concept.sql   # zoals bij de livegang
```

(of een paar namen: `… home werkgevers`) en plak `concept.sql` in de SQL-editor
van Supabase, of draai hem met `supabase db query --linked -f concept.sql`. Het
script praat zelf niet met de database en slaat bestanden zonder
`slug`/`blocks` over (`plaatsen.json`). Alles gebeurt in één transactie, en er
wordt niets verwijderd:

- bestaat een pagina nog niet (zoals `/werkgevers`), dan wordt hij aangemaakt,
  met de titel en SEO-teksten uit het concept;
- een bestaande pagina houdt zijn rij (en dus zijn id); zijn huidige blokken
  verhuizen met zijn oude titel en SEO naar een verborgen pagina
  `<slug>-oud-<datum>` (standaard datum én tijd in UTC, met `--datum` zelf te
  kiezen; alleen als er blokken zijn);
- met `--seo` krijgt een bestaande pagina ook de titel en SEO-teksten uit het
  concept — precies wat staging toont (`[slug]/page.tsx` leest die daar uit het
  concept). Zonder de vlag houdt hij zijn eigen; lege velden in het concept
  laten de huidige waarde staan. De homepage leest zijn SEO altijd uit de
  database (`(site)/page.tsx`), ook op staging.

Terugdraaien kan via het adminpaneel. Bestaat `<slug>-oud-<datum>` al (het
script twee keer met dezelfde `--datum`), dan faalt de transactie en gebeurt er
niets.

**Reserve-inhoud alleen in een migratiefase.** Tot 7 oktober 2026 toonde een
pagina die de database niet (gepubliceerd) had ook in productie het concept,
zodat `/werkgevers` vóór de SQL geen 404 gaf. De SEO-scan van SiteJob liet zien
wat dat kost: een pagina die een beheerder verbergt of verwijdert kwam via het
JSON-bestand gewoon terug, openbaar, indexeerbaar en in `sitemap.xml`. De
publieke sleutel ziet een verborgen pagina niet, dus "verborgen" en "bestaat
niet" zijn voor de code hetzelfde. Daarom is de **publicatiestatus leidend**:
`reserveActief` in [`src/lib/concept.ts`](src/lib/concept.ts) staat op
`false`, een verborgen pagina is een 404 en staat niet in de sitemap. Komt er
een nieuw concept bij, zet de reserve dan aan in dezelfde commit en weer uit
zodra de SQL gedraaid is. Welke inhoud een pagina toont (staging het concept,
anders de database, anders de reserve) staat op één plek,
[`src/lib/pagina.ts`](src/lib/pagina.ts); de Engelse route gebruikt dezelfde
regel om alleen een hreflang naar een Nederlandse pagina te zetten die echt
publiek is. De publieke pagina's zijn 5 minuten gecachet.

## Tarieven

Voor de bezoeker heet deze pagina **Verzuimabonnementen**, op
`/verzuimabonnementen`; `/tarieven` stuurt daar permanent naartoe (vaste lijst
in `src/lib/redirects.ts`). Het bloktype en de bestandsnamen houden `tarieven`.

`/verzuimabonnementen` is één blok van het type `tarieven` (component
[`src/components/site/Tarieven.tsx`](src/components/site/Tarieven.tsx)), met
daaronder de gewone blokken `faqAccordion` en `ctaBanner`. Het concept staat in
[`src/content/tarieven.json`](src/content/tarieven.json); overzetten naar de
database gaat zoals bij de andere concepten (`node scripts/concept-naar-sql.mjs tarieven`).

- **Prijzen staan in de blokdata**, niet in de code: `pakketten[].prijs` is de
  prijs per werknemer per jaar als getal. Per maand, totalen en de vergelijking
  rekent het blok zelf uit. De rijen van de tarievenlijst (`lijst.categorieen`)
  zijn tekst: een bedrag wordt vet, een woord als "per uur" of "op aanvraag"
  een label.
- **De `sleutel` van een pakket is betekenisvol.** De vergelijking en de
  rekenhulp zoeken `compleet` en `basis`; zonder die twee verdwijnen ze.
- **De rekenhulp rekent pas volledig met een uurtarief.** `casemanagerTarief`
  leeg of 0: hij vergelijkt alleen de vaste kosten en zegt dat de uren er bij de
  Verrichtingenbasis nog bij komen. Met een tarief toont hij vanaf hoeveel uur
  Compleet voordeliger is.
- **Offerteformulier.** Eén dialoog in het blok; elke link naar `#offerte` op de
  pagina opent hem, ook vanuit een ander blok (de knop in de `ctaBanner`). Een
  aanvraag komt als bericht in het Postvak IN (onderwerp "Offerteaanvraag: …",
  bedrijf en aantal medewerkers in de tekst) en gaat per mail naar
  `sales@react2u.nl`, of naar `NOTIFY_OFFERTE_TO` als die gezet is. Zonder
  Resend-configuratie staat hij alleen in het Postvak IN, net als een
  contactbericht.

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
cirkels overgenomen (`LOGO_DOTS` in `src/lib/brand.ts`), met de kop op de plek van het woord "React2u".

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

## E-mail vanuit het systeem

[`src/lib/mail.ts`](src/lib/mail.ts) mailt zelf, via de REST-API van Resend (geen
SDK): een melding aan het team bij elk nieuw contactbericht, elke sollicitatie,
offerteaanvraag en elk terugbelverzoek; aan collega's de uitnodiging en de
wachtwoordlink (antwoorden gaat naar wie hem stuurde); en de melding dat iemands
tweestapsverificatie is gewist. Alles gaat via één functie (`verstuur`), die
nooit gooit en wel de reden teruggeeft als Resend weigert.

| Variabele | Voorbeeld | Nodig voor |
|---|---|---|
| `RESEND_API_KEY` | `re_…` | alles |
| `NOTIFY_FROM` | `React2u <noreply@react2u.nl>` | alles |
| `NOTIFY_TO` | `info@react2u.nl` (meerdere: komma-gescheiden) | meldingen bij berichten en sollicitaties |
| `NOTIFY_OFFERTE_TO` | standaard `sales@react2u.nl` | offertes en terugbelverzoeken |
| `RESEND_API_URL` | alleen in tests: een nepserver die vastlegt wat er zou gaan | |

Ontbreekt de sleutel of de afzender, dan slaat de module **stil** over. Dat is
opzet: een inzending staat dan al in Supabase en in het Postvak IN, en een
mailstoring mag een bezoeker nooit een foutmelding geven voor iets wat wél gelukt
is. Bij een uitnodiging staat de link dan op het scherm om zelf door te sturen;
is hij wel gemaild, dan zit de link achter *Komt de mail niet aan?*.

**Instellingen → E-mail** toont per variabele of hij staat, of het domein van de
afzender bij Resend geverifieerd is (lukt alleen met een sleutel die domeinen mag
lezen; anders "onbekend") en heeft een knop *Stuur testmail naar mij* die de
precieze reden van Resend toont als het misgaat.

**Aanzetten.** Domein `react2u.nl` toevoegen in Resend (regio Ireland), de DNS-records
die Resend toont in Vercel zetten, sleutel en adressen in Vercel, opnieuw deployen,
testmail. De records van Resend staan op eigen namen (`resend._domainkey` voor
DKIM, `send.` voor het retourpad met eigen MX en SPF); de MX en SPF van het
hoofddomein, en daarmee de mail van Microsoft 365, blijven ongemoeid. DMARC
(`p=reject`, relaxed) slaagt via de DKIM-handtekening van react2u.nl. Komt de
testmail niet binnen, kijk dan in de quarantaine van Sophos.

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

1. `VASTE_REDIRECTS` (code, via `next.config.ts`) — Next voert die uit vóór
   de middleware, dus die wint altijd. De admin toont de lijst en weigert een
   bron die er al onder valt. Drie delen: `WORDPRESS_REDIRECTS` (308),
   `DOCUMENT_REDIRECTS` en `DIENST_REDIRECTS` (301). Die laatste stuurt de zes
   dienstpagina's van vóór oktober 2026 naar hun label (`/verzuimbegeleiding-wvp`
   → `/recover`, `/verzuimbegeleiding-erd-zw` → `/reflex`,
   `/preventie-en-vitaliteit` en `/risicomanagement` → `/resist`,
   `/begeleiding-en-coaching` en `/trainingen-en-workshops` → `/restart`). Ze staan in de code en
   niet in de tabel omdat ze bij de code van de labels horen en een 301 moeten
   zijn; de middleware geeft alleen 308 en 307. `sitemap.xml` laat elke pagina
   weg waarvan het adres onder deze lijst valt.
   De oude documentpagina's (`/privacy-reglement`, `/klachtenprocedure`,
   `/algemene-voorwaarden`) horen bij `DOCUMENT_REDIRECTS` en gaan naar de pdf's
   in `public/documenten/`; de `-niet`-slugs van de oude WordPress-site
   (`/werkgever-niet/…`) komen op de dichtstbijzijnde nieuwe pagina uit.
   `www.react2u.nl` → `react2u.nl` (308) staat sinds 6 oktober 2026 als
   domeininstelling in Vercel (Project → Domains → www.react2u.nl → Redirect);
   `WWW_REDIRECT` in `next.config.ts` blijft als terugval.
   **Eén stap, ook met schuine streep:** Next's eigen 308 van `/pad/` naar
   `/pad` liep vóór deze lijst, zodat `/verzuimbegeleiding-wvp/` twee keer
   doorverwees. Die ingebouwde redirect staat uit (`skipTrailingSlashRedirect`);
   elke vaste bron accepteert de streep zelf (`metSlash()`, `/oud{/}?`) en de
   middleware haalt hem voor alle andere adressen af, mét querystring. Gebruik
   daarvoor een gewone `URL`, geen `nextUrl.clone()`: NextURL onthoudt de
   streep en zet hem terug.
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
[`NietGevonden`](src/components/site/NietGevonden.tsx) vertelt de VisitTracker dat dit
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

## Bedrijfsbezoek

Onder **Bezoek → Bedrijven**: welke organisaties de site bekeken, wat ze lazen,
hoe warm ze zijn, en in één klik op de bellijst — met de bekeken pagina's in de
notitie, zodat wie belt weet waar het over kan gaan. Een gratis versie van wat
Salesfeed en Leadinfo doen.

**Herkenning** ([`src/lib/companies.ts`](src/lib/companies.ts), lookups in
[`companyLookup.ts`](src/lib/companyLookup.ts)), twee gratis bronnen:

1. *Netwerkeigenaar* via ipinfo Lite (`IPINFO_TOKEN`, gratis account). Werkt
   voor organisaties met een eigen IP-blok: gemeenten, ziekenhuizen, concerns.
2. *Reverse DNS*: veel bedrijven met een vaste zakelijke lijn zetten hun eigen
   domein op hun IP-adres (`mail.bedrijf.nl`), ook als de lijn van KPN of Ziggo
   is. Kost niets, geen derde partij, werkt zonder token.

Providers, carriers, hosting en crawlers vallen af op domein en naam; namen die
een provider automatisch uitdeelt (met het IP-adres erin, of woorden als
`static`, `dsl`, `pool`) ook. Bij twijfel geen bedrijf. De uitkomst per IP wordt
een dag in het geheugen onthouden; het IP-adres zelf komt nergens in de
database. Wat je **niet** ziet: thuiswerkers, mobiel internet en de meeste
kleine bedrijven op een gewone consumentenlijn — daar hebben de betaalde
diensten een eigen databank voor.

**Score** (`score()`): +1 per bezoek, +2 per extra dag dat ze terugkwamen, het
gewicht van de bekeken pagina's (contact 4, diensten 2, over ons 1, blog ½;
hooguit twee keer per pagina), +1 als het laatste bezoek binnen drie dagen was.
Warm vanaf 8, lauw vanaf 4. Wie alleen vacatures bekeek is waarschijnlijk een
sollicitant, wie de werknemerspagina's bekeek een werknemer van een klant; die
blijven koud, met die uitleg erbij. De gewichten staan in `INTENT` — pas ze aan
als het aanbod verandert.

**Bellijst**: een bedrijf wordt gekoppeld aan een bestaande lead via een vaste
koppeling (`company_profiles.lead_id`), het e-maildomein van de lead of een
gelijke bedrijfsnaam — geen losse gelijkenis. Dan staat er *Klant* of *Op
bellijst* bij, en geen tweede lead.

**Niet volgen en vergeten.** Niet volgen verbergt het bedrijf en laat de tracker
bij volgende bezoeken geen bedrijfsnaam meer opslaan (`company_ignored()`,
tien minuten onthouden). Vergeten haalt daarnaast de naam uit alle eerdere
bezoeken — voor een verzoek om verwijdering; bij een eenmanszaak is de
bedrijfsnaam een persoonsgegeven.

Werkt vóór migratie 0010 al met herkenning (de tracker valt terug op een insert
zonder de nieuwe kolommen); niet volgen en koppelen aan de bellijst pas daarna.
Zonder `ANALYTICS_SALT` wordt er niets geregistreerd.

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
  (zie *E-mail vanuit het systeem*, en Instellingen → E-mail met testmail);
  zolang `RESEND_API_KEY`, `NOTIFY_TO` en `NOTIFY_FROM`
  niet in Vercel staan, wordt er niets verstuurd en mist wie niet inlogt nog
  steeds inzendingen. Stand 6 oktober 2026: in Production ontbreken
  `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO`, `NOTIFY_OFFERTE_TO`
  (sales@react2u.nl) en `NEXT_PUBLIC_SITE_URL` (https://react2u.nl; de code valt
  daar zelf op terug). In DNS staat niets van Resend (geen
  `resend._domainkey`, geen `send.`-subdomein, SPF zonder amazonses) en DMARC
  staat op `p=reject`: zonder DKIM via Resend wordt mail namens @react2u.nl
  geweigerd. Eerst het domein in Resend verifiëren, dan de sleutels zetten.
- **Toegang.** Het adminwachtwoord en een Vercel-token zijn buiten de repo gedeeld;
  het wachtwoord moet gewijzigd en het token ingetrokken worden.
- **Livegang redesign (6 oktober 2026, branch `livegang`, PR #4)**. De
  productiedatabase stopte bij `applications_updated_at` (6 augustus). Op
  6 oktober zijn met akkoord van Rens gedraaid: 0007 t/m 0010 en 0013 (idempotent,
  `backups/01-migraties-0007-0013.sql`), 0014, 0015_engels, 0016 en de concept-SQL
  (`backups/02-concepten-20261006.sql`, 20 pagina's; de oude blokken van acht
  pagina's staan op `<slug>-oud-20261006`). Alle 20 pagina's zijn daarna blok
  voor blok gelijk aan `src/content/` bevestigd. Vooraf is een data-export
  gemaakt (`backups/2026-10-06-voor-livegang.sql`); Supabase maakt daarnaast
  dagelijks een fysieke back-up. Nog te doen bij de livegang: de code van
  `livegang` op master (anders oude header en footer, en cv-upload zonder
  policy), adminschermen nalopen, optioneel `backups/04` (zes oude
  dienstpagina's uit publicatie) en `backups/05` (`-oud-20260929` weg),
  onderhoudsmodus uit.
- **Bedrijfsherkenning aanzetten**: `ANALYTICS_SALT` en `IPINFO_TOKEN` staan in
  Vercel; migratie 0010 hoort bij de livegang-SQL. Daarna de privacyverklaring
  bijwerken — zie het voorstel onder *Bewaartermijnen en privacy*.
- **Schema binnenhalen.** De live database heeft wijzigingen die niet in de
  migraties staan (zie *Valkuilen*). Eén keer `supabase db dump` naar de repo
  maakt het weer één bron.
- **Audit oktober 2026: database en Vercel zijn bij; de code moet nog naar
  `master`.** Stand 6 oktober 2026: migraties 0013 en 0014 zijn gedraaid,
  `CRON_SECRET` en `SUPABASE_SERVICE_ROLE_KEY` staan in productie én preview.
  Omdat 0014 het anonieme uploadrecht op `cvs` weghaalt, **mislukt op de
  huidige productieversie (`master`, nog zonder `src/lib/cvs.ts`) elke
  sollicitatie met cv** tot de redesign live is — bewust zo gekozen op
  6 oktober, met productie in onderhoudsmodus. Optioneel Turnstile:
  `TURNSTILE_SECRET_KEY` en `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Vercel Cron
  draait alleen op productie, dus de opschoning begint pas als deze code op
  `master` staat.
- **Privacy- en cookieverklaring**: op 6 oktober 2026 is achter beide PDF's een
  gedateerde aanvulling gezet (`scripts/juridische-aanvulling.mjs`): de keuze
  Statistiek, bedrijfsherkenning op toestemming met ipinfo.io als verwerker,
  terugbelverzoek, limiet per IP, bewaarvinkje bij sollicitaties en de
  conversiemeting. Laat de FG er nog naar kijken. Zet je de herkenning op
  gerechtvaardigd belang, dan moet onderdeel B van die aanvulling mee (de
  afweging staat als voorstel onder *Bewaartermijnen en privacy*).

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
root-layout, zodat het adminpaneel die query niet draait. Een pagina zonder
eigen omschrijving **laat de sleutel weg** (`metOmschrijving()` in
`seo.ts`) en erft zo die standaardtekst; `description: undefined` wiste hem
juist. De eigen SEO-omschrijving gaat compleet mee (`omschrijving()`), alleen
een afgeleide tekst (intro, samenvatting) wordt met `kort()` ingekort: de
155 tekens zijn een redactiehulp in het overzicht, geen mes. De homepage
zonder eigen SEO-titel heet "Persoonlijke arbodienst en verzuimbegeleiding •
React2u" (`seo.homeTitel` in het woordenboek), niet "Home".

**`og:url` per pagina.** Next voegt metadata shallow samen, dus een pagina
die geen `openGraph` zet erft het hele object van de layout, inclusief de
`og:url` van de homepage. Daarom levert [`src/lib/og.ts`](src/lib/og.ts)
(`openGraphVoor()`) voor elke route het complete object: eigen url, eigen of
standaardafbeelding, type, siteName en locale. Titel en omschrijving blijven
weg; Next vult die zelf uit de pagina.

**Niet in Google:** het adminpaneel (noindex in `admin/layout.tsx` plus een
`X-Robots-Tag` in `next.config.ts`; `robots.txt` laat `/admin` bewust open,
anders ziet een crawler die noindex nooit) en de 404-pagina's (eigen
`robots: noindex` naast de tag die Next zelf zet, zodat er niet ook een
"index, follow" uit de layout in staat). De hoofdkop van een labelpagina
(`DienstLabel`) noemt merk én dienst: "React2u Recover® Verzuimbegeleiding."

**Databasefouten zijn geen 404.** De helpers in
[`src/lib/content.ts`](src/lib/content.ts) gooien een `DatabaseFout` als
Supabase een fout geeft, in plaats van `null` of een lege lijst terug te
geven. Zo wordt een storing geen 404, lege sitemap of oude inhoud: Next houdt
bij een fout tijdens de revalidatie de laatst gelukte versie in de cache, en
een verse aanvraag krijgt een 500 (voor Google tijdelijk). Een build zonder
bereikbare database faalt daardoor ook, en dat is de bedoeling.

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
admin, tenzij ze bij een codewijziging horen (zoals `DIENST_REDIRECTS`); zie
*Doorverwijzingen en 404's*.

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

**Sollicitaties staan er bewust niet in**, want daar hangt een cv-bestand aan,
en dat moet via de Storage-API weg. Alleen de databaserij verwijderen laat de
bytes in de bucket staan — het lijkt dan gewist terwijl het er nog is, en dat is
voor de AVG slechter dan niets doen. Daarom doet **Vercel Cron** het:
`vercel.json` roept dagelijks om 04:30 `/api/cron/opruimen` aan met
`Authorization: Bearer <CRON_SECRET>`. Die route haalt met de
service-role-sleutel alle sollicitaties op, bepaalt met `retention.ts` welke
verlopen zijn, verwijdert eerst het cv (en controleert dat het weg is) en dan
de rij. Zonder `CRON_SECRET` of `SUPABASE_SERVICE_ROLE_KEY` in Vercel doet hij
niets; het dashboard meldt dat ("Sollicitaties automatisch opschonen"). Het
antwoord van de route (aantallen) staat in de Vercel-logs.

De termijnen ([`src/lib/retention.ts`](src/lib/retention.ts)): afgerond
(afgewezen of aangenomen) na acht weken, nog open na drie maanden, en **een
jaar als de sollicitant daar toestemming voor gaf** — het vinkje "Bewaar mijn
gegevens een jaar" in het formulier, kolom `applications.retain_longer`
(migratie 0013). Dat volgt de richtlijn van de Autoriteit Persoonsgegevens
(vier weken na afloop, langer alleen met toestemming). Er is geen datum van
afronding, dus de termijn loopt vanaf binnenkomst met ruimte voor de
procedure. Het Postvak IN wijst ze nog steeds aan (filter *Bewaartermijn
verstreken*, verwijderen in één keer via `bulkInbox`), voor wie eerder wil
ingrijpen dan de nachtelijke run. Ander beleid? Pas de getallen daar aan, en de
privacyverklaring mee.

De **privacyverklaring** is alleen nog een PDF (`/documenten/privacyverklaring-react2u.pdf`,
zie [`src/lib/documenten.ts`](src/lib/documenten.ts)), gelinkt in de footer en
onder alle formulieren. `/privacyverklaring` en `/cookieverklaring` verwijzen
met een 301 door naar de PDF (`DOCUMENT_REDIRECTS` in `redirects.ts`); de oude
databasepagina gaat met migratie 0011 uit publicatie. **Zet je `IPINFO_TOKEN`
of Resend aan, dan moet die verklaring mee**: er komt dan een verwerker bij
(ipinfo.io, Resend) die er nu niet in staat.

De **cookiemelding** ([`CookieBanner.tsx`](src/components/site/CookieBanner.tsx))
staat in `SiteShell`: wel op de 404, niet in het adminpaneel. De site zet
precies één cookie (`r2u_cookie_consent`, 12 maanden, onthoudt je keuze) en
bewaart de doelgroepkeuze in `localStorage`; de bezoekstatistiek werkt zonder
cookies. Sinds oktober 2026 (`CONSENT_VERSION` 2) is er één keuze,
**Statistiek**: die gaat niet over een cookie maar over de
**bedrijfsherkenning** — om een bezoek vanaf een bedrijfsnetwerk tot dat
bedrijf te herleiden gaat het IP-adres naar ipinfo.io, en dat vraagt een
grondslag. `VisitTracker` stuurt de keuze (aan, uit, of nog niets) mee met elk
bezoek; `/api/track` beslist met `mayIdentify()` in
[`src/lib/tracking.ts`](src/lib/tracking.ts). Het bezoek zelf wordt altijd
geteld, zonder bedrijf en zonder dat het IP ergens heen gaat.

Welke grondslag geldt, staat in `site_settings.tracking`
(Instellingen → *Bedrijfsherkenning en privacy*):

- **`toestemming`** (standaard): alleen bij een uitdrukkelijk "aan". De melding
  vraagt met Accepteren en Weigeren even zichtbaar; Escape of wegklikken is
  niet toestemmen.
- **`altijd`**: gerechtvaardigd belang. De melding is dan een mededeling met
  een uitknop ("Prima" / Instellingen); wie Statistiek uitzet maakt bezwaar en
  wordt ook dan niet herkend. Alleen kiezen als de privacyverklaring de
  afweging bevat (welk belang, alleen de organisatie en nooit een persoon, geen
  IP bewaard, hoe je bezwaar maakt) — zie het voorstel hieronder.

*Cookie-instellingen* in beide footers opent de melding opnieuw. Wat er in de
browser staat, beschrijft de cookieverklaring, alleen als PDF
(`/documenten/cookieverklaring-react2u.pdf`); die moet de keuze Statistiek nog
noemen. Komt er een echte cookie- of scriptcategorie bij: toevoegen in
`categorieen()`, het script alleen laden als `hasConsent()` waar is,
`CONSENT_VERSION` ophogen en een nieuwe PDF onder dezelfde naam neerzetten.

De cookieverklaring zegt over bedrijfsherkenning nu: "Komt een bezoek vanaf een
bedrijfsnetwerk, dan kan daar de naam van dat bedrijf bij staan — nooit de naam
van een persoon." Voorstel om dat te vervangen (en voor de privacyverklaring,
als grondslag voor `altijd`):

> Komt een bezoek vanaf het netwerk van een organisatie, dan leiden we uit het
> IP-adres af welke organisatie dat is: aan de eigenaar van het netwerk (via
> ipinfo.io) of aan de naam die de organisatie zelf op haar internetlijn heeft
> gezet. Het IP-adres bewaren we niet, alleen de naam van de organisatie. Bij
> een eenmanszaak kan dat een persoonsnaam zijn; wil je niet dat we jouw
> organisatie herkennen, mail ons, dan halen we de naam weg en leggen we hem
> niet meer vast.

**Formulieren: spam en misbruik.** Elk publiek formulier gaat door dezelfde
poort in [`src/app/(site)/actions.ts`](src/app/(site)/actions.ts): een
honeypot (bot krijgt "gelukt" te zien), een **limiet per IP én per soort**
([`src/lib/rateLimit.ts`](src/lib/rateLimit.ts): 5 per uur per bezoeker, 3
voor sollicitaties, 60 per uur in totaal — geteld door de databasefunctie
`throttle()` uit migratie 0013 op een gezouten hash, het IP komt de database
niet in; ontbreekt de functie, dan staat de limiet uit en zegt de serverlog dat
één keer), optioneel **Cloudflare Turnstile**
([`src/lib/turnstile.ts`](src/lib/turnstile.ts), `TurnstileField.tsx`; aan
zodra `TURNSTILE_SECRET_KEY` en `NEXT_PUBLIC_TURNSTILE_SITE_KEY` gezet zijn,
dan ook de CSP in `next.config.ts` en de cookieverklaring), en een controle of
het e-mailadres de vorm van een e-mailadres heeft (`geldigEmail()` in
`lib/formulier.ts`). Een cv gaat via `uploadCv()` met de service-role-sleutel
de bucket in, zodat anon daar geen schrijfrecht meer nodig heeft (0014).

**Conversies.** Elk verstuurd formulier schrijft één rij in `conversions`
(soort + pagina uit de Referer, migratie 0013; `recordConversion()` in
[`src/lib/conversionsDb.ts`](src/lib/conversionsDb.ts), nooit een fout naar
de bezoeker). `/admin/bezoek` toont het totaal, het aandeel van de bezoekers,
per soort, en per pagina met bezoekers en percentage
([`src/lib/conversions.ts`](src/lib/conversions.ts)). Twaalf maanden bewaard,
net als bezoek. Een terugbelverzoek uit de belbalk telt als `terugbel`.

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
`0008_versies.sql` (`revisions` en de trigger), `0009_cv_verwijderen.sql`
(verwijderpolicy op de bucket `cvs`), `0010_bedrijfsbezoek.sql`
(`company_domain`/`company_source` op `page_views`, `company_profiles`,
`company_ignored()`), `0011` en `0012` (data: privacyverklaring uit publicatie,
og_image leeg), `0013_formulieren_conversies_bewaren.sql` (`rate_limits`,
`throttle()`, `conversions`, `applications.retain_longer`),
`0014_cv_upload_via_server.sql` (publieke uploadpolicy op `cvs` weg — pas als
`SUPABASE_SERVICE_ROLE_KEY` ook in Preview staat) en
`0016_rechten_functies.sql` (EXECUTE op security definer-functies alleen voor
wie ze nodig heeft; `has_perm()` houdt anon, want de policies "public read …"
roepen hem aan). Supabase-project `tumwtappyegkjabtmold`.

De tabel `supabase_migrations.schema_migrations` in de live database gebruikt
tijdstempelversies met eigen namen (`init_react2u_cms` = 0001, enz.) en
bevat ook vier wijzigingen die rechtstreeks live zijn gedaan
(`security_hardening`, `anon_velden_vastzetten`, `opruimen_weesobjecten`,
`bewaartermijnen`: o.a. `force_submission_defaults()`, aparte policies
"settings seo"/"settings overig", `opruimen_verlopen_gegevens()` met zijn
pg_cron-job). Migraties die met `supabase db query` worden gedraaid komen daar
niet vanzelf in; de livegang-SQL (`backups/01-migraties-0007-0013.sql`,
lokaal) registreert ze expliciet.

**Tests:** `npm test` draait Vitest over de pure modules in `src/lib`
(zoeken, doorverwijzingen, versies, dashboard, bewaartermijn, mediagebruik,
bedrijfsherkenning). Die bevatten de
regels waar het op aankomt; de schermen eromheen zijn dun.
