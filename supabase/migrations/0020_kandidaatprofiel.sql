-- Kandidaatprofiel bij een sollicitatie: waarmee iemand inlogde (LinkedIn,
-- Google of Apple), de profielfoto van die aanbieder en de samenvatting die
-- uit het cv is gelezen.
alter table public.applications add column if not exists aangemeld_via text
  check (aangemeld_via is null or aangemeld_via in ('linkedin', 'google', 'apple'));
alter table public.applications add column if not exists foto text;
alter table public.applications add column if not exists cv_samenvatting jsonb;
grant insert (aangemeld_via, foto, cv_samenvatting) on public.applications to anon, authenticated;
