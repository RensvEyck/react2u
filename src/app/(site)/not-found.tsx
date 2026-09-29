import type { Metadata } from "next";
import NotFound from "@/components/site/NotFound";

export const metadata: Metadata = { title: "Pagina niet gevonden" };

// Voor notFound() in een sitepagina (onbekende slug, gesloten vacature,
// concept-artikel). Rendert binnen de sitelayout, dus met header en footer.
export default function SiteNotFound() {
  return <NotFound />;
}
