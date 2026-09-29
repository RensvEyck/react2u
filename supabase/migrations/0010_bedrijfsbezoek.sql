-- Bedrijfsbezoek: welke bedrijven bekijken de site, en wat doen we ermee.
--
-- Herkenning gebeurt in de tracker (src/lib/companies.ts): de netwerkeigenaar
-- via ipinfo Lite, en reverse DNS voor bedrijven met een eigen naam op hun
-- vaste lijn. Nog steeds zonder IP-adres in de database.

/* ---------- page_views: domein en bron ---------- */

alter table public.page_views add column if not exists company_domain text;
alter table public.page_views add column if not exists company_source text
  check (company_source in ('asn', 'rdns'));

create index if not exists page_views_company_domain_idx
  on public.page_views (company_domain, created_at desc)
  where company_domain is not null;

-- De tracker schrijft met de publieke sleutel. Voor het geval anon hier
-- per kolom rechten heeft in plaats van op de hele tabel (zie de valkuil over
-- wijzigingen die rechtstreeks in de database zijn gedaan): de nieuwe kolommen
-- expliciet toestaan. Kan geen kwaad als het al mocht.
grant insert (company_domain, company_source) on public.page_views to anon;

-- "Vergeten": de bedrijfsnaam uit eerdere bezoeken halen. Daarvoor moet een
-- beheerder met het recht `bezoek` rijen kunnen bijwerken; tot nu toe kon dat
-- alleen lezen en verwijderen.
drop policy if exists "admin update page_views" on public.page_views;
create policy "admin update page_views" on public.page_views
  for update to authenticated
  using (public.has_perm('bezoek')) with check (public.has_perm('bezoek'));

/* ---------- keuzes per bedrijf ---------- */

-- Eén rij per bedrijf waar iemand iets mee deed: genegeerd (eigen kantoor,
-- bestaande klant, een leverancier) of op de bellijst gezet. Bedrijven zonder
-- keuze staan hier niet; die volgen alleen uit page_views.
create table if not exists public.company_profiles (
  -- Het domein, of "naam:<genormaliseerde naam>" (companyKey()).
  key text primary key,
  name text not null,
  domain text,
  ignored boolean not null default false,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists company_profiles_updated on public.company_profiles;
create trigger company_profiles_updated before update on public.company_profiles
  for each row execute function public.set_updated_at();

alter table public.company_profiles enable row level security;

-- Wie bij het bezoek mag, mag ook deze keuzes zien en maken. Geen publieke
-- toegang: welke bedrijven genegeerd worden (klanten, leveranciers) is intern.
drop policy if exists "manage company_profiles" on public.company_profiles;
create policy "manage company_profiles" on public.company_profiles
  for all to authenticated
  using (public.has_perm('bezoek')) with check (public.has_perm('bezoek'));

-- Genegeerd betekent ook: niet meer vastleggen. De tracker vraagt dit na met
-- de publieke sleutel voordat hij een bedrijfsnaam opslaat. Alleen ja of nee
-- voor een sleutel die de aanroeper al kent — de lijst zelf blijft intern.
create or replace function public.company_ignored(p_key text) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.company_profiles where key = p_key and ignored)
$$;

revoke all on function public.company_ignored(text) from public;
grant execute on function public.company_ignored(text) to anon, authenticated;
