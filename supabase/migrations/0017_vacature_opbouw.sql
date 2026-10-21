-- Vacatures krijgen een vaste opbouw (naar voorbeeld van werkenbijacture.nl):
--
-- 1. Kenmerken voor het blok "In het kort": vakgebied, ervaringsniveau,
--    opleidingsniveau en het soort contract. Vrije tekst, leeg = niet tonen.
--
-- 2. `opbouw` bevat de secties per taal:
--      { "nl": { "doen": md, "vragen": md, "bieden": md, "eerlijk": md, "faq": md },
--        "en": { ... } }
--    Leeg of ontbrekend = de pagina valt terug op description_md (oude opbouw).
--    De vaste arbeidsvoorwaarden, "Werken bij React2u" en de procedure staan in
--    het woordenboek en worden niet per vacature opgeslagen.
--
-- Verenigbaar met de code die nu live staat: die leest met select(*) en
-- schrijft geen van deze kolommen.

alter table public.vacancies
  add column if not exists vakgebied text,
  add column if not exists ervaringsniveau text,
  add column if not exists opleidingsniveau text,
  add column if not exists contractvorm text,
  add column if not exists opbouw jsonb not null default '{}'::jsonb;
