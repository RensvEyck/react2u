/**
 * Hulpfuncties voor het dashboard. Puur: geen database, geen DOM.
 *
 * Tijd rekent hier in Europe/Amsterdam. De server draait in UTC, en een
 * "Goedemorgen" om kwart over twaalf 's middags (of een datum van gisteren
 * rond middernacht) is precies het soort detail dat het geheel goedkoop maakt.
 */

const TZ = "Europe/Amsterdam";

function hourIn(now: Date): number {
  return Number(new Intl.DateTimeFormat("nl-NL", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
}

export function greeting(now = new Date()): string {
  const h = hourIn(now);
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

/** "dinsdag 29 september" */
export function longDate(now = new Date()): string {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(now);
}

// Gedeelde mailboxen zijn geen naam. "Goedemorgen, Info" is erger dan geen naam.
const GENERIC_MAILBOXES = new Set([
  "info", "admin", "beheer", "contact", "hr", "office", "kantoor", "support", "noreply", "no-reply",
  "website", "web", "mail", "post", "hallo", "hello", "team", "sales", "verkoop", "administratie",
]);

/**
 * Voornaam uit een e-mailadres, als die er redelijkerwijs in staat.
 *
 * "rens@…" en "rens.vaneyck@…" geven "Rens". Alles wat niet op een naam lijkt
 * (cijfers, gedeelde mailboxen, losse letters) geeft null, en dan groet het
 * dashboard zonder naam.
 */
export function firstName(email: string | null | undefined): string | null {
  const local = (email || "").split("@")[0]?.toLowerCase() || "";
  const first = local.split(/[._-]/)[0] || "";
  if (first.length < 2 || !/^[a-zà-ÿ]+$/.test(first) || GENERIC_MAILBOXES.has(first)) return null;
  return first[0].toUpperCase() + first.slice(1);
}

/** Hoe lang iets al wacht, kort: "12 min", "5 uur", "3 dagen". */
export function waited(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} uur`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 dag" : `${days} dagen`;
}

/** "vandaag 14:32", "gisteren 09:10", "12 sep 14:32", "3 mrt 2025 10:00". */
export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(x);
  const time = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(d) === day(now)) return `vandaag ${time}`;
  if (day(d) === day(yesterday)) return `gisteren ${time}`;
  const sameYear = day(d).slice(0, 4) === day(now).slice(0, 4);
  const date = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: TZ,
  }).format(d);
  return `${date.replace(".", "")} ${time}`;
}

/**
 * Verandering ten opzichte van de vorige periode, in hele procenten.
 *
 * Null als er vorige periode niets was: "+∞%" of "+100%" vanaf nul zegt niets,
 * en een pijl omhoog op basis van twee bezoekers wekt valse verwachtingen.
 */
export function trend(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Dagen tussen twee "YYYY-MM-DD"-datums; negatief als `to` voor `from` ligt. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/* ---------- systeemstatus ---------- */

export type SystemCheck = {
  key: string;
  ok: boolean;
  label: string;
  /** Wat er gebeurt als dit uit staat, in gewone taal. */
  impact: string;
};

/**
 * Welke koppelingen aan staan. Alleen of een variabele gezet is — nooit de
 * waarde, want die hoort niet in een scherm.
 *
 * Elk van deze onderdelen faalt stil als de configuratie ontbreekt (zie
 * CONTEXT.md). Dat is goed voor bezoekers, maar betekent dat niemand het merkt.
 * Dit is de plek waar je het wél ziet.
 */
export function systemChecks(env: Record<string, string | undefined>): SystemCheck[] {
  const set = (k: string) => Boolean(env[k]?.trim());
  return [
    {
      key: "mail",
      ok: set("RESEND_API_KEY") && set("NOTIFY_TO") && set("NOTIFY_FROM"),
      label: "Mail bij nieuwe inzendingen",
      impact: "Nieuwe berichten en sollicitaties komen alleen in het Postvak IN — niemand krijgt een mail.",
    },
    {
      key: "salt",
      ok: set("ANALYTICS_SALT"),
      label: "Bezoekregistratie",
      impact: "Er wordt geen bezoek geregistreerd: zonder geheim zout slaat de tracker niets op.",
    },
    {
      key: "ipinfo",
      ok: set("IPINFO_TOKEN"),
      label: "Bedrijfsherkenning",
      impact: "Bezoek wordt geteld, maar zonder bedrijfsnaam.",
    },
    {
      key: "invite",
      ok: set("SUPABASE_SERVICE_ROLE_KEY"),
      label: "Collega's uitnodigen",
      impact: "Uitnodigen vanuit Gebruikers werkt niet.",
    },
  ];
}
