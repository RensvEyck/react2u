import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { normalizePermissions, type Permission } from "./permissions";

export type CurrentAdmin = {
  userId: string;
  email: string;
  roleId: string;
  roleKey: string;
  roleLabel: string;
  permissions: Permission[];
};

/**
 * Ingelogd én bekend als beheerder. Zonder rij in `admins` geen toegang, ook
 * niet met een geldig auth-account.
 *
 * Haalt meteen de rol op: elk scherm heeft de rechten nodig om te bepalen wat
 * het mag tonen, en zo blijft dat één query.
 */
export async function requireAdmin() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await sb
    .from("admins")
    .select("user_id, email, role_id, roles(id, key, label, permissions)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) redirect("/admin/login?error=geen-toegang");

  // supabase-js typeert een join naar één rij soms als array. Beide vormen
  // afvangen scheelt een cast die bij de volgende typegeneratie omvalt.
  type RoleRow = { id: string; key: string; label: string; permissions: string[] };
  const joined = (data as unknown as { roles?: RoleRow | RoleRow[] }).roles;
  const role = Array.isArray(joined) ? joined[0] : joined;
  const admin: CurrentAdmin = {
    userId: user.id,
    email: (data as { email: string }).email || user.email || "",
    roleId: role?.id || "",
    roleKey: role?.key || "",
    roleLabel: role?.label || "Onbekend",
    permissions: normalizePermissions(role?.permissions),
  };

  return { sb, user, admin };
}

/**
 * Zoals `requireAdmin`, maar eist ook een specifiek recht.
 *
 * Elke pagina die aan een recht hangt roept dit aan. Het menu verbergt
 * onderdelen al, maar iemand die de URL intikt komt daar langs — dit is de
 * poort in de app. De echte grens ligt in de RLS-policies; deze zorgt voor een
 * nette omleiding in plaats van een lege pagina vol foutmeldingen.
 */
export async function requirePerm(perm: Permission) {
  const ctx = await requireAdmin();
  if (!ctx.admin.permissions.includes(perm)) redirect("/admin?fout=geen-rechten");
  return ctx;
}
