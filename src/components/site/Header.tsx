"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAV, PIJLERS, HEADER_CTA, STARTPAGINA, dienstVoor, doelgroepVoorPad, type Doelgroep, type NavItem,
} from "@/lib/nav";
import { bewaarDoelgroep, useBewaardeDoelgroep } from "@/lib/doelgroep";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMail, LuMenu, LuX, LuChevronDown } from "react-icons/lu";
import Logo from "./Logo";
import { Arrow } from "./Arrow";

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
 * Header: een topbalk met de keuze werkgever/werknemer en telefoon en e-mail,
 * daaronder de balk met het menu van die doelgroep, die bij het scrollen
 * blijft staan. De hoogte van die balk moet kloppen met `--hh` in globals.css.
 */
export default function Header({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const ids = useId();
  const path = usePathname() || "/";

  // Welke doelgroep? Het pad beslist (/werknemers, een dienstpagina …); op een
  // gedeelde pagina de laatste keuze, en anders werkgever. Op het startscherm
  // is er nog niets gekozen.
  const vast = doelgroepVoorPad(path);
  const bewaard = useBewaardeDoelgroep();
  const doelgroep: Doelgroep | null = vast ?? (path === "/" ? null : bewaard ?? "werkgever");
  const nav = NAV[doelgroep ?? "algemeen"];
  const cta = HEADER_CTA[doelgroep ?? "algemeen"];
  useEffect(() => {
    if (vast) bewaarDoelgroep(vast);
  }, [vast]);

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

  const megaItem = nav.find((i) => i.mega);
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
      className="menu-panel absolute inset-x-0 top-full hidden border-b border-line bg-white shadow-[0_24px_40px_-32px_rgba(34,32,90,0.35)] lg:block"
      onClick={closeOnLink}
    >
      <div className="container-site grid grid-cols-3 gap-8 py-9">
        {PIJLERS.map((p, i) => (
          <div key={p.key}>
            <p className="mb-3 border-b border-line pb-3">
              <span className="eyebrow block">Stap {i + 1} · {p.stap}</span>
              <span className="block font-heading text-[18px] font-bold text-primary">{p.title}</span>
            </p>
            <ul>
              {p.diensten.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} aria-current={current(d.href)}
                    className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-soft aria-[current=page]:bg-soft">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-primary">{d.label}</span>
                      <span className="block text-[14px] leading-snug text-body">{d.situatie}</span>
                    </span>
                    <Arrow className="shrink-0 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-soft">
        <div className="container-site flex items-center justify-between py-3.5">
          <p className="flex items-center gap-2 text-[15px] text-primary">
            Liever meteen iemand spreken?
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
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
      {/* Topbalk: de keuze werkgever/werknemer als tabbladen, zoals de grote
          arbodiensten dat doen; rechts bellen en mailen. Een <aside>, zodat
          hij een eigen gebied is voor schermlezers; de overslaglink staat erin
          als allereerste element. */}
      <aside aria-label="Doelgroep en contact" className="border-b border-line bg-soft text-[14px]">
        <a href="#inhoud"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-5 focus:py-3 focus:text-white">
          Naar de inhoud
        </a>
        <div className="container-site flex h-10 items-stretch justify-between gap-4">
          <nav aria-label="Kies je route" className="flex items-stretch gap-6">
            {(["werkgever", "werknemer"] as const).map((g) => {
              const actief = doelgroep === g;
              return (
                <Link key={g} href={STARTPAGINA[g].href} aria-current={actief ? "true" : undefined}
                  className={`relative flex items-center font-semibold transition-colors ${
                    actief ? "text-primary" : "text-body hover:text-primary"
                  }`}>
                  {STARTPAGINA[g].label}
                  {actief && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-6 text-primary">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 underline-offset-4 hover:underline">
              <LuPhone className="text-[13px]" aria-hidden /> <span className="hidden sm:inline">{contact.phoneDisplay}</span>
              <span className="sr-only sm:hidden">Bel ons: {contact.phoneDisplay}</span>
            </a>
            <a href={`mailto:${contact.email}`} className="hidden items-center gap-2 underline-offset-4 hover:underline md:flex">
              <LuMail className="text-[13px]" aria-hidden /> {contact.email}
            </a>
          </div>
        </div>
      </aside>

      <header
        ref={barRef}
        className={`sticky top-0 z-50 border-b border-line bg-white transition-shadow duration-300 ${
          scrolled || open || mobile ? "shadow-[0_8px_24px_-20px_rgba(34,32,90,0.35)]" : ""
        }`}
      >
        <div className="container-site flex h-[72px] items-center justify-between gap-6 lg:h-[84px]">
          <Link href="/" className="shrink-0" onClick={closeAll} aria-label="React2u, naar de homepage">
            <Logo title="" className="h-[42px] w-auto lg:h-[46px]" />
          </Link>

          {/* Desktop */}
          <nav aria-label="Hoofdmenu" className="hidden h-full items-stretch gap-1 lg:flex">
            {nav.map((item) => (
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
            <Link href={cta.href} className="btn btn-sm hidden whitespace-nowrap sm:inline-flex" onClick={closeAll}>
              {cta.label} <Arrow />
            </Link>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-lg text-[22px] text-primary transition-colors hover:bg-soft lg:hidden"
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
          <div id={`${ids}-mobiel`} className="menu-panel max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-white lg:hidden"
               onClick={closeOnLink}>
            <nav aria-label="Hoofdmenu mobiel" className="container-site flex flex-col pb-6 pt-2">
              {nav.map((item) =>
                item.mega || item.children ? (
                  <details key={item.label} className="group border-b border-line" open={!!item.mega}>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[18px] font-semibold text-primary [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <LuChevronDown className="text-[18px] opacity-60 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="pb-4">
                      {item.mega ? (
                        <div className="space-y-4">
                          {PIJLERS.map((p) => (
                            <div key={p.key}>
                              <p className="eyebrow mb-1">{p.stap} · {p.title}</p>
                              {p.diensten.map((d) => (
                                <Link key={d.href} href={d.href} aria-current={current(d.href)}
                                  className="block py-2 text-[16.5px] text-primary aria-[current=page]:font-semibold">
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
                    className="border-b border-line py-3.5 text-[18px] font-semibold text-primary">
                    {item.label}
                  </Link>
                )
              )}
              <Link href={cta.href} className="btn mt-5">
                {cta.label} <Arrow />
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
  // Het actieve item krijgt een streep onderaan de balk.
  const base = "relative flex h-full items-center gap-1.5 px-3.5 text-[16px] font-medium text-primary transition-colors hover:text-primary-deep";
  const marker = active && (
    <span className="absolute inset-x-3.5 bottom-0 h-[2px] bg-primary" aria-hidden />
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
        <div id={panelId} onClick={onNavigate} className="menu-panel absolute left-0 top-full min-w-[250px] pt-2">
          <div className="rounded-xl border border-line bg-white p-2 shadow-[0_24px_40px_-28px_rgba(34,32,90,0.4)]">
            {item.children.map((c) => (
              <Link key={c.href + c.label} href={c.href} aria-current={path === c.href ? "page" : undefined}
                className="block rounded-lg px-4 py-2.5 text-[16px] text-primary transition-colors hover:bg-soft aria-[current=page]:font-semibold">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
