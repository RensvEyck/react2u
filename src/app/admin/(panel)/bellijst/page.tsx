import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { createLead, setLeadStatus, updateLead, deleteLead } from "@/app/admin/actions";
import StatusSelect from "@/components/admin/StatusSelect";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUS, LEAD_STATUS_OPTIONS, sortLeads, needsCall, countToCall, today } from "@/lib/leads";
import { LuPlus, LuPhone, LuMail, LuTrash2, LuBuilding, LuCalendar } from "react-icons/lu";

const FILTERS = [
  { key: "bellen", label: "Te bellen" },
  { key: "alles", label: "Alles" },
  { key: "terugbellen", label: "Terugbellen" },
  { key: "gebeld", label: "Gebeld" },
  { key: "klant", label: "Klant" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BellijstAdmin({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: raw } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === raw) ? (raw as Filter) : "bellen";

  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("leads").select("*");
  const all = (data as Lead[]) || [];
  const day = today();
  const sorted = sortLeads(all, day);

  const shown = sorted.filter((l) =>
    filter === "bellen" ? needsCall(l, day) :
    filter === "alles" ? true :
    l.status === filter
  );

  const counts = {
    bellen: countToCall(all, day),
    alles: all.length,
    terugbellen: all.filter((l) => l.status === "terugbellen").length,
    gebeld: all.filter((l) => l.status === "gebeld").length,
    klant: all.filter((l) => l.status === "klant").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Bellijst</h1>
        <p className="text-[14.5px] text-black/50">
          Leads met belstatus en notities. Wat vandaag terugmoet staat bovenaan.
        </p>
      </div>

      <form action={createLead} className="acard p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold text-[#312e82]">Nieuwe lead</h2>
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

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Link
              key={f.key}
              href={f.key === "bellen" ? "/admin/bellijst" : `/admin/bellijst?filter=${f.key}`}
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

      {shown.length === 0 && (
        <div className="acard px-6 py-12 text-center">
          <LuPhone className="mx-auto text-[26px] text-black/20" />
          <p className="mt-3 text-[14.5px] text-black/45">
            {filter === "bellen" ? "Niemand te bellen — de lijst is bij." : "Geen leads in deze weergave."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {shown.map((l) => <LeadCard key={l.id} l={l} day={day} />)}
      </div>
    </div>
  );
}

function LeadCard({ l, day }: { l: Lead; day: string }) {
  const overdue = l.status === "terugbellen" && l.follow_up_on && l.follow_up_on <= day;
  const meta = LEAD_STATUS[l.status as LeadStatus] || LEAD_STATUS.te_bellen;

  return (
    <div className={`acard p-6 ${needsCall(l, day) ? "border-l-[3px] border-l-[#e75387]" : "opacity-80"}`}>
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
