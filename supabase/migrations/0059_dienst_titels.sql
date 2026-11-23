-- Zoekwoord vóór de merknaam op de zes dienstpagina's (HALO-scan, 23 november 2026).
--
-- Een werkgever zoekt op "verzuimbegeleiding", niet op "React2u Recover". De
-- titel en de hoofdkop (het veld `label` van het blok dienstLabel) noemen nu
-- eerst de dienst; de merknaam blijft erachter staan. De adressen blijven
-- gelijk. Dezelfde teksten staan in src/content/<label>.json (het concept
-- voor previews); productie leest de database, dus dit is een datamigratie.

update public.pages p set seo_title = t.seo_title
from (values
  ('recover', 'Verzuimbegeleiding voor werkgevers • React2u Recover'),
  ('restart', 'Re-integratie eerste en tweede spoor • React2u Restart'),
  ('resist',  'Preventie en preventiemedewerker • React2u Resist'),
  ('reward',  'Salarisadministratie en verloning • React2u Reward'),
  ('reflex',  'Ziektewet en verzuim in de flexbranche • React2u Reflex'),
  ('ready',   'HR-advies en arbeidsrecht • React2u Ready')
) as t(slug, seo_title)
where p.slug = t.slug;

update public.blocks b set data = jsonb_set(b.data, '{label}', to_jsonb(t.label))
from public.pages p, (values
  ('recover', 'Verzuimbegeleiding voor werkgevers.'),
  ('restart', 'Re-integratie eerste en tweede spoor.'),
  ('resist',  'Preventie en preventiemedewerker.'),
  ('reward',  'Salarisadministratie en verloning.'),
  ('reflex',  'Ziektewet en verzuim in de flexbranche.'),
  ('ready',   'HR-advies en arbeidsrecht.')
) as t(slug, label)
where b.page_id = p.id and p.slug = t.slug and b.type = 'dienstLabel';
