import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { addLeadFromCompany, setCompanyIgnored } from "@/app/admin/actions";
import BezoekTabs from "@/components/admin/BezoekTabs";
import { CompanyAvatar, LeadPill, LevelPill } from "@/components/admin/CompanyBits";
import { loadCompanies } from "@/lib/companiesDb";
import { waited } from "@/lib/dashboard";
import type { CompanySummary } from "@/lib/companies";
import {
  LuBuilding, LuChevronRight, LuEyeOff, LuEye, LuPhoneCall, LuInfo, LuTriangleAlert, LuFlame,
} from "react-icons/lu";

const RANGES = [
  { key: "7", label: "7 dagen" },
  { key: "30", label: "30 dagen" },
  { key: "90", label: "90 dagen" },
] as const;

const VIEWS = [
  { key: "alle", label: "Alle" },
  { key: "warm", label: "Warm" },
  { key: "nieuw", label: "Nog niet benaderd" },
  { key: "niet-volgen", label: "Niet volgen" },
] as const;
type View = (typeof VIEWS)[number]["key"];

const pill = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
    active ? "border-[#312e82] bg-[#312e82] text-white" : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
  }`;

export default async function BedrijvenAdmin({
  searchParams,
}: {
  searchParams: Promise<{ dagen?: string; weergave?: string }>;
}) {
  const sp = await searchParams;
  const days = RANGES.some((r) => r.key === sp.dagen) ? Number(sp.dagen) : 30;
  const view: View = VIEWS.some((v) => v.key === sp.weergave) ? (sp.weergave as View) : "alle";
  const { sb, admin } = await requirePerm("bezoek");
  const { companies, profilesReady } = await loadCompanies(sb, days, admin.permissions);
  const canCall = admin.permissions.includes("bellijst");

  const followed = companies.filter((c) => !c.ignored);
  const counts: Record<View, number> = {
    alle: followed.length,
    warm: followed.filter((c) => c.score.level === "warm").length,
    nieuw: followed.filter((c) => !c.lead && !c.score.hint).length,
    "niet-volgen": companies.filter((c) => c.ignored).length,
  };
  const shown =
    view === "niet-volgen" ? companies.filter((c) => c.ignored)
    : view === "warm" ? followed.filter((c) => c.score.level === "warm")
    : view === "nieuw" ? followed.filter((c) => !c.lead && !c.score.hint)
    : followed;

  const query = (next: Partial<{ dagen: number; weergave: View }>) => {
    const d = next.dagen ?? days;
    const w = next.weergave ?? view;
    const qs = [d !== 30 ? `dagen=${d}` : "", w !== "alle" ? `weergave=${w}` : ""].filter(Boolean).join("&");
    return `/admin/bezoek/bedrijven${qs ? `?${qs}` : ""}`;
  };
  const here = query({});
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Bezoek</h1>
        <p className="text-[14.5px] text-black/50">
          Welke bedrijven de site bekeken, wat ze lazen en hoe warm ze zijn.
        </p>
      </div>

      <BezoekTabs active="bedrijven" warm={counts.warm} />

      <Setup profilesReady={profilesReady} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {VIEWS.filter((v) => v.key !== "niet-volgen" || counts["niet-volgen"] > 0 || view === "niet-volgen").map((v) => (
            <Link key={v.key} href={query({ weergave: v.key })} className={pill(v.key === view)}>
              {v.key === "warm" && <LuFlame className="mr-1 inline text-[12px]" />}
              {v.label}
              <span className={`ml-1.5 text-[12px] ${v.key === view ? "text-white/60" : "text-black/35"}`}>{counts[v.key]}</span>
            </Link>
          ))}
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Link key={r.key} href={query({ dagen: Number(r.key) })} className={pill(Number(r.key) === days)}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="acard flex flex-col items-center gap-2 px-6 py-14 text-center">
          <LuBuilding className="text-[28px] text-black/20" />
          <p className="max-w-[460px] text-[14.5px] text-black/45">
            {view === "warm"
              ? "Geen warme bedrijven in deze periode. Warm wordt een bedrijf dat terugkomt of contact en diensten bekijkt."
              : view === "niet-volgen"
                ? "Je volgt alle herkende bedrijven."
                : `Nog geen bedrijven herkend in de afgelopen ${days} dagen.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((c) => <Row key={c.key} c={c} here={here} canCall={canCall} now={now} />)}
        </ul>
      )}

      <details className="acard group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-6 py-4 text-[14px] font-semibold text-[#312e82] [&::-webkit-details-marker]:hidden">
          <LuInfo className="text-[16px] text-black/35" /> Hoe werkt de herkenning, en wat zie je niet?
        </summary>
        <div className="space-y-2.5 border-t border-black/[0.06] px-6 py-4 text-[13.5px] leading-relaxed text-black/60">
          <p>
            <strong className="text-[#1c1a4e]">Eigen netwerk.</strong> Grote organisaties — gemeenten, ziekenhuizen,
            concerns — hebben een eigen IP-blok. Die herkennen we aan de eigenaar (gratis via ipinfo).
          </p>
          <p>
            <strong className="text-[#1c1a4e]">Eigen domein op de lijn.</strong> Een bedrijf met een vaste zakelijke
            internetlijn zet daar vaak zijn eigen naam op (<code className="font-mono text-[12.5px]">mail.bedrijf.nl</code>).
            Die lezen we via reverse DNS — zonder derde partij.
          </p>
          <p>
            <strong className="text-[#1c1a4e]">Wat je niet ziet.</strong> Thuiswerkers, mobiel internet en de meeste
            kleine bedrijven op een gewone KPN- of Ziggo-lijn. Betaalde diensten (Salesfeed, Leadinfo) hebben daar een
            eigen databank voor. De score weegt contact en diensten zwaar, vacatures en werknemerspagina&apos;s niet: dat
            zijn sollicitanten of werknemers van klanten.
          </p>
          <p>
            Er wordt geen IP-adres opgeslagen. Bij een eenmanszaak is de bedrijfsnaam een persoonsgegeven; gebruik dan{" "}
            <em>Vergeten</em> op de detailpagina als iemand daarom vraagt.
          </p>
        </div>
      </details>
    </div>
  );
}

function Row({ c, here, canCall, now }: { c: CompanySummary; here: string; canCall: boolean; now: Date }) {
  const href = `/admin/bezoek/bedrijven/${encodeURIComponent(c.key)}`;
  const referrers = [...new Set(c.sessions.map((s) => s.referrer).filter(Boolean))] as string[];
  return (
    <li className={`acard group flex flex-wrap items-center gap-x-4 gap-y-3 p-4 pr-3 transition hover:shadow-md sm:flex-nowrap ${c.ignored ? "opacity-60" : ""}`}>
      <Link href={href} className="flex min-w-0 flex-1 basis-full items-center gap-3.5 sm:basis-auto">
        <CompanyAvatar name={c.name} level={c.score.level} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-[#1c1a4e] group-hover:text-[#e75387]">{c.name}</p>
            <LevelPill level={c.score.level} value={c.score.value} />
            {c.lead && <LeadPill lead={c.lead} />}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-black/45">
            {c.domain && c.domain !== c.name && <span className="font-mono">{c.domain} · </span>}
            {c.sessions.length} bezoek{c.sessions.length === 1 ? "" : "en"} · {c.views} pagina&apos;s · laatst{" "}
            {waited(c.lastSeen, now)} geleden
            {referrers.length > 0 && ` · via ${referrers.slice(0, 2).join(", ")}`}
          </p>
          {c.score.hint ? (
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#c77700]">
              <LuTriangleAlert className="shrink-0 text-[12px]" /> {c.score.hint}
            </p>
          ) : c.score.signals.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.score.signals.map((s) => (
                <span key={s} className="apill bg-black/[0.04] !px-2 !py-0 !text-[11.5px] text-black/55">{s}</span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
      <div className="ml-[54px] flex shrink-0 items-center gap-1 sm:ml-0">
        {canCall && !c.lead && !c.ignored && (
          <form action={addLeadFromCompany.bind(null, c.key, here)}>
            <button className="abtn-ghost !py-1.5 text-[13px]">
              <LuPhoneCall className="text-[13px]" /> Op bellijst
            </button>
          </form>
        )}
        <form action={setCompanyIgnored.bind(null, c.key, c.name, c.domain, !c.ignored, here)}>
          <button
            className="rounded-lg p-2 text-black/35 transition hover:bg-black/5 hover:text-black/70"
            title={c.ignored ? "Weer volgen" : "Niet meer volgen — eigen kantoor, leverancier, of geen interesse"}
            aria-label={c.ignored ? `${c.name} weer volgen` : `${c.name} niet meer volgen`}
          >
            {c.ignored ? <LuEye className="text-[15px]" /> : <LuEyeOff className="text-[15px]" />}
          </button>
        </form>
        <Link href={href} className="rounded-lg p-2 text-black/30 transition hover:bg-black/5 hover:text-[#312e82]" aria-label={`${c.name} bekijken`}>
          <LuChevronRight className="text-[16px]" />
        </Link>
      </div>
    </li>
  );
}

/** Wat er nog aan moet om bedrijven te zien, in gewone taal. */
function Setup({ profilesReady }: { profilesReady: boolean }) {
  const notes: { tone: "stop" | "tip"; text: React.ReactNode }[] = [];
  if (!process.env.ANALYTICS_SALT) {
    notes.push({
      tone: "stop",
      text: (
        <>
          <strong>Bezoek wordt nu niet geregistreerd.</strong> Zet <code className="font-mono">ANALYTICS_SALT</code> in
          Vercel (een lange willekeurige tekst) en deploy opnieuw.
        </>
      ),
    });
  }
  if (!process.env.IPINFO_TOKEN) {
    notes.push({
      tone: "tip",
      text: (
        <>
          Herkenning via het eigen domein werkt al. Met een gratis token van ipinfo.io (Lite) zie je ook organisaties met
          een eigen netwerk: zet het als <code className="font-mono">IPINFO_TOKEN</code> in Vercel.
        </>
      ),
    });
  }
  if (!profilesReady) {
    notes.push({
      tone: "tip",
      text: <>Niet volgen en koppelen aan de bellijst werken na migratie <code className="font-mono">0010</code> in Supabase.</>,
    });
  }
  if (!notes.length) return null;
  return (
    <div className="space-y-2">
      {notes.map((n, i) => (
        <p
          key={i}
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13.5px] ${
            n.tone === "stop" ? "border-[#c77700]/25 bg-[#fff8ec] text-[#1c1a4e]" : "border-black/[0.07] bg-white text-black/60"
          }`}
        >
          {n.tone === "stop" ? <LuTriangleAlert className="mt-0.5 shrink-0 text-[#c77700]" /> : <LuInfo className="mt-0.5 shrink-0 text-black/35" />}
          <span>{n.text}</span>
        </p>
      ))}
    </div>
  );
}
