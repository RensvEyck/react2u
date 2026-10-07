import type { Metadata } from "next";
import NietGevonden from "@/components/site/NietGevonden";
import { nieuwOntwerp } from "@/lib/concept";
import { NietGevonden404 } from "@/components/blocks/Blog";

// Next zet op een 404 zelf al <meta name="robots" content="noindex">; zonder
// eigen robots hier erfde de pagina daarnaast "index, follow" uit de layout,
// en stonden beide signalen in één document. Nu is het eenduidig noindex.
export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false, follow: true },
};

// Voor notFound() in een sitepagina (onbekende slug, gesloten vacature,
// concept-artikel). Rendert binnen de sitelayout, dus met header en footer.
export default function SiteNotFound() {
  // Het nieuwe ontwerp "404"; NietGevonden is de terugvaloptie.
  return nieuwOntwerp ? <NietGevonden404 /> : <NietGevonden />;
}
