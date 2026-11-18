"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { firstName } from "@/lib/dashboard";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver } from "@/lib/offertes";
import { maandagVan } from "@/lib/uren";
import {
  doelenVan, kwartaalSleutel, kwartaalVanWeek, leesAntwoorden, leesKwartaal, magWijzigen, MAX_DOELEN, signaalMail,
  type Doel, type Schaal,
} from "@/lib/weekevaluatie";

/**
 * De weekevaluatie (migraties 0044 en 0045). Invullen: één rij per collega per
 * week, alleen de eigen rij, alleen deze week of vorige week. Doelen: alleen
 * met het recht omzet, in de kwartaalmeeting. De database controleert
 * hetzelfde (de policies); dit geeft een nette melding.
 */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/;

/** FormData naar naam → waarden, zodat aangevinkte keuzes allemaal meekomen. */
function velden(formData: FormData): Record<string, string[]> {
  const uit: Record<string, string[]> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") (uit[k] ??= []).push(v);
  });
  return uit;
}

export async function weekevaluatieOpslaan(formData: FormData) {
  const { sb, admin } = await requirePerm("weekevaluatie");
  const week = String(formData.get("week") || "");
  const terug = (q: string) => `/admin/weekevaluatie?week=${encodeURIComponent(week)}&${q}`;
  if (!DATUM.test(week) || maandagVan(week) !== week) redirect("/admin/weekevaluatie?fout=weekevaluatie-week");
  if (!magWijzigen(week, datumOver(0))) redirect(terug("fout=weekevaluatie-week"));

  // De doelen van het kwartaal van deze week; vóór 0045 zijn er geen.
  const k = kwartaalVanWeek(week);
  const d = await sb.from("weekevaluatie_doelen").select("id, titel").eq("user_id", admin.userId).eq("jaar", k.jaar).eq("kwartaal", k.kwartaal);
  const doelen = d.error ? [] : ((d.data as Pick<Doel, "id">[] | null) || []);

  const { antwoorden, fouten } = leesAntwoorden(velden(formData), { week, doelen });
  if (fouten.length) redirect(terug("fout=weekevaluatie-schaal"));

  const { error } = await sb
    .from("weekevaluaties")
    .upsert({ user_id: admin.userId, week, antwoorden, door: admin.email }, { onConflict: "user_id,week" });
  if (error) {
    if (isMissingTable(error)) redirect(terug("fout=migratie-0044"));
    // De policy weigert een gesloten week of een rij van iemand anders.
    if (/row-level security|policy/i.test(error.message)) redirect(terug("fout=weekevaluatie-week"));
    console.error("[weekevaluatie] opslaan mislukt: %s", error.message);
    redirect(terug("fout=opslaan"));
  }

  await meldZwareWeken(sb, admin.userId, admin.email, week);
  revalidatePath("/admin/weekevaluatie", "layout");
  revalidatePath("/admin");
  redirect(terug("opgeslagen=weekevaluatie"));
}

/**
 * Twee weken achter elkaar een 4 of lager voor energie of tijd: de database
 * beslist en onthoudt het (weekevaluatie_signaal in 0045), dit mailt wie het
 * overzicht mag zien. Zonder de antwoorden zelf. Een mislukte mail laat het
 * bewaren nooit mislukken.
 */
async function meldZwareWeken(sb: Awaited<ReturnType<typeof requirePerm>>["sb"], userId: string, email: string, week: string) {
  const { data, error } = await sb.rpc("weekevaluatie_signaal", { p_week: week });
  if (error || !Array.isArray(data) || !data.length) return;
  const { data: mw } = await sb.from("medewerkers").select("naam").eq("user_id", userId).maybeSingle();
  const naam = (mw as { naam?: string } | null)?.naam || firstName(email) || email;
  const { sendWeekevaluatieSignaal, siteBasis } = await import("@/lib/mail");
  for (const rij of data as { signaal_week: string; signaal_schalen: string[]; signaal_ontvangers: string[] }[]) {
    const m = signaalMail(naam, rij.signaal_week, rij.signaal_schalen as Schaal[]);
    const link = `${siteBasis()}/admin/weekevaluatie/team?kwartaal=${kwartaalSleutel(kwartaalVanWeek(rij.signaal_week))}#collega-${userId}`;
    for (const aan of rij.signaal_ontvangers || []) {
      const res = await sendWeekevaluatieSignaal({ to: aan, ...m, link });
      if (!res.ok) console.error("[weekevaluatie] signaal aan %s mislukt: %s", aan, res.reden);
    }
  }
}

/* ---------- doelen, in de kwartaalmeeting ---------- */

function terugNaarTeam(kwartaal: string, userId: string, q: string) {
  return `/admin/weekevaluatie/team?kwartaal=${encodeURIComponent(kwartaal)}&${q}#collega-${userId}`;
}

export async function weekevaluatieDoelOpslaan(formData: FormData) {
  const { sb, admin } = await requirePerm("omzet");
  const userId = String(formData.get("user_id") || "");
  const scherm = String(formData.get("scherm") || "");
  const voor = leesKwartaal(String(formData.get("voor") || ""));
  const titel = String(formData.get("titel") || "").trim().slice(0, 160);
  const toelichting = String(formData.get("toelichting") || "").trim().slice(0, 1000) || null;
  if (!UUID.test(userId) || !voor) redirect("/admin/weekevaluatie/team?fout=opslaan");
  if (!titel) redirect(terugNaarTeam(scherm, userId, "fout=doel-titel"));
  const { data: bestaand } = await sb.from("weekevaluatie_doelen").select("id, jaar, kwartaal, sort, titel").eq("user_id", userId).eq("jaar", voor.jaar).eq("kwartaal", voor.kwartaal);
  const lijst = doelenVan(((bestaand as Doel[] | null) || []), voor);
  if (lijst.length >= MAX_DOELEN) redirect(terugNaarTeam(scherm, userId, "fout=doel-max"));
  const { error } = await sb.from("weekevaluatie_doelen").insert({
    user_id: userId, jaar: voor.jaar, kwartaal: voor.kwartaal, titel, toelichting,
    sort: (lijst[lijst.length - 1]?.sort ?? 0) + 1, door: admin.email,
  });
  if (error) redirect(terugNaarTeam(scherm, userId, `fout=${isMissingTable(error) ? "migratie-0045" : /drie doelen/.test(error.message) ? "doel-max" : "opslaan"}`));
  revalidatePath("/admin/weekevaluatie", "layout");
  redirect(terugNaarTeam(scherm, userId, `opgeslagen=doel&voor=${kwartaalSleutel(voor)}`));
}

export async function weekevaluatieDoelVerwijderen(id: string, userId: string, scherm: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id) || !UUID.test(userId)) return;
  await sb.from("weekevaluatie_doelen").delete().eq("id", id);
  revalidatePath("/admin/weekevaluatie", "layout");
  redirect(terugNaarTeam(scherm, userId, "opgeslagen=doel-weg"));
}
