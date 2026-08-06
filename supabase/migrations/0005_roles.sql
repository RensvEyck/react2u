-- Rollen en rechten voor het adminpaneel.
--
-- Tot nu toe was autorisatie binair: `is_admin()` gaf toegang tot alles. Elke
-- policy in dit schema hing daaraan. Nu hangt elk onderdeel aan een eigen
-- recht, zodat een redacteur niet bij de bellijst kan en een commercieel
-- medewerker niet bij de instellingen.
--
-- Dat moest op databaseniveau. Menu-items verbergen in de app is geen
-- beveiliging: de anon-sleutel staat in elke browser, dus wie hem eruit haalt
-- praat rechtstreeks met de API. Deze policies zijn de echte grens.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  -- Sleutels uit src/lib/permissions.ts. Bewust text[] en geen aparte tabel:
  -- het is een korte, vaste lijst en zo blijft de policy één array-check.
  permissions text[] not null default '{}',
  -- Systeemrollen mogen niet verwijderd worden en houden altijd alle rechten.
  -- Zonder die bescherming kun je jezelf buitensluiten.
  is_system boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger roles_updated before update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (key, label, permissions, is_system, sort) values
  ('beheerder', 'Beheerder',
   array['postvak','bellijst','paginas','blog','vacatures','media','seo','bezoek','instellingen','gebruikers'],
   true, 0),
  ('redacteur', 'Redacteur',
   array['paginas','blog','vacatures','media','seo'], false, 1),
  ('commercieel', 'Commercieel',
   array['postvak','bellijst','vacatures','bezoek'], false, 2);

alter table public.admins add column role_id uuid references public.roles(id);

-- Bestaande beheerders houden alles. Backfill vóór de not-null, anders faalt
-- de migratie op de rij die er al staat.
update public.admins
set role_id = (select id from public.roles where key = 'beheerder')
where role_id is null;

alter table public.admins alter column role_id set not null;

-- Handig voor het gebruikersoverzicht en voor de uitnodigingsstroom.
alter table public.admins add column invited_at timestamptz;
alter table public.admins add column invited_by uuid references auth.users(id) on delete set null;

/* ---------- rechtencontrole ---------- */

-- security definer: de functie moet de admins- en roles-tabel kunnen lezen
-- zonder dat de aanroeper daar zelf rechten op heeft.
create or replace function public.has_perm(perm text) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1
    from public.admins a
    join public.roles r on r.id = a.role_id
    where a.user_id = auth.uid()
      and perm = any(r.permissions)
  )
$$;

/* ---------- slot op de laatste beheerder ---------- */

-- Voorkomt de fout die niet terug te draaien is: de laatste gebruiker die
-- rollen mag beheren verwijderen of degraderen. Dan kan niemand er meer bij,
-- ook jij niet, en is alleen een ingreep in de database nog een uitweg.
create or replace function public.assert_admin_remains() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.admins a
    join public.roles r on r.id = a.role_id
    where 'gebruikers' = any(r.permissions)
  ) then
    raise exception 'Er moet minstens één gebruiker overblijven die rollen mag beheren.';
  end if;
  return null;
end
$$;

create constraint trigger admins_keep_one_manager
  after update or delete on public.admins
  deferrable initially deferred
  for each row execute function public.assert_admin_remains();

create constraint trigger roles_keep_one_manager
  after update or delete on public.roles
  deferrable initially deferred
  for each row execute function public.assert_admin_remains();

/* ---------- policies: van is_admin() naar has_perm() ---------- */

-- admins: iedereen ziet zijn eigen rij (nodig om het menu te kunnen opbouwen);
-- wie 'gebruikers' heeft, beheert alle rijen.
drop policy if exists "own admin row" on public.admins;
create policy "own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid() or public.has_perm('gebruikers'));
create policy "manage admins" on public.admins
  for all to authenticated
  using (public.has_perm('gebruikers')) with check (public.has_perm('gebruikers'));

-- roles: leesbaar voor wie ingelogd is, want de app moet de eigen rechten
-- kunnen ophalen. Rolomschrijvingen zijn geen geheim.
alter table public.roles enable row level security;
create policy "read roles" on public.roles
  for select to authenticated using (true);
create policy "manage roles" on public.roles
  for all to authenticated
  using (public.has_perm('gebruikers')) with check (public.has_perm('gebruikers'));

-- pages en blocks -> 'paginas'
drop policy if exists "admin write pages" on public.pages;
create policy "admin write pages" on public.pages
  for all to authenticated using (public.has_perm('paginas')) with check (public.has_perm('paginas'));
drop policy if exists "public read pages" on public.pages;
create policy "public read pages" on public.pages
  for select using (published or public.has_perm('paginas'));

drop policy if exists "admin write blocks" on public.blocks;
create policy "admin write blocks" on public.blocks
  for all to authenticated using (public.has_perm('paginas')) with check (public.has_perm('paginas'));
drop policy if exists "public read blocks" on public.blocks;
create policy "public read blocks" on public.blocks
  for select using (
    exists(select 1 from public.pages p where p.id = page_id and p.published)
    or public.has_perm('paginas')
  );

-- posts -> 'blog'
drop policy if exists "admin write posts" on public.posts;
create policy "admin write posts" on public.posts
  for all to authenticated using (public.has_perm('blog')) with check (public.has_perm('blog'));
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts
  for select using (status = 'published' or public.has_perm('blog'));

-- vacancies -> 'vacatures'
drop policy if exists "admin write vacancies" on public.vacancies;
create policy "admin write vacancies" on public.vacancies
  for all to authenticated using (public.has_perm('vacatures')) with check (public.has_perm('vacatures'));
drop policy if exists "public read vacancies" on public.vacancies;
create policy "public read vacancies" on public.vacancies
  for select using (status = 'published' or public.has_perm('vacatures'));

-- applications en contact_messages -> 'postvak'
drop policy if exists "admin read applications" on public.applications;
drop policy if exists "admin update applications" on public.applications;
drop policy if exists "admin delete applications" on public.applications;
create policy "admin read applications" on public.applications
  for select to authenticated using (public.has_perm('postvak'));
create policy "admin update applications" on public.applications
  for update to authenticated using (public.has_perm('postvak')) with check (public.has_perm('postvak'));
create policy "admin delete applications" on public.applications
  for delete to authenticated using (public.has_perm('postvak'));

drop policy if exists "admin read messages" on public.contact_messages;
drop policy if exists "admin update messages" on public.contact_messages;
drop policy if exists "admin delete messages" on public.contact_messages;
create policy "admin read messages" on public.contact_messages
  for select to authenticated using (public.has_perm('postvak'));
create policy "admin update messages" on public.contact_messages
  for update to authenticated using (public.has_perm('postvak')) with check (public.has_perm('postvak'));
create policy "admin delete messages" on public.contact_messages
  for delete to authenticated using (public.has_perm('postvak'));

-- leads -> 'bellijst'
drop policy if exists "admin read leads" on public.leads;
drop policy if exists "admin write leads" on public.leads;
create policy "admin read leads" on public.leads
  for select to authenticated using (public.has_perm('bellijst'));
create policy "admin write leads" on public.leads
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

-- page_views -> 'bezoek'
drop policy if exists "admin read page_views" on public.page_views;
drop policy if exists "admin delete page_views" on public.page_views;
create policy "admin read page_views" on public.page_views
  for select to authenticated using (public.has_perm('bezoek'));
create policy "admin delete page_views" on public.page_views
  for delete to authenticated using (public.has_perm('bezoek'));

-- site_settings dient twee schermen: Instellingen en SEO. Beide rechten geven
-- schrijftoegang; fijner onderscheiden zou een aparte tabel per sleutel vragen.
drop policy if exists "admin write settings" on public.site_settings;
create policy "admin write settings" on public.site_settings
  for all to authenticated
  using (public.has_perm('instellingen') or public.has_perm('seo'))
  with check (public.has_perm('instellingen') or public.has_perm('seo'));

-- storage: media -> 'media', cv's horen bij het postvak
drop policy if exists "admin insert media" on storage.objects;
drop policy if exists "admin update media" on storage.objects;
drop policy if exists "admin delete media" on storage.objects;
drop policy if exists "admin read cvs" on storage.objects;
create policy "admin insert media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.has_perm('media'));
create policy "admin update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.has_perm('media'));
create policy "admin delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.has_perm('media'));
create policy "admin read cvs" on storage.objects
  for select to authenticated using (bucket_id = 'cvs' and public.has_perm('postvak'));
