import type { Metadata } from "next";
import RootHtml from "@/components/site/RootHtml";
import { BASIS_METADATA } from "@/lib/metadata";

// Het adminpaneel is Nederlands en haalt geen site-instellingen op voor zijn
// metadata (zie lib/metadata.ts). De autorisatie zit in (panel)/layout.tsx en
// in de pagina's zelf; dit is alleen het document eromheen.
//
// Niets onder /admin hoort in Google, ook de inlogpagina niet. Daarom hier
// noindex in plaats van de "index, follow" uit BASIS_METADATA, en in
// next.config.ts dezelfde regel als X-Robots-Tag. robots.txt sluit /admin
// bewust niet af: een crawler die de URL niet mag ophalen ziet de noindex
// ook niet, en kan het adres dan toch tonen (zonder inhoud).
export const metadata: Metadata = {
  ...BASIS_METADATA,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml taal="nl">{children}</RootHtml>;
}
