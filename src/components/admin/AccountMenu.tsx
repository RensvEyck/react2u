"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { LuChevronDown, LuExternalLink, LuLoaderCircle, LuLogOut, LuShieldCheck } from "react-icons/lu";
import { confirmLeave } from "@/lib/unsaved";

type SignOut = () => Promise<void>;

/**
 * Uitlogknop binnen een `<form action={signOut}>`. Laat zien dat er iets
 * gebeurt: uitloggen gaat langs Supabase en duurt soms een seconde, en een knop
 * die dan niets doet leest als "werkt niet".
 */
function UitlogKnop({ className, role }: { className: string; role?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" role={role} disabled={pending} aria-busy={pending} className={className}>
      {pending ? <LuLoaderCircle className="animate-spin text-[16px]" /> : <LuLogOut className="text-[16px]" />}
      <span>{pending ? "Uitloggen…" : "Uitloggen"}</span>
    </button>
  );
}

/**
 * Formulier met uitlogknop. Vraagt eerst of je weg wilt als er in een editor
 * nog iets niet is opgeslagen: uitloggen is ook weggaan.
 */
export function UitlogForm({ signOut, className, role }: { signOut: SignOut; className: string; role?: string }) {
  return (
    <form action={signOut} onSubmit={(e) => { if (!confirmLeave()) e.preventDefault(); }}>
      <UitlogKnop className={className} role={role} />
    </form>
  );
}

export function Avatar({ email, className = "" }: { email: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#e75387] font-bold text-white ${className}`}
    >
      {(email[0] || "?").toUpperCase()}
    </span>
  );
}

/**
 * Accountmenu rechtsboven: wie je bent, je account, en uitloggen.
 *
 * Uitloggen stond alleen onderaan het zijmenu. Op een laptopscherm viel dat
 * buiten beeld en op een telefoon zat het achter het menu. Hier staat het op
 * elk scherm en elke schermgrootte op dezelfde plek, waar mensen het zoeken.
 */
export default function AccountMenu({ email, roleLabel, signOut }: { email: string; roleLabel: string; signOut: SignOut }) {
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    requestAnimationFrame(() => items()[0]?.focus());

    const buiten = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !knop.current?.contains(t)) setOpen(false);
    };
    const toets = (e: KeyboardEvent) => {
      const lijst = items();
      const i = lijst.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        knop.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const stap = e.key === "ArrowDown" ? 1 : -1;
        lijst[(i + stap + lijst.length) % lijst.length]?.focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        lijst[e.key === "Home" ? 0 : lijst.length - 1]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("pointerdown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[#1c1a4e] outline-none transition-colors hover:bg-[#f1f0fb] focus-visible:bg-[#f1f0fb] disabled:opacity-60";

  return (
    <div className="relative">
      <button
        ref={knop}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Account: ${email}`}
        className={`flex items-center gap-1.5 rounded-full p-0.5 pr-0.5 transition sm:pr-2 ${
          open ? "bg-[#f1f0fb]" : "hover:bg-black/[0.04]"
        }`}
      >
        <Avatar email={email} className="h-[34px] w-[34px] text-[14px]" />
        <LuChevronDown className={`hidden text-[14px] text-black/40 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] origin-top-right animate-[popIn_0.14s_cubic-bezier(0.2,0.9,0.3,1.2)] rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_60px_-18px_rgba(28,26,78,0.45)] motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 px-3 pb-3 pt-2.5">
            <Avatar email={email} className="h-10 w-10 text-[15px]" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#1c1a4e]">{email}</p>
              <p className="truncate text-[12.5px] text-black/45">{roleLabel}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-black/[0.06]" />
          <Link href="/admin/account" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <LuShieldCheck className="text-[16px] text-[#312e82]" /> Account en beveiliging
          </Link>
          <a href="/" target="_blank" rel="noopener" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <LuExternalLink className="text-[16px] text-[#312e82]" /> Bekijk website
          </a>
          <div className="my-1 h-px bg-black/[0.06]" />
          <UitlogForm signOut={signOut} role="menuitem" className={`${item} !text-[#e0356b] hover:!bg-[#fdeef4] focus-visible:!bg-[#fdeef4]`} />
          <p className="px-3 pb-2 pt-0.5 text-[12px] text-black/40">
            Alleen op dit apparaat. Overal uitloggen kan via Account.
          </p>
        </div>
      )}
    </div>
  );
}
