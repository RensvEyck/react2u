"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, PIJLERS, HEADER_CTA, dienstVoor, type NavItem } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMenu, LuX, LuChevronDown } from "react-icons/lu";
import Logo from "./Logo";
import { Arrow } from "./DotCloud";
import Icon from "./Icon";

// Hoe lang een menu openblijft nadat de muis het verlaat. Zonder die marge klapt
// het dicht op weg van de menuknop naar het paneel eronder.
const CLOSE_DELAY_MS = 160;

/** Hoort het huidige pad bij dit menu-item? Voor de actieve markering. */
function isActive(item: NavItem, path: string): boolean {
  if (item.mega) return path === item.href || dienstVoor(path) !== null;
  if (item.children) return path === item.href || item.children.some((c) => c.href === path);
  return path === item.href || path.startsWith(`${item.href}/`);
}

/**
 * Zwevende header: een afgeronde balk die met een marge boven de pagina hangt
 * en bij het scrollen blijft staan. Hoogte moet kloppen met `--hh` in
 * globals.css — een hero schuift er precies zoveel onder.
 */
export default function Header({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const ids = useId();
  const path = usePathname() || "/";

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape sluit, en een klik buiten de header ook — nodig voor wie het menu
  // met toetsenbord of aanraking opent, want daar is geen "muis verlaat".
  useEffect(() => {
    if (!open && !mobile) return;
    const close = () => {
      setOpen(null);
      setMobile(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Focus terug naar de knop die het menu opende; anders valt hij na het
      // sluiten terug naar het begin van de pagina.
      const opener = barRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
      close();
      opener?.focus();
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
  // useId levert iets als "«r1»"; een label als "Over ons" bevat een spatie en
  // mag zo niet in een id.
  const panelId = (label: string) => `${ids}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const current = (href: string) => (href === path ? ("page" as const) : undefined);

  // Het megamenu staat in de HTML direct achter zijn knop, zodat je met Tab
  // na "Oplossingen" meteen bij de diensten komt. Visueel hangt het onder de
  // hele balk: het item zelf is niet `relative`, de balk wel.
  const megaPanel = megaItem && open === megaItem.label && (
    <div
      id={panelId(megaItem.label)}
      className="menu-panel absolute inset-x-0 top-full hidden pt-2.5 lg:block"
      onClick={closeOnLink}
    >
      <div className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-[0_30px_60px_-30px_rgba(34,32,90,0.45)]">
        <div className="grid grid-cols-[1fr_1fr_1fr_260px] gap-2 p-3">
          {PIJLERS.map((p) => (
            <div key={p.key} className="p-4">
              <p className="mb-3 flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--k)]"
                 style={kleurVars(p.kleur)}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--k-zacht)] text-[18px]">
                  <Icon name={p.icon} />
                </span>
                {p.title}
              </p>
              <ul className="space-y-0.5">
                {p.diensten.map((d) => (
                  <li key={d.href} style={kleurVars(d.kleur)}>
                    <Link href={d.href} aria-current={current(d.href)}
                      className="group -mx-3 block rounded-2xl px-3 py-3 transition-colors hover:bg-[var(--k-zacht)] aria-[current=page]:bg-[var(--k-zacht)]">
                      <span className="flex items-center justify-between gap-2 font-semibold text-primary">
                        {d.label}
                        <Arrow className="shrink-0 text-[var(--k)] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </span>
                      <span className="mt-1 block text-[14.5px] leading-snug text-body">{d.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="on-dark dot-texture flex flex-col rounded-[20px] bg-primary p-6 text-white">
            <p className="eyebrow mb-3">Adviesgesprek</p>
            <p className="mb-3 font-heading text-[21px] font-bold leading-tight text-white">
              Wat kan React2u voor jouw organisatie doen?
            </p>
            <p className="mb-6 text-[15px] leading-snug text-white/75">
              We denken graag vrijblijvend met je mee.
            </p>
            <div className="mt-auto">
              <Link href={HEADER_CTA.href} className="btn btn-sm">
                Plan een gesprek <Arrow />
              </Link>
              <a href={`tel:${contact.phone}`} className="mt-4 flex items-center gap-2 text-[15px] text-white/80 hover:text-white">
                <LuPhone className="text-[14px]" aria-hidden /> {contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-black/[0.06] bg-soft/70 px-7 py-3.5">
          <p className="text-[14.5px] text-body">Van preventie tot re-integratie: zes diensten, één aanspreekpunt.</p>
          <Link href={megaItem.href} className="link-arrow text-[15px]">
            Alle oplossingen <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-5 lg:pt-4">
      {/* Voor toetsenbordgebruikers: de eerste Tab springt langs het menu. */}
      <a href="#inhoud"
        className="pointer-events-auto sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">
        Naar de inhoud
      </a>
      {/* Een zachte laag over de pagina zolang een menu openstaat: het menu
          komt los van de inhoud eronder, en een klik ernaast sluit het. */}
      {(open === megaItem?.label || mobile) && (
        <div aria-hidden className="menu-panel pointer-events-auto fixed inset-0 -z-10 bg-primary-deep/25 backdrop-blur-[2px]" />
      )}
      <div
        ref={barRef}
        className={`pointer-events-auto relative mx-auto max-w-[1240px] rounded-[22px] border border-black/[0.06] bg-white/90 backdrop-blur-xl transition-shadow duration-300 ${
          scrolled || open || mobile
            ? "shadow-[0_16px_40px_-20px_rgba(34,32,90,0.4)]"
            : "shadow-[0_8px_24px_-18px_rgba(34,32,90,0.3)]"
        }`}
      >
        {/* pl-8 op groot scherm: dan staat het logo precies op de lijn waar
            de inhoud van de pagina begint. */}
        <div className="flex items-center justify-between gap-4 py-2.5 pl-4 pr-2.5 lg:py-3 lg:pl-8 lg:pr-3">
          <Link href="/" className="shrink-0" onClick={closeAll} aria-label="React2u, naar de homepage">
            <Logo title="" className="h-[42px] w-auto lg:h-[46px]" />
          </Link>

          {/* Desktop */}
          <nav aria-label="Hoofdmenu" className="hidden items-center gap-0.5 lg:flex">
            {MAIN_NAV.map((item) => (
              <DesktopItem
                key={item.href + item.label}
                item={item}
                active={isActive(item, path)}
                path={path}
                isOpen={open === item.label}
                panelId={panelId(item.label)}
                onEnter={() => (item.mega || item.children ? openNow(item.label) : undefined)}
                onLeave={closeSoon}
                onToggle={() => (open === item.label ? closeAll() : openNow(item.label))}
                onNavigate={closeOnLink}
                panel={item.mega ? megaPanel : null}
              />
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <a href={`tel:${contact.phone}`}
               className="hidden items-center gap-2 rounded-full px-3 py-2 text-[15px] font-medium text-primary transition-colors hover:bg-soft xl:flex">
              <LuPhone className="text-[15px]" aria-hidden /> {contact.phoneDisplay}
            </a>
            <Link href={HEADER_CTA.href} className="btn btn-sm hidden whitespace-nowrap sm:inline-flex" onClick={closeAll}>
              {HEADER_CTA.label} <Arrow />
            </Link>
            <a href={`tel:${contact.phone}`} aria-label={`Bel ons: ${contact.phoneDisplay}`}
               className="grid h-11 w-11 place-items-center rounded-full text-[19px] text-primary transition-colors hover:bg-soft sm:hidden">
              <LuPhone aria-hidden />
            </a>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full text-[22px] text-primary transition-colors hover:bg-soft lg:hidden"
              onClick={() => setMobile(!mobile)}
              aria-expanded={mobile}
              aria-controls={`${ids}-mobiel`}
              aria-label={mobile ? "Menu sluiten" : "Menu openen"}
            >
              {mobile ? <LuX aria-hidden /> : <LuMenu aria-hidden />}
            </button>
          </div>
        </div>

        {/* Mobiel: klapt uit binnen de balk */}
        {mobile && (
          <div id={`${ids}-mobiel`} className="menu-panel max-h-[calc(100dvh-100px)] overflow-y-auto border-t border-black/[0.06] px-4 pb-5 lg:hidden"
               onClick={closeOnLink}>
            <nav aria-label="Hoofdmenu mobiel" className="flex flex-col pt-2">
              {MAIN_NAV.map((item) =>
                item.mega || item.children ? (
                  <details key={item.label} className="group border-b border-black/[0.06]" open={!!item.mega}>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[18px] font-semibold text-primary [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <LuChevronDown className="text-[18px] opacity-60 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="pb-4">
                      {item.mega ? (
                        <div className="space-y-4">
                          {PIJLERS.map((p) => (
                            <div key={p.key} style={kleurVars(p.kleur)}>
                              <p className="mb-1 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--k)]">{p.title}</p>
                              {p.diensten.map((d) => (
                                <Link key={d.href} href={d.href} style={kleurVars(d.kleur)} aria-current={current(d.href)}
                                  className="flex items-center gap-2.5 py-2 text-[16.5px] text-primary aria-[current=page]:font-semibold">
                                  <span className="h-2 w-2 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                                  {d.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                          <Link href={item.href} className="link-arrow pt-1 text-[15.5px]">Alle oplossingen <Arrow /></Link>
                        </div>
                      ) : (
                        item.children!.map((c) => (
                          <Link key={c.href + c.label} href={c.href} aria-current={current(c.href)}
                            className="block py-2 text-[16.5px] text-primary aria-[current=page]:font-semibold">
                            {c.label}
                          </Link>
                        ))
                      )}
                    </div>
                  </details>
                ) : (
                  <Link key={item.href} href={item.href} aria-current={current(item.href)}
                    className="border-b border-black/[0.06] py-3.5 text-[18px] font-semibold text-primary">
                    {item.label}
                  </Link>
                )
              )}
              <Link href={HEADER_CTA.href} className="btn mt-5">
                {HEADER_CTA.label} aanvragen <Arrow />
              </Link>
              <a href={`tel:${contact.phone}`} className="btn btn-outline mt-3">
                <LuPhone aria-hidden /> {contact.phoneDisplay}
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function DesktopItem({
  item, active, path, isOpen, panelId, onEnter, onLeave, onToggle, onNavigate, panel,
}: {
  item: NavItem;
  active: boolean;
  path: string;
  isOpen: boolean;
  panelId: string;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
  onNavigate: (e: React.MouseEvent) => void;
  /** Het megamenu, al opgebouwd door Header; komt direct achter de knop. */
  panel?: React.ReactNode;
}) {
  const base = `relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[16px] font-medium transition-colors hover:bg-soft ${
    active ? "text-accent" : "text-primary"
  }`;
  // Een stipje onder het actieve item, in de accentkleur.
  const marker = active && (
    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" aria-hidden />
  );

  if (!item.mega && !item.children) {
    return (
      <Link href={item.href} className={base} aria-current={path === item.href ? "page" : undefined}>
        {item.label}
        {marker}
      </Link>
    );
  }

  return (
    // Het megamenu hangt aan de balk, niet aan dit item; alleen de gewone
    // uitklapmenu's staan hier relatief onder hun knop.
    <div className={item.mega ? "" : "relative"} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className={`${base} ${isOpen ? "bg-soft" : ""}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {item.label}
        <LuChevronDown className={`text-[14px] opacity-60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden />
        {marker}
      </button>
      {panel}
      {item.children && isOpen && (
        <div id={panelId} onClick={onNavigate} className="menu-panel absolute left-0 top-full min-w-[250px] pt-3">
          <div className="rounded-[20px] border border-black/[0.06] bg-white p-2 shadow-[0_24px_48px_-24px_rgba(34,32,90,0.4)]">
            {item.children.map((c) => (
              <Link key={c.href + c.label} href={c.href} aria-current={path === c.href ? "page" : undefined}
                className="block rounded-xl px-4 py-2.5 text-[16px] text-primary transition-colors hover:bg-soft aria-[current=page]:font-semibold">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
