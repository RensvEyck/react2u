-- Gesloten vacatures blijven bereikbaar (HALO-herstelplan, 23 november 2026).
--
-- Rond 20 november zijn 18 vacatures in het beheer op "gesloten" gezet. De site
-- gaf ze daarna een 404, en Google haalde ze meteen weg: van ±25 klikken per
-- dag naar 4. Voortaan toont de site een gesloten vacature als "vervuld",
-- zonder JobPosting en met een open sollicitatie (lib/content.ts, de pagina's
-- /vacatures/[slug] en /en/jobs/[slug]). Daarvoor moet de publieke sleutel
-- gesloten vacatures kunnen lezen; de overzichten, feeds en sitemap vragen
-- zelf alleen om status = 'published' en veranderen dus niet.

drop policy if exists "public read vacancies" on public.vacancies;
create policy "public read vacancies" on public.vacancies
  for select using (status in ('published', 'closed') or public.has_perm('vacatures'));
