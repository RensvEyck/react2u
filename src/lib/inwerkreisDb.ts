import type { requireAdmin } from "@/lib/admin";
import { firstName } from "@/lib/dashboard";
import { isMissingTable } from "@/lib/dbErrors";
import { reisStand, type Inwerkreis, type InwerkSjabloon, type InwerkStap, type InwerkVoortgang, type ReisStand } from "@/lib/inwerkreis";

/**
 * De inwerkreis uit de database (0050). Alles gaat met de sessie van de
 * ingelogde collega: de policies bepalen wat terugkomt. Een collega ziet zijn
 * eigen reis met de stappen van zijn sjabloon; het beheer (recht omzet) alles.
 */

type Sb = Awaited<ReturnType<typeof requireAdmin>>["sb"];

export type ReisVolledig = {
  reis: Inwerkreis;
  sjabloon: InwerkSjabloon | null;
  stappen: InwerkStap[];
  voortgang: InwerkVoortgang[];
};

export type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: "migratie" | "laden" };

async function vulAan(sb: Sb, reis: Inwerkreis): Promise<ReisVolledig> {
  const [sj, st, vg] = await Promise.all([
    sb.from("inwerk_sjablonen").select("id, functie, sort").eq("id", reis.sjabloon_id).maybeSingle(),
    sb.from("inwerk_stappen").select("*").eq("sjabloon_id", reis.sjabloon_id),
    sb.from("inwerk_voortgang").select("*").eq("reis_id", reis.id),
  ]);
  return {
    reis,
    sjabloon: (sj.data as InwerkSjabloon | null) ?? null,
    stappen: (st.data as InwerkStap[] | null) ?? [],
    voortgang: (vg.data as InwerkVoortgang[] | null) ?? [],
  };
}

/** De eigen reis van de ingelogde collega, of null als er geen is. */
export async function haalEigenReis(sb: Sb, userId: string): Promise<Uitkomst<ReisVolledig | null>> {
  const { data, error } = await sb.from("inwerkreizen").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { ok: false, fout: isMissingTable(error) ? "migratie" : "laden" };
  if (!data) return { ok: true, data: null };
  return { ok: true, data: await vulAan(sb, data as Inwerkreis) };
}

export async function haalReis(sb: Sb, id: string): Promise<Uitkomst<ReisVolledig | null>> {
  const { data, error } = await sb.from("inwerkreizen").select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, fout: isMissingTable(error) ? "migratie" : "laden" };
  if (!data) return { ok: true, data: null };
  return { ok: true, data: await vulAan(sb, data as Inwerkreis) };
}

export type Collega = { user_id: string; email: string; rol: string; naam: string };

/** Collega's met inlog, met de naam uit de medewerkers als die gekoppeld is. Alleen voor het beheer. */
export async function haalCollegas(sb: Sb): Promise<Collega[]> {
  const [{ data: rijen }, { data: mws }] = await Promise.all([
    sb.rpc("inwerk_collegas"),
    sb.from("medewerkers").select("naam, user_id").not("user_id", "is", null),
  ]);
  const namen = new Map(((mws as { naam: string; user_id: string }[] | null) || []).map((m) => [m.user_id, m.naam]));
  return ((rijen as { user_id: string; email: string; rol: string }[] | null) || []).map((r) => ({
    ...r,
    naam: namen.get(r.user_id) || firstName(r.email) || r.email,
  }));
}

export type ReisRij = { reis: Inwerkreis; collega: Collega | null; functie: string; stand: ReisStand };
export type SjabloonRij = InwerkSjabloon & { stappen: InwerkStap[]; inGebruik: number };
export type Overzicht = { reizen: ReisRij[]; sjablonen: SjabloonRij[]; collegas: Collega[] };

/** Alles voor /admin/inwerken: de reizen met hun stand, de sjablonen en wie nog geen reis heeft. */
export async function haalOverzicht(sb: Sb, vandaag: string): Promise<Uitkomst<Overzicht>> {
  const [rz, sj, st, vg, collegas] = await Promise.all([
    sb.from("inwerkreizen").select("*").order("startdatum", { ascending: false }),
    sb.from("inwerk_sjablonen").select("id, functie, sort").order("sort").order("functie"),
    sb.from("inwerk_stappen").select("*"),
    sb.from("inwerk_voortgang").select("*"),
    haalCollegas(sb),
  ]);
  const fout = rz.error || sj.error || st.error || vg.error;
  if (fout) return { ok: false, fout: isMissingTable(fout) ? "migratie" : "laden" };
  const reizen = (rz.data as Inwerkreis[]) || [];
  const stappen = (st.data as InwerkStap[]) || [];
  const voortgang = (vg.data as InwerkVoortgang[]) || [];
  const sjablonen = ((sj.data as InwerkSjabloon[]) || []).map((s) => ({
    ...s,
    stappen: stappen.filter((x) => x.sjabloon_id === s.id),
    inGebruik: reizen.filter((r) => r.sjabloon_id === s.id).length,
  }));
  const perId = new Map(collegas.map((c) => [c.user_id, c]));
  return {
    ok: true,
    data: {
      sjablonen,
      collegas,
      reizen: reizen.map((reis) => ({
        reis,
        collega: perId.get(reis.user_id) ?? null,
        functie: sjablonen.find((s) => s.id === reis.sjabloon_id)?.functie ?? "",
        stand: reisStand(reis, stappen.filter((s) => s.sjabloon_id === reis.sjabloon_id), voortgang.filter((v) => v.reis_id === reis.id), vandaag),
      })),
    },
  };
}
