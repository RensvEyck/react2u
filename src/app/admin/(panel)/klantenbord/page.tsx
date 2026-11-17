import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { bedrijfSleutel, bezoekPerKlant, koppelIndex, vandaagNL, type Bezoek, type Bronnen, type Gesprek, type Klant, type Koppeling } from "@/lib/klanten";
import { onboardingWeergave, type Onboarding } from "@/lib/onboarding";
import { fetchPageViews } from "@/lib/analyticsDb";
import { summarize, type CompanyProfile } from "@/lib/companies";
import type { PageView } from "@/lib/types";
import Klantenbord from "@/components/admin/klantenbord/Klantenbord";
import { mailReady } from "@/lib/mail";
import { haalVerkoop, verkoopOverzicht } from "@/lib/opvolgenDb";
import { werkrij } from "@/lib/werkrij";
import { LuDatabase } from "react-icons/lu";

/**
 * Het klantenbord (migratie 0040): alle leads en klanten op één scherm, met
 * de status, het laatste gesprek en de volgende stap. De rijen komen hier
 * vandaan, samen met wat er in de andere modules over dezelfde bedrijven
 * staat (offertes, brochures, contracten, onboardings, klantevaluaties, de bellijst); het bord
 * zelf is een client component die zichzelf bijwerkt.
 */

type OnboardingRij = Pick<Onboarding, "id" | "nummer" | "status" | "bedrijf" | "documenten" | "taken" | "bekeken_at" | "verstuurd_at" | "afgerond_at" | "created_at">;

const leesContracten = (sb: Awaited<ReturnType<typeof requirePerm>>["sb"], metSoort: boolean) =>
  sb.from("contracten").select(`id, nummer, status, bedrijf, verstuurd_at, getekend_at, created_at${metSoort ? ", soort" : ""}`).neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000);

export default async function KlantenbordPagina({ searchParams }: { searchParams: Promise<{ weergave?: string }> }) {
  const { sb, admin } = await requirePerm("bellijst");
  const { weergave } = await searchParams;
  const vandaag = vandaagNL();
  const nu = new Date();
  // Wie het bezoek mag zien, ziet op de kaart ook of het bedrijf de laatste twee weken op de site was (bedrijfsherkenning, 0010).
  const metBezoek = admin.permissions.includes("bezoek");
  const sinds = new Date(nu.getTime() - 14 * 86_400_000).toISOString();

  const [kRes, gRes, oRes, bRes, cRes, obRes, lRes, pvRes, prRes, verkoop, evRes] = await Promise.all([
    sb.from("klanten").select("*").order("updated_at", { ascending: false }).limit(2000),
    sb.from("klant_gesprekken").select("*").order("op", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    sb.from("offertes").select("id, nummer, status, bedrijf, verstuurd_at, getekend_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    sb.from("brochures").select("id, nummer, status, bedrijf, verstuurd_at, bekeken_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    // `soort` bestaat pas sinds 0033; daarvoor is elk contract een basiscontract.
    leesContracten(sb, true).then((r) => (r.error && (r.error.code === "42703" || r.error.code === "PGRST204") ? leesContracten(sb, false) : r)),
    sb.from("onboardings").select("id, nummer, status, bedrijf, documenten, taken, bekeken_at, verstuurd_at, afgerond_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    sb.from("leads").select("id, name, company, status, follow_up_on").limit(2000),
    metBezoek ? fetchPageViews(sb, sinds, "path, referrer_host, visitor_hash, created_at, company, company_domain, company_source, is_company", { onlyCompanies: true }).catch(() => [] as PageView[]) : Promise.resolve([] as PageView[]),
    metBezoek ? sb.from("company_profiles").select("key, name, domain, ignored, lead_id") : Promise.resolve({ data: null }),
    // Voor de teller op de knop Vandaag: dezelfde signalen als de werkrij.
    haalVerkoop(sb, nu).catch(() => null),
    // Klantevaluaties (0043); vóór die migratie bestaat de tabel niet, dan gewoon geen koppelingen.
    sb.from("evaluaties").select("id, nummer, status, bedrijf, bekeken_at, verstuurd_at, ingevuld_at, created_at").neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
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
    evaluaties: (evRes.data as unknown as Bronnen["evaluaties"] | null) || [],
  };
  const index = koppelIndex(bronnen);
  const koppelingen: Record<string, Koppeling[]> = {};
  for (const k of klanten) {
    const x = index.get(k.sleutel || bedrijfSleutel(k.bedrijf));
    if (x?.length) koppelingen[k.id] = x;
  }
  // Dezelfde herkenning en sessies als Bezoek → Bedrijven, zonder wie niet gevolgd wordt.
  const bedrijvenOpSite = metBezoek
    ? summarize((pvRes as PageView[]).filter((v) => v.is_company), ((prRes as { data: CompanyProfile[] | null }).data) || [], [], nu).filter((c) => !c.ignored)
    : [];
  const bezoek: Record<string, Bezoek> = bezoekPerKlant(klanten, bedrijvenOpSite);
  const signalen = verkoop ? verkoopOverzicht(verkoop, bedrijvenOpSite.map((c) => ({ naam: c.name, domein: c.domain, laatst: c.lastSeen, paginas: c.views })), nu).signalen : [];
  const teDoen = werkrij(klanten, signalen, bezoek, vandaag, nu).length;

  return (
    <>
      {!tabel && (
        <div className="acard mb-6 flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Het klantenbord staat nog niet aan: voer <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0040_klantenbord.sql</code> en <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">0041_klantenbord_automatisch.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}
      <Klantenbord klanten={klanten} gesprekken={gesprekken} koppelingen={koppelingen} bezoek={bezoek} vandaag={vandaag} weergave={weergave === "lijst" ? "lijst" : "bord"} mailAan={mailReady()} ik={admin.email} teDoen={teDoen} />
    </>
  );
}
