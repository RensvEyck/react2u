import type { supabaseServer } from "./supabase/server";
import { opvolgen, verkoopcijfers, type Bezoeker, type BrochureRij, type ContractRij, type Invoer, type OfferteRij } from "./opvolgen";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

const OFFERTE =
  "id, nummer, status, vorm, bedrijf, contactpersoon, email, telefoon, medewerkers, regels, keuze, keuze_at, geldig_tot, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, getekend_at";
const BROCHURE =
  "id, nummer, status, bedrijf, contactpersoon, email, telefoon, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken";
// Zonder `tekst`: die is tot 60.000 tekens per contract en hier niet nodig.
const CONTRACT =
  "id, nummer, status, bedrijf, contactpersoon, email, telefoon, offerte_id, ingangsdatum, einddatum, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, getekend_at";

const DAG = 86_400_000;

/**
 * Wat het Verkoopblok op het dashboard nodig heeft, in zes query's naast
 * elkaar. Los van het bezoek opgehaald, zodat het dashboard dit tegelijk met
 * de rest kan starten; `verkoopOverzicht` voegt het bezoek er daarna aan toe.
 * Zonder migratie 0030 of 0031 geeft een query een fout; die tabel telt dan
 * als leeg, zoals elders in het beheer.
 *
 * Offertes niet allemaal: de regels kunnen de hele prijslijst bevatten (alle
 * modules), en het dashboard heeft alleen de open offertes nodig, plus wat de
 * laatste 90 dagen verstuurd of 45 dagen aangemaakt is (voor de hitrate en om
 * een brochure aan een latere offerte te koppelen).
 */
export async function haalVerkoop(sb: Sb, nu = new Date()): Promise<Omit<Invoer, "bezoek">> {
  const iso = (dagen: number) => new Date(nu.getTime() - dagen * DAG).toISOString();
  const gemaildSoorten = ["verstuurd", "herinnering"];
  const [o, b, c, go, gb, gc] = await Promise.all([
    sb.from("offertes").select(OFFERTE)
      .or(`status.eq.verstuurd,verstuurd_at.gte.${iso(90)},created_at.gte.${iso(45)},getekend_at.gte.${iso(60)}`)
      .order("created_at", { ascending: false }).limit(1000),
    sb.from("brochures").select(BROCHURE).eq("status", "verstuurd").gte("verstuurd_at", iso(45))
      .order("verstuurd_at", { ascending: false }).limit(500),
    sb.from("contracten").select(CONTRACT).neq("status", "ingetrokken").order("created_at", { ascending: false }).limit(1000),
    sb.from("offerte_gebeurtenissen").select("offerte_id, at").in("soort", gemaildSoorten).gte("at", iso(60))
      .order("at", { ascending: false }).limit(1000),
    sb.from("brochure_gebeurtenissen").select("brochure_id, at").in("soort", gemaildSoorten).gte("at", iso(60))
      .order("at", { ascending: false }).limit(1000),
    sb.from("contract_gebeurtenissen").select("contract_id, at").in("soort", gemaildSoorten).gte("at", iso(60))
      .order("at", { ascending: false }).limit(1000),
  ]);

  // Nieuwste eerst opgehaald: de eerste per id is de laatste keer gemaild.
  const gemaild = new Map<string, string>();
  const onthoud = (rijen: Record<string, string>[] | null, kolom: string) => {
    for (const r of rijen || []) if (!gemaild.has(r[kolom])) gemaild.set(r[kolom], r.at);
  };
  onthoud(go.data as Record<string, string>[] | null, "offerte_id");
  onthoud(gb.data as Record<string, string>[] | null, "brochure_id");
  onthoud(gc.data as Record<string, string>[] | null, "contract_id");

  const offertes = ((o.data as unknown as OfferteRij[] | null) || []).map((x) => ({ ...x, vorm: x.vorm || "verzuimbegeleiding" }));
  const brochures = (b.data as unknown as BrochureRij[] | null) || [];
  const contracten = (c.data as unknown as ContractRij[] | null) || [];
  return { offertes, brochures, contracten, gemaild };
}

/** De signalen en de cijfers voor het Verkoopblok. */
export function verkoopOverzicht(data: Omit<Invoer, "bezoek">, bezoek: Bezoeker[], nu = new Date()) {
  return {
    signalen: opvolgen({ ...data, bezoek }, nu),
    cijfers: verkoopcijfers(data.offertes, data.contracten, nu),
    // Niets lopend (of nog nooit iets verstuurd): dan een begin in plaats van vier nullen.
    leeg: data.offertes.length === 0 && data.brochures.length === 0 && data.contracten.length === 0,
  };
}
