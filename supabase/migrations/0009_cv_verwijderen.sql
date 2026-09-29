-- Verwijderrecht op de bucket `cvs`, vastgelegd in de repo.
--
-- In de migraties stond voor `cvs` alleen uploaden (iedereen) en lezen (recht
-- `postvak`). Volgens commit 2a27005 (augustus 2026) is de verwijderpolicy
-- toen rechtstreeks in de database gezet, zonder migratiebestand. Deze
-- migratie legt hem vast, zodat een nieuwe omgeving hem ook krijgt. Bestaat
-- hij live al onder een andere naam, dan kan een tweede policy geen kwaad:
-- policies voor dezelfde actie tellen als "of".
--
-- Waarom dit ertoe doet: zonder verwijderpolicy meldt Supabase Storage géén
-- fout. `remove()` geeft een lege lijst terug en het bestand blijft staan —
-- terwijl de sollicitatie daarna wél verdwijnt. De code controleert dat nu
-- zelf (removeCvs in src/app/admin/actions.ts), zodat het nooit stil mis kan
-- gaan, ongeacht wat er in de database staat.
--
-- Controle of er toch cv's zijn blijven hangen (bestanden waar geen
-- sollicitatie meer naar verwijst):
--
--   select o.name, o.created_at
--   from storage.objects o
--   where o.bucket_id = 'cvs'
--     and not exists (select 1 from public.applications a where a.cv_path = o.name)
--   order by o.created_at;

drop policy if exists "admin delete cvs" on storage.objects;
create policy "admin delete cvs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and public.has_perm('postvak'));
