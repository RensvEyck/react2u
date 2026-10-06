import type { Metadata } from "next";
import NietGevonden from "@/components/site/NietGevonden";
import { conceptenActief } from "@/lib/concept";
import { NietGevonden404 } from "@/components/blocks/Blog";

export const metadata: Metadata = { title: "Pagina niet gevonden" };

// Voor notFound() in een sitepagina (onbekende slug, gesloten vacature,
// concept-artikel). Rendert binnen de sitelayout, dus met header en footer.
export default function SiteNotFound() {
  // Op staging het nieuwe ontwerp "404".
  return conceptenActief ? <NietGevonden404 /> : <NietGevonden />;
}
