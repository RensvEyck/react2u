# ADR 0002: Gidsen als vaste pagina's op het hoofdniveau, niet als blogartikelen

Datum: 2026-11-23 · Status: aangenomen

## Context

De SEO-scan van HALO (SiteJob, 23 november 2026) liet zien dat react2u.nl op 57
zoekwoorden net buiten de eerste pagina van Google staat, maar geen pagina heeft
over de onderwerpen waar werkgevers op zoeken: re-integratie (6.600 zoekopdrachten
per maand), de Wet verbetering poortwachter (3.600), de bedrijfsarts (2.900), het
arbeidsdeskundig onderzoek (2.400) en de preventiemedewerker (1.600). Het
blogartikel over de Wet verbetering poortwachter verscheen 1.589 keer in vier
weken op gemiddeld positie 32 en leverde 2 klikken op. Punt 4 van het herstelplan
vraagt om vijf gidsen met een vaste opbouw: de H1 is de vraag, twee zinnen direct
antwoord, een stappenplan of tijdlijn, een tabel met termijnen of kosten, vijf tot
acht veelgestelde vragen (`FAQPage`), een auteur met naam en functie (`Person`) en
een blok "Zo helpt React2u" met een link naar de dienst en naar kennismaken.

De site kent twee soorten inhoud: pagina's uit `pages`/`blocks` (met een concept
in `src/content/` voor staging) en blogartikelen uit `posts` (markdown). Beide
hadden de gids kunnen dragen.

## Beslissing

**De gidsen zijn pagina's op het hoofdniveau** (`/re-integratie`,
`/wet-verbetering-poortwachter`, `/bedrijfsarts`, `/arbeidsdeskundig-onderzoek`,
`/preventiemedewerker`), opgebouwd uit eigen blokken (`gidsKop`, `gidsTekst`,
`gidsTijdlijn`, `gidsTabel`, `gidsVragen`, `gidsHelpt`;
[`src/components/blocks/Gids.tsx`](../../src/components/blocks/Gids.tsx)), met
een concept per gids in `src/content/<slug>.json` en in productie in
`pages`/`blocks`. Wat de rest van de site over een gids moet weten (vraag, korte
tekst, zoekwoord, dienst) staat op één plek,
[`src/lib/gidsen.ts`](../../src/lib/gidsen.ts).

Daaruit volgt:

- **Eén blok per onderdeel van de HALO-opbouw**, in plaats van één groot blok of
  markdown. Zo is de opbouw afdwingbaar (`src/lib/gidsen.test.ts` bewaakt de
  volgorde, de vijf tot acht vragen, de omvang en de maten van titel en
  omschrijving), bewerkbaar in het beheer per onderdeel, en gegarandeerd gelijk
  over de vijf gidsen. De tabel is een echte `<table>` die op de telefoon stapelt;
  de vragen gaan via `collectFaq` in dezelfde `FAQPage` als de andere blokken.
- **De auteur staat in de kop** (`auteur: { naam, functie }`, met `gepubliceerd`
  en `bijgewerkt`) en wordt door `BlockRenderer` als `Article` met een `Person`
  als `author` en React2u als `publisher` uitgestuurd (`gidsLd`). Niet in een los
  blok: één bron, en de kop toont dezelfde naam als de structured data.
- **De inhoudsopgave en de leestijd rekent `BlockRenderer` uit** uit de koppen en
  de tekst van de blokken erna, en geeft ze via `ctx.gids` aan de kop. Blokken
  kennen elkaar niet; de renderer wel.
- **Het oude blogartikel gaat met een 301 naar de gids** (`GIDS_REDIRECTS` in
  `lib/redirects.ts`, via `next.config.ts`, net als `DIENST_REDIRECTS`). De rij in
  `posts` blijft bestaan maar is niet meer gepubliceerd (migratie 0060), en
  `getPublishedPosts()` laat een artikel met een vaste doorverwijzing uit elke
  lijst, ook als de rij nog gepubliceerd staat.
- **Reserve per pagina in plaats van voor alles.** `reserveActief` blijft `false`
  (ADR-waardig sinds de SiteJob-scan: de publicatiestatus is leidend), maar
  `MIGRATIE_RESERVE` in `lib/concept.ts` noemt de slugs waarvan de SQL nog moet
  draaien. Alleen die tonen in productie hun concept. Zo kan de 301 van het
  artikel nooit op een 404 uitkomen, en komt een verborgen pagina nog steeds niet
  terug. Na migratie 0060 gaan de vijf slugs uit die lijst.
- **De gidsen zijn alleen Nederlands.** Geen Engelse tegenhanger, dus geen
  hreflang; `lib/taal.ts` kent ze niet.

## Alternatieven

- **Blogartikelen in `posts`.** Markdown kan geen tabel, tijdlijn of
  auteur-met-functie afdwingen, en `/blog/…` zet het onderwerp een niveau lager
  dan de diensten. HALO vraagt juist om vaste adressen op het hoofdniveau.
- **Eén groot blok `gids` met alles erin**, zoals `dienstLabel`. Dat garandeert
  gelijkheid, maar maakt de JSON onhandelbaar in de blokeditor en laat geen
  variatie toe (de preventiemedewerker heeft twee tekstblokken vóór de tijdlijn).
- **De inhoud in `richText`-blokken.** Dan is de opbouw niet te bewaken en zien
  de vijf gidsen er na een paar bewerkingen verschillend uit.

## Gevolgen

- Een nieuwe gids: een regel in `GIDSEN` (`lib/gidsen.ts`), een concept in
  `src/content/`, de slug in `CONCEPTEN` en tijdelijk in `MIGRATIE_RESERVE`
  (`lib/concept.ts`), en de SQL via `scripts/concept-naar-sql.mjs`. De kaarten
  op de homepage, `/diensten` en de blog, de strook op de dienstpagina
  (`gidsen` in de `dienstLabel`-data), het kruimelpad en `/llms.txt` volgen
  vanzelf uit `GIDSEN`.
- De auteur per gids is een beslissing van React2u, niet van de code. Rens van
  Eyck (bestuurder) staat op alle vijf de gidsen (zijn keuze, 23 november 2026);
  een andere auteur is één veld in de kop van de pagina.
- `/admin/seo` toont een gids pas als de pagina in de database staat; de
  concepten tellen niet mee in de aandachtspunten.
