import type { Metadata } from "next";
import { NietGevonden404 } from "@/components/blocks/Blog";
import { woordenboek } from "@/lib/woordenboek";

export const metadata: Metadata = { title: woordenboek("en").nietGevonden.titel };

// Voor notFound() binnen /en: een onbekende Engelse slug, een gesloten
// vacature, of een adres dat op geen enkele /en-route past (het vangnet in
// [...slug]). Rendert binnen de Engelse sitelayout.
export default function EnglishNotFound() {
  return <NietGevonden404 taal="en" />;
}
