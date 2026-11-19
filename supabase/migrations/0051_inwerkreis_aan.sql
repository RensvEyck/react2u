-- Inwerkreis aan of uit (Rens, 19 nov 2026: "we moeten het kunnen selecteren en
-- aan of uit zetten", over het inwerktraject). Per collega kiest het beheer
-- onder Gebruikers een traject (de functie) en zet het aan of uit. Uit
-- betekent: de collega ziet de reis niet (geen menu, geen dashboardkaart) en
-- vinkt niets af; de stappen en wat al gedaan is blijven bewaard, en weer aan
-- zetten gaat verder waar het was.

alter table public.inwerkreizen add column aan boolean not null default true;

-- De eigen reis telt alleen als hij aan staat: dan pas leest en vinkt de
-- collega de voortgang (de policies uit 0050 gebruiken deze functie).
create or replace function public.eigen_inwerkreis(reis uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.inwerkreizen where id = reis and user_id = auth.uid() and aan)
$$;
