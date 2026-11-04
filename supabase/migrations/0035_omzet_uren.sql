-- Omzet en declarabele uren (Rens, 4 nov 2026: "ik wil een sales dashboard en
-- een omzet module en daarbij een overzicht te vullen met werknemers met het
-- aantal declarable uren"; zien en invullen: "super admin").
--
-- - Recht `omzet`: nieuw, alleen bij de super admin. Andere rollen kunnen het
--   in Gebruikers krijgen; de beheerder heeft het bewust niet.
-- - medewerkers: wie er uren schrijft. Contracturen per week, de norm (welk
--   deel daarvan declarabel hoort te zijn) en het uurtarief waartegen de uren
--   als omzet tellen. Geen login: het beheer vult in voor iedereen.
-- - uren: per medewerker per week (de maandag) de declarabele uren en de uren
--   afwezig (verlof, ziekte, feestdag), die van de beschikbare uren afgaan.
-- - abonnementen_gestopt: een getekende offerte waarvan het abonnement is
--   beëindigd, vanaf welke maand. Een eigen tabel en geen kolom op offertes:
--   offerte_bewaken (0024) houdt een getekende offerte bewust ongewijzigd.
--
-- Rechten: alles achter has_perm('omzet').
--
-- VOLGORDE: na 0024 (offertes) en 0006 (superadmin). Zonder deze migratie
-- tonen /admin/omzet en /admin/omzet/uren een melding.
--
-- Registreren: via apply_migration (naam 0035_omzet_uren) vanzelf.

update public.roles
set permissions = array_append(permissions, 'omzet')
where key = 'superadmin' and not ('omzet' = any(permissions));

create table public.medewerkers (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (length(btrim(naam)) between 1 and 120),
  functie text check (length(functie) <= 120),
  contracturen numeric(4, 1) not null default 36 check (contracturen between 0 and 60),
  -- Procent van de beschikbare uren dat declarabel hoort te zijn.
  norm integer not null default 75 check (norm between 0 and 100),
  uurtarief numeric(8, 2) check (uurtarief is null or uurtarief between 0 and 1000),
  actief boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger medewerkers_updated before update on public.medewerkers
  for each row execute function public.set_updated_at();

create table public.uren (
  medewerker_id uuid not null references public.medewerkers(id) on delete cascade,
  -- De maandag van de week (ISO-week).
  week date not null check (extract(isodow from week) = 1),
  declarabel numeric(5, 2) not null default 0 check (declarabel between 0 and 80),
  afwezig numeric(5, 2) not null default 0 check (afwezig between 0 and 80),
  door text,
  updated_at timestamptz not null default now(),
  primary key (medewerker_id, week)
);

create index uren_week on public.uren (week);

create trigger uren_updated before update on public.uren
  for each row execute function public.set_updated_at();

create table public.abonnementen_gestopt (
  offerte_id uuid primary key references public.offertes(id) on delete cascade,
  -- De eerste maand zonder omzet (de eerste van die maand).
  vanaf date not null check (extract(day from vanaf) = 1),
  reden text check (length(reden) <= 500),
  door text,
  created_at timestamptz not null default now()
);

alter table public.medewerkers enable row level security;
alter table public.uren enable row level security;
alter table public.abonnementen_gestopt enable row level security;
revoke all on public.medewerkers, public.uren, public.abonnementen_gestopt from anon;

create policy "omzet beheert medewerkers" on public.medewerkers
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
create policy "omzet beheert uren" on public.uren
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
create policy "omzet beheert gestopte abonnementen" on public.abonnementen_gestopt
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

-- De omzet rekent met de getekende offertes. Wie het recht omzet heeft maar
-- niet het salesrecht (bellijst), moet die wel kunnen lezen; de rest niet.
create policy "omzet leest getekende offertes" on public.offertes
  for select to authenticated using (status = 'getekend' and public.has_perm('omzet'));
