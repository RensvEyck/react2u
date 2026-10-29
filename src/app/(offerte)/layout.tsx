import type { Metadata } from "next";
import RootHtml from "@/components/site/RootHtml";
import { BASIS_METADATA } from "@/lib/metadata";

// Eigen root layout voor de offertepagina's (/offerte/<token>): zonder de
// menu's en voet van de site, want een offerte is een afspraak met één klant en
// geen pagina om vandaan te klikken. Nooit in Google (ook als X-Robots-Tag in
// next.config.ts), en geen referrer: anders gaat de link met het token mee naar
// elke externe site waar de klant op klikt.
export const metadata: Metadata = {
  ...BASIS_METADATA,
  title: "Je offerte van React2u",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function OfferteLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml taal="nl">{children}</RootHtml>;
}
