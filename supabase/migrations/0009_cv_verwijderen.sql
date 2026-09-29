-- Cv's echt kunnen verwijderen.
--
-- De bucket `cvs` had een policy om te uploaden (iedereen) en om te lezen
-- (recht `postvak`), maar geen om te verwijderen. Supabase Storage meldt in dat
-- geval géén fout: `remove()` geeft een lege lijst terug en het bestand blijft
-- staan. De knop "Sollicitatie verwijderen" haalde daarna de rij weg — en dan
-- lijkt het cv gewist terwijl het nog in de opslag staat, zonder dat er nog
-- iets naar verwijst. Voor de AVG is dat erger dan niets doen.
--
-- De code controleert nu ook zelf of alle bestanden echt weg zijn voordat hij
-- de rij verwijdert (zie deleteApplication en bulkInbox), zodat dit nooit meer
-- stil mis kan gaan.
--
-- Controleer na het uitvoeren of er al cv's zijn blijven hangen: bestanden in
-- `cvs` waar geen sollicitatie meer naar verwijst.
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
