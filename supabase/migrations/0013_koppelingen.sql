-- Koppelingen (src/lib/koppelingen.ts): links naar systemen buiten de site en
-- de reactietermijn die de site aan sollicitanten belooft. Bewerkbaar op
-- /admin/instellingen.
--   kennismaking_url        agenda waarin een werkgever zelf een kennismaking
--                           plant; gevuld staat na een offerteaanvraag de knop
--                           "Plan direct een kennismaking" op de bedankmelding
--                           en in de bevestigingsmail, leeg = geen knop
--   sollicitatie_werkdagen  binnen hoeveel werkdagen een sollicitant van ons
--                           hoort (bedankmelding en bevestigingsmail)
-- Staat de rij er al (opgeslagen via de admin), dan blijft die staan.
insert into public.site_settings (key, value)
values ('koppelingen', '{"kennismaking_url": "", "sollicitatie_werkdagen": 5}'::jsonb)
on conflict (key) do nothing;
