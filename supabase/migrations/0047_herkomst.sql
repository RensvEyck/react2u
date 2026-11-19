-- Waar aanvragen en klanten vandaan komen (november 2026).
--
-- De site telde tot nu toe alleen verstuurde formulieren, zonder te weten hoe
-- de bezoeker ons vond. Bellen en mailen, bij een arbodienst de gewone weg,
-- telde helemaal niet. Deze migratie legt drie dingen vast:
--
-- 1. `conversions` telt ook een klik op een telefoonnummer (`bel`) of een
--    mailadres (`mail`), en krijgt per rij de herkomst (wat de bezoeker zelf
--    koos), de bron (wat de browser zag: verwijzer of campagne, zoals
--    `applications.bron`), de landingspagina (waar het bezoek begon) en de
--    bezoekershash van die dag (dezelfde als in `page_views`, roteert elke
--    nacht; geen IP-adres).
-- 2. `contact_messages` krijgt herkomst, bron en landingspagina, zodat het
--    Postvak IN ze toont en een offerte uit een aanvraag ze overneemt.
-- 3. `klanten` en `offertes` krijgen een herkomst uit een vaste keuzelijst
--    (lib/herkomst.ts), met een toelichting. De offerte geeft zijn herkomst
--    door aan de kaart op het klantenbord.

/* ---------- 1. conversies: klikken en herkomst ---------- */

alter table public.conversions drop constraint if exists conversions_kind_check;
alter table public.conversions add constraint conversions_kind_check
  check (kind in ('contact', 'offerte', 'sollicitatie', 'terugbel', 'bel', 'mail'));

alter table public.conversions
  add column if not exists herkomst text check (herkomst is null or length(herkomst) <= 40),
  add column if not exists bron text check (bron is null or length(bron) <= 120),
  add column if not exists landingspagina text check (landingspagina is null or length(landingspagina) <= 200),
  add column if not exists visitor_hash text check (visitor_hash is null or length(visitor_hash) <= 64);

comment on column public.conversions.herkomst is 'Wat de bezoeker zelf koos bij "hoe heb je ons gevonden" (sleutel uit lib/herkomst.ts).';
comment on column public.conversions.bron is 'Wat de browser zag: "verwijzer: google.com" of "campagne: chatgpt.com", zoals applications.bron.';
comment on column public.conversions.landingspagina is 'De eerste pagina van dit bezoek (sessionStorage, BronOnthouden).';
comment on column public.conversions.visitor_hash is 'Dezelfde daghash als page_views.visitor_hash, om een aanvraag aan een bezoek te koppelen. Geen IP.';

-- Zoals bij `applications.bron` (0018): het kolomrecht expliciet, voor als het
-- invoegrecht op de hele tabel ooit wordt ingetrokken.
grant insert (herkomst, bron, landingspagina, visitor_hash) on public.conversions to anon, authenticated;

/* ---------- 2. berichten: herkomst bij elke aanvraag ---------- */

alter table public.contact_messages
  add column if not exists herkomst text check (herkomst is null or length(herkomst) <= 40),
  add column if not exists bron text check (bron is null or length(bron) <= 120),
  add column if not exists landingspagina text check (landingspagina is null or length(landingspagina) <= 200);

grant insert (herkomst, bron, landingspagina) on public.contact_messages to anon, authenticated;

/* ---------- 3. klanten en offertes: één vaste keuzelijst ---------- */

alter table public.klanten
  add column if not exists herkomst text
    check (herkomst is null or herkomst in ('google', 'ai', 'linkedin', 'verwijzing', 'partner', 'belbureau', 'anders')),
  add column if not exists herkomst_toelichting text check (herkomst_toelichting is null or length(herkomst_toelichting) <= 200);

alter table public.offertes
  add column if not exists herkomst text
    check (herkomst is null or herkomst in ('google', 'ai', 'linkedin', 'verwijzing', 'partner', 'belbureau', 'anders')),
  add column if not exists herkomst_toelichting text check (herkomst_toelichting is null or length(herkomst_toelichting) <= 200);

comment on column public.klanten.herkomst is 'Hoe deze klant ons vond; vaste sleutels uit lib/herkomst.ts. Verplicht bij een kaart met de hand (klantenActions.ts).';
comment on column public.offertes.herkomst is 'Hoe deze klant ons vond; gaat bij het aanmaken mee naar de kaart op het klantenbord.';

/*
 * klant_zeker (0041) krijgt twee parameters erbij, met standaardwaarde: de
 * aanroepen met zes argumenten (klant_gebeurtenis en de triggers van brochure,
 * contract, onboarding, opdracht en evaluatie) blijven zo werken. Eerst de
 * oude handtekening weg, anders ontstaat een tweede functie naast de eerste
 * en is elke aanroep dubbelzinnig.
 */
drop function if exists public.klant_zeker(text, text, text, text, text, text);

create or replace function public.klant_zeker(
  p_bedrijf text, p_contactpersoon text, p_email text, p_telefoon text, p_status text, p_bron text,
  p_herkomst text default null, p_herkomst_toelichting text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s text := public.bedrijf_sleutel(p_bedrijf);
  k uuid;
  nieuw boolean := false;
  h text := case when p_herkomst in ('google', 'ai', 'linkedin', 'verwijzing', 'partner', 'belbureau', 'anders') then p_herkomst end;
begin
  if s is null then return null; end if;
  select id into k from public.klanten where sleutel = s;
  if k is null then
    insert into public.klanten (bedrijf, contactpersoon, email, telefoon, status, bron, herkomst, herkomst_toelichting)
    values (left(btrim(p_bedrijf), 200), left(p_contactpersoon, 200), case when p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(left(p_email, 254)) end, left(p_telefoon, 40), coalesce(p_status, 'lead'), p_bron, h, left(p_herkomst_toelichting, 200))
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
    -- Lege velden op een bestaande kaart aanvullen uit de module; wat er al stond blijft staan.
    update public.klanten set
      contactpersoon = coalesce(contactpersoon, left(p_contactpersoon, 200)),
      email = coalesce(email, case when p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(left(p_email, 254)) end),
      telefoon = coalesce(telefoon, left(p_telefoon, 40)),
      herkomst = coalesce(herkomst, h),
      herkomst_toelichting = coalesce(herkomst_toelichting, case when herkomst is null then left(p_herkomst_toelichting, 200) end)
    where id = k and (contactpersoon is null or email is null or telefoon is null or herkomst is null);
  end if;
  return k;
end;
$$;

revoke all on function public.klant_zeker(text, text, text, text, text, text, text, text) from public, anon, authenticated;

-- De offerte geeft zijn herkomst mee bij het aanmaken van de kaart.
create or replace function public.klantenbord_offerte() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.klant_zeker(new.bedrijf, new.contactpersoon, new.email, new.telefoon, public.klant_status_uit_offerte(new.status), 'offerte', new.herkomst, new.herkomst_toelichting);
  elsif new.keuze_at is distinct from old.keuze_at and new.keuze_at is not null then
    -- De klant koos zelf onderdelen: geen gebeurtenis in offerte_gebeurtenissen, wel een contact.
    perform public.klant_gebeurtenis('offerte', new.id, null, new.bedrijf, new.contactpersoon, new.email, new.telefoon, new.nummer, 'gekozen', 'klant', null, new.keuze_at, 'offerte');
  end if;
  return null;
end;
$$;

-- Wordt de herkomst later op de offerte ingevuld, dan ook op de kaart, als die nog leeg is.
create or replace function public.klantenbord_offerte_herkomst() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.herkomst is null then return null; end if;
  update public.klanten
    set herkomst = new.herkomst, herkomst_toelichting = coalesce(herkomst_toelichting, left(new.herkomst_toelichting, 200))
    where sleutel = public.bedrijf_sleutel(new.bedrijf) and herkomst is null;
  return null;
end;
$$;

drop trigger if exists klantenbord_offerte_herkomst on public.offertes;
create trigger klantenbord_offerte_herkomst after update of herkomst on public.offertes for each row execute function public.klantenbord_offerte_herkomst();

revoke all on function public.klantenbord_offerte_herkomst() from public, anon, authenticated;
