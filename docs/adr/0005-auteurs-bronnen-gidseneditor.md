# ADR 0005: Auteurspagina's, bronnen en de gids als sjabloon in het beheer

Datum: 2026-11-24 · Status: aangenomen

## Context

De gidsen (ADR 0002, 0003) noemen een auteur met naam en functie, maar die naam
leidde nergens heen en was alleen in de code te veranderen. Google en de
AI-zoekmachines wegen wie iets schreef en of die persoon aantoonbaar bestaat
(E-E-A-T); een naam zonder pagina is een naam zonder bewijs. Bronnen ontbraken,
"bijgewerkt op" stond vast in de JSON, en een collega die in het beheer een
gids wilde schrijven kreeg een lege pagina en veldnamen als `antwoord` en
`rijen` zonder uitleg. Dit zijn de delen 3 en 4 van het kennisbankvoorstel.

## Beslissing

**Auteurs staan in de code, met een eigen pagina.**
[`src/lib/auteurs.ts`](../../src/lib/auteurs.ts) kent de auteurs (slug, naam,
functie, bio, registraties, onderwerpen); `/auteur/<slug>` toont de pagina met
de gidsen van die auteur en stuurt een `ProfilePage` met een `Person` uit. Elke
gids draagt een `auteur`-slug (lib/gidsen.ts); de naam in de kop van de gids
(`auteur.naam` in het blok) wordt via `auteurVoorNaam()` aan die pagina
gekoppeld, zodat de byline linkt en de `Article` van de gids dezelfde
`Person` (`@id`, `url`) noemt. Staat de naam niet in de lijst, dan blijft het
een naam zonder link: beter dan een kapotte link of een verzonnen pagina.

Daaruit volgt:

- **Alleen onderbouwde feiten.** Functie, sinds wanneer, en registraties zoals
  ze in het register staan. Geen registratie bekend, dan een lege lijst; de
  test bewaakt dat er niets wordt verzonnen.
- **"Gecontroleerd door" is een veld, geen verplichting.** `controle: { naam,
  functie, datum }` in de kop; de byline toont het en de `Article` krijgt een
  `reviewedBy`. Leeg tot een bedrijfsarts of arbeidsdeskundige een gids heeft
  nagelezen; een lege controle is eerlijker dan een naam zonder controle.
- **Bronnen als blok** (`gidsBronnen`): de wet op wetten.overheid.nl, UWV, de
  Arbeidsinspectie, het Steunpunt RI&E. De `Article` neemt ze op als
  `citation`. Links naar de voorpagina van een bron waar een diepe link kan
  verlopen: een bron die nog bestaat is meer waard dan een precieze die 404
  geeft.
- **"Bijgewerkt op" volgt de database.** `bijgewerktOp()` neemt de datum in de
  kop of de laatste wijziging van de pagina in `pages.updated_at`, wat later
  is. Een collega die in het beheer een alinea aanpast, verzet de datum zonder
  eraan te denken; de `dateModified` in de structured data volgt mee.

**De gids is een sjabloon in het beheer.** `PAGINA_SJABLONEN` in
`lib/blockTemplates.ts` zet op een lege pagina alle blokken van een gids neer
("Begin met een sjabloon"); elk gidsblok staat ook los onder "Blok toevoegen";
`FIELD_LABELS` geeft de velden een leesbare naam. `/admin/seo` toont per gids de
controles uit [`lib/gidsSeo.ts`](../../src/lib/gidsSeo.ts): dezelfde regels als
de test op de concepten (vraag als kop, twee zinnen antwoord, 1.500 tot 2.000
woorden, tijdlijn, tabel, vijf tot acht vragen, auteur met pagina, twee bronnen,
dienst, titel en omschrijving binnen de maten), maar dan op de blokken zoals ze
in de database staan. Een gids is een pagina die met het blok Gids: kop begint.

## Alternatieven

- **Auteurs in de database** (een tabel of de `admins`-rij). Dan zou een
  collega die vertrekt of van functie wisselt de pagina's van zijn gidsen
  meeslepen, en hoort de bio bij een account in plaats van bij een publiek
  profiel. De lijst is klein en verandert zelden; code met een test volstaat.
- **Een eigen editor met formulier per onderdeel.** De bestaande blokeditor
  genereert velden uit de data en toont een voorbeeld; met leesbare veldnamen
  en een sjabloon is dat genoeg. Een aparte editor zou een tweede bron van
  waarheid zijn.
- **Diepe links naar UWV-pagina's.** UWV heeft zijn site in 2024 opnieuw
  ingericht en oude adressen vervallen; daarom de voorpagina met een
  omschrijvende tekst.

## Gevolgen

- Een nieuwe auteur: een regel in `AUTEURS`, en de naam in de kop van zijn of
  haar gidsen; de pagina, de sitemap en llms.txt volgen.
- Een gids die in het beheer wordt geschreven staat in `/admin/seo` met zijn
  controles, maar verschijnt pas in de kennisbank (kaarten, onderwerp, zoeken)
  als de slug ook in `GIDSEN` staat. Dat is bewust: de kennisbank is een
  samengestelde structuur, geen lijst van alle pagina's.
- De gidsen die al in de database staan krijgen het bronnenblok via migratie
  0062 (`supabase/migrations/0062_gidsen_bronnen.sql`): het blok uit het concept,
  direct vóór "Zo helpt React2u"; een gids die het al heeft of nog niet bestaat
  wordt overgeslagen, zodat de migratie vóór of ná 0061 kan draaien, en vaker.
- `/auteur/*` is vrij: de oude WordPress-adressen onder `/author/*` en
  `/team/*` gaan met een 301 naar de homepage en Over React2u.
