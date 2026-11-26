import { requireAdmin } from "@/lib/admin";
import { WetenOverzicht } from "@/components/admin/weten/WetenPaginas";

export const dynamic = "force-dynamic";

/**
 * Goed om te weten in Mijn React2u (Rens, 26 nov 2026: "zet ook in mijn
 * react2u voor de werknemers"): tegels per onderwerp met uitleg en vragen en
 * antwoorden, voor de collega's. Geen apart recht: wie is ingelogd mag het
 * lezen; het menu toont het in Mijn React2u.
 */
export default async function GoedOmTeWeten() {
  await requireAdmin();
  return <WetenOverzicht />;
}
