-- De privacyverklaring is alleen nog een PDF (/documenten/privacyverklaring-react2u.pdf).
-- /privacyverklaring verwijst daar met een 301 naartoe (DOCUMENT_REDIRECTS in
-- src/lib/redirects.ts), dus de databasepagina is onbereikbaar geworden. Hij
-- gaat uit publicatie, zodat hij niet meer in de bouw of de sitemap terechtkomt.
-- De inhoud blijft bewaard (ongepubliceerd); verwijderen kan later via de admin.
update pages
   set published = false,
       updated_at = now()
 where slug = 'privacyverklaring'
   and published;
