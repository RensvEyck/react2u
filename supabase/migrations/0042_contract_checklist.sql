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
--   bijgewerkt); het klantenbord zet die als regel in de tijdlijn, via de tak
--   'checklist' in klant_gebeurtenis (die staat in 0043, zie onderaan).
--
-- VOLGORDE: na 0041; vóór of na 0043 maakt niet uit (deze migratie raakt
-- klant_gebeurtenis niet aan). Zonder deze migratie geeft
-- /contract/<token>/checklist een 404 en toont de contractpagina de checklist
-- zonder antwoorden.
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
-- Het klantenbord: de regel "Checklist arbeidsomstandigheden ingevuld" in de
-- tijdlijn van de klant staat als tak 'checklist' in public.klant_gebeurtenis,
-- en die functie wordt hier bewust NIET vervangen. De laatste versie staat in
-- 0043_klantevaluatie.sql (die ook de bron 'evaluatie' kent) en bevat de tak
-- al. 0043 stond eerder op productie dan deze migratie; een kopie hier zou de
-- tak 'evaluatie' daar weer weghalen. Wie klant_gebeurtenis later wijzigt,
-- neemt de tak 'checklist' mee.
-- ---------------------------------------------------------------------------

-- Controle (verwacht: als anon een fout op de tabel, de functie met een
-- onbekend token null):
--   set local role anon; select * from public.contract_checklists;  -- permission denied
--   select public.contract_checklist_bekijken(repeat('0', 64));  -- null
