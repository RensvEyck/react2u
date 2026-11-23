# ADR 0003: Een kennisbank met onderwerpen, hulpmiddelen en een tweede reeks gidsen

Datum: 2026-11-24 · Status: aangenomen

## Context

Met de vijf gidsen uit het HALO-herstelplan (ADR 0002) had de site pagina's
over de onderwerpen waar werkgevers op zoeken, maar nog geen structuur eromheen.
De blog (`/blog`) was één lijst van negen artikelen; de gidsen hingen onder
"Kennis" in het kruimelpad, dat naar die blog wees. HALO had al gezien dat de
interne links vooral naar plaatsnamen gingen en de onderwerppagina's weinig
kracht kregen. Rens wilde het groter aanpakken: niet meer van hetzelfde, maar
een kennisbank die zichzelf versterkt, met hulpmiddelen die links en leads
opleveren.

## Beslissing

**Een kennisbank op `/kennis` met vier onderwerpen, in plaats van een blog.**
[`src/lib/kennis.ts`](../../src/lib/kennis.ts) kent vier onderwerpen (Verzuim,
Re-integratie, Preventie, Wet en regels), elk met een eigen pagina
(`/kennis/<onderwerp>`) die de gidsen, hulpmiddelen en artikelen van dat
onderwerp bundelt en terug linkt naar de dienst. Elke gids draagt een
`onderwerp`; een artikel krijgt het zijne uit een vaste lijst of uit zijn
titel (`onderwerpVanArtikel`). `/blog` gaat met een 301 naar `/kennis`
(`KENNIS_REDIRECTS`); de artikelen zelf blijven op `/blog/<slug>`, met het
kruimelpad Kennis › onderwerp › artikel en de gidsen van hun onderwerp onder
"Lees ook".

Daaruit volgt:

- **De hub zoekt in de browser.** Alles wat te vinden is (gidsen, hulpmiddelen,
  artikelen) gaat als lijst mee naar `KennisZoeker`; `zoekKennis` matcht op
  woordbegin zonder accenten, gidsen eerst. Geen zoekverzoek, geen registratie,
  geen extra tabel.
- **Hulpmiddelen zijn code, geen inhoud in de database.** De Poortwachter-planner
  (`lib/poortwachter.ts`: de weken uit de wet als datums, de 42e-weeksmelding op
  de eerste werkdag erna, een iCalendar-bestand met de evaluaties als herhaling),
  de loonsanctie-check (`lib/loonsanctieCheck.ts`: twaalf vragen met gewicht,
  onbekend telt als ontbrekend) en de checklist poortwachterdossier
  (`lib/checklistPoortwachter.ts`: 24 punten in vijf fasen, als pagina én als
  pdf). Ze rekenen puur en zijn getest; niets wordt opgeslagen.
- **De checklist is het enige hulpmiddel met een formulier.** De aanvraag komt
  als bericht in het Postvak IN (geen eigen tabel, geen eigen conversiesoort:
  de tabel `conversions` kent alleen de vier aanvraagsoorten), met dezelfde
  spamcontrole als de andere formulieren en een eigen limietsleutel. De pdf
  gaat per mail als Resend is ingericht en staat altijd als download op de
  pagina: de inhoud is openbaar, het formulier is een dienst, geen poort.
- **De tweede reeks gidsen** (arbodienst, zieke werknemer, verzuimverzekering,
  casemanager verzuim, loonsanctie, RI&E, eigenrisicodrager Ziektewet, twee jaar
  ziek) volgt dezelfde opbouw en test als de eerste; Reflex en Ready dragen nu
  ook gidsen. Het artikel over de loonsanctie is in de gids opgegaan (301); de
  artikelen over voorkomen en bekorten blijven als verdieping eronder.
- **De dienstnaam komt uit één bron.** `DIENSTEN` in `lib/organisatie.ts`
  (migratie 0059) levert de naam op elke gidskaart; `lib/gidsen.ts` kent alleen
  de kleuren. Dat bestand kan `organisatie.ts` niet importeren zonder kring
  (organisatie → nav → gidsen), dus alleen de componenten lezen eruit.
- **De strook op een dienstpagina toont hooguit vier gidsen**, met een link naar
  het onderwerp in de kennisbank voor de rest.

## Alternatieven

- **De blog uitbreiden met categorieën.** Dat houdt de artikelen centraal; de
  gidsen en hulpmiddelen zijn juist de pijlers waar de artikelen onder horen.
- **Zoeken op de server** met een index of een tabel. Overbodig bij een paar
  dozijn items, en elke zoekopdracht zou een verzoek en registratie betekenen.
- **De hulpmiddelen als blokken in de database.** Ze zijn interactief en rekenen;
  dat hoort in code met tests, niet in jsonb-data.
- **De checklist achter een verplicht e-mailadres.** Dat kost vindbaarheid en
  vertrouwen; de pagina met alle 24 punten is zelf de landingspagina.

## Gevolgen

- Een nieuw onderwerp: een regel in `ONDERWERPEN`; een nieuw hulpmiddel: een
  regel in `HULPMIDDELEN` plus een pagina onder `app/(site)/kennis/`; een nieuwe
  gids: zoals ADR 0002, met een `onderwerp` erbij. De sitemap, llms.txt, het
  kruimelpad en de kaarten volgen vanzelf.
- Migratie 0061 zet de tweede reeks gidsen in de database, het loonsanctie-
  artikel op concept, de kaarten op home en /diensten naar de kennisbank en de
  gidsen op de dienstpagina's; tot die tijd staan de acht slugs in
  `MIGRATIE_RESERVE`.
- `/blog` als adres bestaat niet meer; wie ernaar linkte, komt op de kennisbank.
