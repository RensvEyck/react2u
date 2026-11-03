-- Contracten (/admin/contracten): het Basiscontract Arbodienstverlening dat de
-- Arbowet sinds 1 juli 2017 vraagt, op dezelfde manier als een offerte (Rens,
-- 3 nov 2026: "deze moet op dezelfde wijze worden ingebouwd in de admin zoals we
-- de offerte versturen en in nieuwe stijl"). Sales maakt het contract, stuurt
-- een link (/contract/<token>), en de klant leest het, vult de gegevens van zijn
-- organisatie in en tekent online met een code per mail.
--
-- - contracten: één rij per contract. `tekst` is de volledige contracttekst
--   (overwegingen en artikelen, opmaak in src/lib/contractTekst.ts), bij het
--   aanmaken overgenomen uit de standaard. Zo verandert een verstuurd contract
--   niet als de standaard later wijzigt, en kan de database bij het tekenen
--   precies vastleggen wat er getekend is.
-- - opdrachtnemer: React2u zoals in de kop van het contract (naam, adres, KvK,
--   wie tekent), bij het opslaan door het beheer uit Instellingen gezet.
-- - opdrachtgever: de klant zoals in de kop van het contract (statutaire naam,
--   adres, KvK). Sales kan het vooraf invullen, de klant vult aan en bevestigt
--   bij het tekenen.
-- - contract_gebeurtenissen: de tijdlijn; contract_codes: de bevestigingscodes.
--
-- Rechten en bewijs zoals bij offertes (0024, 0026): alles achter
-- has_perm('bellijst'); de klant komt alleen via de functies hieronder met het
-- token als sleutel; alleen de klant tekent (trigger contract_bewaken); een
-- code vastleggen kan alleen met de sleutel van de server (OFFERTE_SLEUTEL,
-- dezelfde als voor offertes: de hash staat al in offerte_sleutel); bij het
-- tekenen legt de database de inhoud vast met een sha-256.
--
-- Nummering: C2026-0001, C2026-0002, ...
--
-- VOLGORDE: na 0030. Kan vóór of na de code: zonder deze migratie meldt
-- /admin/contracten dat, en geeft /contract/<token> een 404.
--
-- Registreren: via apply_migration (naam 0031_contracten) vanzelf.

create sequence public.contract_nummer_seq;

create table public.contracten (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique default (
    'C' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('public.contract_nummer_seq')::text, 4, '0')
  ),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'getekend', 'ingetrokken')),

  -- De klant: aan wie het contract gaat.
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),

  -- De partijen zoals in de kop van het contract.
  opdrachtnemer jsonb not null default '{}' check (jsonb_typeof(opdrachtnemer) = 'object' and length(opdrachtnemer::text) <= 2000),
  opdrachtgever jsonb check (opdrachtgever is null or (jsonb_typeof(opdrachtgever) = 'object' and length(opdrachtgever::text) <= 2000)),

  -- Wat er is afgesproken: de offerte (overweging D), de looptijd (artikel 1)
  -- en de tekst zelf, met eventueel aanvullende afspraken.
  offerte_id uuid references public.offertes(id) on delete set null,
  offerte_kenmerk text check (length(offerte_kenmerk) <= 200),
  ingangsdatum date not null,
  einddatum date not null,
  tekst text not null check (length(tekst) between 100 and 60000),
  tekst_versie text check (length(tekst_versie) <= 40),
  aanvullend text check (length(aanvullend) <= 5000),
  constraint contracten_looptijd check (einddatum > ingangsdatum),

  -- Wie het stuurt: staat op de pagina als contactpersoon, en krijgt de meldingen.
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
  getekend_at timestamptz,
  getekend_naam text,
  getekend_functie text,
  getekend_email text,
  getekend_plaats text,
  handtekening text check (handtekening is null or (handtekening like 'data:image/png;base64,%' and length(handtekening) <= 300000)),
  -- Bewijs van de ondertekening, zoals bij offertes: IP en browser van dat ene
  -- moment, de vastgelegde inhoud en de sha-256 daarvan.
  getekend_ip text,
  getekend_agent text,
  getekend_inhoud jsonb,
  getekend_hash text
);
create index contracten_status on public.contracten (status, created_at desc);
create index contracten_offerte on public.contracten (offerte_id) where offerte_id is not null;

create table public.contract_gebeurtenissen (
  id bigint generated always as identity primary key,
  contract_id uuid not null references public.contracten(id) on delete cascade,
  soort text not null check (soort in (
    'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'code', 'getekend', 'ingetrokken', 'heropend'
  )),
  -- E-mailadres van de collega, of de naam van wie tekende.
  door text,
  details jsonb,
  at timestamptz not null default now()
);
create index contract_gebeurtenissen_contract on public.contract_gebeurtenissen (contract_id, at desc);

-- De bevestigingscodes: zonder policies, net als offerte_codes (0026). Alleen
-- de functies hieronder komen erbij; anders kon een collega een code zetten en
-- "namens de klant" tekenen.
create table public.contract_codes (
  contract_id uuid primary key references public.contracten(id) on delete cascade,
  email text not null,
  hash text not null,
  verstuurd_at timestamptz not null default now(),
  verloopt_at timestamptz not null,
  pogingen integer not null default 0
);

create trigger contracten_updated before update on public.contracten
  for each row execute function public.set_updated_at();

alter table public.contracten enable row level security;
alter table public.contract_gebeurtenissen enable row level security;
alter table public.contract_codes enable row level security;
revoke all on public.contracten, public.contract_gebeurtenissen from anon;
revoke all on public.contract_codes from anon, authenticated;
revoke all on sequence public.contract_nummer_seq from anon;
grant usage on sequence public.contract_nummer_seq to authenticated;

create policy "bellijst beheert contracten" on public.contracten
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst leest contracttijdlijn" on public.contract_gebeurtenissen
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft contracttijdlijn" on public.contract_gebeurtenissen
  for insert to authenticated with check (public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'ingetrokken', 'heropend'));

-- ---------------------------------------------------------------------------
-- Bewaken: alleen de klant tekent, en getekend is getekend (zoals
-- offerte_bewaken in 0024). Via de API mag het beheer de klantvelden niet
-- zetten en een getekend contract niet wijzigen of verwijderen; de interne
-- notitie blijft bewerkbaar.
-- ---------------------------------------------------------------------------
create or replace function public.contract_bewaken() returns trigger
language plpgsql set search_path = public
as $$
declare
  via_api boolean := current_user in ('authenticated', 'anon');
  vrij constant text[] := array['notitie', 'updated_at', 'bekeken_at', 'laatst_bekeken_at', 'aantal_bekeken'];
begin
  if tg_op = 'DELETE' then
    if old.status = 'getekend' then
      raise exception 'Een getekend contract kan niet worden verwijderd' using errcode = 'P0001', hint = 'contract-getekend';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status = 'getekend' then
    if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij) then
      raise exception 'Een getekend contract kan niet meer worden gewijzigd' using errcode = 'P0001', hint = 'contract-getekend';
    end if;
    if via_api then
      new.bekeken_at := old.bekeken_at;
      new.laatst_bekeken_at := old.laatst_bekeken_at;
      new.aantal_bekeken := old.aantal_bekeken;
    end if;
    return new;
  end if;

  if via_api then
    if new.status = 'getekend' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Alleen de klant kan tekenen' using errcode = 'P0001', hint = 'contract-klant';
    end if;
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
      new.getekend_at := null; new.getekend_naam := null; new.getekend_functie := null; new.getekend_email := null;
      new.getekend_plaats := null; new.handtekening := null; new.getekend_ip := null; new.getekend_agent := null;
      new.getekend_inhoud := null; new.getekend_hash := null;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.getekend_at := old.getekend_at; new.getekend_naam := old.getekend_naam; new.getekend_functie := old.getekend_functie;
      new.getekend_email := old.getekend_email; new.getekend_plaats := old.getekend_plaats; new.handtekening := old.handtekening;
      new.getekend_ip := old.getekend_ip; new.getekend_agent := old.getekend_agent;
      new.getekend_inhoud := old.getekend_inhoud; new.getekend_hash := old.getekend_hash;
      new.nummer := old.nummer;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

create trigger contract_bewaken
  before insert or update or delete on public.contracten
  for each row execute function public.contract_bewaken();

-- ---------------------------------------------------------------------------
-- De publieke kant: vier functies, elk met het token als sleutel.
-- ---------------------------------------------------------------------------

-- Wat de klant van een contract te zien krijgt. Null voor een concept of een
-- onbekend token (404); een ingetrokken contract geeft alleen de status en de
-- contactpersoon. Met p_tel telt het bezoek mee; eerste_keer zegt of dit het
-- allereerste bezoek was (voor de melding aan de afzender).
create or replace function public.contract_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c public.contracten;
  eerste boolean := false;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into c from public.contracten where token = p_token;
  if not found or c.status = 'concept' then return null; end if;

  if c.status = 'ingetrokken' then
    return jsonb_build_object(
      'status', c.status, 'nummer', c.nummer, 'bedrijf', c.bedrijf,
      'afzender_naam', c.afzender_naam, 'afzender_email', c.afzender_email, 'afzender_telefoon', c.afzender_telefoon
    );
  end if;

  if p_tel then
    update public.contracten set bekeken_at = now() where id = c.id and bekeken_at is null returning true into eerste;
    eerste := coalesce(eerste, false);
    update public.contracten set laatst_bekeken_at = now(), aantal_bekeken = aantal_bekeken + 1 where id = c.id;
    if not exists (
      select 1 from public.contract_gebeurtenissen
      where contract_id = c.id and soort = 'bekeken' and at > now() - interval '30 minutes'
    ) then
      insert into public.contract_gebeurtenissen (contract_id, soort) values (c.id, 'bekeken');
    end if;
  end if;

  return jsonb_build_object(
    'id', c.id, 'nummer', c.nummer, 'status', c.status,
    'bedrijf', c.bedrijf, 'contactpersoon', c.contactpersoon, 'email', c.email,
    'opdrachtnemer', c.opdrachtnemer, 'opdrachtgever', c.opdrachtgever,
    'offerte_kenmerk', c.offerte_kenmerk, 'ingangsdatum', c.ingangsdatum, 'einddatum', c.einddatum,
    'tekst', c.tekst, 'tekst_versie', c.tekst_versie, 'aanvullend', c.aanvullend,
    'afzender_naam', c.afzender_naam, 'afzender_functie', c.afzender_functie,
    'afzender_email', c.afzender_email, 'afzender_telefoon', c.afzender_telefoon,
    'verstuurd_at', c.verstuurd_at, 'created_at', c.created_at,
    'getekend_at', c.getekend_at, 'getekend_naam', c.getekend_naam, 'getekend_functie', c.getekend_functie,
    'getekend_email', c.getekend_email, 'getekend_plaats', c.getekend_plaats, 'handtekening', c.handtekening,
    'getekend_inhoud', c.getekend_inhoud, 'getekend_hash', c.getekend_hash,
    'eerste_keer', eerste
  );
end
$$;

-- Een code vastleggen, zoals offerte_code_vastleggen (0026): Next maakt de code
-- en mailt hem, hier komt alleen de hash, en alleen met de sleutel van de
-- server. Hooguit vijf codes per uur per contract.
create or replace function public.contract_code_vastleggen(p_token text, p_email text, p_code text, p_sleutel text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c public.contracten;
  nu timestamptz := now();
begin
  if p_sleutel is null or not exists (
    select 1 from public.offerte_sleutel where hash = encode(sha256(convert_to(p_sleutel, 'UTF8')), 'hex')
  ) then
    return jsonb_build_object('ok', false, 'fout', 'storing');
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into c from public.contracten where token = p_token for update;
  if not found or c.status in ('concept', 'ingetrokken') then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if c.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;

  p_email := lower(btrim(coalesce(p_email, '')));
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'fout', 'storing'); end if;
  if (
    select count(*) from public.contract_gebeurtenissen
    where contract_id = c.id and soort = 'code' and at > nu - interval '1 hour'
  ) >= 5 then
    return jsonb_build_object('ok', false, 'fout', 'code-limiet');
  end if;

  insert into public.contract_codes as k (contract_id, email, hash, verstuurd_at, verloopt_at, pogingen)
    values (c.id, p_email, encode(sha256(convert_to(c.id::text || ':' || p_code, 'UTF8')), 'hex'), nu, nu + interval '15 minutes', 0)
    on conflict (contract_id) do update set
      email = excluded.email, hash = excluded.hash, verstuurd_at = excluded.verstuurd_at,
      verloopt_at = excluded.verloopt_at, pogingen = 0;
  insert into public.contract_gebeurtenissen (contract_id, soort, door, details)
    values (c.id, 'code', p_email, jsonb_build_object('email', p_email));

  return jsonb_build_object('ok', true, 'verloopt_at', nu + interval '15 minutes');
end
$$;

-- Ondertekenen. Geeft {ok: true, ...} of {ok: false, fout: '<code>'}; de codes
-- staan in src/lib/contracten.ts (CONTRACT_FOUT). De klant stuurt alleen wie
-- hij is, de gegevens van zijn organisatie en waar hij tekent; de tekst, de
-- looptijd en React2u komen uit de database. Eerst alle velden, dan pas de
-- code: een tikfout in het KvK-nummer kost geen poging.
create or replace function public.contract_ondertekenen(
  p_token text, p_naam text, p_functie text, p_email text, p_handtekening text, p_code text,
  p_opdrachtgever jsonb, p_plaats text, p_ip text default null, p_agent text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c public.contracten;
  k public.contract_codes;
  v_og jsonb;
  v_inhoud jsonb;
  v_hash text;
  nu timestamptz := now();
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into c from public.contracten where token = p_token for update;
  if not found or c.status in ('concept', 'ingetrokken') then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if c.status = 'getekend' then return jsonb_build_object('ok', false, 'fout', 'al-getekend'); end if;

  p_naam := btrim(coalesce(p_naam, ''));
  p_functie := btrim(coalesce(p_functie, ''));
  p_email := lower(btrim(coalesce(p_email, '')));
  p_plaats := btrim(coalesce(p_plaats, ''));
  if length(p_naam) < 2 or length(p_naam) > 120 then return jsonb_build_object('ok', false, 'fout', 'naam'); end if;
  if length(p_functie) < 2 or length(p_functie) > 120 then return jsonb_build_object('ok', false, 'fout', 'functie'); end if;
  if length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'fout', 'email'); end if;
  if length(p_plaats) < 2 or length(p_plaats) > 100 then return jsonb_build_object('ok', false, 'fout', 'plaats'); end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 300000 or length(p_handtekening) < 200 then
    return jsonb_build_object('ok', false, 'fout', 'handtekening');
  end if;

  -- De organisatie zoals in de kop van het contract: alleen de bekende velden, schoongemaakt.
  if p_opdrachtgever is null or jsonb_typeof(p_opdrachtgever) <> 'object' then return jsonb_build_object('ok', false, 'fout', 'organisatie'); end if;
  v_og := jsonb_strip_nulls(jsonb_build_object(
    'naam', nullif(btrim(p_opdrachtgever->>'naam'), ''),
    'adres', nullif(btrim(p_opdrachtgever->>'adres'), ''),
    'postcode', upper(nullif(btrim(p_opdrachtgever->>'postcode'), '')),
    'plaats', nullif(btrim(p_opdrachtgever->>'plaats'), ''),
    'kvk', nullif(regexp_replace(coalesce(p_opdrachtgever->>'kvk', ''), '\s', '', 'g'), '')
  ));
  if coalesce(length(v_og->>'naam'), 0) not between 2 and 200 then return jsonb_build_object('ok', false, 'fout', 'organisatie-naam'); end if;
  if coalesce(length(v_og->>'adres'), 0) not between 3 and 200
    or coalesce(length(v_og->>'postcode'), 0) not between 4 and 12
    or coalesce(length(v_og->>'plaats'), 0) not between 2 and 100 then
    return jsonb_build_object('ok', false, 'fout', 'organisatie-adres');
  end if;
  if coalesce(v_og->>'kvk', '') !~ '^[0-9]{8}$' then return jsonb_build_object('ok', false, 'fout', 'organisatie-kvk'); end if;

  -- De code als laatste.
  select * into k from public.contract_codes where contract_id = c.id for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'code-nieuw'); end if;
  if k.verloopt_at < nu then return jsonb_build_object('ok', false, 'fout', 'code-verlopen'); end if;
  if k.pogingen >= 5 then return jsonb_build_object('ok', false, 'fout', 'code-pogingen'); end if;
  if k.email <> p_email then return jsonb_build_object('ok', false, 'fout', 'code-email'); end if;
  if k.hash <> encode(sha256(convert_to(c.id::text || ':' || coalesce(btrim(p_code), ''), 'UTF8')), 'hex') then
    update public.contract_codes set pogingen = pogingen + 1 where contract_id = c.id;
    return jsonb_build_object('ok', false, 'fout', case when k.pogingen + 1 >= 5 then 'code-pogingen' else 'code' end, 'over', 4 - k.pogingen);
  end if;

  -- Wat er getekend is, los van latere wijzigingen: de tekst, beide partijen,
  -- de looptijd, wie tekende en hoe het e-mailadres is bevestigd.
  v_inhoud := jsonb_build_object(
    'nummer', c.nummer, 'bedrijf', c.bedrijf, 'contactpersoon', c.contactpersoon,
    'opdrachtnemer', c.opdrachtnemer, 'opdrachtgever', v_og,
    'offerte_kenmerk', c.offerte_kenmerk, 'ingangsdatum', c.ingangsdatum, 'einddatum', c.einddatum,
    'tekst', c.tekst, 'tekst_versie', c.tekst_versie, 'aanvullend', c.aanvullend,
    'afzender_naam', c.afzender_naam, 'afzender_functie', c.afzender_functie, 'afzender_email', c.afzender_email,
    'verstuurd_at', c.verstuurd_at,
    'getekend_naam', p_naam, 'getekend_functie', p_functie, 'getekend_email', p_email, 'getekend_plaats', p_plaats,
    'getekend_at', nu,
    'handtekening_hash', encode(sha256(convert_to(p_handtekening, 'UTF8')), 'hex'),
    'bevestiging', jsonb_build_object('methode', 'e-mailcode', 'email', k.email, 'verstuurd_at', k.verstuurd_at, 'bevestigd_at', nu)
  );
  v_hash := encode(sha256(convert_to(v_inhoud::text, 'UTF8')), 'hex');

  update public.contracten set
    status = 'getekend', opdrachtgever = v_og,
    getekend_at = nu, getekend_naam = p_naam, getekend_functie = p_functie, getekend_email = p_email, getekend_plaats = p_plaats,
    handtekening = p_handtekening, getekend_ip = left(p_ip, 64), getekend_agent = left(p_agent, 400),
    getekend_inhoud = v_inhoud, getekend_hash = v_hash
  where id = c.id;
  delete from public.contract_codes where contract_id = c.id;
  insert into public.contract_gebeurtenissen (contract_id, soort, door, details)
    values (c.id, 'getekend', p_naam, jsonb_build_object('hash', v_hash, 'email', p_email, 'functie', p_functie, 'bevestigd', true));

  return jsonb_build_object('ok', true, 'id', c.id, 'nummer', c.nummer, 'hash', v_hash, 'getekend_at', nu);
end
$$;

-- Het ondertekeningscertificaat: alleen voor een getekend contract. Het
-- IP-adres, het apparaat en de tijdlijn vanaf het versturen.
create or replace function public.contract_certificaat(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c public.contracten;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into c from public.contracten where token = p_token;
  if not found or c.status <> 'getekend' then return null; end if;
  return jsonb_build_object(
    'ip', c.getekend_ip,
    'agent', c.getekend_agent,
    'aantal_bekeken', c.aantal_bekeken,
    'tijdlijn', coalesce((
      select jsonb_agg(jsonb_build_object(
        'soort', g.soort,
        'at', g.at,
        'wie', case when g.soort in ('code', 'getekend') then g.door when g.soort in ('verstuurd', 'herinnering') then g.details->>'aan' end
      ) order by g.at, g.id)
      from public.contract_gebeurtenissen g
      where g.contract_id = c.id and g.soort in ('verstuurd', 'herinnering', 'bekeken', 'code', 'getekend')
    ), '[]'::jsonb)
  );
end
$$;

revoke execute on function public.contract_bewaken() from public, anon, authenticated;
revoke execute on function public.contract_bekijken(text, boolean) from public;
revoke execute on function public.contract_code_vastleggen(text, text, text, text) from public;
revoke execute on function public.contract_ondertekenen(text, text, text, text, text, text, jsonb, text, text, text) from public;
revoke execute on function public.contract_certificaat(text) from public;
grant execute on function public.contract_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.contract_code_vastleggen(text, text, text, text) to anon, authenticated;
grant execute on function public.contract_ondertekenen(text, text, text, text, text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.contract_certificaat(text) to anon, authenticated;

-- Bewaartermijn: een contract dat niet is getekend gaat een jaar na de laatste
-- activiteit weg, net als offertes (0028). Een getekend contract blijft: het
-- is de overeenkomst zelf.
select cron.schedule(
  'opruimen-contracten',
  '45 3 * * *',
  $$delete from public.contracten where status <> 'getekend' and updated_at < now() - interval '365 days'$$
);

-- Controle (verwacht: de select als anon geeft een fout, de functie met een
-- fout token null):
--   set local role anon; select * from public.contracten; -- permission denied
--   select public.contract_bekijken('0000000000000000000000000000000000000000000000000000000000000000');  -- null
