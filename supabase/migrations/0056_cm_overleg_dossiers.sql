-- Dossiers per casemanager (Rens, 23 nov 2026, met de opzetten "CM overleg
-- 18-11" en "CM overleg 02-12"): net als bij de check-in vertelt iedere
-- aanwezige bij Dossiers wat er speelde. Alleen werkwijze en afspraken, geen
-- casus: geen namen, geen diagnoses (de casus zelf staat in XpertSuite).
--
-- De rechten van cm_aanwezigen (0054) gelden ook voor deze kolom: lezen met
-- overleg, schrijven door het beheer en door de notulist van een lopend overleg.

alter table public.cm_aanwezigen add column dossiers text check (length(dossiers) <= 4000);
