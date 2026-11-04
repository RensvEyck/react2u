-- Bestanden bij een partner (Rens, 4 nov 2026: "er is een losse resell
-- overeenkomst verstuurd zorg dat je ook een upload vak hebt van bestanden").
-- Voor een resellerovereenkomst die buiten de online route om is verstuurd en
-- getekend (pdf of scan), en voor andere stukken van het kantoor.
--
-- - Bucket `partnerbestanden`: privé, tot 20 MB per bestand, alleen pdf,
--   Word en afbeeldingen. Pad: <partner_id>/<tijdstempel>-<naam>. Het beheer
--   uploadt vanuit de browser met de eigen sessie (geen limiet van een server
--   action); downloaden gaat via /admin/partnerbestand/<id>, dat het bestand
--   zelf uitlevert als download (zoals de cv-route), nooit met een deelbare link.
-- - partner_bestanden: wat er bij een partner hoort, met de soort
--   ('overeenkomst' is een getekende resellerovereenkomst, 'overig' de rest),
--   de datum van ondertekening en wie het uploadde.
--
-- Rechten: alles achter has_perm('bellijst'), het salesrecht, net als partners
-- (0022) en contracten (0031).
--
-- VOLGORDE: na 0022 (partners). Zonder deze migratie toont het partnerscherm
-- een melding in plaats van het uploadvak.
--
-- Registreren: via apply_migration (naam 0034_partnerbestanden) vanzelf.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partnerbestanden', 'partnerbestanden', false, 20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'image/heic', 'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "bellijst leest partnerbestanden" on storage.objects
  for select to authenticated using (bucket_id = 'partnerbestanden' and public.has_perm('bellijst'));
create policy "bellijst uploadt partnerbestanden" on storage.objects
  for insert to authenticated with check (bucket_id = 'partnerbestanden' and public.has_perm('bellijst'));
create policy "bellijst verwijdert partnerbestanden" on storage.objects
  for delete to authenticated using (bucket_id = 'partnerbestanden' and public.has_perm('bellijst'));

create table public.partner_bestanden (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  -- Het pad in de bucket; begint altijd met de partner.
  pad text not null unique check (length(pad) <= 400),
  naam text not null check (length(btrim(naam)) between 1 and 255),
  grootte bigint check (grootte is null or grootte between 0 and 20971520),
  type text check (length(type) <= 120),
  soort text not null default 'overig' check (soort in ('overeenkomst', 'overig')),
  getekend_op date,
  notitie text check (length(notitie) <= 1000),
  geupload_door text check (length(geupload_door) <= 254),
  created_at timestamptz not null default now(),
  constraint partner_bestanden_pad check (split_part(pad, '/', 1) = partner_id::text)
);
create index partner_bestanden_partner on public.partner_bestanden (partner_id, created_at desc);

alter table public.partner_bestanden enable row level security;
revoke all on public.partner_bestanden from anon;
create policy "bellijst beheert partnerbestanden" on public.partner_bestanden
  for all to authenticated using (public.has_perm('bellijst')) with check (public.has_perm('bellijst'));

-- Controle (verwacht: als anon een fout, en een pad buiten de partner geweigerd):
--   set local role anon; select * from public.partner_bestanden;  -- permission denied
--   insert into public.partner_bestanden (partner_id, pad, naam) values ((select id from public.partners limit 1), 'iemand-anders/x.pdf', 'x.pdf');  -- partner_bestanden_pad
