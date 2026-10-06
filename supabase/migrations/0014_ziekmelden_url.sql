-- Ziek melden: de knop in de werkgevers-header opent het klantportaal
-- (XpertSuite). Het adres staat in site_settings.koppelingen.ziekmelden_url
-- (src/lib/koppelingen.ts), zodat het op /admin/instellingen te wijzigen is
-- zonder deploy. Zonder rij of zonder waarde geldt in de code dezelfde
-- standaard; deze migratie maakt hem alleen zichtbaar en bewerkbaar.
insert into public.site_settings (key, value)
values ('koppelingen', '{"kennismaking_url": "", "sollicitatie_werkdagen": 5, "ziekmelden_url": "https://login.xpertsuite.nl/Account/LogOn"}'::jsonb)
on conflict (key) do update
   set value = site_settings.value || '{"ziekmelden_url": "https://login.xpertsuite.nl/Account/LogOn"}'::jsonb
 where not (site_settings.value ? 'ziekmelden_url');
