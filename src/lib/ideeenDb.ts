import type { requireAdmin } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { bouwBord, langOpen, nieuwDezeWeek, type BordIdee, type Idee, type Melding, type Reactie, type Stem } from "@/lib/ideeen";

/**
 * Het ideeënbord uit de database (0055), met de sessie van de ingelogde
 * collega: de policies bepalen wat terugkomt (eigen ideeën altijd, de rest met
 * het recht ideeen, vertrouwelijke alleen met omzet).
 */

type Sb = Awaited<ReturnType<typeof requireAdmin>>["sb"];
export type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: "migratie" | "laden" };

export type Bord = { ideeen: BordIdee[]; meldingen: Melding[] };

/** Alles voor het bord: de ideeën met stemmen en reacties geteld, en de ongelezen meldingen van de kijker. */
export async function haalBord(sb: Sb, userId: string): Promise<Uitkomst<Bord>> {
  const [i, s, r, m] = await Promise.all([
    sb.from("ideeen").select("*").order("created_at", { ascending: false }).limit(1000),
    sb.from("idee_stemmen").select("idee_id, user_id").limit(10000),
    sb.from("idee_reacties").select("idee_id").limit(10000),
    sb.from("idee_meldingen").select("*").eq("user_id", userId).is("gelezen_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  const fout = i.error || s.error || r.error || m.error;
  if (fout) return { ok: false, fout: isMissingTable(fout) ? "migratie" : "laden" };
  return {
    ok: true,
    data: {
      ideeen: bouwBord((i.data as Idee[] | null) || [], (s.data as Pick<Stem, "idee_id" | "user_id">[] | null) || [], (r.data as Pick<Reactie, "idee_id">[] | null) || [], userId),
      meldingen: (m.data as Melding[] | null) || [],
    },
  };
}

export type IdeeVolledig = { idee: BordIdee; stemmers: Stem[]; reacties: Reactie[] };

/** Eén idee met wie erop stemde en de reacties; null als het er niet is of niet voor deze kijker. */
export async function haalIdee(sb: Sb, id: string, userId: string): Promise<Uitkomst<IdeeVolledig | null>> {
  const [i, s, r] = await Promise.all([
    sb.from("ideeen").select("*").eq("id", id).maybeSingle(),
    sb.from("idee_stemmen").select("*").eq("idee_id", id).order("created_at"),
    sb.from("idee_reacties").select("*").eq("idee_id", id).order("created_at"),
  ]);
  const fout = i.error || s.error || r.error;
  if (fout) return { ok: false, fout: isMissingTable(fout) ? "migratie" : "laden" };
  if (!i.data) return { ok: true, data: null };
  const stemmers = (s.data as Stem[] | null) || [];
  const reacties = (r.data as Reactie[] | null) || [];
  const [idee] = bouwBord([i.data as Idee], stemmers, reacties, userId);
  return { ok: true, data: { idee, stemmers, reacties } };
}

export type IdeeenKort = {
  /** Ingediend deze week, voor zover zichtbaar voor de kijker. */
  nieuw: number;
  /** De eigen ideeën die het beheer oppakte of afrondde. */
  mijnOpgepakt: Idee[];
  /** Wat de kijker nog niet las over zijn eigen ideeën, met de titel erbij. */
  meldingen: (Melding & { titel: string })[];
  /** Voor het beheer: wat al langer dan twee weken op ingediend staat. Leeg voor wie dat niet mag zien. */
  langOpen: Idee[];
};

/** Voor het dashboard: nieuw deze week, wat van jou is opgepakt, je ongelezen meldingen en (beheer) het signaal. Null vóór de migratie. */
export async function haalIdeeenKort(sb: Sb, userId: string, vandaag: string, beheer: boolean): Promise<IdeeenKort | null> {
  const [i, m] = await Promise.all([
    sb.from("ideeen").select("*").order("created_at", { ascending: false }).limit(1000),
    sb.from("idee_meldingen").select("*").eq("user_id", userId).is("gelezen_at", null).order("created_at", { ascending: false }).limit(20),
  ]);
  if (i.error || m.error) return null;
  const ideeen = (i.data as Idee[] | null) || [];
  const titels = new Map(ideeen.map((x) => [x.id, x.titel]));
  const meldingen = ((m.data as Melding[] | null) || []).map((x) => ({ ...x, titel: titels.get(x.idee_id) ?? "een idee" }));
  return {
    nieuw: nieuwDezeWeek(ideeen, vandaag).length,
    mijnOpgepakt: ideeen.filter((x) => x.door === userId && (x.status === "opgepakt" || x.status === "gedaan")),
    meldingen,
    langOpen: beheer ? langOpen(ideeen, vandaag) : [],
  };
}
