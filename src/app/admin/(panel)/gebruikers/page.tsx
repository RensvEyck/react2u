import { requirePerm } from "@/lib/admin";
import { setUserRole, removeUser, saveRole, deleteRole } from "@/app/admin/actions";
import StatusSelect from "@/components/admin/StatusSelect";
import ConfirmButton from "@/components/admin/ConfirmButton";
import RoleEditor from "@/components/admin/RoleEditor";
import InviteForm, { NewLinkButton } from "@/components/admin/InviteForm";
import { canInvite, supabaseAdmin } from "@/lib/supabase/admin";
import { inviteErrorText } from "@/lib/invite";
import { PERMISSIONS, normalizePermissions, type Permission } from "@/lib/permissions";
import { LuTrash2, LuShieldCheck, LuTriangleAlert, LuCheck, LuMinus } from "react-icons/lu";

type RoleRow = {
  id: string; key: string; label: string; permissions: string[];
  is_system: boolean; sort: number;
};
type AdminRow = {
  user_id: string; email: string; role_id: string;
  invited_at: string | null; created_at: string;
};

type AuthStatus = { confirmed: boolean; lastSignIn: string | null };

/**
 * Wie de uitnodiging al gebruikte en wanneer iemand voor het laatst inlogde.
 *
 * Staat alleen in Supabase Auth, dus dit vraagt de service-sleutel — auth-beheer,
 * precies waar die voor is, en achter `requirePerm("gebruikers")`. Meteen de
 * controle of die sleutel werkt: een verkeerde sleutel (de anon-sleutel, of die
 * van een ander project) valt hier op, niet pas bij de eerste uitnodiging.
 */
async function authStatuses(): Promise<{ byId: Map<string, AuthStatus>; keyProblem: string | null }> {
  const byId = new Map<string, AuthStatus>();
  if (!canInvite()) return { byId, keyProblem: null };
  try {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error("[gebruikers] listUsers: %s %s %s", error.status, error.code, error.message);
      return { byId, keyProblem: inviteErrorText(error) };
    }
    for (const u of data.users) {
      byId.set(u.id, { confirmed: Boolean(u.email_confirmed_at), lastSignIn: u.last_sign_in_at ?? null });
    }
  } catch (err) {
    console.error("[gebruikers] listUsers:", err);
  }
  return { byId, keyProblem: null };
}

function datum(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" })
    .format(new Date(iso));
}

export default async function GebruikersAdmin() {
  const { sb, admin } = await requirePerm("gebruikers");

  const [usersRes, rolesRes, auth] = await Promise.all([
    sb.from("admins").select("user_id, email, role_id, invited_at, created_at").order("created_at"),
    sb.from("roles").select("*").order("sort").order("label"),
    authStatuses(),
  ]);

  const users = (usersRes.data as AdminRow[]) || [];
  const roles = (rolesRes.data as RoleRow[]) || [];
  const roleOptions: [string, string][] = roles.map((r) => [r.id, r.label]);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const inviteReady = canInvite();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Gebruikers</h1>
        <p className="text-[14.5px] text-black/50">
          Nodig collega&apos;s uit en bepaal per rol wat ze mogen.
        </p>
      </div>

      {inviteReady && auth.keyProblem && (
        <div className="acard flex items-start gap-3 border-l-[3px] border-l-[#e0356b] px-6 py-5">
          <LuTriangleAlert className="mt-0.5 shrink-0 text-[16px] text-[#e0356b]" />
          <div className="text-[13.5px] text-black/65">
            <p className="font-semibold text-[#1c1a4e]">Uitnodigen gaat mis</p>
            <p className="mt-0.5">{auth.keyProblem}</p>
          </div>
        </div>
      )}

      {!inviteReady && (
        <div className="acard flex items-start gap-3 border-l-[3px] border-l-[#c77700] px-6 py-5">
          <LuTriangleAlert className="mt-0.5 shrink-0 text-[16px] text-[#c77700]" />
          <div className="text-[13.5px] text-black/65">
            <p className="font-semibold text-[#1c1a4e]">Uitnodigen staat uit</p>
            <p className="mt-0.5">
              Zet <code className="rounded bg-black/[0.05] px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> in
              Vercel (Settings → Environment Variables, alle omgevingen). Zonder die sleutel kan er geen
              account voor iemand anders aangemaakt worden. Rollen wijzigen werkt wél gewoon.
            </p>
          </div>
        </div>
      )}

      <InviteForm roles={roles.map((r) => ({ id: r.id, label: r.label }))} ready={inviteReady} />

      <div className="acard overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
            Wie er toegang heeft <span className="ml-1 text-[13px] font-medium text-black/35">({users.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-black/[0.05]">
          {users.map((u) => {
            const role = roleById.get(u.role_id);
            const isSelf = u.user_id === admin.userId;
            const status = auth.byId.get(u.user_id);
            const openstaand = status ? !status.confirmed : false;
            return (
              <div key={u.user_id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[14px] font-bold text-[#312e82]">
                  {(u.email[0] || "?").toUpperCase()}
                </div>
                {/* Minimale breedte, zodat op een telefoon de knoppen eronder vallen in plaats van de naam te pletten. */}
                <div className="min-w-[180px] flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">
                    {u.email}
                    {isSelf && <span className="ml-2 apill bg-black/[0.05] text-black/50">jij</span>}
                  </p>
                  <p className="text-[12.5px] text-black/40">
                    {role?.is_system && <LuShieldCheck className="mr-1 inline text-[11px]" />}
                    {role?.label || "Rol onbekend"}
                    {openstaand && u.invited_at && ` · uitgenodigd ${datum(u.invited_at)}`}
                    {status && !openstaand && (status.lastSignIn ? ` · laatst ingelogd ${datum(status.lastSignIn)}` : " · nog niet ingelogd")}
                  </p>
                </div>
                {openstaand && (
                  <>
                    <span className="apill bg-[#fff4e5] text-[#c77700]">Uitnodiging openstaand</span>
                    <NewLinkButton email={u.email} roleId={u.role_id} />
                  </>
                )}
                <StatusSelect
                  action={setUserRole.bind(null, u.user_id)}
                  current={u.role_id}
                  options={roleOptions}
                  name="role_id"
                />
                {!isSelf && (
                  <ConfirmButton
                    action={removeUser.bind(null, u.user_id)}
                    message={`Toegang van ${u.email} intrekken? Het account blijft bestaan, alleen de toegang tot dit paneel vervalt.`}
                    className="rounded-lg p-2 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                  >
                    <LuTrash2 className="text-[15px]" />
                  </ConfirmButton>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="acard overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Rollen en rechten</h2>
          <p className="mt-0.5 text-[13px] text-black/45">
            Een vinkje geeft toegang tot dat onderdeel — in het menu én in de database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafafd] text-left">
                <th className="px-6 py-3 font-semibold text-black/45">Onderdeel</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-3 py-3 text-center font-semibold text-[#312e82]">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <td className="px-6 py-2.5">
                    <span className="font-medium text-[#1c1a4e]">{p.label}</span>
                    <span className="ml-2 text-[12px] text-black/35">{p.hint}</span>
                  </td>
                  {roles.map((r) => {
                    const has = normalizePermissions(r.permissions).includes(p.key as Permission);
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center">
                        {has
                          ? <LuCheck className="inline text-[15px] text-[#0e9f8a]" aria-label="wel" />
                          : <LuMinus className="inline text-[15px] text-black/15" aria-label="niet" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 border-t border-black/[0.06] bg-[#fafafd] px-6 py-5">
          {roles.map((r) => (
            <RoleEditor
              key={r.id}
              role={{ id: r.id, label: r.label, permissions: normalizePermissions(r.permissions), isSystem: r.is_system }}
              save={saveRole}
              remove={r.is_system ? undefined : deleteRole.bind(null, r.id)}
            />
          ))}
          <RoleEditor save={saveRole} />
        </div>
      </div>
    </div>
  );
}
