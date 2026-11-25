# ADR 0003: Een dag cache met verversen bij wijziging, en een middleware zonder supabase-js

Datum: 2026-11-25 · Status: aangenomen

## Context

Op 24 november 2026 pauzeerde Vercel het hele team *FlexHero's projects* een
maand lang: de fair-use-limiet van het Hobby-plan voor Fluid Active CPU (4 uur
per maand) was overschreden. Elk domein in het team toonde "This deployment is
temporarily paused". Uit de Usage-pagina bleek dat react2u 5,5 van de 6,3 uur
had verbruikt, met daarnaast 494.000 ISR-writes (limiet 200.000) en 1,1 miljoen
CDN-verzoeken. De eigen bezoekregistratie zag in dezelfde maand zo'n 5.800
paginaweergaven: vrijwel al het verkeer kwam van crawlers.

Drie dingen in de code maakten elk crawlerverzoek duur:

1. Elke publieke pagina stond op `revalidate = 300`. Een pagina die een crawler
   om de vijf minuten aanraakte, werd om de vijf minuten opnieuw gebouwd.
2. De vangnetten `(site)/[...rest]` en `en/[...slug]` en de 354
   werkgebiedpagina's onder `(site)/[slug]` werden pas bij de eerste aanvraag
   gebouwd, met dezelfde korte cache.
3. De middleware bouwde voor elke publieke pagina een supabase-js-client op om
   de onderhoudsstand en de doorverwijzingen op te halen (15 seconden
   onthouden per instantie, wat op de edge zelden helpt). Middleware was 42%
   van alle CPU-tijd.

## Beslissing

- **`revalidate = 86400` op elke publieke pagina en layout.** Inhoud verandert
  alleen via de admin, en elke admin-actie die inhoud raakt roept al
  `revalidateSite()` aan (`revalidatePath("/", "layout")`). De tijdgebonden
  cache is dus geen bron van versheid maar alleen een vangnet, en mag lang
  zijn. Er is geen inhoud die op tijd verandert (vacatures en artikelen hebben
  een status, geen einddatum).
- **De werkgebiedpagina's in `generateStaticParams`.** `werkgebiedSlugs()` in
  `lib/gemeenten.ts` levert alle provincie- en gemeenteslugs; de build maakt ze
  één keer.
- **De vangnetten blijven `dynamicParams = true`.** `dynamicParams = false` zou
  een onbekend adres zonder functie-aanroep laten afhandelen, maar dan verliest
  de 404 de sitelayout en de 404-registratie (ADR 0001). Met een dag cache kost
  een verzonnen adres nog één render per dag; dat is aanvaard.
- **Geen supabase-js op het publieke pad van de middleware.** De twee selects
  gaan als kale `fetch` naar PostgREST met de publieke sleutel (dezelfde RLS),
  een minuut onthouden per instantie. `@supabase/ssr` wordt met `await import`
  pas geladen voor `/admin` en voor de doorlaat van beheerders tijdens
  onderhoud. `CONTACT_FALLBACK` verhuist naar `lib/contact.ts`, zodat
  `lib/maintenance.ts` geen `lib/content.ts` (en daarmee supabase-js) meer
  meeneemt in de middleware-bundel. `lib/content.ts` biedt de constante opnieuw
  aan, dus bestaande imports blijven werken.

## Gevolgen

- Een wijziging via de admin is net zo snel zichtbaar als voorheen; een
  wijziging die *niet* via de admin loopt (direct in de database) kan tot een
  dag onzichtbaar blijven. Dat was met vijf minuten ook al een anomalie, nu is
  hij zichtbaar. Een databasewijziging buiten de admin om vraagt dus om een
  redeploy of een `revalidatePath`.
- De onderhoudsschakelaar en een nieuwe doorverwijzing kunnen tot een minuut
  per edge-instantie nodig hebben om overal te gelden (was 15 seconden).
- De build bouwt 354 pagina's meer. Build-tijd telt op Hobby niet mee voor de
  limiet die het team raakte.
- Niet opgelost in code: het verkeer zelf. Dezelfde dag is het team naar Pro
  gegaan en zijn in Vercel Firewall twee deny-regels gezet, vóór de
  middleware: op de user-agent van de uptime-monitor van de oude hoster
  (*group.one uptime-monitor*, de grootste bron) en op de scanpaden
  `/php-fpm-status`, `/.well-known/wp-cloud` en `/xmlrpc.php`. De managed
  ruleset *Bot Protection* staat uit vanwege de feeds die vacaturebanken
  ophalen. Zie CONTEXT.md, *Vercel-verbruik*.
