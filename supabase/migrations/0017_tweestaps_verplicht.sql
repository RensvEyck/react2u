-- Tweestapsverificatie verplicht, ook in de database.
--
-- Sinds 7 oktober 2026 laat de app niemand het beheer in zonder code uit een
-- authenticator-app (`requireAdmin()` eist aal2). Maar de app is niet de enige
-- weg naar de data: met een gestolen wachtwoord en de publieke sleutel kan
-- iemand rechtstreeks inloggen bij Supabase en via /rest/v1 lezen. RLS keek
-- alleen óf je beheerder bent, niet hoe je bent ingelogd. Een tweede factor die
-- alleen in de app geldt, beschermt de sollicitaties en cv's dus maar half.
--
-- Hier eisen is_admin() en has_perm() daarom ook aal2: een sessie met alleen
-- een wachtwoord (aal1) ziet niets van het beheer. Alle beheer-policies lopen
-- via deze twee functies (zie 0005 en 0016), dus dit ene punt dekt ze allemaal:
-- tabellen, de cv-bucket en mediabeheer.
--
-- Bewust ongemoeid:
-- - "own admin row" (admins): `user_id = auth.uid() or has_perm(...)`. Het
--   eigen deel geldt ook op aal1, en dat is nodig: het inlogscherm en de
--   onderhoudspoort kijken of je beheerder bent vóórdat de code is gegeven.
--   Het geeft alleen je eigen rij prijs.
-- - "read roles": rolnamen en hun rechten zijn geen geheim.
-- - Bezoekers (anon) en de service-role: anon heeft geen aal2 en had al geen
--   beheerrechten; de service-role gaat langs RLS.
--
-- VOLGORDE: pas draaien als de code met verplichte tweestaps (PR #9) live
-- staat. Daarvóór kon je zonder code in het beheer; wie dat nog doet, ziet na
-- deze migratie lege schermen in plaats van het instelscherm.
--
-- `create or replace` houdt eigenaar en EXECUTE-rechten van 0016 intact.
--
-- Terugdraaien: dezelfde twee functies zonder de regel met 'aal2' (0001 en
-- 0005). Registreren na het draaien:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('20261007120017', '0017_tweestaps_verplicht');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists(select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.has_perm(perm text) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists(
       select 1
       from public.admins a
       join public.roles r on r.id = a.role_id
       where a.user_id = auth.uid()
         and perm = any(r.permissions)
     )
$$;

-- Controle (verwacht: aal1 0, aal2 alles, anon 0 leads en wel de gepubliceerde pagina's):
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-id>","role":"authenticated","aal":"aal1"}';
--   select count(*) from public.leads;   -- 0
--   set local request.jwt.claims = '{"sub":"<user-id>","role":"authenticated","aal":"aal2"}';
--   select count(*) from public.leads;   -- alle
--   rollback;
