-- Onboarding, derde ronde (Rens, 16 nov 2026): "onboarding moet 1 feature zijn in de
-- zijbalk, werknemer gedeelte moet de machtiging zijn en moet ondertekend kunnen
-- worden met ip registratie; werkgever moet de gehele onboarding zijn zonder doc
-- van arbo naar arbo".
--
-- De machtiging (van arbo naar arbo) gaat uit de onboarding van de werkgever:
-- dat deel heet in het beheer "Werknemer" en loopt vanuit React2u. React2u vult
-- de vorige arbodienst in (onboardings.vorige_arbodienst), nodigt de werknemers
-- uit (met hun e-mailadres, ook te kiezen uit het werknemersbestand), die tekenen
-- online met IP-registratie (0038: getekend_ip, getekend_agent, hash), en
-- React2u verstuurt namens de werkgever de opdracht tot overdracht naar de
-- vorige arbodienst. De functies van 0038 lezen de vorige arbodienst daarom uit
-- de nieuwe kolom; het antwoord van de klant (het oude document) blijft als
-- terugval, voor onboardings van vóór deze migratie.
--
-- VOLGORDE: na 0038.

alter table public.onboardings add column vorige_arbodienst jsonb check (vorige_arbodienst is null or jsonb_typeof(vorige_arbodienst) = 'object');

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
  -- De vorige arbodienst vult React2u in (0039); de oude weg via het document van de klant blijft werken.
  if o.vorige_arbodienst is null and not (o.antwoorden ? 'machtiging') then return jsonb_build_object('ok', false, 'fout', 'arbodienst'); end if;

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
    'arbodienst', coalesce(o.vorige_arbodienst, o.antwoorden->'machtiging'->'data', '{}'::jsonb),
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
    'nummer', o.nummer, 'bedrijf', o.bedrijf, 'arbodienst', coalesce(o.vorige_arbodienst, o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'machtigingen', jsonb_build_array(jsonb_build_object(
      'id', m.id, 'naam', m.naam, 'email', m.email, 'gegevens', m.gegevens, 'handtekening', m.handtekening,
      'getekend_at', m.getekend_at, 'getekend_hash', m.getekend_hash, 'getekend_ip', m.getekend_ip, 'uitgenodigd_at', m.uitgenodigd_at,
      'overdracht_at', m.overdracht_at
    ))
  );
end
$$;

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
    'arbodienst', coalesce(o.vorige_arbodienst, o.antwoorden->'machtiging'->'data', '{}'::jsonb),
    'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'uitgenodigd_at', m.uitgenodigd_at, 'getekend_at', m.getekend_at,
    'getekend_naam', m.gegevens->>'naam', 'getekend_plaats', m.gegevens->>'plaats', 'getekend_hash', m.getekend_hash
  );
end
$$;

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
    'arbodienst', coalesce(o.vorige_arbodienst, o.antwoorden->'machtiging'->'data', '{}'::jsonb),
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
    'vorige_arbodienst', o.vorige_arbodienst,
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
