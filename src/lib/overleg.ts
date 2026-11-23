/**
 * CM-overleg (0053; Rens, 23 nov 2026): het overleg van de casemanagers, met
 * een agenda (vaste punten uit het ritme en punten die collega's vooraf
 * inbrengen), notulen, actiepunten, een vast ritme met een herinnering, een
 * archief, en de kaart met de verdeling van de klanten (lib/kaart.ts).
 *
 * Niets medisch: geen namen van werknemers of dossiers in agenda of notulen
 * (Rens, 19 nov 2026). Dat staat bij elk invulveld.
 *
 * Hier de rekenregels; de schermen staan onder /admin/overleg.
 */

export type Ritme = { elke_weken: number; weekdag: number; tijd: string; locatie: string | null; vaste_punten: string[] };
export type Overleg = { id: string; datum: string; locatie: string | null; notulen: string | null; afgerond_at: string | null; herinnerd_at: string | null; created_at: string };
export type Agendapunt = { id: string; overleg_id: string; titel: string; toelichting: string | null; vast: boolean; door: string | null; door_email: string | null; besproken: boolean; sort: number; created_at: string };
export type Actiepunt = { id: string; overleg_id: string; wat: string; wie: string | null; wie_naam: string; wanneer: string | null; gedaan_at: string | null; gedaan_door: string | null; created_at: string };

export const WEEKDAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag"] as const;
export const NIETS_MEDISCH = "Geen namen van werknemers en niets medisch: dat hoort in het dossier.";

const DAG = 86_400_000;
const utcDag = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const isoDag = (t: number) => new Date(t).toISOString().slice(0, 10);
export const plusDagen = (d: string, n: number) => isoDag(utcDag(d) + n * DAG);
/** 1 = maandag … 7 = zondag. */
export const weekdagVan = (d: string) => ((new Date(utcDag(d)).getUTCDay() + 6) % 7) + 1;

const ONDERDELEN = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Datum en tijd in Nederland van een tijdstip: { datum: "2026-12-01", tijd: "09:30" }. */
export function nlDelen(iso: string | Date): { datum: string; tijd: string } {
  const p = Object.fromEntries(ONDERDELEN.formatToParts(typeof iso === "string" ? new Date(iso) : iso).map((x) => [x.type, x.value]));
  return { datum: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour}:${p.minute}` };
}

/** Een Nederlandse datum en tijd ("2026-12-01", "09:30") als tijdstip, met zomer- en wintertijd goed. */
export function nlNaarIso(datum: string, tijd: string): string {
  const [u, m] = tijd.split(":").map(Number);
  const gok = Date.UTC(Number(datum.slice(0, 4)), Number(datum.slice(5, 7)) - 1, Number(datum.slice(8, 10)), u, m);
  // Het verschil tussen wat Nederland op dat moment zegt en wat we bedoelen, is de tijdzone.
  const terug = nlDelen(new Date(gok));
  const gezien = Date.UTC(Number(terug.datum.slice(0, 4)), Number(terug.datum.slice(5, 7)) - 1, Number(terug.datum.slice(8, 10)), Number(terug.tijd.slice(0, 2)), Number(terug.tijd.slice(3, 5)));
  return new Date(gok - (gezien - gok)).toISOString();
}

const LANG = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
const KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });

/** "Dinsdag 1 december, 09:30". */
export function overlegTitel(iso: string): string {
  const s = LANG.format(new Date(iso));
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}, ${nlDelen(iso).tijd}`;
}

/** "1 dec 2026". */
export function overlegKort(iso: string): string {
  return KORT.format(new Date(iso)).replace(".", "");
}

/** "vandaag", "morgen", "over 5 dagen", "gisteren", "3 dagen geleden". */
export function wanneerTekst(iso: string, vandaag: string): string {
  const n = Math.round((utcDag(nlDelen(iso).datum) - utcDag(vandaag)) / DAG);
  if (n === 0) return "vandaag";
  if (n === 1) return "morgen";
  if (n === -1) return "gisteren";
  return n > 0 ? `over ${n} dagen` : `${-n} dagen geleden`;
}

/**
 * Het volgende overleg volgens het ritme: na het laatste overleg (gepland of
 * geweest) het aantal weken verder op de vaste weekdag, en nooit vandaag of
 * eerder. Zonder eerder overleg: de eerstvolgende vaste weekdag na vandaag.
 */
export function volgendeDatum(ritme: Pick<Ritme, "elke_weken" | "weekdag" | "tijd">, vandaag: string, laatste: string | null): { datum: string; tijd: string } {
  const tijd = ritme.tijd.slice(0, 5);
  const opWeekdag = (d: string) => plusDagen(d, ritme.weekdag - weekdagVan(d));
  let datum: string;
  if (laatste) {
    datum = opWeekdag(plusDagen(nlDelen(laatste).datum, ritme.elke_weken * 7));
    while (datum <= vandaag) datum = plusDagen(datum, ritme.elke_weken * 7);
  } else {
    datum = opWeekdag(plusDagen(vandaag, 1));
    if (datum <= vandaag) datum = plusDagen(datum, 7);
  }
  return { datum, tijd };
}

/** Voor welke dag de herinnering vandaag uitgaat: de eerstvolgende werkdag (op vrijdag dus maandag). */
export function herinneringVoor(vandaag: string): string {
  const wd = weekdagVan(vandaag);
  return plusDagen(vandaag, wd === 5 ? 3 : wd === 6 ? 2 : 1);
}

/** Vaste punten eerst in hun volgorde, dan de ingebrachte punten in de volgorde van binnenkomst. */
export function sorteerAgenda<T extends Pick<Agendapunt, "vast" | "sort" | "created_at">>(punten: T[]): T[] {
  return [...punten].sort((a, b) => Number(b.vast) - Number(a.vast) || a.sort - b.sort || a.created_at.localeCompare(b.created_at));
}

/** Open actiepunten per persoon, de oudste deadline eerst; zonder deadline achteraan. */
export function actiesPerPersoon(acties: Actiepunt[]): { naam: string; wie: string | null; acties: Actiepunt[] }[] {
  const groepen = new Map<string, { naam: string; wie: string | null; acties: Actiepunt[] }>();
  for (const a of acties) {
    const sleutel = a.wie || `naam:${a.wie_naam}`;
    const g = groepen.get(sleutel) ?? { naam: a.wie_naam, wie: a.wie, acties: [] };
    g.acties.push(a);
    groepen.set(sleutel, g);
  }
  for (const g of groepen.values()) g.acties.sort((a, b) => (a.wanneer ?? "9999").localeCompare(b.wanneer ?? "9999") || a.created_at.localeCompare(b.created_at));
  return [...groepen.values()].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

/** Te laat: een deadline vóór vandaag en nog niet gedaan. */
export const teLaat = (a: Pick<Actiepunt, "wanneer" | "gedaan_at">, vandaag: string) => Boolean(a.wanneer && !a.gedaan_at && a.wanneer < vandaag);

/* ---------- formulieren (anders de sleutel van de foutmelding in Toast) ---------- */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const TIJD = /^([01]\d|2[0-3]):[0-5]\d$/;
const tekst = (f: FormData, k: string) => String(f.get(k) || "").trim();

export function leesAgendapunt(f: FormData): { titel: string; toelichting: string | null } | { fout: string } {
  const titel = tekst(f, "titel");
  const toelichting = tekst(f, "toelichting");
  if (!titel) return { fout: "overleg-titel" };
  if (titel.length > 200 || toelichting.length > 2000) return { fout: "overleg-te-lang" };
  return { titel, toelichting: toelichting || null };
}

export function leesActiepunt(f: FormData): { wat: string; wie: string; wanneer: string | null } | { fout: string } {
  const wat = tekst(f, "wat");
  const wie = tekst(f, "wie");
  const wanneer = tekst(f, "wanneer");
  if (!wat || !/^[0-9a-f-]{36}$/i.test(wie)) return { fout: "overleg-actie" };
  if (wat.length > 300) return { fout: "overleg-te-lang" };
  if (wanneer && !DATUM.test(wanneer)) return { fout: "overleg-actie" };
  return { wat, wie, wanneer: wanneer || null };
}

export function leesMoment(f: FormData): { datum: string; tijd: string; locatie: string | null } | { fout: string } {
  const datum = tekst(f, "datum");
  const tijd = tekst(f, "tijd");
  const locatie = tekst(f, "locatie");
  if (!DATUM.test(datum) || !TIJD.test(tijd) || locatie.length > 120) return { fout: "overleg-moment" };
  return { datum, tijd, locatie: locatie || null };
}

export function leesRitme(f: FormData): Omit<Ritme, "tijd"> & { tijd: string } | { fout: string } {
  const elke = Number(tekst(f, "elke_weken"));
  const weekdag = Number(tekst(f, "weekdag"));
  const tijd = tekst(f, "tijd");
  const locatie = tekst(f, "locatie");
  const vaste = tekst(f, "vaste_punten").split("\n").map((r) => r.trim()).filter(Boolean);
  if (!Number.isInteger(elke) || elke < 1 || elke > 8 || !Number.isInteger(weekdag) || weekdag < 1 || weekdag > 5 || !TIJD.test(tijd)) return { fout: "overleg-ritme" };
  if (locatie.length > 120 || vaste.length > 12 || vaste.some((v) => v.length > 200)) return { fout: "overleg-te-lang" };
  return { elke_weken: elke, weekdag, tijd, locatie: locatie || null, vaste_punten: vaste };
}

/* ---------- de herinnering (api/cron/overleg) ---------- */

export type Herinnering = { onderwerp: string; aanhef: string; intro: string; agenda: string[]; acties: string[] };

/**
 * De mail van de werkdag ervoor: wanneer en waar, de agenda, en de eigen open
 * actiepunten. Kort, zodat je hem in tien seconden gelezen hebt.
 */
export function overlegHerinnering(voornaam: string | null, overleg: Pick<Overleg, "datum" | "locatie">, agenda: string[], acties: Pick<Actiepunt, "wat" | "wanneer">[], vandaag: string): Herinnering {
  const { datum, tijd } = nlDelen(overleg.datum);
  const dag = datum === plusDagen(vandaag, 1) ? "morgen" : WEEKDAGEN[weekdagVan(datum) - 1] ?? overlegTitel(overleg.datum).split(",")[0].toLowerCase();
  return {
    onderwerp: `CM-overleg ${dag} om ${tijd}`,
    aanhef: `Hoi${voornaam ? ` ${voornaam}` : ""},`,
    intro: `${dag.charAt(0).toUpperCase()}${dag.slice(1)} om ${tijd} is het CM-overleg${overleg.locatie ? `, ${overleg.locatie}` : ""}. Wil je nog iets bespreken? Breng het vandaag nog in.`,
    agenda: agenda.length ? agenda : ["Nog geen punten"],
    acties: acties.map((a) => (a.wanneer ? `${a.wat} (af op ${a.wanneer.split("-").reverse().join("-")})` : a.wat)),
  };
}
