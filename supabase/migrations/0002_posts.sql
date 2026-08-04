-- Blogartikelen.
--
-- Volgt bewust hetzelfde patroon als public.vacancies: markdown-body, dezelfde
-- statuswaarden en dezelfde RLS-opzet, zodat de admin-code en de publieke
-- queries één vorm houden.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body_md text,
  cover_image text,
  author text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  og_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- De publieke lijst sorteert op published_at aflopend en filtert op status.
create index posts_published_idx on public.posts(status, published_at desc);

create trigger posts_updated before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

-- Concept-artikelen blijven onzichtbaar voor bezoekers; beheerders zien alles,
-- zodat het adminoverzicht één query kan gebruiken.
create policy "public read posts" on public.posts
  for select using (status = 'published' or public.is_admin());

create policy "admin write posts" on public.posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
