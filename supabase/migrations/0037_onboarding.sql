-- Onboarding (/admin/onboarding): een nieuwe klant krijgt één persoonlijke
-- link (/onboarding/<token>) met de documenten die sales voor hem aanvinkt.
-- Per document kiest sales of het alleen meegaat (lezen of downloaden) of dat
-- de klant het online invult (Rens, 16 nov 2026: "zorg dat de bestanden via
-- de admin verstuurd kunnen worden ... en dat je selecteert welke bestanden
-- verstuurd worden en ingevuld kunnen worden").
--
-- Dezelfde opzet als brochures (0030):
-- - onboardings: één rij per klant. `token` is het geheim in de link.
--   `documenten` = wat meegaat, `invullen` = welke daarvan online in te vullen
--   zijn (altijd een deel van documenten). De catalogus zelf staat in de code
--   (lib/onboarding.ts), niet in de tabel.
-- - antwoorden: per document { data, at, door }, alleen te schrijven via
--   onboarding_opslaan. gelezen: per document het moment dat de klant het
--   afvinkte, via onboarding_gelezen.
-- - taken: wat React2u zelf regelt na de documenten van de klant (werkgever
--   in XpertSuite, werknemers importeren, debiteur, casemanager, dossiers
--   opvragen, instructie), per taak { at, door }. De lijst staat in de code
--   (lib/onboarding.ts, TAKEN); samen met de documenten is dat het hele
--   traject tot de klant live is.
-- - onboarding_gebeurtenissen: de tijdlijn.
--
-- Privacy: de werknemerslijst (import XpertSuite) bevat burgerservicenummers.
-- Daarom: alleen achter has_perm('bellijst'), een knop in het beheer om de
-- lijst te wissen zodra hij in XpertSuite staat, en de hele onboarding gaat een
-- jaar na de laatste activiteit weg, zoals een brochure.
--
-- Rechten: de klant komt nooit bij de tabel; alles loopt via de functies
-- hieronder (security definer) met het token als sleutel.
--
-- VOLGORDE: na 0036. Zonder deze migratie meldt /admin/onboarding dat, en
-- geeft /onboarding/<token> een 404.

create sequence public.onboarding_nummer_seq;

create table public.onboardings (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique default (
    'O' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('public.onboarding_nummer_seq')::text, 4, '0')
  ),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'afgerond', 'ingetrokken')),

  -- De klant
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),
  bericht text check (length(bericht) <= 5000),

  -- Welke documenten meegaan, en welke daarvan online in te vullen zijn.
  documenten text[] not null default '{}' check (cardinality(documenten) <= 20),
  invullen text[] not null default '{}' check (invullen <@ documenten),

  -- Wat de klant deed.
  antwoorden jsonb not null default '{}'::jsonb check (jsonb_typeof(antwoorden) = 'object'),
  gelezen jsonb not null default '{}'::jsonb check (jsonb_typeof(gelezen) = 'object'),

  -- In te vullen door React2u (het blok onderaan het oude inrichtingsformulier).
  contractsoort text check (length(contractsoort) <= 200),
  debiteurnummer text check (length(debiteurnummer) <= 60),

  -- Wat React2u zelf regelde: per taak uit lib/onboarding.ts { at, door }.
  taken jsonb not null default '{}'::jsonb check (jsonb_typeof(taken) = 'object'),

  afzender_naam text check (length(afzender_naam) <= 200),
  afzender_functie text check (length(afzender_functie) <= 200),
  afzender_email text check (length(afzender_email) <= 254),
  afzender_telefoon text check (length(afzender_telefoon) <= 40),

  notitie text check (length(notitie) <= 5000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verstuurd_at timestamptz,
  afgerond_at timestamptz,

  bekeken_at timestamptz,
  laatst_bekeken_at timestamptz,
  aantal_bekeken integer not null default 0
);
create index onboardings_status on public.onboardings (status, created_at desc);

create table public.onboarding_gebeurtenissen (
  id bigint generated always as identity primary key,
  onboarding_id uuid not null references public.onboardings(id) on delete cascade,
  soort text not null check (soort in (
    'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'ingevuld', 'gelezen', 'afgerond', 'ingetrokken', 'heropend', 'gewist', 'taak'
  )),
  door text,
  details jsonb,
  at timestamptz not null default now()
);
create index onboarding_gebeurtenissen_onboarding on public.onboarding_gebeurtenissen (onboarding_id, at desc);

create trigger onboardings_updated before update on public.onboardings
  for each row execute function public.set_updated_at();

alter table public.onboardings enable row level security;
alter table public.onboarding_gebeurtenissen enable row level security;
revoke all on public.onboardings, public.onboarding_gebeurtenissen from anon;
revoke all on sequence public.onboarding_nummer_seq from anon;
grant usage on sequence public.onboarding_nummer_seq to authenticated;

create policy "bellijst beheert onboardings" on public.onboardings
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst leest onboardingtijdlijn" on public.onboarding_gebeurtenissen
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft onboardingtijdlijn" on public.onboarding_gebeurtenissen
  for insert to authenticated with check (
    public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'afgerond', 'ingetrokken', 'heropend', 'gewist', 'taak')
  );

-- Het bezoek, het nummer en de aanmaakgegevens schrijft alleen de database zelf.
create or replace function public.onboarding_bewaken() returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
      new.antwoorden := '{}'::jsonb; new.gelezen := '{}'::jsonb; new.taken := '{}'::jsonb;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.nummer := old.nummer; new.created_by := old.created_by; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

create trigger onboarding_bewaken
  before insert or update on public.onboardings
  for each row execute function public.onboarding_bewaken();

-- Of alles gedaan is: elk in te vullen document heeft een antwoord, elk ander
-- document is afgevinkt.
create or replace function public.onboarding_compleet(o public.onboardings) returns boolean
language sql immutable set search_path = public
as $$
  select cardinality(o.documenten) > 0 and not exists (
    select 1 from unnest(o.documenten) d
    where not (case when d = any(o.invullen) then o.antwoorden ? d else o.gelezen ? d end)
  )
$$;

-- Wat de klant te zien krijgt. Null voor een onbekend token (404); een
-- ingetrokken onboarding geeft alleen de status en de contactpersoon.
create or replace function public.onboarding_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
  eerste boolean := false;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into o from public.onboardings where token = p_token;
  if not found then return null; end if;

  if o.status = 'ingetrokken' then
    return jsonb_build_object(
      'status', o.status, 'nummer', o.nummer, 'bedrijf', o.bedrijf,
      'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon
    );
  end if;

  -- Elke render van de pagina komt hier langs, ook na opslaan: Next rendert de
  -- pagina opnieuw in het verzoek van de server action en bij router.refresh
  -- (de interne headers daarvan ziet de pagina niet). Daarom telt een bezoek
  -- pas opnieuw na een half uur zonder activiteit, net als de gebeurtenis.
  if p_tel and o.status in ('verstuurd', 'afgerond') then
    update public.onboardings set bekeken_at = now() where id = o.id and bekeken_at is null returning true into eerste;
    eerste := coalesce(eerste, false);
    update public.onboardings
      set aantal_bekeken = aantal_bekeken + (case when laatst_bekeken_at is null or laatst_bekeken_at < now() - interval '30 minutes' then 1 else 0 end),
          laatst_bekeken_at = now()
      where id = o.id;
    if not exists (
      select 1 from public.onboarding_gebeurtenissen
      where onboarding_id = o.id and soort = 'bekeken' and at > now() - interval '30 minutes'
    ) then
      insert into public.onboarding_gebeurtenissen (onboarding_id, soort) values (o.id, 'bekeken');
    end if;
  end if;

  return jsonb_build_object(
    'id', o.id, 'nummer', o.nummer, 'status', o.status,
    'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'bericht', o.bericht,
    'documenten', to_jsonb(o.documenten), 'invullen', to_jsonb(o.invullen),
    'antwoorden', o.antwoorden, 'gelezen', o.gelezen,
    'afzender_naam', o.afzender_naam, 'afzender_functie', o.afzender_functie,
    'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'verstuurd_at', o.verstuurd_at, 'afgerond_at', o.afgerond_at, 'created_at', o.created_at,
    'eerste_keer', eerste
  );
end
$$;

-- Na een wijziging: is alles gedaan, dan gaat de status naar afgerond.
create or replace function public.onboarding_afronden(p_id uuid) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
begin
  select * into o from public.onboardings where id = p_id;
  if o.status = 'verstuurd' and public.onboarding_compleet(o) then
    update public.onboardings set status = 'afgerond', afgerond_at = now() where id = p_id;
    insert into public.onboarding_gebeurtenissen (onboarding_id, soort) values (p_id, 'afgerond');
    return true;
  end if;
  return false;
end
$$;

-- De klant vult een document in (of past het aan). De vorm van `p_data`
-- controleert Next (lib/onboarding.ts); hier alleen of het mag en hoe groot.
create or replace function public.onboarding_opslaan(p_token text, p_document text, p_data jsonb, p_naam text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
  eerste boolean;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if p_document is null or not (p_document = any(o.invullen)) then return jsonb_build_object('ok', false, 'fout', 'document'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 400000 then
    return jsonb_build_object('ok', false, 'fout', 'invoer');
  end if;

  eerste := not (o.antwoorden ? p_document);
  update public.onboardings
    set antwoorden = antwoorden || jsonb_build_object(p_document, jsonb_build_object('data', p_data, 'at', now(), 'door', left(nullif(btrim(p_naam), ''), 200)))
    where id = o.id;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
    values (o.id, 'ingevuld', jsonb_build_object('document', p_document, 'opnieuw', not eerste));

  return jsonb_build_object('ok', true, 'eerste', eerste, 'afgerond', public.onboarding_afronden(o.id));
end
$$;

-- De klant vinkt een document af als gelezen (of: gedownload en geregeld).
create or replace function public.onboarding_gelezen(p_token text, p_document text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if p_document is null or not (p_document = any(o.documenten)) then return jsonb_build_object('ok', false, 'fout', 'document'); end if;
  if o.gelezen ? p_document then return jsonb_build_object('ok', true, 'afgerond', false); end if;

  update public.onboardings set gelezen = gelezen || jsonb_build_object(p_document, now()) where id = o.id;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details) values (o.id, 'gelezen', jsonb_build_object('document', p_document));
  return jsonb_build_object('ok', true, 'afgerond', public.onboarding_afronden(o.id));
end
$$;

revoke execute on function public.onboarding_bewaken() from public, anon, authenticated;
revoke execute on function public.onboarding_compleet(public.onboardings) from public, anon;
revoke execute on function public.onboarding_afronden(uuid) from public, anon, authenticated;
revoke execute on function public.onboarding_bekijken(text, boolean) from public;
revoke execute on function public.onboarding_opslaan(text, text, jsonb, text) from public;
revoke execute on function public.onboarding_gelezen(text, text) from public;
grant execute on function public.onboarding_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.onboarding_opslaan(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.onboarding_gelezen(text, text) to anon, authenticated;

-- Bewaartermijn: een jaar na de laatste activiteit, net als brochures (0030).
select cron.schedule(
  'opruimen-onboardings',
  '40 3 * * *',
  $$delete from public.onboardings where updated_at < now() - interval '365 days'$$
);
