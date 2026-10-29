import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import OffertePagina from "@/components/offerte/OffertePagina";
import { DOCUMENTEN } from "@/lib/documenten";
import { datumOver, normaliseerRegels, type Offerte, type OffertePubliek } from "@/lib/offertes";

export const dynamic = "force-dynamic";

/**
 * De offerte zoals de klant hem ziet, ook als hij nog een concept is. Buiten
 * het paneel (geen zijmenu), zodat je echt het scherm van de klant ziet; de
 * gegevens komen met je eigen sessie uit de database, zonder het bezoek te
 * tellen.
 */
export default async function OfferteVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("offertes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = data as Offerte;
  const offerte: OffertePubliek = {
    ...o,
    regels: normaliseerRegels(o.regels),
    verlopen: Boolean(o.geldig_tot && o.geldig_tot < datumOver(0)),
  };
  return <OffertePagina offerte={offerte} modus="voorbeeld" voorwaarden={DOCUMENTEN.algemeneVoorwaarden} />;
}
