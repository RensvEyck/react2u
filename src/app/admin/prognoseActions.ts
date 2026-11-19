"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { EENMALIGE_VORMEN, leesNormen } from "@/lib/prognose";

/**
 * De normen van de prognose (migratie 0049, recht `omzet`): één rij. Een leeg
 * veld betekent "reken het uit" (de norm per fte, de kans) of "telt niet mee"
 * (inrichtingsuren, uren per opdracht). Onzin valt terug op de standaard.
 */
export async function prognoseNormenOpslaan(formData: FormData) {
  const { sb, admin } = await requirePerm("omzet");
  const veld = (k: string) => String(formData.get(k) ?? "").trim();
  const urenPerOpdracht: Record<string, string> = {};
  for (const v of EENMALIGE_VORMEN) urenPerOpdracht[v] = veld(`uren_${v}`);
  const normen = leesNormen({
    werknemersPerFte: veld("werknemersPerFte"),
    urenPerFte: veld("urenPerFte"),
    inrichtingUren: veld("inrichtingUren"),
    inrichtingWeken: veld("inrichtingWeken"),
    wervingsMaanden: veld("wervingsMaanden"),
    kansPijplijn: veld("kansPijplijn"),
    urenPerOpdracht,
  });
  const { error } = await sb.from("prognose_normen").upsert({ id: true, normen, door: admin.email });
  if (error) redirect(`/admin/prognose?fout=${isMissingTable(error) ? "migratie-0049" : "opslaan"}#normen`);
  revalidatePath("/admin/prognose");
  redirect("/admin/prognose?opgeslagen=normen#normen");
}
