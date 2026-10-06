-- Drie dingen uit de audit van oktober 2026, die alle drie een tabel of kolom
-- vragen. Alles is zo geschreven dat de code zonder deze migratie blijft
-- werken (zie de opmerkingen per onderdeel); dit maakt het compleet.

/* ---------- 1. Limiet per IP op de formulieren ---------- */

-- De formulieren hadden alleen een honeypot. Dit is een vaste-venster-teller
-- per sleutel: de server action maakt van het IP-adres een gezouten hash
-- (src/lib/rateLimit.ts) en vraagt hier of er nog ruimte is. Het IP zelf komt
-- de database niet in; de rijen zijn na een dag waardeloos en gaan dan weg.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- Geen policies: alleen de functie hieronder (security definer) komt erbij.

-- Telt een poging en zegt of hij nog binnen de limiet valt. Atomair, zodat twee
-- gelijktijdige inzendingen niet allebei "ja" krijgen op het laatste plekje.
create or replace function public.throttle(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (left(p_key, 200), w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end
$$;

revoke all on function public.throttle(text, integer, integer) from public;
grant execute on function public.throttle(text, integer, integer) to anon, authenticated;

select cron.schedule(
  'opruimen-rate-limits',
  '15 3 * * *',
  $$delete from public.rate_limits where window_start < now() - interval '2 days'$$
);

/* ---------- 2. Conversies: welke pagina levert aanvragen op ---------- */

-- Eén rij per verstuurd formulier: wat voor soort, en vanaf welke pagina.
-- Geen naam, geen e-mail, geen hash — die staan al in contact_messages of
-- applications. Dit is alleen om te tellen, naast page_views.
create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'offerte', 'sollicitatie', 'terugbel')),
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversions_created_idx on public.conversions (created_at desc);

alter table public.conversions enable row level security;

-- Schrijven mag anon: de server action werkt met de publieke sleutel, net als
-- bij page_views. Lezen alleen met het recht `bezoek`.
drop policy if exists "anyone insert conversion" on public.conversions;
create policy "anyone insert conversion" on public.conversions
  for insert to anon, authenticated with check (true);

drop policy if exists "bezoek read conversions" on public.conversions;
create policy "bezoek read conversions" on public.conversions
  for select to authenticated using (public.has_perm('bezoek'));

drop policy if exists "bezoek delete conversions" on public.conversions;
create policy "bezoek delete conversions" on public.conversions
  for delete to authenticated using (public.has_perm('bezoek'));

-- Dezelfde termijn als bezoekgegevens (12 maanden).
select cron.schedule(
  'opruimen-conversies',
  '20 3 * * *',
  $$delete from public.conversions where created_at < now() - interval '365 days'$$
);

/* ---------- 3. Sollicitaties: langer bewaren met toestemming ---------- */

-- De Autoriteit Persoonsgegevens: vier weken na afloop van de procedure,
-- langer (tot een jaar) alleen met toestemming van de sollicitant. Het
-- formulier vraagt daar nu om; deze kolom onthoudt het antwoord. Zonder de
-- kolom stuurt de code hem gewoon niet mee (zie submitApplication).
alter table public.applications add column if not exists retain_longer boolean not null default false;

-- Voor het geval anon per kolom rechten heeft (zie CONTEXT.md, *Valkuilen*).
grant insert (retain_longer) on public.applications to anon;
