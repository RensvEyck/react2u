-- Super admin boven beheerder.
--
-- Tot nu toe had `beheerder` alle tien rechten, inclusief `gebruikers`. Er was
-- dus geen niveau bóven beheerder — de rol was het plafond. Nu is er een
-- ladder: super admin nodigt uit en verdeelt rollen, beheerder doet al het
-- overige werk.
--
-- Volgorde is hier niet vrijblijvend. De trigger `assert_admin_remains` eist
-- dat er altijd iemand het recht `gebruikers` heeft. Zou `beheerder` dat recht
-- kwijtraken vóórdat er een super admin bestaat, dan blokkeert die trigger de
-- migratie — terecht, want op dat moment kan niemand meer gebruikers beheren.

-- 1. De nieuwe toprol. Systeemrol: houdt altijd alles en is niet te verwijderen.
insert into public.roles (key, label, permissions, is_system, sort) values
  ('superadmin', 'Super admin',
   array['postvak','bellijst','paginas','blog','vacatures','media','seo','bezoek','instellingen','gebruikers'],
   true, 0)
on conflict (key) do update
  set label = excluded.label,
      permissions = excluded.permissions,
      is_system = true,
      sort = 0;

-- 2. Toegang voor rens@react2u.nl. Het auth-account bestond al en heeft eerder
--    ingelogd; alleen de rij in `admins` ontbrak, waardoor het geen toegang had.
insert into public.admins (user_id, email, role_id)
select u.id, u.email, r.id
from auth.users u, public.roles r
where u.email = 'rens@react2u.nl' and r.key = 'superadmin'
on conflict (user_id) do update set role_id = excluded.role_id;

-- 3. Pas nu mag `beheerder` het recht `gebruikers` kwijt. Hij is ook geen
--    systeemrol meer: die vlag dwingt alle rechten af, en dat is precies wat
--    hier niet meer de bedoeling is.
update public.roles
set permissions = array['postvak','bellijst','paginas','blog','vacatures','media','seo','bezoek','instellingen'],
    is_system = false,
    sort = 1
where key = 'beheerder';

update public.roles set sort = 2 where key = 'redacteur';
update public.roles set sort = 3 where key = 'commercieel';

-- 4. Alleen rens@react2u.nl houdt toegang. Het auth-account zelf blijft
--    bestaan, dus toegang teruggeven is één rij invoegen — geen nieuw account.
delete from public.admins
where user_id in (select id from auth.users where email <> 'rens@react2u.nl');
