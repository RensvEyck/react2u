-- Onboarding, tweede ronde (Rens, 16 nov 2026: "maak het perfect"):
--
-- 1. onboarding_machtigingen: de machtiging voor de overdracht van een
--    verzuimdossier tekent de werknemer voortaan online. De werkgever vult op
--    zijn onboardingpagina naam en e-mailadres van elke medewerker met een
--    lopend dossier in; die krijgt een persoonlijke link (/machtiging/<token>),
--    vult zijn eigen gegevens in en tekent op zijn telefoon. Dezelfde opzet als
--    het tekenen van een contract (0031): de handtekening als PNG, een
--    momentopname van wat er getekend is met een hash, IP-adres en apparaat.
--    Papier blijft mogelijk (de pdf), voor wie dat liever heeft.
--    Het proces (Rens, spraakbericht 16 nov 2026): de werknemer tekent, de
--    WERKGEVER stuurt de getekende machtigingen met de opdracht tot overdracht
--    naar de latende arbodienst, en die stuurt React2u een lijst van de
--    dossiers die wij kunnen verwachten. Daarom krijgt de werkgever de getekende
--    machtigingen terug (onboarding_machtigingen_getekend) en een opdrachtbrief
--    die hij met één knop verstuurt (onboarding_overdracht_versturen,
--    overdracht_at per machtiging).
-- 2. onboardings.casemanager: de vaste casemanager die React2u koppelt; staat
--    op de klantpagina en in de mail "jullie zijn live".
-- 3. onboarding_bekijken geeft de klant nu ook wat React2u al regelde (taken,
--    alleen het moment), de casemanager en de stand van de machtigingen: de
--    klantpagina vertelt zo live hoe ver wij zijn.
-- 4. Nieuwe gebeurtenissen: machtiging (uitgenodigd, opnieuw, verwijderd,
--    bekeken, getekend), doorgestuurd (een stap naar een collega), live (de
--    mail "jullie zijn live"). Een automatische herinnering is een gewone
--    'herinnering' met details.automatisch = true (api/cron/onboarding).
--
-- Privacy: een machtiging bevat het BSN en adres van de werknemer. Alleen
-- achter has_perm('bellijst'), nooit terug naar de werkgever (die ziet alleen
-- naam, e-mail en de status), en weg met de onboarding (cascade, een jaar na
-- de laatste activiteit).
--
-- VOLGORDE: na 0037.

alter table public.onboardings add column casemanager text check (length(casemanager) <= 200);

alter table public.onboarding_gebeurtenissen drop constraint onboarding_gebeurtenissen_soort_check;
alter table public.onboarding_gebeurtenissen add constraint onboarding_gebeurtenissen_soort_check check (soort in (
  'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'ingevuld', 'gelezen', 'afgerond', 'ingetrokken', 'heropend', 'gewist', 'taak',
  'machtiging', 'doorgestuurd', 'live'
));
drop policy "bellijst schrijft onboardingtijdlijn" on public.onboarding_gebeurtenissen;
create policy "bellijst schrijft onboardingtijdlijn" on public.onboarding_gebeurtenissen
  for insert to authenticated with check (
    public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'afgerond', 'ingetrokken', 'heropend', 'gewist', 'taak', 'live')
  );

create table public.onboarding_machtigingen (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.onboardings(id) on delete cascade,
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'open' check (status in ('open', 'getekend')),

  -- Wat de werkgever invult.
  naam text not null check (length(btrim(naam)) between 2 and 120),
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- Wat de werknemer invult en tekent.
  gegevens jsonb check (gegevens is null or jsonb_typeof(gegevens) = 'object'),
  handtekening text check (handtekening is null or (handtekening like 'data:image/png;base64,%' and length(handtekening) <= 300000)),
  getekend_at timestamptz,
  getekend_ip text check (length(getekend_ip) <= 64),
  getekend_agent text check (length(getekend_agent) <= 400),
  getekend_inhoud jsonb,
  getekend_hash text check (getekend_hash is null or getekend_hash ~ '^[a-f0-9]{64}$'),

  uitgenodigd_at timestamptz not null default now(),
  herinnerd_at timestamptz,
  -- Wanneer deze machtiging met de opdracht tot overdracht naar de vorige arbodienst ging.
  overdracht_at timestamptz,
  bekeken_at timestamptz,
  aantal_bekeken integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onboarding_machtigingen_onboarding on public.onboarding_machtigingen (onboarding_id, created_at);
create unique index onboarding_machtigingen_email on public.onboarding_machtigingen (onboarding_id, lower(email));

create trigger onboarding_machtigingen_updated before update on public.onboarding_machtigingen
  for each row execute function public.set_updated_at();

alter table public.onboarding_machtigingen enable row level security;
revoke all on public.onboarding_machtigingen from anon;
-- Het beheer leest mee (de getekende pdf, de stand voor het opvragen van dossiers); schrijven doen alleen de functies.
create policy "bellijst leest machtigingen" on public.onboarding_machtigingen
  for select to authenticated using (public.has_perm('bellijst'));

-- Hooguit honderd machtigingen per onboarding; de werkgever nodigt uit, of nodigt opnieuw uit.
create or replace function public.onboarding_machtiging_uitnodigen(p_token text, p_naam text, p_email text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
  m public.onboarding_machtigingen;
  nu timestamptz := now();
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if not ('machtiging' = any(o.invullen)) then return jsonb_build_object('ok', false, 'fout', 'document'); end if;
  if not (o.antwoorden ? 'machtiging') then return jsonb_build_object('ok', false, 'fout', 'arbodienst'); end if;

  p_naam := left(btrim(coalesce(p_naam, '')), 120);
  p_email := lower(btrim(coalesce(p_email, '')));
  if length(p_naam) < 2 then return jsonb_build_object('ok', false, 'fout', 'naam'); end if;
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;

  select * into m from public.onboarding_machtigingen where onboarding_id = o.id and lower(email) = p_email for update;
  if found then
    if m.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
    -- Opnieuw uitnodigen: dezelfde link, hooguit één keer per uur.
    if coalesce(m.herinnerd_at, m.uitgenodigd_at) > nu - interval '1 hour' then return jsonb_build_object('ok', false, 'fout', 'net-verstuurd'); end if;
    update public.onboarding_machtigingen set naam = p_naam, herinnerd_at = nu where id = m.id;
    insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
      values (o.id, 'machtiging', jsonb_build_object('actie', 'opnieuw', 'naam', p_naam, 'email', p_email));
    return jsonb_build_object('ok', true, 'id', m.id, 'mtoken', m.token, 'opnieuw', true);
  end if;

  if (select count(*) from public.onboarding_machtigingen where onboarding_id = o.id) >= 100 then
    return jsonb_build_object('ok', false, 'fout', 'limiet');
  end if;
  insert into public.onboarding_machtigingen (onboarding_id, naam, email) values (o.id, p_naam, p_email) returning * into m;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
    values (o.id, 'machtiging', jsonb_build_object('actie', 'uitgenodigd', 'naam', p_naam, 'email', p_email));
  return jsonb_build_object('ok', true, 'id', m.id, 'mtoken', m.token, 'opnieuw', false);
end
$$;

-- Een uitnodiging weghalen, zolang er niet getekend is.
create or replace function public.onboarding_machtiging_verwijderen(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
  m public.onboarding_machtigingen;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  select * into m from public.onboarding_machtigingen where id = p_id and onboarding_id = o.id for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if m.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
  delete from public.onboarding_machtigingen where id = m.id;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
    values (o.id, 'machtiging', jsonb_build_object('actie', 'verwijderd', 'naam', m.naam, 'email', m.email));
  return jsonb_build_object('ok', true);
end
$$;

-- De getekende machtigingen voor de werkgever (zijn onboardinglink is de
-- sleutel): wat hij nodig heeft om ze, met de opdracht tot overdracht, naar
-- de vorige arbodienst te sturen. Alleen getekende, met gegevens en
-- handtekening; p_id beperkt tot één.
create or replace function public.onboarding_machtigingen_getekend(p_token text, p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  o public.onboardings;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into o from public.onboardings where token = p_token;
  if not found or o.status not in ('verstuurd', 'afgerond') then return null; end if;
  return jsonb_build_object(
    'nummer', o.nummer, 'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'email', o.email,
    'arbodienst', coalesce(o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'machtigingen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'naam', m.naam, 'email', m.email, 'gegevens', m.gegevens, 'handtekening', m.handtekening,
        'getekend_at', m.getekend_at, 'getekend_hash', m.getekend_hash, 'getekend_ip', m.getekend_ip, 'uitgenodigd_at', m.uitgenodigd_at,
        'overdracht_at', m.overdracht_at
      ) order by m.getekend_at)
      from public.onboarding_machtigingen m
      where m.onboarding_id = o.id and m.status = 'getekend' and (p_id is null or m.id = p_id)
    ), '[]'::jsonb)
  );
end
$$;

-- De werkgever verstuurt de opdracht tot overdracht: alle getekende
-- machtigingen die nog niet meegingen krijgen een moment, en het staat in de
-- tijdlijn. Next maakt de brief en de mail. Hooguit tien keer per dag.
create or replace function public.onboarding_overdracht_versturen(p_token text, p_aan text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
  v_ids uuid[];
  nu timestamptz := now();
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  p_aan := lower(btrim(coalesce(p_aan, '')));
  if length(p_aan) > 254 or p_aan !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if (select count(*) from public.onboarding_gebeurtenissen where onboarding_id = o.id and soort = 'machtiging' and details->>'actie' = 'overdracht' and at > nu - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'fout', 'limiet');
  end if;
  select coalesce(array_agg(id), '{}') into v_ids from public.onboarding_machtigingen where onboarding_id = o.id and status = 'getekend';
  if cardinality(v_ids) = 0 then return jsonb_build_object('ok', false, 'fout', 'geen-getekend'); end if;
  update public.onboarding_machtigingen set overdracht_at = nu where id = any(v_ids);
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
    values (o.id, 'machtiging', jsonb_build_object('actie', 'overdracht', 'email', p_aan, 'aantal', cardinality(v_ids)));
  return jsonb_build_object('ok', true, 'aantal', cardinality(v_ids), 'nummer', o.nummer, 'bedrijf', o.bedrijf);
end
$$;

-- De werknemer haalt zijn eigen getekende machtiging op (de pdf na het tekenen).
create or replace function public.onboarding_machtiging_getekend(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  m public.onboarding_machtigingen;
  o public.onboardings;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into m from public.onboarding_machtigingen where token = p_token;
  if not found or m.status <> 'getekend' then return null; end if;
  select * into o from public.onboardings where id = m.onboarding_id;
  return jsonb_build_object(
    'nummer', o.nummer, 'bedrijf', o.bedrijf, 'arbodienst', coalesce(o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'machtigingen', jsonb_build_array(jsonb_build_object(
      'id', m.id, 'naam', m.naam, 'email', m.email, 'gegevens', m.gegevens, 'handtekening', m.handtekening,
      'getekend_at', m.getekend_at, 'getekend_hash', m.getekend_hash, 'getekend_ip', m.getekend_ip, 'uitgenodigd_at', m.uitgenodigd_at,
      'overdracht_at', m.overdracht_at
    ))
  );
end
$$;

-- Wat de werknemer op /machtiging/<token> ziet. Null voor een onbekende link.
-- De gegevens van de vorige arbodienst komen uit het antwoord van de werkgever.
create or replace function public.onboarding_machtiging_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  m public.onboarding_machtigingen;
  o public.onboardings;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into m from public.onboarding_machtigingen where token = p_token;
  if not found then return null; end if;
  select * into o from public.onboardings where id = m.onboarding_id;
  if o.status not in ('verstuurd', 'afgerond') then
    return jsonb_build_object('status', 'gesloten', 'bedrijf', o.bedrijf, 'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon);
  end if;
  if p_tel and m.status = 'open' then
    update public.onboarding_machtigingen
      set bekeken_at = coalesce(bekeken_at, now()),
          aantal_bekeken = aantal_bekeken + 1
      where id = m.id;
    if m.bekeken_at is null then
      insert into public.onboarding_gebeurtenissen (onboarding_id, soort, details)
        values (o.id, 'machtiging', jsonb_build_object('actie', 'bekeken', 'naam', m.naam, 'email', m.email));
    end if;
  end if;
  return jsonb_build_object(
    'id', m.id, 'status', m.status, 'naam', m.naam, 'email', m.email,
    'bedrijf', o.bedrijf, 'nummer', o.nummer,
    'arbodienst', coalesce(o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'uitgenodigd_at', m.uitgenodigd_at, 'getekend_at', m.getekend_at,
    'getekend_naam', m.gegevens->>'naam', 'getekend_plaats', m.gegevens->>'plaats', 'getekend_hash', m.getekend_hash
  );
end
$$;

-- De werknemer tekent. Next controleert de vorm van de gegevens (elfproef,
-- datum); hier de grenzen, en de momentopname met hash, zoals bij een contract.
create or replace function public.onboarding_machtiging_tekenen(p_token text, p_gegevens jsonb, p_handtekening text, p_ip text default null, p_agent text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  m public.onboarding_machtigingen;
  o public.onboardings;
  g jsonb;
  v_inhoud jsonb;
  v_hash text;
  nu timestamptz := now();
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into m from public.onboarding_machtigingen where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if m.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
  select * into o from public.onboardings where id = m.onboarding_id;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if p_gegevens is null or jsonb_typeof(p_gegevens) <> 'object' then return jsonb_build_object('ok', false, 'fout', 'invoer'); end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 300000 or length(p_handtekening) < 200 then
    return jsonb_build_object('ok', false, 'fout', 'handtekening');
  end if;

  g := jsonb_strip_nulls(jsonb_build_object(
    'naam', left(nullif(btrim(p_gegevens->>'naam'), ''), 120),
    'adres', left(nullif(btrim(p_gegevens->>'adres'), ''), 200),
    'postcode', upper(left(nullif(btrim(p_gegevens->>'postcode'), ''), 12)),
    'plaats', left(nullif(btrim(p_gegevens->>'plaats'), ''), 100),
    'geboortedatum', nullif(btrim(p_gegevens->>'geboortedatum'), ''),
    'bsn', nullif(regexp_replace(coalesce(p_gegevens->>'bsn', ''), '\D', '', 'g'), ''),
    'telefoon', left(nullif(btrim(p_gegevens->>'telefoon'), ''), 40)
  ));
  if coalesce(length(g->>'naam'), 0) < 2 then return jsonb_build_object('ok', false, 'fout', 'naam'); end if;
  if coalesce(length(g->>'adres'), 0) < 3 or coalesce(length(g->>'postcode'), 0) < 4 or coalesce(length(g->>'plaats'), 0) < 2 then
    return jsonb_build_object('ok', false, 'fout', 'adres');
  end if;
  if coalesce(g->>'geboortedatum', '') !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('ok', false, 'fout', 'geboortedatum'); end if;
  if coalesce(g->>'bsn', '') !~ '^\d{8,9}$' then return jsonb_build_object('ok', false, 'fout', 'bsn'); end if;

  v_inhoud := jsonb_build_object(
    'nummer', o.nummer, 'bedrijf', o.bedrijf,
    'arbodienst', coalesce(o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'werknemer', g, 'email', m.email, 'uitgenodigd_at', m.uitgenodigd_at,
    'getekend_at', nu,
    'handtekening_hash', encode(sha256(convert_to(p_handtekening, 'UTF8')), 'hex')
  );
  v_hash := encode(sha256(convert_to(v_inhoud::text, 'UTF8')), 'hex');

  update public.onboarding_machtigingen set
    status = 'getekend', gegevens = g, handtekening = p_handtekening,
    getekend_at = nu, getekend_ip = left(p_ip, 64), getekend_agent = left(p_agent, 400),
    getekend_inhoud = v_inhoud, getekend_hash = v_hash
  where id = m.id;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, door, details)
    values (o.id, 'machtiging', g->>'naam', jsonb_build_object('actie', 'getekend', 'naam', g->>'naam', 'email', m.email, 'hash', v_hash));
  return jsonb_build_object('ok', true, 'id', m.id, 'onboarding_id', o.id, 'hash', v_hash, 'getekend_at', nu);
end
$$;

-- Een stap doorsturen naar een collega: alleen de gebeurtenis, de mail stuurt
-- Next. Hooguit twintig per dag per onboarding.
create or replace function public.onboarding_doorsturen(p_token text, p_stap text, p_naam text, p_email text, p_van text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.onboardings;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.onboardings where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if o.status not in ('verstuurd', 'afgerond') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if p_stap is null or not (p_stap = any(o.documenten)) then return jsonb_build_object('ok', false, 'fout', 'document'); end if;
  p_email := lower(btrim(coalesce(p_email, '')));
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if (select count(*) from public.onboarding_gebeurtenissen where onboarding_id = o.id and soort = 'doorgestuurd' and at > now() - interval '1 day') >= 20 then
    return jsonb_build_object('ok', false, 'fout', 'limiet');
  end if;
  insert into public.onboarding_gebeurtenissen (onboarding_id, soort, door, details)
    values (o.id, 'doorgestuurd', left(nullif(btrim(p_van), ''), 120), jsonb_build_object('stap', p_stap, 'naam', left(btrim(coalesce(p_naam, '')), 120), 'email', p_email));
  return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer, 'bedrijf', o.bedrijf);
end
$$;

-- onboarding_opslaan en onboarding_gelezen geven nu ook het e-mailadres van de
-- klant en de contactpersoon terug (alleen aan de server action, voor de
-- bevestigingsmail "ontvangen" en "jullie deel is klaar"); de pagina krijgt ze
-- niet. Verder ongewijzigd ten opzichte van 0037.
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

  return jsonb_build_object('ok', true, 'eerste', eerste, 'afgerond', public.onboarding_afronden(o.id), 'email', o.email, 'contactpersoon', o.contactpersoon);
end
$$;

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
  return jsonb_build_object('ok', true, 'afgerond', public.onboarding_afronden(o.id), 'email', o.email, 'contactpersoon', o.contactpersoon);
end
$$;

-- onboarding_bekijken: nu ook de taken van React2u (alleen het moment), de
-- casemanager en de stand van de machtigingen (nooit de gegevens of de
-- handtekening van de werknemer).
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
    'taken', coalesce((select jsonb_object_agg(t.key, jsonb_build_object('at', t.value->'at')) from jsonb_each(o.taken) t), '{}'::jsonb),
    'casemanager', o.casemanager,
    'machtigingen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'naam', m.naam, 'email', m.email, 'status', m.status,
        'uitgenodigd_at', m.uitgenodigd_at, 'herinnerd_at', m.herinnerd_at, 'bekeken_at', m.bekeken_at, 'getekend_at', m.getekend_at,
        'overdracht_at', m.overdracht_at
      ) order by m.created_at)
      from public.onboarding_machtigingen m where m.onboarding_id = o.id
    ), '[]'::jsonb),
    'afzender_naam', o.afzender_naam, 'afzender_functie', o.afzender_functie,
    'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'verstuurd_at', o.verstuurd_at, 'afgerond_at', o.afgerond_at, 'created_at', o.created_at,
    'eerste_keer', eerste
  );
end
$$;

revoke execute on function public.onboarding_machtiging_uitnodigen(text, text, text) from public;
revoke execute on function public.onboarding_machtiging_verwijderen(text, uuid) from public;
revoke execute on function public.onboarding_machtiging_bekijken(text, boolean) from public;
revoke execute on function public.onboarding_machtiging_tekenen(text, jsonb, text, text, text) from public;
revoke execute on function public.onboarding_doorsturen(text, text, text, text, text) from public;
revoke execute on function public.onboarding_machtigingen_getekend(text, uuid) from public;
revoke execute on function public.onboarding_overdracht_versturen(text, text) from public;
revoke execute on function public.onboarding_machtiging_getekend(text) from public;
grant execute on function public.onboarding_machtigingen_getekend(text, uuid) to anon, authenticated;
grant execute on function public.onboarding_overdracht_versturen(text, text) to anon, authenticated;
grant execute on function public.onboarding_machtiging_getekend(text) to anon, authenticated;
grant execute on function public.onboarding_machtiging_uitnodigen(text, text, text) to anon, authenticated;
grant execute on function public.onboarding_machtiging_verwijderen(text, uuid) to anon, authenticated;
grant execute on function public.onboarding_machtiging_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.onboarding_machtiging_tekenen(text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.onboarding_doorsturen(text, text, text, text, text) to anon, authenticated;
