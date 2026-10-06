/**
 * De juridische documenten van React2u, als PDF in public/documenten/ (versie
 * oktober 2026). Er zijn geen webpagina's meer voor: /privacyverklaring en
 * /cookieverklaring verwijzen met een 301 door naar de PDF (zie
 * DOCUMENT_REDIRECTS in redirects.ts). Vervang je een document, zet de nieuwe
 * PDF dan onder dezelfde naam neer; alle links op de site wijzen hierheen.
 */
export const DOCUMENTEN = {
  privacyverklaring: "/documenten/privacyverklaring-react2u.pdf",
  algemeneVoorwaarden: "/documenten/algemene-voorwaarden-react2u.pdf",
  klachtenregeling: "/documenten/klachtenregeling-react2u.pdf",
  cookieverklaring: "/documenten/cookieverklaring-react2u.pdf",
} as const;
