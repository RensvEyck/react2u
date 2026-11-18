"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver } from "@/lib/offertes";
import { maandagVan } from "@/lib/uren";
import { leesAntwoorden, magWijzigen } from "@/lib/weekevaluatie";

/**
 * De weekevaluatie (migratie 0044): één rij per collega per week, alleen de
 * eigen rij, alleen deze week of vorige week. De database controleert
 * hetzelfde (de policies in 0044); dit geeft een nette melding.
 */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export async function weekevaluatieOpslaan(formData: FormData) {
  const { sb, admin } = await requirePerm("weekevaluatie");
  const week = String(formData.get("week") || "");
  const terug = (q: string) => `/admin/weekevaluatie?week=${encodeURIComponent(week)}&${q}`;
  if (!DATUM.test(week) || maandagVan(week) !== week) redirect("/admin/weekevaluatie?fout=weekevaluatie-week");
  if (!magWijzigen(week, datumOver(0))) redirect(terug("fout=weekevaluatie-week"));

  const invoer: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") invoer[k] = v;
  });
  const { antwoorden, fouten } = leesAntwoorden(invoer);
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
  revalidatePath("/admin/weekevaluatie", "layout");
  revalidatePath("/admin");
  redirect(terug("opgeslagen=weekevaluatie"));
}
