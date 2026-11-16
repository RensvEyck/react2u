import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { bedrijfSleutel, koppelIndex, vandaagNL, type Bronnen, type Gesprek, type Klant, type Koppeling } from "@/lib/klanten";
import { onboardingWeergave, type Onboarding } from "@/lib/onboarding";
import Klantenbord from "@/components/admin/klantenbord/Klantenbord";
import { LuDatabase } from "react-icons/lu";

/**
 * Het klantenbord (migratie 0040): alle leads en klanten op één scherm, met
 * de status, het laatste gesprek en de volgende stap. De rijen komen hier
 * vandaan, samen met wat er in de andere modules over dezelfde bedrijven
 * staat (offertes, brochures, contracten, onboardings, de bellijst); het bord
 * zelf is een client component die zichzelf bijwerkt.
 */

type OnboardingRij = Pick<Onboarding, "id" | "nummer" | "status" | "bedrijf" | "documenten" | "taken" | "bekeken_at" | "verstuurd_at" | "afgerond_at" | "created_at">;

const leesContracten = (sb: Awaited<ReturnType<typeof requirePerm>>["sb"], metSoort: boolean) =>
  sb.from("contracten").select(`id, nummer, status, bedrijf, verstuurd_at, getekend_at, created_at${metSoort ? ", soort" : ""}`).neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000);

export default async function KlantenbordPagina({ searchParams }: { searchParams: Promise<{ weergave?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { weergave } = await searchParams;
  const vandaag = vandaagNL();

  const [kRes, gRes, oRes, bRes, cRes, obRes, lRes] = await Promise.all([
    sb.from("klanten").select("*").order("updated_at", { ascending: false }).limit(2000),
    sb.from("klant_gesprekken").select("*").order("op", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    sb.from("offertes").select("id, nummer, status, bedrijf, verstuurd_at, getekend_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    sb.from("brochures").select("id, nummer, status, bedrijf, verstuurd_at, bekeken_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    // `soort` bestaat pas sinds 0033; daarvoor is elk contract een basiscontract.
    leesContracten(sb, true).then((r) => (r.error && (r.error.code === "42703" || r.error.code === "PGRST204") ? leesContracten(sb, false) : r)),
    sb.from("onboardings").select("id, nummer, status, bedrijf, documenten, taken, bekeken_at, verstuurd_at, afgerond_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    sb.from("leads").select("id, name, company, status, follow_up_on").limit(2000),
  ]);

  const tabel = !kRes.error || !isMissingTable(kRes.error);
  const klanten = ((kRes.data as Klant[] | null) || []);
  const gesprekken = ((gRes.data as Gesprek[] | null) || []);
  const bronnen: Bronnen = {
    offertes: (oRes.data as unknown as Bronnen["offertes"] | null) || [],
    brochures: (bRes.data as unknown as Bronnen["brochures"] | null) || [],
    contracten: (cRes.data as unknown as Bronnen["contracten"] | null) || [],
    onboardings: (((obRes.data as unknown as OnboardingRij[] | null) || []).map((o) => ({ ...o, weergave: onboardingWeergave(o) }))),
    leads: (lRes.data as Bronnen["leads"] | null) || [],
  };
  const index = koppelIndex(bronnen);
  const koppelingen: Record<string, Koppeling[]> = {};
  for (const k of klanten) {
    const x = index.get(k.sleutel || bedrijfSleutel(k.bedrijf));
    if (x?.length) koppelingen[k.id] = x;
  }

  return (
    <>
      {!tabel && (
        <div className="acard mb-6 flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Het klantenbord staat nog niet aan: voer <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0040_klantenbord.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}
      <Klantenbord klanten={klanten} gesprekken={gesprekken} koppelingen={koppelingen} vandaag={vandaag} weergave={weergave === "lijst" ? "lijst" : "bord"} />
    </>
  );
}
