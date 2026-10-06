"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { ContactInfo } from "@/lib/content";
import type { Doelgroep } from "@/lib/nav";
import Logo from "./Logo";
import { tekstKleur } from "@/lib/kleuren";
import {
  letter, K, useVariant, telefoon, OVER_ONS, TOPLINKS, MENU_NEUTRAAL, MENU, KNOPPEN, PORTALEN, SITE,
  type Link2, type Variant,
} from "./r2uStijl";

/*
 * Header uit het ontwerp (Design-canvas: Main, Werkgevers, Werknemers). Alleen
 * op staging; SiteShell kiest tussen deze en Header.
 *
 * Bovenaan een dunne indigo balk met de tabs Werkgevers | Werknemers en rechts
 * Over ons, Werken bij, Contact en het telefoonnummer. Die balk scrolt weg.
 * Daaronder de witte header die blijft plakken:
 *  - neutraal (startpagina): logo, gecentreerd menu, Kennismaken;
 *  - werkgever/werknemer: logo | doelgroep, eigen menu en eigen knop.
 * Werkgevers krijgen naast Kennismaken een rustige tweede knop "Ziek melden"
 * naar het klantportaal (`ziekmeldenUrl`, instelling); op mobiel staat die
 * bovenaan het menu. Werknemers niet: die melden zich bij hun leidinggevende.
 * De hoogte van de witte header moet kloppen met `--hh` onder `.r2u-kop`.
 */

export const ZIEKMELDEN_LABEL = "Ziek melden";
export const ZIEKMELDEN_TITEL = "Medewerker ziek melden in het klantportaal";

const SLUIT_NA_MS = 160;

export function Telefoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function Mail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function Klok({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

export function Pijl({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rk-pijl">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Slot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Punt({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function isExtern(href: string) {
  return href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
}

export function Go({ href, className, style, children }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  if (isExtern(href)) return <a href={href} className={className} style={style}>{children}</a>;
  return <Link href={href} className={className} style={style}>{children}</Link>;
}

/** Uitklapmenu: opent bij hover, klik, Enter/Spatie; Escape of klik buiten sluit. */
function Uitklap({ label, icoon, items, rechts = false }: {
  label: string; icoon?: React.ReactNode; items: Link2[]; rechts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const knop = useRef<HTMLButtonElement>(null);
  const id = useId();

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const openNu = () => { stop(); setOpen(true); };
  const sluitStraks = () => { stop(); timer.current = setTimeout(() => setOpen(false), SLUIT_NA_MS); };
  useEffect(() => stop, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      knop.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative z-40 flex h-full items-center"
      onMouseEnter={openNu} onMouseLeave={sluitStraks}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button ref={knop} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className={`rk-link flex h-full items-center gap-1.5 font-bold ${icoon ? "px-3" : ""}`}>
        {icoon}{label}<Punt open={open} />
      </button>
      {open && (
        <div id={id} className={`menu-panel absolute top-[calc(100%-12px)] ${items.some((l) => l.sub) ? "w-[300px]" : "w-[240px]"}`} style={rechts ? { right: -16 } : { left: -16 }}
          onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <ul className="flex flex-col rounded-[24px] border bg-white p-2 shadow-[0_24px_48px_-24px_rgba(42,38,119,0.3)]"
            style={{ borderColor: "#EEEDF5" }}>
            {items.map((l) => (
              <li key={l.href + l.label}>
                <Go href={l.href} className="rk-dd-link flex items-start gap-3 rounded-[8px] px-3.5 py-3 text-[15px] font-bold" style={{ color: K.indigo }}>
                  {l.kleur && <span aria-hidden className="mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.kleur }} />}
                  <span className="flex flex-col gap-0.5">
                    {l.label}
                    {l.sub && <span className="text-[13px] font-semibold" style={{ color: K.klein }}>{l.sub}</span>}
                  </span>
                </Go>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Dunne indigo balk: tabs Werkgevers | Werknemers en rechts de vaste links. Scrolt weg. */
function TopBalk({ groep, tel, telHref }: { groep: Doelgroep | null; tel: string; telHref: string }) {
  return (
    <div data-r2u-tabs className={`rk rk-balk relative z-[60] ${letter.className}`} style={{ background: K.indigo }}>
      <div className={`mx-auto flex h-10 max-w-[1440px] items-end justify-between px-1.5 md:h-11 md:px-10 xl:px-[120px] ${groep === "werkgever" ? "rk-krap" : ""}`}>
        <nav aria-label="Kies je doelgroep" className="flex flex-1 gap-1 text-[14px] font-bold md:flex-none">
          {(["werkgever", "werknemer"] as const).map((g) => {
            const actief = g === groep;
            return (
              <Link key={g} href={SITE[g].href} aria-current={actief ? "page" : undefined}
                className={`flex h-10 flex-1 items-center justify-center rounded-t-[8px] md:h-11 md:flex-none md:px-5 ${actief ? "" : "rk-tab"}`}
                style={actief ? { background: "#ffffff", color: K.indigo } : { color: "rgba(255,255,255,0.78)" }}>
                {g === "werkgever" ? "Werkgevers" : "Werknemers"}
              </Link>
            );
          })}
        </nav>
        <div className="hidden h-11 items-center gap-7 text-[13px] font-semibold md:flex">
          {TOPLINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rk-tab" style={{ color: "rgba(255,255,255,0.78)" }}>{l.label}</Link>
          ))}
          <a href={telHref} className="rk-tab flex items-center gap-1.5 font-bold" style={{ color: "#ffffff" }}>
            <Telefoon size={14} /> {tel}
          </a>
        </div>
      </div>
    </div>
  );
}

/** De knop "Ziek melden": outline, in een nieuw tabblad, met uitleg voor schermlezers en als tooltip. */
function ZiekMelden({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={ZIEKMELDEN_TITEL} title={ZIEKMELDEN_TITEL}
      className={`rk-pill inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] bg-white font-bold ${className}`}
      style={{ borderColor: K.lijn, color: K.indigo }}>
      <Plus />{ZIEKMELDEN_LABEL}
    </a>
  );
}

function Plus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function HoofdKnop({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Go href={href} className={`rk-btn rk-roze inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] font-bold ${className}`}>
      {children}
    </Go>
  );
}

// Vanaf welke breedte het volledige menu past. Volledige klassennamen, zodat
// Tailwind ze vindt.
const BREED = {
  neutraal: { toon: "lg:flex", verberg: "lg:hidden", px: 1024 },
  groep: { toon: "xl:flex", verberg: "xl:hidden", px: 1280 },
};

export default function HeaderR2u({ contact, ziekmeldenUrl }: { contact: ContactInfo; ziekmeldenUrl: string }) {
  const variant = useVariant({ bewaar: true });
  const [mobiel, setMobiel] = useState(false);
  const [gescrold, setGescrold] = useState(false);
  const [paneelTop, setPaneelTop] = useState(68);
  const kopRef = useRef<HTMLElement>(null);
  const rijRef = useRef<HTMLDivElement>(null);
  const knopRef = useRef<HTMLButtonElement>(null);
  const ids = useId();
  const tel = telefoon(contact);
  const telHref = `tel:${contact.phone}`;

  const neutraal = variant === "neutraal";
  const groep = neutraal ? null : (variant as Doelgroep);
  const B = neutraal ? BREED.neutraal : BREED.groep;
  // Het werkgeversmenu met Inloggen, Ziek melden en Kennismaken past tussen
  // 1280 en 1440px alleen met kleinere tussenruimte en knoppen (en een iets
  // smallere marge, .rk-krap in globals.css); vanaf 1440 de maten van het ontwerp.
  const krap = groep === "werkgever";

  useEffect(() => {
    const onScroll = () => setGescrold(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Open mobiel menu: pagina erachter staat stil en is onbereikbaar (inert),
  // Escape of een tik buiten de header sluit het en zet de focus terug.
  useEffect(() => {
    if (!mobiel) return;
    setPaneelTop(Math.round(rijRef.current?.getBoundingClientRect().bottom ?? 68));
    const root = document.documentElement;
    const vorige = root.style.overflow;
    root.style.overflow = "hidden";
    const achter = [...document.querySelectorAll<HTMLElement>("#inhoud, footer, [data-r2u-tabs]")];
    achter.forEach((el) => (el.inert = true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobiel(false);
      knopRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (kopRef.current && !kopRef.current.contains(e.target as Node)) setMobiel(false);
    };
    const onResize = () => { if (window.innerWidth >= B.px) setMobiel(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = vorige;
      achter.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [mobiel, B.px]);

  const sluit = () => setMobiel(false);
  const knop = KNOPPEN[variant];
  const knopHref = knop.href === "tel:" ? telHref : knop.href;
  const portalen = PORTALEN[variant];
  const paneelId = `${ids}-menu`;

  return (
    <>
      <a href="#inhoud"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:px-5 focus:py-3 focus:text-white"
        style={{ background: K.indigo }}>
        Naar de inhoud
      </a>

      <TopBalk groep={groep} tel={tel} telHref={telHref} />

      <header ref={kopRef} data-r2u-kop={variant}
        className={`rk ${letter.className} sticky top-0 z-50 border-b bg-white transition-shadow duration-300 ${
          gescrold || mobiel ? "shadow-[0_10px_28px_-22px_rgba(42,38,119,0.45)]" : ""}`}
        style={{ color: K.indigo, borderColor: K.lijn }}>
        <div ref={rijRef}
          className={`relative mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 pl-5 pr-4 md:px-10 lg:h-[88px] xl:px-[120px] ${krap ? "rk-krap" : ""}`}>
          {/* Het logo gaat vanaf elke pagina naar het startscherm (werkgever |
              werknemer); de doelgroep ernaast naar het begin van die eigen site. */}
          {groep ? (
            <div className="flex shrink-0 items-center gap-4">
              <Link href="/" aria-label="React2u, naar de homepage" className="flex shrink-0" onClick={sluit}>
                <Logo title="" className="h-[36px] w-auto lg:h-[44px]" />
              </Link>
              <span aria-hidden className="h-7 w-px" style={{ background: K.lijn }} />
              <Link href={SITE[groep].href} onClick={sluit} aria-label={`React2u voor ${SITE[groep].naam}, naar het begin`}
                className="rk-link text-[15px] font-bold" style={{ color: K.indigo }}>
                {groep === "werkgever" ? "Werkgevers" : "Werknemers"}
              </Link>
            </div>
          ) : (
            <Link href="/" aria-label="React2u, naar de homepage" className="flex shrink-0" onClick={sluit}>
              <Logo title="" className="h-[40px] w-auto lg:h-[48px]" />
            </Link>
          )}

          {/* Menu op een breed scherm. Neutraal staat het precies in het midden. */}
          <nav aria-label={groep ? `Menu ${SITE[groep].naam}` : "Hoofdmenu"}
            className={`hidden h-full items-center text-[15px] font-bold ${B.toon} ${
              neutraal ? "absolute left-1/2 -translate-x-1/2 gap-8" : krap ? "gap-4 min-[1440px]:gap-[26px]" : "gap-[26px]"}`}>
            {neutraal
              ? MENU_NEUTRAAL.map((l) => l.overOns
                ? <Uitklap key={l.label} label={l.label} items={OVER_ONS} />
                : <Link key={l.href} href={l.href} className="rk-link">{l.label}</Link>)
              : MENU[groep!].map((l) => l.items
                ? <Uitklap key={l.label} label={l.label} items={l.items} />
                : <Link key={l.href} href={l.href} className="rk-link whitespace-nowrap">{l.label}</Link>)}
          </nav>

          <div className="flex h-full items-center gap-2 text-[15px] font-bold">
            <div className={`hidden h-full items-center ${krap ? "gap-2 min-[1440px]:gap-3" : "gap-3"} ${B.toon}`}>
              {portalen.length > 0 && <Uitklap label="Inloggen" icoon={<Slot />} items={portalen} rechts />}
              {krap && <ZiekMelden href={ziekmeldenUrl} className="h-11 px-4 text-[14.5px] min-[1440px]:h-12 min-[1440px]:px-5 min-[1440px]:text-[15px]" />}
              <HoofdKnop href={knopHref}
                className={krap ? "h-12 px-5 text-[15px] min-[1440px]:h-14 min-[1440px]:px-7 min-[1440px]:text-[16px]" : "h-14 px-7 text-[16px]"}>
                {knop.label}<Pijl />
              </HoofdKnop>
            </div>
            <a href={telHref} aria-label={`Bel ons: ${tel}`}
              className={`rk-rond grid h-11 w-11 place-items-center rounded-full ${B.verberg}`} style={{ background: K.zacht, color: K.indigo }}>
              <Telefoon />
            </a>
            <button ref={knopRef} type="button" onClick={() => setMobiel((m) => !m)}
              aria-expanded={mobiel} aria-controls={paneelId} aria-label={mobiel ? "Menu sluiten" : "Menu openen"}
              className={`rk-rond grid h-11 w-11 shrink-0 place-items-center rounded-full ${B.verberg}`}
              style={{ background: K.indigo }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                {mobiel ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobiel && (
          <div id={paneelId} onClick={(e) => { if ((e.target as HTMLElement).closest("a")) sluit(); }}
            className={`menu-panel overflow-y-auto overscroll-contain border-t ${B.verberg}`}
            style={{ height: `calc(100dvh - ${paneelTop}px)`, borderColor: K.lijn, background: "#ffffff" }}>
            <MobielPaneel variant={variant} contact={contact} tel={tel} knopHref={knopHref} ziekmeldenUrl={ziekmeldenUrl} />
          </div>
        )}
      </header>
    </>
  );
}

/** Het paneel achter de menuknop: dezelfde links als op een breed scherm, onder elkaar. */
function MobielPaneel({ variant, contact, tel, knopHref, ziekmeldenUrl }: {
  variant: Variant; contact: ContactInfo; tel: string; knopHref: string; ziekmeldenUrl: string;
}) {
  const groep = variant === "neutraal" ? null : variant;
  const links: Link2[] = groep ? MENU[groep] : MENU_NEUTRAAL.filter((l) => !l.overOns);
  const portalen = PORTALEN[variant];
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-7 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
      {/* Voor een klant die snel een ziekmelding wil doen: als eerste, boven het menu. */}
      {groep === "werkgever" && <ZiekMelden href={ziekmeldenUrl} className="h-[52px] text-[16px]" />}
      <nav aria-label="Menu">
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.href} className="border-b" style={{ borderColor: K.lijn }}>
              <Link href={l.href} className="rk-row flex items-center justify-between py-4 text-[19px] font-bold tracking-[-0.3px]">
                {l.label}<span style={{ color: K.magenta }}><Pijl /></span>
              </Link>
              {l.items && (
                <ul className="-mt-1 flex flex-col pb-3">
                  {l.items.map((x) => (
                    <li key={x.href}>
                      <Link href={x.href} className="rk-dd-link flex items-center gap-3 rounded-[10px] px-1 py-2 text-[16px] font-bold">
                        {x.kleur && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.kleur }} />}
                        {x.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-2.5">
        <HoofdKnop href={knopHref} className="h-[52px] justify-center text-[16px]">{KNOPPEN[variant].label}<Pijl /></HoofdKnop>
        {portalen.map((p) => (
          <Go key={p.href} href={p.href} className="rk-pill flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] text-[16px] font-bold"
            style={{ borderColor: K.lijn }}>
            <Slot />{p.label}
          </Go>
        ))}
      </div>

      <div>
        <p className="mb-1 text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: tekstKleur("#00A098") }}>Over React2u</p>
        <ul className="-mx-3.5 flex flex-col">
          {OVER_ONS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rk-dd-link flex rounded-[10px] px-3.5 py-2.5 text-[16px] font-bold">{l.label}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[24px] px-5 py-2 text-white" style={{ background: K.indigo }}>
        {[
          { href: `tel:${contact.phone}`, label: "Bellen", waarde: tel, Ic: Telefoon },
          { href: `mailto:${contact.email}`, label: "Mailen", waarde: contact.email, Ic: Mail },
        ].map(({ href, label, waarde, Ic }, i) => (
          <a key={href} href={href} className={`rk-crow flex items-center gap-4 py-4 ${i ? "border-t-[1.5px]" : ""}`}
            style={{ borderColor: "#423E97", color: "#ffffff" }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: "#3A3690" }}><Ic size={18} /></span>
            <span className="flex grow flex-col gap-0.5">
              <span className="text-[13px] font-semibold" style={{ color: "#B4ADF2" }}>{label}</span>
              <span className="text-[17px] font-bold tracking-[-0.3px]">{waarde}</span>
            </span>
            <span style={{ color: "#B4ADF2" }}><Pijl /></span>
          </a>
        ))}
      </div>
    </div>
  );
}
