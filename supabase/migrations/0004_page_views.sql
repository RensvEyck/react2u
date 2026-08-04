-- Bezoekregistratie.
--
-- Privacy zit in het schema, niet in een belofte: het IP-adres wordt nergens
-- opgeslagen. Wat blijft staan is de afgeleide organisatienaam (uit een
-- reverse-lookup) en een bezoekershash die dagelijks roteert. Die hash is
-- alleen bruikbaar om binnen één dag herhaalbezoek te herkennen; over dagen
-- heen valt er geen persoon mee te volgen, en terugrekenen naar een IP kan
-- niet.
--
-- Lezen mag alleen een beheerder. Schrijven mag anon, omdat de tracker-route
-- met de publieke sleutel werkt — net als bij contact_messages.

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer_host text,
  country text,
  -- Organisatie achter het IP. Null als onbekend of als het een consumenten-
  -- provider betreft; zie is_company.
  company text,
  -- Onderscheidt een bedrijfsnetwerk van een provider (KPN, Ziggo) of een
  -- datacenter (bots, VPN's). Alleen true is interessant voor de bellijst.
  is_company boolean not null default false,
  visitor_hash text not null,
  created_at timestamptz not null default now()
);

create index page_views_created_idx on public.page_views(created_at desc);
create index page_views_company_idx on public.page_views(company, created_at desc)
  where is_company;

alter table public.page_views enable row level security;

create policy "anyone insert page_view" on public.page_views
  for insert to anon, authenticated with check (true);

create policy "admin read page_views" on public.page_views
  for select to authenticated using (public.is_admin());

create policy "admin delete page_views" on public.page_views
  for delete to authenticated using (public.is_admin());
