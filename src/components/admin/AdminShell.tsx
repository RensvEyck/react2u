"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuLayoutDashboard, LuFileText, LuBriefcase, LuUsers, LuInbox, LuImage,
  LuSettings, LuUserRound, LuExternalLink, LuMenu, LuX, LuLogOut, LuMessageSquare,
} from "react-icons/lu";
import type { IconType } from "react-icons";

type Counts = { apps: number; msgs: number; inbox: number };

const NAV: { label: string; href: string; icon: IconType; badge?: keyof Counts }[] = [
  { label: "Dashboard", href: "/admin", icon: LuLayoutDashboard },
  { label: "Postvak IN", href: "/admin/postvak-in", icon: LuInbox, badge: "inbox" },
  { label: "Pagina's", href: "/admin/paginas", icon: LuFileText },
  { label: "Vacatures", href: "/admin/vacatures", icon: LuBriefcase },
  { label: "Sollicitaties", href: "/admin/sollicitaties", icon: LuUsers, badge: "apps" },
  { label: "Berichten", href: "/admin/berichten", icon: LuMessageSquare, badge: "msgs" },
  { label: "Media", href: "/admin/media", icon: LuImage },
  { label: "Instellingen", href: "/admin/instellingen", icon: LuSettings },
  { label: "Account", href: "/admin/account", icon: LuUserRound },
];

const CRUMBS: Record<string, string> = {
  admin: "Dashboard", "postvak-in": "Postvak IN", paginas: "Pagina's", vacatures: "Vacatures",
  sollicitaties: "Sollicitaties", berichten: "Berichten", media: "Media",
  instellingen: "Instellingen", account: "Account", nieuw: "Nieuw", blok: "Blok",
};

export default function AdminShell({
  email, counts, signOut, children,
}: {
  email: string;
  counts: Counts;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const crumbs = pathname.split("/").filter(Boolean);
  const crumbLabels = crumbs.map((c) => CRUMBS[c] || decodeURIComponent(c));

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        const badge = n.badge ? counts[n.badge] : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-medium transition-colors ${
              active ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <n.icon className={`text-[17px] ${active ? "text-[#ff8ab5]" : "text-white/50 group-hover:text-white/80"}`} />
            <span className="flex-1">{n.label}</span>
            {badge > 0 && (
              <span className="rounded-full bg-[#e75387] px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="border-b border-white/10 px-6 py-5">
        <p className="font-heading text-[19px] font-bold text-white">React2u</p>
        <p className="text-[12.5px] font-medium tracking-wide text-white/45">SYSTEEMBEHEER</p>
      </div>
      {nav}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e75387] text-[14px] font-bold text-white">
            {(email[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white/85">{email}</p>
            <form action={signOut}>
              <button className="flex items-center gap-1.5 text-[12.5px] text-white/50 hover:text-white">
                <LuLogOut className="text-[12px]" /> Uitloggen
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f9]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-gradient-to-b from-[#232052] to-[#312e82] lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-gradient-to-b from-[#232052] to-[#312e82]">
            <button className="absolute right-3 top-4 p-2 text-white/70" onClick={() => setOpen(false)} aria-label="Sluiten">
              <LuX />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
          <div className="flex h-[58px] items-center gap-4 px-5 lg:px-8">
            <button className="rounded-lg p-2 text-[#312e82] hover:bg-black/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
              <LuMenu className="text-xl" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[14px]">
              {crumbLabels.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-2">
                  {i > 0 && <span className="text-black/25">/</span>}
                  <span className={`truncate ${i === crumbLabels.length - 1 ? "font-semibold text-[#312e82]" : "text-black/45"}`}>{c}</span>
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a href="/" target="_blank" className="abtn-ghost !py-2 text-[13.5px]">
                Bekijk website <LuExternalLink className="text-[13px]" />
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1160px] px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
