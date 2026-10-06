"use client";
import { useEffect, useRef } from "react";

/**
 * Het Turnstile-widget van Cloudflare in een formulier. Zet het token in het
 * verborgen veld `cf-turnstile-response`; de server action controleert het
 * (src/lib/turnstile.ts). Zonder NEXT_PUBLIC_TURNSTILE_SITE_KEY rendert dit
 * niets, en werkt het formulier zoals altijd.
 *
 * `appearance: interaction-only` toont het widget alleen als Cloudflare echt
 * iets van de bezoeker wil; meestal ziet die er niets van. Na een mislukte
 * inzending is het token gebruikt: `resetKey` laten veranderen (bv. de
 * foutmelding) haalt een nieuw token.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

let laden: Promise<Turnstile | null> | null = null;
function turnstile(): Promise<Turnstile | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!laden) {
    laden = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve(window.turnstile ?? null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return laden;
}

export default function TurnstileField({ resetKey }: { resetKey?: unknown }) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let weg = false;
    turnstile().then((t) => {
      if (weg || !t || !el.current) return;
      id.current = t.render(el.current, {
        sitekey: SITE_KEY,
        size: "flexible",
        appearance: "interaction-only",
        "response-field-name": "cf-turnstile-response",
        "refresh-expired": "auto",
      });
    });
    return () => {
      weg = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && id.current) window.turnstile?.reset(id.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={el} className="min-h-0 empty:hidden" />;
}
