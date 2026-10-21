-- Solliciteren met je LinkedIn-profiel: een cv is niet nodig als de kandidaat
-- een profiellink meestuurt.
alter table public.applications add column if not exists linkedin text;
grant insert (linkedin) on public.applications to anon, authenticated;
