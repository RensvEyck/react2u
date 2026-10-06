import type { Metadata } from "next";
import RootHtml from "@/components/site/RootHtml";
import { BASIS_METADATA } from "@/lib/metadata";

// Het adminpaneel is Nederlands en haalt geen site-instellingen op voor zijn
// metadata (zie lib/metadata.ts). De autorisatie zit in (panel)/layout.tsx en
// in de pagina's zelf; dit is alleen het document eromheen.
export const metadata: Metadata = BASIS_METADATA;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml taal="nl">{children}</RootHtml>;
}
