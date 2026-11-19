-- Prognose van de werkdruk (Rens, 19 nov 2026: "Zouden we een soort van
-- prognosetool kunnen inbouwen, waarin we op basis van het aantal medewerkers
-- een indicatie kunnen showen van de werkdruk die er de komende periode aankomt?
-- [...] dan kunnen we ook gericht sturen op het aantal medewerkers dat we nodig
-- hebben", en: "neem ook de weekevaluatie van werknemers hierin mee").
--
-- De prognose rekent met wat er al is: het aantal werknemers op de stamkaart
-- (klanten.medewerkers, 0048) en op de offerte (offertes.medewerkers), de
-- startdatum op de kaart, de ingangsdatum van het contract, de pijplijn met de
-- eigen hitrate, de contracturen van de casemanagers (0035) en de
-- weekevaluaties (0044). De regels staan in src/lib/prognose.ts. Dit voegt toe:
--
-- 1. offertes.ingangsdatum: wanneer de dienstverlening start. Zonder deze datum
--    rekent de prognose met de startdatum op de kaart, het contract, of de
--    datum van tekenen plus een vaste inrichtingstijd. Het is planning, geen
--    getekende afspraak: daarom mag hij ook na het tekenen nog verschuiven, en
--    staat hij in offerte_bewaken bij de vrije velden (naast notitie). De rest
--    van offerte_bewaken is ongewijzigd ten opzichte van 0024.
-- 2. prognose_normen: één rij met de normen die Rens instelt (werknemers per
--    fte casemanager, uren per week, inrichtingsuren per nieuwe klant, uren per
--    eenmalige dienst, wervingstijd, kans op de pijplijn). Leeg betekent: reken
--    het uit of laat het weg; de standaarden staan in code.
--
-- Rechten: prognose_normen alleen met has_perm('omzet'), net als de omzet en de
-- uren. De ingangsdatum schrijft het salesrecht, net als de rest van de offerte.
--
-- VOLGORDE: na 0048.
--
-- Registreren: via apply_migration (naam 0049_prognose) vanzelf.

/* ---------- 1. de ingangsdatum op de offerte ---------- */

alter table public.offertes add column ingangsdatum date;

create or replace function public.offerte_bewaken() returns trigger
language plpgsql set search_path = public
as $$
declare
  via_api boolean := current_user in ('authenticated', 'anon');
  vrij constant text[] := array['notitie', 'ingangsdatum', 'updated_at', 'bekeken_at', 'laatst_bekeken_at', 'aantal_bekeken'];
begin
  if tg_op = 'DELETE' then
    if old.status = 'getekend' then
      raise exception 'Een getekende offerte kan niet worden verwijderd' using errcode = 'P0001', hint = 'offerte-getekend';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status = 'getekend' then
    if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij) then
      raise exception 'Een getekende offerte kan niet meer worden gewijzigd' using errcode = 'P0001', hint = 'offerte-getekend';
    end if;
    if via_api then
      new.bekeken_at := old.bekeken_at;
      new.laatst_bekeken_at := old.laatst_bekeken_at;
      new.aantal_bekeken := old.aantal_bekeken;
    end if;
    return new;
  end if;

  if via_api then
    if new.status in ('getekend', 'afgewezen') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Alleen de klant kan tekenen of afwijzen' using errcode = 'P0001', hint = 'offerte-klant';
    end if;
    if tg_op = 'INSERT' then
      new.bekeken_at := null; new.laatst_bekeken_at := null; new.aantal_bekeken := 0;
      new.keuze := null; new.keuze_at := null;
      new.getekend_at := null; new.getekend_naam := null; new.getekend_functie := null; new.getekend_email := null;
      new.handtekening := null; new.getekend_ip := null; new.getekend_agent := null;
      new.getekend_inhoud := null; new.getekend_hash := null;
      new.afgewezen_at := null; new.afgewezen_reden := null;
    else
      new.bekeken_at := old.bekeken_at; new.laatst_bekeken_at := old.laatst_bekeken_at; new.aantal_bekeken := old.aantal_bekeken;
      new.keuze := old.keuze; new.keuze_at := old.keuze_at;
      new.getekend_at := old.getekend_at; new.getekend_naam := old.getekend_naam; new.getekend_functie := old.getekend_functie;
      new.getekend_email := old.getekend_email; new.handtekening := old.handtekening; new.getekend_ip := old.getekend_ip;
      new.getekend_agent := old.getekend_agent; new.getekend_inhoud := old.getekend_inhoud; new.getekend_hash := old.getekend_hash;
      -- Heropenen na een afwijzing mag (status terug naar verstuurd of concept): dan gaat de afwijzing weg.
      if old.status = 'afgewezen' and new.status <> 'afgewezen' then
        new.afgewezen_at := null; new.afgewezen_reden := null;
      else
        new.afgewezen_at := old.afgewezen_at; new.afgewezen_reden := old.afgewezen_reden;
      end if;
      new.nummer := old.nummer;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end
$$;

/* ---------- 2. de normen ---------- */

create table public.prognose_normen (
  id boolean primary key default true check (id),
  normen jsonb not null default '{}'::jsonb check (jsonb_typeof(normen) = 'object' and pg_column_size(normen) <= 8000),
  door text check (length(door) <= 254),
  updated_at timestamptz not null default now()
);

create trigger prognose_normen_updated before update on public.prognose_normen
  for each row execute function public.set_updated_at();

alter table public.prognose_normen enable row level security;
revoke all on public.prognose_normen from anon;

create policy "omzet leest en zet de normen" on public.prognose_normen
  for all to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
