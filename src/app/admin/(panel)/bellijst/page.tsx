import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { createLead, setLeadStatus, updateLead, deleteLead } from "@/app/admin/actions";
import StatusSelect from "@/components/admin/StatusSelect";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Uitklap from "@/components/admin/Uitklap";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  LEAD_STATUS, LEAD_STATUS_OPTIONS, sortLeads, needsCall, countToCall, today, searchLeads, pagineer,
} from "@/lib/leads";
import {
  LuPlus, LuPhone, LuMail, LuTrash2, LuBuilding, LuCalendar, LuSearch, LuX, LuChevronLeft, LuChevronRight,
} from "react-icons/lu";

const FILTERS = [
  { key: "bellen", label: "Te bellen" },
  { key: "alles", label: "Alles" },
  { key: "terugbellen", label: "Terugbellen" },
  { key: "gebeld", label: "Gebeld" },
  { key: "klant", label: "Klant" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

// Elke lead is een kaart met een notitieveld. Alle 570 tegelijk gaf een pagina
// van honderdduizend pixels die seconden laadde; 25 per pagina is een ochtend bellen.
const PER_PAGINA = 25;

/** Adres van de bellijst met deze filter, zoekvraag en pagina; standaardwaarden blijven uit de URL. */
function bellijstHref(filter: Filter, q: string, pagina = 1) {
  const p = new URLSearchParams();
  if (filter !== "bellen") p.set("filter", filter);
  if (q) p.set("q", q);
  if (pagina > 1) p.set("pagina", String(pagina));
  const qs = p.toString();
  return `/admin/bellijst${qs ? `?${qs}` : ""}`;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BellijstAdmin({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; pagina?: string }>;
}) {
  const { filter: raw, q: rawQ, pagina: rawPagina } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === raw) ? (raw as Filter) : "bellen";
  const q = (rawQ || "").trim().slice(0, 100);

  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("leads").select("*");
  const all = (data as Lead[]) || [];
  const day = today();
  const sorted = sortLeads(all, day);

  // Zoeken gaat vóór de filters: de tellers op de knoppen tonen dan hoeveel
  // treffers er in elke weergave zitten.
  const found = searchLeads(sorted, q);
  const inFilter = (f: Filter) => found.filter((l) =>
    f === "bellen" ? needsCall(l, day) :
    f === "alles" ? true :
    l.status === f
  );
  const page = pagineer(inFilter(filter), rawPagina, PER_PAGINA);

  const counts = {
    bellen: q ? inFilter("bellen").length : countToCall(all, day),
    alles: found.length,
    terugbellen: inFilter("terugbellen").length,
    gebeld: inFilter("gebeld").length,
    klant: inFilter("klant").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Bellijst</h1>
        <p className="text-[14.5px] text-black/50">
          Leads met belstatus en notities. Wat vandaag terugmoet staat bovenaan.
        </p>
      </div>

      <Uitklap id="nieuw" label="Lead toevoegen">
      <form action={createLead}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="alabel">Naam *</label>
            <input className="ainput" name="name" required />
          </div>
          <div>
            <label className="alabel">Bedrijf</label>
            <input className="ainput" name="company" />
          </div>
          <div>
            <label className="alabel">Telefoon</label>
            <input className="ainput" name="phone" type="tel" />
          </div>
          <div>
            <label className="alabel">E-mail</label>
            <input className="ainput" name="email" type="email" />
          </div>
          <div>
            <label className="alabel">Bron</label>
            <input className="ainput" name="source" placeholder="beurs, website…" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn"><LuPlus /> Toevoegen</button>
        </div>
      </form>
      </Uitklap>

      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/bellijst" role="search" className="relative w-full sm:w-[320px]">
          {filter !== "bellen" && <input type="hidden" name="filter" value={filter} />}
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-black/35" />
          <input
            className="ainput !py-2.5 !pl-10 !pr-10"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Zoek naam, bedrijf, nummer…"
            aria-label="Zoek in de bellijst"
            autoComplete="off"
          />
          {q && (
            <Link
              href={bellijstHref(filter, "")}
              aria-label="Zoekvraag wissen"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-black/35 hover:bg-black/5 hover:text-[#312e82]"
            >
              <LuX className="text-[14px]" />
            </Link>
          )}
        </form>
        <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Link
              key={f.key}
              href={bellijstHref(f.key, q)}
              className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition ${
                active ? "border-[#312e82] bg-[#312e82] text-white"
                       : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
              }`}
            >
              {f.label}
              <span className={`ml-2 text-[12px] ${active ? "text-white/60" : "text-black/35"}`}>
                {counts[f.key]}
              </span>
            </Link>
          );
        })}
        </div>
      </div>

      {page.totaal === 0 && (
        <div className="acard px-6 py-12 text-center">
          {q ? <LuSearch className="mx-auto text-[26px] text-black/20" /> : <LuPhone className="mx-auto text-[26px] text-black/20" />}
          <p className="mt-3 text-[14.5px] text-black/45">
            {q
              ? <>Niets gevonden voor “{q}” in deze weergave.{" "}
                  {filter !== "alles" && counts.alles > 0 && (
                    <Link href={bellijstHref("alles", q)} className="font-semibold text-[#e75387] hover:underline">
                      Zoek in alle {counts.alles}
                    </Link>
                  )}</>
              : filter === "bellen" ? "Niemand te bellen — de lijst is bij." : "Geen leads in deze weergave."}
          </p>
        </div>
      )}

      {page.totaal > 0 && (
        <p className="text-[13px] text-black/45" aria-live="polite">
          {page.paginas > 1 ? <>{page.van}–{page.tot} van {page.totaal}</> : <>{page.totaal} {page.totaal === 1 ? "lead" : "leads"}</>}
          {q && <> voor “{q}”</>}
        </p>
      )}

      <div className="space-y-3">
        {page.items.map((l) => <LeadCard key={l.id} l={l} day={day} terug={bellijstHref(filter, q, page.pagina)} />)}
      </div>

      {page.paginas > 1 && <Bladeren filter={filter} q={q} pagina={page.pagina} paginas={page.paginas} />}
    </div>
  );
}

/** Paginanummers rond de huidige, met de eerste en laatste altijd zichtbaar. */
function paginaReeks(pagina: number, paginas: number): (number | "…")[] {
  const set = new Set([1, paginas, pagina - 1, pagina, pagina + 1].filter((n) => n >= 1 && n <= paginas));
  const lijst = [...set].sort((a, b) => a - b);
  const uit: (number | "…")[] = [];
  lijst.forEach((n, i) => {
    if (i > 0 && n - lijst[i - 1] > 1) uit.push("…");
    uit.push(n);
  });
  return uit;
}

function Bladeren({ filter, q, pagina, paginas }: { filter: Filter; q: string; pagina: number; paginas: number }) {
  const knop = "flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-[13.5px] font-semibold transition";
  const uit = "pointer-events-none border-black/[0.06] text-black/25";
  const aan = "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]";
  return (
    <nav aria-label="Pagina's van de bellijst" className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
      <Link
        href={bellijstHref(filter, q, pagina - 1)}
        aria-disabled={pagina === 1}
        tabIndex={pagina === 1 ? -1 : undefined}
        className={`${knop} ${pagina === 1 ? uit : aan}`}
      >
        <LuChevronLeft className="text-[15px]" /> <span className="ml-1 hidden sm:inline">Vorige</span>
      </Link>
      {paginaReeks(pagina, paginas).map((n, i) =>
        n === "…" ? (
          <span key={`g${i}`} className="px-1 text-black/30">…</span>
        ) : (
          <Link
            key={n}
            href={bellijstHref(filter, q, n)}
            aria-current={n === pagina ? "page" : undefined}
            className={`${knop} ${n === pagina ? "border-[#312e82] bg-[#312e82] text-white" : aan}`}
          >
            {n}
          </Link>
        )
      )}
      <Link
        href={bellijstHref(filter, q, pagina + 1)}
        aria-disabled={pagina === paginas}
        tabIndex={pagina === paginas ? -1 : undefined}
        className={`${knop} ${pagina === paginas ? uit : aan}`}
      >
        <span className="mr-1 hidden sm:inline">Volgende</span> <LuChevronRight className="text-[15px]" />
      </Link>
    </nav>
  );
}

function LeadCard({ l, day, terug }: { l: Lead; day: string; terug: string }) {
  const overdue = l.status === "terugbellen" && l.follow_up_on && l.follow_up_on <= day;
  const meta = LEAD_STATUS[l.status as LeadStatus] || LEAD_STATUS.te_bellen;

  return (
    <div id={`lead-${l.id}`} className={`acard scroll-mt-24 p-6 ${needsCall(l, day) ? "border-l-[3px] border-l-[#e75387]" : "opacity-80"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[16px] font-bold text-[#1c1a4e]">{l.name}</p>
            <span className={`apill ${meta.cls}`}>{meta.label}</span>
            {overdue && <span className="apill bg-[#fdeef4] text-[#e0356b]">Staat open</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
            {l.company && (
              <span className="flex items-center gap-1.5 text-black/50">
                <LuBuilding className="text-[12px]" /> {l.company}
              </span>
            )}
            {l.phone && (
              <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 font-semibold text-[#e75387] hover:underline">
                <LuPhone className="text-[12px]" /> {l.phone}
              </a>
            )}
            {l.email && (
              <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                <LuMail className="text-[12px]" /> {l.email}
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-[12.5px] text-black/35">
            {l.source && <span>via {l.source}</span>}
            {l.last_called_at && (
              <span>laatst gebeld {new Date(l.last_called_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusSelect
            action={setLeadStatus.bind(null, l.id)}
            current={l.status}
            options={LEAD_STATUS_OPTIONS}
          />
          <ConfirmButton
            action={deleteLead.bind(null, l.id)}
            message={`Lead "${l.name}" verwijderen?`}
            className="rounded-lg p-2 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]"
          >
            <LuTrash2 className="text-[15px]" />
          </ConfirmButton>
        </div>
      </div>

      <form action={updateLead.bind(null, l.id)} className="mt-4 border-t border-black/[0.06] pt-4">
        <input type="hidden" name="name" value={l.name} />
        <input type="hidden" name="company" value={l.company || ""} />
        <input type="hidden" name="phone" value={l.phone || ""} />
        <input type="hidden" name="email" value={l.email || ""} />
        <input type="hidden" name="terug" value={terug} />
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div>
            <label className="alabel">Notities</label>
            <textarea
              className="ainput font-sans text-[14px]"
              name="notes"
              rows={3}
              defaultValue={l.notes || ""}
              placeholder="Wat is er besproken?"
            />
          </div>
          <div>
            <label className="alabel flex items-center gap-1.5">
              <LuCalendar className="text-[12px]" /> Terugbellen op
            </label>
            <input className="ainput" name="follow_up_on" type="date" defaultValue={l.follow_up_on || ""} />
            {l.follow_up_on && (
              <p className="mt-1 text-[12px] text-black/40">{fmtDate(l.follow_up_on)}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
        </div>
      </form>
    </div>
  );
}
