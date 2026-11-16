-- Klantenbord (/admin/klantenbord): één scherm met alle leads en klanten, de
-- status van elk, het laatste gesprek en de volgende stap (Rens, 16 nov 2026:
-- "maak ook een whiteboard met onze leads en klanten zodat we een scherm hebben
-- met overzicht van de status, laatste gesprekken etc").
--
-- Het datamodel volgt zijn klantlijst (klantlijst.xlsx): per klant een
-- startdatum, de naam, en de checklist van het instaptraject (offerte retour,
-- contract retour, koppeling, formulieren retour, naar Exact/facturatie), een
-- vrije kolom met de laatste stand en soms een contactpersoon. Die lijst is
-- hier een rij per klant plus een tijdlijn van gesprekken, zodat het bord ook
-- laat zien wat er het laatst besproken is en wat de volgende actie is.
--
-- - klanten: één rij per bedrijf. `sleutel` is de bedrijfsnaam zonder
--   rechtsvorm, hoofdletters en leestekens (bedrijf_sleutel, dezelfde regel als
--   normalizeName in lib/companies.ts), uniek: zo levert een nieuwe import van
--   de klantlijst geen dubbelen op en herkent het bord dezelfde klant in
--   offertes, brochures, contracten en onboardings. `status` is de kolom op het
--   bord: lead, gesprek (gepland of gevoerd), offerte (uit, wacht op de klant),
--   akkoord (offerte retour, contract onderweg), inrichten (contract retour,
--   React2u richt in), klant (ingericht, live) en inactief (verloren of
--   gestopt). De vijf vinkjes zijn de kolommen uit de klantlijst.
--   `laatste_contact_op`/`laatste_contact` zijn afgeleid van de tijdlijn
--   (trigger), zodat een kaart ze zonder join kan tonen.
-- - klant_gesprekken: de tijdlijn. Een gesprek, mail of bezoek met datum en
--   een korte tekst; `status` en `import` zijn systeemregels (wie de kaart
--   verplaatste, wat een import wijzigde) en tellen niet als contact.
--
-- Privacy: naam, telefoon en e-mail van een contactpersoon bij een bedrijf, en
-- wat er besproken is. Alleen achter has_perm('bellijst'), net als de bellijst
-- (0003); anon komt er niet bij.
--
-- VOLGORDE: na 0039 (onboarding werkgever en werknemer). Zonder deze migratie meldt /admin/klantenbord dat.

create or replace function public.bedrijf_sleutel(naam text) returns text
language sql immutable strict
as $$
  select nullif(btrim(regexp_replace(
    regexp_replace(
      translate(lower(naam), 'àáâãäåèéêëìíîïòóôõöùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn'),
      '\m(b\.?\s?v\.?|n\.?\s?v\.?|v\.?o\.?f\.?|c\.?v\.?|gmbh|ltd\.?|llc|inc\.?|s\.?a\.?|plc|holding)\M', ' ', 'g'),
    '[^a-z0-9]+', ' ', 'g')), '');
$$;

create table public.klanten (
  id uuid primary key default gen_random_uuid(),
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  sleutel text generated always as (public.bedrijf_sleutel(bedrijf)) stored,
  status text not null default 'lead'
    check (status in ('lead', 'gesprek', 'offerte', 'akkoord', 'inrichten', 'klant', 'inactief')),

  -- Wie we daar spreken, en wie van React2u de klant heeft.
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),
  eigenaar text check (length(eigenaar) <= 80),
  bron text check (length(bron) <= 120),

  -- De kolommen uit de klantlijst.
  startdatum date,
  offerte_retour boolean not null default false,
  contract_retour boolean not null default false,
  formulieren_retour boolean not null default false,
  koppeling boolean not null default false,
  facturatie boolean not null default false,
  stand text check (length(stand) <= 2000),

  -- Wat er nu moet gebeuren.
  volgende_actie text check (length(volgende_actie) <= 500),
  volgende_actie_op date,

  -- Afgeleid van klant_gesprekken (trigger hieronder).
  laatste_contact_op date,
  laatste_contact text check (length(laatste_contact) <= 500),

  notitie text check (length(notitie) <= 10000),
  lead_id uuid references public.leads(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index klanten_sleutel on public.klanten (sleutel);
create index klanten_bord on public.klanten (status, volgende_actie_op, updated_at desc);

create trigger klanten_updated before update on public.klanten
  for each row execute function public.set_updated_at();

create table public.klant_gesprekken (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten(id) on delete cascade,
  soort text not null default 'gesprek'
    check (soort in ('gesprek', 'mail', 'bezoek', 'notitie', 'status', 'import')),
  op date not null default (now() at time zone 'Europe/Amsterdam')::date,
  tekst text not null check (length(btrim(tekst)) between 1 and 5000),
  door text check (length(door) <= 254),
  created_at timestamptz not null default now()
);

create index klant_gesprekken_klant on public.klant_gesprekken (klant_id, op desc, created_at desc);

-- Het laatste contact op de kaart: de jongste regel die een echt contact is.
create or replace function public.klant_laatste_contact() returns trigger
language plpgsql
as $$
declare
  k uuid := coalesce(new.klant_id, old.klant_id);
begin
  update public.klanten set laatste_contact_op = g.op, laatste_contact = left(g.tekst, 500)
  from (
    select op, tekst from public.klant_gesprekken
    where klant_id = k and soort in ('gesprek', 'mail', 'bezoek', 'notitie')
    order by op desc, created_at desc limit 1
  ) g
  where id = k;
  if not found then
    update public.klanten set laatste_contact_op = null, laatste_contact = null where id = k;
  end if;
  return null;
end;
$$;

create trigger klant_gesprekken_contact after insert or update or delete on public.klant_gesprekken
  for each row execute function public.klant_laatste_contact();

alter table public.klanten enable row level security;
alter table public.klant_gesprekken enable row level security;
revoke all on public.klanten from anon;
revoke all on public.klant_gesprekken from anon;

create policy "bellijst leest klanten" on public.klanten
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft klanten" on public.klanten
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

create policy "bellijst leest gesprekken" on public.klant_gesprekken
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft gesprekken" on public.klant_gesprekken
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
