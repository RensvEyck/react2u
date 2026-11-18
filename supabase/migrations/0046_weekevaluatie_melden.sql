-- Weekevaluatie, derde ronde (Rens, 18 nov 2026: "meer vrije invulvelden en een
-- open veld om iets te melden of delen").
--
-- De nieuwe vrije velden en het meldveld zijn gewone antwoorden in de jsonb van
-- weekevaluaties (0044); de vragen staan in code (VRAGEN in
-- src/lib/weekevaluatie.ts). Wat hier bij komt is één functie: wie een melding
-- meteen wil laten doorsturen ("niet wachten tot de kwartaalmeeting"), moet
-- weten naar wie. Dat zijn dezelfde mensen als bij twee zware weken (0045):
-- wie het recht omzet heeft. De tabel admins is voor een werknemer niet
-- leesbaar, dus dit loopt via een security definer-functie.
--
-- weekevaluatie_ontvangers(): de e-mailadressen van wie het recht omzet heeft,
-- zonder de vrager zelf, en alleen voor wie zelf een weekevaluatie invult
-- (has_perm 'weekevaluatie'); anders een lege lijst.
--
-- VOLGORDE: na 0045.
--
-- Registreren: via apply_migration (naam 0046_weekevaluatie_melden) vanzelf.

create or replace function public.weekevaluatie_ontvangers() returns text[]
language sql stable security definer set search_path = public
as $$
  select case when auth.uid() is not null and public.has_perm('weekevaluatie') then array(
    select a.email from public.admins a join public.roles r on r.id = a.role_id
    where 'omzet' = any(r.permissions) and a.user_id <> auth.uid() and a.email is not null
    order by a.email
  ) else array[]::text[] end
$$;

revoke execute on function public.weekevaluatie_ontvangers() from public, anon;
grant execute on function public.weekevaluatie_ontvangers() to authenticated;
