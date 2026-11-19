-- Inwerkreis voor nieuwe collega's (Rens, 19 nov 2026: "Inwerkreis voor nieuwe
-- collega's. 30, 60 en 90 dagen per functie, met een buddy, oefencasussen en
-- mijlpalen"). Gekozen: een sjabloon per functie (Casemanager Verzuim,
-- Backoffice, Sales / accountmanager) dat leeg begint en in het beheer gevuld
-- wordt; de buddy is alleen een naam.
--
-- - inwerk_sjablonen: één per functie.
-- - inwerk_stappen: de stappen van een sjabloon, per fase (de eerste 30 dagen,
--   dag 31 tot 60, dag 61 tot 90) en per soort: een taak, een oefencasus of een
--   mijlpaal.
-- - inwerkreizen: de reis van één collega, met een sjabloon, een startdatum en
--   de naam van de buddy. Eén reis per collega.
-- - inwerk_voortgang: welke stap van een reis gedaan is, wanneer en door wie.
--
-- Een reis wijst naar het sjabloon, niet naar een kopie: wat het beheer later
-- aan het sjabloon toevoegt, verschijnt ook in lopende reizen. Een sjabloon dat
-- in gebruik is kan niet weg.
--
-- Rechten: het beheer (recht 'omzet', net als de medewerkers en het
-- kwartaaloverzicht van de weekevaluaties) vult sjablonen en start reizen. De
-- collega leest zijn eigen reis met de stappen van zijn sjabloon, en vinkt zelf
-- taken en oefencasussen af. Een mijlpaal tekent alleen het beheer af.

/* ---------- sjablonen en stappen ---------- */

create table public.inwerk_sjablonen (
  id uuid primary key default gen_random_uuid(),
  functie text not null unique check (length(btrim(functie)) between 1 and 120),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inwerk_sjablonen_updated before update on public.inwerk_sjablonen
  for each row execute function public.set_updated_at();

create table public.inwerk_stappen (
  id uuid primary key default gen_random_uuid(),
  sjabloon_id uuid not null references public.inwerk_sjablonen(id) on delete cascade,
  -- De fase heet naar de laatste dag: 30, 60 of 90.
  fase smallint not null check (fase in (30, 60, 90)),
  soort text not null check (soort in ('taak', 'casus', 'mijlpaal')),
  titel text not null check (length(btrim(titel)) between 1 and 200),
  uitleg text check (length(uitleg) <= 2000),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inwerk_stappen_sjabloon on public.inwerk_stappen (sjabloon_id, fase, sort);

create trigger inwerk_stappen_updated before update on public.inwerk_stappen
  for each row execute function public.set_updated_at();

insert into public.inwerk_sjablonen (functie, sort) values
  ('Casemanager Verzuim', 1),
  ('Backoffice', 2),
  ('Sales / accountmanager', 3);

/* ---------- reizen en voortgang ---------- */

create table public.inwerkreizen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  sjabloon_id uuid not null references public.inwerk_sjablonen(id) on delete restrict,
  startdatum date not null,
  buddy text check (length(buddy) <= 120),
  afgerond_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inwerkreizen_updated before update on public.inwerkreizen
  for each row execute function public.set_updated_at();

create table public.inwerk_voortgang (
  reis_id uuid not null references public.inwerkreizen(id) on delete cascade,
  stap_id uuid not null references public.inwerk_stappen(id) on delete cascade,
  gedaan_at timestamptz not null default now(),
  -- Wie het afvinkte of aftekende; de database vult het zelf in.
  door text not null default coalesce(auth.jwt() ->> 'email', 'onbekend') check (length(door) <= 320),
  primary key (reis_id, stap_id)
);

-- Een stap hoort bij het sjabloon van de reis; anders is het afvinken onzin.
create or replace function public.inwerk_voortgang_klopt() returns trigger
language plpgsql set search_path = public
as $$
begin
  if not exists (
    select 1 from public.inwerkreizen r join public.inwerk_stappen s on s.sjabloon_id = r.sjabloon_id
    where r.id = new.reis_id and s.id = new.stap_id
  ) then
    raise exception 'Deze stap hoort niet bij deze inwerkreis' using errcode = 'P0001', hint = 'inwerk-stap';
  end if;
  new.door := coalesce(auth.jwt() ->> 'email', new.door);
  return new;
end;
$$;

create trigger inwerk_voortgang_klopt before insert or update on public.inwerk_voortgang
  for each row execute function public.inwerk_voortgang_klopt();

/* ---------- rechten ---------- */

alter table public.inwerk_sjablonen enable row level security;
alter table public.inwerk_stappen enable row level security;
alter table public.inwerkreizen enable row level security;
alter table public.inwerk_voortgang enable row level security;

-- Bezoekers van de site hebben hier niets te zoeken, ook niet een lege lijst.
revoke all on public.inwerk_sjablonen, public.inwerk_stappen, public.inwerkreizen, public.inwerk_voortgang from anon;

-- Is dit de eigen reis van de ingelogde collega? security definer, zodat de
-- policies op stappen en voortgang de reizentabel kunnen lezen zonder lus.
create or replace function public.eigen_inwerkreis(reis uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.inwerkreizen where id = reis and user_id = auth.uid())
$$;

create or replace function public.eigen_inwerksjabloon(sjabloon uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.inwerkreizen where sjabloon_id = sjabloon and user_id = auth.uid())
$$;

create policy inwerk_sjablonen_lezen on public.inwerk_sjablonen
  for select to authenticated using (public.has_perm('omzet') or public.eigen_inwerksjabloon(id));
create policy inwerk_sjablonen_beheer on public.inwerk_sjablonen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

create policy inwerk_stappen_lezen on public.inwerk_stappen
  for select to authenticated using (public.has_perm('omzet') or public.eigen_inwerksjabloon(sjabloon_id));
create policy inwerk_stappen_beheer on public.inwerk_stappen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

create policy inwerkreizen_lezen on public.inwerkreizen
  for select to authenticated using (user_id = auth.uid() or public.has_perm('omzet'));
create policy inwerkreizen_beheer on public.inwerkreizen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));

create policy inwerk_voortgang_lezen on public.inwerk_voortgang
  for select to authenticated using (public.has_perm('omzet') or public.eigen_inwerkreis(reis_id));
create policy inwerk_voortgang_beheer on public.inwerk_voortgang
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
-- De collega zelf: alleen taken en oefencasussen van de eigen reis, niet de mijlpalen.
create policy inwerk_voortgang_zelf_af on public.inwerk_voortgang
  for insert to authenticated with check (
    public.eigen_inwerkreis(reis_id)
    and exists (select 1 from public.inwerk_stappen s where s.id = stap_id and s.soort in ('taak', 'casus'))
  );
create policy inwerk_voortgang_zelf_terug on public.inwerk_voortgang
  for delete to authenticated using (
    public.eigen_inwerkreis(reis_id)
    and exists (select 1 from public.inwerk_stappen s where s.id = stap_id and s.soort in ('taak', 'casus'))
  );

/* ---------- collega's om een reis voor te starten ---------- */

-- De lijst van collega's met inlog leest normaal alleen wie het recht
-- gebruikers heeft (0005). Om een reis te starten heeft het beheer met het
-- recht omzet alleen e-mailadres en rol nodig; meer geeft deze functie niet.
create or replace function public.inwerk_collegas() returns table (user_id uuid, email text, rol text)
language sql stable security definer set search_path = public
as $$
  select a.user_id, a.email, r.label
  from public.admins a join public.roles r on r.id = a.role_id
  where public.has_perm('omzet')
  order by a.email
$$;

revoke all on function public.inwerk_collegas() from public, anon;
grant execute on function public.inwerk_collegas() to authenticated;
