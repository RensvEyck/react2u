-- Rechten op SECURITY DEFINER-functies: alleen wie ze nodig heeft.
--
-- De Supabase-advisors (oktober 2026) meldden vijf functies die anon en
-- authenticated via /rest/v1/rpc/ konden aanroepen. Supabase geeft nieuwe
-- functies in public standaard EXECUTE voor PUBLIC (en dus voor anon en
-- authenticated); een security definer-functie draait daarbij met de rechten
-- van de eigenaar, langs RLS. Per functie bekeken wie hem echt aanroept:
--
--   opruimen_verlopen_gegevens  alleen pg_cron (job 'opruimen-verlopen-gegevens',
--                               draait als postgres, de eigenaar). Niemand via de API.
--   assert_admin_remains        triggerfunctie (admins, roles). Een trigger vuurt
--   force_submission_defaults   ongeacht EXECUTE-rechten van de aanroeper: die
--   record_revision             worden alleen bij `create trigger` gecontroleerd.
--   is_admin                    alleen in de policy "read roles" (to authenticated).
--                               Geen enkele anon-policy gebruikt hem.
--   has_perm                    in de policies "public read pages/blocks/posts/
--                               vacancies" (`published or has_perm(...)`), die voor
--                               de rol public gelden en dus ook door anon worden
--                               geëvalueerd. anon MOET hem kunnen aanroepen; anders
--                               geeft elke publieke pagina "permission denied".
--                               De advisor blijft deze dus melden; dat is bewust.
--
-- Herhaalbaar: revoke en grant zijn idempotent; record_revision bestaat pas na
-- migratie 0008, vandaar de controle.

revoke execute on function public.opruimen_verlopen_gegevens() from public, anon, authenticated;
revoke execute on function public.assert_admin_remains() from public, anon, authenticated;
revoke execute on function public.force_submission_defaults() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.record_revision()') is not null then
    revoke execute on function public.record_revision() from public, anon, authenticated;
  end if;
end
$$;

-- Ingelogde beheerders houden is_admin(); de publieke sleutel niet.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- has_perm(): weg bij PUBLIC, expliciet voor de twee rollen die hem nodig hebben.
revoke execute on function public.has_perm(text) from public;
grant execute on function public.has_perm(text) to anon, authenticated;

-- postgres (eigenaar) en service_role houden hun bestaande, expliciete rechten.

-- Controle:
--   select p.proname, string_agg(rp.grantee || ':' || rp.privilege_type, ', ')
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   left join information_schema.routine_privileges rp
--     on rp.specific_schema = 'public' and rp.specific_name = p.proname || '_' || p.oid
--   where n.nspname = 'public' and p.prosecdef
--   group by 1 order by 1;
