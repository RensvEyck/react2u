import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import Toast from "@/components/admin/Toast";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await requireAdmin();
  const [apps, msgs] = await Promise.all([
    sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "nieuw"),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  const appCount = apps.count ?? 0;
  const msgCount = msgs.count ?? 0;
  return (
    <AdminShell
      email={user.email || ""}
      counts={{ apps: appCount, msgs: msgCount, inbox: appCount + msgCount }}
      signOut={signOutAction}
    >
      {children}
      <Suspense>
        <Toast />
      </Suspense>
    </AdminShell>
  );
}
