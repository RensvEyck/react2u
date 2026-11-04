-- De offerte als contract (29 okt 2026): factuurgegevens, een bevestigingscode
-- per mail vóór het tekenen, en wat het ondertekeningscertificaat in de pdf
-- nodig heeft.
--
-- De code bewijst dat wie tekent het e-mailadres in handen heeft dat in het
-- certificaat komt. Dat bewijs moet de database zelf afdwingen: de functies
-- hieronder zijn met de publieke sleutel aan te roepen, dus een controle
-- alleen in Next zou je met een directe aanroep kunnen overslaan. Daarom:
--
--   - een code vastleggen kan alleen met de sleutel van de server
--     (OFFERTE_SLEUTEL in Vercel; hier staat alleen de sha256 ervan, in
--     offerte_sleutel, buiten git gezet);
--   - de code zelf staat gehasht in offerte_codes, waar niemand bij kan;
--   - ondertekenen vraagt de code en telt de pogingen.
--
-- Uitrollen in deze volgorde: deze migratie (de oude ondertekenfunctie zonder
-- code blijft bestaan, dus wat nu live staat werkt door), dan OFFERTE_SLEUTEL
-- in Vercel en de hash in offerte_sleutel, dan de merge, en pas daarna 0027,
-- die de oude functie weghaalt.

-- ---------------------------------------------------------------------------
-- 1. Factuurgegevens: sales kan ze vooraf invullen, de klant vult aan en
--    bevestigt bij het tekenen. Daarna liggen ze vast (offerte_bewaken).
-- ---------------------------------------------------------------------------
alter table public.offertes
  add column factuur jsonb check (factuur is null or (jsonb_typeof(factuur) = 'object' and length(factuur::text) <= 2000));

comment on column public.offertes.factuur is
  'Factuurgegevens {email, adres, postcode, plaats, kvk?, inkoopnummer?, tav?}: vooraf door sales, bij het tekenen door de klant.';

-- Het versturen van een code komt in de tijdlijn.
alter table public.offerte_gebeurtenissen drop constraint offerte_gebeurtenissen_soort_check;
alter table public.offerte_gebeurtenissen add constraint offerte_gebeurtenissen_soort_check check (soort in (
  'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'code', 'getekend', 'afgewezen', 'ingetrokken', 'heropend'
));

-- ---------------------------------------------------------------------------
-- 2. De sleutel van de server en de codes. Beide zonder policies: alleen de
--    functies hieronder (security definer) komen erbij, ook het beheer niet.
--    Anders zou een collega een code kunnen zetten en zelf "namens de klant"
--    tekenen.
-- ---------------------------------------------------------------------------
create table public.offerte_sleutel (
  id boolean primary key default true check (id),
  hash text not null check (hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.offerte_codes (
  offerte_id uuid primary key references public.offertes(id) on delete cascade,
  email text not null,
  hash text not null,
  verstuurd_at timestamptz not null default now(),
  verloopt_at timestamptz not null,
  pogingen integer not null default 0
);

alter table public.offerte_sleutel enable row level security;
alter table public.offerte_codes enable row level security;
revoke all on public.offerte_sleutel, public.offerte_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Een code vastleggen. Next maakt de code en mailt hem; hier komt alleen
--    de hash, en alleen met de sleutel. Hooguit vijf codes per uur per
--    offerte; een nieuwe code vervangt de vorige.
-- ---------------------------------------------------------------------------
create or replace function public.offerte_code_vastleggen(p_token text, p_email text, p_code text, p_sleutel text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  nu timestamptz := now();
begin
  if p_sleutel is null or not exists (
    select 1 from public.offerte_sleutel where hash = encode(sha256(convert_to(p_sleutel, 'UTF8')), 'hex')
  ) then
    return jsonb_build_object('ok', false, 'fout', 'storing');
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into o from public.offertes where token = p_token for update;
  if not found or o.status in ('concept', 'ingetrokken') then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if o.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;
  if o.status = 'afgewezen' then return jsonb_build_object('ok', false, 'fout', 'afgewezen'); end if;
  if o.geldig_tot is not null and o.geldig_tot < (nu at time zone 'Europe/Amsterdam')::date then
    return jsonb_build_object('ok', false, 'fout', 'verlopen');
  end if;

  p_email := lower(btrim(coalesce(p_email, '')));
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'fout', 'storing'); end if;
  if (
    select count(*) from public.offerte_gebeurtenissen
    where offerte_id = o.id and soort = 'code' and at > nu - interval '1 hour'
  ) >= 5 then
    return jsonb_build_object('ok', false, 'fout', 'code-limiet');
  end if;

  insert into public.offerte_codes as c (offerte_id, email, hash, verstuurd_at, verloopt_at, pogingen)
    values (o.id, p_email, encode(sha256(convert_to(o.id::text || ':' || p_code, 'UTF8')), 'hex'), nu, nu + interval '15 minutes', 0)
    on conflict (offerte_id) do update set
      email = excluded.email, hash = excluded.hash, verstuurd_at = excluded.verstuurd_at,
      verloopt_at = excluded.verloopt_at, pogingen = 0;
  insert into public.offerte_gebeurtenissen (offerte_id, soort, door, details)
    values (o.id, 'code', p_email, jsonb_build_object('email', p_email));

  return jsonb_build_object('ok', true, 'verloopt_at', nu + interval '15 minutes');
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Ondertekenen, nu met code en factuurgegevens. Een nieuwe variant naast
--    die van 0025 (andere argumenten); 0027 haalt de oude weg.
--
--    Eerst alle andere velden, dan pas de code: een tikfout in de postcode
--    kost geen poging. Vijf foute pogingen en de code is op.
--
--    In de vastgelegde versie (en dus in de hash) komen er bij: de
--    factuurgegevens, de hash van de handtekening zelf en hoe het
--    e-mailadres is bevestigd.
-- ---------------------------------------------------------------------------
create or replace function public.offerte_ondertekenen(
  p_token text, p_keuze jsonb, p_naam text, p_functie text, p_email text,
  p_handtekening text, p_code text, p_factuur jsonb, p_ip text default null, p_agent text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  c public.offerte_codes;
  eff jsonb;
  v_factuur jsonb;
  v_inhoud jsonb;
  v_hash text;
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

  -- Factuurgegevens: alleen de bekende velden, schoongemaakt.
  if p_factuur is null or jsonb_typeof(p_factuur) <> 'object' then return jsonb_build_object('ok', false, 'fout', 'factuur'); end if;
  v_factuur := jsonb_strip_nulls(jsonb_build_object(
    'email', lower(nullif(btrim(p_factuur->>'email'), '')),
    'adres', nullif(btrim(p_factuur->>'adres'), ''),
    'postcode', upper(nullif(btrim(p_factuur->>'postcode'), '')),
    'plaats', nullif(btrim(p_factuur->>'plaats'), ''),
    'kvk', nullif(regexp_replace(coalesce(p_factuur->>'kvk', ''), '\s', '', 'g'), ''),
    'inkoopnummer', nullif(btrim(p_factuur->>'inkoopnummer'), ''),
    'tav', nullif(btrim(p_factuur->>'tav'), '')
  ));
  if coalesce(length(v_factuur->>'email'), 0) > 254 or coalesce(v_factuur->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'fout', 'factuur-email');
  end if;
  if coalesce(length(v_factuur->>'adres'), 0) not between 3 and 200
    or coalesce(length(v_factuur->>'postcode'), 0) not between 4 and 12
    or coalesce(length(v_factuur->>'plaats'), 0) not between 2 and 100 then
    return jsonb_build_object('ok', false, 'fout', 'factuur-adres');
  end if;
  if v_factuur ? 'kvk' and v_factuur->>'kvk' !~ '^[0-9]{8}$' then return jsonb_build_object('ok', false, 'fout', 'factuur-kvk'); end if;
  if coalesce(length(v_factuur->>'inkoopnummer'), 0) > 60 or coalesce(length(v_factuur->>'tav'), 0) > 120 then
    return jsonb_build_object('ok', false, 'fout', 'factuur');
  end if;

  eff := public.offerte_effectieve_keuze(o.regels, p_keuze);
  if eff is null then return jsonb_build_object('ok', false, 'fout', 'keuze'); end if;

  -- De code als laatste.
  select * into c from public.offerte_codes where offerte_id = o.id for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'code-nieuw'); end if;
  if c.verloopt_at < nu then return jsonb_build_object('ok', false, 'fout', 'code-verlopen'); end if;
  if c.pogingen >= 5 then return jsonb_build_object('ok', false, 'fout', 'code-pogingen'); end if;
  if c.email <> p_email then return jsonb_build_object('ok', false, 'fout', 'code-email'); end if;
  if c.hash <> encode(sha256(convert_to(o.id::text || ':' || coalesce(btrim(p_code), ''), 'UTF8')), 'hex') then
    update public.offerte_codes set pogingen = pogingen + 1 where offerte_id = o.id;
    return jsonb_build_object('ok', false, 'fout', case when c.pogingen + 1 >= 5 then 'code-pogingen' else 'code' end, 'over', 4 - c.pogingen);
  end if;

  v_inhoud := jsonb_build_object(
    'nummer', o.nummer, 'vorm', o.vorm, 'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'medewerkers', o.medewerkers,
    'titel', o.titel, 'betreft', o.betreft, 'intro', o.intro, 'inhoud', o.inhoud, 'voorwaarden', o.voorwaarden, 'vervolg', o.vervolg,
    'regels', o.regels, 'keuze', eff, 'geldig_tot', o.geldig_tot,
    'afzender_naam', o.afzender_naam, 'afzender_functie', o.afzender_functie, 'afzender_email', o.afzender_email,
    'verstuurd_at', o.verstuurd_at,
    'getekend_naam', p_naam, 'getekend_functie', p_functie, 'getekend_email', p_email,
    'getekend_at', nu,
    'factuur', v_factuur,
    'handtekening_hash', encode(sha256(convert_to(p_handtekening, 'UTF8')), 'hex'),
    'bevestiging', jsonb_build_object('methode', 'e-mailcode', 'email', c.email, 'verstuurd_at', c.verstuurd_at, 'bevestigd_at', nu)
  );
  v_hash := encode(sha256(convert_to(v_inhoud::text, 'UTF8')), 'hex');

  update public.offertes set
    status = 'getekend', keuze = eff, keuze_at = nu, factuur = v_factuur,
    getekend_at = nu, getekend_naam = p_naam, getekend_functie = p_functie, getekend_email = p_email,
    handtekening = p_handtekening, getekend_ip = left(p_ip, 64), getekend_agent = left(p_agent, 400),
    getekend_inhoud = v_inhoud, getekend_hash = v_hash
  where id = o.id;
  delete from public.offerte_codes where offerte_id = o.id;
  insert into public.offerte_gebeurtenissen (offerte_id, soort, door, details)
    values (o.id, 'getekend', p_naam, jsonb_build_object('hash', v_hash, 'email', p_email, 'functie', p_functie, 'bevestigd', true));

  return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer, 'hash', v_hash, 'getekend_at', nu);
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Wat de klant ziet: nu ook de factuurgegevens die sales al invulde.
--    Verder gelijk aan 0025.
-- ---------------------------------------------------------------------------
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
    'id', o.id, 'nummer', o.nummer, 'status', o.status, 'vorm', o.vorm,
    'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'email', o.email, 'medewerkers', o.medewerkers,
    'titel', o.titel, 'betreft', o.betreft, 'intro', o.intro, 'inhoud', o.inhoud, 'voorwaarden', o.voorwaarden,
    'vervolg', o.vervolg, 'regels', o.regels, 'geldig_tot', o.geldig_tot,
    'afzender_naam', o.afzender_naam, 'afzender_functie', o.afzender_functie,
    'afzender_email', o.afzender_email, 'afzender_telefoon', o.afzender_telefoon,
    'verstuurd_at', o.verstuurd_at, 'keuze', o.keuze, 'factuur', o.factuur,
    'getekend_at', o.getekend_at, 'getekend_naam', o.getekend_naam, 'getekend_functie', o.getekend_functie,
    'getekend_email', o.getekend_email, 'handtekening', o.handtekening,
    'getekend_inhoud', o.getekend_inhoud, 'getekend_hash', o.getekend_hash,
    'afgewezen_at', o.afgewezen_at,
    'verlopen', o.geldig_tot is not null and o.geldig_tot < (now() at time zone 'Europe/Amsterdam')::date,
    'eerste_keer', eerste
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Het ondertekeningscertificaat: alleen voor een getekende offerte. Het
--    IP-adres, het apparaat en de tijdlijn vanaf het versturen; van een
--    collega alleen aan wie hij verstuurde, niet wie hij is.
-- ---------------------------------------------------------------------------
create or replace function public.offerte_certificaat(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  o public.offertes;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into o from public.offertes where token = p_token;
  if not found or o.status <> 'getekend' then return null; end if;
  return jsonb_build_object(
    'ip', o.getekend_ip,
    'agent', o.getekend_agent,
    'aantal_bekeken', o.aantal_bekeken,
    'tijdlijn', coalesce((
      select jsonb_agg(jsonb_build_object(
        'soort', g.soort,
        'at', g.at,
        'wie', case when g.soort in ('code', 'getekend') then g.door when g.soort in ('verstuurd', 'herinnering') then g.details->>'aan' end
      ) order by g.at, g.id)
      from public.offerte_gebeurtenissen g
      where g.offerte_id = o.id and g.soort in ('verstuurd', 'herinnering', 'bekeken', 'code', 'getekend')
    ), '[]'::jsonb)
  );
end
$$;

revoke execute on function public.offerte_code_vastleggen(text, text, text, text) from public;
revoke execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, jsonb, text, text) from public;
revoke execute on function public.offerte_certificaat(text) from public;
revoke execute on function public.offerte_bekijken(text, boolean) from public;
grant execute on function public.offerte_code_vastleggen(text, text, text, text) to anon, authenticated;
grant execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.offerte_certificaat(text) to anon, authenticated;
grant execute on function public.offerte_bekijken(text, boolean) to anon, authenticated;
