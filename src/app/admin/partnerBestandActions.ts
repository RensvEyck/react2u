"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/admin";
import { bestandType, MAX_GROOTTE, PARTNER_BUCKET, padVanPartner, type PartnerBestandSoort } from "@/lib/partnerBestanden";

/*
 * Bestanden bij een partner (migratie 0034). Het uploadvak zet het bestand zelf
 * met de sessie van de collega in de bucket (geen limiet van een server
 * action); hier wordt het vastgelegd en weer weggehaald. Alles achter het
 * salesrecht (`bellijst`), net als de partners.
 */

export type BestandState = { ok: boolean; fout?: string };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Een geüpload bestand vastleggen bij de partner. Lukt dat niet, dan gaat het bestand weer uit de bucket. */
export async function registreerPartnerBestand(
  partnerId: string,
  invoer: { pad: string; naam: string; grootte: number; soort: PartnerBestandSoort; getekend_op?: string | null; notitie?: string | null },
): Promise<BestandState> {
  const { sb, admin } = await requirePerm("bellijst");
  if (!padVanPartner(invoer.pad, partnerId)) return { ok: false, fout: "Dit bestand hoort niet bij deze partner." };
  const type = bestandType(invoer.naam);
  if (!type || !(invoer.grootte > 0) || invoer.grootte > MAX_GROOTTE) return { ok: false, fout: "Alleen pdf, Word en afbeeldingen tot 20 MB." };

  // Staat het er echt? Zonder bestand geen rij.
  const [map, naam] = invoer.pad.split("/");
  const { data: lijst } = await sb.storage.from(PARTNER_BUCKET).list(map, { search: naam, limit: 5 });
  if (!lijst?.some((f) => f.name === naam)) return { ok: false, fout: "Het bestand is niet aangekomen. Probeer het opnieuw." };

  const soort: PartnerBestandSoort = invoer.soort === "overeenkomst" ? "overeenkomst" : "overig";
  const { error } = await sb.from("partner_bestanden").insert({
    partner_id: partnerId,
    pad: invoer.pad,
    naam: invoer.naam.trim().slice(0, 255) || naam,
    grootte: Math.round(invoer.grootte),
    type,
    soort,
    getekend_op: soort === "overeenkomst" && invoer.getekend_op && DATUM.test(invoer.getekend_op) ? invoer.getekend_op : null,
    notitie: invoer.notitie?.trim().slice(0, 1000) || null,
    geupload_door: admin.email,
  });
  if (error) {
    await sb.storage.from(PARTNER_BUCKET).remove([invoer.pad]);
    return {
      ok: false,
      fout: error.code === "PGRST205" || error.code === "42P01" ? "Bestanden staan nog niet aan: migratie 0034 moet eerst in Supabase worden uitgevoerd." : "Vastleggen mislukt.",
    };
  }
  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/admin/partners");
  return { ok: true };
}

/** Een bestand weghalen: eerst uit de bucket, dan de rij. */
export async function verwijderPartnerBestand(partnerId: string, id: string): Promise<BestandState> {
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("partner_bestanden").select("pad").eq("id", id).eq("partner_id", partnerId).maybeSingle();
  if (!data) return { ok: false, fout: "Dit bestand bestaat niet meer." };
  const pad = (data as { pad: string }).pad;
  const { error: opslag } = await sb.storage.from(PARTNER_BUCKET).remove([pad]);
  if (opslag) return { ok: false, fout: "Verwijderen mislukt." };
  await sb.from("partner_bestanden").delete().eq("id", id);
  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/admin/partners");
  return { ok: true };
}
