"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuExternalLink, LuMenu, LuX, LuConstruction, LuSearch } from "react-icons/lu";
import { permissionForPath, type Permission } from "@/lib/permissions";
import { ADMIN_NAV, CRUMBS, type Counts } from "@/lib/adminNav";
import CommandPalette from "./CommandPalette";
import AccountMenu, { Avatar, UitlogForm } from "./AccountMenu";

export default function AdminShell({
  email, roleLabel, permissions, counts, maintenance, signOut, children,
}: {
  email: string;
  roleLabel: string;
  permissions: Permission[];
  counts: Counts;
  maintenance: boolean;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [, startSignOut] = useTransition();

  // Onderdelen waar je geen recht op hebt verdwijnen uit het menu. Dit is
  // gemak, geen beveiliging: de pagina's controleren zelf via requirePerm() en
  // de database via has_perm(). Wie de URL intikt komt hier gewoon langs.
  const visible = ADMIN_NAV.filter((n) => {
    if (n.paletteOnly) return false;
    const perm = permissionForPath(n.href);
    return !perm || permissions.includes(perm);
  });

  // Beheerders zien de site ook tijdens onderhoud gewoon. Zonder deze melding
  // valt dus nergens te merken dat bezoekers voor een dichte deur staan.
  const maintenanceContent = (
    <>
      <LuConstruction className="text-[14px]" />
      <span className="hidden sm:inline">Onderhoudsmodus aan</span>
      <span className="sm:hidden">Onderhoud</span>
    </>
  );
  const maintenanceProps = {
    title: "Bezoekers zien de onderhoudspagina. Jij ziet de site omdat je bent ingelogd.",
    className: "apill whitespace-nowrap bg-[#fff4e5] !py-1.5 text-[#c77700]",
  };
  const maintenancePill = permissions.includes("instellingen") ? (
    <Link href="/admin/instellingen#onderhoud" {...maintenanceProps}>{maintenanceContent}</Link>
  ) : (
    <span {...maintenanceProps}>{maintenanceContent}</span>
  );

  // Id's (uuid's) zeggen niemand iets en duwen de rest van de balk weg; die
  // laten we uit het kruimelpad. "Blok" ervoor zegt al waar je bent.
  const crumbs = pathname.split("/").filter((c) => c && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c));
  const crumbLabels = crumbs.map((c) => CRUMBS[c] || decodeURIComponent(c));

  const nav = (
    // Het menu scrolt zelf. Zonder dat viel op een laptopscherm (768 px hoog)
    // of een telefoon de onderkant met Uitloggen buiten beeld, onbereikbaar,
    // want de zijbalk staat vast.
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
      {visible.map((n) => {
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
      <div className="shrink-0 border-b border-white/10 px-6 py-5">
        <p className="font-heading text-[19px] font-bold text-white">React2u</p>
        <p className="text-[12.5px] font-medium tracking-wide text-white/45">SYSTEEMBEHEER</p>
      </div>
      {nav}
      <div className="shrink-0 border-t border-white/10 px-3 pb-3 pt-3">
        <Link
          href="/admin/account"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.07]"
          title="Account en beveiliging"
        >
          <Avatar email={email} className="h-9 w-9 text-[14px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white/85">{email}</span>
            <span className="block truncate text-[11.5px] text-white/40">{roleLabel}</span>
          </span>
        </Link>
        <UitlogForm
          signOut={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-medium text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
        />
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
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-[14px]">
              {crumbLabels.map((c, i) => (
                <span key={i} className={`flex items-center gap-2 ${i === crumbLabels.length - 1 ? "min-w-0" : "hidden shrink-0 md:flex"}`}>
                  {i > 0 && <span className="hidden text-black/25 md:inline">/</span>}
                  <span className={`truncate ${i === crumbLabels.length - 1 ? "font-semibold text-[#312e82]" : "text-black/45"}`}>{c}</span>
                </span>
              ))}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {maintenance && maintenancePill}
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="group flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-2.5 py-2 text-[13.5px] text-black/45 transition hover:border-[#312e82]/40 hover:text-[#312e82] sm:min-w-[180px] sm:px-3"
                aria-label="Zoeken (⌘K)"
              >
                <LuSearch className="text-[15px]" />
                <span className="hidden sm:inline">Zoeken…</span>
                <kbd className="akbd ml-auto hidden sm:inline-flex">⌘K</kbd>
              </button>
              {/* Op een telefoon staat Bekijk website in het accountmenu; daar is de balk te smal voor allebei.
                  De wrapper verbergt hem: .abtn-ghost zet zelf display en wint van `hidden`. */}
              <span className="hidden sm:contents">
                <a href="/" target="_blank" className="abtn-ghost whitespace-nowrap !px-3 !py-2 text-[13.5px] md:!px-4" aria-label="Bekijk website">
                  <span className="hidden md:inline">Bekijk website</span> <LuExternalLink className="text-[13px]" />
                </a>
              </span>
              <AccountMenu email={email} roleLabel={roleLabel} signOut={signOut} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1160px] px-5 py-8 lg:px-8">{children}</main>
      </div>
      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        permissions={permissions}
        onSignOut={() => startSignOut(async () => { await signOut(); })}
      />
    </div>
  );
}
