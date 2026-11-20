-- Klantenbord: een kaart aan een reseller of partner koppelen (Rens, 20 nov
-- 2026: "zorg dat de klanten ook gelinked kunnen worden aan een reseller in
-- het klantenbord").
--
-- `klanten.partner_id` wijst naar de partnermodule (0022: accountants en
-- resellers met een partnercode). Twee wegen:
-- - met de hand, in het zijpaneel van de kaart (keuzelijst van partners);
-- - vanzelf: een klant die bij een partner wordt aangemeld (partner_klanten)
--   krijgt een kaart als die er nog niet is (dezelfde bedrijfsnaam zonder
--   rechtsvorm, zoals de andere modules via klant_zeker) in de kolom Klant,
--   de partner erbij als er nog geen stond, en een regel in de tijdlijn.
-- Wat er al in partner_klanten staat wordt hieronder één keer ingelezen.
--
-- VOLGORDE: na 0051.

alter table public.klanten add column partner_id uuid references public.partners(id) on delete set null;
create index klanten_partner on public.klanten (partner_id) where partner_id is not null;

alter table public.klant_gesprekken drop constraint klant_gesprekken_bron_check;
alter table public.klant_gesprekken add constraint klant_gesprekken_bron_check
  check (bron in ('offerte', 'brochure', 'contract', 'onboarding', 'opdracht', 'evaluatie', 'partner'));

/** Eén aanmelding bij een partner op het bord: de kaart, de partner erbij en de tijdlijn. */
create or replace function public.klantenbord_partner_klant_op_bord(pk public.partner_klanten) returns void
language plpgsql security definer set search_path = public
as $$
declare
  k uuid;
  p public.partners;
  regel text;
begin
  select * into p from public.partners where id = pk.partner_id;
  if not found then return; end if;
  k := public.klant_zeker(pk.bedrijf, null, null, null, 'klant', 'partner', 'partner', p.kantoor);
  if k is null then return; end if;
  update public.klanten set partner_id = pk.partner_id where id = k and partner_id is null;
  if pk.eind is null or pk.eind >= current_date then
    perform public.klant_vooruit(k, 'klant', 'aangemeld via ' || p.kantoor);
  end if;
  regel := 'Aangemeld via ' || p.kantoor || ': ' || pk.medewerkers || ' medewerkers, start ' || to_char(pk.start, 'DD-MM-YYYY')
    || case when pk.eind is not null then ', tot ' || to_char(pk.eind, 'DD-MM-YYYY') else '' end;
  insert into public.klant_gesprekken (klant_id, soort, op, tekst, door, contact, bron, bron_id, created_at)
  select k, 'systeem', pk.start, left(regel, 5000), 'automatisch', false, 'partner', pk.partner_id, greatest(pk.start::timestamptz, pk.created_at)
  where not exists (
    select 1 from public.klant_gesprekken g where g.klant_id = k and g.bron = 'partner' and g.bron_id = pk.partner_id and g.tekst like 'Aangemeld via %'
  );
end;
$$;

create or replace function public.klantenbord_partner_klant() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.klantenbord_partner_klant_op_bord(new);
  return null;
end;
$$;

create trigger klantenbord_partner_klant after insert on public.partner_klanten
  for each row execute function public.klantenbord_partner_klant();

-- Wat er al bij partners is aangemeld, op volgorde van start.
do $$
declare r public.partner_klanten;
begin
  for r in select * from public.partner_klanten order by start, created_at loop
    perform public.klantenbord_partner_klant_op_bord(r);
  end loop;
end;
$$;
