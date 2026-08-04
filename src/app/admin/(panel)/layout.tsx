import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import Toast from "@/components/admin/Toast";
import { needsCall, today } from "@/lib/leads";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await requireAdmin();
  const [apps, msgs, leads] = await Promise.all([
    sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "nieuw"),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
    // Bewust de rijen ophalen in plaats van tellen in SQL: welke lead vandaag
    // gebeld moet worden hangt af van status én terugbeldatum, en die regel
    // staat in needsCall(). Zou hier een eigen count-query staan, dan gaat de
    // badge ooit iets anders zeggen dan de bellijst zelf.
    sb.from("leads").select("status, follow_up_on"),
  ]);
  const appCount = apps.count ?? 0;
  const msgCount = msgs.count ?? 0;
  const day = today();
  const leadCount = (((leads.data as Pick<Lead, "status" | "follow_up_on">[]) || [])).filter((l) =>
    needsCall(l, day)
  ).length;

  return (
    <AdminShell
      email={user.email || ""}
      counts={{ apps: appCount, msgs: msgCount, inbox: appCount + msgCount, leads: leadCount }}
      signOut={signOutAction}
    >
      {children}
      <Suspense>
        <Toast />
      </Suspense>
    </AdminShell>
  );
}
