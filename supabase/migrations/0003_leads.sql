-- Bellijst: leads die gebeld moeten worden, met status en notities.
--
-- Let op het verschil met alle andere tabellen in dit schema: pages, posts en
-- vacancies hebben een "public read"-policy omdat ze op de site horen te staan.
-- Leads niet. Dit zijn interne gegevens — namen, telefoonnummers en wat er in
-- een gesprek is gezegd. Er is hier bewust géén policy voor anon, zodat de
-- publieke sleutel er niet bij kan.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  status text not null default 'te_bellen'
    check (status in ('te_bellen','gebeld','niet_bereikt','terugbellen','klant','geen_interesse')),
  notes text,
  -- Datum waarop je deze lead opnieuw wilt spreken. Stuurt de sortering:
  -- wat vandaag of eerder terugmoet, staat bovenaan.
  follow_up_on date,
  last_called_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_werklijst_idx on public.leads(status, follow_up_on, created_at desc);

create trigger leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

create policy "admin read leads" on public.leads
  for select to authenticated using (public.is_admin());

create policy "admin write leads" on public.leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
