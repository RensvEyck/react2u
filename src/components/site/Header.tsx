"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MAIN_NAV, PIJLERS, HEADER_CTA, type NavItem } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { FaPhoneAlt, FaEnvelope, FaBars, FaTimes, FaChevronDown } from "react-icons/fa";
import Logo from "./Logo";
import { Arrow } from "./DotCloud";
import Icon from "./Icon";

// Hoe lang een menu openblijft nadat de muis het verlaat. Zonder die marge klapt
// het dicht op weg van de menuknop naar het paneel eronder.
const CLOSE_DELAY_MS = 160;

export default function Header({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const ids = useId();

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openNow = (key: string) => {
    cancelClose();
    setOpen(key);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
  };
  const closeAll = () => {
    cancelClose();
    setOpen(null);
    setMobile(false);
  };

  // Escape sluit, en een klik buiten de header ook — nodig voor wie het menu
  // met toetsenbord of aanraking opent, want daar is geen "muis verlaat".
  useEffect(() => {
    if (!open && !mobile) return;
    const close = () => {
      setOpen(null);
      setMobile(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, mobile]);

  // Een klik op een link in een paneel navigeert; het menu moet dan dicht.
  const closeOnLink = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) closeAll();
  };

  const megaItem = MAIN_NAV.find((i) => i.mega);
  // useId levert iets als ":r1:"; een label als "Over ons" bevat een spatie en
  // mag zo niet in een id.
  const panelId = (label: string) => `${ids}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <>
      {/* Topbalk */}
      <div className="border-b border-black/5 bg-soft">
        <div className="container-site flex items-center justify-between py-2 text-[14.5px]">
          <div className="flex items-center gap-6">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-primary hover:text-accent">
              <FaPhoneAlt className="text-[12px]" aria-hidden /> {contact.phoneDisplay}
            </a>
            <a href={`mailto:${contact.email}`} className="hidden items-center gap-2 text-primary hover:text-accent sm:flex">
              <FaEnvelope className="text-[12px]" aria-hidden /> {contact.email}
            </a>
          </div>
          <span className="hidden text-primary/70 md:block">Jouw mensen, onze aandacht!</span>
        </div>
      </div>

      <header ref={barRef} className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="container-site flex items-center justify-between gap-6 py-3">
          <Link href="/" className="shrink-0" onClick={closeAll}>
            <Logo className="h-[50px] w-auto lg:h-[56px]" />
          </Link>

          {/* Desktop */}
          <nav aria-label="Hoofdmenu" className="hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((item) => (
              <DesktopItem
                key={item.href + item.label}
                item={item}
                isOpen={open === item.label}
                panelId={panelId(item.label)}
                onEnter={() => (item.mega || item.children ? openNow(item.label) : undefined)}
                onLeave={closeSoon}
                onToggle={() => (open === item.label ? closeAll() : openNow(item.label))}
                onNavigate={closeOnLink}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={HEADER_CTA.href} className="btn btn-sm hidden items-center gap-2 whitespace-nowrap sm:inline-flex" onClick={closeAll}>
              {HEADER_CTA.label} <Arrow />
            </Link>
            <a href={`tel:${contact.phone}`} aria-label={`Bel ons: ${contact.phoneDisplay}`}
               className="grid h-11 w-11 place-items-center rounded-full text-primary hover:bg-soft sm:hidden">
              <FaPhoneAlt aria-hidden />
            </a>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full text-2xl text-primary hover:bg-soft lg:hidden"
              onClick={() => setMobile(!mobile)}
              aria-expanded={mobile}
              aria-controls={`${ids}-mobiel`}
              aria-label={mobile ? "Menu sluiten" : "Menu openen"}
            >
              {mobile ? <FaTimes aria-hidden /> : <FaBars aria-hidden />}
            </button>
          </div>
        </div>

        {/* Megamenu: over de volle breedte, onder de balk */}
        {megaItem && open === megaItem.label && (
          <div
            id={panelId(megaItem.label)}
            className="menu-panel absolute inset-x-0 top-full hidden border-b border-black/[0.06] bg-white shadow-[0_24px_48px_-24px_rgba(34,32,90,0.28)] lg:block"
            onMouseEnter={cancelClose}
            onMouseLeave={closeSoon}
            onClick={closeOnLink}
          >
            <div className="container-site grid grid-cols-[1fr_1fr_1fr_300px] gap-8 py-9">
              {PIJLERS.map((p) => (
                <div key={p.key}>
                  <p className="mb-4 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--k)]"
                     style={kleurVars(p.kleur)}>
                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--k-zacht)] text-[15px]">
                      <Icon name={p.icon} />
                    </span>
                    {p.title}
                  </p>
                  <ul className="space-y-1">
                    {p.diensten.map((d) => (
                      <li key={d.href} style={kleurVars(d.kleur)}>
                        <Link href={d.href}
                          className="group -mx-3 block rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--k-zacht)]">
                          <span className="flex items-center gap-2 font-semibold text-primary">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                            {d.label}
                          </span>
                          <span className="mt-0.5 block pl-4 text-[14.5px] leading-snug text-body">{d.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="on-dark rounded-2xl bg-primary p-6 text-white">
                <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-primary-light">Adviesgesprek</p>
                <p className="mb-3 font-heading text-[21px] font-bold leading-tight">
                  Wat kan React2u voor jouw organisatie doen?
                </p>
                <p className="mb-5 text-[15px] leading-snug text-white/75">
                  We denken graag vrijblijvend met je mee.
                </p>
                <Link href={HEADER_CTA.href} className="btn btn-sm inline-flex items-center gap-2">
                  Plan een gesprek <Arrow />
                </Link>
                <a href={`tel:${contact.phone}`} className="mt-4 flex items-center gap-2 text-[15px] text-white/80 hover:text-white">
                  <FaPhoneAlt className="text-[12px]" aria-hidden /> {contact.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="border-t border-black/[0.06] bg-soft/60">
              <div className="container-site py-3.5">
                <Link href={megaItem.href} className="link-arrow text-[15px]">
                  Bekijk alle oplossingen <Arrow />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobiel */}
        {mobile && (
          <div id={`${ids}-mobiel`} className="menu-panel max-h-[calc(100dvh-76px)] overflow-y-auto border-t border-black/5 bg-white lg:hidden"
               onClick={closeOnLink}>
            <nav aria-label="Hoofdmenu" className="container-site flex flex-col py-4">
              {MAIN_NAV.map((item) =>
                item.mega || item.children ? (
                  <details key={item.label} className="group border-b border-black/5" open={!!item.mega}>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-lg font-semibold text-primary [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <FaChevronDown className="text-[12px] opacity-60 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="pb-4">
                      {item.mega ? (
                        <div className="space-y-4">
                          {PIJLERS.map((p) => (
                            <div key={p.key} style={kleurVars(p.kleur)}>
                              <p className="mb-1 text-[12.5px] font-bold uppercase tracking-[0.12em] text-[var(--k)]">{p.title}</p>
                              {p.diensten.map((d) => (
                                <Link key={d.href} href={d.href} style={kleurVars(d.kleur)}
                                  className="flex items-center gap-2.5 py-1.5 text-primary">
                                  <span className="h-2 w-2 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                                  {d.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                          <Link href={item.href} className="link-arrow pt-1 text-[15px]">Alle oplossingen <Arrow /></Link>
                        </div>
                      ) : (
                        item.children!.map((c) => (
                          <Link key={c.href + c.label} href={c.href} className="block py-1.5 text-primary">{c.label}</Link>
                        ))
                      )}
                    </div>
                  </details>
                ) : (
                  <Link key={item.href} href={item.href} className="border-b border-black/5 py-3.5 text-lg font-semibold text-primary">
                    {item.label}
                  </Link>
                )
              )}
              <Link href={HEADER_CTA.href} className="btn mt-6 inline-flex items-center justify-center gap-2">
                {HEADER_CTA.label} aanvragen <Arrow />
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

function DesktopItem({
  item, isOpen, panelId, onEnter, onLeave, onToggle, onNavigate,
}: {
  item: NavItem;
  isOpen: boolean;
  panelId: string;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
  onNavigate: (e: React.MouseEvent) => void;
}) {
  const base = "flex items-center gap-1.5 rounded-full px-3.5 py-2.5 font-medium text-primary transition-colors hover:bg-soft hover:text-accent";

  if (!item.mega && !item.children) {
    return <Link href={item.href} className={base}>{item.label}</Link>;
  }

  return (
    // Het megamenu hangt aan de header, niet aan dit item; alleen de gewone
    // uitklapmenu's staan hier relatief onder hun knop.
    <div className={item.mega ? "" : "relative"} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className={`${base} ${isOpen ? "bg-soft text-accent" : ""}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {item.label}
        <FaChevronDown className={`text-[10px] opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {item.children && isOpen && (
        <div id={panelId} onClick={onNavigate}
             className="menu-panel absolute left-0 top-full min-w-[240px] pt-2">
          <div className="rounded-2xl border border-black/5 bg-white py-2 shadow-[0_18px_40px_-20px_rgba(34,32,90,0.3)]">
            {item.children.map((c) => (
              <Link key={c.href + c.label} href={c.href}
                className="block px-5 py-2.5 text-[16px] text-primary hover:bg-soft hover:text-accent">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
