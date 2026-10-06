import { Analytics } from "@vercel/analytics/next";
import Header from "./Header";
import Footer from "./Footer";
import HeaderR2u from "./HeaderR2u";
import FooterR2u from "./FooterR2u";
import VisitTracker from "./VisitTracker";
import CookieBanner from "./CookieBanner";
import BelBalk from "./BelBalk";
import Reveal from "./Reveal";
import { TaalProvider } from "./Taal";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import { nieuwOntwerp } from "@/lib/concept";
import { normalizeTracking } from "@/lib/tracking";
import type { Taal } from "@/lib/taal";

/**
 * Alles om de inhoud van een publieke pagina heen. Gedeeld door de Nederlandse
 * sitelayout (app/(site)) en de Engelse (app/en).
 *
 * `site-root` is de haak voor wat alleen op de site mag gelden en niet in het
 * voorbeeld van de blokeditor: onthullen bij scrollen en de hero die onder de
 * header doorloopt.
 */
export default async function SiteShell({ children, taal = "nl" }: { children: React.ReactNode; taal?: Taal }) {
  const [contact, docs, certificates, tracking] = await Promise.all([
    getSetting<ContactInfo>("contact"),
    getSetting<unknown>("documents"),
    getSetting<unknown>("certificates"),
    getSetting<unknown>("tracking"),
  ]);
  const c = contact || CONTACT_FALLBACK;
  const { bedrijfsherkenning } = normalizeTracking(tracking);
  // Header en footer uit het nieuwe ontwerp: sinds de livegang van oktober
  // 2026 overal (`nieuwOntwerp`), en op de Engelse site hoe dan ook, want die
  // is geschreven op de blokken van het nieuwe ontwerp en de oude Header en
  // Footer kennen het woordenboek niet. `r2u-kop` zet --hh op hun hoogte.
  // Header en Footer blijven als terugvaloptie staan.
  const nieuw = nieuwOntwerp || taal === "en";
  return (
    <TaalProvider taal={taal}>
      <div className={nieuw ? "site-root r2u-kop" : "site-root"}>
        {nieuw ? <HeaderR2u contact={c} /> : <Header contact={c} />}
        <main id="inhoud">
          {children}
          {/* Mobiel, alleen op werkgeverspagina's: bellen of een terugbelmoment.
              Binnen <main>, zodat hij met het mobiele menu mee inert wordt. */}
          <BelBalk contact={c} />
        </main>
        {nieuw ? (
          <FooterR2u contact={c} docs={normalizeDocs(docs)} certificates={normalizeCertificates(certificates)} />
        ) : (
          <Footer contact={c} docs={normalizeDocs(docs)} certificates={normalizeCertificates(certificates)} />
        )}
        {/* Alleen op de publieke site: adminverkeer is jouw eigen verkeer en
            hoort niet in de statistieken. */}
        <VisitTracker />
        {/* Hier en niet in de root-layout: wel op de 404, niet in het adminpaneel. */}
        <CookieBanner bedrijfsherkenning={bedrijfsherkenning} />
        <Reveal />
        <Analytics />
      </div>
    </TaalProvider>
  );
}
