-- Het team op de kaart van het CM-overleg (Rens, 23 nov 2026: een casemanager
-- zonder klanten ontbrak op de kaart, terwijl ze wel bij Medewerkers stond). De kaart kende alleen de
-- namen die op een stamkaart als casemanager staan; wie nog geen klanten heeft,
-- ontbrak. cm_team() geeft de casemanagers uit Medewerkers (functie met
-- "casemanag", actief), in de volgorde van het team.
--
-- Medewerkers zelf leest alleen wie het recht omzet heeft (0035): daar staan
-- contracturen en uurtarieven in. Deze functie geeft alleen de naam en de
-- volgorde, en alleen aan wie de kaart mag zien (overleg of bellijst, net als
-- cm_kaart() in 0053).

create or replace function public.cm_team()
returns table (naam text, sort integer)
language sql stable security definer set search_path = public
as $$
  select m.naam, m.sort
  from public.medewerkers m
  where m.actief
    and m.functie ~* 'casemanag'
    and (public.has_perm('overleg') or public.has_perm('bellijst'))
  order by m.sort, m.naam
$$;

revoke all on function public.cm_team() from public, anon;
grant execute on function public.cm_team() to authenticated;
