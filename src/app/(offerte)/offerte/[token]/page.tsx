import { after } from "next/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import OffertePagina from "@/components/offerte/OffertePagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import { DOCUMENTEN } from "@/lib/documenten";
import { notifyOfferteBekeken, offerteAdminUrl } from "@/lib/mail";
import { OFFERTE_EMAIL, type OffertePubliek } from "@/lib/offertes";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/** Net getekend (minder dan een kwartier geleden): dan krijgt de klant de felicitatie, later een rustige bevestiging. */
function netGetekend(at: string | null): boolean {
  return Boolean(at) && Date.now() - new Date(at!).getTime() < 15 * 60_000;
}

/**
 * Is dit een collega met een sessie? Dan telt het bezoek niet mee en kan er
 * niet getekend worden: wie de link uit zijn eigen mail even controleert, moet
 * niet als "bekeken door de klant" in de tijdlijn komen. Alleen met een
 * sessiecookie een query, zoals de onderhoudspoort in de middleware.
 */
async function isCollega(): Promise<boolean> {
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) return false;
  try {
    const sb = await supabaseServer();
    const { data } = await sb.from("admins").select("user_id").limit(1);
    return Boolean(data?.length);
  } catch {
    return false;
  }
}

export default async function OfferteRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const [collega, huisstijl] = await Promise.all([isCollega(), offerteHuisstijl()]);
  const { data } = await supabasePublic().rpc("offerte_bekijken", { p_token: token, p_tel: !collega });
  const offerte = data as OffertePubliek | null;
  if (!offerte) notFound();
  if (offerte.status === "ingetrokken") return <Ingetrokken offerte={offerte} />;

  // De eerste keer dat de klant hem opent: een seintje aan wie hem stuurde.
  if (offerte.eerste_keer && offerte.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = offerte;
    after(() => notifyOfferteBekeken({ to: afzender_email, nummer, bedrijf, adminLink: offerteAdminUrl(id) }));
  }

  return (
    <OffertePagina
      offerte={offerte}
      token={token}
      modus={collega ? "collega" : "klant"}
      voorwaarden={DOCUMENTEN.algemeneVoorwaarden}
      vers={netGetekend(offerte.getekend_at)}
      contact={huisstijl.contact}
      certificaten={huisstijl.certificaten}
    />
  );
}

function Ingetrokken({ offerte }: { offerte: OffertePubliek }) {
  return (
    <OfferteMelding titel="Deze offerte is niet meer geldig" telefoon={offerte.afzender_telefoon} email={offerte.afzender_email || OFFERTE_EMAIL}>
      Offerte {offerte.nummer} voor {offerte.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
      {offerte.afzender_naam ? ` Neem contact op met ${offerte.afzender_naam} voor de actuele offerte.` : " Neem contact met ons op voor de actuele offerte."}
    </OfferteMelding>
  );
}
