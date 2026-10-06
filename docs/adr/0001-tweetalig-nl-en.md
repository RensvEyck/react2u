# ADR 0001: Tweetalige site, Nederlands op de gewone paden en Engels onder /en

Datum: 2026-10-06 · Status: aangenomen

## Context

De site bedient ook internationale werknemers en HR-managers in Nederland die het
Nederlandse verzuimstelsel niet kennen. Er moest een Engelse versie komen van
(fase 1) de werknemerskant, de vacatures en het startscherm, en (fase 2) de
werkgeverskant. Randvoorwaarden:

- Engelse URL's met Engelse slugs onder `/en` (`/en/employees`, `/en/jobs/...`).
- `<html lang="en">` op elke `/en`-pagina, `nl` op de rest.
- Een taalknop die naar dezelfde pagina in de andere taal gaat, hreflang-tags en
  Engelse URL's in `sitemap.xml`.
- De Nederlandse inhoud komt in productie uit Supabase (`pages`/`blocks`) en op
  staging uit `src/content/*.json` (concepten). Gemeentepagina's, blog en de
  juridische PDF's blijven Nederlands.

## Beslissing

**Routering: drie root layouts, geen `[lang]`-segment.** Next.js kan `lang` op
`<html>` alleen in een root layout zetten. Een `app/[lang]/`-structuur zou alle
Nederlandse routes (en het adminpaneel) verplaatsen en elke bestaande URL door
een rewrite laten lopen. In plaats daarvan is `app/layout.tsx` weg en zijn er
drie root layouts die één component delen (`RootHtml`: `<html lang>`, fonts,
`globals.css`):

| Root layout | Pad | `lang` |
|---|---|---|
| `app/(site)/layout.tsx` | alles behalve `/en` en `/admin` | `nl` |
| `app/en/layout.tsx` | `/en/*` | `en` |
| `app/admin/layout.tsx` | `/admin/*` | `nl` |

Gevolgen: wisselen van taal is een volledige paginalading (dat is het toch, het
is een andere taal), en er is geen `app/not-found.tsx` meer voor adressen die
op geen route passen. Daarvoor zijn er vangnetten: `app/(site)/[...rest]` en
`app/en/[...slug]` roepen `notFound()` aan, zodat de 404 binnen de juiste
sitelayout verschijnt (met header, footer en de 404-registratie). Next' eigen
`global-not-found` is nog experimenteel en is daarom niet gebruikt. Kanttekening:
Next 16 stuurt bij `notFound()` een kaal document (`<html id="__next_error__">`,
zonder `lang`) met status 404 en bouwt de 404 in de browser op; dat deed de
site al zo voor een onbekende slug. Een Suspense-grens om `notFound()` geeft
wél volledige HTML, maar met status 200 (een zachte 404), en dat weegt zwaarder.

**Koppeltabel op één plek.** `src/lib/taal.ts` bevat `SLUGS` (NL-slug → EN-slug
voor álle pagina's die een vertaling krijgen) en `EN_KLAAR` (welke er al zijn).
Alles rekent hierop: `pad()` voor links in menu's en footer, `vertaalPad()` voor
de taalknop, `hreflangVoor()` voor de metadata en de sitemap. Een Engelse
pagina die er nog niet is, krijgt via `pad()` het Nederlandse adres; de taalknop
gaat dan naar `/en`. Het bestand importeert niets anders, zodat de header (een
client component) het kan gebruiken zonder inhoud of databasecode mee te slepen.
Een test (`taal.test.ts`) bewaakt dat `EN_KLAAR` klopt met de bestanden in
`src/content/en/`.

**Engelse inhoud als JSON in de code, niet in de database.** `src/content/en/`
bevat per pagina een bestand met dezelfde blokstructuur als het Nederlandse
concept, met de Engelse slug als `slug`. `conceptEn()` in `lib/concept.ts`
leest ze; anders dan de Nederlandse concepten gelden ze in elke omgeving, want
er is geen Engelse databasepagina. De blokcomponenten blijven één set: een blok
rendert wat in `data` staat, in welke taal dan ook. Later kan Engels alsnog naar
de database (bv. een `lang`-kolom op `pages`); dan verhuist alleen `conceptEn()`.

**Vaste interfaceteksten in één woordenboek per taal.** `src/lib/woordenboek/nl.ts`
is de bron (het type `Woordenboek`), `en.ts` moet dezelfde vorm hebben. Server
components roepen `woordenboek(taal)` aan; client components (header, footer,
cookiemelding, formulieren) lezen de taal uit `TaalProvider`/`useTaal()`, gezet
door `SiteShell`. Blokken krijgen de taal via `ctx.lang` van `BlockRenderer`,
alleen voor de paar vaste woorden die niet in de blokdata staan (het kruimelpad,
de 404). De menu's van het nieuwe ontwerp staan in het woordenboek als
`slug + anker`, en `menus(taal)` in `r2uStijl.ts` maakt er adressen van.

**Formulieren: dezelfde server actions, met `taal` als veld.** De actie kiest
de foutmelding in die taal en bewaart de taal in de kolom `lang` van
`contact_messages` en `applications` (migratie `0013_engels.sql`), zodat het
Postvak IN een EN-label toont. Ontbreekt de kolom nog, dan valt de insert terug
op een insert zonder `lang`: een formulier mag niet stuk zijn om één kolom.

**Vacatures: optionele Engelse velden.** `title_en`, `intro_en` en
`description_en_md` op `vacancies` (zelfde migratie), in te vullen in de admin.
Zonder Engelse titel toont `/en/jobs/<slug>` de Nederlandse tekst met bovenaan
"This vacancy is in Dutch" en `lang="nl"` op de tekst; het `JobPosting`-schema
krijgt `inLanguage` van de taal waarin de tekst staat. De vacatureslug is in
beide talen gelijk. De editor controleert of de kolommen bestaan en schakelt de
Engelse velden anders uit, met uitleg.

**x-default is Nederlands.** De meeste bezoekers en de rest van de site zijn
Nederlands; `/en` is de tweede taal, niet de standaard.

**Schrijfstijl Engels.** Eenvoudig Brits/internationaal Engels, "you", korte
zinnen, geen gedachtestreepjes, werknemerspagina's op B1-niveau. Nederlandse
stelselbegrippen krijgen bij de eerste vermelding op een pagina de Nederlandse
naam erbij. De woordenlijst:

| Nederlands | Engels |
|---|---|
| arbodienst | occupational health service (arbodienst) |
| verzuim | sickness absence |
| casemanager | case manager |
| bedrijfsarts | company doctor (bedrijfsarts) |
| taakdelegatie / praktijkondersteuner bedrijfsarts | task delegation / practice assistant to the company doctor |
| Wet verbetering poortwachter | Gatekeeper Improvement Act (Wet verbetering poortwachter) |
| Ziektewet | Sickness Benefits Act (Ziektewet) |
| eigenrisicodrager | self-insurer (eigenrisicodrager) |
| UWV | UWV, the Dutch Employee Insurance Agency |
| loonsanctie | wage sanction (loonsanctie) |
| probleemanalyse / plan van aanpak | problem analysis / action plan |
| eerstejaarsevaluatie / re-integratieverslag | first-year evaluation / reintegration report |
| tweede spoor | second-track reintegration (tweede spoor) |
| arbeidsdeskundige | labour expert (arbeidsdeskundige) |
| WIA | WIA (Work and Income according to Labour Capacity Act) |
| deskundigenoordeel | expert opinion by UWV (deskundigenoordeel) |
| RI&E / PMO | risk assessment (RI&E) / preventive medical examination (PMO) |
| vertrouwenspersoon | confidential adviser |
| FML | functional capacity list (FML) |
| React2u Recover, Resist, Restart, Reflex, Ready | niet vertalen |

Openingstijden: "Monday to Friday, 9:00 to 17:00". Telefoon: "+31 85 620 58 00".
Tarieven: dezelfde bedragen, "excl. VAT".

## Alternatieven

- **`app/[lang]/` met een rewrite voor Nederlands** (`/werknemers` → intern
  `/nl/werknemers`). Eén root layout en `next/root-params`, maar alle routes
  verhuizen, de admin ook, en elke aanvraag loopt door een rewrite. Te veel
  verandering voor wat `lang` op `<html>` oplost.
- **`lang` in de browser zetten** vanuit een client component. Dan staat
  `lang="nl"` in de HTML-bron van Engelse pagina's; zoekmachines en
  vertaalknoppen lezen juist die.
- **Engelse pagina's in de database** met een `lang`-kolom. Mogelijk, maar de
  Nederlandse site draait op staging zelf nog op concepten uit JSON; Engels
  erbij in dezelfde vorm houdt beheer en review in één stroom (git). Kan later.
- **Een i18n-bibliotheek** (next-intl e.d.). De site heeft twee talen, een
  handvol UI-teksten en inhoud die al per taal in JSON staat; een eigen
  woordenboek met een type is kleiner en zonder extra conventies.

## Gevolgen

- Een nieuwe vertaalde pagina = JSON in `src/content/en/` + de slug in `SLUGS`
  en `EN_KLAAR` + een regel in `concept.ts`. De test wijst het aan als één van
  de drie ontbreekt.
- Een nieuwe vaste UI-tekst komt in `nl.ts` én `en.ts`; TypeScript dwingt dat af.
- Blokken met vaste Nederlandse woorden (bv. een tabelkop) moeten die uit
  `woordenboek(ctx.lang)` halen zodra het blok op een Engelse pagina staat.
- Migratie `0013_engels.sql` moet op de live database draaien voordat de
  Engelse vacaturevelden in de admin te gebruiken zijn en het Postvak IN de taal
  toont; tot die tijd werkt alles verder gewoon.
