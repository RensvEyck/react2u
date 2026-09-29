import { CONTACT_FALLBACK, type ContactInfo } from "./content";
import { FAVICON_URL, LOGO_URL } from "./nav";

/**
 * Onderhoudsmodus (`site_settings.maintenance`).
 *
 * Staat hij aan, dan krijgen bezoekers op elke publieke URL de onderhoudspagina
 * met status 503. Ingelogde beheerders zien de site gewoon. De poort zelf staat
 * in `src/middleware.ts` — zie CONTEXT.md, *Onderhoudsmodus*.
 */
export type Maintenance = { enabled: boolean; message: string };

export const MAINTENANCE_DEFAULT_MESSAGE =
  "We werken op dit moment aan de website. Over een tijdje zijn we weer online.";

export function normalizeMaintenance(value: unknown): Maintenance {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const message = typeof v.message === "string" ? v.message.trim() : "";
  return { enabled: v.enabled === true, message };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * De onderhoudspagina als losse HTML.
 *
 * Bewust geen React-route: een rewrite vanuit de middleware neemt de status van
 * de doelpagina over (200), en dan ziet Google "we zijn zo terug" als de
 * inhoud van elke pagina. Alleen een response die de middleware zelf opbouwt
 * houdt de 503. Daarom ook inline CSS en systeemlettertypes — de gebundelde
 * stylesheet en fonts van de site hebben gehashte namen.
 */
export function maintenancePage(m: Maintenance, contact: Partial<ContactInfo> | null): string {
  const c = { ...CONTACT_FALLBACK, ...(contact || {}) };
  const message = esc(m.message || MAINTENANCE_DEFAULT_MESSAGE);
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>We zijn zo terug • React2u</title>
<link rel="icon" href="${esc(FAVICON_URL)}">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;
    background:#f6f5fb;color:rgba(0,0,0,.61);font:18px/1.56 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{width:100%;max-width:560px;background:#fff;border-radius:24px;padding:40px 32px;text-align:center;
    box-shadow:0 1px 2px rgba(18,16,60,.04),0 18px 40px -24px rgba(18,16,60,.25)}
  img{height:70px;width:auto;margin-bottom:28px}
  h1{margin:0 0 12px;color:#312e82;font-size:30px;line-height:1.2}
  p{margin:0;white-space:pre-line}
  .contact{margin-top:28px;padding-top:24px;border-top:1px solid rgba(13,13,40,.08);font-size:16px}
  a{color:#e75387;font-weight:600;text-decoration:none;white-space:nowrap}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
<main>
  <img src="${esc(LOGO_URL)}" alt="React2u" width="144" height="89">
  <h1>We zijn zo terug</h1>
  <p>${message}</p>
  <div class="contact">
    Direct iemand spreken? Bel <a href="tel:${esc(c.phone)}">${esc(c.phoneDisplay)}</a>
    of mail <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>.
  </div>
</main>
</body>
</html>`;
}
