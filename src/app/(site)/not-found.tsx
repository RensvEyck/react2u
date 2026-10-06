import type { Metadata } from "next";
import NietGevonden from "@/components/site/NietGevonden";
import { nieuwOntwerp } from "@/lib/concept";
import { NietGevonden404 } from "@/components/blocks/Blog";

export const metadata: Metadata = { title: "Pagina niet gevonden" };

// Voor notFound() in een sitepagina (onbekende slug, gesloten vacature,
// concept-artikel). Rendert binnen de sitelayout, dus met header en footer.
export default function SiteNotFound() {
  // Het nieuwe ontwerp "404"; NietGevonden is de terugvaloptie.
  return nieuwOntwerp ? <NietGevonden404 /> : <NietGevonden />;
}
