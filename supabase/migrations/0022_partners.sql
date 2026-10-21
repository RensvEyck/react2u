-- Partnerprogramma (/partners): partners met een eigen code en aanmeldlink,
-- de werkgevers die zij aanbrachten, en per bericht via welke partner het
-- binnenkwam.
--
-- - partners: één rij per kantoor, met een unieke code (hoofdletters en
--   cijfers) voor de aanmeldlink /kennismaken?partner=CODE, het model en de
--   percentages. Deactiveren in plaats van verwijderen: een partner met
--   klanten kan niet weg (on delete restrict), zijn overzicht blijft kloppen.
-- - partner_klanten: de werkgevers die via een partner klant werden, met het
--   aantal medewerkers, het abonnement per medewerker per jaar en de looptijd.
--   Daarmee rekent het beheer de vergoeding per kwartaal uit (lib/partners.ts).
-- - contact_messages.partner_code: de code uit de aanmeldlink, door het
--   formulier meegestuurd. partner_id bepaalt altijd de trigger hieronder: die
--   maakt de kolom bij elke nieuwe rij eerst leeg en vult hem alleen voor een
--   actieve partner met deze code. Dat is de echte grens, niet de
--   kolomrechten: de bezoekersrol heeft op contact_messages naast de
--   kolomrechten ook nog een invoegrecht op de hele tabel (nagekeken op 21 okt
--   2026) en kan partner_id dus technisch meesturen; de trigger overschrijft
--   dat. Zo kan niemand via de publieke sleutel een aanvraag aan een partner
--   naar keuze hangen, en hoeft de publieke kant de partnerlijst niet te lezen.
--
-- Rechten: alles achter has_perm('bellijst'), het salesrecht. Geen apart recht,
-- want dat vraagt een aanpassing van alle rollen.
--
-- VOLGORDE: kan vóór of na de code die erbij hoort. Zonder deze migratie
-- slaat het formulier de code over (insertMetExtra) en wacht het
-- partnerscherm met een melding.
--
-- Registreren: via apply_migration (naam 0022_partners) vanzelf; in de
-- SQL-editor daarna:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), '0022_partners');

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,20}$'),
  kantoor text not null check (length(btrim(kantoor)) > 0),
  naam text,
  email text,
  telefoon text,
  model text not null default 'aanbreng' check (model in ('aanbreng', 'reseller')),
  pct_jaar_een numeric(5,2) not null default 50 check (pct_jaar_een between 0 and 100),
  pct_vervolg numeric(5,2) not null default 25 check (pct_vervolg between 0 and 100),
  actief boolean not null default true,
  notitie text,
  created_at timestamptz not null default now()
);

create table public.partner_klanten (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  bedrijf text not null check (length(btrim(bedrijf)) > 0),
  medewerkers integer not null check (medewerkers > 0),
  -- Abonnement per medewerker per jaar, in euro's.
  tarief numeric(10,2) not null check (tarief >= 0),
  start date not null,
  -- Laatste dag als klant; leeg zolang de klant blijft.
  eind date check (eind is null or eind >= start),
  bericht_id uuid references public.contact_messages(id) on delete set null,
  notitie text,
  created_at timestamptz not null default now()
);
create index partner_klanten_partner on public.partner_klanten (partner_id);

alter table public.partners enable row level security;
alter table public.partner_klanten enable row level security;
revoke all on public.partners, public.partner_klanten from anon;

create policy "bellijst beheert partners" on public.partners
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst beheert partnerklanten" on public.partner_klanten
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

alter table public.contact_messages
  add column partner_code text check (partner_code is null or length(partner_code) <= 40),
  add column partner_id uuid references public.partners(id) on delete set null;
create index contact_messages_partner on public.contact_messages (partner_id) where partner_id is not null;
-- Het kolomrecht voor partner_code, zoals bij lang (0015) en bron (0018): nodig
-- zodra het invoegrecht op de hele tabel wordt ingetrokken.
grant insert (partner_code) on public.contact_messages to anon, authenticated;

-- Koppelt een nieuw bericht aan de actieve partner met deze code. security
-- definer: de trigger moet partners kunnen lezen, de bezoeker niet.
create or replace function public.contact_partner_koppelen() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.partner_id := null;
  if new.partner_code is not null then
    new.partner_code := upper(btrim(new.partner_code));
    select p.id into new.partner_id from public.partners p where p.code = new.partner_code and p.actief;
  end if;
  return new;
end
$$;
revoke execute on function public.contact_partner_koppelen() from public, anon, authenticated;

create trigger contact_partner_koppelen
  before insert on public.contact_messages
  for each row execute function public.contact_partner_koppelen();

-- Controle (verwacht: de tweede insert krijgt een partner_id, de eerste niet;
-- een partner_id die de bezoeker zelf meestuurt, blijft leeg):
--   begin;
--   insert into public.partners (code, kantoor) values ('TESTKANTOOR', 'Test');
--   set local role anon;
--   insert into public.contact_messages (name, email, message, partner_code) values ('a', 'a@b.nl', 'x', 'onbekend');
--   insert into public.contact_messages (name, email, message, partner_code) values ('b', 'b@b.nl', 'x', 'testkantoor');
--   insert into public.contact_messages (name, email, message, partner_id) values ('c', 'c@b.nl', 'x', (select id from public.partners limit 1));
--   reset role;
--   select name, partner_code, partner_id is not null from public.contact_messages where name in ('a', 'b', 'c');
--   rollback;
