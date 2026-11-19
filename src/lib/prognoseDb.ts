import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable } from "./dbErrors";
import { hitrate } from "./opvolgen";
import { datumOver, weergaveVan, type Offerte } from "./offertes";
import { maandagVan, plusWeken } from "./uren";
import { normaliseerAntwoorden } from "./weekevaluatie";
import { plusMaanden } from "./omzet";
import {
  advies, bezetting, bijdragen, gemetenPerMaand, huidigeVerhouding, isCasemanager, kansVan, leesNormen, maandenVanaf, prognose, radar, recent,
  type Advies, type Bijdrage, type ContractIn, type EvaluatieIn, type Gemeten, type KlantIn, type MedewerkerIn, type Normen, type OfferteIn,
  type Opdracht, type PrognoseMaand, type Radar, type Scenario,
} from "./prognose";

/**
 * Alles voor het scherm Prognose (recht `omzet`), in één keer opgehaald met de
 * ingelogde client. De rekenregels staan in lib/prognose.ts. Wat er nog niet
 * is (de normen vóór 0049, de klantvelden vóór 0048, de weekevaluaties vóór
 * 0044) valt weg in plaats van het scherm te laten vallen.
 */

type Sb = SupabaseClient;

export const MAANDEN_VOORUIT = 12;
export const MAANDEN_TERUG = 6;

export type PrognoseData = {
  vandaag: string;
  normen: Normen;
  /** Of de normen bewaard kunnen worden (migratie 0049). */
  normenAan: boolean;
  normenDoor: string | null;
  hitrate: number | null;
  kans: number;
  bijdragen: Bijdrage[];
  opdrachten: Opdracht[];
  medewerkers: MedewerkerIn[];
  bezetting: number;
  /** De norm waarmee gerekend wordt: de ingestelde, of de huidige verhouding. */
  norm: number | null;
  normBron: "ingesteld" | "afgeleid" | "geen";
  huidig: { verhouding: number | null; werknemers: number; zonderAantal: number };
  maanden: PrognoseMaand[];
  advies: Advies;
  /** De weekevaluaties: per maand (terug en de lopende maand), recent, en per casemanager. */
  gemeten: Gemeten[];
  gemetenCasemanagers: Gemeten[];
  recentTijd: { gem: number | null; n: number };
  recentEnergie: { gem: number | null; n: number };
  radar: Radar[];
  /** Klanten zonder aantal werknemers of zonder casemanager, voor het lijstje om aan te vullen. */
  zonderAantal: (Bijdrage & { voorstel: number | null })[];
  zonderCasemanager: Bijdrage[];
  zonderIngang: Bijdrage[];
  weekevaluatiesAan: boolean;
};

export async function haalPrognose(sb: Sb, scenario: Scenario | undefined, kansOverride: number | null, nu = new Date()): Promise<PrognoseData> {
  const vandaag = datumOver(0, nu);
  const deze = maandagVan(vandaag);
  const sinds = plusWeken(deze, -Math.ceil((MAANDEN_TERUG * 52) / 12) - 1);
  const [n, k, o, c, g, m, e] = await Promise.all([
    sb.from("prognose_normen").select("normen, door").maybeSingle(),
    sb.from("klanten").select("id, bedrijf, status, medewerkers, startdatum, casemanager").in("status", ["akkoord", "inrichten", "klant"]).limit(2000),
    sb.from("offertes").select("id, nummer, bedrijf, vorm, status, medewerkers, ingangsdatum, getekend_at, verstuurd_at, geldig_tot, bekeken_at, getekend_inhoud").in("status", ["verstuurd", "getekend", "afgewezen"]).limit(3000),
    sb.from("contracten").select("bedrijf, status, ingangsdatum").eq("status", "getekend").limit(2000),
    sb.from("abonnementen_gestopt").select("offerte_id"),
    sb.from("medewerkers").select("id, naam, functie, contracturen, actief, user_id").limit(500),
    sb.from("weekevaluaties").select("user_id, week, antwoorden").gte("week", sinds).limit(5000),
  ]);

  const normenAan = !isMissingTable(n.error);
  const normen = leesNormen((n.data as { normen?: unknown } | null)?.normen);
  const normenDoor = (n.data as { door?: string | null } | null)?.door ?? null;

  // Vóór 0048 heeft klanten geen medewerkers of casemanager: dan zonder die velden opnieuw.
  let klantRijen = (k.data as KlantIn[] | null) || [];
  if (k.error && !isMissingTable(k.error)) {
    const zonder = await sb.from("klanten").select("id, bedrijf, status, startdatum").in("status", ["akkoord", "inrichten", "klant"]).limit(2000);
    klantRijen = ((zonder.data as Omit<KlantIn, "medewerkers" | "casemanager">[] | null) || []).map((x) => ({ ...x, medewerkers: null, casemanager: null }));
  }
  // Vóór 0049 heeft offertes geen ingangsdatum: dan zonder.
  let offerteRijen = (o.data as (Offerte & { getekend_inhoud: { medewerkers?: number | null } | null })[] | null) || [];
  if (o.error) {
    const zonder = await sb.from("offertes").select("id, nummer, bedrijf, vorm, status, medewerkers, getekend_at, verstuurd_at, geldig_tot, bekeken_at, getekend_inhoud").in("status", ["verstuurd", "getekend", "afgewezen"]).limit(3000);
    offerteRijen = ((zonder.data as typeof offerteRijen | null) || []).map((x) => ({ ...x, ingangsdatum: null }));
  }
  const gestopt = new Set(((g.data as { offerte_id: string }[] | null) || []).map((x) => x.offerte_id));
  const offertes: OfferteIn[] = offerteRijen.map((x) => ({
    id: x.id, nummer: x.nummer, bedrijf: x.bedrijf, vorm: x.vorm, status: x.status, medewerkers: x.medewerkers,
    getekend_medewerkers: x.getekend_inhoud?.medewerkers ?? null, ingangsdatum: x.ingangsdatum ?? null,
    getekend_at: x.getekend_at, verstuurd_at: x.verstuurd_at, geldig_tot: x.geldig_tot, bekeken_at: x.bekeken_at, gestopt: gestopt.has(x.id),
  }));

  // De eigen hitrate over het laatste halfjaar, zoals het salesdashboard hem telt.
  const metWeergave = offerteRijen.map((x) => ({ o: x, w: weergaveVan(x, vandaag) }));
  const h = hitrate(metWeergave, datumOver(-182, nu)).procent;
  const kans = kansOverride ?? kansVan(normen, h);

  const { bijdragen: b, opdrachten } = bijdragen({ klanten: klantRijen, offertes, contracten: (c.data as ContractIn[] | null) || [], normen, kans, vandaag });
  const medewerkers = ((m.data as MedewerkerIn[] | null) || []).map((x) => ({ ...x, contracturen: Number(x.contracturen) }));
  const bez = bezetting(medewerkers, normen.urenPerFte);
  const huidig = huidigeVerhouding(b, bez);
  const norm = normen.werknemersPerFte ?? huidig.verhouding;
  const normBron = normen.werknemersPerFte ? "ingesteld" : huidig.verhouding ? "afgeleid" : "geen";
  const maanden = prognose({ bijdragen: b, opdrachten, normen, norm, bezetting: bez, scenario, maanden: maandenVanaf(vandaag, MAANDEN_VOORUIT) });

  const weekevaluatiesAan = !isMissingTable(e.error) && !e.error;
  const evaluaties: EvaluatieIn[] = ((e.data as EvaluatieIn[] | null) || []).map((x) => ({ ...x, antwoorden: normaliseerAntwoorden(x.antwoorden) }));
  const terug = Array.from({ length: MAANDEN_TERUG + 1 }, (_, i) => plusMaanden(vandaag.slice(0, 7), i - MAANDEN_TERUG));
  const casemanagers = new Set(medewerkers.filter(isCasemanager).map((x) => x.user_id).filter((x): x is string => Boolean(x)));
  const vierWeken = plusWeken(deze, -4);

  // Wat er nog ontbreekt: per klant het voorstel uit de getekende offerte, als die er is.
  const offertePer = new Map(b.filter((x) => x.offerteId).map((x) => [x.sleutel, x]));
  const zonderAantal = b
    .filter((x) => x.soort !== "pijplijn" && x.klantId && klantRijen.find((kl) => kl.id === x.klantId)?.medewerkers == null)
    .map((x) => ({ ...x, voorstel: x.werknemers ?? offertePer.get(x.sleutel)?.werknemers ?? null }));

  return {
    vandaag, normen, normenAan, normenDoor, hitrate: h, kans, bijdragen: b, opdrachten, medewerkers, bezetting: bez, norm, normBron, huidig, maanden,
    advies: advies(maanden, normen.wervingsMaanden, vandaag),
    gemeten: gemetenPerMaand(evaluaties, terug),
    gemetenCasemanagers: gemetenPerMaand(evaluaties, terug, casemanagers.size ? casemanagers : undefined),
    recentTijd: recent(evaluaties, vierWeken, "tijd", casemanagers.size ? casemanagers : undefined),
    recentEnergie: recent(evaluaties, vierWeken, "energie", casemanagers.size ? casemanagers : undefined),
    radar: radar({ medewerkers, bijdragen: b, evaluaties, norm, urenPerFte: normen.urenPerFte, sinds: vierWeken }),
    zonderAantal,
    zonderCasemanager: b.filter((x) => x.soort === "lopend" && x.klantId && !x.casemanager),
    zonderIngang: b.filter((x) => x.soort !== "lopend" && x.offerteId && x.startBron !== "offerte"),
    weekevaluatiesAan,
  };
}
