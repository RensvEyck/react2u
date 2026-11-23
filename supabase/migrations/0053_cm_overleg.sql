-- CM-overleg (Rens, 23 nov 2026: "werknemersportaal: CM Overleg toevoegen en
-- daarbij de landkaart van nederland met verdeling per casemanager op de
-- kaart"). Gekozen: agenda (vaste punten plus eigen punten van collega's),
-- notulen en actiepunten, datum en ritme met een herinnering, en een archief;
-- de kaart toont klanten als stip en het werkgebied als vlakken; de plaats
-- komt van de stamkaart (bezoekadres).
--
-- Niets medisch (Rens, 19 nov 2026): geen namen van werknemers of dossiers in
-- agenda of notulen. Dat staat ook bij het invullen.
--
-- - recht 'overleg': het CM-overleg lezen, agendapunten toevoegen en de eigen
--   actiepunten afvinken. Voor de super admin, de beheerder en de werknemer.
-- - cm_ritme: één rij met het ritme (elke n weken, weekdag, tijd, plek) en de
--   vaste agendapunten. Het volgende overleg plant het beheer met één klik.
-- - cm_overleggen: één rij per overleg, met de notulen; afgerond na afloop.
-- - cm_agendapunten: vaste punten en punten van collega's, per overleg.
-- - cm_actiepunten: wat, wie, wanneer, en of het gedaan is.
-- - cm_kaart(): de klanten voor de kaart (bedrijf, casemanager, aantal
--   werknemers, postcode en plaats), ook voor wie de klantenlijst niet mag zien.
--
-- Beheren (overleg plannen, ritme, notulen, actiepunten maken, afronden) gaat
-- met het recht omzet, net als de weekevaluatie en de inwerkreis.

/* ---------- recht ---------- */

update public.roles
set permissions = array_append(permissions, 'overleg')
where key in ('superadmin', 'beheerder', 'werknemer') and not ('overleg' = any(permissions));

/* ---------- ritme ---------- */

create table public.cm_ritme (
  id smallint primary key default 1 check (id = 1),
  elke_weken smallint not null default 2 check (elke_weken between 1 and 8),
  -- 1 = maandag … 5 = vrijdag
  weekdag smallint not null default 2 check (weekdag between 1 and 5),
  tijd time not null default '09:30',
  locatie text check (length(locatie) <= 120),
  vaste_punten text[] not null default array['Opening en mededelingen', 'Verdeling van de klanten', 'Nieuwe klanten', 'Kennis delen', 'Rondvraag'],
  updated_at timestamptz not null default now()
);

insert into public.cm_ritme default values;

create trigger cm_ritme_updated before update on public.cm_ritme
  for each row execute function public.set_updated_at();

/* ---------- overleggen, agenda, actiepunten ---------- */

create table public.cm_overleggen (
  id uuid primary key default gen_random_uuid(),
  datum timestamptz not null,
  locatie text check (length(locatie) <= 120),
  notulen text check (length(notulen) <= 20000),
  afgerond_at timestamptz,
  herinnerd_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cm_overleggen_datum on public.cm_overleggen (datum desc);

create trigger cm_overleggen_updated before update on public.cm_overleggen
  for each row execute function public.set_updated_at();

create table public.cm_agendapunten (
  id uuid primary key default gen_random_uuid(),
  overleg_id uuid not null references public.cm_overleggen(id) on delete cascade,
  titel text not null check (length(btrim(titel)) between 1 and 200),
  toelichting text check (length(toelichting) <= 2000),
  -- Een vast punt uit het ritme; anders ingebracht door een collega.
  vast boolean not null default false,
  door uuid references auth.users(id) on delete set null default auth.uid(),
  door_email text default (auth.jwt() ->> 'email') check (length(door_email) <= 320),
  besproken boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index cm_agendapunten_overleg on public.cm_agendapunten (overleg_id, sort);

create table public.cm_actiepunten (
  id uuid primary key default gen_random_uuid(),
  overleg_id uuid not null references public.cm_overleggen(id) on delete cascade,
  wat text not null check (length(btrim(wat)) between 1 and 300),
  wie uuid references auth.users(id) on delete set null,
  -- De naam zoals hij toen was: ook leesbaar als de collega vertrokken is.
  wie_naam text not null check (length(btrim(wie_naam)) between 1 and 120),
  wanneer date,
  gedaan_at timestamptz,
  gedaan_door text check (length(gedaan_door) <= 320),
  created_at timestamptz not null default now()
);

create index cm_actiepunten_open on public.cm_actiepunten (wie) where gedaan_at is null;

/* ---------- rechten ---------- */

alter table public.cm_ritme enable row level security;
alter table public.cm_overleggen enable row level security;
alter table public.cm_agendapunten enable row level security;
alter table public.cm_actiepunten enable row level security;

revoke all on public.cm_ritme, public.cm_overleggen, public.cm_agendapunten, public.cm_actiepunten from anon;

create policy cm_ritme_lezen on public.cm_ritme
  for select to authenticated using (public.has_perm('overleg') or public.has_perm('omzet'));
create policy cm_ritme_beheer on public.cm_ritme
  for update to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

create policy cm_overleggen_lezen on public.cm_overleggen
  for select to authenticated using (public.has_perm('overleg') or public.has_perm('omzet'));
create policy cm_overleggen_beheer on public.cm_overleggen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

create policy cm_agendapunten_lezen on public.cm_agendapunten
  for select to authenticated using (public.has_perm('overleg') or public.has_perm('omzet'));
create policy cm_agendapunten_beheer on public.cm_agendapunten
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
-- Een collega brengt zelf een punt in voor een overleg dat nog niet geweest is,
-- en past alleen de eigen punten aan of haalt ze weg, zolang het overleg loopt.
create policy cm_agendapunten_zelf_toevoegen on public.cm_agendapunten
  for insert to authenticated with check (
    public.has_perm('overleg') and door = auth.uid() and not vast and not besproken
    and exists (select 1 from public.cm_overleggen o where o.id = overleg_id and o.afgerond_at is null)
  );
create policy cm_agendapunten_zelf_wijzigen on public.cm_agendapunten
  for update to authenticated
  using (door = auth.uid() and exists (select 1 from public.cm_overleggen o where o.id = overleg_id and o.afgerond_at is null))
  with check (door = auth.uid() and not vast);
create policy cm_agendapunten_zelf_weg on public.cm_agendapunten
  for delete to authenticated
  using (door = auth.uid() and exists (select 1 from public.cm_overleggen o where o.id = overleg_id and o.afgerond_at is null));

create policy cm_actiepunten_lezen on public.cm_actiepunten
  for select to authenticated using (public.has_perm('overleg') or public.has_perm('omzet'));
create policy cm_actiepunten_beheer on public.cm_actiepunten
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

-- De eigen actiepunten afvinken, zonder verder iets aan het actiepunt te veranderen.
create or replace function public.cm_actiepunt_zetten(actie uuid, gedaan boolean) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update public.cm_actiepunten
  set gedaan_at = case when gedaan then coalesce(gedaan_at, now()) else null end,
      gedaan_door = case when gedaan then coalesce(gedaan_door, auth.jwt() ->> 'email') else null end
  where id = actie and (wie = auth.uid() or public.has_perm('omzet'));
  return found;
end;
$$;

revoke all on function public.cm_actiepunt_zetten(uuid, boolean) from public, anon;
grant execute on function public.cm_actiepunt_zetten(uuid, boolean) to authenticated;

/* ---------- de kaart ---------- */

-- Alleen wat de kaart nodig heeft, voor wie het overleg of de klantenlijst
-- mag zien. Echte klanten (akkoord, inrichten, klant), geen leads.
create or replace function public.cm_kaart()
returns table (id uuid, bedrijf text, status text, casemanager text, medewerkers integer, postcode text, plaats text)
language sql stable security definer set search_path = public
as $$
  select k.id, k.bedrijf, k.status, nullif(btrim(k.casemanager), ''), k.medewerkers,
    coalesce(nullif(btrim(k.bezoek_postcode), ''), nullif(btrim(k.post_postcode), '')),
    coalesce(nullif(btrim(k.bezoek_plaats), ''), nullif(btrim(k.post_plaats), ''))
  from public.klanten k
  where k.status in ('akkoord', 'inrichten', 'klant')
    and (public.has_perm('overleg') or public.has_perm('bellijst'))
  order by k.bedrijf
$$;

revoke all on function public.cm_kaart() from public, anon;
grant execute on function public.cm_kaart() to authenticated;
