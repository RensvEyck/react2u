-- Offertevormen (bouwt op 0024): naast verzuimbegeleiding ook de RI&E, het
-- PAGO, de verzuimtraining, spoor 2, het werkfittraject en het
-- arbeidsdeskundig onderzoek. Elke vorm heeft zijn eigen verhaal, prijsregels,
-- voorwaarden en geldigheid; die staan als sjabloon klaar.
--
-- - offertes krijgt:
--   vorm         welke van de zeven vormen (label en filter in het beheer);
--   betreft      waar het om gaat, bijvoorbeeld de werknemer bij spoor 2 of de
--                locatie bij een RI&E (geen medische informatie);
--   inhoud       de uitleg van de dienst in mini-markdown (## kop, ### tussenkop,
--                alinea's, - lijst, 1. genummerd, > uitgangspunt, **vet**);
--   voorwaarden  facturatie, betalingstermijn, annulering (zelfde opmaak);
--   vervolg      de stappen onder "Zo gaat het verder": [{kop, tekst}].
--   Bij ondertekening gaan ook deze velden mee in getekend_inhoud (en dus in
--   de hash): de voorwaarden zijn onderdeel van wat er getekend is.
-- - offerte_sjablonen: sjablonen die het team zelf aanpaste of toevoegde
--   ("Bewaar als sjabloon" bij een offerte). De standaardsjablonen staan in de
--   code (src/lib/offerteSjablonen.ts); een rij hier met dezelfde sleutel
--   vervangt de standaard, "Terug naar standaard" verwijdert hem weer.
--
-- Rechten: offerte_sjablonen achter has_perm('bellijst'), net als offertes.
--
-- VOLGORDE: na 0024. Kan vóór of na de code: zonder deze migratie kan de
-- nieuwe code niet opslaan (de kolommen ontbreken) en zegt het beheer dat.
--
-- Registreren: via apply_migration (naam 0025_offertevormen) vanzelf.

alter table public.offertes
  add column vorm text not null default 'verzuimbegeleiding'
    check (vorm in ('verzuimbegeleiding', 'rie', 'pago', 'verzuimtraining', 'spoor2', 'werkfit', 'arbeidsdeskundig')),
  add column betreft text check (length(betreft) <= 200),
  add column inhoud text check (length(inhoud) <= 30000),
  add column voorwaarden text check (length(voorwaarden) <= 10000),
  add column vervolg jsonb check (vervolg is null or (jsonb_typeof(vervolg) = 'array' and jsonb_array_length(vervolg) <= 6));
create index offertes_vorm on public.offertes (vorm);

create table public.offerte_sjablonen (
  sleutel text primary key check (sleutel ~ '^[a-z0-9-]{2,40}$'),
  vorm text not null
    check (vorm in ('verzuimbegeleiding', 'rie', 'pago', 'verzuimtraining', 'spoor2', 'werkfit', 'arbeidsdeskundig')),
  naam text not null check (length(btrim(naam)) between 1 and 120),
  omschrijving text check (length(omschrijving) <= 300),
  titel text not null check (length(btrim(titel)) between 1 and 200),
  intro text check (length(intro) <= 5000),
  inhoud text check (length(inhoud) <= 30000),
  voorwaarden text check (length(voorwaarden) <= 10000),
  regels jsonb not null default '[]' check (jsonb_typeof(regels) = 'array' and jsonb_array_length(regels) <= 200),
  vervolg jsonb check (vervolg is null or (jsonb_typeof(vervolg) = 'array' and jsonb_array_length(vervolg) <= 6)),
  geldig_dagen integer not null default 30 check (geldig_dagen between 1 and 365),
  updated_at timestamptz not null default now(),
  -- E-mailadres van wie hem het laatst opsloeg.
  updated_by text
);

alter table public.offerte_sjablonen enable row level security;
revoke all on public.offerte_sjablonen from anon;
create policy "bellijst beheert offertesjablonen" on public.offerte_sjablonen
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

-- De klantpagina krijgt de nieuwe velden erbij; verder gelijk aan 0024.
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
    'verstuurd_at', o.verstuurd_at, 'keuze', o.keuze,
    'getekend_at', o.getekend_at, 'getekend_naam', o.getekend_naam, 'getekend_functie', o.getekend_functie,
    'getekend_email', o.getekend_email, 'handtekening', o.handtekening,
    'getekend_inhoud', o.getekend_inhoud, 'getekend_hash', o.getekend_hash,
    'afgewezen_at', o.afgewezen_at,
    'verlopen', o.geldig_tot is not null and o.geldig_tot < (now() at time zone 'Europe/Amsterdam')::date,
    'eerste_keer', eerste
  );
end
$$;

-- Ondertekenen: de vastgelegde inhoud bevat nu ook betreft, inhoud,
-- voorwaarden, vervolg en vorm. Verder gelijk aan 0024.
create or replace function public.offerte_ondertekenen(
  p_token text, p_keuze jsonb, p_naam text, p_functie text, p_email text,
  p_handtekening text, p_ip text default null, p_agent text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.offertes;
  eff jsonb;
  -- v_: de kolom heet sinds deze migratie ook inhoud; zonder voorvoegsel is de verwijzing dubbelzinnig.
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

  eff := public.offerte_effectieve_keuze(o.regels, p_keuze);
  if eff is null then return jsonb_build_object('ok', false, 'fout', 'keuze'); end if;

  v_inhoud := jsonb_build_object(
    'nummer', o.nummer, 'vorm', o.vorm, 'bedrijf', o.bedrijf, 'contactpersoon', o.contactpersoon, 'medewerkers', o.medewerkers,
    'titel', o.titel, 'betreft', o.betreft, 'intro', o.intro, 'inhoud', o.inhoud, 'voorwaarden', o.voorwaarden, 'vervolg', o.vervolg,
    'regels', o.regels, 'keuze', eff, 'geldig_tot', o.geldig_tot,
    'afzender_naam', o.afzender_naam, 'afzender_email', o.afzender_email, 'verstuurd_at', o.verstuurd_at,
    'getekend_naam', p_naam, 'getekend_functie', p_functie, 'getekend_email', p_email,
    'getekend_at', nu
  );
  v_hash := encode(sha256(convert_to(v_inhoud::text, 'UTF8')), 'hex');

  update public.offertes set
    status = 'getekend', keuze = eff, keuze_at = nu,
    getekend_at = nu, getekend_naam = p_naam, getekend_functie = p_functie, getekend_email = p_email,
    handtekening = p_handtekening, getekend_ip = left(p_ip, 64), getekend_agent = left(p_agent, 400),
    getekend_inhoud = v_inhoud, getekend_hash = v_hash
  where id = o.id;
  insert into public.offerte_gebeurtenissen (offerte_id, soort, door, details)
    values (o.id, 'getekend', p_naam, jsonb_build_object('hash', v_hash, 'email', p_email, 'functie', p_functie));

  return jsonb_build_object('ok', true, 'id', o.id, 'nummer', o.nummer, 'hash', v_hash, 'getekend_at', nu);
end
$$;

-- create or replace houdt de rechten van 0024; voor de zekerheid nog eens.
revoke execute on function public.offerte_bekijken(text, boolean) from public;
revoke execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.offerte_bekijken(text, boolean) to anon, authenticated;
grant execute on function public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, text) to anon, authenticated;
