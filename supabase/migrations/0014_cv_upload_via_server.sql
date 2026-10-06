-- Het cv-formulier uploadt voortaan via de server met de service-role-sleutel
-- (src/lib/cvs.ts), ná de limiet per IP en de controle van type en grootte.
-- Daarmee kan de publieke sleutel uit de bucket: tot nu toe kon iedereen met
-- de anon-sleutel uit de browser onbeperkt bestanden in `cvs` zetten, buiten
-- elk formulier om.
--
-- PAS DRAAIEN ALS `SUPABASE_SERVICE_ROLE_KEY` IN VERCEL STAAT (production én
-- preview). Zonder die sleutel valt uploadCv() terug op de anon-sleutel, en
-- die mag na deze migratie niets meer: dan faalt elke sollicitatie met cv.
-- Het dashboard toont of de sleutel er is (controle "Collega's uitnodigen").

drop policy if exists "anyone upload cv" on storage.objects;
