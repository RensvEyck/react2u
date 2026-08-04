import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Pagina's", href: "/admin/paginas" },
  { label: "Vacatures", href: "/admin/vacatures" },
  { label: "Sollicitaties", href: "/admin/sollicitaties" },
  { label: "Berichten", href: "/admin/berichten" },
  { label: "Instellingen", href: "/admin/instellingen" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-screen bg-[#f6f5fb]">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-[240px] shrink-0 bg-[#312e82] text-white flex flex-col">
          <div className="px-6 py-6 border-b border-white/10">
            <p className="font-bold text-xl">React2u</p>
            <p className="text-white/60 text-sm">Systeembeheer</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 hover:bg-white/10">
                {n.label}
              </Link>
            ))}
            <a href="/" target="_blank" className="block rounded-lg px-3 py-2.5 text-white/70 hover:bg-white/10">
              Bekijk website ↗
            </a>
          </nav>
          <div className="px-6 py-4 border-t border-white/10 text-sm">
            <p className="truncate text-white/60 mb-2">{user.email}</p>
            <form action={signOutAction}>
              <button className="text-white/80 hover:text-white underline">Uitloggen</button>
            </form>
          </div>
        </aside>
        <main className="flex-1 px-8 py-8 max-w-[1100px]">{children}</main>
      </div>
    </div>
  );
}
