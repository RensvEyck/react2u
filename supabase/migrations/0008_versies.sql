-- Versiegeschiedenis, prullenbak en wijzigingslog.
--
-- Tot nu toe stond alles wat je opsloeg direct live, zonder weg terug: een
-- per ongeluk leeggemaakt blok of een verwijderde pagina was weg. Nu bewaart
-- een trigger bij elke opslag een versie, en bij verwijderen de laatste stand.
--
-- Wat er wél en níet in komt, is een bewuste keuze:
--
--   wel:  pages, blocks, posts, vacancies, site_settings — inhoud van de site;
--   niet: applications, contact_messages, leads, page_views — persoonsgegevens.
--         Verwijderd moet daar echt verwijderd zijn; een kopie in een
--         versietabel zou de bewaartermijnen en elk verwijderverzoek
--         ondergraven.
--
-- Terugzetten is een gewone update of insert door de gebruiker zelf, met zijn
-- eigen rechten. Dat levert dus zelf ook weer een versie op: terugzetten is
-- ongedaan te maken.

create table public.revisions (
  id bigint generated always as identity primary key,
  table_name text not null check (table_name in ('pages', 'blocks', 'posts', 'vacancies', 'site_settings')),
  -- uuid van de rij, of de sleutel bij site_settings.
  row_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  -- insert en update: de rij zoals hij ná het opslaan was — één versie per
  -- opslag, zoals je dat van WordPress kent. delete: de laatste stand, zodat
  -- hij uit de prullenbak terug kan.
  data jsonb not null,
  actor uuid default auth.uid(),
  -- Gekopieerd, niet gekoppeld: als iemand later geen toegang meer heeft, moet
  -- de geschiedenis nog steeds zeggen wie het was.
  actor_email text,
  created_at timestamptz not null default now()
);

create index revisions_row_idx on public.revisions (table_name, row_id, created_at desc);
create index revisions_recent_idx on public.revisions (created_at desc);

alter table public.revisions enable row level security;

-- Lezen per onderdeel: wie een tabel mag bewerken, mag ook de geschiedenis
-- ervan zien. Er zijn geen schrijfpolicies — alleen de trigger schrijft.
create policy "read revisions" on public.revisions
  for select to authenticated using (
    case table_name
      when 'pages' then public.has_perm('paginas')
      when 'blocks' then public.has_perm('paginas')
      when 'posts' then public.has_perm('blog')
      when 'vacancies' then public.has_perm('vacatures')
      when 'site_settings' then public.has_perm('instellingen') or public.has_perm('seo')
      else false
    end
  );

create or replace function public.record_revision() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  -- Velden die bij een wijziging niets zeggen: updated_at verandert altijd, en
  -- sort verandert bij het verslepen van blokken — dat is geen inhoud.
  noise text[] := array['updated_at', 'sort'];
  old_row jsonb;
  new_row jsonb;
  key text;
  email text;
begin
  if tg_op in ('UPDATE', 'DELETE') then old_row := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then new_row := to_jsonb(new); end if;

  if tg_op = 'UPDATE' and (old_row - noise) = (new_row - noise) then
    return null;
  end if;

  key := coalesce(new_row, old_row) ->> (case when tg_table_name = 'site_settings' then 'key' else 'id' end);

  -- Eerste wijziging van een rij van vóór deze migratie: bewaar eerst de stand
  -- zoals hij was, als beginversie. Anders is juist die eerste bewerking niet
  -- terug te draaien. Zonder auteur, want die weten we niet.
  if tg_op = 'UPDATE' and not exists (
    select 1 from public.revisions r where r.table_name = tg_table_name and r.row_id = key
  ) then
    insert into public.revisions (table_name, row_id, action, data, actor, actor_email, created_at)
    values (
      tg_table_name, key, 'update', old_row, null, null,
      coalesce((old_row ->> 'updated_at')::timestamptz, now() - interval '1 second')
    );
  end if;

  select a.email into email from public.admins a where a.user_id = auth.uid();

  insert into public.revisions (table_name, row_id, action, data, actor, actor_email)
  values (
    tg_table_name,
    key,
    lower(tg_op),
    case when tg_op = 'DELETE' then old_row else new_row end,
    auth.uid(),
    email
  );
  return null;
end
$$;

create trigger pages_revision after insert or update or delete on public.pages
  for each row execute function public.record_revision();
create trigger blocks_revision after insert or update or delete on public.blocks
  for each row execute function public.record_revision();
create trigger posts_revision after insert or update or delete on public.posts
  for each row execute function public.record_revision();
create trigger vacancies_revision after insert or update or delete on public.vacancies
  for each row execute function public.record_revision();
create trigger site_settings_revision after insert or update or delete on public.site_settings
  for each row execute function public.record_revision();

-- Een jaar geschiedenis is genoeg om een fout van vorige maand terug te
-- draaien, en houdt de tabel klein.
select cron.schedule(
  'opruimen-versies',
  '50 3 * * *',
  $$delete from public.revisions where created_at < now() - interval '365 days'$$
);
