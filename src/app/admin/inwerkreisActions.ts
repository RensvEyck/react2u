"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { leesStap } from "@/lib/inwerkreis";
import { datumOver } from "@/lib/offertes";

/**
 * De inwerkreis (0050). Sjablonen en reizen: alleen met het recht omzet. Een
 * stap afvinken: iedereen met een reis, maar de policies laten een collega
 * alleen taken en oefencasussen van zijn eigen reis afvinken; een mijlpaal
 * tekent het beheer af. De database controleert hetzelfde; dit geeft een
 * nette melding.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

const naarSjabloon = (id: string, q: string, fase?: number) => `/admin/inwerken/sjabloon/${id}?${q}${fase ? `#fase-${fase}` : ""}`;
const naarReis = (id: string, q: string) => `/admin/inwerken/${id}?${q}`;
const foutSleutel = (error: { code?: string; message: string }) => (isMissingTable(error) ? "migratie-0050" : "opslaan");

function ververs() {
  revalidatePath("/admin/inwerken", "layout");
  revalidatePath("/admin/inwerkreis");
  revalidatePath("/admin", "layout");
}

/* ---------- sjablonen ---------- */

export async function inwerkSjabloonToevoegen(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const functie = String(formData.get("functie") || "").trim();
  if (!functie || functie.length > 120) redirect("/admin/inwerken?fout=inwerk-functie#sjablonen");
  const { data: laatste } = await sb.from("inwerk_sjablonen").select("sort").order("sort", { ascending: false }).limit(1);
  const sort = ((laatste as { sort: number }[] | null)?.[0]?.sort ?? 0) + 1;
  const { data, error } = await sb.from("inwerk_sjablonen").insert({ functie, sort }).select("id").single();
  if (error) redirect(`/admin/inwerken?fout=${error.code === "23505" ? "inwerk-functie-bestaat" : foutSleutel(error)}#sjablonen`);
  ververs();
  redirect(naarSjabloon((data as { id: string }).id, "opgeslagen=inwerk-sjabloon"));
}

export async function inwerkSjabloonVerwijderen(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect("/admin/inwerken?fout=opslaan");
  const { error } = await sb.from("inwerk_sjablonen").delete().eq("id", id);
  if (error) redirect(naarSjabloon(id, `fout=${error.code === "23503" ? "inwerk-sjabloon-in-gebruik" : foutSleutel(error)}`));
  ververs();
  redirect("/admin/inwerken?opgeslagen=inwerk-sjabloon-weg#sjablonen");
}

/* ---------- stappen van een sjabloon ---------- */

/** Achteraan in zijn fase: de hoogste volgorde plus één. */
async function volgendeSort(sb: Awaited<ReturnType<typeof requirePerm>>["sb"], sjabloon: string, fase: number) {
  const { data } = await sb.from("inwerk_stappen").select("sort").eq("sjabloon_id", sjabloon).eq("fase", fase).order("sort", { ascending: false }).limit(1);
  return ((data as { sort: number }[] | null)?.[0]?.sort ?? 0) + 1;
}

export async function inwerkStapToevoegen(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const sjabloon = String(formData.get("sjabloon_id") || "");
  if (!UUID.test(sjabloon)) redirect("/admin/inwerken?fout=opslaan");
  const stap = leesStap(formData);
  if ("fout" in stap) redirect(naarSjabloon(sjabloon, `fout=${stap.fout}`, Number(formData.get("fase")) || undefined));
  const { error } = await sb.from("inwerk_stappen").insert({ sjabloon_id: sjabloon, ...stap, sort: await volgendeSort(sb, sjabloon, stap.fase) });
  if (error) redirect(naarSjabloon(sjabloon, `fout=${foutSleutel(error)}`, stap.fase));
  ververs();
  redirect(naarSjabloon(sjabloon, "opgeslagen=inwerk-stap", stap.fase));
}

export async function inwerkStapBewerken(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  const sjabloon = String(formData.get("sjabloon_id") || "");
  if (!UUID.test(id) || !UUID.test(sjabloon)) redirect("/admin/inwerken?fout=opslaan");
  const stap = leesStap(formData);
  if ("fout" in stap) redirect(naarSjabloon(sjabloon, `fout=${stap.fout}`));
  const { data: oud } = await sb.from("inwerk_stappen").select("fase").eq("id", id).maybeSingle();
  // Naar een andere fase: achteraan in die fase.
  const extra = oud && (oud as { fase: number }).fase !== stap.fase ? { sort: await volgendeSort(sb, sjabloon, stap.fase) } : {};
  const { error } = await sb.from("inwerk_stappen").update({ ...stap, ...extra }).eq("id", id);
  if (error) redirect(naarSjabloon(sjabloon, `fout=${foutSleutel(error)}`, stap.fase));
  ververs();
  redirect(naarSjabloon(sjabloon, "opgeslagen=inwerk-stap-bewaard", stap.fase));
}

export async function inwerkStapVerwijderen(id: string, sjabloon: string, fase: number) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id) || !UUID.test(sjabloon)) redirect("/admin/inwerken?fout=opslaan");
  const { error } = await sb.from("inwerk_stappen").delete().eq("id", id);
  if (error) redirect(naarSjabloon(sjabloon, `fout=${foutSleutel(error)}`, fase));
  ververs();
  redirect(naarSjabloon(sjabloon, "opgeslagen=inwerk-stap-weg", fase));
}

/** Een plek omhoog (-1) of omlaag (1) binnen zijn fase. */
export async function inwerkStapVerplaatsen(id: string, sjabloon: string, fase: number, richting: number) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id) || !UUID.test(sjabloon)) redirect("/admin/inwerken?fout=opslaan");
  const { data } = await sb.from("inwerk_stappen").select("id, sort, created_at").eq("sjabloon_id", sjabloon).eq("fase", fase);
  const lijst = ((data as { id: string; sort: number; created_at: string }[] | null) || [])
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
  const i = lijst.findIndex((s) => s.id === id);
  const j = i + (richting < 0 ? -1 : 1);
  if (i >= 0 && j >= 0 && j < lijst.length) {
    [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
    // Opnieuw nummeren: alleen wat verschuift wordt bijgewerkt.
    const wijzigingen = lijst.map((s, n) => ({ ...s, nieuw: n + 1 })).filter((s) => s.sort !== s.nieuw);
    for (const s of wijzigingen) {
      const { error } = await sb.from("inwerk_stappen").update({ sort: s.nieuw }).eq("id", s.id);
      if (error) redirect(naarSjabloon(sjabloon, `fout=${foutSleutel(error)}`, fase));
    }
    ververs();
  }
  redirect(naarSjabloon(sjabloon, "verplaatst=1", fase));
}

/* ---------- reizen ---------- */

function leesReis(formData: FormData) {
  const startdatum = String(formData.get("startdatum") || "");
  const buddy = String(formData.get("buddy") || "").trim();
  return { startdatum, buddy: buddy || null, goed: DATUM.test(startdatum) && buddy.length <= 120 };
}

export async function inwerkreisStarten(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const userId = String(formData.get("user_id") || "");
  const sjabloon = String(formData.get("sjabloon_id") || "");
  const { startdatum, buddy, goed } = leesReis(formData);
  if (!UUID.test(userId) || !UUID.test(sjabloon) || !goed) redirect("/admin/inwerken?fout=inwerk-reis#starten");
  const { data, error } = await sb.from("inwerkreizen").insert({ user_id: userId, sjabloon_id: sjabloon, startdatum, buddy }).select("id").single();
  if (error) redirect(`/admin/inwerken?fout=${error.code === "23505" ? "inwerk-al-reis" : foutSleutel(error)}#starten`);
  ververs();
  redirect(naarReis((data as { id: string }).id, "opgeslagen=inwerkreis"));
}

export async function inwerkreisBijwerken(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  const { startdatum, buddy, goed } = leesReis(formData);
  if (!UUID.test(id)) redirect("/admin/inwerken?fout=opslaan");
  if (!goed) redirect(naarReis(id, "fout=inwerk-reis"));
  const { error } = await sb.from("inwerkreizen").update({ startdatum, buddy }).eq("id", id);
  if (error) redirect(naarReis(id, `fout=${foutSleutel(error)}`));
  ververs();
  redirect(naarReis(id, "opgeslagen=inwerkreis-bewaard"));
}

export async function inwerkreisAfronden(id: string, af: boolean) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect("/admin/inwerken?fout=opslaan");
  const { error } = await sb.from("inwerkreizen").update({ afgerond_at: af ? new Date().toISOString() : null }).eq("id", id);
  if (error) redirect(naarReis(id, `fout=${foutSleutel(error)}`));
  ververs();
  redirect(naarReis(id, `opgeslagen=${af ? "inwerkreis-af" : "inwerkreis-heropend"}`));
}

export async function inwerkreisVerwijderen(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) redirect("/admin/inwerken?fout=opslaan");
  const { error } = await sb.from("inwerkreizen").delete().eq("id", id);
  if (error) redirect(naarReis(id, `fout=${foutSleutel(error)}`));
  ververs();
  redirect("/admin/inwerken?opgeslagen=inwerkreis-weg");
}

/* ---------- afvinken ---------- */

export type ZetUitkomst = { ok: true } | { ok: false; fout: string };

/**
 * Een stap gedaan of weer open. Voor de collega zelf en voor het beheer; de
 * policies beslissen wie wat mag (een mijlpaal alleen het beheer). Geeft een
 * uitkomst terug in plaats van te redirecten: het vinkje werkt zonder dat de
 * pagina verspringt.
 */
export async function inwerkStapZetten(reisId: string, stapId: string, gedaan: boolean): Promise<ZetUitkomst> {
  const { sb } = await requireAdmin();
  if (!UUID.test(reisId) || !UUID.test(stapId)) return { ok: false, fout: "Dat lukte niet." };
  if (gedaan) {
    const { error } = await sb.from("inwerk_voortgang").insert({ reis_id: reisId, stap_id: stapId });
    // Al afgevinkt (in een ander tabblad) is ook goed.
    if (error && error.code !== "23505") {
      return { ok: false, fout: /row-level security|policy/i.test(error.message) ? "Een mijlpaal tekent het beheer af." : "Afvinken lukte niet. Probeer het nog eens." };
    }
  } else {
    const { data, error } = await sb.from("inwerk_voortgang").delete().eq("reis_id", reisId).eq("stap_id", stapId).select("stap_id");
    if (error) return { ok: false, fout: "Terugzetten lukte niet. Probeer het nog eens." };
    if (!data?.length) {
      // Niets verwijderd: stond hij al open, of mocht het niet (een mijlpaal)?
      const { data: staat } = await sb.from("inwerk_voortgang").select("stap_id").eq("reis_id", reisId).eq("stap_id", stapId).maybeSingle();
      if (staat) return { ok: false, fout: "Een mijlpaal zet het beheer terug." };
    }
  }
  ververs();
  return { ok: true };
}

/* ---------- kiezen en aan of uit (0051) ---------- */

/**
 * Onder Gebruikers het inwerktraject van een collega kiezen. Zonder reis start
 * dit er een, met vandaag als eerste werkdag (aan te passen onder Inwerken);
 * met een reis wisselt het de functie. Wat al gedaan is, blijft bewaard.
 */
export async function inwerkreisKiezen(userId: string, formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const sjabloon = String(formData.get("sjabloon_id") || "");
  if (!UUID.test(userId) || !UUID.test(sjabloon)) return;
  const terug = (q: string) => `/admin/gebruikers?${q}#gebruiker-${userId}`;
  const { data: bestaand, error: e1 } = await sb.from("inwerkreizen").select("id").eq("user_id", userId).maybeSingle();
  if (e1) redirect(terug(`fout=${foutSleutel(e1)}`));
  const { error } = bestaand
    ? await sb.from("inwerkreizen").update({ sjabloon_id: sjabloon }).eq("id", (bestaand as { id: string }).id)
    : await sb.from("inwerkreizen").insert({ user_id: userId, sjabloon_id: sjabloon, startdatum: datumOver(0), aan: true });
  if (error) redirect(terug(`fout=${foutSleutel(error)}`));
  ververs();
  redirect(terug(`opgeslagen=${bestaand ? "inwerkreis-functie" : "inwerkreis-gekozen"}`));
}

/** De schakelaar: aan, of uit (de collega ziet de reis niet en vinkt niets af; alles blijft bewaard). */
export async function inwerkreisAanUit(reisId: string, aan: boolean): Promise<ZetUitkomst> {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(reisId)) return { ok: false, fout: "Dat lukte niet." };
  const { data, error } = await sb.from("inwerkreizen").update({ aan }).eq("id", reisId).select("id");
  if (error || !data?.length) return { ok: false, fout: "Aan of uit zetten lukte niet. Probeer het nog eens." };
  ververs();
  return { ok: true };
}
