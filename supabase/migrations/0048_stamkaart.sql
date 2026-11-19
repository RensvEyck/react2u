-- Klantenlijst en stamkaart (Rens, 19 nov 2026: "maak in het klantenbord een
-- knop naar alle klanten onder elkaar. bedrijfsinformatie als stamkaart,
-- documenten en tariefafspraken"). Naar het voorbeeld van een inlenerslijst in
-- een uitzendplatform: één lijst met alle klanten, per klant een stamkaart met
-- de bedrijfsgegevens, alle documenten uit de modules bij elkaar, en wat er aan
-- tarieven is afgesproken.
--
-- 1. `klanten` krijgt de stamkaartvelden: KvK, rechtsvorm, branche en SBI,
--    website en algemeen nummer en adres, bezoek- en postadres, de functie van
--    de contactpersoon, facturatie (factuur-e-mail, btw, IBAN met
--    tenaamstelling, debiteurnummer), de bevoegd ondertekenaar, het aantal
--    werknemers en de casemanager. De bestaande `contactpersoon`, `telefoon` en
--    `email` blijven die van de contactpersoon (zo staan ze op de kaart). Wat
--    de modules al weten (offerte, contract, onboarding, bellijst) vult het
--    beheer als voorstel in; niemand hoeft dubbel te typen (lib/stamkaart.ts).
-- 2. `klant_tarieven`: afwijkende tariefafspraken, buiten de prijslijst om.
--    Vrije regels met omschrijving, bedrag en eenheid (dezelfde eenheden als
--    een offerteregel), het label (Recover, Resist, …), een ingangs- en
--    einddatum. Wat in een getekende offerte of losse opdracht staat, komt niet
--    hier maar wordt op de stamkaart uit die modules getoond.
-- 3. Eigen bestanden bij een klant: bucket `klantbestanden` (privé, tot 20 MB,
--    pdf, Word, Excel en afbeeldingen) en tabel `klant_bestanden`, zoals de
--    partnerbestanden (0034). Pad: <klant_id>/<tijdstempel>-<naam>. Het beheer
--    uploadt vanuit de browser met de eigen sessie; downloaden via
--    /admin/klantbestand/<id>, dat het bestand zelf uitlevert.
-- 4. De tijdlijn kent de soort `stamkaart` (wat er aan de stamkaart veranderde
--    en waar het vandaan kwam); geen contact, zoals status en import.
--
-- Rechten: alles achter has_perm('bellijst'), het salesrecht, net als het bord.
--
-- VOLGORDE: na 0047 (herkomst). Zonder deze migratie meldt /admin/klanten dat.
--
-- Registreren: via apply_migration (naam 0048_stamkaart) vanzelf.

/* ---------- 1. de stamkaart ---------- */

alter table public.klanten
  add column kvk text check (kvk is null or kvk ~ '^[0-9]{8}$'),
  add column rechtsvorm text check (length(rechtsvorm) <= 60),
  add column branche text check (length(branche) <= 120),
  add column sbi text check (length(sbi) <= 60),
  add column website text check (length(website) <= 200),
  add column algemeen_telefoon text check (length(algemeen_telefoon) <= 40),
  add column algemeen_email text check (algemeen_email is null or (length(algemeen_email) <= 254 and algemeen_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column bezoekadres text check (length(bezoekadres) <= 200),
  add column bezoek_postcode text check (length(bezoek_postcode) <= 12),
  add column bezoek_plaats text check (length(bezoek_plaats) <= 100),
  add column postadres text check (length(postadres) <= 200),
  add column post_postcode text check (length(post_postcode) <= 12),
  add column post_plaats text check (length(post_plaats) <= 100),
  add column contact_functie text check (length(contact_functie) <= 120),
  add column factuur_email text check (factuur_email is null or (length(factuur_email) <= 254 and factuur_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column btw text check (length(btw) <= 30),
  add column iban text check (length(iban) <= 40),
  add column iban_naam text check (length(iban_naam) <= 120),
  add column debiteurnummer text check (length(debiteurnummer) <= 40),
  add column ondertekenaar text check (length(ondertekenaar) <= 200),
  add column ondertekenaar_functie text check (length(ondertekenaar_functie) <= 120),
  add column medewerkers integer check (medewerkers is null or medewerkers between 0 and 100000),
  add column casemanager text check (length(casemanager) <= 120);

-- De tijdlijn: een regel per wijziging van de stamkaart, geen contact.
alter table public.klant_gesprekken drop constraint klant_gesprekken_soort_check;
alter table public.klant_gesprekken add constraint klant_gesprekken_soort_check
  check (soort in ('gesprek', 'mail', 'bezoek', 'notitie', 'status', 'import', 'systeem', 'stamkaart'));

/* ---------- 2. afwijkende tariefafspraken ---------- */

create table public.klant_tarieven (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten(id) on delete cascade,
  -- Het label waar de afspraak bij hoort (lib/offerteMerk.ts), of leeg.
  label text check (label is null or label in ('recover', 'resist', 'restart', 'reflex', 'ready', 'reward')),
  omschrijving text not null check (length(btrim(omschrijving)) between 1 and 300),
  -- Exclusief btw; leeg is "op aanvraag" of een afspraak zonder bedrag.
  bedrag numeric(10, 2) check (bedrag is null or bedrag between 0 and 10000000),
  -- Dezelfde eenheden als een offerteregel (lib/offertes.ts, EENHEDEN).
  eenheid text not null default 'eenmalig'
    check (eenheid in ('medewerker_jaar', 'jaar', 'maand', 'eenmalig', 'medewerker', 'traject', 'uur', 'stuk', 'op_aanvraag')),
  ingangsdatum date,
  einddatum date check (einddatum is null or ingangsdatum is null or einddatum >= ingangsdatum),
  notitie text check (length(notitie) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index klant_tarieven_klant on public.klant_tarieven (klant_id, ingangsdatum desc nulls last, created_at desc);

create trigger klant_tarieven_updated before update on public.klant_tarieven
  for each row execute function public.set_updated_at();

alter table public.klant_tarieven enable row level security;
revoke all on public.klant_tarieven from anon;
create policy "bellijst beheert klanttarieven" on public.klant_tarieven
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

/* ---------- 3. eigen bestanden ---------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'klantbestanden', 'klantbestanden', false, 20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/heic', 'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "bellijst leest klantbestanden" on storage.objects
  for select to authenticated using (bucket_id = 'klantbestanden' and public.has_perm('bellijst'));
create policy "bellijst uploadt klantbestanden" on storage.objects
  for insert to authenticated with check (bucket_id = 'klantbestanden' and public.has_perm('bellijst'));
create policy "bellijst verwijdert klantbestanden" on storage.objects
  for delete to authenticated using (bucket_id = 'klantbestanden' and public.has_perm('bellijst'));

create table public.klant_bestanden (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten(id) on delete cascade,
  -- Het pad in de bucket; begint altijd met de klant.
  pad text not null unique check (length(pad) <= 400),
  naam text not null check (length(btrim(naam)) between 1 and 255),
  grootte bigint check (grootte is null or grootte between 0 and 20971520),
  type text check (length(type) <= 120),
  -- Een getekend stuk (contract, offerte, machtiging op papier), correspondentie, of iets anders.
  soort text not null default 'overig' check (soort in ('overeenkomst', 'correspondentie', 'overig')),
  omschrijving text check (length(omschrijving) <= 300),
  geupload_door text check (length(geupload_door) <= 254),
  created_at timestamptz not null default now(),
  constraint klant_bestanden_pad check (split_part(pad, '/', 1) = klant_id::text)
);
create index klant_bestanden_klant on public.klant_bestanden (klant_id, created_at desc);

alter table public.klant_bestanden enable row level security;
revoke all on public.klant_bestanden from anon;
create policy "bellijst beheert klantbestanden" on public.klant_bestanden
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

-- Controle (verwacht: als anon een fout, en een pad buiten de klant geweigerd):
--   set local role anon; select * from public.klant_bestanden;  -- permission denied
--   insert into public.klant_bestanden (klant_id, pad, naam) values ((select id from public.klanten limit 1), 'iemand-anders/x.pdf', 'x.pdf');  -- klant_bestanden_pad
