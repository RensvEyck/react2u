import { after } from "next/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Logo from "@/components/site/Logo";
import OffertePagina from "@/components/offerte/OffertePagina";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import { DOCUMENTEN } from "@/lib/documenten";
import { notifyOfferteBekeken, offerteAdminUrl } from "@/lib/mail";
import type { OffertePubliek } from "@/lib/offertes";

export const dynamic = "force-dynamic";

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
  const collega = await isCollega();
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
    />
  );
}

function Ingetrokken({ offerte }: { offerte: OffertePubliek }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F2EC] px-5 py-16">
      <div className="w-full max-w-[520px] rounded-[22px] bg-white p-8 text-center">
        <Logo className="mx-auto h-10 w-auto" />
        <h1 className="font-heading mt-8 text-[26px] font-bold text-[#322E83]">Deze offerte is niet meer geldig</h1>
        <p className="mt-3 text-[16px] leading-[1.65] text-[#5E5C78]">
          Offerte {offerte.nummer} voor {offerte.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
          {offerte.afzender_naam ? ` Neem contact op met ${offerte.afzender_naam} voor de actuele offerte.` : " Neem contact met ons op voor de actuele offerte."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {offerte.afzender_telefoon && (
            <a href={`tel:${offerte.afzender_telefoon.replace(/[^\d+]/g, "")}`} className="inline-flex h-[48px] items-center rounded-[12px] bg-[#322E83] px-5 text-[15px] font-semibold text-white">
              Bel {offerte.afzender_telefoon}
            </a>
          )}
          {offerte.afzender_email && (
            <a href={`mailto:${offerte.afzender_email}`} className="inline-flex h-[48px] items-center rounded-[12px] border border-[#DCDBEA] px-5 text-[15px] font-semibold text-[#322E83]">
              Mail {offerte.afzender_email}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
