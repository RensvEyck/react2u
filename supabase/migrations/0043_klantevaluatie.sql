-- Klantevaluatie (/admin/documenten/evaluaties): het jaarlijkse evaluatieformulier
-- "Klant Evaluatie" (Word, v2) als losse module, verstuurd in dezelfde stijl als
-- het contract en de onboarding (Rens, 17 nov 2026: "klant evaluatie moet ook in
-- dezelfde stijl gestuurd worden als losse module. Misschien moeten we het in
-- de sidebar gewoon documenten noemen"). De klant krijgt één persoonlijke link
-- (/evaluatie/<token>), vult online de checklist, de evaluatie van de
-- dienstverlening, de wensen voor komend jaar, de afspraken en de acties in, en
-- krijgt een pdf in de huisstijl.
--
-- Dezelfde opzet als de onboarding (0037):
-- - evaluaties: één rij per evaluatie. `token` is het geheim in de link. De
--   vragen zelf staan in de code (lib/evaluatie.ts), niet in de tabel;
--   `antwoorden` is wat de klant invulde (de vorm controleert Next).
-- - evaluatie_gebeurtenissen: de tijdlijn.
-- - De klant komt nooit bij de tabel; alles loopt via de functies hieronder
--   (security definer) met het token als sleutel, achter has_perm('bellijst').
-- - Het klantenbord (0040, 0041) krijgt een kaart (status klant) en de regels
--   "verstuurd", "geopend" en "ingevuld" in de tijdlijn, via dezelfde
--   klant_gebeurtenis als de andere modules; die functie krijgt hier de bron
--   'evaluatie'.
--
-- VOLGORDE: na 0041 (0042 is voor de checklist arbeidsomstandigheden bij het
-- contract). Zonder deze migratie meldt /admin/documenten/evaluaties dat, en
-- geeft /evaluatie/<token> een 404.

create sequence public.evaluatie_nummer_seq;

create table public.evaluaties (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique default (
    'KE' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('public.evaluatie_nummer_seq')::text, 4, '0')
  ),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (token ~ '^[a-f0-9]{48,}$'),
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'ingevuld', 'ingetrokken')),

  -- De klant (het blok Gegevens van het formulier).
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  telefoon text check (length(telefoon) <= 40),
  bericht text check (length(bericht) <= 5000),
  bezoek_datum date,
  bezoek_tijd text check (length(bezoek_tijd) <= 40),

  -- Wat de klant invulde (lib/evaluatie.ts, EvaluatieAntwoorden), alleen te schrijven via evaluatie_opslaan.
  antwoorden jsonb check (antwoorden is null or jsonb_typeof(antwoorden) = 'object'),
  ingevuld_at timestamptz,
  ingevuld_door text check (length(ingevuld_door) <= 200),

  afzender_naam text check (length(afzender_naam) <= 200),
  afzender_functie text check (length(afzender_functie) <= 200),
  afzender_email text check (length(afzender_email) <= 254),
  afzender_telefoon text check (length(afzender_telefoon) <= 40),

  notitie text check (length(notitie) <= 5000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verstuurd_at timestamptz,

  bekeken_at timestamptz,
  laatst_bekeken_at timestamptz,
  aantal_bekeken integer not null default 0
);
create index evaluaties_status on public.evaluaties (status, created_at desc);

create table public.evaluatie_gebeurtenissen (
  id bigint generated always as identity primary key,
  evaluatie_id uuid not null references public.evaluaties(id) on delete cascade,
  soort text not null check (soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'ingevuld', 'ingetrokken', 'heropend')),
  door text,
  details jsonb,
  at timestamptz not null default now()
);
create index evaluatie_gebeurtenissen_evaluatie on public.evaluatie_gebeurtenissen (evaluatie_id, at desc);

create trigger evaluaties_updated before update on public.evaluaties
  for each row execute function public.set_updated_at();

alter table public.evaluaties enable row level security;
alter table public.evaluatie_gebeurtenissen enable row level security;
revoke all on public.evaluaties, public.evaluatie_gebeurtenissen from anon;
revoke all on sequence public.evaluatie_nummer_seq from anon;
grant usage on sequence public.evaluatie_nummer_seq to authenticated;

create policy "bellijst beheert evaluaties" on public.evaluaties
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));
create policy "bellijst leest evaluatietijdlijn" on public.evaluatie_gebeurtenissen
  for select to authenticated using (public.has_perm('bellijst'));
create policy "bellijst schrijft evaluatietijdlijn" on public.evaluatie_gebeurtenissen
  for insert to authenticated with check (
    public.has_perm('bellijst') and soort in ('aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'ingetrokken', 'heropend')
  );

-- Het bezoek, de antwoorden, het nummer en de aanmaakgegevens schrijft alleen de database zelf.
create or replace function public.evaluatie_bewaken() returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
      new.antwoorden := null; new.ingevuld_at := null; new.ingevuld_door := null;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.antwoorden := old.antwoorden; new.ingevuld_at := old.ingevuld_at; new.ingevuld_door := old.ingevuld_door;
      new.nummer := old.nummer; new.created_by := old.created_by; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

create trigger evaluatie_bewaken
  before insert or update on public.evaluaties
  for each row execute function public.evaluatie_bewaken();

-- Wat de klant te zien krijgt, met zijn eigen e-mailadres (dat staat in het
-- blok Gegevens van het formulier en in de pdf). Null voor een onbekend token
-- (404); een ingetrokken evaluatie geeft alleen de status en de contactpersoon.
create or replace function public.evaluatie_bekijken(p_token text, p_tel boolean default true) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  e public.evaluaties;
  eerste boolean := false;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into e from public.evaluaties where token = p_token;
  if not found then return null; end if;

  if e.status = 'ingetrokken' then
    return jsonb_build_object(
      'status', e.status, 'nummer', e.nummer, 'bedrijf', e.bedrijf,
      'afzender_naam', e.afzender_naam, 'afzender_email', e.afzender_email, 'afzender_telefoon', e.afzender_telefoon
    );
  end if;

  -- Elke render komt hier langs, ook na opslaan (zie onboarding_bekijken, 0037):
  -- een bezoek telt pas opnieuw na een half uur zonder activiteit.
  if p_tel and e.status in ('verstuurd', 'ingevuld') then
    update public.evaluaties set bekeken_at = now() where id = e.id and bekeken_at is null returning true into eerste;
    eerste := coalesce(eerste, false);
    update public.evaluaties
      set aantal_bekeken = aantal_bekeken + (case when laatst_bekeken_at is null or laatst_bekeken_at < now() - interval '30 minutes' then 1 else 0 end),
          laatst_bekeken_at = now()
      where id = e.id;
    if not exists (
      select 1 from public.evaluatie_gebeurtenissen
      where evaluatie_id = e.id and soort = 'bekeken' and at > now() - interval '30 minutes'
    ) then
      insert into public.evaluatie_gebeurtenissen (evaluatie_id, soort) values (e.id, 'bekeken');
    end if;
  end if;

  return jsonb_build_object(
    'id', e.id, 'nummer', e.nummer, 'status', e.status,
    'bedrijf', e.bedrijf, 'contactpersoon', e.contactpersoon, 'email', e.email, 'bericht', e.bericht,
    'bezoek_datum', e.bezoek_datum, 'bezoek_tijd', e.bezoek_tijd,
    'antwoorden', e.antwoorden, 'ingevuld_at', e.ingevuld_at, 'ingevuld_door', e.ingevuld_door,
    'afzender_naam', e.afzender_naam, 'afzender_functie', e.afzender_functie,
    'afzender_email', e.afzender_email, 'afzender_telefoon', e.afzender_telefoon,
    'verstuurd_at', e.verstuurd_at, 'created_at', e.created_at,
    'eerste_keer', eerste
  );
end
$$;

-- De klant vult de evaluatie in (of past hem aan). De vorm van `p_data`
-- controleert Next (lib/evaluatie.ts); hier alleen of het mag en hoe groot.
-- Geeft ook het e-mailadres van de klant terug, voor de bevestiging met de pdf.
create or replace function public.evaluatie_opslaan(p_token text, p_data jsonb, p_naam text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  e public.evaluaties;
  eerste boolean;
  naam text := left(nullif(btrim(p_naam), ''), 200);
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into e from public.evaluaties where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if e.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if e.status not in ('verstuurd', 'ingevuld') then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 200000 then
    return jsonb_build_object('ok', false, 'fout', 'invoer');
  end if;

  eerste := e.ingevuld_at is null;
  update public.evaluaties
    set antwoorden = p_data, ingevuld_at = coalesce(e.ingevuld_at, now()), ingevuld_door = coalesce(naam, e.ingevuld_door), status = 'ingevuld'
    where id = e.id;
  insert into public.evaluatie_gebeurtenissen (evaluatie_id, soort, door, details)
    values (e.id, 'ingevuld', naam, jsonb_build_object('opnieuw', not eerste));

  return jsonb_build_object('ok', true, 'eerste', eerste, 'email', e.email, 'contactpersoon', e.contactpersoon);
end
$$;

revoke execute on function public.evaluatie_bewaken() from public, anon, authenticated;
revoke execute on function public.evaluatie_bekijken(text, boolean) from public;
revoke execute on function public.evaluatie_opslaan(text, jsonb, text) from public;
grant execute on function public.evaluatie_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.evaluatie_opslaan(text, jsonb, text) to anon, authenticated;

-- Bewaartermijn: twee jaar na de laatste activiteit. Een evaluatie is het
-- vertrekpunt voor het gesprek van volgend jaar ("Wensen komend jaar"), daarna
-- is hij niet meer nodig.
select cron.schedule(
  'opruimen-evaluaties',
  '50 3 * * *',
  $$delete from public.evaluaties where updated_at < now() - interval '730 days'$$
);

/* ---------- het klantenbord (0040, 0041) ---------- */

-- De bron 'evaluatie' erbij voor de systeemregels in de tijdlijn.
alter table public.klant_gesprekken drop constraint klant_gesprekken_bron_check;
alter table public.klant_gesprekken add constraint klant_gesprekken_bron_check
  check (bron in ('offerte', 'brochure', 'contract', 'onboarding', 'opdracht', 'evaluatie'));

/**
 * Dezelfde functie als in 0041, met de klantevaluatie erbij: de naam
 * "Klantevaluatie KE2026-0001", 'bekeken' heet geopend, 'ingevuld' is het
 * hele formulier (geen document), en een evaluatie verplaatst de kaart niet
 * (wie een evaluatie krijgt, is al klant; een nieuwe kaart begint in Klant).
 */
create or replace function public.klant_gebeurtenis(
  p_bron text, p_bron_id uuid, p_gebeurtenis bigint, p_bedrijf text, p_contactpersoon text, p_email text, p_telefoon text,
  p_nummer text, p_soort text, p_door text, p_details jsonb, p_at timestamptz, p_status_bij_aanmaak text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  k uuid;
  tekst text;
  contact boolean := true;
  naar text;
  wie text := p_door;
  naam text := case p_bron when 'offerte' then 'Offerte ' when 'brochure' then 'Brochure ' when 'contract' then 'Contract ' when 'onboarding' then 'Onboarding ' when 'evaluatie' then 'Klantevaluatie ' end || coalesce(p_nummer, '');
  aan text := nullif(p_details->>'aan', '');
begin
  if p_bron is null or p_bedrijf is null then return; end if;
  case p_soort
    when 'aangemaakt' then tekst := naam || ' aangemaakt'; contact := false;
    when 'verstuurd' then
      tekst := naam || ' verstuurd' || coalesce(' naar ' || aan, '');
      naar := case p_bron when 'offerte' then 'offerte' when 'contract' then 'akkoord' when 'onboarding' then 'inrichten' end;
    when 'herinnering' then
      tekst := 'Herinnering gestuurd voor ' || lower(left(naam, 1)) || substr(naam, 2);
      naar := case p_bron when 'offerte' then 'offerte' when 'contract' then 'akkoord' when 'onboarding' then 'inrichten' end;
    when 'bekeken' then tekst := naam || case p_bron when 'onboarding' then ' geopend' when 'evaluatie' then ' geopend' else ' bekeken' end; wie := coalesce(wie, 'klant');
    when 'code' then tekst := 'Vroeg een code aan om ' || lower(left(naam, 1)) || substr(naam, 2) || ' te tekenen'; wie := coalesce(wie, 'klant');
    when 'getekend' then
      tekst := naam || ' getekend' || coalesce(' door ' || nullif(p_door, ''), '');
      naar := case p_bron when 'offerte' then 'akkoord' when 'contract' then 'inrichten' end;
      wie := coalesce(wie, 'klant');
    when 'gekozen' then tekst := 'Koos zelf onderdelen in ' || lower(left(naam, 1)) || substr(naam, 2); wie := coalesce(wie, 'klant');
    when 'afgewezen' then tekst := naam || ' afgewezen' || coalesce(': ' || nullif(p_details->>'reden', ''), ''); wie := coalesce(wie, 'klant');
    when 'ingetrokken' then tekst := naam || ' ingetrokken'; contact := false;
    when 'heropend' then tekst := naam || ' heropend'; contact := false;
    when 'ingevuld' then
      if p_bron = 'evaluatie' then
        tekst := naam || case when coalesce(p_details->>'opnieuw', 'false') = 'true' then ' aangepast' else ' ingevuld' end || coalesce(' door ' || nullif(p_door, ''), '');
      else
        tekst := public.klant_document_naam(p_details->>'document') || ' ingevuld (' || lower(left(naam, 1)) || substr(naam, 2) || ')';
      end if;
      wie := coalesce(wie, 'klant');
    when 'gelezen' then tekst := public.klant_document_naam(p_details->>'document') || ' afgevinkt (' || lower(left(naam, 1)) || substr(naam, 2) || ')'; wie := coalesce(wie, 'klant');
    when 'afgerond' then tekst := 'Klant klaar met ' || lower(left(naam, 1)) || substr(naam, 2) || ': alles aangeleverd'; naar := 'inrichten'; wie := coalesce(wie, 'klant');
    when 'live' then tekst := 'Live: ' || lower(left(naam, 1)) || substr(naam, 2) || ' is ingericht'; naar := 'klant'; contact := true;
    when 'doorgestuurd' then tekst := 'Een stap van ' || lower(left(naam, 1)) || substr(naam, 2) || ' doorgestuurd naar een collega'; contact := false; wie := coalesce(wie, 'klant');
    when 'machtiging' then
      if coalesce(p_details->>'actie', '') <> 'getekend' then return; end if;
      tekst := coalesce(nullif(p_details->>'naam', ''), 'Een werknemer') || ' tekende de machtiging (' || lower(left(naam, 1)) || substr(naam, 2) || ')';
      wie := coalesce(wie, 'klant');
    else return;
  end case;

  k := public.klant_zeker(p_bedrijf, p_contactpersoon, p_email, p_telefoon, coalesce(naar, p_status_bij_aanmaak), p_bron);
  if k is null then return; end if;
  perform public.klant_vooruit(k, naar, lower(left(tekst, 1)) || substr(tekst, 2));
  insert into public.klant_gesprekken (klant_id, soort, op, tekst, door, contact, bron, bron_id, bron_gebeurtenis, created_at)
  values (k, 'systeem', (p_at at time zone 'Europe/Amsterdam')::date, left(tekst, 5000), wie, contact, p_bron, p_bron_id, p_gebeurtenis, p_at)
  on conflict (bron, bron_gebeurtenis) where bron_gebeurtenis is not null do nothing;
end;
$$;

-- Een nieuwe evaluatie: de kaart van dit bedrijf, of een nieuwe in de kolom Klant.
create or replace function public.klantenbord_evaluatie() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, 'klant', 'evaluatie');
  return null;
end;
$$;

create or replace function public.klantenbord_evaluatie_gebeurtenis() returns trigger
language plpgsql security definer set search_path = public
as $$
declare e public.evaluaties;
begin
  select * into e from public.evaluaties where id = new.evaluatie_id;
  if found then
    perform public.klant_gebeurtenis('evaluatie', e.id, new.id, e.bedrijf, e.contactpersoon, e.email, e.telefoon, e.nummer, new.soort, new.door, new.details, new.at, 'klant');
  end if;
  return null;
end;
$$;

create trigger klantenbord_evaluatie after insert on public.evaluaties for each row execute function public.klantenbord_evaluatie();
create trigger klantenbord_evaluatie_gebeurtenis after insert on public.evaluatie_gebeurtenissen for each row execute function public.klantenbord_evaluatie_gebeurtenis();
