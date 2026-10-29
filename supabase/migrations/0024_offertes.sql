-- Offertes (/admin/offertes): sales stelt een offerte samen, stuurt de klant
-- een link (/offerte/<token>), en de klant kiest daar zelf de onderdelen en
-- ondertekent online.
--
-- - offertes: één rij per offerte. `regels` is de inhoud (jsonb, vorm in
--   src/lib/offertes.ts): per regel een prijs, eenheid en soort (vast, optie,
--   keuze uit een groep, of tarief bij gebruik). `token` is het geheim in de
--   link: 64 hexadecimale tekens uit twee willekeurige uuid's (244 bits).
-- - offerte_gebeurtenissen: de tijdlijn (aangemaakt, verstuurd, bekeken,
--   getekend, ...). Bij een ondertekening ook het bewijs: wie, wanneer, welke
--   versie (hash van de vastgelegde inhoud).
--
-- Rechten: alles achter has_perm('bellijst'), het salesrecht, net als
-- partners (0022). De klant komt nooit rechtstreeks bij de tabellen: anon
-- heeft er geen enkel recht op. De publieke pagina loopt via vier functies
-- (security definer) die alleen met het juiste token iets doen en alleen
-- teruggeven wat de klant mag zien (geen notitie, IP of wie hem aanmaakte).
--
-- Alleen de klant tekent. Een beheerder kan via de API geen handtekening,
-- keuze of afwijzing invullen, en een getekende offerte niet meer wijzigen of
-- verwijderen (trigger offerte_bewaken). Alleen de interne notitie blijft
-- bewerkbaar. Zo is een getekende offerte bewijs, ook tegenover het eigen
-- beheer.
--
-- Nummering: 2026-0001, 2026-0002, ... Het volgnummer loopt over de jaren
-- door (een sequence kan niet per jaar terug naar 1 zonder race), het jaar is
-- dat van het aanmaken.
--
-- VOLGORDE: kan vóór of na de code die erbij hoort. Zonder deze migratie
-- toont /admin/offertes een melding en geeft /offerte/<token> een 404.
--
-- Registreren: via apply_migration (naam 0024_offertes) vanzelf; in de
-- SQL-editor daarna:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), '0024_offertes');

create sequence public.offerte_nummer_seq;

create table public.offertes (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique default (
    to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('public.offerte_nummer_seq')::text, 4, '0')
  ),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'concept'
    check (status in ('concept', 'verstuurd', 'getekend', 'afgewezen', 'ingetrokken')),

  -- De klant
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),
  medewerkers integer check (medewerkers is null or medewerkers between 1 and 1000000),

  -- De inhoud
  titel text not null default 'Offerte' check (length(btrim(titel)) between 1 and 200),
  intro text check (length(intro) <= 5000),
  regels jsonb not null default '[]' check (jsonb_typeof(regels) = 'array' and jsonb_array_length(regels) <= 200),
  geldig_tot date,

  -- Wie hem stuurt: staat op de pagina als contactpersoon, en krijgt de meldingen.
  afzender_naam text check (length(afzender_naam) <= 200),
  afzender_functie text check (length(afzender_functie) <= 200),
  afzender_email text check (length(afzender_email) <= 254),
  afzender_telefoon text check (length(afzender_telefoon) <= 40),

  notitie text check (length(notitie) <= 5000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verstuurd_at timestamptz,

  -- Wat de klant deed. Alleen te schrijven door de functies hieronder.
  bekeken_at timestamptz,
  laatst_bekeken_at timestamptz,
  aantal_bekeken integer not null default 0,
  -- De ids van de gekozen regels: tijdens het kiezen de laatste stand, na
  -- ondertekening wat er getekend is (vaste regels inbegrepen).
  keuze jsonb check (keuze is null or jsonb_typeof(keuze) = 'array'),
  keuze_at timestamptz,
  getekend_at timestamptz,
  getekend_naam text,
  getekend_functie text,
  getekend_email text,
  -- De handtekening als PNG (data-URL), getekend of uit de getypte naam.
  handtekening text check (handtekening is null or (handtekening like 'data:image/png;base64,%' and length(handtekening) <= 300000)),
  -- Bewijs van de ondertekening: IP en browser van dat ene moment, de
  -- vastgelegde inhoud en de sha-256 daarvan. Het IP staat nergens anders in de
  -- database; zie CONTEXT.md, *Offertes*.
  getekend_ip text,
  getekend_agent text,
  getekend_inhoud jsonb,
  getekend_hash text,
  afgewezen_at timestamptz,
  afgewezen_reden text check (length(afgewezen_reden) <= 2000)
);
create index offertes_status on public.offertes (status, created_at desc);

create table public.offerte_gebeurtenissen (
  id bigint generated always as identity primary key,
  offerte_id uuid not null references public.offertes(id) on delete cascade,
  soort text not null check (soort in (
    'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'getekend', 'afgewezen', 'ingetrokken', 'heropend'
  )),
  -- E-mailadres van de collega, of de naam van wie tekende/afwees.
  door text,
  details jsonb,
  at timestamptz not null default now()
);
create index offerte_gebeurtenissen_offerte on public.offerte_gebeurtenissen (offerte_id, at desc);

create trigger offertes_updated before update on public.offertes
  for each row execute function public.set_updated_at();

alter table public.offertes enable row level security;
alter table public.offerte_gebeurtenissen enable row level security;
revoke all on public.offertes, public.offerte_gebeurtenissen from anon;
revoke all on sequence public.offerte_nummer_seq from anon;
-- Het nummer komt uit de standaardwaarde, en die vraagt nextval van wie invoegt.
grant usage on sequence public.offerte_nummer_seq to authenticated;

create policy "bellijst beheert offertes" on public.offertes
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst leest offertetijdlijn" on public.offerte_gebeurtenissen
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft offertetijdlijn" on public.offerte_gebeurtenissen
  for insert to authenticated with check (public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'ingetrokken', 'heropend'));

-- ---------------------------------------------------------------------------
-- Bewaken: alleen de klant tekent, en getekend is getekend.
--
-- Via de API (rol authenticated) mag het beheer de klantvelden niet zetten en
-- een getekende offerte niet wijzigen of verwijderen. De functies hieronder
-- draaien als eigenaar (security definer) en vallen buiten de eerste regel;
-- ook voor hen blijft een getekende offerte vast, op de teller van het
-- bekijken na.
-- ---------------------------------------------------------------------------
create or replace function public.offerte_bewaken() returns trigger
language plpgsql set search_path = public
as $$
declare
  via_api boolean := current_user in ('authenticated', 'anon');
  vrij constant text[] := array['notitie', 'updated_at', 'bekeken_at', 'laatst_bekeken_at', 'aantal_bekeken'];
begin
  if tg_op = 'DELETE' then
    if old.status = 'getekend' then
      raise exception 'Een getekende offerte kan niet worden verwijderd' using errcode = 'P0001', hint = 'offerte-getekend';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status = 'getekend' then
    if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij) then
      raise exception 'Een getekende offerte kan niet meer worden gewijzigd' using errcode = 'P0001', hint = 'offerte-getekend';
    end if;
    if via_api then
      new.bekeken_at := old.bekeken_at;
      new.laatst_bekeken_at := old.laatst_bekeken_at;
      new.aantal_bekeken := old.aantal_bekeken;
    end if;
    return new;
  end if;

  if via_api then
    if new.status in ('getekend', 'afgewezen') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Alleen de klant kan tekenen of afwijzen' using errcode = 'P0001', hint = 'offerte-klant';
    end if;
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
      new.keuze := null; new.keuze_at := null;
      new.getekend_at := null; new.getekend_naam := null; new.getekend_functie := null; new.getekend_email := null;
      new.handtekening := null; new.getekend_ip := null; new.getekend_agent := null;
      new.getekend_inhoud := null; new.getekend_hash := null;
      new.afgewezen_at := null; new.afgewezen_reden := null;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.keuze := old.keuze; new.keuze_at := old.keuze_at;
      new.getekend_at := old.getekend_at; new.getekend_naam := old.getekend_naam; new.getekend_functie := old.getekend_functie;
      new.getekend_email := old.getekend_email; new.handtekening := old.handtekening; new.getekend_ip := old.getekend_ip;
      new.getekend_agent := old.getekend_agent; new.getekend_inhoud := old.getekend_inhoud; new.getekend_hash := old.getekend_hash;
      -- Heropenen na een afwijzing mag (status terug naar verstuurd of concept): dan gaat de afwijzing weg.
      if old.status = 'afgewezen' and new.status <> 'afgewezen' then
        new.afgewezen_at := null; new.afgewezen_reden := null;
      else
        new.afgewezen_at := old.afgewezen_at; new.afgewezen_reden := old.afgewezen_reden;
      end if;
      new.nummer := old.nummer;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

create trigger offerte_bewaken
  before insert or update or delete on public.offertes
  for each row execute function public.offerte_bewaken();

-- ---------------------------------------------------------------------------
-- De publieke kant: vier functies, elk met het token als sleutel.
-- ---------------------------------------------------------------------------

-- Wat de klant van een offerte te zien krijgt. Null voor een concept of een
-- onbekend token (de pagina geeft dan een 404); een ingetrokken offerte geeft
-- alleen de status en de contactpersoon. Met p_tel telt het bezoek mee; het
-- veld eerste_keer zegt of dit het allereerste bezoek was (voor de melding
-- aan de afzender). Een bezoek komt hooguit één keer per half uur in de
-- tijdlijn.
create or replace function public.offerte_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  eerste boolean := false;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into o from public.offertes where token = p_token;
  if not found or o.status = 'concept' then return null; end if;

  if o.status = 'ingetrokken' then
    return jsonb_build_object(
      'status', o.status, 'nummer', o.nummer, 'bedrijf', o.bedrijf,
      'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon
    );
  end if;

  if p_tel then
    update public.offertes set bekeken_at = now() where id = o.id and bekeken_at is null returning true into eerste;
    eerste := coalesce(eerste, false);
    update public.offertes set laatst_bekeken_at = now(), aantal_bekeken = aantal_bekeken + 1 where id = o.id;
    if not exists (
      select 1 from public.offerte_gebeurtenissen
      where offerte_id = o.id and soort = 'bekeken' and at > now() - interval '30 minutes'
    ) then
      insert into public.offerte_gebeurtenissen (offerte_id, soort) values (o.id, 'bekeken');
    end if;
  end if;

  return jsonb_build_object(
    'id', o.id, 'nummer', o.nummer, 'status', o.status,
    'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'email', o.email, 'medewerkers', o.medewerkers,
    'titel', o.titel, 'intro', o.intro, 'regels', o.regels, 'geldig_tot', o.geldig_tot,
    'afzender_naam', o.afzender_naam, 'afzender_functie', o.afzender_functie,
    'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'verstuurd_at', o.verstuurd_at, 'keuze', o.keuze,
    'getekend_at', o.getekend_at, 'getekend_naam', o.getekend_naam, 'getekend_functie', o.getekend_functie,
    'getekend_email', o.getekend_email, 'handtekening', o.handtekening,
    'getekend_inhoud', o.getekend_inhoud, 'getekend_hash', o.getekend_hash,
    'afgewezen_at', o.afgewezen_at,
    'verlopen', o.geldig_tot is not null and o.geldig_tot < (now() at time zone 'Europe/Amsterdam')::date,
    'eerste_keer', eerste
  );
end
$$;

-- Welke regels doen mee bij deze keuze: de vaste altijd, opties en keuzes als
-- hun id in p_keuze staat. Null als er in een keuzegroep niet precies één is
-- gekozen. Tarieven (bij gebruik) doen nooit mee.
create or replace function public.offerte_effectieve_keuze(p_regels jsonb, p_keuze jsonb) returns jsonb
language plpgsql immutable set search_path = public
as $$
declare
  fout integer;
  uit jsonb;
begin
  if p_keuze is null or jsonb_typeof(p_keuze) <> 'array' then return null; end if;
  select count(*) into fout from (
    select r->>'groep' as groep, count(*) filter (where p_keuze ? (r->>'id')) as n
    from jsonb_array_elements(p_regels) r
    where r->>'soort' = 'keuze'
    group by 1
  ) g where g.n <> 1;
  if fout > 0 then return null; end if;
  select coalesce(jsonb_agg(r->>'id' order by i), '[]'::jsonb) into uit
  from jsonb_array_elements(p_regels) with ordinality as t(r, i)
  where r->>'soort' = 'vast' or (r->>'soort' in ('optie', 'keuze') and p_keuze ? (r->>'id'));
  return uit;
end
$$;

-- Tussenstand van de klant bewaren, zodat sales ziet wat er aangeklikt is en
-- een collega van de klant met dezelfde link dezelfde keuze ziet.
create or replace function public.offerte_keuze_bewaren(p_token text, p_keuze jsonb) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  eff jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return false; end if;
  select * into o from public.offertes where token = p_token for update;
  if not found or o.status <> 'verstuurd' then return false; end if;
  eff := public.offerte_effectieve_keuze(o.regels, p_keuze);
  if eff is null then return false; end if;
  update public.offertes set keuze = eff, keuze_at = now() where id = o.id;
  return true;
end
$$;

-- Ondertekenen. Geeft {ok: true, ...} of {ok: false, fout: '<code>'}; de codes
-- staan in src/lib/offertes.ts (ONDERTEKEN_FOUT). De inhoud die getekend
-- wordt, komt uit de database, niet van de klant: de klant stuurt alleen welke
-- regels hij koos.
create or replace function public.offerte_ondertekenen(
  p_token text, p_keuze jsonb, p_naam text, p_functie text, p_email text,
  p_handtekening text, p_ip text default null, p_agent text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  eff jsonb;
  inhoud jsonb;
  hash text;
  nu timestamptz := now();
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.offertes where token = p_token for update;
  if not found or o.status in ('concept', 'ingetrokken') then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
  if o.status = 'afgewezen' then return jsonb_build_object('ok', false, 'fout', 'afgewezen'); end if;
  if o.geldig_tot is not null and o.geldig_tot < (nu at time zone 'Europe/Amsterdam')::date then
    return jsonb_build_object('ok', false, 'fout', 'verlopen');
  end if;

  p_naam := btrim(coalesce(p_naam, ''));
  p_functie := nullif(btrim(coalesce(p_functie, '')), '');
  p_email := lower(btrim(coalesce(p_email, '')));
  if length(p_naam) < 2 or length(p_naam) > 120 then return jsonb_build_object('ok', false, 'fout', 'naam'); end if;
  if length(p_functie) > 120 then return jsonb_build_object('ok', false, 'fout', 'functie'); end if;
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 300000 or length(p_handtekening) < 200 then
    return jsonb_build_object('ok', false, 'fout', 'handtekening');
  end if;
  if jsonb_array_length(o.regels) = 0 then return jsonb_build_object('ok', false, 'fout', 'leeg'); end if;

  eff := public.offerte_effectieve_keuze(o.regels, p_keuze);
  if eff is null then return jsonb_build_object('ok', false, 'fout', 'keuze'); end if;

  -- Wat er getekend is, los van latere wijzigingen. De hash staat ook in de
  -- bevestigingsmail en op de pagina, zodat beide partijen dezelfde versie
  -- kunnen aanwijzen.
  inhoud := jsonb_build_object(
    'nummer', o.nummer, 'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'medewerkers', o.medewerkers,
    'titel', o.titel, 'intro', o.intro, 'regels', o.regels, 'keuze', eff, 'geldig_tot', o.geldig_tot,
    'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email,
    'getekend_naam', p_naam, 'getekend_functie', p_functie, 'getekend_email', p_email,
    'getekend_at', nu
  );
  hash := encode(sha256(convert_to(inhoud::text, 'UTF8')), 'hex');

  update public.offertes set
    status = 'getekend', keuze = eff, keuze_at = nu,
    getekend_at = nu, getekend_naam = p_naam, getekend_functie = p_functie, getekend_email = p_email,
    handtekening = p_handtekening, getekend_ip = left(p_ip, 64), getekend_agent = left(p_agent, 400),
    getekend_inhoud = inhoud, getekend_hash = hash
  where id = o.id;
  insert into public.offerte_gebeurtenissen (offerte_id, soort, door, details)
    values (o.id, 'getekend', p_naam, jsonb_build_object('hash', hash, 'email', p_email, 'functie', p_functie));

  return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer, 'hash', hash, 'getekend_at', nu);
end
$$;

-- Niet akkoord. De reden is optioneel; hij gaat naar sales.
create or replace function public.offerte_afwijzen(p_token text, p_reden text, p_naam text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.offertes where token = p_token for update;
  if not found or o.status in ('concept', 'ingetrokken') then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
  if o.status = 'afgewezen' then return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer); end if;
  p_reden := nullif(left(btrim(coalesce(p_reden, '')), 2000), '');
  p_naam := nullif(left(btrim(coalesce(p_naam, '')), 120), '');
  update public.offertes set status = 'afgewezen', afgewezen_at = now(), afgewezen_reden = p_reden where id = o.id;
  insert into public.offerte_gebeurtenissen (offerte_id, soort, door, details)
    values (o.id, 'afgewezen', p_naam, case when p_reden is null then null else jsonb_build_object('reden', p_reden) end);
  return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer);
end
$$;

revoke execute on function public.offerte_bewaken() from public, anon, authenticated;
revoke execute on function public.offerte_effectieve_keuze(jsonb, jsonb) from public, anon;
grant execute on function public.offerte_effectieve_keuze(jsonb, jsonb) to authenticated;
revoke execute on function public.offerte_bekijken(text, boolean) from public;
revoke execute on function public.offerte_keuze_bewaren(text, jsonb) from public;
revoke execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, text) from public;
revoke execute on function public.offerte_afwijzen(text, text, text) from public;
grant execute on function public.offerte_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.offerte_keuze_bewaren(text, jsonb) to anon, authenticated;
grant execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.offerte_afwijzen(text, text, text) to anon, authenticated;

-- Controle (verwacht: de select als anon geeft een fout of niets, de functie
-- met een fout token null, en de update als beheerder van een getekende
-- offerte een fout):
--   set local role anon; select * from public.offertes; -- permission denied
--   select public.offerte_bekijken('0000000000000000000000000000000000000000000000000000000000000000');  -- null
