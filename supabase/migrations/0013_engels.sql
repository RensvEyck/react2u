-- De site wordt tweetalig: Nederlands op de gewone paden, Engels onder /en.
-- Zie docs/adr/0001-tweetalig-nl-en.md.
--
-- 1. Vacatures krijgen optionele Engelse velden. Leeg = de Engelse site toont
--    de Nederlandse vacature met bovenaan "This vacancy is in Dutch". Alleen de
--    tekstvelden: locatie, uren en salaris zijn in beide talen hetzelfde.
--
-- 2. Berichten en sollicitaties onthouden via welke taal van de site ze
--    binnenkwamen, zodat het Postvak IN laat zien dat iemand Engels verwacht.
--    Standaard 'nl': alles van vóór deze migratie kwam van de Nederlandse site.
--
-- Beide wijzigingen zijn verenigbaar met de code die nu live staat: die leest
-- met select(*) en schrijft geen van deze kolommen. De site zelf probeert een
-- insert mét `lang` en valt terug op een insert zonder als deze migratie nog
-- niet gedraaid is (zie src/app/(site)/actions.ts).

alter table public.vacancies
  add column if not exists title_en text,
  add column if not exists intro_en text,
  add column if not exists description_en_md text;

alter table public.contact_messages
  add column if not exists lang text not null default 'nl'
  check (lang in ('nl', 'en'));

alter table public.applications
  add column if not exists lang text not null default 'nl'
  check (lang in ('nl', 'en'));

-- De formulieren schrijven met de publieke sleutel. Voor het geval anon hier
-- per kolom rechten heeft in plaats van op de hele tabel (zie CONTEXT.md,
-- *Valkuilen*): de nieuwe kolom expliciet toestaan. Kan geen kwaad als het al mocht.
grant insert (lang) on public.contact_messages to anon, authenticated;
grant insert (lang) on public.applications to anon, authenticated;
