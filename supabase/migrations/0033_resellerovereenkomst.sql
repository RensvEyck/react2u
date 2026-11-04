-- De Resellerovereenkomst arbodienstverlening als tweede soort contract (Rens,
-- 4 nov 2026: "zorg dat we deze ook via de route digitaal kunnen laten
-- ondertekenen"). Dezelfde route als het basiscontract (0031): sales stuurt een
-- link, de partner leest de overeenkomst op /contract/<token>, vult de gegevens
-- van zijn kantoor in en tekent online met een code per mail.
--
-- - contracten.soort: 'basiscontract' (alle rijen van vóór deze migratie) of
--   'reseller'. Ligt vast bij het aanmaken.
-- - contracten.partner_id: de partner (0022) waar de overeenkomst bij hoort.
--   Interne administratie, geen onderdeel van wat er getekend is: daarom ook na
--   het tekenen te wijzigen (en leeg als de partner wordt verwijderd).
-- - Looptijd: een resellerovereenkomst "gaat in op de datum van ondertekening
--   en geldt voor onbepaalde tijd" (artikel 8.1). Geen einddatum dus, en de
--   ingangsdatum zet contract_ondertekenen op de dag van ondertekening.
-- - De reseller staat in de kop met zijn e-mailadres en telefoonnummer
--   (mededelingen gaan per e-mail, artikel 11.2): die vraagt de pagina erbij en
--   controleert de database bij het tekenen.
--
-- VOLGORDE: na 0031. Vóór de code: de nieuwe code leest `soort`. Zonder de
-- nieuwe code werkt het basiscontract gewoon door (de standaardwaarde).
--
-- Registreren: via apply_migration (naam 0033_resellerovereenkomst) vanzelf.

alter table public.contracten
  add column soort text not null default 'basiscontract' check (soort in ('basiscontract', 'reseller')),
  add column partner_id uuid references public.partners(id) on delete set null;
create index contracten_partner on public.contracten (partner_id) where partner_id is not null;

alter table public.contracten alter column ingangsdatum drop not null, alter column einddatum drop not null;
alter table public.contracten drop constraint contracten_looptijd;
alter table public.contracten add constraint contracten_looptijd check (
  (soort = 'basiscontract' and ingangsdatum is not null and einddatum is not null and einddatum > ingangsdatum)
  or (soort = 'reseller' and einddatum is null)
);

-- ---------------------------------------------------------------------------
-- Bewaken (zoals 0031), met twee aanvullingen: de soort ligt vast na het
-- aanmaken, en partner_id is vrij, ook na het tekenen.
-- ---------------------------------------------------------------------------
create or replace function public.contract_bewaken() returns trigger
language plpgsql set search_path = public
as $$
declare
  via_api boolean := current_user in ('authenticated', 'anon');
  vrij constant text[] := array['notitie', 'partner_id', 'updated_at', 'bekeken_at', 'laatst_bekeken_at', 'aantal_bekeken'];
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
      -- De ingangsdatum van een resellerovereenkomst is de dag van ondertekening.
      if new.soort = 'reseller' then new.ingangsdatum := null; end if;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.getekend_at := old.getekend_at; new.getekend_naam := old.getekend_naam; new.getekend_functie := old.getekend_functie;
      new.getekend_email := old.getekend_email; new.getekend_plaats := old.getekend_plaats; new.handtekening := old.handtekening;
      new.getekend_ip := old.getekend_ip; new.getekend_agent := old.getekend_agent;
      new.getekend_inhoud := old.getekend_inhoud; new.getekend_hash := old.getekend_hash;
      new.nummer := old.nummer;
      new.soort := old.soort;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      if new.soort = 'reseller' then new.ingangsdatum := old.ingangsdatum; end if;
    end if;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- De publieke kant: contract_bekijken geeft ook de soort, contract_ondertekenen
-- kent de reseller. Dezelfde handtekeningen als in 0031.
-- ---------------------------------------------------------------------------
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
      'status', c.status, 'soort', c.soort, 'nummer', c.nummer, 'bedrijf', c.bedrijf,
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
    'id', c.id, 'nummer', c.nummer, 'status', c.status, 'soort', c.soort,
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

-- Ondertekenen, zoals in 0031. Nieuw voor de reseller: het e-mailadres en het
-- telefoonnummer van het kantoor horen bij de gegevens (foutcodes
-- organisatie-email en organisatie-telefoon), en de ingangsdatum wordt de dag
-- van ondertekening (Nederlandse tijd). De vastgelegde inhoud noemt de soort.
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
  v_ingang date;
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
  if c.soort = 'reseller' then
    v_og := v_og || jsonb_strip_nulls(jsonb_build_object(
      'email', lower(nullif(btrim(p_opdrachtgever->>'email'), '')),
      'telefoon', nullif(btrim(p_opdrachtgever->>'telefoon'), '')
    ));
  end if;
  if coalesce(length(v_og->>'naam'), 0) not between 2 and 200 then return jsonb_build_object('ok', false, 'fout', 'organisatie-naam'); end if;
  if coalesce(length(v_og->>'adres'), 0) not between 3 and 200
    or coalesce(length(v_og->>'postcode'), 0) not between 4 and 12
    or coalesce(length(v_og->>'plaats'), 0) not between 2 and 100 then
    return jsonb_build_object('ok', false, 'fout', 'organisatie-adres');
  end if;
  if coalesce(v_og->>'kvk', '') !~ '^[0-9]{8}$' then return jsonb_build_object('ok', false, 'fout', 'organisatie-kvk'); end if;
  if c.soort = 'reseller' then
    if coalesce(length(v_og->>'email'), 0) > 254 or coalesce(v_og->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      return jsonb_build_object('ok', false, 'fout', 'organisatie-email');
    end if;
    if coalesce(length(v_og->>'telefoon'), 0) > 40 or length(regexp_replace(coalesce(v_og->>'telefoon', ''), '\D', '', 'g')) not between 8 and 15 then
      return jsonb_build_object('ok', false, 'fout', 'organisatie-telefoon');
    end if;
  end if;

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

  v_ingang := case when c.soort = 'reseller' then (nu at time zone 'Europe/Amsterdam')::date else c.ingangsdatum end;

  -- Wat er getekend is, los van latere wijzigingen: de soort, de tekst, beide
  -- partijen, de looptijd, wie tekende en hoe het e-mailadres is bevestigd.
  v_inhoud := jsonb_build_object(
    'nummer', c.nummer, 'soort', c.soort, 'bedrijf', c.bedrijf, 'contactpersoon', c.contactpersoon,
    'opdrachtnemer', c.opdrachtnemer, 'opdrachtgever', v_og,
    'offerte_kenmerk', c.offerte_kenmerk, 'ingangsdatum', v_ingang, 'einddatum', c.einddatum,
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
    status = 'getekend', opdrachtgever = v_og, ingangsdatum = v_ingang,
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

-- `create or replace` houdt de rechten van 0031; voor de zekerheid nog eens.
revoke execute on function public.contract_bewaken() from public, anon, authenticated;
revoke execute on function public.contract_bekijken(text, boolean) from public;
revoke execute on function public.contract_ondertekenen(text, text, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.contract_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.contract_ondertekenen(text, text, text, text, text, text, jsonb, text, text, text) to anon, authenticated;

-- Controle (verwacht: een resellerovereenkomst met einddatum geeft een fout op
-- contracten_looptijd; een basiscontract zonder einddatum ook):
--   begin;
--   insert into public.contracten (bedrijf, soort, ingangsdatum, einddatum, tekst)
--     values ('Test', 'reseller', current_date, current_date + 30, repeat('x', 120));  -- fout
--   rollback;
