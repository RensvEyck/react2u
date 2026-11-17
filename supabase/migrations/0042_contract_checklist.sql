-- De "Checklist arbeidsomstandigheden - inventarisatie" bij het basiscontract
-- (Rens, 17 nov 2026: "deze moet bij het contract komen, in dezelfde stijl" en
-- "in dezelfde stijl als het huidige contract gestuurd wordt via de admin").
-- Een vast onderdeel van elk basiscontract (0031), niet van een
-- resellerovereenkomst (0033): de klant krijgt hem op de contractpagina
-- (/contract/<token>/checklist) en als pdf bij de contractmail, vult hem online
-- in, en het beheer leest de antwoorden bij het contract.
--
-- - contract_checklists: één rij per contract met wat de klant invulde (de vijf
--   gegevens bovenaan het formulier en per onderdeel de actiepunten en afspraken
--   en de datum van afronding), wie het invulde en wanneer. De vragen zelf
--   staan in de code (src/lib/contractChecklist.ts), letterlijk uit het
--   Word-bestand; de tabel bewaart alleen de antwoorden, als platte sleutels.
-- - Schrijven kan alleen via contract_checklist_opslaan (security definer, het
--   token als sleutel), zoals onboarding_opslaan (0037); het beheer leest
--   (has_perm('bellijst')). Ook na het tekenen: de checklist hoort niet bij
--   wat er getekend is (geen deel van getekend_inhoud en de hash), en de datums
--   van afronding komen juist later.
-- - contract_gebeurtenissen krijgt de soort 'checklist' (ingevuld of
--   bijgewerkt); het klantenbord (0041) zet die als regel in de tijdlijn.
--
-- VOLGORDE: na 0041. Zonder deze migratie geeft /contract/<token>/checklist een
-- 404 en toont de contractpagina de checklist zonder antwoorden.
--
-- Registreren: via apply_migration (naam 0042_contract_checklist) vanzelf.

create table public.contract_checklists (
  contract_id uuid primary key references public.contracten(id) on delete cascade,
  -- De antwoorden als platte sleutels: plaats, bedrijf, datum, naam, functie en
  -- per onderdeel <id>_actie en <id>_datum (src/lib/contractChecklist.ts).
  data jsonb not null check (jsonb_typeof(data) = 'object' and length(data::text) <= 60000),
  -- Wie invulde: de naam bovenaan het formulier.
  door text check (length(door) <= 200),
  ingevuld_at timestamptz not null default now(),
  bijgewerkt_at timestamptz not null default now(),
  versie integer not null default 1
);

alter table public.contract_checklists enable row level security;
revoke all on public.contract_checklists from anon;
revoke insert, update, delete, truncate, references, trigger on public.contract_checklists from authenticated;
create policy "bellijst leest checklists" on public.contract_checklists
  for select to authenticated using (public.has_perm('bellijst'));

-- De tijdlijn kent een soort erbij.
alter table public.contract_gebeurtenissen drop constraint contract_gebeurtenissen_soort_check;
alter table public.contract_gebeurtenissen add constraint contract_gebeurtenissen_soort_check check (soort in (
  'aangemaakt', 'gewijzigd', 'verstuurd', 'herinnering', 'bekeken', 'code', 'getekend', 'ingetrokken', 'heropend', 'checklist'
));

-- ---------------------------------------------------------------------------
-- De publieke kant: twee functies met het token als sleutel.
-- ---------------------------------------------------------------------------

-- Wat de klant van zijn checklist te zien krijgt: de antwoorden, wie en wanneer.
-- Null als er nog niets is ingevuld, en voor een concept, een ingetrokken
-- contract, een onbekend token of een resellerovereenkomst.
create or replace function public.contract_checklist_bekijken(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c public.contracten;
  k public.contract_checklists;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return null; end if;
  select * into c from public.contracten where token = p_token;
  if not found or c.status in ('concept', 'ingetrokken') or c.soort <> 'basiscontract' then return null; end if;
  select * into k from public.contract_checklists where contract_id = c.id;
  if not found then return null; end if;
  return jsonb_build_object(
    'data', k.data, 'door', k.door, 'ingevuld_at', k.ingevuld_at, 'bijgewerkt_at', k.bijgewerkt_at, 'versie', k.versie
  );
end
$$;

-- De klant vult de checklist in, of past hem aan. De vorm van p_data
-- controleert Next (src/lib/contractChecklist.ts); hier alleen of het mag en
-- hoe groot het is. Geeft {ok: true, eerste} of {ok: false, fout: '<code>'}
-- (de codes staan in CHECKLIST_FOUT).
create or replace function public.contract_checklist_opslaan(p_token text, p_data jsonb, p_naam text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c public.contracten;
  eerste boolean;
  v_naam text := left(nullif(btrim(coalesce(p_naam, '')), ''), 200);
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48,}$' then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  select * into c from public.contracten where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'fout', 'onbekend'); end if;
  if c.status = 'concept' then return jsonb_build_object('ok', false, 'fout', 'concept'); end if;
  if c.status = 'ingetrokken' then return jsonb_build_object('ok', false, 'fout', 'gesloten'); end if;
  if c.soort <> 'basiscontract' then return jsonb_build_object('ok', false, 'fout', 'document'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 60000 then
    return jsonb_build_object('ok', false, 'fout', 'invoer');
  end if;

  eerste := not exists (select 1 from public.contract_checklists where contract_id = c.id);
  insert into public.contract_checklists as k (contract_id, data, door)
    values (c.id, p_data, v_naam)
    on conflict (contract_id) do update set
      data = excluded.data, door = coalesce(excluded.door, k.door), bijgewerkt_at = now(), versie = k.versie + 1;
  insert into public.contract_gebeurtenissen (contract_id, soort, door, details)
    values (c.id, 'checklist', v_naam, jsonb_build_object('opnieuw', not eerste));

  return jsonb_build_object('ok', true, 'eerste', eerste);
end
$$;

revoke execute on function public.contract_checklist_bekijken(text) from public;
revoke execute on function public.contract_checklist_opslaan(text, jsonb, text) from public;
grant execute on function public.contract_checklist_bekijken(text) to anon, authenticated;
grant execute on function public.contract_checklist_opslaan(text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Het klantenbord (0041): de nieuwe soort als regel in de tijdlijn van de
-- klant. Dezelfde functie als in 0041, met alleen de regel voor 'checklist'
-- erbij; wie deze functie later wijzigt, neemt die regel mee.
-- ---------------------------------------------------------------------------
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
    when 'checklist' then
      tekst := 'Checklist arbeidsomstandigheden ' || case when coalesce((p_details->>'opnieuw')::boolean, false) then 'bijgewerkt' else 'ingevuld' end || ' (' || lower(left(naam, 1)) || substr(naam, 2) || ')';
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

-- Controle (verwacht: als anon een fout op de tabel, de functie met een
-- onbekend token null):
--   set local role anon; select * from public.contract_checklists;  -- permission denied
--   select public.contract_checklist_bekijken(repeat('0', 64));  -- null
