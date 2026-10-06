import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { supabasePublic } from "./supabase/public";
import { clientIp } from "./analytics";

/**
 * Limiet per IP op de publieke formulieren.
 *
 * Een honeypot houdt domme bots tegen, geen gerichte. Zonder limiet kan één
 * script het Postvak IN volgooien en de cv-opslag volschrijven. Dit telt per
 * sleutel in een vast venster, in de database (de functie `throttle`, migratie
 * 0013) — de server draait op meerdere instanties, dus een teller in het
 * geheugen zou per instantie opnieuw beginnen.
 *
 * Het IP-adres komt de database niet in: de sleutel is een gezouten hash.
 * Zonder ANALYTICS_SALT wordt een vaste string gebruikt — voor een teller die
 * na twee dagen weg is, is dat aanvaardbaar; voor bezoekregistratie niet
 * (zie api/track).
 *
 * Faalt de database of ontbreekt de functie, dan gaat de inzending door
 * (fail open): de limiet is een extra, geen voorwaarde. Dat was tot nu toe ook
 * de situatie, en een haperende limiet mag een echte sollicitant niet tegenhouden.
 */

export type Throttle = { limit: number; windowSeconds: number };

/** Per bezoeker: ruim genoeg voor iemand die zich vergist, te weinig voor een script. */
export const PER_IP: Throttle = { limit: 5, windowSeconds: 60 * 60 };
/** Over alle bezoekers samen: een plafond tegen een verdeelde aanval. */
export const PER_SOORT: Throttle = { limit: 60, windowSeconds: 60 * 60 };

export function throttleKey(kind: string, ip: string, salt: string): string {
  const hash = createHash("sha256").update(`${ip}|${salt}`).digest("hex").slice(0, 24);
  return `${kind}:ip:${hash}`;
}

let gewaarschuwd = false;

async function allowed(key: string, t: Throttle): Promise<boolean> {
  try {
    const { data, error } = await supabasePublic()
      .rpc("throttle", { p_key: key, p_limit: t.limit, p_window_seconds: t.windowSeconds })
      .abortSignal(AbortSignal.timeout(1500));
    if (error) {
      // Eén keer melden, niet bij elke inzending: zonder migratie 0013 is dit
      // de normale toestand tot die gedraaid is.
      if (!gewaarschuwd) {
        gewaarschuwd = true;
        console.warn("[rateLimit] throttle() niet beschikbaar, limiet staat uit:", error.message);
      }
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * Mag deze inzending door? `kind` is het formulier (contact, offerte,
 * sollicitatie, terugbel). Telt per IP én over alle bezoekers samen.
 */
export async function withinLimit(kind: string, perIp: Throttle = PER_IP): Promise<boolean> {
  const h = await headers();
  const ip = clientIp(h);
  const salt = process.env.ANALYTICS_SALT || "r2u-formulieren";
  const checks = [allowed(`${kind}:alle`, PER_SOORT)];
  if (ip) checks.push(allowed(throttleKey(kind, ip, salt), perIp));
  const uitkomsten = await Promise.all(checks);
  return uitkomsten.every(Boolean);
}

/** Het IP van de bezoeker, voor Turnstile; null als het onbekend is. */
export async function requestIp(): Promise<string | null> {
  return clientIp(await headers());
}

export const LIMIET_MELDING =
  "Je hebt kort geleden al een paar keer iets verstuurd. Probeer het over een uur opnieuw, of bel ons.";
