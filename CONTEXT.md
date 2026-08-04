# CONTEXT — React2u

De publieke website van React2u (verzuimbegeleiding, Eindhoven) met een eigen
beheeromgeving. Next.js 16 (App Router) + Supabase + Tailwind v4, gehost op Vercel.

Vervangt een WordPress-site. Zie **Openstaand** — die WordPress-site is op het
moment van schrijven nog altijd wat bezoekers op `react2u.nl` te zien krijgen.

## Woordenlijst

Gebruik deze termen; de code doet dat ook.

| Term | Betekenis |
|---|---|
| **Pagina** (`pages`) | Een publieke URL, geïdentificeerd door `slug`. Alleen zichtbaar bij `published = true`. |
| **Blok** (`blocks`) | Eén sectie binnen een pagina. Heeft een `type` (welk component) en `data` (jsonb, vorm hangt af van het type). Volgorde via `sort`. |
| **Bloktype** | De sleutel die een blok aan een React-component koppelt, bv. `hero`, `ctaBanner`. Zie *Valkuilen*. |
| **Vacature** (`vacancies`) | Statussen: `draft`, `published`, `closed`. Alleen `published` is publiek. |
| **Sollicitatie** (`applications`) | Inzending op een vacature of open sollicitatie. Cv gaat naar de private `cvs`-bucket. |
| **Bericht** (`contact_messages`) | Inzending van het contactformulier. |
| **Postvak IN** | Eén overzicht dat berichten en sollicitaties samenvoegt op volgorde van binnenkomst (`/admin/postvak-in`). Geen eigen tabel — een view over de twee bestaande. De losse pagina's Berichten en Sollicitaties blijven bestaan. |
| **Onbehandeld** | Wat in het Postvak IN als ongelezen telt. Per soort verschillend: een bericht heeft `read = false`, een sollicitatie heeft `status = 'nieuw'`. |
| **Instelling** (`site_settings`) | Key/value (jsonb). In gebruik: `contact` en `documents`. |
| **Beheerder** (`admins`) | Rij die een Supabase-auth-gebruiker toegang tot `/admin` geeft. Een auth-account zonder rij hier heeft géén toegang. |

## Architectuur

**Twee Supabase-clients, bewust gescheiden** — beide met de anon-sleutel; RLS doet
het autorisatiewerk. Er is nergens een service-role-sleutel, en die hoort er ook
niet te komen.

- [`src/lib/supabase/public.ts`](src/lib/supabase/public.ts) — anoniem, voor publieke reads en formulierinzendingen.
- [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts) — cookie-gebaseerd, voor het ingelogde adminpaneel.
- [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts) — browserclient, voor client components in de admin.

**Toegang tot `/admin`** loopt via [`requireAdmin()`](src/lib/admin.ts): ingelogd
zijn is niet genoeg, er moet ook een rij in `admins` staan.
[`src/middleware.ts`](src/middleware.ts) ververst alleen de sessie op `/admin/:path*`
— het is géén autorisatiepoort. De echte controle staat in de pagina's zelf.

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

## Openstaand

- **DNS staat nog op WordPress.** `react2u.nl` wijst naar `35.204.120.88` en
  antwoordt met `x-powered-by: WP.one`; nameservers bij Hostnet. Vercel verwacht
  `A react2u.nl 76.76.21.21` (of zijn nameservers). Het domein is in Vercel al
  aan het project gekoppeld, dus de omzetting is puur een DNS-handeling — let bij
  Hostnet op de MX- en TXT-records, die moeten blijven staan.
- **Geen e-mailnotificaties.** Contactberichten en sollicitaties komen alleen in
  Supabase terecht en zijn zichtbaar in het adminpaneel. Er is geen mailkoppeling
  (geen Resend/SendGrid/SMTP in `src`). Wie niet inlogt, mist inzendingen.
- **Toegang.** Het adminwachtwoord en een Vercel-token zijn buiten de repo gedeeld;
  het wachtwoord moet gewijzigd en het token ingetrokken worden.

## Database

Eén migratie: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
— tabellen, RLS-policies en de twee storage-buckets. Supabase-project
`tumwtappyegkjabtmold`.
