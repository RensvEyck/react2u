-- Werving naar een hoger niveau:
--
-- 1. Sollicitaties onthouden waar de kandidaat vandaan kwam (`bron`): een
--    aanbrenger (?ref=naam), een campagne (utm_source) of de verwijzende site.
--    Zo zie je welke kanalen en welke collega's kandidaten opleveren.
-- 2. Een echte pijplijn: nieuw, gebeld, gesprek, aanbod, aangenomen, afgewezen.
--    `in_behandeling` blijft geldig voor oudere rijen.
-- 3. Een interne notitie per sollicitant en het moment van de laatste
--    statuswijziging, voor "wacht al X dagen".

alter table public.applications
  add column if not exists bron text,
  add column if not exists notitie text,
  add column if not exists status_at timestamptz;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('nieuw','gebeld','gesprek','aanbod','aangenomen','afgewezen','in_behandeling'));

grant insert (bron) on public.applications to anon, authenticated;
