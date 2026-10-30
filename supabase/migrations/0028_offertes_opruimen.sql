-- Bewaartermijn van offertes (privacyverklaring, aanvulling H, 30 okt 2026).
--
-- Een offerte die niet is ondertekend (concept, verstuurd of verlopen,
-- afgewezen, ingetrokken) gaat één jaar na de laatste activiteit weg, met zijn
-- tijdlijn en een eventuele bevestigingscode (on delete cascade). "Laatste
-- activiteit" is updated_at: die schuift ook op als de klant de offerte
-- opent of iets aanklikt.
--
-- Een getekende offerte is onderdeel van de overeenkomst en blijft staan; de
-- trigger offerte_bewaken laat hem ook niet verwijderen. De termijn daarvoor
-- (zeven jaar na het einde van de overeenkomst) is handwerk, zie CONTEXT.md.
select cron.schedule(
  'opruimen-offertes',
  '25 3 * * *',
  $$delete from public.offertes where status <> 'getekend' and updated_at < now() - interval '365 days'$$
);
