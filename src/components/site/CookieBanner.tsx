"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { DOCUMENTEN } from "@/lib/documenten";
import type { Bedrijfsherkenning } from "@/lib/tracking";
import { useTaal } from "./Taal";
import type { Woordenboek } from "@/lib/woordenboek";

/**
 * Cookiemelding op de publieke site. Gemonteerd in SiteShell: zo staat hij ook
 * op de 404 en niet in het adminpaneel.
 *
 * Er is één keuze: "Statistiek". De site telt bezoek zonder cookies (een hash
 * die elke nacht verandert), maar om een bezoek vanaf een bedrijfsnetwerk tot
 * dat bedrijf te herleiden gaat het IP-adres naar ipinfo.io. Dat vraagt een
 * grondslag. Standaard is dat toestemming: zonder vinkje gebeurt het niet.
 * Staat de instelling op gerechtvaardigd belang (`bedrijfsherkenning:
 * "altijd"`, zie lib/tracking.ts), dan staat het vinkje standaard aan en is
 * uitzetten een bezwaar dat we ook respecteren. De tracker (VisitTracker)
 * stuurt de keuze mee met elk bezoek; de server beslist.
 *
 * De keuze staat 12 maanden in de cookie r2u_cookie_consent. Verandert er iets
 * aan waar je toestemming voor vraagt, hoog dan CONSENT_VERSION op: dan wordt
 * opnieuw gevraagd. Vervang dan ook de cookieverklaring in public/documenten/.
 * Zie CONTEXT.md, *Bewaartermijnen en privacy*.
 */

export const STATISTIEK = "statistiek";

type Category = { id: string; label: string; description: string; standaard: boolean };

/** De categorieën met hun teksten in de taal van de pagina (lib/woordenboek). */
function categorieen(mode: Bedrijfsherkenning, c: Woordenboek["cookies"]): Category[] {
  return [
    {
      id: STATISTIEK,
      label: c.statistiek,
      description: mode === "altijd" ? c.statistiekAltijd : c.statistiekToestemming,
      standaard: mode === "altijd",
    },
  ];
}

export const COOKIE_NAME = "r2u_cookie_consent";
// 2 sinds oktober 2026: toen kwam de keuze "Statistiek" erbij.
const CONSENT_VERSION = 2;
const MAX_AGE = 60 * 60 * 24 * 365;
const OPEN_EVENT = "r2u:open-cookie-settings";
const CHANGED_EVENT = "r2u:consent-changed";
/** De definitieve cookieverklaring (versie oktober 2026), als PDF. */
const POLICY_URL = DOCUMENTEN.cookieverklaring;

type Consent = { v: number; ts: string; choices: Record<string, boolean> };

/** De ruwe waarde van de cookie; "" als hij er niet is. */
function rawConsent(): string {
  if (typeof document === "undefined") return "";
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return hit ? hit.slice(COOKIE_NAME.length + 1) : "";
}

function parseConsent(raw: string): Consent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Consent;
    return parsed?.v === CONSENT_VERSION && typeof parsed.choices === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readConsent(): Consent | null {
  return parseConsent(rawConsent());
}

// De cookie als externe bron voor React (useSyncExternalStore). Op de server
// is hij onbekend (null): dan rendert de banner niets en kan er geen verschil
// met de browser ontstaan. Na het schrijven meldt writeConsent de wijziging.
function subscribe(cb: () => void) {
  window.addEventListener(CHANGED_EVENT, cb);
  return () => window.removeEventListener(CHANGED_EVENT, cb);
}
const onServer = (): string | null => null;

function writeConsent(choices: Record<string, boolean>) {
  const value: Consent = { v: CONSENT_VERSION, ts: new Date().toISOString(), choices };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: value }));
}

/**
 * De keuze voor een categorie: true (aan), false (uit) of null als de bezoeker
 * nog niets heeft gekozen. Dat onderscheid doet ertoe: bij gerechtvaardigd
 * belang telt alleen een uitdrukkelijk "uit" als bezwaar.
 */
export function consentFor(categoryId: string): boolean | null {
  const v = readConsent()?.choices?.[categoryId];
  return typeof v === "boolean" ? v : null;
}

/** Waar als de bezoeker toestemming gaf voor deze categorie. */
export function hasConsent(categoryId: string): boolean {
  return consentFor(categoryId) === true;
}

/** Opent de melding opnieuw, bijvoorbeeld vanuit de footer. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** De tekstknop "Cookie-instellingen" voor de footer; erft letter en kleur van zijn omgeving. */
export function CookieSettingsLink({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const { t } = useTaal();
  return (
    <button type="button" onClick={openCookieSettings} className={`cursor-pointer ${className}`} style={style}>
      {t.footer.cookieInstellingen}
    </button>
  );
}

export default function CookieBanner({ bedrijfsherkenning = "toestemming" }: { bedrijfsherkenning?: Bedrijfsherkenning }) {
  const { t } = useTaal();
  const c = t.cookies;
  const raw = useSyncExternalStore<string | null>(subscribe, rawConsent, onServer);
  const consent = useMemo(() => (raw === null ? null : parseConsent(raw)), [raw]);
  const cats = useMemo(() => categorieen(bedrijfsherkenning, c), [bedrijfsherkenning, c]);
  // Bij gerechtvaardigd belang is de melding een mededeling met een uitknop;
  // bij toestemming een vraag, met Accepteren en Weigeren even zichtbaar.
  const optOut = bedrijfsherkenning === "altijd";
  // Heropend vanuit de footer, of juist weggeklikt zonder iets vast te leggen.
  const [forced, setForced] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [details, setDetails] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const primary = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const open = forced || (raw !== null && consent === null && !dismissed);

  const standaard = () => Object.fromEntries(cats.map((cat) => [cat.id, cat.standaard]));
  const all = (value: boolean) => Object.fromEntries(cats.map((cat) => [cat.id, value]));

  useEffect(() => {
    // Heropenen vanuit de footer: dan is er een klik geweest, en hoort de
    // focus mee te gaan naar de melding. Bij het eerste bezoek juist niet.
    const reopen = () => {
      setChoices(readConsent()?.choices ?? Object.fromEntries(cats.map((cat) => [cat.id, cat.standaard])));
      setDetails(true);
      setForced(true);
      requestAnimationFrame(() => primary.current?.focus());
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [cats]);

  useEffect(() => {
    if (!open) return;
    // Escape sluit. Bij een mededeling (bezwaar mogelijk) is dat hetzelfde als
    // "Prima"; moet er toestemming gegeven worden, dan sluit hij zonder iets
    // vast te leggen — niet kiezen is dan niet toestemmen.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (optOut) writeConsent(Object.fromEntries(cats.map((cat) => [cat.id, cat.standaard])));
      else setDismissed(true);
      setForced(false);
      setDetails(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, optOut, cats]);

  if (!open) return null;

  const save = (keuze: Record<string, boolean>) => {
    writeConsent(keuze);
    setChoices(keuze);
    setForced(false);
    setDetails(false);
  };

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      className="cb-in fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] ml-auto max-w-[560px] rounded-[20px] border border-line bg-white p-5 text-[15px] leading-relaxed text-body shadow-[0_18px_50px_rgb(34_32_90/0.18)] print:hidden sm:inset-x-4 sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
    >
      <p id={titleId} className="mb-1.5 text-[16px] font-bold text-primary">{c.titel}</p>
      <p id={textId}>
        {c.basis} {optOut ? c.optOut : c.toestemming}{" "}
        <a href={POLICY_URL} target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-[3px] hover:text-primary-deep">
          {c.lees}
        </a>
        .
      </p>

      {details && (
        <ul className="mt-4 grid gap-3">
          <li>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-2.5">
              <input type="checkbox" checked disabled className="mt-1 accent-primary" />
              <span>
                <strong className="font-semibold text-primary">{c.functioneel}</strong>
                <span className="block text-[13.5px] text-body/80">{c.functioneelUitleg}</span>
              </span>
            </label>
          </li>
          {cats.map((cat) => (
            <li key={cat.id}>
              <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-2.5">
                <input
                  type="checkbox"
                  className="mt-1 accent-primary"
                  checked={choices[cat.id] === true}
                  onChange={(e) => setChoices({ ...choices, [cat.id]: e.target.checked })}
                />
                <span>
                  <strong className="font-semibold text-primary">{cat.label}</strong>
                  <span className="block text-[13.5px] text-body/80">{cat.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5 sm:justify-end">
        {details ? (
          <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save({ ...all(false), ...choices })}>
            {c.keuzeOpslaan}
          </button>
        ) : optOut ? (
          <>
            <button type="button" className="btn btn-sm btn-outline flex-1 rounded-full sm:flex-none" onClick={() => { setChoices(standaard()); setDetails(true); }}>
              {c.instellingen}
            </button>
            <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save(standaard())}>
              {c.prima}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-sm btn-outline flex-1 rounded-full sm:flex-none" onClick={() => save(all(false))}>
              {c.weigeren}
            </button>
            <button type="button" className="btn btn-sm btn-outline flex-1 rounded-full sm:flex-none" onClick={() => { setChoices(standaard()); setDetails(true); }}>
              {c.instellingen}
            </button>
            <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save(all(true))}>
              {c.accepteren}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
