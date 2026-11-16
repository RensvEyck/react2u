-- Klantenbord, tweede ronde (Rens, 17 nov 2026, uit het S-tier-voorstel):
--
-- 1. Kaarten ontstaan en bewegen zelf. Een nieuwe offerte, brochure, contract
--    of onboarding maakt een kaart aan als die er nog niet is (dezelfde
--    bedrijfsnaam zonder rechtsvorm is dezelfde kaart, zie bedrijf_sleutel in
--    0040), en de gebeurtenissen van die modules verplaatsen de kaart: offerte
--    verstuurd naar Offerte uit, offerte getekend naar Akkoord, contract
--    getekend naar Inrichten, onboarding live naar Klant. Alleen vooruit; wie
--    een kaart bewust terugzet, houdt dat tot de volgende stap in de modules.
--    Een inactieve kaart komt bij nieuwe activiteit weer in de trechter.
-- 2. De tijdlijn toont alles. Elke gebeurtenis uit offerte_gebeurtenissen,
--    brochure_gebeurtenissen, contract_gebeurtenissen en
--    onboarding_gebeurtenissen komt als regel `systeem` in klant_gesprekken,
--    met `bron` en `bron_id` om door te klikken en `bron_gebeurtenis` om niets
--    dubbel te schrijven. `contact` zegt of een regel een echt contact was
--    (verstuurd, bekeken, getekend, ingevuld) of alleen administratie
--    (aangemaakt, ingetrokken, een verplaatsing, een import): het laatste
--    contact op de kaart kijkt alleen naar het eerste.
--
-- De vertaling van gebeurtenis naar tekst, contact en status staat in één
-- functie (klant_gebeurtenis), zodat de triggers en het inlezen van wat er al
-- stond (klantenbord_inlezen, onderaan) hetzelfde zeggen. Alles security
-- definer: een klant die een offerte bekijkt schrijft via offerte_bekijken
-- (anon) en moet toch een regel op het bord kunnen zetten.
--
-- VOLGORDE: na 0040.

alter table public.klant_gesprekken drop constraint klant_gesprekken_soort_check;
alter table public.klant_gesprekken add constraint klant_gesprekken_soort_check
  check (soort in ('gesprek', 'mail', 'bezoek', 'notitie', 'status', 'import', 'systeem'));
alter table public.klant_gesprekken
  add column contact boolean not null default true,
  add column bron text check (bron in ('offerte', 'brochure', 'contract', 'onboarding', 'opdracht')),
  add column bron_id uuid,
  add column bron_gebeurtenis bigint;
update public.klant_gesprekken set contact = false where soort in ('status', 'import');
create unique index klant_gesprekken_bron_gebeurtenis on public.klant_gesprekken (bron, bron_gebeurtenis) where bron_gebeurtenis is not null;

-- Het laatste contact op de kaart: nu op `contact`, niet op de soort.
create or replace function public.klant_laatste_contact() returns trigger
language plpgsql
as $$
declare
  k uuid := coalesce(new.klant_id, old.klant_id);
begin
  update public.klanten set laatste_contact_op = g.op, laatste_contact = left(g.tekst, 500)
  from (
    select op, tekst from public.klant_gesprekken
    where klant_id = k and contact
    order by op desc, created_at desc limit 1
  ) g
  where id = k;
  if not found then
    update public.klanten set laatste_contact_op = null, laatste_contact = null where id = k;
  end if;
  return null;
end;
$$;

/* ---------- de trechter in de database ---------- */

create or replace function public.klant_status_rang(s text) returns integer
language sql immutable
as $$
  select case s when 'lead' then 0 when 'gesprek' then 1 when 'offerte' then 2 when 'akkoord' then 3 when 'inrichten' then 4 when 'klant' then 5 else -1 end;
$$;

create or replace function public.klant_status_label(s text) returns text
language sql immutable
as $$
  select case s when 'lead' then 'lead' when 'gesprek' then 'in gesprek' when 'offerte' then 'offerte uit' when 'akkoord' then 'akkoord'
    when 'inrichten' then 'inrichten' when 'klant' then 'klant' when 'inactief' then 'inactief' else s end;
$$;

/**
 * De kaart van dit bedrijf, of een nieuwe. Lege contactgegevens op een bestaande
 * kaart worden aangevuld uit de module; wat er al stond blijft staan.
 */
create or replace function public.klant_zeker(p_bedrijf text, p_contactpersoon text, p_email text, p_telefoon text, p_status text, p_bron text) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s text := public.bedrijf_sleutel(p_bedrijf);
  k uuid;
  nieuw boolean := false;
begin
  if s is null then return null; end if;
  select id into k from public.klanten where sleutel = s;
  if k is null then
    insert into public.klanten (bedrijf, contactpersoon, email, telefoon, status, bron)
    values (left(btrim(p_bedrijf), 200), left(p_contactpersoon, 200), case when p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(left(p_email, 254)) end, left(p_telefoon, 40), coalesce(p_status, 'lead'), p_bron)
    on conflict (sleutel) do nothing
    returning id into k;
    if k is not null then
      nieuw := true;
      insert into public.klant_gesprekken (klant_id, soort, tekst, door, contact)
      values (k, 'status', 'Op het bord gezet als ' || public.klant_status_label(coalesce(p_status, 'lead')) || ' vanuit ' || coalesce(p_bron, 'een module'), 'automatisch', false);
    else
      select id into k from public.klanten where sleutel = s;
    end if;
  end if;
  if not nieuw then
    update public.klanten set
      contactpersoon = coalesce(contactpersoon, left(p_contactpersoon, 200)),
      email = coalesce(email, case when p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(left(p_email, 254)) end),
      telefoon = coalesce(telefoon, left(p_telefoon, 40))
    where id = k and (contactpersoon is null or email is null or telefoon is null);
  end if;
  return k;
end;
$$;

/** De kaart vooruit zetten als de module verder is; inactief telt als het begin. */
create or replace function public.klant_vooruit(p_klant uuid, p_status text, p_reden text) returns void
language plpgsql security definer set search_path = public
as $$
declare
  huidig text;
begin
  if p_status is null then return; end if;
  select status into huidig from public.klanten where id = p_klant;
  if huidig is null or public.klant_status_rang(p_status) <= public.klant_status_rang(huidig) then return; end if;
  update public.klanten set status = p_status where id = p_klant;
  insert into public.klant_gesprekken (klant_id, soort, tekst, door, contact)
  values (p_klant, 'status', 'Van ' || public.klant_status_label(huidig) || ' naar ' || public.klant_status_label(p_status) || ' (' || p_reden || ')', 'automatisch', false);
end;
$$;

/** De naam van een onboardingdocument zoals de klant hem ziet. */
create or replace function public.klant_document_naam(s text) returns text
language sql immutable
as $$
  select case s when 'welkom' then 'Welkom bij React2u' when 'inrichting' then 'Inrichting nieuwe klant' when 'werknemers' then 'Werknemersbestand'
    when 'verzuimprotocol' then 'Verzuimprotocol' when 'vragen' then 'Wat je wél mag vragen' when 'machtiging' then 'Machtiging overdracht verzuimdossier'
    else coalesce(s, 'een document') end;
$$;

/**
 * Eén gebeurtenis uit een module op het bord: de kaart (desnoods nieuw), de
 * verplaatsing die erbij hoort, en de regel in de tijdlijn. Geeft niets terug
 * bij een soort die niemand hoeft te zien (gewijzigd, taak, gewist).
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
  naam text := case p_bron when 'offerte' then 'Offerte ' when 'brochure' then 'Brochure ' when 'contract' then 'Contract ' when 'onboarding' then 'Onboarding ' end || coalesce(p_nummer, '');
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
    when 'bekeken' then tekst := naam || case p_bron when 'onboarding' then ' geopend' else ' bekeken' end; wie := coalesce(wie, 'klant');
    when 'code' then tekst := 'Vroeg een code aan om ' || lower(left(naam, 1)) || substr(naam, 2) || ' te tekenen'; wie := coalesce(wie, 'klant');
    when 'getekend' then
      tekst := naam || ' getekend' || coalesce(' door ' || nullif(p_door, ''), '');
      naar := case p_bron when 'offerte' then 'akkoord' when 'contract' then 'inrichten' end;
      wie := coalesce(wie, 'klant');
    when 'gekozen' then tekst := 'Koos zelf onderdelen in ' || lower(left(naam, 1)) || substr(naam, 2); wie := coalesce(wie, 'klant');
    when 'afgewezen' then tekst := naam || ' afgewezen' || coalesce(': ' || nullif(p_details->>'reden', ''), ''); wie := coalesce(wie, 'klant');
    when 'ingetrokken' then tekst := naam || ' ingetrokken'; contact := false;
    when 'heropend' then tekst := naam || ' heropend'; contact := false;
    when 'ingevuld' then tekst := public.klant_document_naam(p_details->>'document') || ' ingevuld (' || lower(left(naam, 1)) || substr(naam, 2) || ')'; wie := coalesce(wie, 'klant');
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

/* ---------- de kaart bij een nieuwe rij in een module ---------- */

create or replace function public.klant_status_uit_offerte(s text) returns text
language sql immutable
as $$ select case s when 'verstuurd' then 'offerte' when 'getekend' then 'akkoord' else 'gesprek' end; $$;

create or replace function public.klant_status_uit_contract(s text) returns text
language sql immutable
as $$ select case s when 'getekend' then 'inrichten' else 'akkoord' end; $$;

create or replace function public.klantenbord_offerte() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, public.klant_status_uit_offerte(new.status), 'offerte');
  elsif new.keuze_at is distinct from old.keuze_at and new.keuze_at is not null then
    -- De klant koos zelf onderdelen: geen gebeurtenis in offerte_gebeurtenissen, wel een contact.
    perform public.klant_gebeurtenis('offerte', new.id, null, new.bedrijf, new.contactpersoon, new.email, new.telefoon, new.nummer, 'gekozen', 'klant', null, new.keuze_at, 'offerte');
  end if;
  return null;
end;
$$;

create or replace function public.klantenbord_brochure() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, 'lead', 'brochure');
  return null;
end;
$$;

create or replace function public.klantenbord_contract() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(new.soort, 'basis') = 'reseller' then return null; end if;
  perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, public.klant_status_uit_contract(new.status), 'contract');
  return null;
end;
$$;

create or replace function public.klantenbord_onboarding() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, 'inrichten', 'onboarding');
  return null;
end;
$$;

-- Een los opgevoerde klant of opdracht (0036) is een bestaande klant: meteen in de kolom Klant.
create or replace function public.klantenbord_opdracht() returns trigger
language plpgsql security definer set search_path = public
as $$
declare k uuid;
begin
  k := public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, null, 'klant', 'opdracht');
  if k is null then return null; end if;
  perform public.klant_vooruit(k, 'klant', 'los opgevoerd als klant');
  insert into public.klant_gesprekken (klant_id, soort, op, tekst, door, contact, bron, bron_id, created_at)
  select k, 'systeem', new.datum, case when new.soort = 'abonnement' then 'Opgevoerd als klant met een abonnement sinds ' || to_char(new.datum, 'DD-MM-YYYY') else 'Losse opdracht opgevoerd op ' || to_char(new.datum, 'DD-MM-YYYY') end,
    'automatisch', false, 'opdracht', new.id, greatest(new.datum::timestamptz, new.created_at)
  where not exists (select 1 from public.klant_gesprekken where bron = 'opdracht' and bron_id = new.id);
  return null;
end;
$$;

create trigger klantenbord_offerte after insert or update of keuze_at on public.offertes for each row execute function public.klantenbord_offerte();
create trigger klantenbord_opdracht after insert on public.losse_opdrachten for each row execute function public.klantenbord_opdracht();
create trigger klantenbord_brochure after insert on public.brochures for each row execute function public.klantenbord_brochure();
create trigger klantenbord_contract after insert on public.contracten for each row execute function public.klantenbord_contract();
create trigger klantenbord_onboarding after insert on public.onboardings for each row execute function public.klantenbord_onboarding();

/* ---------- de tijdlijn bij elke gebeurtenis ---------- */

create or replace function public.klantenbord_offerte_gebeurtenis() returns trigger
language plpgsql security definer set search_path = public
as $$
declare o public.offertes;
begin
  select * into o from public.offertes where id = new.offerte_id;
  if found then
    perform public.klant_gebeurtenis('offerte', o.id, new.id, o.bedrijf, o.contactpersoon, o.email, o.telefoon, o.nummer, new.soort, new.door, new.details, new.at, public.klant_status_uit_offerte(o.status));
  end if;
  return null;
end;
$$;

create or replace function public.klantenbord_brochure_gebeurtenis() returns trigger
language plpgsql security definer set search_path = public
as $$
declare b public.brochures;
begin
  select * into b from public.brochures where id = new.brochure_id;
  if found then
    perform public.klant_gebeurtenis('brochure', b.id, new.id, b.bedrijf, b.contactpersoon, b.email, b.telefoon, b.nummer, new.soort, new.door, new.details, new.at, 'lead');
  end if;
  return null;
end;
$$;

create or replace function public.klantenbord_contract_gebeurtenis() returns trigger
language plpgsql security definer set search_path = public
as $$
declare c public.contracten;
begin
  select * into c from public.contracten where id = new.contract_id;
  if found and coalesce(c.soort, 'basis') <> 'reseller' then
    perform public.klant_gebeurtenis('contract', c.id, new.id, c.bedrijf, c.contactpersoon, c.email, c.telefoon, c.nummer, new.soort, new.door, new.details, new.at, public.klant_status_uit_contract(c.status));
  end if;
  return null;
end;
$$;

create or replace function public.klantenbord_onboarding_gebeurtenis() returns trigger
language plpgsql security definer set search_path = public
as $$
declare o public.onboardings;
begin
  select * into o from public.onboardings where id = new.onboarding_id;
  if found then
    perform public.klant_gebeurtenis('onboarding', o.id, new.id, o.bedrijf, o.contactpersoon, o.email, o.telefoon, o.nummer, new.soort, new.door, new.details, new.at, 'inrichten');
  end if;
  return null;
end;
$$;

create trigger klantenbord_offerte_gebeurtenis after insert on public.offerte_gebeurtenissen for each row execute function public.klantenbord_offerte_gebeurtenis();
create trigger klantenbord_brochure_gebeurtenis after insert on public.brochure_gebeurtenissen for each row execute function public.klantenbord_brochure_gebeurtenis();
create trigger klantenbord_contract_gebeurtenis after insert on public.contract_gebeurtenissen for each row execute function public.klantenbord_contract_gebeurtenis();
create trigger klantenbord_onboarding_gebeurtenis after insert on public.onboarding_gebeurtenissen for each row execute function public.klantenbord_onboarding_gebeurtenis();

/* ---------- wat er al stond ---------- */

/**
 * Alles wat al in de modules staat op het bord zetten, in de volgorde waarin
 * het gebeurde. Kan vaker draaien: een gebeurtenis die er al staat wordt
 * overgeslagen (bron_gebeurtenis), een kaart die er al is blijft.
 */
create or replace function public.klantenbord_inlezen() returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  kaarten_voor integer;
  regels_voor integer;
begin
  select count(*) into kaarten_voor from public.klanten;
  select count(*) into regels_voor from public.klant_gesprekken;

  for r in (
    select 'offerte' as bron, id, bedrijf, contactpersoon, email, telefoon, public.klant_status_uit_offerte(status) as st, created_at from public.offertes where status <> 'ingetrokken'
    union all select 'brochure', id, bedrijf, contactpersoon, email, telefoon, 'lead', created_at from public.brochures where status <> 'ingetrokken'
    union all select 'contract', id, bedrijf, contactpersoon, email, telefoon, public.klant_status_uit_contract(status), created_at from public.contracten where status <> 'ingetrokken' and coalesce(soort, 'basis') <> 'reseller'
    union all select 'onboarding', id, bedrijf, contactpersoon, email, telefoon, 'inrichten', created_at from public.onboardings where status <> 'ingetrokken'
    order by created_at
  ) loop
    perform public.klant_zeker(r.bedrijf, r.contactpersoon, r.email, r.telefoon, r.st, r.bron);
  end loop;

  for r in (
    select 'offerte' as bron, o.id as bron_id, g.id as gebeurtenis, o.bedrijf, o.contactpersoon, o.email, o.telefoon, o.nummer, g.soort, g.door, g.details, g.at, public.klant_status_uit_offerte(o.status) as st
      from public.offerte_gebeurtenissen g join public.offertes o on o.id = g.offerte_id
    union all
    select 'brochure', b.id, g.id, b.bedrijf, b.contactpersoon, b.email, b.telefoon, b.nummer, g.soort, g.door, g.details, g.at, 'lead'
      from public.brochure_gebeurtenissen g join public.brochures b on b.id = g.brochure_id
    union all
    select 'contract', c.id, g.id, c.bedrijf, c.contactpersoon, c.email, c.telefoon, c.nummer, g.soort, g.door, g.details, g.at, public.klant_status_uit_contract(c.status)
      from public.contract_gebeurtenissen g join public.contracten c on c.id = g.contract_id where coalesce(c.soort, 'basis') <> 'reseller'
    union all
    select 'onboarding', o.id, g.id, o.bedrijf, o.contactpersoon, o.email, o.telefoon, o.nummer, g.soort, g.door, g.details, g.at, 'inrichten'
      from public.onboarding_gebeurtenissen g join public.onboardings o on o.id = g.onboarding_id
    order by at
  ) loop
    if not exists (select 1 from public.klant_gesprekken where bron = r.bron and bron_gebeurtenis = r.gebeurtenis) then
      perform public.klant_gebeurtenis(r.bron, r.bron_id, r.gebeurtenis, r.bedrijf, r.contactpersoon, r.email, r.telefoon, r.nummer, r.soort, r.door, r.details, r.at, r.st);
    end if;
  end loop;

  -- Los opgevoerde klanten en opdrachten (0036): bestaande klanten.
  for r in (select * from public.losse_opdrachten order by datum, created_at) loop
    if not exists (select 1 from public.klant_gesprekken where bron = 'opdracht' and bron_id = r.id) then
      perform public.klant_zeker(r.bedrijf, r.contactpersoon, r.email, null, 'klant', 'opdracht');
      perform public.klant_vooruit((select id from public.klanten where sleutel = public.bedrijf_sleutel(r.bedrijf)), 'klant', 'los opgevoerd als klant');
      insert into public.klant_gesprekken (klant_id, soort, op, tekst, door, contact, bron, bron_id, created_at)
      select k.id, 'systeem', r.datum, case when r.soort = 'abonnement' then 'Opgevoerd als klant met een abonnement sinds ' || to_char(r.datum, 'DD-MM-YYYY') else 'Losse opdracht opgevoerd op ' || to_char(r.datum, 'DD-MM-YYYY') end,
        'automatisch', false, 'opdracht', r.id, greatest(r.datum::timestamptz, r.created_at)
      from public.klanten k where k.sleutel = public.bedrijf_sleutel(r.bedrijf);
    end if;
  end loop;

  -- De keuze van de klant staat alleen op de offerte zelf.
  for r in (select * from public.offertes where keuze_at is not null order by keuze_at) loop
    if not exists (select 1 from public.klant_gesprekken where bron = 'offerte' and bron_id = r.id and soort = 'systeem' and created_at = r.keuze_at) then
      perform public.klant_gebeurtenis('offerte', r.id, null, r.bedrijf, r.contactpersoon, r.email, r.telefoon, r.nummer, 'gekozen', 'klant', null, r.keuze_at, 'offerte');
    end if;
  end loop;

  return jsonb_build_object(
    'kaarten', (select count(*) from public.klanten) - kaarten_voor,
    'regels', (select count(*) from public.klant_gesprekken) - regels_voor
  );
end;
$$;

revoke all on function public.klantenbord_inlezen() from public, anon;
grant execute on function public.klantenbord_inlezen() to authenticated;

select public.klantenbord_inlezen();
