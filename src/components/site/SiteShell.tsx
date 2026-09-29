import { Analytics } from "@vercel/analytics/next";
import Header from "./Header";
import Footer from "./Footer";
import VisitTracker from "./VisitTracker";
import Reveal from "./Reveal";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";

/**
 * Alles om de inhoud van een publieke pagina heen. Gedeeld door de site-layout
 * en de algemene 404 (app/not-found.tsx), die buiten die layout valt.
 *
 * `site-root` is de haak voor wat alleen op de site mag gelden en niet in het
 * voorbeeld van de blokeditor: onthullen bij scrollen en de hero die onder de
 * header doorloopt.
 */
export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const [contact, docs, certificates] = await Promise.all([
    getSetting<ContactInfo>("contact"),
    getSetting<unknown>("documents"),
    getSetting<unknown>("certificates"),
  ]);
  const c = contact || CONTACT_FALLBACK;
  return (
    <div className="site-root">
      <a href="#inhoud"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">
        Naar de inhoud
      </a>
      <Header contact={c} />
      <main id="inhoud">{children}</main>
      <Footer contact={c} docs={normalizeDocs(docs)} certificates={normalizeCertificates(certificates)} />
      {/* Alleen op de publieke site: adminverkeer is jouw eigen verkeer en
          hoort niet in de statistieken. */}
      <VisitTracker />
      <Reveal />
      <Analytics />
    </div>
  );
}
