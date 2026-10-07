import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { ADMIN_PAD_HEADER, terugQuery } from "./terug";
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
 * Het inlogscherm, met waar je was. Na het inloggen ga je daar weer heen in
 * plaats van naar het dashboard (zie lib/terug.ts).
 */
async function naarLogin(extra?: string): Promise<never> {
  const terug = terugQuery((await headers()).get(ADMIN_PAD_HEADER));
  const q = [extra, terug].filter(Boolean).join("&");
  redirect(`/admin/login${q ? `?${q}` : ""}`);
}

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
  if (!user) return naarLogin();

  // Tweestapsverificatie is verplicht: zonder code (aal2) geen beheer. Dit
  // beheer geeft toegang tot sollicitaties, cv's en persoonsgegevens, en het
  // privacyreglement belooft een tweede factor voor wie daarbij kan.
  // - Wel een authenticator, maar in deze sessie alleen het wachtwoord gegeven:
  //   eerst de code. Zonder deze controle sloeg je de codestap over door na het
  //   inloggen rechtstreeks een adminpagina te openen.
  // - Nog geen authenticator: eerst instellen. Tot 7 okt 2026 kon je dat
  //   overslaan door /admin te openen, en hadden drie van de vier beheerders
  //   het niet aan.
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return naarLogin(aal?.nextLevel === "aal2" ? "stap=code" : "stap=instellen");
  }

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
