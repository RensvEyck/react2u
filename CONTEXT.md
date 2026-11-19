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
| **Artikel** (`posts`) | Blogartikel op `/blog/<slug>`. Markdown-body, statussen `draft` en `published`. `published_at` wordt bij de eerste publicatie gezet en blijft daarna staan, zodat een latere correctie de datum niet verzet. De body kent de mini-markdown van [`lib/md.tsx`](src/lib/md.tsx): `## ` voor een hoofdstuk (en de inhoudsopgave), `### ` voor een tussenkop, alinea's, `- ` lijsten, `**vet**` en `[links](/pad)`. Een link mag naar een eigen pad, een anker, http(s), mail of telefoon; iets anders blijft tekst ([`lib/mdInline.ts`](src/lib/mdInline.ts)). Geen tabellen of genummerde lijsten. |
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
| **Super admin** | De toprol (`superadmin`, `sort` 0). Systeemrol: houdt altijd alle rechten (twaalf sinds 0044) en is niet te verwijderen. Als enige met het recht `gebruikers` — uitnodigen en rollen verdelen is hieraan voorbehouden. |
| **Beheerder** | Alles behálve `gebruikers` en `omzet`. Kan de hele site en alle inzendingen beheren, maar niemand uitnodigen of van rol wisselen, en ziet de omzet niet. |
| **Werknemer** (`werknemer`) | De rol voor een collega die alleen zijn eigen weekevaluatie invult (migratie 0044): één recht, `weekevaluatie`. Ziet na het inloggen het dashboard, Weekevaluatie en Account, niets van sales, omzet of de site. Geen systeemrol: de super admin mag er rechten bij zetten. Zie *Weekevaluatie*. |
| **Weekevaluatie** (`weekevaluaties`) | Eén rij per collega per ISO-week (de maandag): zeven cijfers van 1 tot 10, vrije velden en een veld om iets te melden of te delen, in de laatste week van de maand zes maandvragen erbij en in de laatste week van het kwartaal een terugblik, als jsonb op de sleutels uit `VRAGEN` in [`src/lib/weekevaluatie.ts`](src/lib/weekevaluatie.ts). Deze en vorige week zijn te wijzigen, daarna staat de week vast. Zie *Weekevaluatie*. |
| **Kwartaaldoel** (`weekevaluatie_doelen`) | Eén tot drie doelen per collega per kwartaal, vastgelegd in de kwartaalmeeting (0045). De collega geeft elke week aan hoe ver hij kwam. |
| **Melding** (in de weekevaluatie) | Iets wat een collega wil melden of delen: een zorg, een idee, een compliment, een vraag. Komt in de kwartaalmeeting, of meteen per mail bij de super admin als de collega dat aanvinkt (0046). |
| **Twee zware weken** | Twee weken achter elkaar een 4 of lager voor energie of voor "werk paste in de tijd". Geeft meteen een mail aan wie het kwartaaloverzicht mag zien, en een melding op diens dashboard. |
| **Inwerkreis** (`inwerkreizen`) | De eerste negentig dagen van een nieuwe collega (0050): een sjabloon per functie (`inwerk_sjablonen`: Casemanager Verzuim, Backoffice, Sales / accountmanager, begonnen leeg) met stappen in drie fasen (tot dag 30, 60 en 90), elk een taak, een oefencasus of een mijlpaal. Eén reis per collega, met een eerste werkdag (dag 1) en de naam van een buddy. Per collega aan of uit te zetten (0051): uit verbergt de reis voor de collega, alles blijft bewaard. De collega vinkt taken en oefencasussen af; een mijlpaal tekent het beheer (recht `omzet`) af. |
| **Prognose** | Hoeveel werknemers React2u de komende twaalf maanden begeleidt en hoeveel fte casemanagement dat vraagt, tegenover de bezetting, met de weekevaluaties als controle (`/admin/prognose`, 0049). Zie *Prognose*. |
| **Ingangsdatum** (`offertes.ingangsdatum`) | Wanneer de dienstverlening van een offerte start. Voor de prognose; ook na tekenen nog te verschuiven. |
| **Recht** | Toegang tot één onderdeel van het paneel, bv. `bellijst` of `paginas`. De sleutels staan in [`src/lib/permissions.ts`](src/lib/permissions.ts) én in de RLS-policies — hernoemen vraagt dus een migratie. |
| **Commandopalet** | Zoekveld over het hele paneel: ⌘K, Ctrl+K of `/`. Vindt schermen, acties, pagina's, tekst ín blokken, artikelen, vacatures, inzendingen, leads en gebruikers — alleen wat je mag zien. Zie *Commandopalet en dashboard*. |
| **Doorverwijzing** (`redirects`) | Een oud adres dat naar een nieuw adres stuurt, beheerd onder SEO → Doorverwijzingen. Permanent (308) of tijdelijk (307). Zie *Doorverwijzingen en 404's*. |
| **404** (`missing_paths`) | Een adres waarop een bezoeker "niet gevonden" kreeg, met een teller en waar de link stond. Geen persoonsgegevens. |
| **Versie** (`revisions`) | Momentopname van een pagina, blok, artikel, vacature of instelling, gemaakt door een databasetrigger bij elke opslag. Zie *Versies en prullenbak*. |
| **Prullenbak** | Wat verwijderd is en nog terug kan (`/admin/prullenbak`). Geen tabel: de laatste versie van rijen die niet meer bestaan. Inzendingen en leads komen er nooit in. |
| **Taal** (`Taal`) | `nl` of `en`. Nederlands op de gewone paden, Engels onder `/en`. Zie *Tweetalig*. |
| **Koppeltabel** (`SLUGS`) | NL-slug ↔ EN-slug in [`src/lib/taal.ts`](src/lib/taal.ts), de enige plek die zegt welke Engelse URL bij een pagina hoort. |
| **Bewaartermijn** | Voor sollicitaties: hoe lang ze mogen blijven staan. Bepaald in [`src/lib/retention.ts`](src/lib/retention.ts); het Postvak IN wijst aan wat erover is, en `api/cron/opruimen` verwijdert het dagelijks. |
| **Conversie** (`conversions`) | Eén verstuurd formulier (`contact`, `offerte`, `sollicitatie`, `terugbel`) of een klik op bellen of mailen (`bel`, `mail`, migratie 0047), met de pagina waar het stond, de herkomst, de bron en de landingspagina. Geen persoonsgegevens. Zie *Bewaartermijnen en privacy*, "Conversies". |
| **Herkomst** (`herkomst`) | Hoe een werkgever ons vond, uit één vaste keuzelijst in [`src/lib/herkomst.ts`](src/lib/herkomst.ts): google, ai, linkedin, verwijzing, partner, belbureau, anders. De bezoeker kiest hem in contact en kennismaken; hij reist mee naar het Postvak IN, de offerte en de kaart op het klantenbord (migratie 0047). Naast de herkomst staan de **bron** (wat de browser zag: verwijzer of campagne, `BronOnthouden.tsx`) en de **landingspagina** (de eerste pagina van het bezoek). |
| **Belbalk** | Vaste balk onderaan het scherm op de telefoon, alleen op werkgeverspagina's: bellen of een terugbelmoment aanvragen (`BelBalk.tsx`, `lib/belbalk.ts`). Een terugbelverzoek is een bericht met onderwerp "Terugbelverzoek". |
| **Klantevaluatie** (`evaluaties`) | Het jaarlijkse evaluatieformulier als losse module onder Documenten: één persoonlijke link, de klant vult online in. Zie *Documenten en klantevaluatie*. |
| **Tarievenjaar** (`tarieven`) | Instelling `{jaar, geldigTot}`. De tariefblokken zetten het jaar in hun bovenkopje en tonen de geldigheid; per 1 januari pas je hier het jaar aan en in de blokken de bedragen. |
| **Offerte** (`offertes`) | Een voorstel aan één klant, opgesteld in `/admin/offertes`. Statussen `concept`, `verstuurd`, `getekend`, `afgewezen` (de klant: niet akkoord) en `ingetrokken`; "bekeken" en "verlopen" leidt het beheer af. Nummer `jjjj-nnnn`. Zie *Offertes*. |
| **Offerteregel** | Eén onderdeel van een offerte (`regels`, jsonb) met prijs, eenheid en soort: `vast`, `optie` (klant zet aan/uit), `keuze` (precies één uit zijn `groep`) of `tarief` (prijs bij gebruik, telt niet mee). Vorm en rekenregels in [`src/lib/offertes.ts`](src/lib/offertes.ts). |
| **Offertevorm** (`vorm`) | Soort offerte: verzuimbegeleiding, casemanagement Reflex (flexbranche), RI&E, PAGO, verzuimtraining, spoor 2, werkfittraject of arbeidsdeskundig onderzoek (migraties 0025 en 0029). Bepaalt het label in het beheer en wat het veld *betreft* heet (werknemer, locatie, deelnemers). |
| **Offertesjabloon** | Beginpunt van een nieuwe offerte per vorm: titel, aanhef, uitleg, onderdelen, voorwaarden, vervolgstappen en geldigheid. Standaard in [`src/lib/offerteSjablonen.ts`](src/lib/offerteSjablonen.ts); aanpassingen van het team in `offerte_sjablonen`. |
| **Offertelink** | `/offerte/<token>`: de pagina waar de klant kiest en tekent. Het token (64 hex) is het enige geheim; *Nieuwe link* in het beheer maakt de oude ongeldig. |
| **Brochure** (`brochures`) | Een persoonlijke brochure met alle zes diensten en de prijslijst voor één prospect, nog vóór er een offerte is (migratie 0030, `/admin/brochures`). Statussen `concept`, `verstuurd`, `ingetrokken`; de link `/brochure/<token>` werkt als een offertelink, met pdf. De inhoud komt van de labelpagina's en het tarievenblok en is niet per brochure aan te passen; alleen het persoonlijke woord en de afzender. |
| **Abonnement** | Een getekende offerte als bron van omzet: vanaf de maand van tekenen het jaarbedrag gedeeld door twaalf, tot hij is beëindigd (`abonnementen_gestopt`, migratie 0035). Zie *Omzet en uren*. |
| **Medewerker** (`medewerkers`) | Iemand van React2u die declarabele uren schrijft, met contracturen per week, een norm en een uurtarief. Heeft geen login: de super admin vult de uren in. Niet te verwarren met *medewerkers* op een offerte (het aantal werknemers van de klant). |
| **Declarabiliteit** | Declarabele uren gedeeld door de beschikbare uren (contracturen min afwezig), in procenten, tegenover de norm van de medewerker. |
| **Los opgevoerd** (`losse_opdrachten`) | Een klant met een abonnement of een losse opdracht die buiten de offertes om is afgesproken (migratie 0036, `/admin/verkoop/los`). Telt mee als getekend in verkoop en omzet. |

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
Heeft het account al een authenticator, dan vraagt de landingspagina eerst de code en
pas daarna het wachtwoord: Supabase weigert een nieuw wachtwoord op een sessie zonder
code (`insufficient_aal`) zodra tweestaps aanstaat, want de link bewijst alleen het
mailadres (Cindy liep daar op 22 okt 2026 op vast). Telefoon kwijt: eerst *Tweestaps
herstellen*, daarna de pagina verversen of een nieuwe link.

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

**Tweestapsverificatie is verplicht** (sinds PR #9, op verzoek van Rens).
`requireAdmin()` eist aal2: wie in deze sessie alleen een wachtwoord gaf, gaat
naar de codestap (`?stap=code`) of, zonder authenticator, naar het instelscherm
(`?stap=instellen`). Daarvóór kon je het instellen overslaan door `/admin` te
openen, en hadden vier van de zes beheerders het niet aan (21 okt 2026). Uitschakelen kan
niet meer; *Nieuwe telefoon instellen* op Account vervangt de oude authenticator
(die blijft anders staan en het inlogscherm vroeg dan mogelijk zijn code).
Telefoon kwijt: een collega met `gebruikers` wist hem bij Gebruikers.
Migratie [0021](supabase/migrations/0021_tweestaps_verplicht.sql) legt hetzelfde
vast in de database: `is_admin()` en `has_perm()` eisen de claim `aal = aal2`,
zodat een gestolen wachtwoord ook via de REST-API niets van het beheer laat zien.
Alleen de eigen rij in `admins` blijft op aal1 zichtbaar (inlogscherm en
onderhoudspoort). Draai 0021 pas nadat de code met verplichte tweestaps live staat.

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

**Het zijmenu blijft kort** (Rens, 19 nov 2026: "maak de sidebar een stuk
minder uitgebreid"): wat je dagelijks gebruikt staat los (Dashboard, Postvak
IN, Bellijst, Klantenbord, Documenten, Partners, Weekevaluatie), de rest zit in
drie inklapbare groepen (`groep` op het item, `NAV_GROEPEN`): **Cijfers**
(Verkoop, Omzet, Prognose), **Website** (Pagina's, Blog, Vacatures,
Sollicitaties, Berichten, Bezoek, Media, SEO) en **Beheer** (Gebruikers,
Instellingen). Een groep klapt vanzelf open als je in een van zijn schermen
zit; dicht blijven de links in de pagina maar `inert`. Mag je maar één scherm
uit een groep zien, dan staat dat los. Een documentsoort krijgt geen eigen
regel maar valt onder Documenten (`ook` laat Documenten oplichten op
`DOCUMENT_PADEN`). Account staat onder je naam onderaan de zijbalk, niet meer
als regel. Zo ging het menu van 25 naar 10 regels; een nieuw scherm hoort dus
meestal in een groep, als tab, of alleen in het palet.

**Mijn React2u** (Rens, 19 nov 2026: "een eigen plek"): wie alleen rechten
heeft die over jezelf gaan (`EIGEN_RECHTEN`, nu alleen `weekevaluatie`; dus
een werknemer), ziet het beheer als eigen plek. Bovenaan staat "Mijn React2u"
in plaats van "SYSTEEMBEHEER", en er is geen zoekveld, geen ⌘K-palet, geen
Bekijk website (ook niet in het accountmenu) en geen tip over ⌘K
(`isMijnReact2u`). Op het dashboard staat dan **Mijn verloop**: de eigen
energie, tijd en plezier per week van het kwartaal, drie kleine lijnen met
dezelfde as van 1 tot 10 (`verloop`, `VERLOOP_SCHALEN`, `Lijn` in
Grafiek.tsx). Een week zonder evaluatie is een gat in de lijn. Er staat bij
dat je hetzelfde verloop in de kwartaalmeeting bespreekt: het is niet geheim
voor het beheer. Teksten voor werknemers noemen geen namen.

**De inwerkreis** (Rens, 19 nov 2026: "30, 60 en 90 dagen per functie, met
een buddy, oefencasussen en mijlpalen"; gekozen: lege sjablonen, de buddy
alleen een naam). Het beheer vult onder Beheer → Inwerken (`/admin/inwerken`,
recht `omzet`) per functie een sjabloon en start een reis voor een collega
met een inlog. Een reis wijst naar het sjabloon, niet naar een kopie: een
stap erbij verschijnt meteen ook in lopende reizen, en een sjabloon in
gebruik kan niet weg. De collega ziet Inwerkreis in het menu (alleen wie een
reis heeft: `alleenMet` en `NavVlaggen`, nooit in het palet), een kaart op het
dashboard met waar je staat en wat aan de beurt is (eerst wat uit een eerdere
fase openstaat), en `/admin/inwerkreis` met per fase de stappen. Afvinken gaat
meteen (optimistisch, `StapVink`); de policies laten een collega alleen taken
en oefencasussen van de eigen reis afvinken, een trigger weigert een stap van
een ander sjabloon en vult `door` in. Openstaande stappen uit een eerdere fase
tellen op het dashboard als aandacht. Afronden houdt alles bewaard; de kaart
verdwijnt dan van het dashboard. Collega's om een reis voor te starten komen
uit `inwerk_collegas()`, omdat de gebruikerslijst alleen met het recht
`gebruikers` leesbaar is.

**Kiezen en aan of uit** (0051; Rens, 19 nov 2026: "we moeten het kunnen
selecteren en aan of uit zetten", over het inwerktraject). Onder Gebruikers
staat bij elke collega (voor wie ook het recht `omzet` heeft) een keuzelijst
met de functies en een schakelaar. Een functie kiezen bij iemand zonder reis
start er een, met vandaag als eerste werkdag; bij iemand met een reis wisselt
het de functie, en de vinkjes van eerst blijven bewaard (ze horen bij de
stappen, niet bij de functie). De schakelaar staat ook bovenaan de pagina van
de reis. Uit (`inwerkreizen.aan`): geen menu-item, geen dashboardkaart, op het
eigen scherm alleen dat hij uit staat, en `eigen_inwerkreis()` telt een reis
die uit staat niet mee, dus afvinken weigert de database dan.

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
De merkkleuren uit het logo zijn voor vlakken en stippen, niet voor letters:
roze `#E61674` en grijs `#77758F` haalden 4,44:1 (net onder AA), teal, oranje
en blauw 2,4 tot 3,2. Tekst en knoppen in een merkkleur gebruiken sinds de
HALO-scan (november 2026) de donkerdere tinten uit
[`src/lib/kleur.ts`](src/lib/kleur.ts) (`inkt()`: roze `#D4136A`, grijs
`#67657F`, teal `#007A6D`, oranje `#B45600`, blauw `#2277A8`); `PINK` en
`MUTE` in `Gedeeld.tsx`, `K.magenta` en de roze knoppen in `globals.css` zijn
die tinten. Vlakken, stippen, randen en het logo houden de logokleur.

**Namen en bediening.** De taalknop (`Taalwissel.tsx`) heeft geen
`aria-label` meer: de zichtbare tekst "NL"/"EN" is de naam (een label
"Nederlands"/"English" gaf een label-in-name-fout), met `lang` en `hrefLang`
voor de taal. Een `Strook` (de kaartenrij die je op de telefoon swipet,
`Gedeeld.tsx`) is een benoemd gebied met `tabIndex={0}` (`label` is
verplicht), zodat hij ook met het toetsenbord te scrollen is; die tabstop
blijft op een laptop, waar de rij een raster is.

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
| `audienceChoice` / `homeSplit` | Het startscherm, een splitscreen. De live versie is `homeSplit` (`HomeNeutraal.tsx`, ontwerp "Home neutraal"): een smalle, zichtbare kopregel met de h1 (`.hn-kopregel`; tot november 2026 stond de h1 als `sr-only`, de HALO-scan wilde hem zichtbaar), daaronder de twee fototegels met een bol erop. Op de telefoon onder elkaar, samen met de kopregel in het eerste scherm (`--h` in `globals.css` rekent de kopregel mee). De tegels hebben geen `aria-label`: de inhoud is de naam. Alleen de eerste foto krijgt voorrang (`priority` + `fetchPriority="high"`), de tweede laadt lui. Het oudere blok `audienceChoice` (`BlockRenderer.tsx`) werkt zo: een smalle kopregel met de h1, daaronder werkgever \| werknemer als twee paginavullende foto's van rand tot rand (`choices`: `doelgroep`, `title`, `text`, `button`, `image`, `focus`, `href`; `focus` is de `object-position`). Ook op de telefoon naast elkaar, zodat beide keuzes boven de vouw staan; daar vallen `text` en de knoptekst weg (ronde pijl). De helft onder de muis wordt breder (`.split` in `globals.css`). Het donkere verloop zit alleen achter de tekst; wit haalt daarop gemeten 3,2:1+ (kop) en 6:1+ (tekst). Eronder één regel vertrouwen (`trust`). Een terugkerende bezoeker ziet "Je vorige keuze". |
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
  `/verzuimprotocol` zijn van de werknemer; `/werkgevers`, `/diensten`,
  `/verzuimabonnementen`, `/kennismaken`, het werkgebied (`/arbodienst-…`) en
  de zes labelpagina's van de werkgever (voor november 2026 gaven de
  abonnementen, de kennismaking en het werkgebied `null`, waardoor een
  bezoeker die eerder "werknemer" koos daar het werknemersmenu zag). Op
  gedeelde pagina's (contact, blog,
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
- **`/en/services`** en **`/diensten`** tonen allebei de zes labels in de
  blokken van het nieuwe ontwerp, met dezelfde opbouw.
- **Blijft Nederlands:** gemeentepagina's, blog, de juridische PDF's (in de
  Engelse footer met "(Dutch)" erachter), `/inloggen`, `/juridische-documenten`
  en de HTML-sitemap.

Een nieuwe vertaalde pagina: JSON in `src/content/en/`, de slug in `SLUGS` en
`EN_KLAAR`, een import in `concept.ts`. `src/lib/taal.test.ts` controleert dat die
drie kloppen en dat de Engelse teksten geen gedachtestreepjes of Nederlandse
resten bevatten.

## Voorbeeldmodus

Conceptvacatures bekijk je op de echte site zonder ze te publiceren. In de admin
onder Vacatures zet **Bekijk met concepten** (of het oogje bij een concept) de
voorbeeldmodus aan via `/api/voorbeeld?pad=…`. Daarna toont react2u.nl voor
jou, en alleen voor jou, de vacaturepagina's alsof de concepten live staan:
het overzicht, de vacatures zelf en de vakgebiedpagina's, in het Nederlands en
het Engels. Een roze balk onderaan zegt dat je in het voorbeeld zit en zet het
uit. Conceptvacatures dragen dan het label "Concept".

Technisch is het Draft Mode van Next ([`src/lib/voorbeeld.ts`](src/lib/voorbeeld.ts)):
wie de cookie heeft krijgt de pagina's vers en nooit uit de cache, alle andere
bezoekers zien de gewone statische site. De cookie zelf geeft geen toegang. In
de voorbeeldmodus leest de site met de sessie van de beheerder, dus RLS
beslist; zonder het recht `vacatures` zie je ook dan alleen wat gepubliceerd
is. Aanzetten vraagt dat recht (`requirePerm`). Feeds, sitemap en Google for
Jobs blijven alleen gepubliceerde vacatures tonen, conceptpagina's krijgen
`noindex`, en bezoeken in de voorbeeldmodus tellen niet mee in de statistieken.
Let op: solliciteren werkt ook in het voorbeeld, en zo'n sollicitatie komt echt
binnen.

## Concepten

Een nieuwe opbouw van een pagina kun je bekijken zonder de live database te
raken. Per pagina staat een concept in [`src/content/`](src/content/) (`home`,
`werkgevers`, `werknemers`, `verzuimprotocol`, `diensten` (het overzicht van de
zes labels) en `tarieven`, waar alleen de volgorde is hersteld: de oproep stond
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

**Sinds 21 oktober 2026 staat de prijslijst 2027 live** als blok `dgTarieven`
(`DgTarieven` in `src/components/blocks/Doelgroep.tsx`), met de Engelse
tegenhanger in `src/content/en/pricing.json`: drie aansluitingen
(Verrichtingenbasis € 38,50, Casemanagement Compleet € 139,50, Maatwerk op
offerte), de uurtarieven en daaronder een groep per label (Recover, Resist,
Restart, Reflex, Ready en het nieuwe Reward: salaris en verloning), elk met de
labelkleur. De bedragen staan in `src/content/tarieven.json` én in de
database (`concept-naar-sql.mjs tarieven`); het jaartal komt uit Instellingen →
Tarievenjaar (`site_settings.tarieven`, nu 2027). De tekst hieronder over het
blok `tarieven` beschrijft het oude ontwerp (`Tarieven.tsx`), dat als bloktype
blijft bestaan.

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

### Mails aan kandidaten

Een sollicitant krijgt vanzelf alleen de ontvangstbevestiging
(`bevestigSollicitatie`). Al het andere stuurt een collega zelf, met **Mail
kandidaat** op de kaart in Sollicitaties: zes vaste mails (uitnodiging, tweede
gesprek, tussenbericht, afwijzing, afwijzing na gesprek, aanbod) in
[`src/lib/kandidaatMail.ts`](src/lib/kandidaatMail.ts), in het Nederlands of
Engels naar de taal van de sollicitatie. Antwoorden komt bij jou uit, niet bij
het noreply-adres.

- **Het sjabloon is een begintekst.** Je vult het moment of de plek in, en
  daarna pas je het onderwerp en de hele tekst zelf aan, in het formulier zoals
  de kandidaat de mail krijgt. Zolang je niet in de tekst typt, volgt hij het
  sjabloon en de velden; daarna blijft jouw versie staan, tot *Terug naar het
  sjabloon*. De server verstuurt wat er staat (`alineasUitTekst`: een witregel
  is een nieuwe alinea); alleen de groet met je naam maakt hij zelf
  (`groetVoor`).
- **Lege plekken.** Een leeg veld staat als `[moment]`, `[plek]` of `[datum]` in
  de tekst. Zolang zo'n plek er staat, kan de knop niet en weigert de server
  (`openPlek`): zo krijgt niemand "een gesprek op [moment]".
- **De fase alleen verzetten mailt niemand.** Andersom wel: na het versturen
  zet `sendKandidaatMail` de fase die bij de mail hoort (uitnodiging → gesprek,
  afwijzing → afgewezen, aanbod → aanbod). Eerst versturen, dan de fase: een
  afwijzing die niet wegging zet niemand stilletjes op afgewezen.
- **Logboek** in `applications.mails` (migratie 0032): wat er wanneer door wie
  is gestuurd, als pillen onder de kaart. Zo mailt niemand dubbel. Staat de
  kolom er nog niet, dan komt de regel in de notitie.
- Staat een kandidaat op afgewezen zonder afwijzing in het logboek, dan toont
  de kaart **Nog geen afwijzing gemaild**, met één klik naar het juiste sjabloon
  (`mailVoorstel`).
- De mail is een gewone brief in het omhulsel van de klantmails
  (`omhulsel()` in `offerteMail.ts`): logo, witte kaart op zand, voet met
  keurmerken. Geen label, geen knop: het is een bericht van een collega.
- De tekst van een afwijzing noemt de bewaartermijn: een jaar als de kandidaat
  daar toestemming voor gaf (`retain_longer`), anders "na afloop van de
  procedure".

## Partnerpagina

`/partners` werft accountants, salariskantoren en HR- en verzekeringsadviseurs
die werkgevers bij ons onderbrengen (ontwerp "React2u partnerpagina" op het
canvas). **Sinds 22 oktober 2026 staat hij live**: met `node scripts/concept-naar-sql.mjs
partners` in de database gezet (zie *Concepten*). Het concept in
[`src/content/partners.json`](src/content/partners.json) blijft bestaan, maar
verandert alleen staging; een wijziging komt live via het adminpaneel of door
het script opnieuw te draaien (de huidige blokken verhuizen dan naar
`partners-oud-<datum>`). Let op: `--alle` neemt hem ook mee. De pagina is een
gedeelde pagina, geen werkgeverspagina: hij krijgt het menu van de laatste
keuze van de bezoeker (zonder keuze het algemene) en het kruimelpad Home ›
Partners. Je vindt hem via de dunne balk bovenaan, waar "Partners" op 22
oktober 2026 op Rens' verzoek de plek van "Over ons" kreeg (`toplinks`), en
via de footer onder Voor werkgevers als "Partnerprogramma" (`werkgeverLinks`),
beide in [`lib/woordenboek/nl.ts`](src/lib/woordenboek/nl.ts). "Over ons" staat
nog in het algemene menu en in het uitklapmenu op de telefoon, niet meer in
de balk. De Engelse site heeft geen partnerpagina en houdt "About us".

De pagina heeft een eigen kop (`ptKop`: een brede foto met een grote roze bol
zoals de tegels van de startpagina, met de kop en de knoppen in de bol; op
telefoon en tablet onder elkaar, kop eerst), direct daaronder het rekenvoorbeeld (`ptRekenhulp`: eerst
zien wat het oplevert, dan hoe het werkt), dan de opzet van een dienstpagina
zoals /ready: het blok `dienstLabel` met `zonderKop` (herken je dit, de twee
partnervormen, zo werkt het, waarom). Daarna "Wat jouw klant krijgt" met de
diensttegels van /werkgevers (`dgLabels`, zonder de zin per dienst, want die
spreekt de werkgever aan, en met `ondermarge: false` zodat de witruimte naar de
vragen gelijk blijft aan de rest van de pagina), en tot slot `dgVragen` en
`ptAanmelden` uit [`Partners.tsx`](src/components/blocks/Partners.tsx). Komt er
een dienst bij of verandert een tegel op /werkgevers, pas hem hier ook aan.
`dienstLabel` kent daarvoor optionele velden: `zonderKop`, `aanpakAnker` en
`titels` voor de vaste kopjes. Zonder die velden blijven de vijf dienstpagina's
gelijk.

Twee afspraken die op de pagina staan (22 oktober 2026, Rens) en ook in de
partnerovereenkomst horen:
- **De vergoeding geldt alleen voor de Verrichtingenbasis** (€ 38,50 per
  medewerker per jaar). Bij Casemanagement Compleet of de flextarieven van
  Reflex spreken we de vergoeding vooraf met de partner af. Dat staat bij de
  Aanbrengpartner, bij het rekenvoorbeeld, in de voetnoot, bij de vragen en in
  de SEO-omschrijving.
- **Jouw klant blijft jouw klant.** Bij klanten via een partner doet React2u
  alleen de arbodienstverlening; salaris (Reward) en HR-advies (Ready) alleen
  met akkoord van de partner. Dat staat naast de diensttegels en bij de vragen,
  omdat juist salariskantoren en HR-adviseurs anders afhaken.

**Partners aan het woord** (`ptQuotes`, direct onder het rekenvoorbeeld): quotes
van partners in de vorm van de ervaringen op /werkgevers, met het logo van het
kantoor (`public/beeld/partners/`). Een quote staat alleen live met
`goedgekeurd: true`; zonder die vlag toont alleen staging hem, met het label
Concept. Zo komt een tekst die het kantoor nog niet heeft goedgekeurd nooit als
zijn woorden online, ook niet via `--alle`. De quotes van Jouw HR Partner en
Spine Services zijn door React2u geschreven; beide kantoren gaven op 22 oktober
2026 toestemming (volgens Rens), daarom staan ze op `goedgekeurd: true`. Komt er
een naam en functie bij, dan in `naam` en `rol`. Het witte logo van Jouw HR Partner (overgenomen van hun
site) staat op hun eigen donkergroen (`logoBg`).

Het rekenvoorbeeld rekent met
`tarief` (de Verrichtingenbasis, € 38,50 per werknemer per jaar),
`pctJaarEen` (50) en `pctVervolg` (25) uit de blokdata ([`lib/partners.ts`](src/lib/partners.ts));
pas ze daar aan als ze veranderen. De voetnoot noemt ze met `{tarief}`,
`{pctJaarEen}` en `{pctVervolg}`, en kan met `{jaar}` het tarievenjaar uit de
instellingen tonen.

Het formulier (`submitPartner`) komt als "Partneraanmelding: <kantoor>" in het
Postvak IN en gaat per mail naar `NOTIFY_OFFERTE_TO` (standaard sales@react2u.nl).
In de conversies telt het als `terugbel`: een eigen soort vraagt een migratie van
de check op `conversions.kind`, en het formulier is een terugbelverzoek.

**Partnercode en aanmeldlink** (migratie [0022](supabase/migrations/0022_partners.sql)).
Elke partner heeft een code (4 tot 20 hoofdletters en cijfers) en een aanmeldlink
`/kennismaken?partner=CODE`. De offerteformulieren (kennismaken en tarieven) lezen
de code met `usePartnercode()` ([`lib/partnercode.ts`](src/lib/partnercode.ts)) en
onthouden hem in `sessionStorage` voor dit bezoek, geen cookie. `submitOfferte`
stuurt hem mee als `partner_code` en zet hem ook in de tekst van het bericht. De
koppeling aan een partner doet de database: een trigger maakt `partner_id` bij
elke nieuwe rij eerst leeg en vult hem alleen voor een actieve partner met die
code. Dat is de grens, niet de kolomrechten: de bezoekersrol heeft op
`contact_messages` naast de kolomrechten ook een invoegrecht op de hele tabel
(nagekeken op 21 oktober 2026) en kan `partner_id` dus technisch meesturen, maar
de trigger overschrijft dat. Bezoekers kunnen de partnerlijst niet lezen, dus
niemand hangt via de publieke sleutel een aanvraag aan een partner naar keuze. Daarvoor is bewust geen
service-role-sleutel gebruikt (zie `lib/supabase/admin.ts`).

In het beheer staat **Partners** (`/admin/partners`, recht `bellijst`):
- per partner de aanmeldlink om te kopiëren of te mailen;
- de klanten die via het kantoor kwamen (medewerkers, abonnement per medewerker
  per jaar, looptijd);
- de aanvragen via de link, en in het Postvak IN het label "Via <kantoor>";
- de vergoeding per kwartaal (`kwartaalOverzicht` in [`lib/partners.ts`](src/lib/partners.ts)):
  per begonnen maand een twaalfde van het jaarabonnement, de eerste twaalf
  maanden tegen het percentage van jaar één, daarna tegen het vervolgpercentage.
  Dat is een indicatie op de contractgegevens; de overeenkomst rekent met wat de
  klant werkelijk betaalde.

De **resellerovereenkomst** met een partner stel je op en stuur je vanuit het
partnerscherm; hij wordt online getekend zoals het basiscontract (zie
*Contracten, De resellerovereenkomst*).

**Bestanden bij een partner** (migratie [0034](supabase/migrations/0034_partnerbestanden.sql),
4 november 2026, Rens: "er is een losse resell overeenkomst verstuurd zorg dat je
ook een upload vak hebt van bestanden"). Onder de resellerovereenkomst op
`/admin/partners/<id>` staat een uploadvak (`PartnerBestanden`): slepen of
kiezen, meerdere tegelijk, als *getekende resellerovereenkomst* (met de datum van
ondertekening) of als *ander bestand*. Een los getekende overeenkomst telt als
getekend: de kop zegt "Los getekend op …", de knop wordt *Getekende
overeenkomst*, en de partnerlijst toont "Overeenkomst getekend".
- De bestanden staan in de **privébucket** `partnerbestanden` (tot 20 MB, alleen
  pdf, Word en afbeeldingen; [`lib/partnerBestanden.ts`](src/lib/partnerBestanden.ts)
  controleert hetzelfde vooraf), onder `<partner_id>/<tijdstempel>-<naam>`. De
  tabel `partner_bestanden` legt naam, soort, datum en wie uploadde vast; een
  check eist dat het pad onder de partner valt.
- **Uploaden** gaat vanuit de browser met de sessie van de collega rechtstreeks de
  bucket in (geen limiet van een server action), daarna legt
  `registreerPartnerBestand` het vast (en haalt het bestand weg als dat mislukt).
- **Downloaden** via `/admin/partnerbestand/<id>`: het bestand zelf, als download
  met de originele naam en nosniff, zoals de cv-route; nooit een deelbare link.
- Alles achter het salesrecht (`bellijst`). Een partner verwijderen haalt ook zijn
  bestanden uit de bucket.

Een partner met klanten kan niet weg (on delete restrict); zet hem op inactief,
dan koppelt zijn link geen nieuwe aanvragen meer. Zonder migratie 0022 werkt de
site gewoon: de code staat dan alleen in de tekst van het bericht en het
partnerscherm wacht met een melding.

## Offertes

Sales stelt in `/admin/offertes` een offerte samen en stuurt de klant een link.
Op `/offerte/<token>` klikt de klant zelf de onderdelen aan, ziet het totaal
meerekenen en ondertekent online (tekenen of naam typen). Migratie
[0024](supabase/migrations/0024_offertes.sql); rechten achter `bellijst`, het
salesrecht, net als partners.

- **De prijslijst is de bouwdoos.** [`lib/offerteCatalogus.ts`](src/lib/offerteCatalogus.ts)
  maakt van het blok `dgTarieven` op /verzuimabonnementen offerteregels met een
  getal als prijs. Het beheer leest het live blok uit de database, met
  `tarieven.json` als terugval: een nieuwe prijslijst loopt vanzelf mee. Drie
  startpunten (klant kiest de aansluiting, Verrichtingenbasis, Compleet) zetten
  in één klik een offerte klaar. Een offerte bewaart zijn eigen prijzen: een
  latere prijswijziging verandert een verstuurde offerte niet.
- **De klant komt nooit bij de tabellen.** `anon` heeft geen enkel recht op
  `offertes`; de pagina loopt via vier functies (security definer) met het token
  als sleutel: `offerte_bekijken` (alleen wat de klant mag zien, telt het bezoek),
  `offerte_keuze_bewaren` (de tussenstand, zodat sales ziet wat er aangeklikt
  is), `offerte_ondertekenen` en `offerte_afwijzen`. Een concept of onbekend token
  geeft een 404.
- **Alleen de klant tekent.** De trigger `offerte_bewaken` laat het beheer (rol
  `authenticated`) geen handtekening, keuze, bezoek of afwijzing schrijven, en
  een getekende offerte niet meer wijzigen of verwijderen (de interne notitie
  blijft bewerkbaar). Bij het tekenen legt de database de inhoud vast
  (`getekend_inhoud`) met een sha-256 (`getekend_hash`), die ook in de
  bevestigingsmail en op de pagina staat. De klant stuurt alleen welke regels hij
  koos; prijzen en tekst komen uit de database. `geldigeKeuze()` in
  `lib/offertes.ts` doet hetzelfde als `offerte_effectieve_keuze` in SQL; houd die
  twee gelijk.
- **Bewijs van ondertekening: ook het IP-adres.** Naam, bevestigd e-mailadres,
  tijdstip, browser en IP van dat ene moment staan bij de offerte (het
  akkoordblok zegt dat er ook bij). Dat is de enige plek in de database met een
  IP-adres; de regel "geen IP-kolom" bij *Architectuur* gaat over
  bezoekregistratie. Hoort in de privacyverklaring, net als de code per mail.
- **Mails** (Resend, zie *E-mail vanuit het systeem*): de offerte zelf (antwoorden
  gaat naar het mailadres van de afzender), een seintje bij de eerste keer openen,
  een bevestiging aan wie tekende, en "getekend" of "niet akkoord" aan sales
  (`NOTIFY_OFFERTE_TO`, standaard sales@) plus het afzenderadres. Mailen staat uit?
  Dan zet *Zet de link open, ik stuur hem zelf* de offerte open zonder mail.
- **Het mailadres voor de klant is sales@react2u.nl** (`OFFERTE_EMAIL` in
  `lib/offertes.ts`), niet de mail van de collega die de offerte maakt (Rens, 29 okt
  2026). Elke nieuwe offerte begint ermee, ook als je vorige offerte een ander adres
  had; het is ook de terugval in het paneel, bij een ingetrokken link en als
  antwoordadres. De naam en het telefoonnummer blijven die van de afzender.
- **Een collega die de link opent** telt niet mee en kan niet tekenen (de pagina
  kijkt naar een beheersessie); het voorbeeld in het beheer
  (`/admin/offertevoorbeeld/<id>`, buiten het paneel) werkt ook voor een concept.
- **Buiten de site.** `/offerte/*` heeft een eigen root layout zonder menu's, valt
  buiten de onderhoudsmodus en de doorverwijzingen (middleware), en krijgt
  `noindex`, `Referrer-Policy: no-referrer` (anders gaat het token mee naar
  externe sites) en `Cache-Control: private, no-store`.
- **Vanuit het Postvak IN**: bij een offerteaanvraag staat *Offerte maken*; klant,
  aantal medewerkers en het passende startpunt staan dan al klaar.
- **Pdf**: zie *De offerte als contract* hieronder.

### De klantpagina: de branding van het label

De offertepagina is het moment waarop de klant akkoord geeft. Na vijf rondes
feedback van Rens (29 okt 2026: "design moet echt veel beter", "geen foto's van
de website"; 30 okt: "trek het design van de website door", "design moet echt
S TIER"; 2 nov: "het moet deze branding zijn per offerte traject", bij de
dienstenkaarten op /werkgevers) staat elke offerte in de branding van **zijn
eigen label**, met de opbouw van de dienstpagina van dat label
([`DienstLabel.tsx`](src/components/blocks/DienstLabel.tsx)), zonder foto's
([`OffertePagina.tsx`](src/components/offerte/OffertePagina.tsx)):

- **Het label komt van de vorm** (`DIENSTLABEL`): verzuimbegeleiding Recover,
  RI&E/PAGO/training Resist, spoor 2/werkfit/AD-onderzoek Restart. Kleur, tint,
  dienst ("Verzuimbegeleiding.") en tagline ("Van ziekmelding tot herstel")
  komen uit het dienstLabel-blok van de labelpagina in het CMS
  (`offerteMerk()` in `lib/offerteHuisstijl.ts`), met de vaste waarden in
  [`lib/offerteMerk.ts`](src/lib/offerteMerk.ts) als terugval. Daar staat per
  label ook een donkerdere tekstkleur voor kleine letters (contrast). De
  pagina deelt het label via een context (`useMerk()`).
- **Opening als de specialismekaart**: de tint met de grote cirkel in de
  labelkleur, het pad "Offerte {nummer} / {bedrijf}", "React2u" met de
  labelnaam groot en het ®, de dienst en de tagline cursief; daaronder de
  offerte zelf ("{titel} voor {bedrijf}", door en voor wie, de feiten, de
  knoppen). Rechts een witte kaart met het bedrag (telt mee), "Wat je krijgt"
  (de gekozen onderdelen, vinkjes in de labelkleur) en de contactpersoon.
- **Geen persoonlijk woord van de afzender** (Rens, 2 nov: "haal die weg
  aangezien er al een voorwoord is"): niet op de pagina, niet in de pdf en niet
  meer als veld in de editor. De kolom `intro` en de aanheffen in de sjablonen
  bestaan nog, maar worden niet getoond.
- **Afwerking** (Rens, 2 nov: "maak de offerte S TIER"):
  - de kopbalk heeft op een breed scherm de onderdelen als menu (Voorstel,
    Voorwoord, Kiezen, Vervolg, Akkoord), met het onderdeel waar je bent in de
    labelkleur, en onderaan een voortgangslijn in de labelkleur;
  - in de kaart van de opening een label "Nog 30 dagen geldig" (in de browser
    berekend);
  - alle tarieven bij gebruik in één lijst (`TarievenBlok`), waarvan de eerste
    vijf zichtbaar zijn en de rest uitklapt;
  - het tekenen in drie zichtbare stappen (handtekening, je gegevens, code uit
    je mail), die meelopen met wat de klant invult.
- **Accenten in de labelkleur**: bovenkopjes, vinkjes in een rondje in de tint,
  de schakelaars van extra's, de badge op een gekozen kaart, de
  aanhalingstekens, de initialen van Susanne in het voorwoord. Banden onder de
  opening wisselen wit en de tint af; vlakken binnen een band hebben de andere.
  Een gekozen keuzekaart blijft indigo (de prijskaarten van de tarieven).
- **Keuze** met rechts het **overzicht** (het eerste `<aside>`): het label in
  zijn tint, elke gekozen regel met bedrag, het totaal dat meetelt, de knop
  naar het akkoord, de concept-pdf en "Vragen?". Daaronder het totaal als
  indigo strook.
- **Upsell: "Vaak gekozen erbij"** (Rens, 2 nov: "de klant moet meer opties
  kunnen aanklikken"). Elke nieuwe offerte uit een standaardsjabloon krijgt per
  traject vaste aanbevolen extra's uit andere specialismen, als opties die uit
  staan (`AANBEVOLEN` en `aanbevolenExtras()` in
  [`lib/offerteCatalogus.ts`](src/lib/offerteCatalogus.ts), regel met
  `aanbevolen: true`): bij verzuim loopbaanscan, coaching, AD-onderzoek en
  salarisadministratie; bij preventie de aansluiting verzuimbegeleiding en
  coaching; bij re-integratie AD-onderzoek of spoor 2 en coaching. Alleen
  diensten met een vaste prijs op de prijslijst, losse specialismen zonder
  pakketkorting. De klant ziet ze direct na de keuzes als kaarten in de kleur
  van hun eigen label met een schakelaar; aan = telt mee en wordt
  meegetekend. Een prijs per medewerker verschijnt alleen als het aantal
  bekend is. In de editor staan ze met "Aanbevolen extra" en kan sales er een
  weghalen; een aangepast sjabloon houdt zijn eigen regels.
- **Alle modules: de hele prijslijst om zelf aan te zetten** (Rens, 2 nov:
  "klant moet zelf alle modules aan kunnen klikken"). Elke offerte uit een
  sjabloon (standaard én eigen) krijgt alle diensten van de zes labels als
  opties die uit staan (`alleModules()` in
  [`lib/offerteCatalogus.ts`](src/lib/offerteCatalogus.ts), regel met
  `module: true`, kop "Alle modules"). Recover levert alleen zijn
  aansluitingen (de losse verrichtingen en de uurtarieven van de
  professionals gelden al onder een aansluiting); wat al in de offerte staat
  (op naam) en de dienst die de offerte zelf is (`EIGEN_DIENST`, bijvoorbeeld
  de RI&E bij een RI&E-offerte) komen er niet nog eens bij. De prijs bepaalt
  wat aanzetten betekent: een vaste prijs telt mee; een tarief (per uur, per
  melding, per maand per dossier, 6%) is **bij gebruik** (`bijGebruik: true`,
  telt niet mee, het tarief staat in het overzicht, de pdf en de mails); op
  aanvraag of op offerte = **voorstel gevraagd** (sales ziet dat zo in de
  tussenstand en de melding na het tekenen). Een aansluiting en de manier van
  verlonen sluiten elkaar uit: opties met dezelfde `groep` (`UITSLUITEND`),
  hooguit één aan (`wissel`, `herstelKeuze`); de database kent die regel niet
  en laat elke combinatie door. Op de klantpagina staan ze na "Vaak gekozen
  erbij" als **panelen per label** in de kleur en tint van dat label, het
  eigen label open, de rest in te klappen, met per paneel hoeveel er aan
  staat. In de editor zijn ze één blok "Alle modules": per label uitklappen,
  "aan bij openen", weghalen, of alles in één keer **Bijwerken** met de
  prijslijst (ids en wat aan stond blijven) of **Weghalen**. Een andere vorm
  ververst ze; "Bewaar als sjabloon" bewaart ze niet (ze komen vers van de
  prijslijst). Een prijs per medewerker (aansluiting, salarisadministratie)
  ziet de klant alleen als het aantal medewerkers is ingevuld; de editor
  waarschuwt daarvoor.
- **Upgrade-duwtje**: staat er naast de gekozen aansluiting een uitgebreidere,
  dan zegt een regel onder de keuze wat die per maand meer kost ("Liever alles
  geregeld? Met Casemanagement Compleet betaal je €353,50 per maand meer"),
  met één klik om over te stappen. Het verschil wordt uit de offerte zelf
  berekend.
- **Zo gaat het verder** als "Onze aanpak" op de dienstpagina: indigo band met
  de lichtere cirkel, genummerde stappen in de labelkleur (Ready: wit), na
  ondertekening de eerste met een vinkje.
- **Klanten aan het woord** (citaten in de tint), de klantlogo's en de
  keurmerken, met de teksten en logo's van de site.
- **Akkoord** weer in de tint met de cirkel, als slot van de opening: "Teken
  voor akkoord. Wij doen de rest.", bel- en mailrijen, en een witte kaart met
  de voorwaarden en het tekenformulier.
- **Voet** als de footer van de site (ivoor met een witte kaart).
- **Telefoon**: onderaan een balk met het bedrag en Ondertekenen, die wegschuift
  zodra je bij het akkoord bent.
- **Na ondertekening** dezelfde opening met "Gelukt, …! Welkom bij React2u."
  (binnen een kwartier, met stippen uit het vinkje) en een kaart met het
  vinkje in de labelkleur, dan de aanpak, wat er is afgenomen, de tekst achter
  "Lees de volledige tekst", voorwaarden en beide handtekeningen.
- **Vast voorwoord van Cindy en Susanne** (Rens, 30 okt: "die moet vast
  staan"): in elke offerte direct na de opening, en in de pdf als eerste
  hoofdstuk. Het verhaal van React2u (waarom we begonnen, één vast gezicht,
  voorkomen en herstellen, keurmerken), met een uitgelichte zin en hun twee
  handtekeningen in handschrift. De tekst staat in
  [`lib/offerteVoorwoord.ts`](src/lib/offerteVoorwoord.ts), niet in het beheer en
  niet per offerte; alleen `{bedrijf}` wordt ingevuld. Daar staan ook hun
  volledige namen en functies onder de handtekening (leeg = voornaam en
  "React2u"). Niet op de pagina na ondertekening, wel in de getekende pdf. Het
  zit niet in `getekend_inhoud` of de hash: het is geen afspraak, maar uitleg.
- **Bedrijfsgegevens en keurmerken** komen uit Instellingen
  (`lib/offerteHuisstijl.ts`): adres, telefoon, e-mail, KvK en btw in de voet en
  bij Opdrachtnemer; staat een certificaat als PDF in Instellingen, dan klik je
  vanaf het keurmerk erheen.
- **Ondertekening namens React2u door de bestuurder** (Rens, 3 nov 2026: "zet
  mijn handtekening bij alle offertes"): in het vak *Opdrachtnemer* op de
  klantpagina (vóór en na het tekenen) en in de pdf staat de echte handtekening
  van Rens van Eyck met "Rens van Eyck, Bestuurder" en de datum van versturen,
  ongeacht wie de offerte opstelde. De afzender blijft de contactpersoon op de
  pagina en in de mails. Naam, functie en de png staan in
  [`lib/offerteOndertekenaar.ts`](src/lib/offerteOndertekenaar.ts); de
  handtekening is `public/beeld/handtekening-rens.png` (scan, wit weggehaald).
  Ook getekende offertes van vóór 3 nov tonen hem: de pdf wordt steeds opnieuw
  gemaakt uit `getekend_inhoud`, en de ondertekenaar zit daar niet in.
- **Prijzen per maand**: wat per jaar loopt staat op de klantpagina, in de mails en
  in het beheer als maandbedrag (`perMaand`, `maandprijs()`, `regelbedrag()` in
  `lib/offertes.ts`), met het jaarbedrag klein erbij. De prijslijst blijft per jaar;
  het maandbedrag is het jaarbedrag gedeeld door twaalf, op centen afgerond.
- **Huisregels van de site**: bovenkopjes in hoofdletters met de stip, ronde
  knoppen met een pijl, roze voor de hoofdactie (ook bij andere labels, zoals
  op de dienstpagina's), grijze tekst `#6B6985`. Witte koppen op indigo met
  inline kleur (de globale kopkleur wint van een utility). Bij "minder
  beweging" staan de animaties stil.
- De pdf blijft een rustig document (zie *De offerte als contract*); de pagina
  volgt de site, het papier niet.
- Een onbekende of ingetrokken link toont `OfferteMelding.tsx`.

### Vormen en sjablonen

Naast verzuimbegeleiding kent de module zes vormen uit de Word-offertes van
oktober 2026: **RI&E, PAGO, verzuimtraining, spoor 2, werkfittraject en
arbeidsdeskundig onderzoek** (migratie
[0025](supabase/migrations/0025_offertevormen.sql)). De inhoud en opmaak van die
offertes worden nog aangepast; de vormen blijven. Sinds 2 nov 2026 is er een achtste
vorm, **Casemanagement Reflex** (migratie
[0029](supabase/migrations/0029_offertevorm_reflex.sql)): het abonnement voor
uitzendbureaus en eigenrisicodragers Ziektewet, als eigen keuze in de groep
*Flexbranche* van de kiezer (Rens: "dit moet een losse keuze worden bij het
aanmaken"). Het sjabloon neemt het abonnement en de Reflex-tarieven uit de
prijslijst. Daarom:

- **Nieuwe offerte begint met de vorm.** `/admin/offertes/nieuw` toont de
  sjablonen per groep (verzuim, flexbranche, preventie, re-integratie; `VORM_GROEPEN`); daarna opent de editor
  met alles ingevuld. Een offerteaanvraag uit het Postvak IN slaat de kiezer over
  (verzuimbegeleiding met de gekozen aansluiting). Oude adressen met `?start=`
  werken nog.
- **De tekst staat in de offerte zelf**: `inhoud` (de uitleg, boven de
  onderdelen) en `voorwaarden` (facturatie, betalingstermijn, annulering), in een
  eigen mini-opmaak: `## kop`, `### tussenkop`, `- punt`, `1. stap`, `> uitgelichte
  zin`, `**vet**` ([`OfferteTekst.tsx`](src/components/offerte/OfferteTekst.tsx)).
  Plus `betreft` (de werknemer, locatie of deelnemers) en `vervolg` (de stappen
  onder "Zo gaat het verder"). Al deze velden gaan mee in `getekend_inhoud` en dus
  in de hash: de voorwaarden zijn onderdeel van wat er getekend is.
- **Invulvelden**: `{bedrijf}`, `{contactpersoon}`, `{voornaam}` en `{betreft}`
  worden bij het tonen ingevuld (`vulIn()`); zonder contactpersoon wordt het
  "heer, mevrouw". Zo kan een sjabloon algemeen blijven.
- **Sjablonen aanpassen zonder code**: maak een offerte, schaaf hem bij en kies
  onderaan *Bewaar als sjabloon* (overschrijven of een nieuw sjabloon met eigen
  naam). Dat komt in `offerte_sjablonen` en wint van de standaard in de code;
  *Terug naar standaard* op `/admin/offertes/sjablonen` haalt het weg.
  Klantgegevens gaan niet mee; gebruik in de teksten de invulvelden.
- **Geldigheid en betalingstermijn**: elke offerte is standaard dertig dagen geldig
  (`GELDIG_DAGEN` in `lib/offertes.ts`) en noemt in de voorwaarden een
  betalingstermijn van dertig dagen (`BETALING` in `lib/offerteSjablonen.ts`), voor
  elke vorm (Rens, 30 okt 2026). Per offerte aan te passen in de editor; een bewaard
  sjabloon kan een eigen termijn hebben.
- **Prijzen**: spoor 2, arbeidsdeskundig onderzoek en de aansluitingen komen uit
  de prijslijst (lopen mee met de tarievenpagina, zolang het sjabloon niet is
  aangepast: een bewaard sjabloon heeft vaste prijzen). RI&E (€ 2.825), PAGO (€ 42,50
  per medewerker), training (€ 595) en werkfit (€ 2.500, verlenging € 1.500) staan
  vast in het sjabloon. Spoor 2 stond in de Word-offerte op € 3.250; het sjabloon
  volgt de prijslijst 2027 (€ 3.365).
- **Eenheid "per medewerker, eenmalig"** (PAGO, vragenlijsten) rekent met het
  aantal medewerkers; een bedrag van € 0 heet "Inbegrepen"; een regel zonder
  bedrag kan een *prijs als tekst* hebben ("€ 89 p.p. en € 0,42 per km").
- De ondertekende versie toont, zoals de Word-offertes, *Opdrachtnemer* (React2u,
  getekend door de bestuurder) naast *Opdrachtgever* (getekend voor akkoord).

### De offerte als contract

Sinds migratie [0026](supabase/migrations/0026_offertecontract.sql) (29 okt 2026)
levert tekenen een stuk op dat inkoop en de boekhouding accepteren.

- **Code per mail vóór het tekenen.** Wie op *Onderteken* klikt, krijgt een code
  van 6 cijfers op het ingevulde e-mailadres (de code staat vooraan in het
  onderwerp) en vult die in; bij 6 cijfers tekent de pagina meteen. Een kwartier
  geldig, vijf pogingen, hooguit vijf codes per uur per offerte. Dat bewijst dat
  wie tekent dat adres in handen heeft; het certificaat zegt het erbij.
- **De database dwingt de code af, niet Next.** De functies zijn met de publieke
  sleutel aan te roepen, dus een controle alleen in de server action zou je met
  een directe aanroep overslaan. Next maakt en mailt de code; `offerte_code_vastleggen`
  bewaart alleen de hash, en alleen met `OFFERTE_SLEUTEL` (env in Vercel; in de
  database staat de sha-256 in `offerte_sleutel`, buiten git gezet).
  `offerte_codes` en `offerte_sleutel` hebben geen policies: ook het beheer kan er
  niet bij, anders kon een collega een code zetten en "namens de klant" tekenen.
  `offerte_ondertekenen` vraagt sinds 0026 de code en de factuurgegevens; de
  variant zonder code verdwijnt met 0027. Een nieuwe sleutel: nieuwe waarde in
  Vercel én de hash in `offerte_sleutel`, anders kan niemand een code krijgen.
- **Factuurgegevens** (`factuur`, jsonb): adres, postcode, plaats, het
  factuurmailadres (standaard wie tekent), KvK (8 cijfers, mag leeg) en
  inkoopnummer (mag leeg). Sales kan ze in de editor vooraf invullen (*Factuurgegevens
  vooraf invullen*); de klant ziet ze ingevuld en bevestigt. Ze komen in de
  vastgelegde versie en dus in de hash, in de melding aan sales en in de pdf.
  `factuurFout()` in `lib/offertes.ts` controleert hetzelfde als de SQL.
- **De pdf** ([`lib/offertePdf.tsx`](src/lib/offertePdf.tsx), `@react-pdf/renderer`):
  dezelfde opbouw als de klantpagina (briefhoofd, genummerde hoofdstukken,
  Opdrachtnemer naast Opdrachtgever, factuurgegevens, keurmerken), met achterin
  het **ondertekeningscertificaat**: ondertekenaar, hoe het e-mailadres is
  bevestigd, tijdstip tot op de seconde, IP-adres, apparaat, de tijdlijn vanaf
  het versturen (`offerte_certificaat`) en de kenmerken van de getekende versie
  en van de handtekening. Alles uit `getekend_inhoud`, dus de pdf van vandaag is
  die van de dag van tekenen (op de bedrijfsgegevens in de voet na). Hij zit bij
  de bevestiging aan de klant en de melding aan sales, en staat op
  `/offerte/<token>/pdf` en `/admin/offertevoorbeeld/<id>/pdf` (`?download=1`
  als bestand). Lettertypen (Outfit, Caveat) staan als woff in `src/lib/pdf/fonts`;
  `outputFileTracingIncludes` in `next.config.ts` neemt ze en de keurmerklogo's
  mee naar Vercel.
- **Concept-pdf om intern te bespreken** (30 okt 2026): op de klantpagina (paneel,
  het bedrag op de telefoon en het akkoordblok) en in het beheer (*Concept-pdf*).
  Dezelfde opbouw met de keuze van dat moment (`?keuze=a,b`, anders de bewaarde
  tussenstand), het watermerk CONCEPT, lege handtekeningvakken en de link om online
  te tekenen; geen factuurgegevens en geen certificaat. `/offerte/<token>/concept`
  (alleen een verstuurde offerte, telt niet als bezoek) en
  `/admin/offertevoorbeeld/<id>/concept` (ook een concept). Na het tekenen geeft de
  conceptroute een 404; dan is er de echte pdf.
- **Valkuilen in react-pdf 4.9**: een `Text` met `render` (paginanummer) binnen
  een vaste `View` laat de hele View weg, en met `bottom` gepositioneerd wordt hij
  niet getekend (vandaar `top: 806`); een unitless `lineHeight` op de pagina erft
  als vaste waarde, dus grotere tekst krijgt een eigen `lineHeight`; `flex: 1` op
  een Text in een kolom maakt zijn hoogte nul.

## Brochures

Sinds 2 november 2026 (migratie [0030](supabase/migrations/0030_brochures.sql)):
sales stuurt een prospect een **persoonlijke brochure met alle zes diensten**, nog
vóór er een offerte is (Rens: "maak een brochure pagina zodat we een template
handig kunnen versturen, offerte zelf volgt later"). Dezelfde opzet als de
offertemodule, zonder keuzes of ondertekening. Sinds 3 november 2026 staat de
prijslijst erin (Rens: "Ga verder met de brochure. hierbij prijslijst", met de
pdf van de prijslijst 2027).

- **Eén inhoud, per prospect een woord.** De zes diensten komen van de
  dienstLabel-blokken van de labelpagina's in het CMS
  ([`lib/brochureHuisstijl.ts`](src/lib/brochureHuisstijl.ts), met vaste terugval),
  in de volgorde Recover, Resist, Restart, Reflex, Ready, Reward. Per brochure
  vult sales alleen de prospect, het persoonlijke woord (`bericht`, met
  `{bedrijf}` en `{voornaam}`) en de afzender in. Zo zegt elke brochure wat de
  site zegt.
- **Prijslijst**: dezelfde bron als /verzuimabonnementen en de offertemodule, het
  blok `dgTarieven` (live uit het CMS, anders `src/content/tarieven.json`) met het
  jaar uit Instellingen → Tarievenjaar ([`lib/brochurePrijslijst.ts`](src/lib/brochurePrijslijst.ts),
  geladen in `brochureHuisstijl.ts`). Nieuwe prijzen hoeven dus niet apart in de
  brochure. De indeling volgt de gedrukte prijslijst: de drie aansluitingen, de
  uurtarieven, een kaart per label in zijn kleur en tot slot maatwerk en
  specialisten; één lange lijst (uurtarieven, Ready) staat over twee kolommen, de
  uitlegkaarten van de site vallen weg. In de pdf beslaat hij twee pagina's tussen
  de diensten en het verhaal, met twee kleine labels naast elkaar (Reflex en Ready,
  `prijsRijen` in `brochurePdf.tsx`). Op de pagina linkt elke dienstenkaart naar
  zijn tarieven (`#tarieven-<label>`).
- **Beheer**: `/admin/brochures` (overzicht), `/admin/brochures/nieuw` (ook vanuit
  een aanvraag in het Postvak IN met `?bericht=<id>`) en `/admin/brochures/<id>`
  (versturen of herinneren, link kopiëren of via WhatsApp, tijdlijn, intrekken,
  nieuwe link). Hetzelfde verzendblok als offertes (`OfferteVersturen` met
  `actie` en `woord`). Recht: `bellijst`. *Maak offerte* opent de kiezer met
  `?brochure=<id>`: dezelfde prospect en afzender, de rest kies je daar.
- **Prospect**: `/brochure/<token>` ([`BrochurePagina.tsx`](src/components/brochure/BrochurePagina.tsx)),
  in de vormgeving van de site: opening in de indigo tint met het woord van de
  afzender, de zes diensten als de dienstenkaarten op /werkgevers, de prijslijst, het verhaal
  van Cindy en Susanne (het voorwoord zonder de zinnen over "dit voorstel"),
  klanten, keurmerken en een uitnodiging om te bellen of een offerte te vragen.
  Dezelfde pagina als pdf op `/brochure/<token>/pdf`
  ([`lib/brochurePdf.tsx`](src/lib/brochurePdf.tsx), `?download=1` als bestand).
  Een concept is al te bekijken (sales ziet hem vooraf), maar een bezoek telt
  pas als hij verstuurd is; een collega met een sessie telt nooit
  ([`lib/isCollega.ts`](src/lib/isCollega.ts), gedeeld met de offertepagina).
- **Mail** in de kleuren van React2u zelf ([`lib/brochureMail.ts`](src/lib/brochureMail.ts),
  op de bouwstenen van `offerteMail.ts`): kop met de belofte van de site, kaart
  met de knop, het bericht, de zes diensten met een stip in hun kleur, de
  afzenderkaart. Antwoorden gaat naar `sales@react2u.nl`. Opent de prospect de
  link voor het eerst, dan krijgt de afzender "… bekijkt je brochure".
- **Database**: tabel `brochures` (nummer `B2026-0001`, token als bij offertes)
  en `brochure_gebeurtenissen`; `brochure_bekijken(token, tel)` als enige
  publieke ingang; trigger `brochure_bewaken` houdt de bezoekvelden bij de API
  vandaan. Middleware en `next.config.ts` behandelen `/brochure/*` als
  `/offerte/*` (geen onderhoudspagina, noindex, no-referrer, no-store, fonts
  voor de pdf). Niet-verstuurde en verstuurde brochures gaan een jaar na de
  laatste activiteit weg (`opruimen-brochures`).
- **Tests**: [`e2e/brochure.cjs`](e2e/brochure.cjs) (aanmaken, collega telt niet,
  versturen, prospect opent, melding aan sales, pdf, telefoon, offerte vanuit
  de brochure, intrekken, onbekende link, de prijslijst op de pagina),
  `lib/brochures.test.ts`, `lib/brochurePrijslijst.test.ts` en `lib/brochurePdf.test.tsx`.

## Contracten

Sinds 3 november 2026 (migratie [0031](supabase/migrations/0031_contracten.sql)):
het **Basiscontract Arbodienstverlening** dat de Arbowet sinds 1 juli 2017 vraagt,
op dezelfde manier als een offerte (Rens: "deze moet op dezelfde wijze worden
ingebouwd in de admin zoals we de offerte versturen en in nieuwe stijl"). Sales
stuurt een link; de klant leest het contract, vult de gegevens van zijn
organisatie in en tekent online met een code per mail.

- **De tekst** staat in [`lib/contractTekst.ts`](src/lib/contractTekst.ts),
  letterlijk uit het Word-bestand "Basiscontract arbodienst React2u LEEG nieuw"
  (overwegingen A tot en met F, artikelen 1 tot en met 8), in een eigen
  mini-opmaak (`## 1. Titel`, `1.1. bepaling`, `A. overweging`, `**vet**`) met de
  invulvelden `{ingangsdatum}`, `{einddatum}` en `{offerte}`. Alleen de opmaak is
  nieuw (titels van bepalingen vet). Elk contract krijgt bij het aanmaken een
  **kopie** (kolom `tekst`, met `tekst_versie`), zodat een verstuurd contract niet
  verandert als de standaard wijzigt en de database bij het tekenen precies kan
  vastleggen wat er getekend is. Per contract aan te passen in het beheer; een
  afwijking staat er als "Aangepaste tekst" bij, en "In het kort" laat dan alleen
  de looptijd zien. Wijzig je de standaard, verhoog dan `CONTRACT_VERSIE`.
  *Aanvullende afspraken* (`aanvullend`) worden het laatste artikel (9).
- **De partijen** ("De ondergetekenden") maakt de code, in de bewoording van het
  Word-bestand (`comparitieOpdrachtnemer()`/`comparitieOpdrachtgever()` in
  [`lib/contracten.ts`](src/lib/contracten.ts)). React2u komt uit Instellingen
  (adres, KvK; `opdrachtnemer`, bij opslaan en versturen ververst) en wordt
  vertegenwoordigd door de bestuurder, net als bij offertes
  (`ONDERTEKENAAR.formeel`: "de heer R. van Eyck", functie bestuurder). Het
  Word-bestand noemde "Eigenaar", KvK 866991906 (dat is het btw-nummer) en
  postcode 5632 NB, en zette "S. Linders/C. Faro" onder de handtekening; het
  contract volgt Instellingen en de handtekening van de offerte. De klant
  (`opdrachtgever`: statutaire naam, adres, postcode, plaats, KvK van 8 cijfers)
  kan sales vooraf invullen; de klant bevestigt of vult aan bij het tekenen, met
  zijn naam en (verplichte) functie als vertegenwoordiger en de plaats van
  ondertekening.
- **Overweging D** ("akkoord met de offerte met kenmerk ...") krijgt het kenmerk
  van de gekoppelde offerte ("Offerte 2026-0012 van 3 november 2026"); zonder
  offerte de naam en het KvK-nummer van de klant, zoals het Word-bestand zegt.
- **Looptijd** (artikel 1.1): standaard de eerste van de volgende maand, een
  jaar; daarna telkens 12 maanden verlengd, opzeggen 3 maanden voor het einde.
  `looptijdNu()` rekent uit tot wanneer een getekend contract nu loopt en tot
  wanneer het nog kan worden opgezegd; het overzicht toont dat als register en
  telt de contracten waarvan die datum binnen drie maanden valt.
- **Beheer**: `/admin/contracten` (register), `/admin/contracten/nieuw` (ook
  `?offerte=<id>`: klant, afzender, kenmerk, en het factuuradres en KvK uit de
  getekende offerte), `/admin/contracten/<id>` (versturen met `OfferteVersturen`
  en `woord="contract"`, tijdlijn, formulier, na het tekenen de handtekening en het
  bewijs), `/admin/contractvoorbeeld/<id>` (+ `/pdf`, `/concept`). Bij een
  verstuurde of getekende offerte staat de knop *Basiscontract* (of het contract
  dat er al bij hoort). Recht: `bellijst`.
- **Klantpagina** `/contract/<token>`
  ([`ContractPagina.tsx`](src/components/contract/ContractPagina.tsx)) in de
  vormgeving van de site, in de kleuren van React2u zelf zoals de brochure (een
  basiscontract hoort bij de arbodienst, niet bij één label): opening in de lila
  tint met "In het kort" (`contractKort()`, de volledige tekst is leidend), het
  contract als wit vel met een inhoudsopgave die meeloopt, en ondertekenen in drie
  stappen. De kop van het contract en "Zo staat het in het contract" vullen zich
  terwijl de klant typt. Documenten bij het contract: algemene voorwaarden,
  privacyreglement en klachtenregeling (de pdf's van de site). Na het tekenen:
  felicitatie (binnen een kwartier), beide handtekeningen met plaats en datum, tot
  wanneer het loopt, en de tekst zoals getekend.
- **Bewijs zoals bij offertes**: `contract_bekijken`, `contract_code_vastleggen`
  (dezelfde `OFFERTE_SLEUTEL`, de hash staat al in `offerte_sleutel`),
  `contract_ondertekenen` (eerst alle velden, dan de code; legt `getekend_inhoud`
  vast met de tekst, beide partijen, de looptijd en de bevestiging, plus een
  sha-256) en `contract_certificaat`. `contract_codes` heeft geen policies; de
  trigger `contract_bewaken` laat het beheer niet tekenen en een getekend contract
  niet wijzigen of verwijderen (de notitie wel). Niet-getekende contracten gaan na
  een jaar weg (`opruimen-contracten`).
- **Pdf** ([`lib/contractPdf.tsx`](src/lib/contractPdf.tsx)): de opbouw van het
  Word-bestand op het papier van de offerte-pdf, met achterin het
  ondertekeningscertificaat; concept met watermerk en open plekken. Bij de
  bevestiging aan de klant en de melding aan sales.
- **Mails** ([`lib/contractMail.ts`](src/lib/contractMail.ts), op de bouwstenen van
  `offerteMail.ts`): het contract, de code en de bevestiging; meldingen "bekijkt"
  en "getekend" sober, zoals bij offertes.
- **Tests**: [`e2e/contract.cjs`](e2e/contract.cjs) (vanuit een offerte, aanmaken,
  versturen, klant leest, telefoon, tekenen met foute en goede code, mails, pdf,
  getekend is vast, register, collega, onbekende link), `lib/contracten.test.ts`
  (o.a. dat er geen woord uit het Word-bestand verloren gaat) en
  `lib/contractPdf.test.tsx`.
- `next.config.ts` neemt voor `/contract/**` en `/admin/contractvoorbeeld/**` de
  lettertypen, keurmerken en de handtekening van de bestuurder mee naar Vercel;
  dat laatste nu ook voor `/offerte/**` (de offerte-pdf tekent hem sinds 3 nov).

- **Checklist arbeidsomstandigheden** (sinds migratie
  [0042](supabase/migrations/0042_contract_checklist.sql), 17 november 2026; Rens: "deze
  moet bij het contract komen, in dezelfde stijl"): de "Checklist arbeidsomstandigheden -
  inventarisatie" is een vast onderdeel van elk basiscontract, niet van een
  resellerovereenkomst. De tekst staat letterlijk uit het Word-bestand in
  [`lib/contractChecklist.ts`](src/lib/contractChecklist.ts): de titel "Checklist
  arbeidsomstandigheden wet", de vijf vakken bovenaan (plaats, bedrijf, datum, naam,
  functie), de drie kolommen en de acht onderdelen, met de toelichting bij de
  preventiemedewerker in de kolom actiepunten; "R&IE" en "de arbeidsomstandighedenbeleid"
  staan zo in het bestand. De klant vult hem online in op `/contract/<token>/checklist`
  ([`ContractChecklistPagina.tsx`](src/components/contract/ContractChecklistPagina.tsx):
  de kopbalk van het contract met de weg terug, de opening in de lila tint, het formulier
  als wit vel met per onderdeel de actiepunten en afspraken en de datum van afronding;
  de naam is verplicht en minstens één onderdeel), ook na het tekenen en zo vaak hij wil
  (`contract_checklists`: één rij per contract, `versie` telt; de checklist hoort niet
  bij wat getekend is en zit niet in de hash). De contractpagina heeft de band "Bij dit
  contract" met de acht onderdelen, de stand en de knoppen (ook in de kopbalk en de
  inhoudsopgave). Schrijven alleen via `contract_checklist_opslaan` (token als sleutel),
  lezen via `contract_checklist_bekijken`; het beheer leest de tabel
  (`has_perm('bellijst')`) en toont de antwoorden bij het contract, met de soort
  `checklist` in de tijdlijn en een stip in het register. Het klantenbord toont het invullen
  via de tak `checklist` in `klant_gebeurtenis`; die staat in 0043 (de laatste versie van
  die functie), niet in 0042, zodat de volgorde van live zetten niet uitmaakt. Pdf
  ([`lib/contractChecklistPdf.tsx`](src/lib/contractChecklistPdf.tsx)) in de stijl van de
  contract-pdf: leeg (met schrijfruimte, twee pagina's) als bijlage bij de contractmail en
  als download, ingevuld met de antwoorden; routes `/contract/<token>/checklist/pdf` en
  `/admin/contractvoorbeeld/<id>/checklist` (+ `/pdf`). Mails: het blok "Bij dit
  contract" in de contractmail met de pdf als bijlage (`checklist` in `ContractMail`); na
  het invullen een kopie met pdf aan de klant (`sendContractChecklistKopie`, op het adres
  van het contract) en een sober seintje aan sales (`notifyContractChecklist`); de
  bevestiging na het tekenen krijgt de ingevulde checklist als tweede bijlage, of de regel
  dat hij nog openstaat. Tests: `lib/contractChecklist.test.ts` (o.a. dat er geen woord
  uit het Word-bestand verloren gaat), `lib/contractChecklistPdf.test.tsx` en de
  checkliststappen in `e2e/contract.cjs`.

### De resellerovereenkomst

Sinds migratie [0033](supabase/migrations/0033_resellerovereenkomst.sql) (4 november
2026) is er een tweede soort contract: de **Resellerovereenkomst arbodienstverlening**
met een partner (Rens: "zorg dat we deze ook via de route digitaal kunnen laten
ondertekenen"). Dezelfde route, tabel, functies en bewijs als het basiscontract;
`contracten.soort` is `basiscontract` of `reseller` en ligt vast bij het aanmaken.
Wat per soort verschilt (titel, woordmerk, rollen, kopjes, slotzin) staat in
`CONTRACT_SOORT` in [`lib/contracten.ts`](src/lib/contracten.ts).

- **De tekst** (`RESELLER_STANDAARD` in [`lib/contractTekst.ts`](src/lib/contractTekst.ts))
  komt letterlijk uit het Word-bestand "Resellerovereenkomst React2u - model":
  overwegingen A tot en met E, artikelen 1 tot en met 11. De leden heten 8.3 in
  plaats van "artikel 8 lid 3"; a en b van 3.1 zijn alinea's van die bepaling
  (ingesprongen op de pagina en in de pdf). Vet zijn alleen de begrippen in
  artikel 1. "hierna gezamenlijk: Partijen", "Partijen komen het volgende
  overeen:" en "Aldus overeengekomen en in tweevoud ondertekend." staan niet in de
  tekst maar in `CONTRACT_SOORT`, net als bij het basiscontract.
- **De vergoeding** in 3.1 hoort bij de partner: vanuit een partner krijgt de
  tekst diens `pct_jaar_een` en `pct_vervolg` (`resellerTekst()`; Spine Services
  heeft live 50% en 50%). Andere percentages tellen niet als aangepaste tekst
  (`wijktAf(tekst, "reseller")`), en "In het kort" en de kerngegevens lezen ze uit
  de tekst (`resellerVergoeding()`). In het beheer zijn ze als twee vakken te
  wijzigen; wijkt het af van de partner, dan staat dat erbij.
- **De partijen** in de bewoording van het Word-bestand (`comparitieReact2u()`,
  `comparitieReseller()`): "React2u II B.V., handelend onder de naam React2u",
  met sales@react2u.nl en het telefoonnummer uit Instellingen (`REACT2U_STATUTAIR`,
  `opdrachtnemerUit()`); bij de handtekening "React2u II B.V. h.o.d.n. React2u". De
  reseller vult naast naam, adres en KvK ook het **e-mailadres en telefoonnummer**
  van het kantoor in: daar gaan aanmeldingen, specificaties en opzeggingen heen
  (artikel 11.2). `contract_ondertekenen` controleert die (foutcodes
  `organisatie-email`, `organisatie-telefoon`: 8 tot 15 cijfers).
- **Looptijd**: geen einddatum (de check `contracten_looptijd` eist dat), en de
  ingangsdatum zet `contract_ondertekenen` op de dag van ondertekening, Nederlandse
  tijd (artikel 8.1). Opzeggen per e-mail met een maand. Het register telt hem
  daarom niet mee bij "Opzegtermijn loopt af".
- **Partner**: `contracten.partner_id` (on delete set null). Interne
  administratie, geen deel van wat getekend is, dus ook na het tekenen vrij
  (`contract_bewaken` kent hem als vrij veld, zodat een partner met een getekende
  overeenkomst nog weg kan). Op `/admin/partners/<id>` staat het blok
  *Resellerovereenkomst*: opstellen (`/admin/contracten/nieuw?partner=<id>`: kantoor,
  contactpersoon, mail, telefoon en de percentages staan klaar), de status, en na
  het tekenen de pdf.
- **Beheer**: `/admin/contracten` met de filters Alle, Basiscontracten en
  Resellerovereenkomsten (`?soort=`), en de knop *Nieuwe resellerovereenkomst*
  (`?soort=reseller`). Geen offerte, geen looptijdvakken; wel de partner en de
  vergoeding.
- **Pagina, pdf en mails**: hetzelfde scherm in de lila tint, met "React2u /
  Reseller. / Overeenkomst arbodienstverlening." (het hele woord past niet groot
  op een telefoon), geen documenten van het basiscontract, de link naar
  `/partners` in de voet, "Welkom als partner." na het tekenen. Onderwerpen:
  "Resellerovereenkomst C2026-… voor …", "Ondertekend: resellerovereenkomst …".
- **Tests**: [`e2e/reseller.cjs`](e2e/reseller.cjs) (vanuit de partner met 50% en
  50%, versturen, de partner leest, telefoon, tekenen met mail en telefoon,
  ingangsdatum vandaag, mails, pdf, getekend is vast maar de partner vrij, geen
  einddatum, register en partnerpagina) en de resellertests in
  `lib/contracten.test.ts` (o.a. dat er geen woord uit het Word-bestand verloren
  gaat) en `lib/contractPdf.test.tsx`. `E2E_ALLEEN` neemt nu ook een lijst met
  komma's (`E2E_ALLEEN=contract,reseller`).
- **Pdf-afbreking** (geldt voor beide soorten): de artikelen staan los op de pagina,
  niet in één omhullend blok. Daarin brak react-pdf (4.9) een artikel dat onderaan
  een pagina begon niet af en schreef het over de voet heen (ook op master, als de
  paginagrens net bij artikel 1 viel). Elke bepaling is onbreekbaar (`wrap={false}`),
  zodat het nummer niet alleen onderaan staat; zet nooit een `wrap={false}` om een
  kop en een bepaling samen, ook dat tekende over elkaar heen.

## Onboarding

Sinds november 2026 (migratie [0037](supabase/migrations/0037_onboarding.sql)):
een nieuwe klant krijgt **één persoonlijke link met alles om te starten**, en
het beheer volgt het hele traject tot de klant live is (Rens, 16 nov 2026: "zorg
dat de bestanden via de admin verstuurd kunnen worden in als kop onboarding en
dat je selecteert welke bestanden verstuurd worden en ingevuld kunnen worden",
daarna "gebruik de stijl hoe we daar offertes etc gemaakt hebben" en "onboarding
traject uitbouwen in de admin"). Dezelfde opzet als brochures en contracten:
token in de link, statussen, tijdlijn, alles achter het salesrecht `bellijst`.

- **De documenten** staan in de code, niet in de database
  ([`lib/onboarding.ts`](src/lib/onboarding.ts), `DOCUMENTEN`): *Welkom bij
  React2u* (werkwijze en de tijdlijn van ziekmelding tot WIA), *Inrichting nieuwe
  klant* (bedrijfs- en factuurgegevens), *Werknemersbestand* (de 37 kolommen van
  de lege import van XpertSuite), *Verzuimprotocol* (R-E-A-C-T-2U, voor de
  medewerkers), *Wat je wél mag vragen bij ziekteverzuim* (met belscript) en
  *Machtiging overdracht verzuimdossier* (alleen bij een overstap, standaard uit).
  De inhoud komt uit de vijf bronbestanden en de afbeelding van het protocol die
  Rens aanleverde; de originelen zijn niet meer nodig. De tijdlijnweken staan
  letterlijk uit het Welkom-document (probleemanalyse week 6 tot 12, plan van
  aanpak week 8 tot 13), terwijl de Wet Poortwachter uiterlijk week 6 en 8 zegt;
  Rens besloot op 16 november 2026 ze zo te laten ("Zo laten"). Niet aanpassen
  zonder nieuwe opdracht.
- **Per document twee keuzes** in het beheer: `documenten` (gaat mee) en
  `invullen` (de klant vult het online in; alleen inrichting, werknemers en
  machtiging kunnen dat, `invullen <@ documenten`). Wat niet online gaat, krijgt
  op de pagina een download (pdf, of het lege Excelbestand) en een afvinkknop.
- **Beheer**: `/admin/onboarding` (register met filters *Bij de klant*,
  *Inrichten*, *Ingericht*, *Concept*, *Ingetrokken*, zoeken, en twee
  voortgangsbalken: de klant en React2u), `/admin/onboarding/nieuw` (ook vanuit
  een getekend basiscontract met `?contract=<id>`: de knop *Start onboarding* op
  het contract) en `/admin/onboarding/<id>`: versturen of herinneren
  (`OfferteVersturen` met `woord="onboarding"`), *Wat de klant doet* (per
  document ingevuld of afgevinkt, met de pdf), **Inrichten bij React2u** (zie
  hieronder), wat de klant invulde (inrichting met het blok *In te vullen door
  React2u*: contractsoort en debiteurnummer; het werknemersbestand met
  gemaskeerde BSN's, als Excel voor XpertSuite op
  `/admin/onboarding/<id>/werknemers`, en *Wissen na import*; de machtiging),
  de tijdlijn, het formulier en een notitie. `/admin/onboardingvoorbeeld/<id>`
  (+ `/<stap>`, `/pdf/<document>`, `/excel`) toont de hub en elke stap zoals de
  klant ze ziet, ook als concept; invullen kan daar niet. Bij *Wat de klant
  doet* linkt *Bekijk* naar het voorbeeld van die stap.
- **Inrichten bij React2u** (`taken`, `TAKEN` in `lib/onboarding.ts`): de
  checklist van wat wij zelf regelen voordat de klant live is: werkgever
  aangemaakt in XpertSuite, werknemers geïmporteerd (alleen met het
  werknemersbestand), debiteur aangemaakt, vaste casemanager gekoppeld, dossiers
  opgevraagd bij de vorige arbodienst (alleen met de machtiging), instructie
  XpertSuite gegeven. Per taak staat wie hem wanneer afvinkte; een taak die op
  een document van de klant wacht zegt dat zolang die er niet is. De weergave
  in het beheer: *Concept*, *Verstuurd*, *Klant bezig* (bekeken), **Klant
  klaar** (status `afgerond`: alles ingevuld of afgevinkt, React2u aan zet) en
  **Ingericht** (ook alle taken af, de klant is live; `onboardingWeergave()`).
  De klant ziet de checklist niet.
- **Klantpagina**: een hub met losse stappagina's (Rens, 16 nov 2026: "maak het
  perfect naar eigen inzicht"), zoals de beste onboardings een checklist als
  thuisbasis hebben en één taak per scherm. De **hub** `/onboarding/<token>`
  ([`OnboardingPagina.tsx`](src/components/onboarding/OnboardingPagina.tsx)):
  de kopbalk met de hoofdstukken, de voortgang en bellen; de opening in de lila
  tint met het persoonlijke woord (`bericht`, met `{bedrijf}` en `{voornaam}`),
  de feiten (ook hoe lang alles samen duurt, `totaleMinuten()`), *Handig om bij
  de hand te hebben* (`nodig` per document, `benodigdheden()`), de zwevende
  stippen van het logo, en rechts de kaart met de voortgangsring, de stappen per
  hoofdstuk en het aanspreekpunt; de drie hoofdstukken als banden, om en om wit
  en lila, elk met een sectiekop en zijn stappen als kaarten (`StapKaart`) naar
  hun eigen pagina; bij *Jullie gegevens* drie kaarten met de keurmerken die
  daarover gaan (ISO 27001, ISO 27701, SBCA; `Zekerheid`); de indigo band *Zo
  gaat het verder* met wat React2u daarna doet (`TAKEN`, `klantKop` en `klant`)
  en bellen; de felicitatie met de stippen als alles net klaar is; op de
  telefoon onderaan de knop naar de volgende open stap. De **stappagina**
  `/onboarding/<token>/<stap>`
  ([`OnboardingStapPagina.tsx`](src/components/onboarding/OnboardingStapPagina.tsx)):
  de kopbalk met *Overzicht* terug, een strook met waar je bent (hoofdstuk en
  stap), de stap zelf (links een kolom die op een groot scherm blijft staan met
  nummer, titel, status, de tijd en de acties, rechts de inhoud of het formulier
  op een kaart; op de telefoon komen de acties onder de inhoud), en onderaan
  vorige, overzicht en volgende; is de stap klaar, dan staat links *Verder met
  …*. De bouwstenen staan in
  [`OnboardingDelen.tsx`](src/components/onboarding/OnboardingDelen.tsx). De
  volgorde van het verhaal (`DOCUMENTEN`, `HOOFDSTUKKEN` in
  `lib/onboarding.ts`): hoofdstuk 1 *Zo werken we samen* (Welkom, met de
  tijdlijn als één reis en "Wij bewaken dit" bij elke stap van React2u of de
  bedrijfsarts), 2 *Wat we van jullie nodig hebben* (inrichting, werknemers,
  machtiging: dat is wat de klant voor ons doet, dus direct na het welkom), 3
  *Delen met je team* (het verzuimprotocol als de poster, de letters
  R-E-A-C-T-2U op de slingerende indigo lijn, en *Wat je wél mag vragen* met de
  samenvattingstabel en het belscript: materiaal om door te geven). Een
  hoofdstuk zonder gekozen documenten valt weg; het beheer, de mail en de
  stapnummers volgen dezelfde volgorde. Formulieren: een balkje "Verplichte
  velden: 3 van 8", controles bij invullen (KvK 8 cijfers, BSN elfproef,
  postcode). Het werknemersbestand begint met een **keuze** (Rens, 16 nov
  2026): *Handmatig invullen* (per medewerker een kaart, handig tot zo'n tien)
  of *Via Excel* (drie stappen: het lege bestand downloaden, invullen, de rijen
  plakken; `rijenUitPlak()`: tabs of puntkomma's, met de kopregel van het
  importbestand of onze labels gaat elke kolom naar het juiste veld, zonder
  kopregel geldt de volgorde van het importbestand of van onze velden; datums
  en postcodes worden omgezet). Pas na de keuze verschijnt het bijbehorende
  deel; geplakte rijen staan als kaarten om na te kijken, en bij eerder
  opgeslagen rijen staat de keuze op handmatig. Geen IBAN en accounthouder: die stonden kaal op het Word-formulier,
  maar React2u incasseert niet (Rens, 16 nov 2026), de klant betaalt per
  factuur binnen dertig dagen (basiscontract 7.4). Alles komt zacht in beeld
  tijdens het scrollen (`OnboardingReveal.tsx`, zoals `Reveal.tsx` op de site,
  met `data-in` buiten React zodat het na opslaan blijft staan). Modus klant,
  collega (telt niet, invullen mag: samen aan de telefoon) en voorbeeld (niets
  opslaan; `/admin/onboardingvoorbeeld/<id>` en `/<stap>`). De klant schrijft
  alleen via `onboarding_opslaan` en `onboarding_gelezen` (security definer,
  het token als sleutel); Next controleert de vorm van de invoer, de database
  of het mag en hoe groot het is. Is alles gedaan, dan zet `onboarding_afronden`
  de status op `afgerond`.
- **Privacy**: het werknemersbestand bevat burgerservicenummers. Daarom alleen
  achter `bellijst`, BSN's gemaskeerd in het beheer, de knop *Wissen na import*
  (het document telt daarna als afgehandeld) en de hele onboarding gaat een jaar
  na de laatste activiteit weg (`opruimen-onboardings`). Er is geen upload: geen
  extra service role nodig (zie de regel in `lib/supabase/admin.ts`).
- **De machtiging tekent de werknemer online, vanuit het beheer** (migraties
  [0038](supabase/migrations/0038_onboarding_machtigingen.sql) en
  [0039](supabase/migrations/0039_onboarding_werkgever_werknemer.sql); Rens, 16
  nov 2026: "werknemer gedeelte moet de machtiging zijn en moet ondertekend
  kunnen worden met ip registratie; werkgever moet de gehele onboarding zijn
  zonder doc van arbo naar arbo"). De machtiging staat daarom **niet** in de
  onboarding van de werkgever (`DocumentInfo.verborgen`, buiten `gekozen()`,
  `keuzeUit()` en de hoofdstukken; `/onboarding/<token>/machtiging` geeft 404).
  React2u vult op het tabblad Werknemer de vorige arbodienst in
  (`onboardings.vorige_arbodienst`, `saveVorigeArbodienst`), nodigt per
  medewerker uit (naam en e-mail, te kiezen uit het werknemersbestand;
  `nodigMachtigingUitBeheer` via `onboarding_machtiging_uitnodigen` met het
  token van de onboarding), die krijgt een persoonlijke link
  (`/machtiging/<token>`, [`MachtigingPagina.tsx`](src/components/onboarding/MachtigingPagina.tsx),
  gemaakt voor de telefoon), vult zijn gegevens in (`MACHTIGING_WERKNEMER`,
  elfproef) en tekent met het `Handtekening`-onderdeel van de offerte
  (`onboarding_machtiging_tekenen`: momentopname met hash, **IP-adres** en
  apparaat; het IP staat in het beheer en op de pdf). De werknemer krijgt een
  bevestiging met de getekende pdf. Daarna verstuurt React2u **namens de
  werkgever** de opdracht tot overdracht (`verstuurOverdrachtBeheer`,
  `OVERDRACHT_BRIEF`, `overdrachtPdf`: de brief met alle getekende
  machtigingen als één pdf) naar het mailadres van de vorige arbodienst, met
  de werkgever en medisch@react2u.nl erbij en antwoorden naar de werkgever
  (`onboarding_overdracht_versturen` zet `overdracht_at`); die arbodienst stuurt
  React2u de lijst en de dossiers (taak *Dossiers ontvangen van de vorige
  arbodienst*, alleen als er een vorige arbodienst is: `bijArbodienst`). Papier
  blijft kunnen (de lege pdf via het voorbeeld). De werkgever ziet hier niets
  van; de functies van 0038 lezen de arbodienst uit de nieuwe kolom met het
  oude klantantwoord als terugval.
- **Excelbestand uploaden** naast plakken ([`lib/xlsxLezen.ts`](src/lib/xlsxLezen.ts),
  zonder dependency: de zip ontpakt de browser met `DecompressionStream`, de XML
  lezen we met reguliere expressies; gedeelde tekst, getallen, en een getal met
  een datumopmaak wordt een datum). Eerst een **controlerapport**: hoeveel
  gelezen, wie er al stond (zelfde BSN: die wordt bijgewerkt, een gevulde cel
  wint), wat dubbel in het bestand zat, en welke rijen aandacht vragen
  (`controleerWerknemers`); pas daarna worden het kaarten. De download
  (`/excel`) bevat de medewerkers die al online staan, zodat de rondgang
  downloaden, aanvullen in Excel, uploaden werkt (Rens, 16 nov 2026). Een BSN met acht cijfers (Excel laat de voorloopnul
  vallen) krijgt zijn nul terug (`schoneWerknemers`).
- **De klant op de hoogte**: na de eerste keer opslaan een bevestiging met een
  kopie als pdf (niet het werknemersbestand: BSN's horen niet in een mail), als
  alles af is "jullie deel is klaar" met wat React2u nu doet, en als het team de
  laatste taak afvinkt "jullie zijn live" met de vaste casemanager
  (`onboardings.casemanager`, in te vullen in het beheer; gebeurtenis `live`,
  één keer). `onboarding_opslaan` en `onboarding_gelezen` geven daarvoor het
  e-mailadres van de klant terug aan de server action, de pagina krijgt het
  niet. Op de klantpagina staat onder *Zo gaat het verder* per taak van React2u
  de stand ("Geregeld op …", "Daar werken we nu aan", "Zodra … binnen is"):
  `onboarding_bekijken` geeft `taken` (alleen het moment) en `casemanager` mee.
- **Automatische herinneringen** ([`lib/onboardingHerinnering.ts`](src/lib/onboardingHerinnering.ts),
  [`api/cron/onboarding`](src/app/api/cron/onboarding/route.ts), elke ochtend
  via `vercel.json`, met `CRON_SECRET`): na vijf dagen niet geopend of tien
  dagen stil (de drempels van het dashboard), hooguit twee per onboarding, zeven
  dagen uit elkaar en niet vlak na een herinnering van een collega. Dezelfde
  mail als de herinnering uit het beheer; in de tijdlijn als `herinnering` met
  `details.automatisch`.
- **Beheer: één feature Onboarding, met Werkgever en Werknemer** (Rens, 16 nov
  2026: "onboarding moet 1 feature zijn in de zijbalk";
  [`OnboardingTabs.tsx`](src/components/admin/OnboardingTabs.tsx)). Boven het
  register en boven één onboarding twee tabbladen. *Werkgever* is de hele
  onboarding van de klant: versturen, wat de klant doet, de checklist van
  React2u, de inrichting, het werknemersbestand voor XpertSuite, de tijdlijn en
  de notitie. *Werknemer* (`?tab=werknemer`) is de machtiging: de vorige
  arbodienst, uitnodigen, de stand per werknemer met het IP-adres van de
  ondertekening, de opdracht tot overdracht
  ([`MachtigingBeheer.tsx`](src/components/admin/MachtigingBeheer.tsx)) en een
  eigen tijdlijn. Het register Werknemer
  ([`/admin/onboarding/werknemers`](src/app/admin/(panel)/onboarding/werknemers/page.tsx))
  toont over alle klanten heen wie moet tekenen, wie tekende (met IP) en welke
  opdrachten naar de arbodienst gingen.
- **Een stap doorsturen** naar een collega (`StapDoorsturen` onder elke stap):
  naam, e-mail, eigen naam, bericht; `onboarding_doorsturen` legt het vast
  (hooguit twintig per dag), Next mailt de link naar die stap.
- **Pdf** ([`lib/onboardingPdf.tsx`](src/lib/onboardingPdf.tsx), één per
  document, `/onboarding/<token>/pdf/<document>`): Outfit, de lila band, de
  kleuren van de stippen in het logo; een ingevuld formulier komt ingevuld mee,
  anders met lege vakken. Voet en paginanummer zoals de offerte-pdf (het
  paginanummer los van de vaste voet, zie daar). Het werknemersbestand is Excel
  ([`lib/xlsx.ts`](src/lib/xlsx.ts), zonder dependency; `/excel` het lege
  bestand voor de klant).
- **Mail** ([`lib/onboardingMail.ts`](src/lib/onboardingMail.ts), op de
  bouwstenen van `offerteMail.ts`): welkom met de knop, het persoonlijke woord
  en de documenten als checklist (bij een herinnering met wat al klaar is).
  Meldingen aan de afzender: geopend, een document ingevuld (de eerste keer),
  afgerond. Op het dashboard staat een onboarding in het Verkoopblok (zie
  *Commandopalet en dashboard*).
- **Database**: `onboardings` (nummer `O2026-0001`, `documenten`, `invullen`,
  `antwoorden` per document `{ data, at, door }`, `gelezen`, `taken`, de velden
  van React2u) en `onboarding_gebeurtenissen` (ook `taak`);
  `onboarding_bekijken(token, tel)` als publieke ingang; trigger
  `onboarding_bewaken` houdt bezoek, antwoorden en taken bij de API vandaan.
  Middleware en `next.config.ts` behandelen `/onboarding/*` als `/offerte/*`.
  Lijsten en het dashboard halen `antwoorden` niet op (daar kan het hele
  werknemersbestand in staan) maar alleen de momenten (`ANTWOORD_MOMENTEN`,
  `metAntwoordMomenten()`). **Bezoek telt per half uur**: de pagina rendert ook
  na elke keer opslaan (in het verzoek van de server action en bij
  `router.refresh`), en de interne headers daarvan (`rsc`, `next-action`) haalt
  Next weg voordat `headers()` ze ziet. Daarom telt `onboarding_bekijken` een
  bezoek pas opnieuw na een half uur zonder activiteit, zoals de gebeurtenis
  *bekeken* al deed; anders stond er na zes stappen "8× bekeken".
- **Tests**: [`e2e/onboarding.cjs`](e2e/onboarding.cjs) (aanmaken met de
  documentkeuze, voorbeeld van de hub en een stap, pdf's en Excel uit het
  beheer, versturen, de automatische herinnering via de cron, de klant opent de
  hub en gaat per stap naar zijn pagina: afvinken, inrichting met een fout
  KvK-nummer en de bevestiging met pdf, werknemers met een fout BSN, plakken
  én uploaden van een echt Excelbestand (`maakXlsx` in `e2e/hulp.cjs`) met het
  controlerapport, machtiging vanuit het beheer: React2u vult de vorige
  arbodienst in en nodigt uit het werknemersbestand uit, de werknemer tekent op
  zijn telefoon met IP-registratie en React2u verstuurt de opdracht, een stap
  doorsturen, compleet met "jullie
  deel is klaar", het dashboard, de checklist van React2u tot ingericht met de
  mail "jullie zijn live", wissen na import, register, collega, intrekken,
  onbekende link), `lib/onboarding.test.ts`, `lib/xlsxLezen.test.ts`,
  `lib/onboardingHerinnering.test.ts`, `lib/onboardingPdf.test.tsx` (ook de
  getekende machtiging en de opdracht; met `ONBOARDING_PDF_MAP=<map>` schrijft
  hij de pdf's weg) en de onboardingregels in `lib/opvolgen.test.ts`.

## Documenten en klantevaluatie

Sinds migratie [0043](supabase/migrations/0043_klantevaluatie.sql) (Rens, 17
nov 2026: "klant evaluatie moet ook in dezelfde stijl gestuurd worden als losse
module. Misschien moeten we het in de sidebar gewoon documenten noemen"): één
ingang **Documenten** in het zijmenu ([`/admin/documenten`](src/app/admin/(panel)/documenten/page.tsx),
recht `bellijst`). Sinds 19 nov 2026 ("noem het bijvoorbeeld documenten, zet
daar alle documenten neer") staan daar **alle** documenten die naar een klant
gaan, in de volgorde van de klantreis: brochures, offertes, contracten,
onboarding en klantevaluaties, elk als tegel met *Concept*, *Bij klant* en
klaar (getekend, ingevuld, klaar; bij een brochure: bekeken), *Nieuw* en
de lijst. Bovenaan **Ligt bij de klant**: alles wat verstuurd is en nog niet
getekend of ingevuld, het langst wachtende eerst, met of de klant het al
opende (een verlopen offerte telt niet meer mee). De regels staan in
[`src/lib/klantdocumenten.ts`](src/lib/klantdocumenten.ts) (niet
`documenten.ts`: dat zijn de juridische pdf's van de site). Offertes,
contracten, onboarding en brochures staan niet meer los in het menu; ze zijn
er via Documenten, het palet (⌘K) en hun eigen adres, en Documenten licht op
als je erin zit. De resellerovereenkomst staat als verwijstegel naar Partners
(die is voor partners, niet voor klanten). De checklist arbeidsomstandigheden
hoort bij het basiscontract en heeft geen eigen tegel.

- **De klantevaluatie** is het Word-formulier *Klant Evaluatie* (v2) van de
  accountmanager, nu als module: `/admin/documenten/evaluaties` (register met
  de filters *Bij de klant*, *Ingevuld*, *Concept*, *Ingetrokken*, zoeken en
  per rij het aantal aandachtspunten), `/nieuw` (ook vanuit een kaart op het
  klantenbord met `?klant=<id>`) en `/<id>`: versturen of herinneren
  (`OfferteVersturen` met `woord="evaluatie"`), het bezoek, *Wat de klant
  invulde*, de pdf, de tijdlijn, het formulier en een notitie.
  `/admin/evaluatievoorbeeld/<id>` (+ `/pdf`) toont de pagina zoals de klant
  hem ziet, ook als concept; invullen kan daar niet. Nummers `KE<jaar>-<volgnummer>`.
- **De tekst van het formulier staat letterlijk in de code**
  ([`lib/evaluatie.ts`](src/lib/evaluatie.ts)): het blok *Gegevens* (datum
  bezoek, tijd, bedrijfsnaam, contactpersoon, e-mailadres), de negen punten
  van de *Checklist* met hun toelichting (RI&E, PSA, aanstellingskeuring,
  vrije toegang bedrijfsarts, PMO, preventiemedewerker met twee open vragen,
  ondernemingsraad, klachtenprocedure, verzuimprotocol), de drie vrije vakken
  (*Evaluatie dienstverlening (tevens wijzen op het KTO)*, *Wensen komend jaar
  dienstverlening*, *Gemaakte afspraken*), *Datum volgend bezoek* met *Tijd*
  en *tot*, en de tabel *Acties* (acties, actie door, status). De toelichting
  houdt het "u" van het origineel; de knoppen en uitleg eromheen zeggen "je".
  Niets samenvatten of herschrijven zonder nieuwe opdracht. Het ene vakje per
  punt is online een keuze uit drie: *Ja, geregeld*, *Nee, nog niet*, *Niet van
  toepassing* ("(van toepassing)" staat al bij de aanstellingskeuring), met een
  toelichting die leeg mag. De "nee's" zijn de **aandachtspunten**
  (`aandachtspunten()`): in het beheer bovenaan, in het seintje aan sales en in
  de bevestiging aan de klant.
- **Klantpagina** `/evaluatie/<token>`
  ([`EvaluatiePagina.tsx`](src/components/evaluatie/EvaluatiePagina.tsx),
  [`EvaluatieFormulier.tsx`](src/components/evaluatie/EvaluatieFormulier.tsx)):
  de kopbalk van de onboarding (`OnboardingKopbalk` met `titel`), de opening
  in de lila tint met het persoonlijke woord (`bericht`, met `{bedrijf}` en
  `{voornaam}`), de feiten (het bezoek, hoe lang het duurt) en rechts de kaart
  met de voortgangsring van de checklist, de vier delen en het aanspreekpunt;
  dan de vier delen als banden (checklist, dienstverlening, afspraken, acties),
  één formulier met onderaan *Ingevuld door* en de knop; de indigo band *Zo
  gaat het verder* en de voet. Elk punt van de checklist is verplicht; de rest
  mag leeg. Na het invullen staat bovenaan *Dank je wel* met de pdf, en kan de
  klant tot het gesprek aanpassen (status blijft `ingevuld`, tijdlijn
  *aangepast*). Modus klant, collega (bezoek telt niet, invullen mag, samen
  tijdens het bezoek) en voorbeeld, zoals de onboarding.
- **Database**: `evaluaties` (status `concept`, `verstuurd`, `ingevuld`,
  `ingetrokken`; `antwoorden` jsonb; `ingevuld_at`, `ingevuld_door`;
  `bezoek_datum`, `bezoek_tijd`) en `evaluatie_gebeurtenissen`. De klant komt
  nooit bij de tabel: `evaluatie_bekijken(token)` en
  `evaluatie_opslaan(token, data, naam)` zijn security definer, de trigger
  `evaluatie_bewaken` houdt het bezoek en de antwoorden bij de database. De
  vorm van de antwoorden controleert Next (`schoonAntwoorden`,
  `controleerAntwoorden`). Bewaartermijn: twee jaar na de laatste activiteit
  (cron `opruimen-evaluaties`), omdat de evaluatie het vertrekpunt voor het
  gesprek van volgend jaar is.
- **Pdf en mail**: [`lib/evaluatiePdf.tsx`](src/lib/evaluatiePdf.tsx) volgt
  de indeling van het Word-formulier in de huisstijl van de onboardingpdf's,
  leeg om te printen (twee pagina's) of ingevuld met de vakjes in de kleur van
  het antwoord. [`lib/evaluatieMail.ts`](src/lib/evaluatieMail.ts): de
  uitnodiging en herinnering aan de klant (*Jouw mening telt*, met de vier
  delen als lijst), de bevestiging na het invullen met de pdf als bijlage en
  de aandachtspunten, en de seintjes aan de afzender (geopend; ingevuld of
  aangepast, met de aandachtspunten). Geen automatische herinnering via een
  cron: de herinnering gaat met de hand vanuit het beheer.
- **Klantenbord**: een nieuwe evaluatie maakt (of vindt) de kaart van het
  bedrijf in de kolom *Klant* (bron `evaluatie`); *verstuurd*, *geopend*,
  *ingevuld* en *aangepast* komen als systeemregels in de tijdlijn via
  `klant_gebeurtenis` (0043 vervangt die functie met de bron `evaluatie`
  erbij), en de evaluatie staat als koppeling op de kaart. Een evaluatie
  verplaatst een kaart niet.
- **Middleware en headers**: `/evaluatie/*` gaat om de onderhoudspagina en de
  doorverwijzingen heen en krijgt `noindex`, `no-referrer` en `no-store`, zoals
  de onboarding. Tests: `src/lib/evaluatie.test.ts`,
  `src/lib/evaluatiePdf.test.tsx` en de browsertest `e2e/evaluatie.cjs`.

## Omzet en uren

Sinds migratie [0035](supabase/migrations/0035_omzet_uren.sql) (Rens, 4 nov 2026:
"ik wil een sales dashboard en een omzet module en daarbij een overzicht te
vullen met werknemers met het aantal declarable uren"; zien en invullen:
"super admin"). Drie schermen:

- **`/admin/verkoop`** (salesrecht `bellijst`): het salesdashboard over 30
  dagen, 90 dagen of 12 maanden. Getekend in de periode (op de datum van
  tekenen), de hitrate (het cohort dat in de periode verstuurd is, dezelfde
  `hitrate()` als het dashboard en /admin/offertes), de doorlooptijd (mediaan
  van versturen tot tekenen) en de gemiddelde deal; de open pijplijn per fase
  (niet geopend, bekeken, koos onderdelen); de trechter van brochure tot
  handtekening (een brochure "leidde tot een offerte" als er daarna een offerte
  voor dezelfde klant kwam, zoals in het Verkoopblok); offertes per maand; per
  soort en per verkoper (de afzender op de offerte); en de hele opvolglijst.
  Regels in [`lib/verkoop.ts`](src/lib/verkoop.ts).
- **`/admin/omzet`** (nieuw recht `omzet`, alleen de super admin): de omzet per
  maand uit **abonnementen** (elke getekende offerte, met de keuze die de klant
  tekende, vanaf de maand van tekenen tot hij is beëindigd), **eenmalige**
  onderdelen (in de maand van tekenen) en **declarabele uren** × het uurtarief
  van de medewerker (in de maand van de donderdag van de week). Kerncijfers,
  12 maanden gestapeld, de abonnementsbrug (liep vorige maand + nieuw −
  gestopt = loopt nu), per label (uit de `label` van de offerteregels), de
  klanten (op bedrijfsnaam zonder rechtsvorm) en de uren van deze maand.
  *Abonnement beëindigen* zet een rij in `abonnementen_gestopt` (eerste maand
  zonder omzet); *Hervatten* haalt hem weg. Een eigen tabel, want
  `offerte_bewaken` houdt een getekende offerte ongewijzigd. Regels in
  [`lib/omzet.ts`](src/lib/omzet.ts).
- **`/admin/omzet/uren`** (recht `omzet`): het rooster, zes weken naast
  elkaar. Per medewerker per week de declarabele uren en de uren afwezig
  (verlof, ziekte, feestdag); elk vakje bewaart zichzelf bij het verlaten
  (`urenBewaren`), Enter gaat een rij omlaag, *als vorige* vult de lege vakjes
  van een week met die van de week ervoor, en twee keer leeg haalt de week weg
  (niet ingevuld is iets anders dan nul uur). Daaronder de medewerkers:
  contracturen, norm, uurtarief (leeg: de uren tellen niet in de omzet) en
  actief. Regels in [`lib/uren.ts`](src/lib/uren.ts).

- **`/admin/verkoop/los`** (salesrecht of recht omzet, migratie
  [0036](supabase/migrations/0036_losse_opdrachten.sql)): **losse klanten en
  opdrachten**, wat buiten de offertes om is afgesproken (Rens: "we hebben al
  veel klanten en soms heb je losse klanten met enkele opdracht"). Eén voor
  één: een klant met een abonnement (bedrag per maand, sinds, en eventueel
  *gestopt vanaf*) of een losse opdracht (totaal op een datum), met dienst,
  verkoper en notitie. [`lib/losseOpdrachten.ts`](src/lib/losseOpdrachten.ts)
  maakt er een getekende offerte met één regel van (`alsOfferte`, `bron:
  "los"`), zodat verkoop en omzet er zonder uitzondering mee rekenen: getekend,
  per maand, per soort ("Overig" zonder dienst), per verkoper, de labels, de
  klanten (samen met hun offertes op naam) en beëindigen (op de eigen rij, niet
  in `abonnementen_gestopt`). Zonder `verstuurd_at` telt hij niet in de
  hitrate, de doorlooptijd, de trechter of de pijplijn, en niet in de
  opvolglijst. Het Verkoopblok op het dashboard telt hem mee in *Getekend, 30
  dagen*.

Het is **omzet uit afspraken, geen boekhouding**: wat niet betaald wordt of
niet in een offerte staat, zit er niet in. Een getekende offerte telt door tot
hij is beëindigd; er is geen koppeling met de looptijd van het basiscontract.
Het recht `omzet` mag ook getekende offertes lezen (policy in 0035), zodat een
rol met omzet maar zonder salesrecht de abonnementen ziet. De grafieken
(`components/admin/Grafiek.tsx`) volgen de grafiekregels: dunne staven, één
as, 2px tussen stapeldelen, een legenda vanaf twee reeksen, een tip bij
aanwijzen en de cijfers als tabel; violet, aqua en geel zijn getoetst op
kleurenblindheid. Browsertest: `e2e/omzet.cjs`.

## Weekevaluatie

Sinds migratie [0044](supabase/migrations/0044_weekevaluatie.sql) (Rens, 18 nov
2026: "bouw de weekevaluatie voor werknemers van react2u in de admin, zodat we
deze data kunnen gebruiken in de kwartaalmeetings. maak dus ook een werknemer
rol"). Voor de collega's van React2u zelf, niet voor klanten (dat is de
klantevaluatie onder Documenten).

- **Rol en recht.** Het recht `weekevaluatie` (je eigen weekevaluatie invullen
  en teruglezen) hoort bij de super admin en de beheerder, en is het enige
  recht van de nieuwe rol **Werknemer**. Een collega met die rol ziet na het
  inloggen het dashboard met het signaal "je weekevaluatie staat nog open",
  zijn eigen scherm en Account; `/admin/omzet`, de bellijst en de rest sturen
  hem terug (`requirePerm`) en de policies geven niets terug. Uitnodigen gaat
  gewoon via Gebruikers met de rol Werknemer; tweestaps blijft verplicht.
- **De vragen staan in code**, in `VRAGEN` in
  [`lib/weekevaluatie.ts`](src/lib/weekevaluatie.ts), zoals `DOCUMENTEN` bij de
  onboarding, in drie lagen (sinds 0045; Rens, 18 nov: "wat zijn nog betere
  vragen. 1 om het werkgeluk te meten [...] 2 de druk, kennis en toewijding te
  meten 3 hoe kunnen we vragen stellen die terug komen in de kwartaalmeetings"):
  - **Elke week**, twee minuten: zeven cijfers van 1 tot 10 waar hoger altijd
    beter is. Werkgeluk: energie en plezier. Druk: werk paste in de tijd,
    emotioneel te dragen, loskomen na het werk. Kennis: kon je met je kennis
    uit de voeten. En het cijfer voor de week. Daarna drie open vragen: het
    hoogtepunt, waar je tegenaan liep (met vaste thema's: werkdruk, kennis,
    klant of werkgever, samenwerking, systemen, planning) en, alleen bij een 6
    of lager voor kennis, welke kennis je miste (met thema's als Wet
    poortwachter, re-integratie, gesprekstechniek, XpertSuite, sales).
    Sinds 0046 (Rens: "meer vrije invulvelden en een open veld om iets te
    melden of delen") ook vrije velden: een toelichting bij de cijfers, wat
    kon beter, wat heb je nodig, wat neem je mee naar volgende week. En een
    eigen blok **Iets melden of delen**: de soort (iets wat niet goed gaat, een
    idee, een compliment, een vraag, iets anders; één keuze), de tekst en een
    vinkje "Stuur dit meteen door" (een mail aan de super admin). Waar een open vraag in het formulier
    staat, zegt `blok` in `VRAGEN`.
  - **De laatste week van de maand**: zes stellingen over toewijding en wat
    werkgeluk voedt (trots, extra inzet, gewaardeerd, eigen ruimte, geleerd,
    steun van collega's), met een vrij veld voor een toelichting. Toewijding
    schommelt niet per week, en wekelijks vragen maakt moe.
  - **De laatste week van het kwartaal**: de terugblik. Hoe zeker zie je jezelf
    over een jaar nog hier, en waarom; je hoogtepunt van het kwartaal; wat
    volgend kwartaal anders moet, bij jou en bij React2u.
  Elke week dezelfde woorden: een andere formulering is een andere vraag, en
  dan breekt de trend. Een week hoort bij de maand en het kwartaal van zijn
  donderdag (`isMaandEinde`, `isKwartaalEinde`). De cijfers zijn verplicht, de
  teksten niet. **Niets over gezondheid** (klachten, slaap): een werkgever mag
  geen medische gegevens vastleggen, dus we vragen naar het werk. Boven het
  formulier staat waar de antwoorden voor zijn (`WAARVOOR`): om inzicht te
  houden en samen te blijven verbeteren, nooit voor beoordeling of salaris.
  Wat een werknemer ziet noemt geen namen (Rens, 19 nov 2026: "haal mijn naam
  eruit"): een melding gaat "meteen door", niet "naar Rens", en bij "Wat heb
  je nodig?" staat "van React2u of van je collega's". Een sleutel hernoemen maakt oude
  antwoorden onvindbaar; een vraag erbij is een regel in code.
- **Terug in de kwartaalmeeting.** Drie dingen lopen van de week naar de
  meeting: de **doelen** (`weekevaluatie_doelen`, 0045: één tot drie per
  kwartaal, vastgelegd in punt 7 van de agenda, alleen met het recht `omzet`;
  de collega ziet ze in zijn formulier en geeft elke week een cijfer voor zijn
  voortgang met een regel toelichting), het **vinkje** "meenemen naar de
  kwartaalmeeting" bij elk open antwoord (`bespreken` in de antwoorden), en de
  **thema's** bij het knelpunt en de gemiste kennis, die per kwartaal geteld
  worden.
- **Een melding meteen doorsturen** (0046): met het vinkje mailt de server
  action de melding na het bewaren naar wie het recht `omzet` heeft
  (`weekevaluatie_ontvangers()`, security definer, want een werknemer kan
  `admins` niet lezen), met de tekst erbij en de collega als antwoordadres
  (`sendWeekevaluatieMelding`, tekst in `meldingMail`). Een vingerafdruk van
  soort en tekst (`melding_verstuurd` in de antwoorden, `meldingInhoud`)
  voorkomt dat opnieuw bewaren opnieuw mailt; een aangepaste tekst gaat wel
  opnieuw. Mislukt de mail, dan meldt het scherm dat, en staat de melding nog
  in het overzicht. Het formulier zegt erbij: is het dringend, bel dan.
- **Twee zware weken** (0045): twee weken achter elkaar een 4 of lager voor
  energie of voor tijd. Na het bewaren roept de server action
  `weekevaluatie_signaal(p_week)` aan (security definer); die bekijkt deze
  week met de week ervoor en de week erna met deze, zet `signaal_at` zodat
  opnieuw bewaren niet opnieuw mailt, en geeft de adressen van wie het recht
  `omzet` heeft. De mail (`sendWeekevaluatieSignaal`, tekst in `signaalMail`)
  noemt de weken en de schalen, niet de antwoorden. Dezelfde regel staat in
  code (`signaal`, `SIGNAAL_GRENS`) voor het dashboard en het overzicht; wie
  de grens verandert, verandert beide.
- **Eén evaluatie per ISO-week**, de week is zijn maandag zoals bij de uren.
  Deze week en vorige week staan open; aan het eind van de week erna sluit een
  week (`weekStand`, `sluitOp`). Dat zit ook in de database: de insert- en
  update-policy laten alleen `weekevaluatie_deze_week() - 7` tot en met deze
  week toe, en alleen de eigen `user_id`. Er is geen delete-policy: een
  evaluatie pas je aan, je haalt hem niet weg.
- **`/admin/weekevaluatie`** (recht `weekevaluatie`): de twee open weken als
  kaarten (met "met maandvragen" of "met terugblik" erbij), het formulier van
  de gekozen week in lagen (`WeekevaluatieForm`, een client component omdat
  "welke kennis miste je" pas verschijnt bij een lage kennis), daaronder je
  laatste twaalf weken als grafiek (energie, tijd, kennis) en de eerdere weken
  om terug te lezen. Is de collega gekoppeld aan een medewerker, dan staan zijn
  uren van die week uit de urenregistratie erbij (alleen lezen; policies
  "eigen medewerker lezen" en "eigen uren lezen").
- **`/admin/weekevaluatie/team`** (recht `omzet`): het kwartaaloverzicht,
  opgebouwd als **de agenda van de kwartaalmeeting**. Per kwartaal
  (`?kwartaal=2026-Q4`) bovenaan het team: de signalen, ingevuld van verwacht,
  energie, tijd en kennis met de trend tegenover het kwartaal ervoor, de
  teamgrafiek per week (`Grafiek.tsx`), hoe vaak elk knelpunt- en
  kennisthema gekozen is (het begin van het opleidingsplan) en wat het team
  meldde en deelde. Dan per collega acht agendapunten: 1. de doelen van dit
  kwartaal met de voortgang per week en de laatste toelichting; 2. hoe het
  ging (de zeven weekcijfers met trend, de grafiek, de twee zwaarste weken, de
  signalen, de toelichting bij de cijfers); 3. toewijding en groei per maand
  (de maandvragen in een tabel, met de toelichting); 4. knelpunten, kennis en
  wat hij nodig heeft; 5. wat hij meldde of deelde; 6. wat hij wil bespreken;
  7. zijn terugblik; 8. de doelen voor volgend kwartaal, vast te leggen in de
  meeting. Daaronder alle antwoorden per week. Wie welke
  weken miste staat in de kop van de kaart (weken van vóór zijn uitnodiging
  tellen niet), net als de declarabiliteit als hij gekoppeld is. **Export**
  (`/admin/weekevaluatie/team/export`): één rij per collega per verstreken
  week, gemiste weken erbij met de status "gemist", met alle cijfers, thema's,
  vrije velden, de melding, doelvoortgang, bespreekpunten, de maandvragen, de
  terugblik en het signaal,
  als Excelbestand uit [`lib/xlsx.ts`](src/lib/xlsx.ts). Het ophalen staat in
  [`lib/weekevaluatieDb.ts`](src/lib/weekevaluatieDb.ts), gedeeld door scherm,
  export en dashboard.
- **Waarom `omzet` en niet `gebruikers`.** Het overzicht bevat persoonlijke
  reflecties van collega's en zet ze naast hun declarabele uren. Het recht
  `omzet` dekt al de medewerkers en hun uren en is sinds 0035 alleen van de
  super admin; `gebruikers` gaat over accounts en rollen. Wie het overzicht
  moet zien krijgt dus `omzet`, en daarmee ook de omzet; een apart recht is er
  bewust niet, dat zou het dertiende zijn.
- **Wie doet mee** (`doetMee`): iedereen met het recht, behalve de super admin
  zolang die zelf nooit invulde. Die heeft het recht omdat hij alles heeft,
  niet omdat hij meedoet; zonder deze regel stond Rens elke week als "gemist"
  in zijn eigen overzicht en kreeg hij elke vrijdag een herinnering. Vult hij
  één keer in, dan telt hij gewoon mee. `weekevaluatie_deelnemers()` (security
  definer, alleen met `omzet`) geeft de kandidaten; de regel zelf staat in code.
- **Koppeling met de uren.** `medewerkers.user_id` (0044) koppelt een
  medewerker uit de omzetmodule aan een account, via het veld *Account in het
  beheer* bij Omzet → Uren (alleen zichtbaar na de migratie; zonder het recht
  `gebruikers` staat alleen je eigen account in de lijst). Eén account per
  medewerker. Zo heet de collega in het overzicht zoals bij de uren, en staan
  uren en evaluatie naast elkaar.
- **De vrijdagherinnering** (`api/cron/weekevaluatie`, vercel.json: vrijdag
  13:00 UTC, dus 14:00 of 15:00 Nederlandse tijd): aan wie meedoet en deze week
  nog niets invulde, met één knop naar het scherm
  (`sendWeekevaluatieHerinnering`, tekst in `herinnering()`; in de laatste week
  van de maand of het kwartaal noemt hij de maandvragen en de terugblik). `?dry=1` plant
  alleen, `?altijd=1` ook op een andere dag. Draait met de service-role-sleutel,
  zoals de andere crons.

Regels en 34 unittests in `lib/weekevaluatie.ts`; browsertest
`e2e/weekevaluatie.cjs` (met een tweede testcollega in de rol werknemer, in een
eigen browsercontext naast de beheerder; de maandvragen en de terugblik test hij
in gesloten weken, omdat welke lagen er open staan van de datum afhangt).

## Prognose

Sinds migratie [0049](supabase/migrations/0049_prognose.sql) (Rens, 19 nov
2026: "Zouden we een soort van prognosetool kunnen inbouwen, waarin we op basis
van het aantal medewerkers een indicatie kunnen showen van de werkdruk die er
de komende periode aankomt? [...] dan kunnen we ook gericht sturen op het
aantal medewerkers dat we nodig hebben", en: "neem ook de weekevaluatie van
werknemers hierin mee"). `/admin/prognose`, recht `omzet`, in het menu onder
Omzet. Rekenregels in [`lib/prognose.ts`](src/lib/prognose.ts), ophalen in
[`lib/prognoseDb.ts`](src/lib/prognoseDb.ts).

- **De bronnen**, per bedrijf één keer (op de bedrijfsnaam zonder rechtsvorm):
  - *lopende klanten*: de kaarten met status akkoord, inrichten of klant. Het
    aantal werknemers van de stamkaart (0048), of anders dat van hun getekende
    offerte (wat er getekend is gaat voor);
  - *getekend, gaat nog in*: de startdatum komt van de ingangsdatum op de
    offerte, dan de startdatum op de kaart, dan de ingangsdatum van het
    contract, en anders de datum van tekenen plus een vaste inrichtingstijd;
  - *de pijplijn*: openstaande, niet verlopen offertes voor bedrijven die nog
    geen klant zijn, gewogen met de kans op tekenen. Die kans is de eigen
    hitrate van het laatste halfjaar (dezelfde telling als het
    salesdashboard), of wat Rens instelt. De verwachte start is versturen plus
    de mediane doorlooptijd plus de inrichtingstijd.
  Alleen verzuimbegeleiding en Reflex tellen als werknemers; RI&E, PAGO,
  trainingen en trajecten zijn eenmalige opdrachten met een urennorm.
- **Van werknemers naar casemanagers** met één norm: werknemers per fte
  casemanager. Zonder ingestelde norm is dat de huidige verhouding, de
  werknemers van de lopende klanten gedeeld door de fte casemanagement van
  nu; die wordt alleen berekend als elke lopende klant een aantal heeft, anders
  vraagt de prognose te weinig mensen. Daarbovenop inrichtingsuren per nieuwe
  klant en uren per eenmalige opdracht, alleen als Rens die norm invult: er
  wordt niets uit een prijs afgeleid. De **bezetting** zijn de actieve
  medewerkers in Omzet → Uren met "casemanager" in de functie, hun
  contracturen gedeeld door een volle werkweek.
- **Het advies**: de eerste maand waarin de bezetting, met een kwart fte
  speling, niet genoeg is, eerst voor de zekere vraag en dan met de pijplijn;
  daarvoor de wervingstijd ("begin uiterlijk in december met werven"). Het
  staat bovenaan het scherm en, als er geworven moet worden, op het dashboard
  van wie het recht `omzet` heeft.
- **De weekevaluaties als controle.** De prognose rekent met verhoudingen; de
  weekevaluatie zegt of die te dragen is. Per maand het gemiddelde van de
  casemanagers voor "werk paste in de tijd" en energie, de laatste vier weken
  als kerncijfer, en een oordeel bij de norm: onder de 6 is krap (zet de norm
  lager), onder de 7 redelijk, daarboven ruim. **Per casemanager** zijn
  portefeuille (de klanten met zijn naam als casemanager op de kaart; de
  voornaam is genoeg, `zelfdePersoon`) tegenover wat hij volgens de norm
  aankan, naast zijn eigen tijd en energie, als hij aan zijn account gekoppeld
  is. Zo zie je niet alleen hoe het voelt, maar ook waarom.
- **Scherper maken**: klanten zonder aantal werknemers (met het voorstel uit de
  getekende offerte al ingevuld) en zonder casemanager zijn vanaf de prognose
  aan te vullen, via de stamkaart (`wijzigStamkaart`, met een regel in de
  tijdlijn; vraagt het salesrecht). Getekende offertes zonder ingangsdatum
  linken naar de offerte. De **ingangsdatum** staat in de offerte-editor
  naast het aantal medewerkers, en na tekenen in het blok Intern: hij staat in
  `offerte_bewaken` bij de vrije velden, zoals de notitie.
- **Normen** (`prognose_normen`, één rij, recht `omzet`): werknemers per fte,
  uren in een volle werkweek, kans op de pijplijn, inrichtingsuren, start na
  tekenen, wervingstijd en uren per eenmalige opdracht. **Wat als**
  (`?extra=1&vanaf=2027-03&kans=50`): rekent met een extra collega of een
  andere kans, zonder iets op te slaan.

Regels en unittests in `lib/prognose.ts`; browsertest `e2e/prognose.cjs`.

## Klantenbord

Sinds migratie [0040](supabase/migrations/0040_klantenbord.sql) (Rens, 16 nov
2026: "maak ook een whiteboard met onze leads en klanten zodat we een scherm
hebben met overzicht van de status, laatste gesprekken etc"), achter het
salesrecht `bellijst`: [`/admin/klantenbord`](src/app/admin/(panel)/klantenbord/page.tsx).
Eén scherm met alle leads en klanten als kaarten in kolommen per status, per
kaart het laatste gesprek en de volgende stap, een lijstweergave en de import
van de klantlijst uit Excel. Het datamodel volgt Rens' `klantlijst.xlsx`:
startdatum, klant, de vinkjes *offerte retour*, *contract retour*,
*koppeling*, *formulieren retour* en *naar Exact/facturatie*, een vrije kolom
met de laatste stand en soms een contactpersoon.

- **Statussen** (de kolommen, [`lib/klanten.ts`](src/lib/klanten.ts),
  `KLANT_STATUS`): *Lead* (nog geen gesprek), *In gesprek*, *Offerte uit*
  (wacht op de klant), *Akkoord* (offerte retour, contract onderweg),
  *Inrichten* (contract retour, React2u richt in), *Klant* (ingericht en live)
  en apart *Inactief* (verloren, gestopt of geparkeerd; op het bord ingeklapt
  tot je hem opent of een kaart erheen sleept). Verplaatsen: slepen, de
  statusknoppen in het zijpaneel, het menu op de kaart (op een telefoon), of
  in één keer bij het vastleggen van een gesprek. Elke verplaatsing komt als
  regel *status* in de tijdlijn.
- **De kaart**: bedrijf, eigenaar (initialen van wie bij React2u de klant
  heeft), contactpersoon, telefoon en mail, het laatste contact (datum en
  tekst, via een trigger uit de tijdlijn in `laatste_contact_op` en
  `laatste_contact`), de volgende actie met datum (te laat is roze met een
  rode rand, vandaag oranje), de vijf vinkjes als stippen, en wat er in de
  andere modules van deze klant staat (`koppelingenVoor`: offertes,
  brochures, contracten, onboardings en de bellijstlead met dezelfde
  bedrijfsnaam zonder rechtsvorm, zoals het Verkoopblok). Zegt een module
  meer dan de kolom (offerte getekend, contract getekend, onboarding
  ingericht), dan staat er een hint *Zet op Akkoord?* (`statusHint`); het bord
  verplaatst niet zelf. Binnen een kolom staat wat te laat is bovenaan, dan
  vandaag, dan gepland, dan zonder datum, dan op laatste wijziging
  (`sorteerKaarten`).
- **Het zijpaneel** ([`KlantPaneel.tsx`](src/components/admin/klantenbord/KlantPaneel.tsx)):
  de volgende stap (met *Vandaag*, *Morgen*, *Over een week*, *Over een
  maand* en *Gedaan*), een gesprek vastleggen (gesproken, gemaild, bezoek of
  notitie, met datum; Cmd+Enter) met in dezelfde handeling de volgende stap en
  een nieuwe kolom, de tijdlijn (`klant_gesprekken`; *status* en *import* zijn
  systeemregels en tellen niet als contact), het instaptraject (de vijf
  vinkjes), de koppelingen en de gegevens. Zonder kaart is het het formulier
  voor een nieuwe lead of klant (`#nieuw`, ook uit het commandopalet).
- **Herkomst** (migratie 0047): hoe de klant ons vond, uit de vaste keuzelijst
  van [`lib/herkomst.ts`](src/lib/herkomst.ts), met een toelichting (wie
  doorverwees, welke beurs). Verplicht bij een kaart met de hand (`maakKlant`)
  en bij elke offerte in de editor; een kaart uit een offerte krijgt hem van die
  offerte (trigger `klantenbord_offerte`, en later alsnog als de offerte hem
  krijgt), een kaart uit een brochure, contract of import blijft leeg tot iemand
  hem invult. De kaart toont *herkomst?* zolang hij ontbreekt. Het oude vrije
  veld `bron` blijft bestaan voor wat er al stond en voor de module die de
  kaart maakte.
- **Alle klanten** (de knop naast *Vandaag*, migratie 0048) opent de
  klantenlijst: alleen de echte klanten (akkoord of verder), elk met een
  stamkaart; de kaart en het paneel linken er ook heen, ook voor een lead.
  Zie *Klantenlijst en stamkaart* hieronder.
- **Zoeken en filteren** gebeuren in de browser: elk woord moet ergens
  voorkomen (bedrijf, contactpersoon, mail, eigenaar, stand, volgende actie,
  laatste contact, bron; een telefoonnummer zonder spaties), filter op
  eigenaar, *Actie vandaag of te laat* (ook via de KPI *Te doen*) en *Zonder
  volgende stap*. De lijst (`?weergave=lijst`) is dezelfde set als tabel,
  sorteerbaar per kolom.
- **Import van de klantlijst** ([`KlantImport.tsx`](src/components/admin/klantenbord/KlantImport.tsx),
  `#import`): het Excelbestand wordt in de browser gelezen
  (`lib/xlsxLezen.ts`), of een csv, of geplakte rijen. `herkenKolommen` kijkt
  eerst naar de kopregel en daarna naar de inhoud van kolommen zonder (of met
  een onbekende) kop: datums, ja/nee, namen van mensen, en anders vrije tekst
  als laatste stand. Een kop *casemanager* (of *case manager*, *CM*) is de
  casemanager op de stamkaart, geen eigenaar: de klantlijst van november 2026
  had Robin Roos, Nadja en Ida in zo'n kolom en die kwamen als eigenaar op het
  bord (Rens, 19 nov 2026: "zijn casemanagers"; op productie met de hand
  verplaatst, met een regel in de tijdlijn). Zo overleeft de import de klantlijst van november 2026,
  waar de kop *naar excact/facturatie verzonden* boven een lege kolom staat en
  de standtekst in de kolom ernaast zonder kop. `statusUitRij` leidt de kolom
  af: precies "ingericht" is klant, contract retour is inrichten, "offerte
  verstuurd" is offerte uit, offerte retour (of "akkoord", "getekend") is
  akkoord, een gesprek of bezoek is in gesprek, anders lead. Eerst het
  **controlerapport** (`importVoorstel`): per kolom wat hij is, per rij nieuw,
  bijwerken, ongewijzigd of overslaan, wat er verandert, en opmerkingen (geen
  bedrijfsnaam, dubbel in het bestand, een vinkje dat geen ja of nee is, en een
  startdatum in het verleden bij wie nog geen klant is: in de lijst stond "1-1"
  voor januari en Excel maakte er het lopende jaar van). Pas daarna
  `importeerKlanten` (server action), die alles opnieuw tegen de database van
  nu doet. **Zonder dubbelen**: `klanten.sleutel` is de bedrijfsnaam zonder
  rechtsvorm, hoofdletters, accenten en leestekens (`bedrijf_sleutel()` in
  SQL, `bedrijfSleutel()` in TypeScript, dezelfde regel als `normalizeName`),
  uniek. Een gevulde cel wint, een lege laat staan wat er stond; de status gaat
  alleen vooruit; een inactieve kaart blijft inactief; de naam op het bord
  blijft zoals hij er stond. Elke import schrijft een regel *import* in de
  tijdlijn met wat er veranderde.
- **Kaarten ontstaan en bewegen zelf** (migratie
  [0041](supabase/migrations/0041_klantenbord_automatisch.sql), Rens, 17 nov
  2026, uit het S-tier-voorstel). Een nieuwe offerte, brochure, contract (geen
  resellerovereenkomst), onboarding of los opgevoerde klant maakt een kaart aan
  als die er nog niet is (trigger per tabel, `klant_zeker`: dezelfde sleutel is
  dezelfde kaart; lege contactgegevens worden aangevuld, wat er stond blijft).
  Elke rij in `offerte_gebeurtenissen`, `brochure_gebeurtenissen`,
  `contract_gebeurtenissen` en `onboarding_gebeurtenissen` gaat door
  `klant_gebeurtenis`: één functie die de tekst, of het een contact was en de
  verplaatsing bepaalt. Verplaatsen: offerte verstuurd of herinnerd naar
  *Offerte uit*, offerte getekend naar *Akkoord*, contract verstuurd naar
  *Akkoord*, contract getekend naar *Inrichten*, onboarding verstuurd of klant
  klaar naar *Inrichten*, *live* naar *Klant*, een losse klant naar *Klant*.
  Alleen vooruit (`klant_vooruit`, `klant_status_rang`); inactief telt als het
  begin, dus nieuwe activiteit haalt een geparkeerde kaart terug. Wie een kaart
  bewust terugzet, houdt dat tot de volgende stap in de modules. Een
  afgewezen offerte verplaatst niet: de kaart blijft op *Offerte uit* met de
  afwijzing in de tijdlijn, parkeren doe je zelf. De keuze van de klant
  (`offertes.keuze_at`) heeft geen gebeurtenis en krijgt een eigen trigger.
  Alles security definer: een klant die een offerte bekijkt schrijft via
  `offerte_bekijken` (anon) en moet toch op het bord kunnen.
  `klantenbord_inlezen()` zet wat er al in de modules stond op het bord (in de
  migratie gedraaid; kan vaker, `bron_gebeurtenis` voorkomt dubbelen).
- **De tijdlijn toont alles.** Naast wat je zelf vastlegt staan er regels
  `systeem` met `bron` (offerte, brochure, contract, onboarding, opdracht) en
  `bron_id` om door te klikken: aangemaakt, verstuurd (naar wie), herinnering,
  bekeken, code aangevraagd, koos zelf onderdelen, getekend (door wie),
  afgewezen, ingetrokken, heropend, een document ingevuld of afgevinkt, klant
  klaar, live, een werknemer die de machtiging tekende. `door` is het
  e-mailadres van de collega, `klant` of `automatisch`. `contact` zegt of een
  regel een echt contact was: het laatste contact op de kaart kijkt alleen
  daarnaar, dus een verplaatsing, een import of "aangemaakt" telt niet, een
  bekeken offerte wel. Met het recht `bezoek` komt het sitebezoek erbij
  (bedrijfsherkenning, dezelfde `summarize` als Bezoek → Bedrijven, laatste
  twee weken, `bezoekPerKlant`): op de kaart *Op de site 40 min geleden ·
  3 pagina's*, in de tijdlijn per sessie welke pagina's. Dat staat niet in de
  database maar wordt bij het laden gekoppeld op bedrijfsnaam.
- **De werkdag** (Rens, 17 nov 2026, fase 2 van het S-tier-voorstel):
  - **Vandaag** ([`/admin/klantenbord/vandaag`](src/app/admin/(panel)/klantenbord/vandaag/page.tsx),
    de knop *Vandaag* op het bord met de teller): wie bel ik nu. Eén rij per
    klant uit de opvolgsignalen van het Verkoopblok (`haalVerkoop`,
    `verkoopOverzicht`), wat te laat is, wat vandaag moet en wie de laatste
    twee dagen op de site was ([`lib/werkrij.ts`](src/lib/werkrij.ts),
    `werkrij`): signalen eerst (warm boven let-op), dan te laat (het langst
    eerst), dan vandaag; een sitebezoek duwt omhoog. Per rij vier uitkomsten
    (*Gesproken* met tekst, volgende stap en kolom; *Niet bereikt* legt
    "Niet bereikt" vast en zet morgen dezelfde actie; *Morgen*; *Klaar* haalt
    de volgende stap weg, of slaat een rij die alleen op een signaal staat
    over) en het toetsenbord: pijltjes of J/K, Enter of G, N, M, D, S. Een
    afgehandelde rij verdwijnt; de teller telt op tot de rij leeg is.
  - **Bellen legt zichzelf vast** ([`lib/belAfloop.ts`](src/lib/belAfloop.ts),
    [`BelAfloop.tsx`](src/components/admin/klantenbord/BelAfloop.tsx)): tik je
    op een telefoonnummer op het bord, in het paneel of in de werkrij, dan
    staat in `localStorage` (`kb-bel`) wie je belde. Kom je terug in de
    browser (visibilitychange, focus, pageshow) na minstens acht seconden en
    binnen een dag, dan vraagt een vak onderaan "Je belde net Fatima, wat is
    er afgesproken?": *Niet bereikt* (morgen opnieuw bellen), *Gesproken*
    (tekst en volgende stap), *Geen interesse* (naar inactief). Korter dan
    acht seconden is een misklik en vraagt niets.
  - **Mailen vanuit de kaart** ([`lib/klantMail.ts`](src/lib/klantMail.ts),
    `mailKlant` in de actions): sjablonen *Kennismaking bevestigen*,
    *Offerte nabellen*, *Welkom*, *Even checken* en *Zelf schrijven*, met
    {voornaam} (uit de contactpersoon; een voorletter is geen voornaam),
    {bedrijf} en de naam van de collega (uit het e-mailadres, aan te passen en
    onthouden in `localStorage`). De mail gaat via `sendBrief` in de huisstijl
    met de collega als antwoordadres; pas als hij weg is komt hij als regel
    `mail` in de tijdlijn (`Gemaild: <onderwerp> · <eerste zin>`) en zet het
    sjabloon zijn volgende stap (offerte nabellen over drie dagen). Zonder
    Resend zegt het paneel dat.
  - **Ochtendmail** ([`api/cron/klantenbord`](src/app/api/cron/klantenbord/route.ts),
    elke werkdag om 06:00 UTC via `vercel.json`, inhoud in
    [`lib/ochtendmail.ts`](src/lib/ochtendmail.ts)): aan elke collega met het
    salesrecht (`admins` met `bellijst` in de rol) één mail: *Voor jou* (te
    laat en vandaag van kaarten waarvan de eerste naam van de eigenaar in het
    e-mailadres staat: "Cindy" in cindy.faro@), *Gisteren bij klanten*
    (systeemregels van de laatste 30 uur waar de klant iets deed, in gewone
    taal: "Korenaar bekeek de offerte"), *Opvolgen volgens de modules* (de
    warme en let-op-signalen) en *Rest van het team*. Het onderwerp vat het
    samen: "Vandaag 3 acties, 2 te laat, Korenaar bekeek de offerte". Niets te
    melden is geen mail; `?dry=1` toont de plannen, `?weekend=1` ook in het
    weekend. Service-role, zoals de andere crons.
- **Database**: `klanten` en `klant_gesprekken`, RLS op `has_perm('bellijst')`,
  trigger `klant_laatste_contact` voor het laatste contact op de kaart. Geen
  automatische opschoning: een klant blijft staan tot iemand hem van het bord
  haalt (cascade naar zijn gesprekken). De server actions
  ([`klantenActions.ts`](src/app/admin/klantenActions.ts)) geven een resultaat
  terug in plaats van een redirect: het bord werkt zichzelf bij zonder te
  herladen.
- **Tests**: `lib/klanten.test.ts` (statussen, afleiding uit de klantlijst,
  kolomherkenning met en zonder kop, het voorstel, datums, zoeken, sorteren,
  koppelingen, csv) en [`e2e/klantenbord.cjs`](e2e/klantenbord.cjs) (het lege
  bord, een nieuwe lead, gesprek met volgende stap en verplaatsing, vinkjes,
  slepen, de koppelingen en de kaart die zelf naar Akkoord gaat als de offerte
  getekend wordt, import met controlerapport en een tweede keer zonder
  dubbelen, zoeken, de lijst, de telefoon, verwijderen, kaarten die uit een
  brochure, contract, onboarding en losse opdracht ontstaan en meebewegen,
  het sitebezoek op de kaart, `klantenbord_inlezen()` zonder dubbelen,
  `bedrijf_sleutel` tegenover `bedrijfSleutel`, de werkrij met het
  toetsenbord, het telefoontje dat zichzelf vastlegt, mailen vanuit de kaart
  via de nep-Resend en de ochtendmail via de cron), `lib/werkrij.test.ts`,
  `lib/klantMail.test.ts`, `lib/belAfloop.test.ts` en `lib/ochtendmail.test.ts`.

## Klantenlijst en stamkaart

Sinds migratie [0048](supabase/migrations/0048_stamkaart.sql) (Rens, 19 nov
2026: "maak in het klantenbord een knop naar alle klanten onder elkaar.
bedrijfsinformatie als stamkaart, documenten en tariefafspraken", met vier
schermafbeeldingen van een inlenerslijst in een uitzendplatform als
inspiratie): de knop **Alle klanten** op het bord opent
[`/admin/klanten`](src/app/admin/(panel)/klanten/page.tsx), dezelfde kaarten
als lijst, en elke rij (en de kaart en het zijpaneel op het bord) opent de
**stamkaart** [`/admin/klanten/<id>`](src/app/admin/(panel)/klanten/[id]/page.tsx).
Recht `bellijst`, zoals het bord. De regels staan in
[`lib/stamkaart.ts`](src/lib/stamkaart.ts), de acties in
[`stamkaartActions.ts`](src/app/admin/stamkaartActions.ts), de schermen in
`src/components/admin/klanten/`.

- **De lijst** ([`KlantenLijst.tsx`](src/components/admin/klanten/KlantenLijst.tsx)):
  **alleen echte klanten** (Rens, 19 nov 2026: "alleen echte klanten, leads
  staan op het bord"): de kaarten in *Akkoord*, *Inrichten* en *Klant*
  (`KLANT_STATUSSEN`, `echteKlanten`), zoals zijn klantlijst in Excel; een
  inactieve kaart alleen als hij ooit klant was (contract retour, koppeling,
  facturatie of een startdatum), onder *Ook gestopt*. Leads, gesprekken en
  openstaande offertes blijven op het bord; de telling noemt hoeveel er daar
  staan. Per rij: bedrijf (met plaats en KvK), status op het bord, contactpersoon met functie,
  telefoon en mail, wie de klant bij React2u heeft (casemanager, anders de
  eigenaar), de laatste activiteit en hoe compleet de stamkaart is (`x/8`,
  `stamkaartVolledigheid`: KvK, bezoekadres met postcode en plaats,
  contactpersoon met telefoon en mail, factuur-e-mail). Zoeken zoals op het
  bord plus KvK, plaats, casemanager, website en functie
  (`filterKlantenlijst`), een kolom als filter, gestopte klanten alleen op
  verzoek, sorteren per kolom (`sorteerKlantenlijst`). Alles in de browser;
  `?q=` en `?status=` staan in de URL.
- **Stamkaart**: vijf blokken (`STAMKAART`): Bedrijf (KvK, rechtsvorm,
  branche, SBI, website, aantal werknemers, algemeen nummer en adres), Adres
  (bezoek- en postadres), Contactpersoon (naam, functie, telefoon, mail; dat
  zijn de bestaande `contactpersoon`, `telefoon` en `email` van de kaart),
  Facturatie (factuur-e-mail, btw, debiteurnummer, IBAN met tenaamstelling,
  bevoegd ondertekenaar) en Bij React2u (eigenaar, casemanager, startdatum,
  plus de status en herkomst van het bord, alleen te lezen). *Bewerken* zet
  alles in één formulier; `schoonStamkaart` maakt het netjes (KvK acht
  cijfers, IBAN met de mod-97-controle en zonder spaties, postcode `5611 NB`,
  website met `https://`, btw zonder punten) en zegt in woorden wat niet
  klopt. Alleen wat veranderde komt als regel `stamkaart` in de tijdlijn
  ("Stamkaart bijgewerkt: Rechtsvorm, IBAN"), geen contact.
- **Niemand typt dubbel** (`voorstelStamkaart`): voor elk leeg veld wat de
  modules al weten, de meest betrouwbare bron eerst: het (getekende) contract
  (opdrachtgever: KvK, bezoekadres, wie tekende als bevoegd ondertekenaar,
  ingangsdatum als startdatum), dan de onboarding (wat de klant zelf invulde
  bij *Inrichting nieuwe klant*: KvK, btw, factuuradres als postadres,
  factuur-e-mail, contactpersoon met functie, casemanager, debiteurnummer),
  dan de offerte (aantal medewerkers, de factuurgegevens bij het tekenen, wie
  tekende), de bellijst (naam, telefoon, mail) en de bedrijfsherkenning of het
  domein van het e-mailadres voor de website (niet van gmail en zo). De
  stamkaart toont het voorstel in grijs bij het veld met de bron erbij, per
  veld *Overnemen* of in één keer *Alles overnemen* (`neemVoorstelOver`): de
  tijdlijn zegt dan waar het vandaan kwam ("Stamkaart aangevuld uit de
  modules: KvK-nummer (contract C2026-0003), …"). Een veld dat intussen gevuld
  is blijft staan. Een resellerovereenkomst telt niet als bron.
- **Documenten** (`documentenVoor`): alles van deze klant uit alle modules in
  één tabel, nieuwste eerst, gevonden op de bedrijfssleutel: brochures (pdf
  via de klantlink), offertes (getekend: de pdf met certificaat; anders de
  concept-pdf), het basiscontract met zijn checklist arbeidsomstandigheden
  (ingevuld, bijgewerkt of nog niet), de onboarding (klantpagina,
  verzuimprotocol, inrichting als pdf, werknemersbestand als Excel) met per
  getekende machtiging een rij en de opdracht tot overdracht, klantevaluaties,
  resellerovereenkomsten als de klant partner is, en de **eigen bestanden**:
  bucket `klantbestanden` (privé, 20 MB, pdf, Word, Excel, afbeeldingen) en
  tabel `klant_bestanden`, zoals de partnerbestanden (0034): uploaden vanuit
  de browser ([`KlantBestanden.tsx`](src/components/admin/klanten/KlantBestanden.tsx)),
  soort *getekend stuk*, *correspondentie* of *ander bestand* met een
  omschrijving, downloaden via `/admin/klantbestand/<id>` (nooit een deelbare
  link). Filter per soort.
- **Tariefafspraken**: uit de getekende offertes per offerte de regels die de
  klant koos (en de vaste, en de tarieven bij gebruik), per label (Recover,
  Resist, …) gegroepeerd, met het bedrag zoals het op de offerte staat
  (`tariefRegel`: "€38,50 per medewerker per jaar", "× 12 medewerkers",
  abonnement of eenmalig) en de totalen van de offerte zelf; de losse klanten
  en opdrachten (0036); en de **afwijkende afspraken** (`klant_tarieven`):
  vrije regels met label, omschrijving, bedrag met een eenheid uit de
  offerte-eenheden (of op aanvraag), ingangs- en einddatum en een
  toelichting, bij te houden op de stamkaart
  ([`Afspraken.tsx`](src/components/admin/klanten/Afspraken.tsx)). Niets
  wordt hier uitgerekend: vaste bedragen zoals vastgelegd.
- **Tijdlijn**: dezelfde als het zijpaneel (het delen nu
  [`Tijdlijn.tsx`](src/components/admin/klantenbord/Tijdlijn.tsx)), met een
  kort formulier om een gesprek vast te leggen; de volgende stap en de kolom
  blijven op het bord.
- **Database**: de stamkaartvelden op `klanten`, de soort `stamkaart` in
  `klant_gesprekken`, `klant_tarieven`, `klant_bestanden` en de bucket; alles
  achter `has_perm('bellijst')`. Zonder 0048 werkt de lijst en meldt de
  stamkaart het. Tests: `lib/stamkaart.test.ts`, `lib/klantBestanden.test.ts`
  en de browsertest [`e2e/klanten.cjs`](e2e/klanten.cjs) (een klant uit
  offerte, contract, onboarding en opdracht, de lijst, het voorstel en alles
  overnemen, bewerken met controle, de documenten, uploaden en downloaden, de
  tarieven en een afspraak erbij, de tijdlijn, de telefoon).

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
inzendingen (oudste eerst), wie vandaag gebeld moet worden, de verkoop (zie
hieronder), bezoek deze week tegenover vorige week, SEO-problemen en 404's,
concepten, vacatures die aflopen, de laatste wijzigingen, en voor wie
instellingen beheert welke koppelingen uit staan (mail, bezoekregistratie,
bedrijfsherkenning, uitnodigen — alleen óf ze gezet zijn, nooit de waarde). Wie
geen tweestapsverificatie heeft, krijgt bovenaan een oproep. Tijden en de
begroeting rekenen in Europe/Amsterdam; de server draait in UTC.

**Het Verkoopblok** (salesrecht `bellijst`) zet offertes, brochures en
contracten bij elkaar: vier cijfers (open offertes per maand, getekend de
laatste 30 dagen, de hitrate over 90 dagen — dezelfde berekening als op
/admin/offertes — en de getekende basiscontracten) en daaronder wat er
opgevolgd moet worden, belangrijkste eerst. De regels staan in
[`lib/opvolgen.ts`](src/lib/opvolgen.ts), met de grenzen in `DREMPELS`:

- **Offerte** (verstuurd): *Koos onderdelen* (de klant klikte zelf iets aan en
  keek deze week), *Net bekeken* (laatste 48 uur) of *Bekeken* (deze week),
  *Daarna stil* (bekeken, al een week niets), *Niet geopend* (na 3 dagen),
  *Verlopen* (een maand lang). Loopt de geldigheid binnen 5 dagen af, dan staat
  dat erbij en gaat hij omhoog.
- **Getekend zonder basiscontract**: alleen bij verzuimbegeleiding en Reflex
  (een RI&E of traject is een losse opdracht), 60 dagen lang. Eén verstuurd of
  getekend contract voor die klant is genoeg; staat er een concept klaar, dan
  gaat de rij daarheen, anders naar een nieuw contract bij deze offerte.
- **Brochure**: bekeken in de laatste 14 dagen en nog geen offerte voor die
  klant (ook geen concept), of na 5 dagen niet geopend.
- **Contract** (verstuurd): net bekeken, bekeken, daarna stil of niet geopend,
  net als een offerte; dat geldt ook voor een resellerovereenkomst. Getekend
  basiscontract: de laatste opzegdag valt binnen 60 dagen, tijd voor een
  evaluatiegesprek. Een resellerovereenkomst loopt voor onbepaalde tijd en telt
  niet als basiscontract, ook niet in het cijfer erboven.
- **Onboarding** (0037): *Klant klaar* zodra de klant alles heeft aangeleverd en
  er nog taken van React2u openstaan (60 dagen lang, naar de checklist); een
  klant die bezig is hoeft niemand te bellen, maar *Daarna stil* na 10 dagen
  zonder bezoek, en *Niet geopend* na 5 dagen. Ingericht: weg van het dashboard.

Een herinnering of nieuwe verzending (gebeurtenis `verstuurd` of `herinnering`)
zet *Niet geopend* en *Daarna stil* drie dagen stil: `verstuurd_at` blijft op
de eerste keer staan, dus daar is de tijdlijn voor nodig. **Dezelfde klant**
herkent het blok aan de bedrijfsnaam zonder rechtsvorm, het e-mailadres of het
maildomein (niet bij Gmail, Hotmail en dergelijke): een brochure weet niet
welke offerte eruit volgde, en een klant met twee offertes heeft maar één
basiscontract nodig. Met het recht op Bezoek komt erbij of het bedrijf de
laatste dagen op de site was (*Op de site 40 min geleden, 3 pagina's*); dat
duwt de rij omhoog. Er is geen knop "afgehandeld": een signaal verdwijnt als de
reden weg is (getekend, afgewezen, gemaild of te lang stil om nog warm te zijn).
Browsertest: `e2e/dashboard.cjs`.

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

Structured data als één geheel ([`src/lib/organisatie.ts`](src/lib/organisatie.ts)):
op `/` en `/en` één `@graph` met de organisatie (`Organization` én
`LocalBusiness`, `@id https://react2u.nl/#organisatie`, KvK als `identifier`,
btw-nummer, adres Stratumsedijk 29, openingstijden, LinkedIn) en de `WebSite`
met die organisatie als `publisher`. Een artikel (`BlogPosting` +
`BreadcrumbList`) en een vacature (`JobPosting`) verwijzen met hetzelfde `@id`
naar die knoop (`organisatieRef()`: `publisher`, `hiringOrganization`), zodat
Google één bedrijf ziet. `JobPosting` staat alleen op de Nederlandse
vacaturepagina (één vacature per baan; de Engelse hangt er via hreflang aan)
en heeft altijd een `validThrough`: de einddatum uit de admin, of anders 90
dagen na de laatste wijziging (`geldigTot()` in `lib/vacatures.ts`). Een
vacature die niemand bewerkt verdwijnt dus na drie maanden uit Google for Jobs
tot hij een einddatum krijgt of opnieuw wordt opgeslagen; de dashboardkaart
"loopt af" kijkt alleen naar de echte einddatum. Alle 32 vacatures stonden in
november 2026 zonder einddatum.

**Titels en omschrijvingen** blijven onder 60 en 160 tekens, de maten waarop
Google afkapt (`TITLE_MAX`/`DESC_MAX` in `seo.ts` zijn de redactiehulp). De
werkgebiedpagina's heten "Arbodienst {plaats} • React2u" (maximaal 43 tekens;
met "Persoonlijke verzuimbegeleiding" ertussen werden er 336 afgekapt). De
Engelse vacaturepagina kort de Engelse intro in met `kort()`; de concepten in
`src/content/` en `vakgebieden.ts` zijn in november 2026 ingekort. De
Nederlandse pagina's lezen titel en omschrijving uit de database: een te lange
tekst daar pas je aan in `/admin/seo`, niet in de code.

**`/index` is `/`.** Next ziet `/index` als de root en antwoordde er met de
homepage; `usePathname()` gaf bij het voorbouwen "/index", waardoor de
taalknop daarnaar linkte. `kaalPad()` in `lib/taal.ts` rekent `/index` en
`/en/index` als het startscherm, en `INDEX_REDIRECTS` (`lib/redirects.ts`,
via `next.config.ts`) stuurt het adres met een 301 naar `/` en `/en`.

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

**Voor AI-agents.** [`/llms.txt`](src/app/llms.txt/route.ts) is een
Markdown-overzicht van de site (llmstxt.org): kopjes met links naar de
pagina's, artikelen en vacatures, met de SEO-omschrijving uit de database.
Welke pagina onder welk kopje staat, staat in [`src/lib/llms.ts`](src/lib/llms.ts);
een nieuwe gepubliceerde pagina komt vanzelf onder "Meer pagina's". Het
bestand ververst elk uur, net als de sitemap, en heeft een
`X-Robots-Tag: noindex` (voor agents, niet als zoekresultaat). De drie
aanvraagformulieren (contact, kennismaken, partners) zijn WebMCP-tools via
`toolname`/`tooldescription` ([`src/lib/webmcp.ts`](src/lib/webmcp.ts)),
zonder `toolautosubmit`: een agent vult in, de bezoeker verstuurt. Een
`ai-catalog.json` is er bewust niet: de site heeft geen API of MCP-server om
in zo'n catalogus te zetten.

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
niets zegt. Pagina's zonder item in de database hebben sinds november 2026 ook
een datum: de 354 werkgebiedpagina's de constante `WERKGEBIED_BIJGEWERKT` in
[`src/lib/gemeenten.ts`](src/lib/gemeenten.ts) (ophogen bij een wijziging aan
`plaatsen.json`, `PlaatsPagina.tsx` of de titel/omschrijving), een
vakgebiedpagina de nieuwste vacature in dat vakgebied (of de nieuwste
vacature), de open sollicitatie en `/en` respectievelijk de nieuwste vacature
en pagina.

## Bewaartermijnen en privacy

`pg_cron` draait dagelijks om 03:30 de functie
`public.opruimen_verlopen_gegevens()`. Die verwijdert contactberichten na 12
maanden, leads na 24 maanden en bezoekgegevens na 12 maanden.

**Offertes** (migratie 0028, job `opruimen-offertes` om 03:25): een offerte die
niet is ondertekend gaat een jaar na de laatste activiteit (`updated_at`) weg, met
zijn tijdlijn en code. Een getekende offerte is onderdeel van de overeenkomst en
blijft; zeven jaar na het einde van de overeenkomst is dat handwerk (de trigger
`offerte_bewaken` laat hem via de API ook niet verwijderen). De tekst voor de
privacyverklaring staat in `docs/privacyverklaring/aanvulling-h-offertes.md`.

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

Sinds migratie [0047](supabase/migrations/0047_herkomst.sql) telt ook een klik
op een telefoonnummer of mailadres (`bel`, `mail`; `KlikTracker.tsx` meldt hem
aan `/api/track`, één per soort per pagina per bezoek), want bij een arbodienst
komen de meeste aanvragen zo binnen en niet via een formulier. Klikken zijn geen
aanvragen: `aanvragen()` en `klikken()` houden ze uit elkaar, en het percentage
rekent alleen met formulieren. Bij elke rij staan verder de **herkomst** (wat de
bezoeker koos bij "hoe heb je ons gevonden"; verplicht in contact en
kennismaken, niet in de belbalk), de **bron** en de **landingspagina** (beide
uit `sessionStorage`, `BronOnthouden.tsx`, net als `applications.bron`) en de
daghash van de bezoeker (`visitor_hash`, dezelfde als in `page_views`; geen IP,
roteert elke nacht). Daarmee laat `/admin/bezoek` zien hoe werkgevers ons
vonden, welke pagina's tot bellen of mailen leiden en op welke pagina het bezoek
begon dat later iets opleverde. Dezelfde herkomst, bron en landingspagina staan
op `contact_messages` (het Postvak IN toont ze als pil) en gaan via *Offerte
maken* mee de offerte in.

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
roepen hem aan) en `0047_herkomst.sql` (bel- en mailklikken in `conversions`;
herkomst, bron en landingspagina op `conversions` en `contact_messages`;
`herkomst` en `herkomst_toelichting` op `klanten` en `offertes`; `klant_zeker()`
met twee parameters erbij en de trigger die de herkomst van een offerte naar de
kaart brengt) en `0048_stamkaart.sql` (stamkaartvelden op `klanten`, de soort
`stamkaart` in de tijdlijn, `klant_tarieven`, `klant_bestanden` en de bucket
`klantbestanden`). Supabase-project `tumwtappyegkjabtmold`.

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
bedrijfsherkenning, offertes, de offerte-pdf). Die bevatten de
regels waar het op aankomt; de schermen eromheen zijn dun.

**Browsertests** (`npm run e2e`, sinds 30 okt 2026): de offertemodule van begin tot
eind in een echte browser (`e2e/offerte.cjs`, `e2e/vormen.cjs`), en sindsdien per
module een test (brochure, contract, onboarding, klantenbord, klanten, evaluatie, reseller, partner, dashboard, omzet, weekevaluatie). `e2e/run.mjs`
bouwt een lokale Supabase-stack met alle migraties (doorgenummerd, met de
testbeheerder, lege versies van twee productiefuncties en pg_cron uit
`e2e/supabase/extra`), bouwt en start de site met de juiste omgevingsvariabelen
(`.env.local` blijft onaangeroerd), vangt mails op in een nep-Resend, stelt een
authenticator in voor de testbeheerder en ruimt alles weer op. Nodig: Docker en de
Supabase CLI. Uitvoer (screenshots, mails, de pdf's) in `.e2e/uitvoer`.
`E2E_HOUDEN=1` laat de stack staan, `E2E_GEEN_BUILD=1` slaat de build over,
`E2E_ALLEEN=offerte` draait één test. Test een andere sessie tegelijk, geef dan
`E2E_STACK=2` (eigen stack `react2u-e2e-2` op poorten 573xx) met een eigen
`E2E_POORT` en `E2E_RESEND_POORT`: de stacks heten anders allebei
`react2u-e2e`, en de ene `supabase stop` legt dan de andere plat.
`e2e/dashboard.cjs` draait als laatste, want hij maakt de verkooptabellen leeg
voor zijn eigen vaste set.

**GitHub Actions** (`.github/workflows/tests.yml`) draait bij elke pull request en
push naar master twee jobs: lint, typecheck en Vitest, en de browsertests (zo'n
tien minuten). Mislukt een browsertest, dan staan de screenshots en mails als
artefact bij de run. Er zijn geen geheimen voor nodig. Een nieuwe migratie die op
productie iets verwacht wat niet in de migraties staat, krijgt een stub in
`e2e/supabase/extra`.
