import { notFound } from "next/navigation";

/**
 * Vangnet voor adressen die op geen enkele route passen, zoals /oud/pad/dieper.
 *
 * Sinds de site drie root layouts heeft (Nederlands, Engels en het admin-
 * paneel; zie RootHtml) is er geen app/not-found.tsx meer die voor alles kan
 * gelden: die heeft één root layout nodig. Dit vangnet laat zulke adressen
 * binnen de Nederlandse sitelayout op (site)/not-found.tsx uitkomen, met
 * header, footer en de 404-registratie van de VisitTracker. /en heeft zijn
 * eigen vangnet in app/en/[...slug].
 *
 * Next 16 stuurt bij notFound() een kaal document (<html id="__next_error__">)
 * met status 404 en bouwt de 404 in de browser op; zo deed de site dat al voor
 * een onbekende slug. Een Suspense-grens om notFound() geeft wél de volledige
 * HTML, maar dan met status 200: een zachte 404, en dat is erger.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default function Vangnet() {
  notFound();
}
