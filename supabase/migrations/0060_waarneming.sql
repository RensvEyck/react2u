-- Waarneming in Mijn React2u (Rens, 23 nov 2026, uit het voorstel voor het
-- portaal: "wie neemt wie waar als iemand er niet is"). Een collega zegt
-- "ik ben er niet van X tot Y, N neemt waar"; het beheer regelt het voor wie
-- dat zelf niet kan of nog geen waarnemer heeft. De klantenkaart, het
-- klantenbord, het CM-overleg en het dashboard laten zien wie er voor een
-- klant is zolang de eigen casemanager er niet is.
--
-- Alleen de werkoverdracht. Verlof, ziekte en de reden van afwezigheid horen
-- in Toeqan (HR) en in XpertSuite (medisch), niet hier: er is geen veld voor
-- de reden, en de toelichting is voor wat de waarnemer moet weten om het werk
-- over te nemen. Niets medisch (Rens, 19 nov 2026): geen namen van werknemers
-- van klanten en geen dossiers; dat staat bij het invulveld.
--
-- - recht 'waarneming': de waarneming zien en je eigen afwezigheid plannen.
--   Voor de super admin, de beheerder en de werknemer; een eigen recht, zoals
--   'overleg' (0053) en 'ideeen' (0055), en in EIGEN_RECHTEN (permissions.ts),
--   dus een werknemer blijft in Mijn React2u.
-- - regelen voor een ander, en alles wijzigen of weghalen: het recht omzet,
--   net als bij het kwartaaloverzicht, de inwerkreis, het overleg en het bord.
-- - lezen mag ook met bellijst: wie de stamkaart en het klantenbord ziet, moet
--   zien wie er nu voor een klant is.
-- - waarnemingen: wie er niet is (afwezige), van en tot, wie waarneemt
--   (waarnemer; leeg = nog te regelen), welke klanten (klant_ids; leeg = alle
--   klanten die op de stamkaart op naam van de afwezige staan), en een
--   toelichting voor de waarnemer. De e-mailadressen van toen, zodat de kaart
--   leesbaar blijft als een collega vertrekt.
-- - wn_collegas(): wie kan waarnemen (het recht waarneming), met de naam en
--   functie uit de medewerkers. wn_klanten(): de echte klanten met de
--   casemanager van de stamkaart, zonder adres- of factuurgegevens.
--
-- Klanten hangen aan een collega via het naamveld casemanager op de stamkaart
-- (0048, vrije tekst): de code vergelijkt dat met de naam uit de medewerkers
-- (klantenVan in lib/waarneming.ts). Geen nieuwe kolom: de stamkaart blijft de
-- ene plek waar de casemanager staat.
--
-- VOLGORDE: na 0048 (stamkaart met casemanager) en 0044 (medewerkers.user_id).
-- 0056 is van het CM-overleg (dossiers per persoon).
-- Registreren: via apply_migration (naam 0060_waarneming) vanzelf.

/* ---------- recht ---------- */

update public.roles
set permissions = array_append(permissions, 'waarneming')
where key in ('superadmin', 'beheerder', 'werknemer') and not ('waarneming' = any(permissions));

/* ---------- de waarnemingen ---------- */

create table public.waarnemingen (
  id uuid primary key default gen_random_uuid(),
  -- Wie er niet is. Standaard wie het invult; het beheer kan het voor een ander regelen.
  afwezige uuid not null references auth.users(id) on delete cascade default auth.uid(),
  afwezige_email text check (length(afwezige_email) <= 320),
  van date not null,
  tot date not null,
  -- Wie het werk overneemt. Leeg: nog te regelen (het beheer ziet dat als signaal).
  waarnemer uuid references auth.users(id) on delete set null,
  waarnemer_email text check (length(waarnemer_email) <= 320),
  -- Welke klanten de waarnemer overneemt. Leeg = alle klanten die op de stamkaart op naam van de afwezige staan.
  klant_ids uuid[] not null default '{}' check (coalesce(array_length(klant_ids, 1), 0) <= 300),
  -- Wat de waarnemer moet weten om het werk over te nemen. Geen reden van afwezigheid, niets medisch.
  toelichting text check (length(toelichting) <= 1000),
  door uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waarnemingen_periode check (tot >= van and tot - van <= 400),
  constraint waarnemingen_niet_zelf check (waarnemer is null or waarnemer <> afwezige)
);

create index waarnemingen_afwezige on public.waarnemingen (afwezige, van);
create index waarnemingen_periode_idx on public.waarnemingen (van, tot);

create trigger waarnemingen_updated before update on public.waarnemingen
  for each row execute function public.set_updated_at();

-- De e-mailadressen van de afwezige en de waarnemer uit de accounts, ook als
-- het beheer het voor een ander invult (dan klopt de jwt niet als bron).
create or replace function public.waarnemingen_emails() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.afwezige_email := coalesce((select a.email from public.admins a where a.user_id = new.afwezige), new.afwezige_email);
  if new.waarnemer is null then
    new.waarnemer_email := null;
  else
    new.waarnemer_email := coalesce((select a.email from public.admins a where a.user_id = new.waarnemer), new.waarnemer_email);
  end if;
  new.toelichting := nullif(btrim(coalesce(new.toelichting, '')), '');
  return new;
end;
$$;

create trigger waarnemingen_emails before insert or update on public.waarnemingen
  for each row execute function public.waarnemingen_emails();

/* ---------- wie en welke klanten ---------- */

-- Wie kan waarnemen: de collega's met het recht waarneming, met de naam en de
-- functie uit de medewerkers als die gekoppeld zijn. Voor wie de waarneming
-- mag zien.
create or replace function public.wn_collegas() returns table (user_id uuid, email text, naam text, functie text)
language sql stable security definer set search_path = public
as $$
  select a.user_id, a.email, m.naam, m.functie
  from public.admins a
  join public.roles r on r.id = a.role_id
  left join lateral (
    select mw.naam, mw.functie from public.medewerkers mw where mw.user_id = a.user_id order by mw.actief desc, mw.sort limit 1
  ) m on true
  where 'waarneming' = any(r.permissions)
    and (public.has_perm('waarneming') or public.has_perm('omzet') or public.has_perm('bellijst'))
  order by coalesce(m.naam, a.email)
$$;

revoke all on function public.wn_collegas() from public, anon;
grant execute on function public.wn_collegas() to authenticated;

-- De klanten voor de waarneming: echte klanten (akkoord, inrichten, klant)
-- met de casemanager van de stamkaart en de plaats. Geen leads, geen adres-,
-- bank- of contactgegevens: een werknemer leest de klantenlijst zelf niet.
create or replace function public.wn_klanten() returns table (id uuid, bedrijf text, status text, casemanager text, medewerkers integer, plaats text)
language sql stable security definer set search_path = public
as $$
  select k.id, k.bedrijf, k.status, nullif(btrim(k.casemanager), ''), k.medewerkers,
    coalesce(nullif(btrim(k.bezoek_plaats), ''), nullif(btrim(k.post_plaats), ''))
  from public.klanten k
  where k.status in ('akkoord', 'inrichten', 'klant')
    and (public.has_perm('waarneming') or public.has_perm('omzet') or public.has_perm('bellijst'))
  order by k.bedrijf
$$;

revoke all on function public.wn_klanten() from public, anon;
grant execute on function public.wn_klanten() to authenticated;

/* ---------- policies ---------- */

-- Anon heeft hier niets te zoeken; de policies hieronder gelden voor ingelogde collega's.
revoke all on public.waarnemingen from anon;

alter table public.waarnemingen enable row level security;

-- Lezen: wie de waarneming mag zien, het beheer, en wie de stamkaart en het klantenbord ziet.
create policy waarnemingen_lezen on public.waarnemingen
  for select to authenticated using (
    public.has_perm('waarneming') or public.has_perm('omzet') or public.has_perm('bellijst')
  );

-- Plannen: je eigen afwezigheid; het beheer die van iedereen.
create policy waarnemingen_plannen on public.waarnemingen
  for insert to authenticated with check (
    (afwezige = auth.uid() and public.has_perm('waarneming')) or public.has_perm('omzet')
  );

create policy waarnemingen_wijzigen on public.waarnemingen
  for update to authenticated
  using ((afwezige = auth.uid() and public.has_perm('waarneming')) or public.has_perm('omzet'))
  with check ((afwezige = auth.uid() and public.has_perm('waarneming')) or public.has_perm('omzet'));

create policy waarnemingen_weg on public.waarnemingen
  for delete to authenticated using (
    (afwezige = auth.uid() and public.has_perm('waarneming')) or public.has_perm('omzet')
  );
