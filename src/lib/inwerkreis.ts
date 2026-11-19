/**
 * Inwerkreis (0050; Rens, 19 nov 2026: "Inwerkreis voor nieuwe collega's. 30,
 * 60 en 90 dagen per functie, met een buddy, oefencasussen en mijlpalen").
 *
 * Per functie een sjabloon met stappen in drie fasen. Het beheer (recht
 * omzet) vult het sjabloon en start een reis voor een collega, met een
 * startdatum en de naam van een buddy. De collega vinkt zelf taken en
 * oefencasussen af; een mijlpaal tekent het beheer af. De startdatum is dag 1.
 *
 * Hier de vaste lijsten en de rekenregels; de schermen staan onder
 * /admin/inwerkreis (de eigen reis) en /admin/inwerken (het beheer).
 */

export type InwerkSoort = "taak" | "casus" | "mijlpaal";
export type Fase = 30 | 60 | 90;

/** De reis duurt negentig dagen; daarna blijft hij zichtbaar tot het beheer hem afrondt. */
export const DUUR = 90;

export const FASES: { fase: Fase; van: number; tot: number; label: string }[] = [
  { fase: 30, van: 1, tot: 30, label: "De eerste 30 dagen" },
  { fase: 60, van: 31, tot: 60, label: "Dag 31 tot 60" },
  { fase: 90, van: 61, tot: 90, label: "Dag 61 tot 90" },
];

export const SOORTEN: Record<InwerkSoort, { label: string; meervoud: string; uitleg: string; zelf: boolean; kleur: string; achter: string }> = {
  taak: {
    label: "Taak", meervoud: "Taken", zelf: true, kleur: "#312e82", achter: "#eef0ff",
    uitleg: "Iets wat de nieuwe collega doet, leest of regelt. Vinkt de collega zelf af.",
  },
  casus: {
    label: "Oefencasus", meervoud: "Oefencasussen", zelf: true, kleur: "#0a7a4b", achter: "#e3f6ed",
    uitleg: "Een oefensituatie, bijvoorbeeld een dossier of een gesprek, om te oefenen en te bespreken. Vinkt de collega zelf af.",
  },
  mijlpaal: {
    label: "Mijlpaal", meervoud: "Mijlpalen", zelf: false, kleur: "#b86e00", achter: "#fff4e5",
    uitleg: "Een moment waarop je samen vaststelt dat iets lukt. Tekent het beheer af.",
  },
};

export const SOORT_VOLGORDE: InwerkSoort[] = ["taak", "casus", "mijlpaal"];

export type InwerkSjabloon = { id: string; functie: string; sort: number };
export type InwerkStap = { id: string; sjabloon_id: string; fase: Fase; soort: InwerkSoort; titel: string; uitleg: string | null; sort: number; created_at: string };
export type Inwerkreis = { id: string; user_id: string; sjabloon_id: string; startdatum: string; buddy: string | null; afgerond_at: string | null; created_at: string };
export type InwerkVoortgang = { reis_id: string; stap_id: string; gedaan_at: string; door: string };

const DAG = 86_400_000;
const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

/** De dag van de reis: de startdatum is dag 1, de dag ervoor 0. */
export function dagVanReis(startdatum: string, vandaag: string): number {
  return Math.round((utc(vandaag) - utc(startdatum)) / DAG) + 1;
}

/** De fase van een dag; vóór de start de eerste, na dag 90 de laatste. */
export function faseVanDag(dag: number): Fase {
  return dag <= 30 ? 30 : dag <= 60 ? 60 : 90;
}

/** "Dag 12 van 90", "Begint morgen", "Begint over 5 dagen", "90 dagen voorbij". */
export function dagTekst(dag: number): string {
  if (dag < 1) return dag === 0 ? "Begint morgen" : `Begint over ${1 - dag} dagen`;
  if (dag > DUUR) return `${DUUR} dagen voorbij`;
  return `Dag ${dag} van ${DUUR}`;
}

/** Op volgorde: fase, dan de eigen volgorde, dan wanneer toegevoegd. */
export function sorteerStappen<T extends Pick<InwerkStap, "fase" | "sort" | "created_at">>(stappen: T[]): T[] {
  return [...stappen].sort((a, b) => a.fase - b.fase || a.sort - b.sort || a.created_at.localeCompare(b.created_at));
}

export type StapStand = InwerkStap & { gedaan: InwerkVoortgang | null };
export type FaseStand = { fase: Fase; label: string; van: number; tot: number; stappen: StapStand[]; gedaan: number; totaal: number; nu: boolean; voorbij: boolean };
export type ReisStand = {
  dag: number;
  fase: Fase;
  begonnen: boolean;
  fases: FaseStand[];
  gedaan: number;
  totaal: number;
  /** Open stappen uit fasen die al voorbij zijn. */
  achter: number;
  /** De eerstvolgende open stappen: eerst wat achterloopt, dan de fase van nu. */
  volgende: StapStand[];
  /** Mijlpalen die wachten op aftekenen in een fase die loopt of voorbij is. */
  mijlpalenOpen: number;
};

export function reisStand(reis: Pick<Inwerkreis, "startdatum">, stappen: InwerkStap[], voortgang: InwerkVoortgang[], vandaag: string, aantalVolgende = 3): ReisStand {
  const dag = dagVanReis(reis.startdatum, vandaag);
  const fase = faseVanDag(dag);
  const gedaan = new Map(voortgang.map((v) => [v.stap_id, v]));
  const alle = sorteerStappen(stappen).map((s) => ({ ...s, gedaan: gedaan.get(s.id) ?? null }));
  const fases: FaseStand[] = FASES.map((f) => {
    const lijst = alle.filter((s) => s.fase === f.fase);
    return {
      ...f,
      stappen: lijst,
      gedaan: lijst.filter((s) => s.gedaan).length,
      totaal: lijst.length,
      nu: dag >= 1 && f.fase === fase && dag <= DUUR,
      voorbij: dag > f.tot,
    };
  });
  const open = alle.filter((s) => !s.gedaan);
  const achterStappen = open.filter((s) => s.fase < fase);
  const nuStappen = open.filter((s) => s.fase === fase);
  return {
    dag,
    fase,
    begonnen: dag >= 1,
    fases,
    gedaan: alle.length - open.length,
    totaal: alle.length,
    achter: achterStappen.length,
    volgende: [...achterStappen, ...nuStappen].slice(0, aantalVolgende),
    mijlpalenOpen: open.filter((s) => s.soort === "mijlpaal" && s.fase <= fase && dag >= 1).length,
  };
}

/** Waar je staat op een balk van negentig dagen, in procenten. */
export function dagPositie(dag: number): number {
  return Math.min(100, Math.max(0, ((dag - 0.5) / DUUR) * 100));
}

/** Een stap uit een formulier lezen; anders de sleutel van de foutmelding (Toast). */
export function leesStap(form: FormData): { fase: Fase; soort: InwerkSoort; titel: string; uitleg: string | null } | { fout: string } {
  const fase = Number(form.get("fase"));
  const soort = String(form.get("soort") || "");
  const titel = String(form.get("titel") || "").trim();
  const uitleg = String(form.get("uitleg") || "").trim();
  if (fase !== 30 && fase !== 60 && fase !== 90) return { fout: "inwerk-fase" };
  if (!SOORT_VOLGORDE.includes(soort as InwerkSoort)) return { fout: "inwerk-soort" };
  if (!titel) return { fout: "inwerk-titel" };
  if (titel.length > 200 || uitleg.length > 2000) return { fout: "inwerk-te-lang" };
  return { fase, soort: soort as InwerkSoort, titel, uitleg: uitleg || null };
}

/** "stap" of "stappen", naar het aantal. */
export const stappenWoord = (n: number) => (n === 1 ? "stap" : "stappen");

/** "1 taak", "2 oefencasussen", "0 mijlpalen". */
export function soortAantal(soort: InwerkSoort, n: number): string {
  return `${n} ${(n === 1 ? SOORTEN[soort].label : SOORTEN[soort].meervoud).toLowerCase()}`;
}
