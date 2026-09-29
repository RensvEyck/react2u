"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import {
  LuSearch, LuFileText, LuTextCursorInput, LuNewspaper, LuBriefcase, LuMessageSquare, LuUsers,
  LuPhone, LuUserCog, LuCornerDownLeft, LuLoaderCircle, LuBuilding,
} from "react-icons/lu";
import { ADMIN_ACTIONS, ADMIN_NAV, type NavItem } from "@/lib/adminNav";
import Highlight from "./Highlight";
import { confirmLeave } from "@/lib/unsaved";
import { permissionForPath, type Permission } from "@/lib/permissions";
import {
  findRanges, score, snippet, terms as toTerms,
  type IndexEntry, type Range, type RecordHit, type Snippet,
} from "@/lib/search";

/**
 * Commandopalet: ⌘K (of Ctrl+K, of /) opent een zoekveld over het hele paneel.
 *
 * Schermen en acties staan vast in de client. Inhoud komt één keer per minuut
 * van /admin/zoeken/inhoud en wordt hier doorzocht, zodat resultaten meteen
 * verschijnen. Inzendingen en leads gaan per zoekopdracht via /admin/zoeken —
 * zie src/lib/search.ts voor waarom die twee verschillen.
 */

type Item = {
  key: string;
  group: string;
  icon: IconType;
  title: string;
  titleRanges: Range[];
  subtitle?: string;
  snippet?: Snippet | null;
  tag?: { label: string; cls: string };
  href: string;
  external?: boolean;
};

const GROUP_ORDER = [
  "Acties", "Schermen", "Pagina's", "Tekst op pagina's", "Artikelen", "Vacatures",
  "Postvak IN", "Bellijst", "Bedrijven", "Gebruikers",
];

// Hoeveel resultaten per groep. Schermen en acties kort, want daar weet je
// meestal precies wat je zoekt; inzendingen ruimer, want namen lijken op elkaar.
const GROUP_LIMIT: Record<string, number> = { Acties: 4, Schermen: 4, "Postvak IN": 8 };

const KIND: Record<IndexEntry["kind"] | RecordHit["kind"], { group: string; icon: IconType }> = {
  pagina: { group: "Pagina's", icon: LuFileText },
  blok: { group: "Tekst op pagina's", icon: LuTextCursorInput },
  artikel: { group: "Artikelen", icon: LuNewspaper },
  vacature: { group: "Vacatures", icon: LuBriefcase },
  bericht: { group: "Postvak IN", icon: LuMessageSquare },
  sollicitatie: { group: "Postvak IN", icon: LuUsers },
  lead: { group: "Bellijst", icon: LuPhone },
  gebruiker: { group: "Gebruikers", icon: LuUserCog },
  bedrijf: { group: "Bedrijven", icon: LuBuilding },
};

const STATUS_TAG: Record<IndexEntry["status"], { label: string; cls: string } | undefined> = {
  live: undefined,
  concept: { label: "Concept", cls: "bg-black/[0.06] text-black/50" },
  gesloten: { label: "Gesloten", cls: "bg-[#fff4e5] text-[#c77700]" },
};

const INDEX_TTL_MS = 60_000;

function allowed(item: NavItem, permissions: Permission[]) {
  const perm = permissionForPath(item.href.split(/[?#]/)[0]);
  return !perm || permissions.includes(perm);
}

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function CommandPalette({
  open, onOpenChange, permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: Permission[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<{ at: number; entries: IndexEntry[] } | null>(null);
  const [records, setRecords] = useState<{ q: string; hits: RecordHit[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Sneltoetsen om te openen. "/" alleen buiten invoervelden, anders kun je
  // geen schuine streep meer typen in een URL-veld.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "/" && !open && !isTyping(e.target)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Openen: focus vasthouden, pagina niet laten meescrollen, inhoud verversen
  // als die ouder is dan een minuut. Sluiten: focus terug waar hij was.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());

    if (!index || Date.now() - index.at > INDEX_TTL_MS) {
      fetch("/admin/zoeken/inhoud", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((entries: IndexEntry[]) => setIndex({ at: Date.now(), entries }))
        .catch(() => {
          // Zonder inhoud werken schermen, acties en inzendingen gewoon door.
        });
    }

    return () => {
      document.body.style.overflow = overflow;
      returnFocus.current?.focus?.();
    };
    // `index` bewust niet als afhankelijkheid: alleen bij openen verversen,
    // niet opnieuw zodra het antwoord binnenkomt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Inzendingen: pas na een korte pauze in het typen, en een oudere zoekvraag
  // wordt afgebroken zodra er een nieuwere is.
  const trimmed = query.trim();
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/admin/zoeken?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((hits: RecordHit[]) => setRecords({ q: trimmed, hits }))
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 160);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [trimmed, open]);

  const items = useMemo<Item[]>(() => {
    const qTerms = toTerms(trimmed);
    const screens = ADMIN_NAV.filter((n) => allowed(n, permissions));
    const actions = ADMIN_ACTIONS.filter((a) => allowed(a, permissions));

    if (!qTerms.length) {
      return [
        ...actions.slice(0, 5).map((a) => ({
          key: `a:${a.href}:${a.label}`, group: "Acties", icon: a.icon, title: a.label, titleRanges: [],
          href: a.href, external: a.external,
        })),
        ...screens.map((n) => ({
          key: `s:${n.href}`, group: "Schermen", icon: n.icon, title: n.label, titleRanges: [], href: n.href,
        })),
      ];
    }

    const ranked: (Item & { score: number })[] = [];

    for (const a of actions) {
      const s = score({ title: a.label, text: a.keywords }, qTerms);
      if (s) ranked.push({
        key: `a:${a.href}:${a.label}`, group: "Acties", icon: a.icon, title: a.label,
        titleRanges: findRanges(a.label, qTerms), href: a.href, external: a.external, score: s,
      });
    }
    for (const n of screens) {
      const s = score({ title: n.label, text: n.keywords }, qTerms);
      if (s) ranked.push({
        key: `s:${n.href}`, group: "Schermen", icon: n.icon, title: n.label,
        titleRanges: findRanges(n.label, qTerms), href: n.href, score: s,
      });
    }

    for (const e of index?.entries || []) {
      const s = score(e, qTerms);
      if (!s) continue;
      const meta = KIND[e.kind];
      // Bij een blok is de pagina de titel; de treffer zit meestal in de
      // tekst, dus die tonen we als fragment. Staat de treffer alleen in de
      // titel, dan is het blok zelf geen nieuws — de pagina staat er al.
      const snip = e.text ? snippet(e.text, qTerms) : null;
      if (e.kind === "blok" && !snip) continue;
      ranked.push({
        key: `${e.kind}:${e.id}`, group: meta.group, icon: meta.icon,
        title: e.title, titleRanges: findRanges(e.title, qTerms),
        subtitle: e.subtitle, snippet: snip, tag: STATUS_TAG[e.status], href: e.href, score: s,
      });
    }

    // Alleen tonen wat bij de huidige zoekvraag hoort; een antwoord op een
    // oudere vraag zou resultaten laten zien die niet (meer) kloppen.
    if (records && records.q === trimmed) {
      for (const r of records.hits) {
        const meta = KIND[r.kind];
        ranked.push({
          key: `${r.kind}:${r.id}`, group: meta.group, icon: meta.icon,
          title: r.title, titleRanges: findRanges(r.title, qTerms), subtitle: r.subtitle,
          tag: r.kind === "sollicitatie" ? { label: "Sollicitatie", cls: "bg-[#eef0ff] text-[#312e82]" }
            : r.kind === "bericht" ? { label: "Bericht", cls: "bg-[#fff4e5] text-[#c77700]" } : undefined,
          href: r.href, score: 1,
        });
      }
    }

    // Per groep de beste bovenaan en een maximum. De groepen zelf op hun beste
    // treffer: bij "contact" hoort de pagina Contact boven het scherm Berichten,
    // dat alleen via een zoekwoord meedoet. Bij gelijke stand de vaste volgorde.
    const byGroup = new Map<string, (Item & { score: number })[]>();
    for (const r of ranked) byGroup.set(r.group, [...(byGroup.get(r.group) || []), r]);
    const groups = GROUP_ORDER
      .map((g) => ({ g, list: (byGroup.get(g) || []).sort((a, b) => b.score - a.score) }))
      .filter((x) => x.list.length)
      .sort((a, b) => b.list[0].score - a.list[0].score || GROUP_ORDER.indexOf(a.g) - GROUP_ORDER.indexOf(b.g));
    return groups.flatMap(({ g, list }) => list.slice(0, GROUP_LIMIT[g] ?? 6));
  }, [trimmed, index, records, permissions]);

  // Terug naar het eerste resultaat bij een nieuwe zoekvraag. Afgeleid tijdens
  // het renderen in plaats van in een effect: dat scheelt een extra render.
  const [activeFor, setActiveFor] = useState(trimmed);
  if (activeFor !== trimmed) {
    setActiveFor(trimmed);
    setActive(0);
  }
  const current = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const run = (item: Item, newTab = false) => {
    // Een nieuw tabblad laat dit scherm staan; hier weg navigeren niet.
    if (!item.external && !newTab && !confirmLeave()) return;
    close();
    setQuery("");
    if (item.external || newTab) window.open(item.href, "_blank", "noopener");
    else router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[current];
      if (item) run(item, e.metaKey || e.ctrlKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // Focus blijft in het palet; Tab loopt door de resultaten.
      e.preventDefault();
      setActive((current + (e.shiftKey ? -1 : 1) + items.length) % Math.max(1, items.length));
    }
  };

  if (!open) return null;

  const loadingRecords = searching && trimmed.length >= 2 && records?.q !== trimmed;
  const empty = items.length === 0 && trimmed && !loadingRecords;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <div className="absolute inset-0 animate-[fadeIn_0.12s_ease-out] motion-reduce:animate-none bg-[#1c1a4e]/35 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Zoeken in het adminpaneel"
        className="relative flex max-h-[min(640px,76vh)] w-full max-w-[640px] animate-[popIn_0.16s_cubic-bezier(0.2,0.9,0.3,1.2)] motion-reduce:animate-none flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_80px_-20px_rgba(28,26,78,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-black/[0.07] px-5">
          {loadingRecords ? (
            <LuLoaderCircle className="shrink-0 animate-spin text-[18px] text-[#e75387]" />
          ) : (
            <LuSearch className="shrink-0 text-[18px] text-black/35" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Zoek een pagina, tekst, sollicitant, lead… of typ een actie"
            className="h-[58px] min-w-0 flex-1 bg-transparent text-[16px] text-[#1c1a4e] outline-none placeholder:text-black/35"
            role="combobox"
            aria-expanded="true"
            aria-controls="palet-resultaten"
            aria-activedescendant={items[current] ? `palet-${current}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="akbd hidden sm:inline-flex">esc</kbd>
        </div>

        <div ref={listRef} id="palet-resultaten" role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-2">
          {empty && (
            <div className="px-4 py-12 text-center">
              <p className="text-[14.5px] font-semibold text-[#1c1a4e]">Niets gevonden voor “{trimmed}”</p>
              <p className="mt-1 text-[13px] text-black/45">Probeer een deel van een naam, een woord uit een tekst of een e-mailadres.</p>
            </div>
          )}
          {items.map((item, i) => {
            const header = i === 0 || items[i - 1].group !== item.group ? item.group : null;
            const isActive = i === current;
            return (
              <div key={item.key}>
                {header && (
                  <p className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-black/35 first:pt-1.5">
                    {header}
                  </p>
                )}
                <div
                  id={`palet-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => active !== i && setActive(i)}
                  onClick={(e) => run(item, e.metaKey || e.ctrlKey)}
                  className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    item.subtitle || item.snippet ? "items-start" : "items-center"
                  } ${isActive ? "bg-[#f1f0fb]" : ""}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] ${
                    item.subtitle || item.snippet ? "mt-0.5" : ""
                  } ${
                    isActive ? "bg-[#312e82] text-white" : "bg-[#eef0ff] text-[#312e82]"
                  }`}>
                    <item.icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">
                        <Highlight text={item.title} ranges={item.titleRanges} />
                      </p>
                      {item.tag && <span className={`apill shrink-0 !px-2 !py-0 !text-[11px] ${item.tag.cls}`}>{item.tag.label}</span>}
                    </div>
                    {item.subtitle && <p className="truncate text-[12.5px] text-black/45">{item.subtitle}</p>}
                    {item.snippet && (
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-black/60">
                        {item.snippet.clippedStart && "…"}
                        <Highlight text={item.snippet.text} ranges={item.snippet.ranges} />
                        {item.snippet.clippedEnd && "…"}
                      </p>
                    )}
                  </div>
                  {isActive && <LuCornerDownLeft className={`shrink-0 text-[14px] text-black/30 ${item.subtitle || item.snippet ? "mt-2" : ""}`} />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-black/[0.06] bg-[#fafafd] px-5 py-2.5 text-[12px] text-black/40 sm:flex">
          <span className="flex items-center gap-1.5"><kbd className="akbd">↑↓</kbd> kiezen</span>
          <span className="flex items-center gap-1.5"><kbd className="akbd">↵</kbd> openen</span>
          <span className="flex items-center gap-1.5"><kbd className="akbd">⌘↵</kbd> nieuw tabblad</span>
          <span className="ml-auto">Zoekt in alles waar jij bij mag</span>
        </div>
      </div>
    </div>
  );
}
