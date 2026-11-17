import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { bezoekPerKlant, vandaagNL, type Bezoek, type Klant } from "@/lib/klanten";
import { werkrij } from "@/lib/werkrij";
import { haalVerkoop, verkoopOverzicht } from "@/lib/opvolgenDb";
import { fetchPageViews } from "@/lib/analyticsDb";
import { summarize, type CompanyProfile } from "@/lib/companies";
import type { PageView } from "@/lib/types";
import Werkrij from "@/components/admin/klantenbord/Werkrij";

/**
 * De werkrij voor vandaag: wie bel ik nu. De kaarten van het bord, de
 * opvolgsignalen van het Verkoopblok en het sitebezoek samen in één rij per
 * klant (lib/werkrij.ts), warmste eerst, met het toetsenbord erdoorheen.
 */
export default async function VandaagPagina() {
  const { sb, admin } = await requirePerm("bellijst");
  const nu = new Date();
  const vandaag = vandaagNL(nu);
  const metBezoek = admin.permissions.includes("bezoek");
  const sinds = new Date(nu.getTime() - 14 * 86_400_000).toISOString();

  const [kRes, verkoop, pv, pr] = await Promise.all([
    sb.from("klanten").select("*").neq("status", "inactief").limit(2000),
    haalVerkoop(sb, nu),
    metBezoek ? fetchPageViews(sb, sinds, "path, referrer_host, visitor_hash, created_at, company, company_domain, company_source, is_company", { onlyCompanies: true }).catch(() => [] as PageView[]) : Promise.resolve([] as PageView[]),
    metBezoek ? sb.from("company_profiles").select("key, name, domain, ignored, lead_id") : Promise.resolve({ data: null }),
  ]);
  const tabel = !kRes.error || !isMissingTable(kRes.error);
  const klanten = (kRes.data as Klant[] | null) || [];
  const bedrijvenOpSite = metBezoek ? summarize(pv.filter((v) => v.is_company), ((pr as { data: CompanyProfile[] | null }).data) || [], [], nu).filter((c) => !c.ignored) : [];
  const bezoekers = bedrijvenOpSite.map((c) => ({ naam: c.name, domein: c.domain, laatst: c.lastSeen, paginas: c.views }));
  const { signalen } = verkoopOverzicht(verkoop, bezoekers, nu);
  const bezoek: Record<string, Bezoek> = bezoekPerKlant(klanten, bedrijvenOpSite);
  const rijen = werkrij(klanten, signalen, bezoek, vandaag, nu);

  return <Werkrij rijen={rijen} vandaag={vandaag} tabel={tabel} />;
}
