-- Weekevaluatie voor de collega's van React2u (Rens, 18 nov 2026: "bouw de
-- weekevaluatie voor werknemers van react2u in de admin, zodat we deze data
-- kunnen gebruiken in de kwartaalmeetings. maak dus ook een werknemer rol").
--
-- - Recht `weekevaluatie`: je eigen weekevaluatie invullen en teruglezen.
--   De super admin en de beheerder krijgen het erbij (zij houden alles); de
--   rollen redacteur en commercieel niet, die kunnen het in Gebruikers krijgen.
-- - Rol `werknemer`: alleen dat ene recht. Een collega met die rol ziet na het
--   inloggen het dashboard, zijn eigen weekevaluatie en Account, niets van
--   sales, omzet of de site. Geen systeemrol: de super admin mag er rechten bij
--   zetten of de rol weghalen als er niemand meer aan hangt.
-- - weekevaluaties: één rij per collega per ISO-week (de maandag), met de
--   antwoorden als jsonb. Welke vragen er zijn staat in code
--   (src/lib/weekevaluatie.ts, VRAGEN), zoals DOCUMENTEN bij de onboarding;
--   een vraag erbij is dus geen migratie. `door` is het e-mailadres op het
--   moment van invullen, zodat de export leesbaar blijft als het account weg is.
-- - medewerkers.user_id: de koppeling tussen een medewerker uit de omzetmodule
--   (0035, contracturen en declarabele uren) en zijn account in het beheer.
--   Zo staan uren en evaluatie in het kwartaaloverzicht naast elkaar, en ziet
--   de collega zelf zijn uren van die week bij het invullen.
--
-- Rechten:
-- - een collega leest en schrijft alleen zijn eigen rijen (auth.uid()), en
--   schrijven kan alleen voor deze week en vorige week: tot het eind van de
--   week erna mag je nog wijzigen, daarna staat hij vast;
-- - het kwartaaloverzicht leest alles met has_perm('omzet'). Dat recht hoort
--   al bij de medewerkers en hun uren (alleen de super admin, zie 0035), en de
--   antwoorden zijn persoonlijke reflecties van collega's: het smalste
--   bestaande beheerrecht past daar beter bij dan `gebruikers` (accounts).
-- - weekevaluatie_deelnemers(): wie meedoet (e-mail, rol, sinds wanneer),
--   voor het overzicht van wie welke week miste. Security definer, want de
--   tabel admins is alleen leesbaar met `gebruikers`; geeft niets terug zonder
--   has_perm('omzet'). De cron (api/cron/weekevaluatie) leest admins zelf met
--   de service-role-sleutel.
--
-- VOLGORDE: na 0035 (medewerkers, uren) en 0006 (superadmin). 0042 en 0043
-- (andere PR's) raken dit niet.
--
-- Registreren: via apply_migration (naam 0044_weekevaluatie) vanzelf.

/* ---------- recht en rol ---------- */

update public.roles
set permissions = array_append(permissions, 'weekevaluatie')
where key in ('superadmin', 'beheerder') and not ('weekevaluatie' = any(permissions));

insert into public.roles (key, label, permissions, is_system, sort) values
  ('werknemer', 'Werknemer', array['weekevaluatie'], false, 10)
on conflict (key) do update
  set permissions = (
    select array_agg(distinct p) from unnest(array_append(public.roles.permissions, 'weekevaluatie')) as p
  );

/* ---------- koppeling medewerker ↔ account ---------- */

alter table public.medewerkers
  add column user_id uuid unique references auth.users(id) on delete set null;

-- De collega zelf mag zijn eigen medewerkersrij en uren lezen (niet schrijven):
-- de uren vult het beheer in, hij ziet ze naast zijn evaluatie.
create policy "eigen medewerker lezen" on public.medewerkers
  for select to authenticated using (user_id = auth.uid());
create policy "eigen uren lezen" on public.uren
  for select to authenticated using (
    exists (select 1 from public.medewerkers m where m.id = medewerker_id and m.user_id = auth.uid())
  );

/* ---------- de evaluaties ---------- */

create table public.weekevaluaties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- De maandag van de week (ISO-week), zoals uren.week.
  week date not null check (extract(isodow from week) = 1),
  -- Sleutels uit VRAGEN in src/lib/weekevaluatie.ts: schalen als getal 1–10,
  -- open vragen als tekst. Begrensd, zodat niemand er een boek in kwijt kan.
  antwoorden jsonb not null default '{}'::jsonb
    check (jsonb_typeof(antwoorden) = 'object' and pg_column_size(antwoorden) <= 40000),
  door text check (length(door) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);

create index weekevaluaties_week on public.weekevaluaties (week desc);

create trigger weekevaluaties_updated before update on public.weekevaluaties
  for each row execute function public.set_updated_at();

/** De maandag van de week waarin het nu is, Nederlandse tijd. */
create or replace function public.weekevaluatie_deze_week() returns date
language sql stable
as $$
  select date_trunc('week', (now() at time zone 'Europe/Amsterdam')::date)::date
$$;

alter table public.weekevaluaties enable row level security;
revoke all on public.weekevaluaties from anon;

-- Lezen: je eigen rijen, of alles met het overzichtsrecht.
create policy "weekevaluatie lezen" on public.weekevaluaties
  for select to authenticated using (user_id = auth.uid() or public.has_perm('omzet'));

-- Schrijven: alleen je eigen rij, alleen met het recht, en alleen deze week
-- of vorige week. Een week sluit aan het eind van de week erna; wat daarna
-- nog ontbreekt, blijft ontbreken (dat is precies wat het overzicht toont).
create policy "weekevaluatie invullen" on public.weekevaluaties
  for insert to authenticated with check (
    user_id = auth.uid() and public.has_perm('weekevaluatie')
    and week between public.weekevaluatie_deze_week() - 7 and public.weekevaluatie_deze_week()
  );
create policy "weekevaluatie wijzigen" on public.weekevaluaties
  for update to authenticated
  using (user_id = auth.uid() and public.has_perm('weekevaluatie'))
  with check (
    user_id = auth.uid() and public.has_perm('weekevaluatie')
    and week between public.weekevaluatie_deze_week() - 7 and public.weekevaluatie_deze_week()
  );
-- Geen delete-policy: een evaluatie haal je niet weg, je past hem aan.

/* ---------- wie doet mee ---------- */

/**
 * De collega's die een weekevaluatie horen in te vullen: iedereen met het
 * recht `weekevaluatie`, met de sleutel van zijn rol en sinds wanneer hij in
 * het beheer staat (weken van vóór die datum tellen niet als gemist). Alleen
 * voor wie het overzicht mag zien; anders een lege lijst.
 */
create or replace function public.weekevaluatie_deelnemers()
returns table (user_id uuid, email text, rol text, sinds date)
language sql stable security definer set search_path = public
as $$
  select a.user_id, a.email, r.key, coalesce(a.invited_at, a.created_at)::date
  from public.admins a
  join public.roles r on r.id = a.role_id
  where public.has_perm('omzet') and 'weekevaluatie' = any(r.permissions)
  order by a.email
$$;

revoke execute on function public.weekevaluatie_deelnemers() from public, anon;
grant execute on function public.weekevaluatie_deelnemers() to authenticated;
revoke execute on function public.weekevaluatie_deze_week() from public, anon;
grant execute on function public.weekevaluatie_deze_week() to authenticated;
