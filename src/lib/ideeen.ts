import { firstName } from "./dashboard";
import { weekNummer } from "./uren";
import { MELDING_SOORTEN } from "./weekevaluatie";

/**
 * Ideeënbord (0055; Rens, 23 nov 2026): wat collega's inbrengen en wat ermee
 * gebeurt. Elk idee heeft een status die het beheer zet, stemmen en reacties
 * van collega's, en een melding voor de inbrenger als er iets verandert.
 * "Iets melden of delen" uit de weekevaluatie komt via een trigger op het
 * bord; het bord heeft ook een eigen knop.
 *
 * Hier de rekenregels; het ophalen staat in lib/ideeenDb.ts, de schermen
 * onder /admin/ideeen. Teksten voor collega's noemen geen naam: "het beheer".
 */

export type IdeeSoort = "idee" | "zorg" | "compliment" | "vraag" | "anders";
export type IdeeStatus = "ingediend" | "bekeken" | "opgepakt" | "gedaan" | "niet_nu";

export type Idee = {
  id: string;
  titel: string;
  tekst: string;
  soort: IdeeSoort;
  door: string | null;
  door_email: string | null;
  vertrouwelijk: boolean;
  status: IdeeStatus;
  reden: string | null;
  status_at: string | null;
  status_door: string | null;
  bron: "bord" | "weekevaluatie";
  bron_week: string | null;
  created_at: string;
  updated_at: string;
};

export type Stem = { idee_id: string; user_id: string; created_at: string };
export type Reactie = { id: string; idee_id: string; user_id: string | null; door_email: string | null; tekst: string; created_at: string };
export type Melding = {
  id: string; user_id: string; idee_id: string; soort: "status" | "reactie"; status: IdeeStatus | null; tekst: string | null;
  door_email: string | null; gelezen_at: string | null; created_at: string;
};

/** Een idee met wat het bord erbij laat zien: de stemmen, of jij stemde, en het aantal reacties. */
export type BordIdee = Idee & { stemmen: number; mijnStem: boolean; reacties: number };

export const MAX_TITEL = 120;
export const MAX_TEKST = 4000;
export const MAX_REACTIE = 1000;
export const MAX_REDEN = 1000;
/** Na zoveel dagen op "ingediend" krijgt het beheer een signaal. */
export const LANG_OPEN_DAGEN = 14;

export const NIETS_MEDISCH_BORD = "Geen namen van werknemers van klanten en niets medisch: dat hoort in het dossier.";

/* ---------- soorten en statussen ---------- */

export type SoortInfo = { key: IdeeSoort; label: string; kort: string; kleur: string };

/**
 * Dezelfde vijf soorten als "Iets melden of delen" in de weekevaluatie
 * (MELDING_SOORTEN), met een kortere naam voor op een kaart.
 */
export const IDEE_SOORTEN: SoortInfo[] = [
  { key: "idee", label: "Een idee", kort: "Idee", kleur: "bg-[#eef0ff] text-[#312e82]" },
  { key: "zorg", label: "Iets wat niet lekker loopt", kort: "Loopt niet lekker", kleur: "bg-[#fff4e5] text-[#c77700]" },
  { key: "compliment", label: "Een compliment", kort: "Compliment", kleur: "bg-[#fdecf4] text-[#c2185b]" },
  { key: "vraag", label: "Een vraag", kort: "Vraag", kleur: "bg-[#e6f7f4] text-[#0e9f8a]" },
  { key: "anders", label: "Iets anders", kort: "Anders", kleur: "bg-black/[0.05] text-black/55" },
];

export type StatusInfo = {
  key: IdeeStatus; label: string;
  /** Wat de status betekent, voor de collega die het leest. */
  uitleg: string;
  /** Wat het beheer erbij schrijft, als uitleg bij het veld. */
  redenLabel: string;
  kleur: string;
  stip: string;
};

export const IDEE_STATUS: StatusInfo[] = [
  { key: "ingediend", label: "Ingediend", uitleg: "Nieuw. Het beheer heeft het nog niet bekeken.", redenLabel: "Een opmerking (mag leeg)", kleur: "bg-[#eef0ff] text-[#312e82]", stip: "bg-[#312e82]" },
  { key: "bekeken", label: "Bekeken", uitleg: "Gezien door het beheer. Het komt terug in het overleg of de kwartaalmeeting.", redenLabel: "Wat ermee gebeurt (mag leeg)", kleur: "bg-[#fff4e5] text-[#c77700]", stip: "bg-[#c77700]" },
  { key: "opgepakt", label: "Opgepakt", uitleg: "Er wordt aan gewerkt.", redenLabel: "Wie het oppakt en wat er gebeurt (mag leeg)", kleur: "bg-[#fdecf4] text-[#c2185b]", stip: "bg-[#e75387]" },
  { key: "gedaan", label: "Gedaan", uitleg: "Klaar.", redenLabel: "De uitkomst (mag leeg)", kleur: "bg-[#e6f7f4] text-[#0e9f8a]", stip: "bg-[#0a7a4b]" },
  { key: "niet_nu", label: "Niet nu", uitleg: "Nu niet, met de reden erbij.", redenLabel: "Waarom niet, of niet nu (verplicht)", kleur: "bg-black/[0.06] text-black/55", stip: "bg-black/35" },
];

export const STATUSSEN: IdeeStatus[] = IDEE_STATUS.map((s) => s.key);
export const SOORTEN: IdeeSoort[] = IDEE_SOORTEN.map((s) => s.key);

export const isStatus = (v: unknown): v is IdeeStatus => typeof v === "string" && (STATUSSEN as string[]).includes(v);
export const isSoort = (v: unknown): v is IdeeSoort => typeof v === "string" && (SOORTEN as string[]).includes(v);

export const statusInfo = (s: IdeeStatus): StatusInfo => IDEE_STATUS.find((x) => x.key === s) ?? IDEE_STATUS[0];
export const soortInfo = (s: IdeeSoort): SoortInfo => IDEE_SOORTEN.find((x) => x.key === s) ?? IDEE_SOORTEN[4];

/** Of de soorten van het bord dezelfde zijn als die van de weekevaluatie: één taal (het bord zet "idee" voorop, dat is de enige afwijking). */
export const soortenGelijkAanWeekevaluatie = () =>
  JSON.stringify([...SOORTEN].sort()) === JSON.stringify(MELDING_SOORTEN.map((k) => k.sleutel).sort());

/** Afgehandeld: er gebeurt niets meer mee. */
export const isAfgerond = (s: IdeeStatus) => s === "gedaan" || s === "niet_nu";

/* ---------- wie wat mag ---------- */

export type Kijker = { userId: string; beheer: boolean };

/** Of deze collega dit idee mag zien: vertrouwelijk is alleen voor de inbrenger en het beheer. Dezelfde regel als de policy. */
export function zichtbaarVoor(idee: Pick<Idee, "door" | "vertrouwelijk">, k: Kijker): boolean {
  return !idee.vertrouwelijk || k.beheer || idee.door === k.userId;
}

/** Je eigen idee aanpassen of weghalen kan zolang het op ingediend staat; het beheer altijd. */
export function magWijzigen(idee: Pick<Idee, "door" | "status">, k: Kijker): boolean {
  return k.beheer || (idee.door === k.userId && idee.status === "ingediend");
}

/** Stemmen: niet op je eigen idee, en niet op wat afgerond is. */
export function magStemmen(idee: Pick<Idee, "door" | "status">, k: Pick<Kijker, "userId">): boolean {
  return idee.door !== k.userId && !isAfgerond(idee.status);
}

/* ---------- sorteren en tellen ---------- */

export type Sortering = "nieuwste" | "stemmen";

export const leesSortering = (v: string | undefined): Sortering => (v === "stemmen" ? "stemmen" : "nieuwste");

/** Nieuwste eerst, of de meeste stemmen eerst (gelijk: nieuwste eerst). */
export function sorteer<T extends Pick<BordIdee, "created_at" | "stemmen">>(lijst: T[], hoe: Sortering): T[] {
  return [...lijst].sort((a, b) => (hoe === "stemmen" ? b.stemmen - a.stemmen || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at)));
}

/** De ideeën met hun stemmen en reacties erbij, zoals het bord ze toont. */
export function bouwBord(ideeen: Idee[], stemmen: Pick<Stem, "idee_id" | "user_id">[], reacties: Pick<Reactie, "idee_id">[], userId: string): BordIdee[] {
  const telStem = new Map<string, number>();
  const mijn = new Set<string>();
  for (const s of stemmen) {
    telStem.set(s.idee_id, (telStem.get(s.idee_id) ?? 0) + 1);
    if (s.user_id === userId) mijn.add(s.idee_id);
  }
  const telReactie = new Map<string, number>();
  for (const r of reacties) telReactie.set(r.idee_id, (telReactie.get(r.idee_id) ?? 0) + 1);
  return ideeen.map((i) => ({ ...i, stemmen: telStem.get(i.id) ?? 0, mijnStem: mijn.has(i.id), reacties: telReactie.get(i.id) ?? 0 }));
}

/** Hoeveel er in elke status staat, voor de filterknoppen. */
export function telPerStatus(lijst: Pick<Idee, "status">[]): Record<IdeeStatus, number> {
  const uit = Object.fromEntries(STATUSSEN.map((s) => [s, 0])) as Record<IdeeStatus, number>;
  for (const i of lijst) uit[i.status] += 1;
  return uit;
}

const DAG = 86_400_000;
const utcDag = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

/** Hoeveel dagen geleden iets was, in Nederlandse dagen. */
export function dagenGeleden(iso: string, vandaag: string): number {
  const dag = new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  return Math.round((utcDag(vandaag) - utcDag(dag)) / DAG);
}

/** Het signaal voor het beheer: ideeën die al langer dan twee weken op ingediend staan, het oudste eerst. */
export function langOpen<T extends Pick<Idee, "status" | "created_at">>(lijst: T[], vandaag: string, dagen = LANG_OPEN_DAGEN): T[] {
  return lijst
    .filter((i) => i.status === "ingediend" && dagenGeleden(i.created_at, vandaag) > dagen)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** De maandag van de week waarin vandaag valt. */
export function maandagVanWeek(vandaag: string): string {
  const d = new Date(utcDag(vandaag));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAG).toISOString().slice(0, 10);
}

/** Ingediend deze week (vanaf maandag, Nederlandse tijd). */
export function nieuwDezeWeek<T extends Pick<Idee, "created_at">>(lijst: T[], vandaag: string): T[] {
  const maandag = maandagVanWeek(vandaag);
  return lijst.filter((i) => new Date(i.created_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) >= maandag);
}

/* ---------- tekst ---------- */

/**
 * De titel uit een melding zonder titel (de weekevaluatie): de eerste regel,
 * met één spatie tussen de woorden; langer dan 90 tekens wordt afgekapt.
 * Dezelfde regel als idee_titel() in 0055.
 */
export function titelUit(tekst: string): string {
  const regel = (tekst.trim().split("\n")[0] ?? "").replace(/\s+/g, " ").trim();
  return regel.length <= 90 ? regel : `${regel.slice(0, 79).trimEnd()}…`;
}

/**
 * Wat er onder de titel staat. Bij een idee uit de weekevaluatie is de titel
 * de eerste regel van de melding; die regel niet nog eens tonen. Blijft er
 * niets over (een melding van één regel), dan null.
 */
export function toonTekst(idee: Pick<Idee, "titel" | "tekst" | "bron">): string | null {
  if (idee.bron !== "weekevaluatie") return idee.tekst;
  const [eerste, ...rest] = idee.tekst.trim().split("\n");
  if (eerste.replace(/\s+/g, " ").trim() !== idee.titel) return idee.tekst;
  const over = rest.join("\n").trim();
  return over || null;
}

/** Hoe een collega op het bord heet: de voornaam uit het e-mailadres, anders het adres; zonder adres "een collega". */
export function naamVan(email: string | null | undefined): string {
  if (!email) return "een collega";
  return firstName(email) || email;
}

const DATUM = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const DATUM_JAAR = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });

/** "3 nov", of met jaartal als het niet dit jaar is. */
export function datumKort(iso: string, vandaag: string): string {
  const d = new Date(iso);
  const f = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).slice(0, 4) === vandaag.slice(0, 4) ? DATUM : DATUM_JAAR;
  return f.format(d).replace(".", "");
}

/** "vandaag", "gisteren", "3 dagen geleden", of de datum als het langer dan een week is. */
export function wanneer(iso: string, vandaag: string): string {
  const n = dagenGeleden(iso, vandaag);
  if (n <= 0) return "vandaag";
  if (n === 1) return "gisteren";
  if (n < 7) return `${n} dagen geleden`;
  return datumKort(iso, vandaag);
}

/** Waar het idee vandaan komt, voor op de kaart. */
export function bronTekst(idee: Pick<Idee, "bron" | "bron_week">): string | null {
  return idee.bron === "weekevaluatie" && idee.bron_week ? `uit de weekevaluatie van week ${weekNummer(idee.bron_week).week}` : null;
}

/** De zin op het dashboard over een melding voor de inbrenger. */
export function meldingTekst(m: Pick<Melding, "soort" | "status" | "tekst" | "door_email">, titel: string): { kop: string; sub: string | null } {
  if (m.soort === "reactie") {
    return { kop: `${naamVan(m.door_email)} reageerde op "${titel}"`, sub: m.tekst ? inkorten(m.tekst, 120) : null };
  }
  const s = m.status ? statusInfo(m.status) : null;
  return { kop: `Je idee "${titel}" staat nu op ${s ? s.label : "een andere status"}`, sub: m.tekst ? inkorten(m.tekst, 120) : s?.uitleg ?? null };
}

export function inkorten(t: string, max: number): string {
  const r = t.replace(/\s+/g, " ").trim();
  return r.length <= max ? r : `${r.slice(0, max - 1).trimEnd()}…`;
}

/* ---------- formulieren (anders de sleutel van de foutmelding in Toast) ---------- */

const tekstVan = (f: FormData, k: string) => String(f.get(k) || "").replace(/\r\n/g, "\n").trim();

export type IdeeInvoer = { titel: string; tekst: string; soort: IdeeSoort; vertrouwelijk: boolean };

export function leesIdee(f: FormData): IdeeInvoer | { fout: string } {
  const titel = tekstVan(f, "titel").replace(/\s+/g, " ");
  const tekst = tekstVan(f, "tekst");
  const soort = tekstVan(f, "soort");
  if (!titel || !tekst) return { fout: "idee-leeg" };
  if (titel.length > MAX_TITEL || tekst.length > MAX_TEKST) return { fout: "idee-te-lang" };
  return { titel, tekst, soort: isSoort(soort) ? soort : "idee", vertrouwelijk: tekstVan(f, "vertrouwelijk") === "aan" };
}

export function leesReactie(f: FormData): { tekst: string } | { fout: string } {
  const tekst = tekstVan(f, "tekst");
  if (!tekst) return { fout: "reactie-leeg" };
  if (tekst.length > MAX_REACTIE) return { fout: "reactie-te-lang" };
  return { tekst };
}

/** De status met reden, zoals het beheer hem zet: "niet nu" vraagt een reden. */
export function leesStatus(f: FormData): { status: IdeeStatus; reden: string | null } | { fout: string } {
  const status = tekstVan(f, "status");
  const reden = tekstVan(f, "reden");
  if (!isStatus(status)) return { fout: "idee-status" };
  if (reden.length > MAX_REDEN) return { fout: "idee-te-lang" };
  if (status === "niet_nu" && !reden) return { fout: "idee-reden" };
  return { status, reden: reden || null };
}

/* ---------- de mails aan de inbrenger (via sendBrief) ---------- */

export type Brief = { onderwerp: string; alineas: string[]; groet: string[] };

/** Een andere status: kort wat het betekent, de reden van het beheer, en waar je het terugvindt. Zonder namen. */
export function statusBrief(voornaam: string | null, idee: Pick<Idee, "titel">, status: IdeeStatus, reden: string | null, link: string): Brief {
  const s = statusInfo(status);
  const zin: Record<IdeeStatus, string> = {
    ingediend: `Je idee "${idee.titel}" staat weer op Ingediend.`,
    bekeken: `Het beheer heeft je idee "${idee.titel}" bekeken. Het komt terug in het overleg of de kwartaalmeeting.`,
    opgepakt: `Goed nieuws: je idee "${idee.titel}" is opgepakt. Er wordt aan gewerkt.`,
    gedaan: `Je idee "${idee.titel}" is gedaan.`,
    niet_nu: `Je idee "${idee.titel}" pakken we nu niet op.`,
  };
  return {
    onderwerp: `Je idee "${inkorten(idee.titel, 60)}": ${s.label.toLowerCase()}`,
    alineas: [
      `Hoi${voornaam ? ` ${voornaam}` : ""},`,
      zin[status],
      ...(reden ? [`Het beheer schreef erbij: "${reden}"`] : []),
      `Je vindt het terug op het ideeënbord, met de reacties en stemmen van je collega's: ${link}`,
    ],
    groet: ["Met vriendelijke groet,", "Het beheer", "React2u"],
  };
}

/** Een reactie van een collega op jouw idee. Antwoorden gaat naar die collega. */
export function reactieBrief(voornaam: string | null, idee: Pick<Idee, "titel">, van: string, tekst: string, link: string): Brief {
  return {
    onderwerp: `${van} reageerde op je idee "${inkorten(idee.titel, 60)}"`,
    alineas: [
      `Hoi${voornaam ? ` ${voornaam}` : ""},`,
      `${van} reageerde op je idee "${idee.titel}":`,
      `"${tekst}"`,
      `Reageer terug op het ideeënbord, of beantwoord deze mail: dan gaat je antwoord rechtstreeks naar ${van}. ${link}`,
    ],
    groet: ["Groet,", van, "React2u"],
  };
}
