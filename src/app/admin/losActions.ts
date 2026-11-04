"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { leesLos } from "@/lib/losseOpdrachten";

/**
 * Losse klanten en opdrachten (migratie 0036): opvoeren, wijzigen en weghalen.
 * Het salesrecht (bellijst) en het recht omzet mogen het allebei, net als de
 * policy in de database.
 */

const UUID = /^[0-9a-f-]{36}$/;
const PAD = "/admin/verkoop/los";

async function magLos() {
  const ctx = await requireAdmin();
  if (!ctx.admin.permissions.includes("bellijst") && !ctx.admin.permissions.includes("omzet")) redirect("/admin?fout=geen-rechten");
  return ctx;
}

function ververs() {
  revalidatePath("/admin/verkoop", "layout");
  revalidatePath("/admin/omzet");
  revalidatePath("/admin");
}

export async function losOpslaan(formData: FormData) {
  const { sb, user } = await magLos();
  const id = String(formData.get("id") || "");
  const anker = UUID.test(id) ? `#los-${id}` : "#nieuw";
  const r = leesLos((naam) => String(formData.get(naam) ?? ""));
  if (!r.ok) redirect(`${PAD}?fout=${r.fout}${anker}`);
  const { error } = UUID.test(id)
    ? await sb.from("losse_opdrachten").update(r.rij).eq("id", id)
    : await sb.from("losse_opdrachten").insert({ ...r.rij, created_by: user.id });
  if (error) redirect(`${PAD}?fout=${isMissingTable(error) ? "migratie-0036" : "opslaan"}${anker}`);
  ververs();
  redirect(`${PAD}?opgeslagen=${UUID.test(id) ? "los" : "los-nieuw"}${anker === "#nieuw" ? "#lijst" : anker}`);
}

export async function losVerwijderen(id: string) {
  const { sb } = await magLos();
  if (!UUID.test(id)) return;
  await sb.from("losse_opdrachten").delete().eq("id", id);
  ververs();
  redirect(`${PAD}?opgeslagen=los-weg#lijst`);
}
