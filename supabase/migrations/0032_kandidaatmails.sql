-- Vaste mails aan kandidaten vanuit Sollicitaties (uitnodiging, tussenbericht,
-- afwijzing, aanbod; zie src/lib/kandidaatMail.ts): per sollicitatie een logboek
-- van wat er wanneer door wie is gestuurd, zodat collega's elkaar niet dubbel
-- mailen en de fase klopt met wat de kandidaat te horen kreeg.
--
-- Zolang deze kolom er niet is, schrijft de actie de regel in `notitie`.

alter table public.applications
  add column if not exists mails jsonb not null default '[]'::jsonb;
