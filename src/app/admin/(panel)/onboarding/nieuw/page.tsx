import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import OnboardingForm, { type OnboardingBegin } from "@/components/admin/OnboardingForm";
import { standaardAfzender } from "@/lib/offerteBeheer";
import { BERICHT_STANDAARD } from "@/lib/onboarding";
import type { Contract } from "@/lib/contracten";
import { LuArrowLeft, LuScrollText } from "react-icons/lu";

/**
 * Nieuwe onboarding: voor wie, welke documenten, het persoonlijke woord en de
 * afzender. Vanuit een getekend contract (?contract=<id>) staan de gegevens
 * van de klant al klaar.
 */
export default async function NieuweOnboarding({ searchParams }: { searchParams: Promise<{ contract?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { contract } = await searchParams;
  const [afzender, uitContract] = await Promise.all([
    standaardAfzender(sb, user.id, admin.email),
    contract && /^[0-9a-f-]{36}$/.test(contract)
      ? sb.from("contracten").select("*").eq("id", contract).maybeSingle().then((r) => (r.data as Contract | null) ?? null)
      : Promise.resolve(null),
  ]);
  const begin: OnboardingBegin = {
    ...afzender,
    bericht: BERICHT_STANDAARD,
    ...(uitContract ? { bedrijf: uitContract.bedrijf, contactpersoon: uitContract.contactpersoon, email: uitContract.email, telefoon: uitContract.telefoon } : {}),
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/onboarding" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle onboardings
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe onboarding</h1>
        <p className="text-[14.5px] text-black/50">
          De klant krijgt één persoonlijke pagina met de documenten die je hieronder kiest, in de stijl van de site.
        </p>
        {uitContract && (
          <p className="flex items-center gap-2 text-[14px] text-black/55">
            <LuScrollText className="text-[#312e82]" /> Ingevuld vanuit contract {uitContract.nummer}. Controleer en vul aan.
          </p>
        )}
      </div>
      <OnboardingForm begin={begin} nieuw />
    </div>
  );
}
