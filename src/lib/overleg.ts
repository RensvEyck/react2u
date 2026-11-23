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

export type Ritme = { elke_weken: number; weekdag: number; tijd: string; locatie: string | null; vaste_punten: string[]; /** Sinds 0054; ervoor een uur. */ duur_minuten?: number };
export type Overleg = {
  id: string; datum: string; locatie: string | null; notulen: string | null; afgerond_at: string | null; herinnerd_at: string | null; created_at: string;
  // Sinds 0054: eindtijd, notulist, en wanneer de notulen gemaild zijn.
  einde?: string | null; notulist?: string | null; notulist_naam?: string | null; gemaild_at?: string | null;
};
export type Agendapunt = {
  id: string; overleg_id: string; titel: string; toelichting: string | null; vast: boolean; door: string | null; door_email: string | null; besproken: boolean; sort: number; created_at: string;
  // Sinds 0054: notulen per punt, uit het vorige overleg, of ingebracht voor het volgende.
  notulen?: string | null; doorgeschoven?: boolean; voor_volgend?: boolean;
};
export type Aanwezige = { id: string; overleg_id: string; user_id: string | null; naam: string; checkin: string | null; /** Sinds 0056: wat deze aanwezige bij Dossiers vertelde (werkwijze, geen casus). */ dossiers?: string | null; sort: number };
export type Collega = { user_id: string; email: string; naam: string };
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

export function leesMoment(f: FormData): { datum: string; tijd: string; eind: string | null; locatie: string | null } | { fout: string } {
  const datum = tekst(f, "datum");
  const tijd = tekst(f, "tijd");
  const eind = tekst(f, "eind");
  const locatie = tekst(f, "locatie");
  if (!DATUM.test(datum) || !TIJD.test(tijd) || locatie.length > 120) return { fout: "overleg-moment" };
  if (eind && (!TIJD.test(eind) || eind <= tijd)) return { fout: "overleg-moment" };
  return { datum, tijd, eind: eind || null, locatie: locatie || null };
}

export function leesRitme(f: FormData): Omit<Ritme, "tijd"> & { tijd: string } | { fout: string } {
  const elke = Number(tekst(f, "elke_weken"));
  const weekdag = Number(tekst(f, "weekdag"));
  const tijd = tekst(f, "tijd");
  const locatie = tekst(f, "locatie");
  const vaste = tekst(f, "vaste_punten").split("\n").map((r) => r.trim()).filter(Boolean);
  if (!Number.isInteger(elke) || elke < 1 || elke > 8 || !Number.isInteger(weekdag) || weekdag < 1 || weekdag > 5 || !TIJD.test(tijd)) return { fout: "overleg-ritme" };
  const duur = Number(tekst(f, "duur_minuten") || 60);
  if (!Number.isInteger(duur) || duur < 15 || duur > 240) return { fout: "overleg-ritme" };
  if (locatie.length > 120 || vaste.length > 12 || vaste.some((v) => v.length > 200)) return { fout: "overleg-te-lang" };
  return { elke_weken: elke, weekdag, tijd, locatie: locatie || null, vaste_punten: vaste, duur_minuten: duur };
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

/* ---------- het format van het team (0054; voorbeeld "CM overleg 18-11") ---------- */

const DAG_LANG = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

/** "Dinsdag 24 november 2026". */
export function overlegDag(iso: string): string {
  const s = DAG_LANG.format(new Date(iso));
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

/** "14:15 tot 15:15", of alleen de begintijd als er geen eind is. */
export function tijdVanTot(o: Pick<Overleg, "datum" | "einde">): string {
  const van = nlDelen(o.datum).tijd;
  return o.einde ? `${van} tot ${nlDelen(o.einde).tijd}` : van;
}

/** Het einde: de eindtijd uit het formulier, of de begintijd plus de duur uit het ritme. */
export function eindeVan(datum: string, tijd: string, eind: string | null, duurMinuten = 60): string {
  if (eind) return nlNaarIso(datum, eind);
  return new Date(Date.parse(nlNaarIso(datum, tijd)) + duurMinuten * 60_000).toISOString();
}

export const isCheckIn = (titel: string) => /^check[\s-]?in\b/i.test(titel.trim());
export const isDossiers = (titel: string) => /^dossiers?\b/i.test(titel.trim());
export const DOSSIERS_REGEL = "Alleen werkwijze en afspraken, geen casus: geen namen, geen diagnoses. De casus zelf staat in XpertSuite.";

/** Besproken: afgevinkt, of er staat iets in de notulen. */
export const isBesproken = (p: Pick<Agendapunt, "besproken" | "notulen">) => p.besproken || Boolean(p.notulen?.trim());

/** Wie er bij is en wie notuleert, uit het formulier; alleen collega's uit de lijst, plus losse namen. */
export function leesBezetting(f: FormData, collegas: Collega[]): { aanwezig: { user_id: string | null; naam: string }[]; notulist: string | null } | { fout: string } {
  const ids = [...new Set(f.getAll("aanwezig").map(String))].filter((id) => collegas.some((c) => c.user_id === id));
  const extra = tekst(f, "extra").split(/[,\n]/).map((n) => n.trim()).filter(Boolean);
  const notulist = tekst(f, "notulist") || null;
  if (extra.length > 12 || extra.some((n) => n.length > 120)) return { fout: "overleg-te-lang" };
  if (notulist && !ids.includes(notulist)) return { fout: "overleg-notulist" };
  return {
    aanwezig: [...ids.map((id) => ({ user_id: id as string | null, naam: collegas.find((c) => c.user_id === id)!.naam })), ...extra.map((naam) => ({ user_id: null, naam }))],
    notulist,
  };
}

/** vast: structureel punt; vorig/nieuw: wat ter tafel komt (uit het vorige overleg, of nieuw ingebracht). */
export type DeelSoort = "vast" | "vorig" | "nieuw";
export type NotulenDeel = { titel: string; soort: DeelSoort; checkin: boolean; dossiers: boolean; toelichting: string | null; inbrenger: string | null; regels: { wie: string | null; tekst: string }[] };
export type Notulen = {
  titel: string;
  gegevens: { datum: string; tijd: string; locatie: string | null; aanwezig: string[]; notulist: string | null };
  structureel: string[];
  uitVorig: { titel: string; inbrenger: string | null }[];
  nieuw: { titel: string; inbrenger: string | null }[];
  delen: NotulenDeel[];
  acties: { wat: string; door: string; wanneer: string | null; status: "Lopend" | "Gedaan" }[];
  volgend: { titel: string; inbrenger: string | null }[];
};

/**
 * De notulen in de opbouw van het team: gegevens, agenda (structureel en wat
 * ter tafel komt), per punt wat er besproken is (de check-in en de dossiers
 * per aanwezige), actiepunten met wie en de status, en de punten voor het
 * volgende overleg. Eén bron voor het archief en de mail.
 */
export function notulenVan(
  overleg: Pick<Overleg, "datum" | "einde" | "locatie" | "notulist_naam">,
  agenda: Agendapunt[],
  aanwezigen: (Pick<Aanwezige, "naam" | "checkin" | "dossiers" | "sort"> & { user_id?: string | null })[],
  acties: Pick<Actiepunt, "wat" | "wie_naam" | "wanneer" | "gedaan_at">[],
  inbrengerVan: (p: Agendapunt) => string | null,
): Notulen {
  const lijst = sorteerAgenda(agenda);
  const vast = lijst.filter((p) => p.vast);
  const uitVorig = lijst.filter((p) => !p.vast && p.doorgeschoven && !p.voor_volgend);
  const nieuw = lijst.filter((p) => !p.vast && !p.doorgeschoven && !p.voor_volgend);
  const volgend = lijst.filter((p) => !p.vast && p.voor_volgend);
  const mensen = [...aanwezigen].sort((a, b) => a.sort - b.sort);
  const wie = korteNamen(mensen.map((m) => m.naam), mensen.map((m) => Boolean(m.user_id)));
  const perPersoon = (veld: "checkin" | "dossiers") =>
    mensen.flatMap((m, i) => (m[veld]?.trim() ? [{ wie: wie[i], tekst: m[veld]!.trim() }] : []));
  const algemeen = (p: Agendapunt) => (p.notulen?.trim() ? [{ wie: null, tekst: p.notulen.trim() }] : []);
  const deel = (p: Agendapunt): NotulenDeel => {
    const checkin = p.vast && isCheckIn(p.titel);
    const dossiers = p.vast && isDossiers(p.titel);
    return {
      titel: p.titel,
      soort: p.vast ? "vast" : p.doorgeschoven ? "vorig" : "nieuw",
      checkin,
      dossiers,
      toelichting: p.toelichting,
      inbrenger: p.vast ? null : inbrengerVan(p),
      regels: checkin ? perPersoon("checkin") : dossiers ? [...perPersoon("dossiers"), ...algemeen(p)] : algemeen(p),
    };
  };
  return {
    titel: `CM-overleg ${overlegDag(overleg.datum).replace(/^\S+ /, "")}`,
    gegevens: { datum: overlegDag(overleg.datum), tijd: tijdVanTot(overleg), locatie: overleg.locatie, aanwezig: mensen.map((m) => m.naam), notulist: overleg.notulist_naam ?? null },
    structureel: vast.map((p) => p.titel),
    uitVorig: uitVorig.map((p) => ({ titel: p.titel, inbrenger: inbrengerVan(p) })),
    nieuw: nieuw.map((p) => ({ titel: p.titel, inbrenger: inbrengerVan(p) })),
    delen: notulenVolgorde(lijst).map(deel),
    acties: acties.map((a) => ({ wat: a.wat, door: a.wie_naam, wanneer: a.wanneer, status: a.gedaan_at ? "Gedaan" : "Lopend" })),
    volgend: volgend.map((p) => ({ titel: p.titel, inbrenger: inbrengerVan(p) })),
  };
}

/**
 * De volgorde van de notulen zoals in de opzet van het team: eerst de check-in,
 * dan wat ter tafel komt (uit het vorige overleg, dan nieuw), dan de overige
 * vaste punten (Dossiers, Klanten …). Punten voor het volgende overleg staan
 * er niet in; die hebben een eigen plek.
 */
export function notulenVolgorde<T extends Pick<Agendapunt, "vast" | "titel" | "doorgeschoven" | "voor_volgend" | "sort" | "created_at">>(agenda: T[]): T[] {
  const lijst = sorteerAgenda(agenda).filter((p) => !p.voor_volgend);
  const vooraf = lijst.filter((p) => p.vast && isCheckIn(p.titel));
  const tafel = [...lijst.filter((p) => !p.vast && p.doorgeschoven), ...lijst.filter((p) => !p.vast && !p.doorgeschoven)];
  const rest = lijst.filter((p) => p.vast && !isCheckIn(p.titel));
  return [...vooraf, ...tafel, ...rest];
}

/**
 * Korte namen voor de regels per persoon ("Fleur: …", zoals in de opzet): bij
 * collega's de voornaam, of de hele naam als twee aanwezigen dezelfde voornaam
 * hebben. Een gast zonder inlog (inlog false) houdt de naam zoals die is getypt.
 */
export function korteNamen(namen: string[], inlog: boolean[] = namen.map(() => true)): string[] {
  const voornaam = (n: string) => (n.trim().split(/\s+/)[0] || n.trim()).toLowerCase();
  const telling = new Map<string, number>();
  for (const n of namen) telling.set(voornaam(n), (telling.get(voornaam(n)) ?? 0) + 1);
  return namen.map((n, i) => (!inlog[i] || (telling.get(voornaam(n)) ?? 0) > 1 ? n.trim() : n.trim().split(/\s+/)[0]));
}
