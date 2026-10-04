import { Analytics } from "@vercel/analytics/next";
import Header from "./Header";
import Footer from "./Footer";
import HeaderR2u from "./HeaderR2u";
import FooterR2u from "./FooterR2u";
import VisitTracker from "./VisitTracker";
import Reveal from "./Reveal";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import { conceptenActief } from "@/lib/concept";

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
    // Op staging (concepten) de header en footer uit het nieuwe ontwerp;
    // productie houdt Header en Footer. `r2u-kop` zet --hh op hun hoogte.
    <div className={conceptenActief ? "site-root r2u-kop" : "site-root"}>
      {conceptenActief ? <HeaderR2u contact={c} /> : <Header contact={c} />}
      <main id="inhoud">{children}</main>
      {conceptenActief ? (
        <FooterR2u contact={c} docs={normalizeDocs(docs)} certificates={normalizeCertificates(certificates)} />
      ) : (
        <Footer contact={c} docs={normalizeDocs(docs)} certificates={normalizeCertificates(certificates)} />
      )}
      {/* Alleen op de publieke site: adminverkeer is jouw eigen verkeer en
          hoort niet in de statistieken. */}
      <VisitTracker />
      <Reveal />
      <Analytics />
    </div>
  );
}
