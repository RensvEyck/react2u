import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable } from "./dbErrors";
import { cel, optellen, urenIndex, type Medewerker, type Totaal, type UrenRij } from "./uren";
import {
  deelname, deelnemers, gemiddelden, normaliseerAntwoorden, plusKwartalen, weekStand, wekenInKwartaal,
  type Deelname, type Deelnemer, type Evaluatie, type Kwartaal, type Schaal, type SchaalSamenvatting,
} from "./weekevaluatie";

/**
 * Het kwartaaloverzicht van de weekevaluaties (recht `omzet`): wat het scherm
 * en de export allebei nodig hebben, in één keer opgehaald met de ingelogde
 * client (de policies van 0044 bepalen wat er terugkomt). De rekenregels
 * staan in lib/weekevaluatie.ts; dit haalt alleen op en zet bij elkaar.
 */

export type Collega = {
  d: Deelnemer;
  /** De naam uit de medewerkers (0035) als de collega gekoppeld is, anders het e-mailadres. */
  naam: string;
  medewerker: Medewerker | null;
  evaluaties: Evaluatie[];
  gem: Record<Schaal, SchaalSamenvatting>;
  gemVorig: Record<Schaal, SchaalSamenvatting>;
  deelname: Deelname;
  /** De declarabele uren van de verstreken weken van het kwartaal, als de collega gekoppeld is. */
  uren: Totaal | null;
};

export type KwartaalOverzicht = {
  kwartaal: Kwartaal;
  vorig: Kwartaal;
  weken: string[];
  /** De weken die al begonnen zijn: alleen daarover zijn er cijfers. */
  verstreken: string[];
  deelnemers: Deelnemer[];
  evaluaties: Evaluatie[];
  evaluatiesVorig: Evaluatie[];
  collegas: Collega[];
  namen: Map<string, string>;
  /** Declarabele uren per `${user_id}|${week}`. */
  uren: Map<string, { declarabel: number; afwezig: number }>;
  team: Record<Schaal, SchaalSamenvatting>;
  teamVorig: Record<Schaal, SchaalSamenvatting>;
  ingevuld: number;
  verwacht: number;
  gemist: number;
  open: number;
};

type Sb = SupabaseClient;

const norm = (x: Evaluatie): Evaluatie => ({ ...x, antwoorden: normaliseerAntwoorden(x.antwoorden) });

/** Null als migratie 0044 nog niet gedraaid is. */
export async function haalKwartaal(sb: Sb, kwartaal: Kwartaal, vandaag: string): Promise<KwartaalOverzicht | null> {
  const vorig = plusKwartalen(kwartaal, -1);
  const weken = wekenInKwartaal(kwartaal);
  const wekenVorig = wekenInKwartaal(vorig);
  const [d, e, m, u] = await Promise.all([
    sb.rpc("weekevaluatie_deelnemers"),
    sb.from("weekevaluaties").select("*").gte("week", wekenVorig[0]).lte("week", weken[weken.length - 1]).order("week").limit(5000),
    sb.from("medewerkers").select("*").not("user_id", "is", null),
    sb.from("uren").select("medewerker_id, week, declarabel, afwezig").gte("week", weken[0]).lte("week", weken[weken.length - 1]).limit(5000),
  ]);
  if (isMissingTable(e.error) || d.error?.code === "PGRST202") return null;
  if (e.error) throw new Error(e.error.message);

  const alle = ((d.data as Deelnemer[] | null) || []).map((x) => ({ ...x, sinds: x.sinds ? String(x.sinds).slice(0, 10) : null }));
  const rijen = ((e.data as Evaluatie[] | null) || []).map(norm);
  // Of een super admin ooit meedeed staat niet per se in deze twee kwartalen.
  const superadmins = alle.filter((x) => x.rol === "superadmin").map((x) => x.user_id);
  const ooit = superadmins.length ? await sb.from("weekevaluaties").select("user_id").in("user_id", superadmins).limit(100) : { data: [] as { user_id: string }[] };
  const lijst = deelnemers(alle, [...rijen, ...(((ooit.data as { user_id: string }[] | null) || []))]);

  const medewerkers = ((m.data as Medewerker[] | null) || []).map((x) => ({ ...x, contracturen: Number(x.contracturen), uurtarief: x.uurtarief === null ? null : Number(x.uurtarief) }));
  const perAccount = new Map(medewerkers.filter((x) => x.user_id).map((x) => [x.user_id as string, x]));
  const index = urenIndex(((u.data as UrenRij[] | null) || []));
  const verstreken = weken.filter((w) => weekStand(w, vandaag) !== "toekomst");
  const inKwartaal = rijen.filter((x) => x.week >= weken[0] && x.week <= weken[weken.length - 1]);
  const inVorig = rijen.filter((x) => x.week >= wekenVorig[0] && x.week <= wekenVorig[wekenVorig.length - 1]);
  const ids = new Set(lijst.map((x) => x.user_id));

  const namen = new Map<string, string>();
  const uren = new Map<string, { declarabel: number; afwezig: number }>();
  const collegas: Collega[] = lijst.map((d) => {
    const mw = perAccount.get(d.user_id) || null;
    const naam = mw?.naam || d.email;
    namen.set(d.user_id, naam);
    const eigen = inKwartaal.filter((x) => x.user_id === d.user_id);
    const eigenVorig = inVorig.filter((x) => x.user_id === d.user_id);
    let totaal: Totaal | null = null;
    if (mw) {
      const cellen = verstreken.map((w) => {
        const rij = index.get(`${mw.id}|${w}`);
        if (rij) uren.set(`${d.user_id}|${w}`, { declarabel: rij.declarabel, afwezig: rij.afwezig });
        return cel(mw, rij);
      });
      totaal = optellen(cellen);
    }
    return {
      d, naam, medewerker: mw, evaluaties: eigen,
      gem: gemiddelden(eigen), gemVorig: gemiddelden(eigenVorig),
      deelname: deelname(d, weken, new Set(eigen.map((x) => x.week)), vandaag),
      uren: totaal,
    };
  });

  const teamRijen = inKwartaal.filter((x) => ids.has(x.user_id));
  const teamVorigRijen = inVorig.filter((x) => ids.has(x.user_id));
  return {
    kwartaal, vorig, weken, verstreken, deelnemers: lijst, evaluaties: teamRijen, evaluatiesVorig: teamVorigRijen, collegas, namen, uren,
    team: gemiddelden(teamRijen), teamVorig: gemiddelden(teamVorigRijen),
    ingevuld: collegas.reduce((s, c) => s + c.deelname.ingevuld.length, 0),
    verwacht: collegas.reduce((s, c) => s + c.deelname.verwacht, 0),
    gemist: collegas.reduce((s, c) => s + c.deelname.gemist.length, 0),
    open: collegas.reduce((s, c) => s + c.deelname.open.length, 0),
  };
}
