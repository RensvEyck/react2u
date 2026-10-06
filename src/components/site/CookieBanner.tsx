"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";

/**
 * Cookiemelding op de publieke site. Gemonteerd in SiteShell: zo staat hij ook
 * op de 404 en niet in het adminpaneel.
 *
 * Zolang OPTIONAL_CATEGORIES leeg is, meldt de banner alleen dat de site
 * functionele cookies gebruikt; daar is geen toestemming voor nodig. Komt er
 * later statistiek of marketing bij, voeg dan een categorie toe. De banner
 * vraagt dan om toestemming, met Accepteren en Weigeren even zichtbaar. Laad
 * zulke scripts alleen als hasConsent('<id>') waar is, hoog CONSENT_VERSION op
 * (dan wordt opnieuw gevraagd) en werk /cookieverklaring bij
 * (src/content/cookieverklaring.json). Zie CONTEXT.md, *Bewaartermijnen en privacy*.
 *
 * De keuze staat 12 maanden in de cookie r2u_cookie_consent.
 */

type Category = { id: string; label: string; description: string };

// Leeg = alleen functionele cookies. Voorbeeld voor later:
// { id: "analytics", label: "Statistiek", description: "Helpt ons te zien hoe de website wordt gebruikt." }
const OPTIONAL_CATEGORIES: Category[] = [];

export const COOKIE_NAME = "r2u_cookie_consent";
const CONSENT_VERSION = 1;
const MAX_AGE = 60 * 60 * 24 * 365;
const OPEN_EVENT = "r2u:open-cookie-settings";
const CHANGED_EVENT = "r2u:consent-changed";
const POLICY_URL = "/cookieverklaring";

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

/** Waar als de bezoeker toestemming gaf voor deze categorie. */
export function hasConsent(categoryId: string): boolean {
  return readConsent()?.choices?.[categoryId] === true;
}

/** Opent de melding opnieuw, bijvoorbeeld vanuit de footer. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** De tekstknop "Cookie-instellingen" voor de footer; erft letter en kleur van zijn omgeving. */
export function CookieSettingsLink({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={openCookieSettings} className={`cursor-pointer ${className}`} style={style}>
      Cookie-instellingen
    </button>
  );
}

export default function CookieBanner() {
  const raw = useSyncExternalStore<string | null>(subscribe, rawConsent, onServer);
  const consent = useMemo(() => (raw === null ? null : parseConsent(raw)), [raw]);
  // Heropend vanuit de footer, of juist weggeklikt zonder iets vast te leggen.
  const [forced, setForced] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [details, setDetails] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const primary = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const informative = OPTIONAL_CATEGORIES.length === 0;
  const open = forced || (raw !== null && consent === null && !dismissed);

  useEffect(() => {
    // Heropenen vanuit de footer: dan is er een klik geweest, en hoort de
    // focus mee te gaan naar de melding. Bij het eerste bezoek juist niet.
    const reopen = () => {
      setChoices(readConsent()?.choices ?? {});
      setDetails(!informative);
      setForced(true);
      requestAnimationFrame(() => primary.current?.focus());
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [informative]);

  useEffect(() => {
    if (!open) return;
    // Escape sluit. Bij een mededeling is dat hetzelfde als "Prima"; moet er
    // toestemming gegeven worden, dan sluit hij zonder iets vast te leggen.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (informative) writeConsent({});
      else setDismissed(true);
      setForced(false);
      setDetails(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, informative]);

  if (!open) return null;

  const save = (c: Record<string, boolean>) => {
    writeConsent(c);
    setChoices(c);
    setForced(false);
    setDetails(false);
  };
  const all = (value: boolean) => Object.fromEntries(OPTIONAL_CATEGORIES.map((c) => [c.id, value]));

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      className="cb-in fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] ml-auto max-w-[560px] rounded-[20px] border border-line bg-white p-5 text-[15px] leading-relaxed text-body shadow-[0_18px_50px_rgb(34_32_90/0.18)] print:hidden sm:inset-x-4 sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
    >
      <p id={titleId} className="mb-1.5 text-[16px] font-bold text-primary">Cookies op react2u.nl</p>
      <p id={textId}>
        {informative ? (
          <>
            We gebruiken alleen functionele cookies, nodig om de site goed en veilig te laten werken.
            We volgen je niet en plaatsen geen cookies van derden.{" "}
          </>
        ) : (
          <>
            We gebruiken functionele cookies om de site te laten werken. Met jouw toestemming ook andere
            cookies. Je keuze pas je altijd aan via Cookie-instellingen onderaan de pagina.{" "}
          </>
        )}
        <Link href={POLICY_URL} className="font-semibold text-primary underline underline-offset-[3px] hover:text-primary-deep">
          Lees de cookieverklaring
        </Link>
        .
      </p>

      {details && !informative && (
        <ul className="mt-4 grid gap-3">
          <li>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-2.5">
              <input type="checkbox" checked disabled className="mt-1 accent-primary" />
              <span>
                <strong className="font-semibold text-primary">Functioneel</strong>
                <span className="block text-[13.5px] text-body/80">Nodig voor een goede en veilige werking. Altijd aan.</span>
              </span>
            </label>
          </li>
          {OPTIONAL_CATEGORIES.map((c) => (
            <li key={c.id}>
              <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-2.5">
                <input
                  type="checkbox"
                  className="mt-1 accent-primary"
                  checked={choices[c.id] === true}
                  onChange={(e) => setChoices({ ...choices, [c.id]: e.target.checked })}
                />
                <span>
                  <strong className="font-semibold text-primary">{c.label}</strong>
                  <span className="block text-[13.5px] text-body/80">{c.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5 sm:justify-end">
        {informative ? (
          <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save({})}>
            Prima
          </button>
        ) : details ? (
          <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save({ ...all(false), ...choices })}>
            Keuze opslaan
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-sm btn-outline flex-1 rounded-full sm:flex-none" onClick={() => save(all(false))}>
              Weigeren
            </button>
            <button type="button" className="btn btn-sm btn-outline flex-1 rounded-full sm:flex-none" onClick={() => setDetails(true)}>
              Instellingen
            </button>
            <button ref={primary} type="button" className="btn btn-sm btn-indigo flex-1 rounded-full sm:flex-none" onClick={() => save(all(true))}>
              Accepteren
            </button>
          </>
        )}
      </div>
    </section>
  );
}
