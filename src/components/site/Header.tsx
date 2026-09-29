"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, PIJLERS, HEADER_CTA, dienstVoor, type NavItem } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMail, LuMenu, LuX, LuChevronDown } from "react-icons/lu";
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
 * Header: een topbalk met telefoon en e-mail (zoals op de oude site) en
 * daaronder de balk met menu, die bij het scrollen blijft staan. De hoogte van
 * die balk moet kloppen met `--hh` in globals.css.
 */
export default function Header({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLElement>(null);
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
    const onScroll = () => setScrolled(window.scrollY > 40);
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

  // Het dienstenmenu staat in de HTML direct achter zijn knop, zodat je met
  // Tab na "Diensten" meteen bij de diensten komt. Visueel hangt het onder de
  // hele balk: het item zelf is niet `relative`, de header wel.
  const megaPanel = megaItem && open === megaItem.label && (
    <div
      id={panelId(megaItem.label)}
      className="menu-panel absolute inset-x-0 top-full hidden border-b border-black/[0.06] bg-white shadow-[0_30px_50px_-30px_rgba(34,32,90,0.35)] lg:block"
      onClick={closeOnLink}
    >
      <div className="container-site grid grid-cols-3 gap-10 py-10">
        {PIJLERS.map((p, i) => (
          <div key={p.key} style={kleurVars(p.kleur)}>
            <p className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--k-zacht)] text-[18px] text-[var(--k)]">
                <Icon name={p.icon} />
              </span>
              <span>
                <span className="block text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--k)]">{i + 1} · {p.stap}</span>
                <span className="block font-heading text-[18px] font-bold text-primary">{p.title}</span>
              </span>
            </p>
            <ul className="space-y-1">
              {p.diensten.map((d) => (
                <li key={d.href} style={kleurVars(d.kleur)}>
                  <Link href={d.href} aria-current={current(d.href)}
                    className="group -mx-3 block rounded-2xl px-3 py-3 transition-colors hover:bg-[var(--k-zacht)] aria-[current=page]:bg-[var(--k-zacht)]">
                    <span className="block text-[14px] text-body">{d.situatie}</span>
                    <span className="mt-0.5 flex items-center gap-2 font-semibold text-primary">
                      {d.label}
                      <Arrow className="shrink-0 text-[var(--k)] transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-black/[0.06] bg-soft/70">
        <div className="container-site flex items-center justify-between py-4">
          <p className="flex items-center gap-2 text-[15px] text-primary">
            Liever meteen iemand spreken?
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-accent">
              <LuPhone className="text-[14px]" aria-hidden /> {contact.phoneDisplay}
            </a>
          </p>
          <Link href={megaItem.href} className="link-arrow text-[15px]">
            Alle diensten <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbalk, zoals op de oude site: bellen en mailen staan altijd in beeld.
          Een <aside>, zodat hij als eigen gebied herkenbaar is voor
          schermlezers; de overslaglink staat erin als allereerste element. */}
      <aside aria-label="Contactgegevens" className="on-dark bg-primary text-[14px] text-white/85">
        <a href="#inhoud"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-primary">
          Naar de inhoud
        </a>
        <div className="container-site flex h-10 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-white">
              <LuPhone className="text-[13px]" aria-hidden /> {contact.phoneDisplay}
            </a>
            <a href={`mailto:${contact.email}`} className="hidden items-center gap-2 hover:text-white sm:flex">
              <LuMail className="text-[13px]" aria-hidden /> {contact.email}
            </a>
          </div>
          <p className="hidden md:block">Jouw mensen, onze aandacht!</p>
        </div>
      </aside>

      <header
        ref={barRef}
        className={`sticky top-0 z-50 border-b bg-white/95 backdrop-blur-xl transition-[box-shadow,border-color] duration-300 ${
          scrolled || open || mobile ? "border-transparent shadow-[0_10px_30px_-18px_rgba(34,32,90,0.35)]" : "border-black/[0.06]"
        }`}
      >
        <div className="container-site flex h-[72px] items-center justify-between gap-6 lg:h-[84px]">
          <Link href="/" className="shrink-0" onClick={closeAll} aria-label="React2u, naar de homepage">
            <Logo title="" className="h-[44px] w-auto lg:h-[50px]" />
          </Link>

          {/* Desktop */}
          <nav aria-label="Hoofdmenu" className="hidden h-full items-stretch gap-1 lg:flex">
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
            <Link href={HEADER_CTA.href} className="btn btn-sm hidden whitespace-nowrap sm:inline-flex" onClick={closeAll}>
              {HEADER_CTA.label} <Arrow />
            </Link>
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

        {/* Mobiel: klapt uit onder de balk */}
        {mobile && (
          <div id={`${ids}-mobiel`} className="menu-panel max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-black/[0.06] bg-white lg:hidden"
               onClick={closeOnLink}>
            <nav aria-label="Hoofdmenu mobiel" className="container-site flex flex-col pb-6 pt-2">
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
                              <p className="mb-1 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--k)]">{p.stap} · {p.title}</p>
                              {p.diensten.map((d) => (
                                <Link key={d.href} href={d.href} style={kleurVars(d.kleur)} aria-current={current(d.href)}
                                  className="flex items-center gap-2.5 py-2 text-[16.5px] text-primary aria-[current=page]:font-semibold">
                                  <span className="h-2 w-2 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                                  {d.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                          <Link href={item.href} className="link-arrow pt-1 text-[15.5px]">Alle diensten <Arrow /></Link>
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
                {HEADER_CTA.label} <Arrow />
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
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
  /** Het dienstenmenu, al opgebouwd door Header; komt direct achter de knop. */
  panel?: React.ReactNode;
}) {
  // Het actieve item krijgt een streep onderaan de balk, in de accentkleur.
  const base = `relative flex h-full items-center gap-1.5 px-3.5 text-[16px] font-medium transition-colors hover:text-accent ${
    active ? "text-accent" : "text-primary"
  }`;
  const marker = active && (
    <span className="absolute inset-x-3.5 bottom-0 h-[3px] rounded-t-full bg-accent" aria-hidden />
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
    // Het dienstenmenu hangt aan de header, niet aan dit item; alleen de gewone
    // uitklapmenu's staan hier relatief onder hun knop.
    <div className={`flex h-full ${item.mega ? "" : "relative"}`} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className={`${base} ${isOpen ? "text-accent" : ""}`}
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
        <div id={panelId} onClick={onNavigate} className="menu-panel absolute left-0 top-full min-w-[250px] pt-2">
          <div className="rounded-[18px] border border-black/[0.06] bg-white p-2 shadow-[0_24px_48px_-24px_rgba(34,32,90,0.4)]">
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
