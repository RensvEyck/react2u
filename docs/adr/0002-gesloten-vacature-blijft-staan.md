# ADR 0002: Een gesloten vacature blijft bereikbaar als "vervuld"

**Datum:** 23 november 2026 · **Status:** aangenomen

## Context

Rond 20 november 2026 zijn achttien vacatures in het beheer op "gesloten"
gezet. De site behandelde alles wat niet `published` was als onbekend en gaf
een 404. Google haalde de adressen binnen een dag uit de index en uit Google
for Jobs; de vacatures waren goed voor 44% van de klikken uit Google, en het
verkeer zakte van ±25 naar 4 klikken per dag (HALO-herstelplan, 23 november).

## Besluit

Een vacature met status `closed` houdt haar adres, in beide talen. De pagina
toont de tekst met de melding dat de vacature vervuld is, zonder
sollicitatieformulier en zonder `JobPosting`, met een open sollicitatie en de
vergelijkbare vacatures. Overzichten, feeds en sitemap tonen alleen open
vacatures. De publieke sleutel mag gesloten vacatures lezen (migratie 0058).
Moet een adres écht verdwijnen, dan zet een beheerder een doorverwijzing naar
het vakgebied onder Doorverwijzingen.

## Gevolgen

- Een vacature sluiten kost geen vindbaarheid meer; heropenen is één
  statuswijziging.
- "Gesloten" betekent in het beheer: vervuld, maar bereikbaar. Een concept
  (`draft`) blijft onzichtbaar en een 404.
- De titel van een vervulde pagina eindigt op "Vacature vervuld", zodat
  niemand voor niets klikt; `lib/seo.ts` spiegelt dat.
