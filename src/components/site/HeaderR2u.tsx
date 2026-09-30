"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { ContactInfo } from "@/lib/content";
import type { Doelgroep } from "@/lib/nav";
import Logo from "./Logo";
import { jakarta, K, useVariant, telefoon, OVER_ONS, MENU, KNOPPEN, SITE, type Variant } from "./r2uStijl";

/*
 * Header uit het nieuwe ontwerp (D-Home, D-Werkgevers, D-Werknemers en hun
 * mobiele versies). Alleen op staging; SiteShell kiest tussen deze en Header.
 *
 * Neutraal (startscherm, of een gedeelde pagina zonder keuze): logo, "Over ons"
 * en een telefoonknop. Werkgever/werknemer: een gekleurde tabbalk met de keuze
 * en daaronder de header met logo, pill-menu en knoppen. Alleen de header
 * zelf plakt; zijn hoogte moet kloppen met `--hh` onder `.r2u-kop` in globals.css.
 */

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
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function Pijl({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rk-pijl">
      <path d="M5 12h14M13 6l6 6-6 6" />
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

/** Het uitklapmenu "Over ons": opent bij hover, klik, Enter/Spatie; Escape sluit. */
function OverOns({ label, className, style, top, left }: {
  label: string; className: string; style?: React.CSSProperties; top: string; left: number;
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
    <div ref={wrap} className="rk-dd relative z-40 flex h-full items-center"
      onMouseEnter={openNu} onMouseLeave={sluitStraks}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button ref={knop} type="button" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 ${className}`} style={style}>
        {label}<Punt open={open} />
      </button>
      {open && (
        <div id={id} className="menu-panel absolute w-[280px]" style={{ top, left }}
          onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <ul className="flex flex-col rounded-[20px] border-[1.5px] bg-white p-2 shadow-[0_28px_56px_-28px_rgba(42,38,119,0.35)]"
            style={{ borderColor: K.lijn }}>
            {OVER_ONS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rk-dd-link flex flex-col gap-0.5 rounded-[14px] px-3.5 py-3" style={{ color: K.indigo }}>
                  <span className="text-[15px] font-extrabold">{l.label}</span>
                  <span className="text-[13px] font-medium" style={{ color: K.tekst2 }}>{l.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Logo met scheidingslijn en "voor werkgevers" / "voor werknemers". */
function LogoLabel({ groep, onClick }: { groep: Doelgroep; onClick: () => void }) {
  return (
    <Link href={SITE[groep].href} onClick={onClick} aria-label={`React2u voor ${SITE[groep].naam}, naar het begin`}
      className="flex shrink-0 items-center gap-3 xl:gap-4">
      <Logo title="" className="h-[38px] w-auto xl:h-[50px]" />
      <span aria-hidden className="h-[26px] w-[1.5px] xl:h-[34px]" style={{ background: K.lijn }} />
      <span className="flex flex-col text-[12px] font-semibold leading-[1.1] xl:text-[13px]" style={{ color: K.tekst2 }}>
        voor
        <span className="text-[16px] font-extrabold tracking-[-0.4px] xl:text-[19px]"
          style={{ color: groep === "werknemer" ? K.magenta : K.indigo }}>
          {SITE[groep].naam}
        </span>
      </span>
    </Link>
  );
}

export default function HeaderR2u({ contact }: { contact: ContactInfo }) {
  const variant = useVariant({ bewaar: true });
  const [mobiel, setMobiel] = useState(false);
  const [gescrold, setGescrold] = useState(false);
  const [paneelTop, setPaneelTop] = useState(72);
  const kopRef = useRef<HTMLElement>(null);
  const rijRef = useRef<HTMLDivElement>(null);
  const knopRef = useRef<HTMLButtonElement>(null);
  const ids = useId();
  const tel = telefoon(contact);

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
    setPaneelTop(Math.round(rijRef.current?.getBoundingClientRect().bottom ?? 72));
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
    const grens = variant === "neutraal" ? 768 : 1280;
    const onResize = () => { if (window.innerWidth >= grens) setMobiel(false); };
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
  }, [mobiel, variant]);

  const sluit = () => setMobiel(false);
  const sluitBijLink = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) sluit();
  };

  const neutraal = variant === "neutraal";
  const groep = neutraal ? null : variant;
  const kleur = groep === "werknemer" ? K.magenta : K.indigo;
  const paneelId = `${ids}-menu`;

  const menuKnop = (
    <button ref={knopRef} type="button" onClick={() => setMobiel((m) => !m)}
      aria-expanded={mobiel} aria-controls={paneelId} aria-label={mobiel ? "Menu sluiten" : "Menu openen"}
      className={`rk-rond grid h-11 w-11 shrink-0 place-items-center rounded-full ${neutraal ? "md:hidden" : "xl:hidden"}`}
      style={{ background: kleur }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        {mobiel ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
      </svg>
    </button>
  );

  return (
    <>
      <a href="#inhoud"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:px-5 focus:py-3 focus:text-white"
        style={{ background: K.indigo }}>
        Naar de inhoud
      </a>

      {groep && <TabBalk groep={groep} tel={tel} telHref={`tel:${contact.phone}`} />}

      <header ref={kopRef} data-r2u-kop={variant}
        className={`rk ${jakarta.className} sticky top-0 z-50 transition-shadow duration-300 ${
          gescrold || mobiel ? "shadow-[0_10px_28px_-22px_rgba(42,38,119,0.45)]" : ""}`}
        style={{ background: neutraal ? K.ivoor : "#ffffff", color: K.indigo }}>
        <div ref={rijRef}
          className={neutraal
            ? "mx-auto flex h-[72px] max-w-[1440px] items-center justify-between pl-5 pr-4 md:h-[92px] md:px-10 min-[1400px]:px-14"
            : "mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 pl-[18px] pr-3.5 md:px-10 xl:h-[86px] min-[1400px]:px-14"}>
          {neutraal ? (
            <>
              <Link href="/" aria-label="React2u, naar de homepage" className="flex shrink-0" onClick={sluit}>
                <Logo title="" className="h-[44px] w-auto md:h-[54px]" />
              </Link>
              <div className="hidden h-full items-center gap-7 text-[15px] font-bold md:flex">
                <OverOns label="Over ons" className="rk-link h-full" top="calc(100% - 18px)" left={-22} />
                <a href={`tel:${contact.phone}`} className="rk-pill flex items-center gap-2 rounded-full border-[1.5px] px-5 py-3.5"
                  style={{ borderColor: K.lijn }}>
                  <Telefoon /> {tel}
                </a>
              </div>
              <div className="flex gap-2 md:hidden">
                <a href={`tel:${contact.phone}`} aria-label={`Bel ons: ${tel}`}
                  className="rk-rond grid h-11 w-11 place-items-center rounded-full" style={{ background: K.zacht, color: K.indigo }}>
                  <Telefoon />
                </a>
                {menuKnop}
              </div>
            </>
          ) : (
            <>
              <LogoLabel groep={groep!} onClick={sluit} />
              <nav aria-label="Menu" className="hidden gap-0.5 rounded-full p-1.5 text-[14px] font-semibold xl:flex min-[1400px]:text-[15px]"
                style={{ background: K.zacht }}>
                {MENU[groep!].map((l) => (
                  <Link key={l.href} href={l.href}
                    className={`rk-pilllink whitespace-nowrap rounded-full px-3 py-[11px] ${groep === "werknemer" ? "min-[1400px]:px-4" : "min-[1400px]:px-[18px]"}`}>
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-2">
                <div className={`hidden items-center xl:flex ${groep === "werknemer" ? "gap-3" : "gap-4 min-[1400px]:gap-[22px]"}`}>
                  {groep === "werknemer" ? (
                    <Link href={KNOPPEN[groep].tweede.href}
                      className="rk-pill whitespace-nowrap rounded-full border-[1.5px] px-4 py-3.5 text-[14px] font-bold min-[1400px]:px-5 min-[1400px]:text-[15px]" style={{ borderColor: K.lijn }}>
                      {KNOPPEN[groep].tweede.label}
                    </Link>
                  ) : (
                    <Link href={KNOPPEN[groep!].tweede.href} className="rk-link whitespace-nowrap text-[14px] font-bold min-[1400px]:text-[15px]">
                      {KNOPPEN[groep!].tweede.label}
                    </Link>
                  )}
                  <Link href={KNOPPEN[groep!].hoofd.href}
                    className="rk-btn flex items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-[15px] text-[14px] font-bold text-white min-[1400px]:px-6 min-[1400px]:text-[15px]"
                    style={{ background: K.magenta }}>
                    {KNOPPEN[groep!].hoofd.label}<Pijl />
                  </Link>
                </div>
                <Link href={KNOPPEN[groep!].hoofd.href} onClick={sluit}
                  className="rk-btn flex h-11 items-center whitespace-nowrap rounded-full px-4 text-[14px] font-bold text-white xl:hidden"
                  style={{ background: K.magenta }}>
                  {KNOPPEN[groep!].hoofd.kort}
                </Link>
                {menuKnop}
              </div>
            </>
          )}
        </div>

        {mobiel && (
          <div id={paneelId} onClick={sluitBijLink}
            className={`menu-panel overflow-y-auto overscroll-contain border-t-[1.5px] ${neutraal ? "md:hidden" : "xl:hidden"}`}
            style={{ height: `calc(100dvh - ${paneelTop}px)`, borderColor: K.lijn, background: neutraal ? K.ivoor : "#ffffff" }}>
            <MobielPaneel variant={variant} contact={contact} tel={tel} />
          </div>
        )}
      </header>
    </>
  );
}

/** Gekleurde balk boven de header met de tabbladen Werkgevers | Werknemers. */
function TabBalk({ groep, tel, telHref }: { groep: Doelgroep; tel: string; telHref: string }) {
  const kleur = groep === "werknemer" ? K.magenta : K.indigo;
  const zacht = groep === "werknemer" ? K.rozeLicht : K.lila;
  return (
    <div data-r2u-tabs className={`rk rk-balk relative z-[60] ${jakarta.className}`} style={{ background: kleur }}>
      <div className="mx-auto flex h-10 max-w-[1440px] items-stretch justify-between px-1.5 md:h-[46px] md:px-10 min-[1400px]:px-14">
        <nav aria-label="Kies je doelgroep" className="flex flex-1 gap-0.5 text-[14px] font-bold md:flex-none md:font-semibold">
          {(["werkgever", "werknemer"] as const).map((g) => {
            const actief = g === groep;
            return (
              <Link key={g} href={SITE[g].href} aria-current={actief ? "true" : undefined}
                className={`flex flex-1 items-center justify-center md:flex-none md:px-[22px] ${
                  actief ? "mt-[7px] rounded-t-[14px] bg-white font-extrabold" : "rk-tab"}`}
                style={{ color: actief ? kleur : zacht }}>
                {g === "werkgever" ? "Werkgevers" : "Werknemers"}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-7 text-[14px] font-semibold md:flex" style={{ color: zacht }}>
          <OverOns label="Over React2u" className="rk-tab h-full" style={{ color: zacht }} top="calc(100% - 4px)" left={-14} />
          <Link href="/" className="rk-tab" style={{ color: zacht }}>Home</Link>
          <a href={telHref} className="rk-tab flex items-center gap-2 font-bold text-white">
            <Telefoon /> {tel}
          </a>
        </div>
      </div>
    </div>
  );
}

function Kopje({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: "#A8245A" }}>{children}</p>
  );
}

/** Het paneel achter de menuknop. Niet in het ontwerp; in dezelfde stijl opgebouwd. */
function MobielPaneel({ variant, contact, tel }: { variant: Variant; contact: ContactInfo; tel: string }) {
  const groep = variant === "neutraal" ? null : variant;
  const ander: Doelgroep | null = groep === "werkgever" ? "werknemer" : groep === "werknemer" ? "werkgever" : null;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-7 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
      {groep ? (
        <>
          <nav aria-label="Menu">
            <ul className="flex flex-col">
              {MENU[groep].map((l) => (
                <li key={l.href} className="border-b-[1.5px]" style={{ borderColor: K.lijn }}>
                  <Link href={l.href} className="rk-row flex items-center justify-between py-[15px] text-[19px] font-extrabold tracking-[-0.4px]">
                    {l.label}
                    <span style={{ color: K.magenta }}><Pijl size={16} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-2.5">
            <Link href={KNOPPEN[groep].hoofd.href}
              className="rk-btn flex h-[52px] items-center justify-center gap-2.5 rounded-full text-[16px] font-bold text-white"
              style={{ background: K.magenta }}>
              {KNOPPEN[groep].hoofd.label}<Pijl />
            </Link>
            <Link href={KNOPPEN[groep].tweede.href}
              className="rk-pill flex h-[52px] items-center justify-center rounded-full border-[1.5px] text-[16px] font-bold"
              style={{ borderColor: K.lijn }}>
              {KNOPPEN[groep].tweede.label}
            </Link>
          </div>
        </>
      ) : (
        <nav aria-label="Menu">
          <ul className="flex flex-col gap-2">
            {(["werkgever", "werknemer"] as const).map((g) => (
              <li key={g}>
                <Link href={SITE[g].href} className="rk-row flex items-center justify-between gap-4 rounded-[24px] py-4 pl-5 pr-4"
                  style={{ background: g === "werkgever" ? K.zacht : K.roze }}>
                  <span className="flex flex-col gap-1">
                    <span className="text-[19px] font-extrabold tracking-[-0.4px]" style={{ color: g === "werkgever" ? K.indigo : K.magenta }}>
                      Ik ben {g}
                    </span>
                    <span className="text-[14px] leading-snug" style={{ color: K.tekst2 }}>{SITE[g].sub}</span>
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
                    style={{ background: g === "werkgever" ? K.indigo : K.magenta }}>
                    <Pijl />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div>
        <Kopje>Over React2u</Kopje>
        <ul className="-mx-3.5 flex flex-col">
          {OVER_ONS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rk-dd-link flex flex-col gap-0.5 rounded-[14px] px-3.5 py-2.5">
                <span className="text-[16px] font-extrabold">{l.label}</span>
                <span className="text-[13px] font-medium" style={{ color: K.tekst2 }}>{l.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[28px] px-5 py-2 text-white" style={{ background: K.indigo }}>
        {[
          { href: `tel:${contact.phone}`, label: "Bellen", waarde: tel, Ic: Telefoon },
          { href: `mailto:${contact.email}`, label: "Mailen", waarde: contact.email, Ic: Mail },
        ].map(({ href, label, waarde, Ic }, i) => (
          <a key={href} href={href} className={`rk-crow flex items-center gap-4 py-4 ${i ? "border-t-[1.5px]" : ""}`}
            style={{ borderColor: "#423E97", color: "#ffffff" }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: "#3A3690" }}><Ic size={18} /></span>
            <span className="flex grow flex-col gap-0.5">
              <span className="text-[13px] font-semibold" style={{ color: "#B4ADF2" }}>{label}</span>
              <span className="text-[17px] font-extrabold tracking-[-0.3px]">{waarde}</span>
            </span>
            <span style={{ color: "#B4ADF2" }}><Pijl /></span>
          </a>
        ))}
      </div>

      {ander && (
        <Link href={SITE[ander].href} className="rk-row flex items-center justify-between gap-4 rounded-[24px] py-3.5 pl-[18px] pr-3.5"
          style={{ background: ander === "werknemer" ? K.roze : K.zacht }}>
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-bold" style={{ color: K.tekst2 }}>Ben je {ander}?</span>
            <span className="text-[17px] font-extrabold tracking-[-0.4px]" style={{ color: ander === "werknemer" ? K.magenta : K.indigo }}>
              Naar React2u voor {SITE[ander].naam}
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
            style={{ background: ander === "werknemer" ? K.magenta : K.indigo }}>
            <Pijl />
          </span>
        </Link>
      )}
    </div>
  );
}
