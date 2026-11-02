-- Offertevorm Reflex (bouwt op 0025): Casemanagement Reflex, het abonnement
-- voor uitzendbureaus en eigenrisicodragers Ziektewet, als eigen keuze bij het
-- aanmaken van een offerte (Rens, 2 nov 2026). Alleen de twee controles op
-- `vorm` worden ruimer; bestaande rijen blijven geldig.
--
-- VOLGORDE: na 0028, vóór de code: zonder deze migratie weigert de database een
-- offerte of sjabloon met vorm 'reflex'. De oude code heeft er geen last van.
--
-- Registreren: via apply_migration (naam 0029_offertevorm_reflex) vanzelf.

alter table public.offertes
  drop constraint offertes_vorm_check,
  add constraint offertes_vorm_check
    check (vorm in ('verzuimbegeleiding', 'reflex', 'rie', 'pago', 'verzuimtraining', 'spoor2', 'werkfit', 'arbeidsdeskundig'));

alter table public.offerte_sjablonen
  drop constraint offerte_sjablonen_vorm_check,
  add constraint offerte_sjablonen_vorm_check
    check (vorm in ('verzuimbegeleiding', 'reflex', 'rie', 'pago', 'verzuimtraining', 'spoor2', 'werkfit', 'arbeidsdeskundig'));
