-- Pas ná de merge van de offertecontract-branch draaien (zie 0026): de code
-- die dan live staat tekent met de variant uit 0026, met code en
-- factuurgegevens. De variant uit 0025 zonder code gaat weg, zodat niemand
-- meer om de bevestigingscode heen kan tekenen.
drop function if exists public.offerte_ondertekenen(text, jsonb, text, text, text, text, text, text);
