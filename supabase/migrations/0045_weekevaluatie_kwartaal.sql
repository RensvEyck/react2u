-- Weekevaluatie, tweede ronde (Rens, 18 nov 2026: "wat zijn nog betere vragen.
-- 1 om het werkgeluk te meten van interne werknemers en 2 de druk, kennis en
-- toewijding te meten 3 hoe kunnen we vragen stellen die terug komen in de
-- kwartaalmeetings", en op het voorstel: "Ja, bouw het").
--
-- De vragen zelf staan in code (VRAGEN in src/lib/weekevaluatie.ts) en de
-- antwoorden blijven jsonb in weekevaluaties (0044): een nieuwe vragenset is
-- geen schemawijziging. Dit voegt toe wat de kwartaalmeeting nodig heeft:
--
-- - weekevaluatie_doelen: één tot drie doelen per collega per kwartaal, in de
--   kwartaalmeeting vastgelegd door wie het overzicht mag zien (has_perm
--   'omzet'). De collega leest zijn eigen doelen en geeft elke week aan hoe ver
--   hij kwam (in de antwoorden, onder `doelen`). Een doel verwijderen haalt de
--   voortgang niet uit de antwoorden; het overzicht toont alleen bestaande doelen.
-- - weekevaluaties.signaal_at: wanneer de melding "twee zware weken" voor deze
--   week verstuurd is, zodat opnieuw bewaren niet opnieuw mailt.
-- - weekevaluatie_signaal(p_week): na het bewaren door de collega zelf
--   aangeroepen. Kijkt of deze week en de week ervoor (of de week erna en deze)
--   allebei een 4 of lager hebben voor energie of voor "werk paste in de tijd";
--   zo ja, dan zet hij signaal_at en geeft hij de adressen terug van wie het
--   recht omzet heeft, om te mailen. Dezelfde regel staat in code (`signaal`
--   in lib/weekevaluatie.ts, voor het dashboard en het overzicht); wie de grens
--   verandert, verandert beide.
--
-- VOLGORDE: na 0044.
--
-- Registreren: via apply_migration (naam 0045_weekevaluatie_kwartaal) vanzelf.

/* ---------- doelen per kwartaal ---------- */

create table public.weekevaluatie_doelen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jaar integer not null check (jaar between 2024 and 2100),
  kwartaal integer not null check (kwartaal between 1 and 4),
  titel text not null check (length(btrim(titel)) between 1 and 160),
  toelichting text check (length(toelichting) <= 1000),
  sort integer not null default 0,
  door text check (length(door) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index weekevaluatie_doelen_wie on public.weekevaluatie_doelen (user_id, jaar, kwartaal, sort);

create trigger weekevaluatie_doelen_updated before update on public.weekevaluatie_doelen
  for each row execute function public.set_updated_at();

-- Hooguit drie doelen per collega per kwartaal: meer is geen doel meer maar een takenlijst.
create or replace function public.weekevaluatie_doelen_max() returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.weekevaluatie_doelen
      where user_id = new.user_id and jaar = new.jaar and kwartaal = new.kwartaal and id <> new.id) >= 3 then
    raise exception 'Hooguit drie doelen per kwartaal.';
  end if;
  return new;
end;
$$;

create trigger weekevaluatie_doelen_max before insert or update on public.weekevaluatie_doelen
  for each row execute function public.weekevaluatie_doelen_max();

alter table public.weekevaluatie_doelen enable row level security;
revoke all on public.weekevaluatie_doelen from anon;

create policy "doelen lezen" on public.weekevaluatie_doelen
  for select to authenticated using (user_id = auth.uid() or public.has_perm('omzet'));
create policy "doelen beheren" on public.weekevaluatie_doelen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

/* ---------- twee zware weken ---------- */

alter table public.weekevaluaties add column signaal_at timestamptz;

create or replace function public.weekevaluatie_signaal(p_week date)
returns table (signaal_week date, signaal_schalen text[], signaal_ontvangers text[])
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  w date;
  nu jsonb;
  ervoor jsonb;
  schalen text[];
begin
  if uid is null or not public.has_perm('weekevaluatie') then return; end if;
  foreach w in array array[p_week, p_week + 7] loop
    select e.antwoorden into nu from public.weekevaluaties e
      where e.user_id = uid and e.week = w and e.signaal_at is null;
    if nu is null then continue; end if;
    select e.antwoorden into ervoor from public.weekevaluaties e
      where e.user_id = uid and e.week = w - 7;
    if ervoor is null then continue; end if;
    schalen := array[]::text[];
    if (nu->>'energie')::int <= 4 and (ervoor->>'energie')::int <= 4 then schalen := schalen || 'energie'::text; end if;
    if (nu->>'tijd')::int <= 4 and (ervoor->>'tijd')::int <= 4 then schalen := schalen || 'tijd'::text; end if;
    if cardinality(schalen) = 0 then continue; end if;
    update public.weekevaluaties e set signaal_at = now() where e.user_id = uid and e.week = w;
    signaal_week := w;
    signaal_schalen := schalen;
    signaal_ontvangers := array(
      select a.email from public.admins a join public.roles r on r.id = a.role_id
      where 'omzet' = any(r.permissions) and a.user_id <> uid and a.email is not null
      order by a.email
    );
    return next;
  end loop;
end;
$$;

revoke execute on function public.weekevaluatie_signaal(date) from public, anon;
grant execute on function public.weekevaluatie_signaal(date) to authenticated;
revoke execute on function public.weekevaluatie_doelen_max() from public, anon, authenticated;
