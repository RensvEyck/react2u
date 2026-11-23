import type { requireAdmin } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import type { KaartKlant } from "@/lib/kaart";
import type { Aanwezige, Actiepunt, Agendapunt, Collega, Overleg, Ritme } from "@/lib/overleg";
import { firstName } from "@/lib/dashboard";

/**
 * Het CM-overleg uit de database (0053), met de sessie van de ingelogde
 * collega: de policies bepalen wat terugkomt (recht overleg of omzet).
 */

type Sb = Awaited<ReturnType<typeof requireAdmin>>["sb"];
export type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: "migratie" | "laden" };

export type ArchiefRij = Overleg & { punten: number; acties: number; open: number };
export type OverlegStand = {
  ritme: Ritme | null;
  /** Het eerstvolgende overleg dat nog niet afgerond is. */
  volgend: Overleg | null;
  aanwezigen: Aanwezige[];
  /** Collega's met het recht overleg (cm_collegas in 0054), voor de keuzelijsten. */
  collegas: Collega[];
  agenda: Agendapunt[];
  /** Open actiepunten, en wat de laatste twee weken gedaan is. */
  acties: Actiepunt[];
  archief: ArchiefRij[];
  /** Het laatste overleg, gepland of geweest: daar telt het ritme vanaf. */
  laatste: string | null;
};

export async function haalOverleg(sb: Sb, nu = new Date()): Promise<Uitkomst<OverlegStand>> {
  const tweeWeken = new Date(nu.getTime() - 14 * 86_400_000).toISOString();
  const [ritme, open, archief, laatste, acties] = await Promise.all([
    sb.from("cm_ritme").select("*").maybeSingle(),
    sb.from("cm_overleggen").select("*").is("afgerond_at", null).order("datum").limit(1),
    sb.from("cm_overleggen").select("*").not("afgerond_at", "is", null).order("datum", { ascending: false }).limit(30),
    sb.from("cm_overleggen").select("datum").order("datum", { ascending: false }).limit(1),
    sb.from("cm_actiepunten").select("*").or(`gedaan_at.is.null,gedaan_at.gte.${tweeWeken}`).order("created_at"),
  ]);
  const fout = ritme.error || open.error || archief.error || laatste.error || acties.error;
  if (fout) return { ok: false, fout: isMissingTable(fout) ? "migratie" : "laden" };

  const volgend = ((open.data as Overleg[] | null) || [])[0] ?? null;
  const oud = (archief.data as Overleg[] | null) || [];
  const ids = [...(volgend ? [volgend.id] : []), ...oud.map((o) => o.id)];
  const [punten, alleActies] = ids.length
    ? await Promise.all([
        sb.from("cm_agendapunten").select("*").in("overleg_id", ids),
        sb.from("cm_actiepunten").select("id, overleg_id, gedaan_at").in("overleg_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const allePunten = (punten.data as Agendapunt[] | null) || [];
  const [aanw, col] = await Promise.all([
    volgend ? sb.from("cm_aanwezigen").select("*").eq("overleg_id", volgend.id).order("sort") : Promise.resolve({ data: [] }),
    haalCollegas(sb),
  ]);
  const telActies = (alleActies.data as Pick<Actiepunt, "id" | "overleg_id" | "gedaan_at">[] | null) || [];

  return {
    ok: true,
    data: {
      ritme: (ritme.data as Ritme | null) ?? null,
      volgend,
      agenda: volgend ? allePunten.filter((p) => p.overleg_id === volgend.id) : [],
      aanwezigen: ((aanw as { data: unknown }).data as Aanwezige[] | null) || [],
      collegas: col,
      acties: (acties.data as Actiepunt[] | null) || [],
      archief: oud.map((o) => ({
        ...o,
        punten: allePunten.filter((p) => p.overleg_id === o.id).length,
        acties: telActies.filter((a) => a.overleg_id === o.id).length,
        open: telActies.filter((a) => a.overleg_id === o.id && !a.gedaan_at).length,
      })),
      laatste: ((laatste.data as { datum: string }[] | null) || [])[0]?.datum ?? null,
    },
  };
}

/** Eén overleg met agenda en actiepunten, voor het archief. */
export async function haalEenOverleg(sb: Sb, id: string): Promise<Uitkomst<{ overleg: Overleg; agenda: Agendapunt[]; acties: Actiepunt[]; aanwezigen: Aanwezige[]; collegas: Collega[] } | null>> {
  const [o, p, a, w, collegas] = await Promise.all([
    sb.from("cm_overleggen").select("*").eq("id", id).maybeSingle(),
    sb.from("cm_agendapunten").select("*").eq("overleg_id", id),
    sb.from("cm_actiepunten").select("*").eq("overleg_id", id).order("created_at"),
    sb.from("cm_aanwezigen").select("*").eq("overleg_id", id).order("sort"),
    haalCollegas(sb),
  ]);
  const fout = o.error || p.error || a.error;
  if (fout) return { ok: false, fout: isMissingTable(fout) ? "migratie" : "laden" };
  if (!o.data) return { ok: true, data: null };
  return { ok: true, data: { overleg: o.data as Overleg, agenda: (p.data as Agendapunt[]) || [], acties: (a.data as Actiepunt[]) || [], aanwezigen: (w.data as Aanwezige[] | null) || [], collegas } };
}

/** De klanten voor de kaart (cm_kaart in 0053). */
export async function haalKaart(sb: Sb): Promise<KaartKlant[] | null> {
  const { data, error } = await sb.rpc("cm_kaart");
  if (error) return null;
  return (data as KaartKlant[] | null) || [];
}

/** Voor het dashboard: het volgende overleg met het aantal agendapunten, en de eigen open actiepunten. */
export async function haalOverlegKort(sb: Sb, userId: string): Promise<{ volgend: Overleg | null; punten: number; mijnActies: Actiepunt[] } | null> {
  const [open, acties] = await Promise.all([
    sb.from("cm_overleggen").select("*").is("afgerond_at", null).order("datum").limit(1),
    sb.from("cm_actiepunten").select("*").eq("wie", userId).is("gedaan_at", null).order("wanneer", { nullsFirst: false }),
  ]);
  if (open.error || acties.error) return null;
  const volgend = ((open.data as Overleg[] | null) || [])[0] ?? null;
  const punten = volgend
    ? (await sb.from("cm_agendapunten").select("id", { count: "exact", head: true }).eq("overleg_id", volgend.id)).count ?? 0
    : 0;
  return { volgend, punten, mijnActies: (acties.data as Actiepunt[] | null) || [] };
}

/** De collega's met het recht overleg (cm_collegas in 0054), met de naam uit de medewerkers of anders uit het e-mailadres. */
export async function haalCollegas(sb: Sb): Promise<Collega[]> {
  const { data, error } = await sb.rpc("cm_collegas");
  if (error) return [];
  return ((data as { user_id: string; email: string; naam: string | null }[] | null) || []).map((c) => ({
    user_id: c.user_id, email: c.email, naam: c.naam || firstName(c.email) || c.email,
  }));
}

/** Wie een punt inbracht: de naam van de collega, of de voornaam uit het e-mailadres. */
export function inbrengerNaam(collegas: Collega[]) {
  return (p: Agendapunt): string | null => (p.door && collegas.find((c) => c.user_id === p.door)?.naam) || (p.door_email ? firstName(p.door_email) || p.door_email : null);
}
