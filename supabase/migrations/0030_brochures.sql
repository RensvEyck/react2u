-- Brochures (/admin/brochures): sales stuurt een prospect een persoonlijke
-- brochure met alle zes diensten (/brochure/<token>), nog vóór er een offerte
-- is (Rens, 2 nov 2026: "maak een brochure pagina zodat we een template handig
-- kunnen versturen, offerte zelf volgt later").
--
-- Dezelfde opzet als offertes (0024), zonder regels, keuze of ondertekening:
-- - brochures: één rij per brochure. `token` is het geheim in de link, net
--   als bij een offerte. De inhoud (de zes diensten) komt van de
--   labelpagina's in het CMS en staat niet in de tabel; `bericht` is het
--   persoonlijke woord van de afzender op de pagina en in de mail.
-- - brochure_gebeurtenissen: de tijdlijn (aangemaakt, verstuurd, bekeken, ...).
--
-- Rechten: alles achter has_perm('bellijst'), net als offertes. De prospect
-- komt nooit bij de tabel: hij leest via brochure_bekijken (security
-- definer) met het token als sleutel. Een concept is al te bekijken (de
-- inhoud ligt vast, dus sales kan hem vooraf zien), maar een bezoek telt pas
-- als de brochure verstuurd is.
--
-- Nummering: B2026-0001, B2026-0002, ... net als offertes. Bewaartermijn: een
-- jaar na de laatste activiteit, zoals niet-getekende offertes (0028).
--
-- VOLGORDE: na 0029. Kan vóór of na de code: zonder deze migratie meldt
-- /admin/brochures dat, en geeft /brochure/<token> een 404.
--
-- Registreren: via apply_migration (naam 0030_brochures) vanzelf.

create sequence public.brochure_nummer_seq;

create table public.brochures (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique default (
    'B' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('public.brochure_nummer_seq')::text, 4, '0')
  ),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'ingetrokken')),

  -- De prospect
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),

  -- Het persoonlijke woord van de afzender, op de pagina en in de mail.
  bericht text check (length(bericht) <= 5000),

  -- Wie hem stuurt: staat op de pagina als contactpersoon, en krijgt de meldingen.
  afzender_naam text check (length(afzender_naam) <= 200),
  afzender_functie text check (length(afzender_functie) <= 200),
  afzender_email text check (length(afzender_email) <= 254),
  afzender_telefoon text check (length(afzender_telefoon) <= 40),

  notitie text check (length(notitie) <= 5000),
  -- De offerte die uit deze brochure voortkwam, als die er is.
  offerte_id uuid references public.offertes(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verstuurd_at timestamptz,

  -- Wat de prospect deed. Alleen te schrijven door brochure_bekijken.
  bekeken_at timestamptz,
  laatst_bekeken_at timestamptz,
  aantal_bekeken integer not null default 0
);
create index brochures_status on public.brochures (status, created_at desc);

create table public.brochure_gebeurtenissen (
  id bigint generated always as identity primary key,
  brochure_id uuid not null references public.brochures(id) on delete cascade,
  soort text not null check (soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'ingetrokken', 'heropend')),
  -- E-mailadres van de collega.
  door text,
  details jsonb,
  at timestamptz not null default now()
);
create index brochure_gebeurtenissen_brochure on public.brochure_gebeurtenissen (brochure_id, at desc);

create trigger brochures_updated before update on public.brochures
  for each row execute function public.set_updated_at();

alter table public.brochures enable row level security;
alter table public.brochure_gebeurtenissen enable row level security;
revoke all on public.brochures, public.brochure_gebeurtenissen from anon;
revoke all on sequence public.brochure_nummer_seq from anon;
grant usage on sequence public.brochure_nummer_seq to authenticated;

create policy "bellijst beheert brochures" on public.brochures
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst leest brochuretijdlijn" on public.brochure_gebeurtenissen
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft brochuretijdlijn" on public.brochure_gebeurtenissen
  for insert to authenticated with check (public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'ingetrokken', 'heropend'));

-- Wat de prospect deed (bekeken) schrijft alleen brochure_bekijken; via de API
-- (rol authenticated) blijft het staan, net als nummer en aanmaakgegevens.
create or replace function public.brochure_bewaken() returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.nummer := old.nummer; new.created_by := old.created_by; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

create trigger brochure_bewaken
  before insert or update on public.brochures
  for each row execute function public.brochure_bewaken();

-- Wat de prospect van een brochure te zien krijgt. Null voor een onbekend
-- token (404); een ingetrokken brochure geeft alleen de status en de
-- contactpersoon. Met p_tel telt het bezoek mee zodra de brochure verstuurd
-- is; eerste_keer zegt of dit het allereerste bezoek was (voor de melding aan
-- de afzender). Een bezoek komt hooguit één keer per half uur in de tijdlijn.
create or replace function public.brochure_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  b public.brochures;
  eerste boolean := false;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into b from public.brochures where token = p_token;
  if not found then return null; end if;

  if b.status = 'ingetrokken' then
    return jsonb_build_object(
      'status', b.status, 'nummer', b.nummer, 'bedrijf', b.bedrijf,
      'afzender_naam', b.afzender_naam, 'afzender_email', b.afzender_email, 'afzender_telefoon', b.afzender_telefoon
    );
  end if;

  if p_tel and b.status = 'verstuurd' then
    update public.brochures set bekeken_at = now() where id = b.id and bekeken_at is null returning true into eerste;
    eerste := coalesce(eerste, false);
    update public.brochures set laatst_bekeken_at = now(), aantal_bekeken = aantal_bekeken + 1 where id = b.id;
    if not exists (
      select 1 from public.brochure_gebeurtenissen
      where brochure_id = b.id and soort = 'bekeken' and at > now() - interval '30 minutes'
    ) then
      insert into public.brochure_gebeurtenissen (brochure_id, soort) values (b.id, 'bekeken');
    end if;
  end if;

  return jsonb_build_object(
    'id', b.id, 'nummer', b.nummer, 'status', b.status,
    'bedrijf', b.bedrijf, 'contactpersoon', b.contactpersoon, 'bericht', b.bericht,
    'afzender_naam', b.afzender_naam, 'afzender_functie', b.afzender_functie,
    'afzender_email', b.afzender_email, 'afzender_telefoon', b.afzender_telefoon,
    'verstuurd_at', b.verstuurd_at, 'created_at', b.created_at,
    'eerste_keer', eerste
  );
end
$$;

revoke execute on function public.brochure_bewaken() from public, anon, authenticated;
revoke execute on function public.brochure_bekijken(text, boolean) from public;
grant execute on function public.brochure_bekijken(text, boolean) to anon, authenticated;

-- Bewaartermijn: een jaar na de laatste activiteit (updated_at schuift ook op
-- als de prospect de brochure opent), net als niet-getekende offertes (0028).
select cron.schedule(
  'opruimen-brochures',
  '35 3 * * *',
  $$delete from public.brochures where updated_at < now() - interval '365 days'$$
);

-- Controle (verwacht: de select als anon geeft een fout, de functie met een
-- fout token null):
--   set local role anon; select * from public.brochures; -- permission denied
--   select public.brochure_bekijken('0000000000000000000000000000000000000000000000000000000000000000');  -- null
