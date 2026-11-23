-- Ideeënbord in Mijn React2u (Rens, 23 nov 2026, uit het voorstel voor het
-- portaal: "'Iets melden of delen' bestaat al; maak er een zichtbaar bord van
-- met status (ingediend, bekeken, gedaan) zodat iedereen ziet wat ermee
-- gebeurt").
--
-- Eén bron. Wat een collega in de weekevaluatie bij "Iets melden of delen"
-- schrijft (0046, het veld `melding` in de jsonb van weekevaluaties) komt via
-- een trigger op het bord; het bord heeft ook een eigen knop. Het bord is een
-- eigen tabel en geen uitbreiding van weekevaluaties: een weekevaluatie is één
-- rij per collega per week die alleen hijzelf (en het beheer) mag lezen, een
-- idee moet door iedereen gelezen, gestemd en van een reactie voorzien kunnen
-- worden, en er horen meer ideeën in een week te passen dan één. De melding
-- in de weekevaluatie blijft gewoon staan voor de kwartaalmeeting; het bord
-- is de plek waar je ziet wat ermee gebeurt.
--
-- - recht 'ideeen': het bord lezen, een idee indienen, stemmen en reageren.
--   Voor de super admin, de beheerder en de werknemer; een eigen recht, zoals
--   'overleg' (0053), omdat het bord van het team is en niet van één persoon:
--   wie het bord mag zien hoeft niet per se een weekevaluatie in te vullen
--   (backoffice), en andersom. Het staat in EIGEN_RECHTEN (permissions.ts),
--   dus een werknemer blijft in Mijn React2u.
-- - de status zetten, de reden schrijven en alles verwijderen: het recht
--   omzet, net als het kwartaaloverzicht, de inwerkreis en het CM-overleg.
-- - ideeen: titel, tekst, soort (dezelfde vijf als melding_soort in 0046),
--   wie het inbracht (user_id en het e-mailadres van toen), vertrouwelijk
--   (alleen voor het beheer: het vinkje "stuur dit meteen door" in de
--   weekevaluatie, of het vinkje "alleen voor het beheer" op het bord), de
--   status (ingediend, bekeken, opgepakt, gedaan, niet_nu) met reden en wie
--   die zette, en waar het vandaan kwam (bord, of de weekevaluatie van een
--   week: één idee per collega per week uit de weekevaluatie).
-- - idee_stemmen: één stem per collega per idee, niet op het eigen idee,
--   intrekbaar.
-- - idee_reacties: korte reacties van collega's.
-- - idee_meldingen: wat een collega nog moet zien over zijn eigen ideeën
--   (status veranderd, een reactie), gevuld door triggers; het dashboard toont
--   wat nog niet gelezen is.
--
-- Niets medisch (Rens, 19 nov 2026): geen namen van werknemers van klanten
-- en geen dossiers op het bord. Dat staat bij elk invulveld.
--
-- VOLGORDE: na 0046 (weekevaluaties met het meldveld) en 0053.
-- Registreren: via apply_migration (naam 0055_ideeenbord) vanzelf.

/* ---------- recht ---------- */

update public.roles
set permissions = array_append(permissions, 'ideeen')
where key in ('superadmin', 'beheerder', 'werknemer') and not ('ideeen' = any(permissions));

/* ---------- de ideeën ---------- */

create table public.ideeen (
  id uuid primary key default gen_random_uuid(),
  titel text not null check (length(btrim(titel)) between 1 and 120),
  tekst text not null check (length(btrim(tekst)) between 1 and 4000),
  -- Dezelfde sleutels als melding_soort in de weekevaluatie (MELDING_SOORTEN in lib/weekevaluatie.ts).
  soort text not null default 'idee' check (soort in ('idee', 'zorg', 'compliment', 'vraag', 'anders')),
  door uuid references auth.users(id) on delete set null default auth.uid(),
  -- Het adres van toen: ook leesbaar als de collega vertrokken is.
  door_email text default (auth.jwt() ->> 'email') check (length(door_email) <= 320),
  -- Alleen voor het beheer: niet op het bord voor collega's.
  vertrouwelijk boolean not null default false,
  status text not null default 'ingediend' check (status in ('ingediend', 'bekeken', 'opgepakt', 'gedaan', 'niet_nu')),
  -- De reden of uitkomst die het beheer erbij schrijft; verplicht bij "niet nu".
  reden text check (length(reden) <= 1000),
  status_at timestamptz,
  status_door text check (length(status_door) <= 320),
  bron text not null default 'bord' check (bron in ('bord', 'weekevaluatie')),
  -- De maandag van de weekevaluatie waar dit idee uit komt; leeg voor een idee van het bord.
  bron_week date check (bron_week is null or extract(isodow from bron_week) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ideeen_niet_nu_met_reden check (status <> 'niet_nu' or length(btrim(coalesce(reden, ''))) > 0),
  constraint ideeen_bron_week check ((bron = 'weekevaluatie') = (bron_week is not null)),
  -- Eén idee per collega per week uit de weekevaluatie (NULL telt niet mee, dus het bord zelf is vrij).
  unique (door, bron_week)
);

create index ideeen_status on public.ideeen (status, created_at desc);
create index ideeen_door on public.ideeen (door);

create trigger ideeen_updated before update on public.ideeen
  for each row execute function public.set_updated_at();

/** Bij een andere status: wanneer en door wie. Bij een status zonder reden gaat een oude reden mee weg. */
create or replace function public.ideeen_status_bijhouden() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_at := now();
    new.status_door := coalesce(auth.jwt() ->> 'email', old.status_door);
  end if;
  new.reden := nullif(btrim(coalesce(new.reden, '')), '');
  return new;
end;
$$;

create trigger ideeen_status before insert or update on public.ideeen
  for each row execute function public.ideeen_status_bijhouden();

/* ---------- stemmen en reacties ---------- */

create table public.idee_stemmen (
  idee_id uuid not null references public.ideeen(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idee_id, user_id)
);

create table public.idee_reacties (
  id uuid primary key default gen_random_uuid(),
  idee_id uuid not null references public.ideeen(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  door_email text default (auth.jwt() ->> 'email') check (length(door_email) <= 320),
  tekst text not null check (length(btrim(tekst)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index idee_reacties_idee on public.idee_reacties (idee_id, created_at);

/* ---------- meldingen voor de collega ---------- */

create table public.idee_meldingen (
  id uuid primary key default gen_random_uuid(),
  -- Voor wie: de collega die het idee inbracht.
  user_id uuid not null references auth.users(id) on delete cascade,
  idee_id uuid not null references public.ideeen(id) on delete cascade,
  soort text not null check (soort in ('status', 'reactie')),
  -- Bij 'status': de nieuwe status; bij 'reactie': leeg.
  status text check (status is null or status in ('ingediend', 'bekeken', 'opgepakt', 'gedaan', 'niet_nu')),
  -- De reden van het beheer, of (het begin van) de reactie.
  tekst text check (length(tekst) <= 1000),
  -- Wie het deed, zodat de melding "Bram reageerde" kan zeggen.
  door_email text check (length(door_email) <= 320),
  gelezen_at timestamptz,
  created_at timestamptz not null default now()
);

create index idee_meldingen_open on public.idee_meldingen (user_id, created_at desc) where gelezen_at is null;

/**
 * Een andere status: de inbrenger krijgt een melding, tenzij hij het zelf was
 * (het beheer dat een eigen idee verplaatst). Security definer, want de
 * meldingen van een ander zijn voor niemand schrijfbaar.
 */
create or replace function public.ideeen_meld_status() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.door is not null and new.door is distinct from auth.uid() then
    insert into public.idee_meldingen (user_id, idee_id, soort, status, tekst, door_email)
    values (new.door, new.id, 'status', new.status, new.reden, auth.jwt() ->> 'email');
  end if;
  return new;
end;
$$;

create trigger ideeen_meld_status after update on public.ideeen
  for each row execute function public.ideeen_meld_status();

/** Een reactie van een collega: de inbrenger krijgt een melding, niet bij een reactie op het eigen idee. */
create or replace function public.ideeen_meld_reactie() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  eigenaar uuid;
begin
  select door into eigenaar from public.ideeen where id = new.idee_id;
  if eigenaar is not null and eigenaar is distinct from new.user_id then
    insert into public.idee_meldingen (user_id, idee_id, soort, tekst, door_email)
    values (eigenaar, new.idee_id, 'reactie', left(new.tekst, 1000), new.door_email);
  end if;
  return new;
end;
$$;

create trigger idee_reacties_meld after insert on public.idee_reacties
  for each row execute function public.ideeen_meld_reactie();

/* ---------- uit de weekevaluatie ---------- */

/** De titel uit een melding: de eerste regel, met één spatie tussen de woorden; langer dan 90 tekens wordt afgekapt. Dezelfde regel als titelUit() in lib/ideeen.ts. */
create or replace function public.idee_titel(t text) returns text
language sql immutable
as $$
  select case when length(r) <= 90 then r else rtrim(left(r, 79)) || '…' end
  from (select btrim(regexp_replace(split_part(btrim(t), E'\n', 1), '\s+', ' ', 'g')) as r) s
$$;

/**
 * "Iets melden of delen" uit de weekevaluatie (0046) komt op het bord: één
 * idee per collega per week, met de soort en of het vertrouwelijk is (het
 * vinkje "stuur dit meteen door" betekent: alleen voor het beheer). Een
 * aangepaste tekst gaat mee zolang het beheer het idee nog niet oppakte; of
 * het vertrouwelijk is volgt altijd de collega. Haalt de collega de melding
 * weg, dan verdwijnt een idee dat nog op ingediend staat weer van het bord.
 */
create or replace function public.weekevaluatie_naar_bord() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  melding text := nullif(btrim(coalesce(new.antwoorden ->> 'melding', '')), '');
  soort text := coalesce(new.antwoorden -> 'melding_soort' ->> 0, 'anders');
  vertrouwelijk boolean := coalesce((new.antwoorden ->> 'melding_nu')::boolean, false);
begin
  if soort not in ('idee', 'zorg', 'compliment', 'vraag', 'anders') then soort := 'anders'; end if;
  if melding is null then
    delete from public.ideeen
    where door = new.user_id and bron = 'weekevaluatie' and bron_week = new.week and status = 'ingediend';
    return new;
  end if;
  insert into public.ideeen (titel, tekst, soort, door, door_email, vertrouwelijk, bron, bron_week, created_at)
  values (public.idee_titel(melding), melding, soort, new.user_id, new.door, vertrouwelijk, 'weekevaluatie', new.week, new.created_at)
  on conflict (door, bron_week) do update set
    titel = case when ideeen.status in ('ingediend', 'bekeken') then excluded.titel else ideeen.titel end,
    tekst = case when ideeen.status in ('ingediend', 'bekeken') then excluded.tekst else ideeen.tekst end,
    soort = case when ideeen.status in ('ingediend', 'bekeken') then excluded.soort else ideeen.soort end,
    vertrouwelijk = excluded.vertrouwelijk,
    door_email = coalesce(excluded.door_email, ideeen.door_email);
  return new;
end;
$$;

create trigger weekevaluaties_naar_bord after insert or update of antwoorden on public.weekevaluaties
  for each row execute function public.weekevaluatie_naar_bord();

-- Wat er al gemeld is, komt één keer op het bord.
insert into public.ideeen (titel, tekst, soort, door, door_email, vertrouwelijk, bron, bron_week, created_at)
select
  public.idee_titel(w.antwoorden ->> 'melding'),
  btrim(w.antwoorden ->> 'melding'),
  case when coalesce(w.antwoorden -> 'melding_soort' ->> 0, '') in ('idee', 'zorg', 'compliment', 'vraag', 'anders') then w.antwoorden -> 'melding_soort' ->> 0 else 'anders' end,
  w.user_id, w.door,
  coalesce((w.antwoorden ->> 'melding_nu')::boolean, false),
  'weekevaluatie', w.week, w.created_at
from public.weekevaluaties w
where nullif(btrim(coalesce(w.antwoorden ->> 'melding', '')), '') is not null
on conflict (door, bron_week) do nothing;

/* ---------- rechten ---------- */

alter table public.ideeen enable row level security;
alter table public.idee_stemmen enable row level security;
alter table public.idee_reacties enable row level security;
alter table public.idee_meldingen enable row level security;

revoke all on public.ideeen, public.idee_stemmen, public.idee_reacties, public.idee_meldingen from anon;

-- Lezen: je eigen ideeën altijd; de rest met het recht ideeen of omzet, en
-- vertrouwelijke alleen met omzet.
create policy ideeen_lezen on public.ideeen
  for select to authenticated using (
    door = auth.uid()
    or ((public.has_perm('ideeen') or public.has_perm('omzet')) and (not vertrouwelijk or public.has_perm('omzet')))
  );
-- Indienen: je eigen idee, op ingediend, zonder reden, vanaf het bord (de
-- weekevaluatie gaat via de trigger).
create policy ideeen_indienen on public.ideeen
  for insert to authenticated with check (
    public.has_perm('ideeen') and door = auth.uid() and status = 'ingediend' and reden is null and bron = 'bord'
  );
-- Je eigen idee aanpassen zolang het op ingediend staat; de status blijft ingediend.
create policy ideeen_zelf_wijzigen on public.ideeen
  for update to authenticated
  using (door = auth.uid() and status = 'ingediend')
  with check (door = auth.uid() and status = 'ingediend' and reden is null);
-- Het beheer zet de status en de reden, en mag alles aanpassen.
create policy ideeen_beheer on public.ideeen
  for update to authenticated using (public.has_perm('omzet')) with check (public.has_perm('omzet'));
create policy ideeen_weg on public.ideeen
  for delete to authenticated using ((door = auth.uid() and status = 'ingediend') or public.has_perm('omzet'));

-- Stemmen: te zien bij elk idee dat je mag zien; één stem per collega, niet op het eigen idee; intrekken mag altijd.
create policy idee_stemmen_lezen on public.idee_stemmen
  for select to authenticated using (exists (select 1 from public.ideeen i where i.id = idee_id));
create policy idee_stemmen_zetten on public.idee_stemmen
  for insert to authenticated with check (
    public.has_perm('ideeen') and user_id = auth.uid()
    and exists (select 1 from public.ideeen i where i.id = idee_id and i.door is distinct from auth.uid())
  );
create policy idee_stemmen_intrekken on public.idee_stemmen
  for delete to authenticated using (user_id = auth.uid());

-- Reacties: bij elk idee dat je mag zien; je eigen reactie haal je weg, het beheer elke.
create policy idee_reacties_lezen on public.idee_reacties
  for select to authenticated using (exists (select 1 from public.ideeen i where i.id = idee_id));
create policy idee_reacties_plaatsen on public.idee_reacties
  for insert to authenticated with check (
    (public.has_perm('ideeen') or public.has_perm('omzet')) and user_id = auth.uid()
    and exists (select 1 from public.ideeen i where i.id = idee_id)
  );
create policy idee_reacties_weg on public.idee_reacties
  for delete to authenticated using (user_id = auth.uid() or public.has_perm('omzet'));

-- Meldingen: alleen je eigen; schrijven doen de triggers.
create policy idee_meldingen_lezen on public.idee_meldingen
  for select to authenticated using (user_id = auth.uid());
create policy idee_meldingen_gelezen on public.idee_meldingen
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy idee_meldingen_weg on public.idee_meldingen
  for delete to authenticated using (user_id = auth.uid());

revoke all on function public.idee_titel(text) from public, anon;
grant execute on function public.idee_titel(text) to authenticated;
