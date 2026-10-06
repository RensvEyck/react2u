import { CONTACT_FALLBACK, type ContactInfo } from "./content";
import { FAVICON_URL, LOGO_SVG_URL } from "./nav";
import { DOT_R, LOGO_DOTS } from "./brand";

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

const ICON_PHONE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>';
const ICON_MAIL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3 5.5h18v13H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m3.5 6 8.5 7 8.5-7"/></svg>';

/**
 * De onderhoudspagina als losse HTML.
 *
 * Bewust geen React-route: een rewrite vanuit de middleware neemt de status van
 * de doelpagina over (200), en dan ziet Google "we zijn zo terug" als de
 * inhoud van elke pagina. Alleen een response die de middleware zelf opbouwt
 * houdt de 503. Daarom ook inline CSS. De lettertypes komen uit `public/fonts`
 * — dezelfde bestanden die next/font voor de site bundelt, maar daar met een
 * gehashte naam die hier niet te voorspellen is.
 */
export function maintenancePage(m: Maintenance, contact: Partial<ContactInfo> | null): string {
  const c = { ...CONTACT_FALLBACK, ...(contact || {}) };
  const message = esc(m.message || MAINTENANCE_DEFAULT_MESSAGE);
  const address = [c.addressLine1, c.addressLine2].filter(Boolean).map(esc).join(", ");
  const dots = LOGO_DOTS.map(
    ([fill, cx, cy], i) => `<circle class="d" style="--i:${i}" cx="${cx}" cy="${cy}" r="${DOT_R}" fill="${fill}"/>`
  ).join("");
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>We zijn zo terug • React2u</title>
<link rel="icon" href="${esc(FAVICON_URL)}">
<link rel="preload" href="/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face{font-family:"Figtree";src:url(/fonts/figtree-latin.woff2) format("woff2");font-weight:300 900;font-display:swap}
  @font-face{font-family:"DM Sans";src:url(/fonts/dm-sans-latin.woff2) format("woff2");font-weight:100 1000;font-display:swap}
  :root{--indigo:#312e82;--pink:#d4136c;--teal:#00aa98;--ink:rgba(0,0,0,.61)}
  *{box-sizing:border-box}
  html{height:100%}
  body{margin:0;min-height:100%;display:flex;flex-direction:column;color:var(--ink);
    font:18px/1.56 "DM Sans",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
    background:radial-gradient(90rem 40rem at 50% -8rem,#f1f0fa,#fff 70%) no-repeat,#fff}
  header{padding:24px clamp(16px,4vw,48px)}
  header img{display:block;height:48px;width:auto}
  main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:8px 16px 32px}
  .eyebrow{display:inline-flex;align-items:center;gap:10px;margin:0 0 clamp(12px,3vw,28px);
    font-size:14px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}
  .pulse{width:8px;height:8px;border-radius:50%;background:var(--teal);animation:pulse 2.4s ease-out infinite}
  /* Meeschalen met de schermhoogte, zodat de belknop op een laptop zonder scrollen in beeld staat. */
  .mark{position:relative;width:min(100%,600px,max(300px,(100vh - 500px)*1.64));
    width:min(100%,600px,max(300px,(100svh - 500px)*1.64));aspect-ratio:125/76.303;container-type:inline-size}
  .mark svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .d{transform-box:fill-box;transform-origin:center;
    animation:in .6s cubic-bezier(.3,1.5,.5,1) both calc(var(--i)*45ms),
    float 5s ease-in-out infinite calc(var(--i)*-.37s)}
  h1{position:absolute;inset-inline:0;top:47.7%;transform:translateY(-50%);margin:0;white-space:nowrap;
    font:800 clamp(32px,12.4vw,83px)/1 "Figtree",ui-sans-serif,system-ui,sans-serif;font-size:13.8cqw;
    letter-spacing:-.025em;color:var(--indigo)}
  .message{max-width:30em;margin:clamp(16px,4vw,32px) 0 0;font-size:clamp(17px,2.2vw,20px);white-space:pre-line}
  .reach{margin-top:clamp(28px,6vw,48px);display:flex;flex-direction:column;align-items:center;gap:16px}
  .reach p{margin:0;font-size:16px}
  .reach strong{color:var(--indigo);font-weight:600}
  .actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:100px;padding:14px 28px;
    font-size:17px;font-weight:500;line-height:1.5;text-decoration:none;white-space:nowrap;border:1px solid;
    transition:background-color .25s,color .25s,border-color .25s}
  .btn svg{width:18px;height:18px;flex:none}
  .btn-primary{background:var(--pink);border-color:var(--pink);color:#fff}
  .btn-primary:hover{background:transparent;color:var(--pink)}
  .btn-ghost{border-color:rgba(49,46,130,.25);color:var(--indigo)}
  .btn-ghost:hover{border-color:var(--indigo);background:#f6f5fb}
  .btn:focus-visible{outline:3px solid rgba(212,19,108,.5);outline-offset:3px}
  footer{padding:20px 16px 28px;text-align:center;font-size:14px;color:rgba(0,0,0,.45)}
  @keyframes in{from{opacity:0;scale:.2}}
  @keyframes float{50%{translate:0 -.9px}}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0,170,152,.45)}70%,100%{box-shadow:0 0 0 10px rgba(0,170,152,0)}}
  @media (max-width:520px){
    header{display:flex;justify-content:center}
    header img{height:40px}
    .actions{flex-direction:column;align-self:stretch}
  }
  @media (prefers-reduced-motion:reduce){.d,.pulse{animation:none}}
</style>
</head>
<body>
<header><img src="${esc(LOGO_SVG_URL)}" alt="React2u" width="125" height="76"></header>
<main>
  <p class="eyebrow"><span class="pulse" aria-hidden="true"></span>Onderhoud</p>
  <div class="mark">
    <svg viewBox="0 0 125 76.303" aria-hidden="true" focusable="false">${dots}</svg>
    <h1>We zijn zo terug</h1>
  </div>
  <p class="message">${message}</p>
  <div class="reach">
    <p><strong>De website is even offline, wij niet.</strong> Bel of mail ons gerust.</p>
    <div class="actions">
      <a class="btn btn-primary" href="tel:${esc(c.phone)}">${ICON_PHONE}${esc(c.phoneDisplay)}</a>
      <a class="btn btn-ghost" href="mailto:${esc(c.email)}">${ICON_MAIL}${esc(c.email)}</a>
    </div>
  </div>
</main>
<footer>React2u${address ? ` · ${address}` : ""}</footer>
</body>
</html>`;
}
