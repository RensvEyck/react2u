-- Doorverwijzingen en 404-registratie.
--
-- Tot nu toe stond elke doorverwijzing in next.config.ts: een oude URL die na
-- de DNS-omzetting een 404 gaf, vroeg om een codewijziging en een deploy. En
-- je zag het alleen als iemand het meldde. Nu:
--
--   redirects      — beheerd onder SEO in de admin, toegepast door de middleware;
--   missing_paths  — elk pad waarop een bezoeker een 404 kreeg, met een teller.
--
-- De vaste lijst van de oude WordPress-site blijft in de code
-- (src/lib/redirects.ts). Next voert die uit vóór de middleware, dus die wint.

/* ---------- doorverwijzingen ---------- */

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  -- Genormaliseerd pad: kleine letters, zonder domein, query of afsluitende
  -- schuine streep. Eindigt op /* voor "alles hieronder". Zie normalizePath().
  source text not null unique check (source ~ '^/[^?#]*$' and source not in ('/', '/*')),
  -- Pad op deze site of een volledige https-URL.
  destination text not null check (destination ~ '^(/|https://)'),
  -- 308 (permanent) laat Google de waarde overdragen aan het nieuwe adres.
  -- 307 (tijdelijk) alleen voor iets dat terugkomt, zoals een actiepagina.
  permanent boolean not null default true,
  hits integer not null default 0,
  last_hit_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.redirects enable row level security;

-- Leesbaar voor iedereen: de middleware leest met de publieke sleutel, en een
-- doorverwijzing is geen geheim — wie de oude URL opvraagt ziet waar hij
-- heen gaat. Maar alleen de drie kolommen die daarvoor nodig zijn: de notitie
-- is vrije tekst van een beheerder, en created_by een gebruikers-id. Die
-- horen niet via de publieke sleutel op te vragen te zijn.
create policy "public read redirects" on public.redirects
  for select using (true);

revoke select on public.redirects from anon;
grant select (source, destination, permanent) on public.redirects to anon;

create policy "manage redirects" on public.redirects
  for all to authenticated
  using (public.has_perm('seo')) with check (public.has_perm('seo'));

-- Teller bijhouden zonder de publieke sleutel schrijfrechten op de tabel te
-- geven. security definer + alleen een bestaande rij ophogen: meer kan een
-- aanroeper er niet mee.
create or replace function public.redirect_hit(p_source text) returns void
language sql security definer set search_path = public
as $$
  update public.redirects
  set hits = hits + 1, last_hit_at = now()
  where source = p_source
$$;

revoke all on function public.redirect_hit(text) from public;
grant execute on function public.redirect_hit(text) to anon, authenticated;

/* ---------- 404-registratie ---------- */

-- Geen persoonsgegevens: alleen het pad en de host van de verwijzer, geen IP,
-- geen bezoekershash. Eén rij per pad met een teller, zodat een crawler die
-- hetzelfde pad duizend keer probeert geen duizend rijen oplevert.
create table public.missing_paths (
  path text primary key,
  hits integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_referrer text,
  -- "Negeren" in de admin: bots die naar /wp-login proberen hoeven niet
  -- steeds bovenaan te staan.
  ignored boolean not null default false
);

create index missing_paths_open_idx on public.missing_paths (hits desc) where not ignored;

alter table public.missing_paths enable row level security;

-- Bewust géén policy voor anon: wie welke URL's probeert is niet publiek.
-- Registreren gaat via de functie hieronder.
create policy "read missing_paths" on public.missing_paths
  for select to authenticated using (public.has_perm('seo'));
create policy "manage missing_paths" on public.missing_paths
  for all to authenticated
  using (public.has_perm('seo')) with check (public.has_perm('seo'));

-- Registreert een 404. Controleert zelf de invoer, want de aanroeper is
-- iedereen op internet:
--   - alleen redelijke paden (geen admin/api, geen stuurtekens, geen *, max
--     300 tekens);
--   - hooguit 5000 open paden. Is dat vol, dan wijkt het oudste pad dat maar
--     één keer werd geprobeerd. Zo kan een script dat willekeurige URL's
--     afloopt de tabel niet laten groeien, én niet dichtzetten voor echte
--     404's — die worden vaker geprobeerd en blijven dus staan. Genegeerde
--     paden tellen niet mee.
create or replace function public.log_missing_path(p_path text, p_referrer text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  clean text := lower(left(p_path, 300));
begin
  if clean is null or clean !~ '^/[^?#*[:cntrl:]]*$' or clean ~ '^/(admin|api|_next)(/|$)' then
    return;
  end if;

  update public.missing_paths
  set hits = hits + 1, last_seen = now(), last_referrer = coalesce(left(p_referrer, 200), last_referrer)
  where path = clean;
  if found then
    return;
  end if;

  if (select count(*) from public.missing_paths where not ignored) >= 5000 then
    delete from public.missing_paths
    where path = (
      select path from public.missing_paths
      where not ignored and hits = 1
      order by last_seen asc
      limit 1
    );
    if not found then
      return;
    end if;
  end if;

  insert into public.missing_paths (path, last_referrer)
  values (clean, left(p_referrer, 200))
  on conflict (path) do update
    set hits = public.missing_paths.hits + 1, last_seen = now();
end
$$;

revoke all on function public.log_missing_path(text, text) from public;
grant execute on function public.log_missing_path(text, text) to anon, authenticated;

-- Opruimen: een pad dat een half jaar niemand meer probeerde is geen
-- aandachtspunt meer. Draait naast opruimen_verlopen_gegevens().
select cron.schedule(
  'opruimen-404',
  '45 3 * * *',
  $$delete from public.missing_paths where last_seen < now() - interval '180 days'$$
);
