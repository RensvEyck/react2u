-- Losse klanten en opdrachten (Rens, 4 nov 2026: "we hebben al veel klanten en
-- soms heb je losse klanten met enkele opdracht die moeten we los kunnen
-- opvoeren in het verkoop dashboard"; beide, één voor één).
--
-- - losse_opdrachten: wat er buiten de offertemodule om is afgesproken. Soort
--   'abonnement' (een bestaande klant: bedrag per maand, sinds `datum`, tot
--   `stop` als hij is gestopt) of 'eenmalig' (een losse opdracht: het totaal,
--   in de maand van `datum`). Het salesdashboard en de omzet rekenen ermee
--   alsof het een getekende offerte is (lib/losseOpdrachten.ts).
-- - `vorm` is een offertevorm (verzuimbegeleiding, rie, …) voor het label en de
--   kleur, of leeg ("Overig"). Geen check-constraint op de lijst: die groeit,
--   de app controleert hem (isVorm).
-- - `stop`: de eerste maand zonder omzet, zoals abonnementen_gestopt (0035).
--
-- Rechten: het salesrecht (bellijst) voert op, het recht omzet ook.
--
-- VOLGORDE: na 0035. Zonder deze migratie toont /admin/verkoop/los een
-- melding en tellen de cijfers alleen de offertes.
--
-- Registreren: via apply_migration (naam 0036_losse_opdrachten) vanzelf.

create table public.losse_opdrachten (
  id uuid primary key default gen_random_uuid(),
  soort text not null check (soort in ('abonnement', 'eenmalig')),
  bedrijf text not null check (length(btrim(bedrijf)) between 1 and 200),
  omschrijving text check (length(omschrijving) <= 300),
  vorm text check (length(vorm) <= 40),
  -- Per maand bij een abonnement, het totaal bij een eenmalige opdracht.
  bedrag numeric(10, 2) not null check (bedrag between 0 and 10000000),
  datum date not null,
  stop date check (stop is null or extract(day from stop) = 1),
  verkoper text check (length(verkoper) <= 120),
  contactpersoon text check (length(contactpersoon) <= 200),
  email text check (email is null or length(email) <= 254),
  notitie text check (length(notitie) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint losse_opdrachten_stop check (stop is null or (soort = 'abonnement' and stop > datum))
);

create index losse_opdrachten_datum on public.losse_opdrachten (datum desc);

create trigger losse_opdrachten_updated before update on public.losse_opdrachten
  for each row execute function public.set_updated_at();

alter table public.losse_opdrachten enable row level security;
revoke all on public.losse_opdrachten from anon;

create policy "sales en omzet beheren losse opdrachten" on public.losse_opdrachten
  for all to authenticated
  using (public.has_perm('bellijst') or public.has_perm('omzet'))
  with check (public.has_perm('bellijst') or public.has_perm('omzet'));
