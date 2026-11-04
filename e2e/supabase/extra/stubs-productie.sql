-- Alleen voor de testomgeving: functies die op productie bestaan maar niet in
-- de migraties staan (0016 verwijst ernaar). Leeg, zodat 0016 kan draaien.
create or replace function public.opruimen_verlopen_gegevens() returns void language sql as $$ select $$;
create or replace function public.force_submission_defaults() returns trigger language plpgsql as $$ begin return new; end $$;
