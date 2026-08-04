-- React2u CMS schema
create extension if not exists pgcrypto;

-- ========== TABLES ==========
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  seo_title text,
  seo_description text,
  og_image text,
  published boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  label text,
  sort int not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index blocks_page_idx on public.blocks(page_id, sort);

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  location text not null default 'Eindhoven',
  employment_type text not null default 'FULL_TIME',
  hours text,
  salary text,
  intro text,
  description_md text,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  published_at timestamptz,
  valid_through date,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid references public.vacancies(id) on delete set null,
  vacancy_title text,
  name text not null,
  email text not null,
  phone text,
  motivation text,
  cv_path text,
  status text not null default 'nieuw' check (status in ('nieuw','in_behandeling','afgewezen','aangenomen')),
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ========== HELPERS ==========
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger pages_updated before update on public.pages for each row execute function public.set_updated_at();
create trigger blocks_updated before update on public.blocks for each row execute function public.set_updated_at();
create trigger vacancies_updated before update on public.vacancies for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.site_settings for each row execute function public.set_updated_at();

-- ========== RLS ==========
alter table public.admins enable row level security;
alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.vacancies enable row level security;
alter table public.applications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;

create policy "own admin row" on public.admins for select to authenticated using (user_id = auth.uid());

create policy "public read pages" on public.pages for select using (published or public.is_admin());
create policy "admin write pages" on public.pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read blocks" on public.blocks for select using (
  exists(select 1 from public.pages p where p.id = page_id and p.published) or public.is_admin()
);
create policy "admin write blocks" on public.blocks for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read vacancies" on public.vacancies for select using (status = 'published' or public.is_admin());
create policy "admin write vacancies" on public.vacancies for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "anyone insert application" on public.applications for insert to anon, authenticated with check (true);
create policy "admin read applications" on public.applications for select to authenticated using (public.is_admin());
create policy "admin update applications" on public.applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete applications" on public.applications for delete to authenticated using (public.is_admin());

create policy "anyone insert message" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "admin read messages" on public.contact_messages for select to authenticated using (public.is_admin());
create policy "admin update messages" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete messages" on public.contact_messages for delete to authenticated using (public.is_admin());

create policy "public read settings" on public.site_settings for select using (true);
create policy "admin write settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========== STORAGE ==========
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('cvs','cvs',false) on conflict (id) do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "admin insert media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

create policy "anyone upload cv" on storage.objects for insert to anon, authenticated with check (bucket_id = 'cvs');
create policy "admin read cvs" on storage.objects for select to authenticated using (bucket_id = 'cvs' and public.is_admin());
