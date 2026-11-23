-- CM-overleg in het format van het team (Rens, 23 nov 2026, met het voorbeeld
-- "CM overleg 18-11"). Gekozen:
-- - per overleg aanwezigen en een notulist; de notulist (een casemanager)
--   schrijft de check-in, de notulen per agendapunt en de actiepunten;
--   afronden blijft bij het beheer (recht omzet);
-- - bij Dossiers alleen werkwijze en afspraken, geen casus: geen namen, geen
--   diagnoses (Rens, 19 nov 2026: niets medisch in het portaal);
-- - bij afronden krijgen de aanwezigen de notulen per mail.
--
-- - cm_ritme: een eindtijd (duur) en de vaste agenda van het team: Check in,
--   Dossiers, Klanten, Punten voor het MT-overleg, Behoeftes, Vakantie en verlof.
-- - cm_overleggen: einde, notulist, en wanneer de notulen gemaild zijn.
-- - cm_aanwezigen: wie erbij is, met de check-in (hoe zit iedereen erbij).
-- - cm_agendapunten: notulen per punt; doorgeschoven (uit het vorige
--   overleg) en voor_volgend (ingebracht voor het volgende overleg).
-- - cm_collegas(): de collega's met het recht overleg, voor de keuzelijsten
--   van aanwezigen, notulist en actiepunten.

/* ---------- ritme ---------- */

alter table public.cm_ritme add column duur_minuten smallint not null default 60 check (duur_minuten between 15 and 240);

alter table public.cm_ritme alter column vaste_punten
  set default array['Check in', 'Dossiers', 'Klanten', 'Punten voor het MT-overleg', 'Behoeftes', 'Vakantie en verlof'];

-- Alleen als het ritme nog de punten uit 0053 heeft: wat het beheer al aanpaste, blijft staan.
update public.cm_ritme
set vaste_punten = array['Check in', 'Dossiers', 'Klanten', 'Punten voor het MT-overleg', 'Behoeftes', 'Vakantie en verlof']
where vaste_punten = array['Opening en mededelingen', 'Verdeling van de klanten', 'Nieuwe klanten', 'Kennis delen', 'Rondvraag'];

/* ---------- overleg, aanwezigen, agendapunten ---------- */

alter table public.cm_overleggen
  add column einde timestamptz,
  add column notulist uuid references auth.users(id) on delete set null,
  add column notulist_naam text check (length(notulist_naam) <= 120),
  add column gemaild_at timestamptz;

create table public.cm_aanwezigen (
  id uuid primary key default gen_random_uuid(),
  overleg_id uuid not null references public.cm_overleggen(id) on delete cascade,
  -- Een collega met een inlog, of alleen een naam (iemand zonder account).
  user_id uuid references auth.users(id) on delete set null,
  naam text not null check (length(btrim(naam)) between 1 and 120),
  checkin text check (length(checkin) <= 2000),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (overleg_id, user_id)
);

create index cm_aanwezigen_overleg on public.cm_aanwezigen (overleg_id, sort);

alter table public.cm_agendapunten
  add column notulen text check (length(notulen) <= 8000),
  add column doorgeschoven boolean not null default false,
  add column voor_volgend boolean not null default false;

/* ---------- rechten ---------- */

alter table public.cm_aanwezigen enable row level security;
revoke all on public.cm_aanwezigen from anon;

-- Is de ingelogde collega de notulist van dit overleg, en loopt het nog?
create or replace function public.cm_is_notulist(overleg uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.cm_overleggen where id = overleg and notulist = auth.uid() and afgerond_at is null)
$$;

revoke all on function public.cm_is_notulist(uuid) from public, anon;
grant execute on function public.cm_is_notulist(uuid) to authenticated;

create policy cm_aanwezigen_lezen on public.cm_aanwezigen
  for select to authenticated using (public.has_perm('overleg') or public.has_perm('omzet'));
create policy cm_aanwezigen_beheer on public.cm_aanwezigen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
-- De notulist houdt bij wie er is en schrijft de check-in.
create policy cm_aanwezigen_notulist on public.cm_aanwezigen
  for all to authenticated using (public.has_perm('overleg') and public.cm_is_notulist(overleg_id))
  with check (public.has_perm('overleg') and public.cm_is_notulist(overleg_id));

-- De notulist schrijft de notulen bij de agendapunten en vinkt af wat besproken is.
create policy cm_agendapunten_notulist on public.cm_agendapunten
  for update to authenticated using (public.has_perm('overleg') and public.cm_is_notulist(overleg_id))
  with check (public.has_perm('overleg') and public.cm_is_notulist(overleg_id));

-- En maakt de actiepunten van dit overleg, past ze aan of haalt ze weg.
create policy cm_actiepunten_notulist on public.cm_actiepunten
  for all to authenticated using (public.has_perm('overleg') and public.cm_is_notulist(overleg_id))
  with check (public.has_perm('overleg') and public.cm_is_notulist(overleg_id));

/* ---------- collega's voor de keuzelijsten ---------- */

-- Wie met het recht overleg meedoet, met de naam uit de medewerkers als die
-- gekoppeld is. Alleen voor wie zelf het overleg mag zien.
create or replace function public.cm_collegas() returns table (user_id uuid, email text, naam text)
language sql stable security definer set search_path = public
as $$
  select a.user_id, a.email, m.naam
  from public.admins a
  join public.roles r on r.id = a.role_id
  left join public.medewerkers m on m.user_id = a.user_id
  where 'overleg' = any(r.permissions)
    and (public.has_perm('overleg') or public.has_perm('omzet'))
  order by coalesce(m.naam, a.email)
$$;

revoke all on function public.cm_collegas() from public, anon;
grant execute on function public.cm_collegas() to authenticated;
