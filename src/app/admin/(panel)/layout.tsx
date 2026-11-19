import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import Toast from "@/components/admin/Toast";
import { needsCall, today } from "@/lib/leads";
import { normalizeMaintenance } from "@/lib/maintenance";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb, user, admin } = await requireAdmin();
  const can = (p: string) => admin.permissions.includes(p as never);

  // Zonder het bijbehorende recht blokkeert RLS deze query's toch al — dan zou
  // de teller altijd 0 zijn. Ze overslaan scheelt drie query's per paginaladen
  // voor wie het onderdeel niet eens ziet.
  const [apps, msgs, leads, maintenance, inwerkreis] = await Promise.all([
    can("postvak")
      ? sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "nieuw")
      : Promise.resolve({ count: 0 }),
    can("postvak")
      ? sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false)
      : Promise.resolve({ count: 0 }),
    // Bewust de rijen ophalen in plaats van tellen in SQL: welke lead vandaag
    // gebeld moet worden hangt af van status én terugbeldatum, en die regel
    // staat in needsCall(). Zou hier een eigen count-query staan, dan gaat de
    // badge ooit iets anders zeggen dan de bellijst zelf.
    can("bellijst")
      ? sb.from("leads").select("status, follow_up_on")
      : Promise.resolve({ data: [] as Pick<Lead, "status" | "follow_up_on">[] }),
    // Voor iedereen, ook zonder recht op Instellingen: wie de site bekijkt als
    // beheerder ziet hem gewoon, en moet dus hier kunnen zien dat hij dicht is.
    sb.from("site_settings").select("value").eq("key", "maintenance").maybeSingle(),
    // Heeft deze collega een inwerkreis (0050)? Dan staat Inwerkreis in het menu. Vóór de migratie: een fout, en dan niet.
    sb.from("inwerkreizen").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const appCount = apps.count ?? 0;
  const msgCount = msgs.count ?? 0;
  const day = today();
  const leadCount = (((leads as { data?: Pick<Lead, "status" | "follow_up_on">[] }).data) || []).filter(
    (l) => needsCall(l, day)
  ).length;

  return (
    <AdminShell
      email={admin.email || user.email || ""}
      roleLabel={admin.roleLabel}
      permissions={admin.permissions}
      counts={{ apps: appCount, msgs: msgCount, inbox: appCount + msgCount, leads: leadCount }}
      vlaggen={{ inwerkreis: Boolean(inwerkreis.data) }}
      maintenance={normalizeMaintenance(maintenance.data?.value).enabled}
      signOut={signOutAction}
    >
      {children}
      <Suspense>
        <Toast />
      </Suspense>
    </AdminShell>
  );
}
