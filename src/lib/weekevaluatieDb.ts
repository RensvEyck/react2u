import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable } from "./dbErrors";
import { firstName } from "./dashboard";
import { cel, optellen, plusWeken, urenIndex, type Medewerker, type Totaal, type UrenRij } from "./uren";
import {
  bespreekpunten, deelname, deelnemers, doelenVan, doelStanden, gemiddelden, isKwartaalEinde, maandOverzicht, meldingen, normaliseerAntwoorden, openWeken,
  plusKwartalen, signalen, teksten, telKeuzes, weekStand, wekenInKwartaal, zwaarsteWeken,
  type Bespreekpunt, type Deelname, type Deelnemer, type Doel, type DoelStand, type Evaluatie, type Keuze, type Kwartaal, type MaandRij, type Melding, type Schaal,
  type SchaalSamenvatting, type Signaal,
} from "./weekevaluatie";

/**
 * Het kwartaaloverzicht van de weekevaluaties (recht `omzet`): wat het scherm,
 * de export en het dashboard nodig hebben, in één keer opgehaald met de
 * ingelogde client (de policies van 0044 en 0045 bepalen wat er terugkomt).
 * De rekenregels staan in lib/weekevaluatie.ts; dit haalt alleen op en zet
 * per collega bij elkaar, als de agenda van zijn kwartaalmeeting.
 */

export type Collega = {
  d: Deelnemer;
  /** De naam uit de medewerkers (0035) als de collega gekoppeld is, anders de voornaam uit het e-mailadres. */
  naam: string;
  medewerker: Medewerker | null;
  evaluaties: Evaluatie[];
  gem: Record<Schaal, SchaalSamenvatting>;
  gemVorig: Record<Schaal, SchaalSamenvatting>;
  deelname: Deelname;
  /** De declarabele uren van de verstreken weken van het kwartaal, als de collega gekoppeld is. */
  uren: Totaal | null;
  /** 1. De doelen van dit kwartaal met hun voortgang. */
  doelen: DoelStand[];
  /** De doelen die al voor volgend kwartaal klaarstaan. */
  doelenVolgend: Doel[];
  /** 2. De twee zwaarste weken, de signalen (twee zware weken achter elkaar) en de toelichting bij de cijfers. */
  zwaarste: { week: string; zwaarte: number }[];
  signalen: Signaal[];
  toelichtingen: { week: string; tekst: string }[];
  /** 3. Toewijding en groei per maand, met de toelichting. */
  maanden: { maanden: string[]; rijen: MaandRij[]; ingevuld: number };
  maandToelichtingen: { week: string; tekst: string }[];
  /** 4. Waar hij tegenaan liep, welke kennis hij miste en wat hij nodig heeft. */
  knelpunten: (Keuze & { aantal: number })[];
  kennis: (Keuze & { aantal: number })[];
  kennisTeksten: { week: string; tekst: string }[];
  nodig: { week: string; tekst: string }[];
  /** 5. Wat hij meldde of deelde. */
  meldingen: Melding[];
  /** 6. Wat hij zelf wil bespreken. */
  bespreken: Bespreekpunt[];
  /** 7. De terugblik uit de laatste week van het kwartaal, als die er is. */
  terugblik: Evaluatie | null;
};

export type KwartaalOverzicht = {
  kwartaal: Kwartaal;
  vorig: Kwartaal;
  volgend: Kwartaal;
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
  doelen: Doel[];
  team: Record<Schaal, SchaalSamenvatting>;
  teamVorig: Record<Schaal, SchaalSamenvatting>;
  knelpunten: (Keuze & { aantal: number })[];
  kennis: (Keuze & { aantal: number })[];
  signalen: Signaal[];
  /** Wat iedereen meldde of deelde, nieuwste eerst. */
  meldingen: (Melding & { user_id: string })[];
  ingevuld: number;
  verwacht: number;
  gemist: number;
  open: number;
  /** Of de doelen er al zijn (migratie 0045). */
  doelenAan: boolean;
};

type Sb = SupabaseClient;

const norm = (x: Evaluatie): Evaluatie => ({ ...x, antwoorden: normaliseerAntwoorden(x.antwoorden) });

const naamVan = (d: Pick<Deelnemer, "email">, mw: Medewerker | null | undefined) => mw?.naam || firstName(d.email) || d.email;

/** De doelen van twee kwartalen; vóór 0045 een lege lijst en `aan: false`. */
async function haalDoelen(sb: Sb, kwartalen: Kwartaal[]): Promise<{ doelen: Doel[]; aan: boolean }> {
  const res = await Promise.all(kwartalen.map((k) => sb.from("weekevaluatie_doelen").select("*").eq("jaar", k.jaar).eq("kwartaal", k.kwartaal)));
  if (res.some((r) => r.error)) return { doelen: [], aan: !res.some((r) => isMissingTable(r.error)) };
  return { doelen: res.flatMap((r) => (r.data as Doel[] | null) || []), aan: true };
}

/** Null als migratie 0044 nog niet gedraaid is. */
export async function haalKwartaal(sb: Sb, kwartaal: Kwartaal, vandaag: string): Promise<KwartaalOverzicht | null> {
  const vorig = plusKwartalen(kwartaal, -1);
  const volgend = plusKwartalen(kwartaal, 1);
  const weken = wekenInKwartaal(kwartaal);
  const wekenVorig = wekenInKwartaal(vorig);
  const [d, e, m, u, doelRes] = await Promise.all([
    sb.rpc("weekevaluatie_deelnemers"),
    sb.from("weekevaluaties").select("*").gte("week", plusWeken(wekenVorig[0], -1)).lte("week", weken[weken.length - 1]).order("week").limit(5000),
    sb.from("medewerkers").select("*").not("user_id", "is", null),
    sb.from("uren").select("medewerker_id, week, declarabel, afwezig").gte("week", weken[0]).lte("week", weken[weken.length - 1]).limit(5000),
    haalDoelen(sb, [kwartaal, volgend]),
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
  // De signalen van dit kwartaal; de week ervoor (uit het vorige kwartaal) telt mee als eerste van een paar.
  const alleSignalen = signalen(rijen).filter((s) => s.week >= weken[0]);
  const ids = new Set(lijst.map((x) => x.user_id));

  const namen = new Map<string, string>();
  const uren = new Map<string, { declarabel: number; afwezig: number }>();
  const collegas: Collega[] = lijst.map((d) => {
    const mw = perAccount.get(d.user_id) || null;
    const naam = naamVan(d, mw);
    namen.set(d.user_id, mw?.naam || d.email);
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
    const eigenDoelen = doelRes.doelen.filter((x) => x.user_id === d.user_id);
    return {
      d, naam, medewerker: mw, evaluaties: eigen,
      gem: gemiddelden(eigen), gemVorig: gemiddelden(eigenVorig),
      deelname: deelname(d, weken, new Set(eigen.map((x) => x.week)), vandaag),
      uren: totaal,
      doelen: doelStanden(doelenVan(eigenDoelen, kwartaal), eigen),
      doelenVolgend: doelenVan(eigenDoelen, volgend),
      zwaarste: zwaarsteWeken(eigen),
      signalen: alleSignalen.filter((s) => s.user_id === d.user_id),
      toelichtingen: teksten(eigen, "cijfers_toelichting"),
      maanden: maandOverzicht(eigen, kwartaal),
      maandToelichtingen: teksten(eigen, "maand_toelichting"),
      knelpunten: telKeuzes(eigen, "knelpunt_themas"),
      kennis: telKeuzes(eigen, "kennis_themas"),
      kennisTeksten: teksten(eigen, "kennis_mist"),
      nodig: teksten(eigen, "nodig"),
      meldingen: meldingen(eigen),
      bespreken: bespreekpunten(eigen),
      terugblik: eigen.find((x) => isKwartaalEinde(x.week) && (x.antwoorden.blijven !== undefined || x.antwoorden.kwartaal_anders || x.antwoorden.kwartaal_hoogtepunt)) || null,
    };
  });

  const teamRijen = inKwartaal.filter((x) => ids.has(x.user_id));
  const teamVorigRijen = inVorig.filter((x) => ids.has(x.user_id));
  return {
    kwartaal, vorig, volgend, weken, verstreken, deelnemers: lijst, evaluaties: teamRijen, evaluatiesVorig: teamVorigRijen, collegas, namen, uren,
    doelen: doelRes.doelen.filter((x) => x.jaar === kwartaal.jaar && x.kwartaal === kwartaal.kwartaal),
    team: gemiddelden(teamRijen), teamVorig: gemiddelden(teamVorigRijen),
    knelpunten: telKeuzes(teamRijen, "knelpunt_themas"),
    kennis: telKeuzes(teamRijen, "kennis_themas"),
    signalen: alleSignalen.filter((s) => ids.has(s.user_id)),
    meldingen: collegas.flatMap((c) => c.meldingen.map((m) => ({ ...m, user_id: c.d.user_id }))).sort((a, b) => b.week.localeCompare(a.week)),
    ingevuld: collegas.reduce((s, c) => s + c.deelname.ingevuld.length, 0),
    verwacht: collegas.reduce((s, c) => s + c.deelname.verwacht, 0),
    gemist: collegas.reduce((s, c) => s + c.deelname.gemist.length, 0),
    open: collegas.reduce((s, c) => s + c.deelname.open.length, 0),
    doelenAan: doelRes.aan,
  };
}

export type DashboardSignaal = Signaal & { naam: string };

/**
 * De signalen van de open weken (deze en vorige week), voor het dashboard van
 * wie het overzicht mag zien. Leeg zonder recht, vóór 0044, of als er niets is.
 */
export async function haalSignalen(sb: Sb, vandaag: string): Promise<DashboardSignaal[]> {
  const [vorige, deze] = openWeken(vandaag);
  const [e, d, m] = await Promise.all([
    sb.from("weekevaluaties").select("user_id, week, antwoorden").gte("week", plusWeken(vorige, -1)).lte("week", deze),
    sb.rpc("weekevaluatie_deelnemers"),
    sb.from("medewerkers").select("naam, user_id").not("user_id", "is", null),
  ]);
  if (e.error || d.error) return [];
  const rijen = ((e.data as Pick<Evaluatie, "user_id" | "week" | "antwoorden">[] | null) || []).map((x) => ({ ...x, antwoorden: normaliseerAntwoorden(x.antwoorden) }));
  const mensen = new Map(((d.data as Deelnemer[] | null) || []).map((x) => [x.user_id, x]));
  const mw = new Map(((m.data as { naam: string; user_id: string }[] | null) || []).map((x) => [x.user_id, x]));
  return signalen(rijen)
    .filter((s) => s.week >= vorige && mensen.has(s.user_id))
    .map((s) => ({ ...s, naam: naamVan(mensen.get(s.user_id)!, mw.get(s.user_id) as Medewerker | undefined) }));
}
