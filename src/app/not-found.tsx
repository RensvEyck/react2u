import type { Metadata } from "next";
import NietGevonden from "@/components/site/NietGevonden";
import SiteShell from "@/components/site/SiteShell";

export const metadata: Metadata = { title: "Pagina niet gevonden" };

/**
 * Voor URL's die op geen enkele route passen, zoals /oud/pad/dieper. Die
 * vallen buiten (site)/layout.tsx, dus hier zelf de SiteShell eromheen: header,
 * footer en de VisitTracker (zonder die zou deze 404 niet gemeld worden).
 * Next zet op een 404 zelf `noindex`.
 */
export default function RootNotFound() {
  return (
    <SiteShell>
      <NietGevonden />
    </SiteShell>
  );
}
