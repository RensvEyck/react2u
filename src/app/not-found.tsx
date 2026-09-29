import type { Metadata } from "next";
import NietGevonden from "@/components/site/NietGevonden";
import SiteShell from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false, follow: true },
};

// Voor adressen die op geen enkele route passen (bv. /a/b). Die vallen buiten
// (site)/layout.tsx, dus hier zelf de header en footer eromheen.
export default function NotFound() {
  return (
    <SiteShell>
      <NietGevonden />
    </SiteShell>
  );
}
