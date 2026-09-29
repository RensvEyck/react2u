import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { addLeadFromCompany, forgetCompany, setCompanyIgnored } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { CompanyAvatar, LeadPill, LevelPill, SOURCE_LABEL } from "@/components/admin/CompanyBits";
import { loadCompanies } from "@/lib/companiesDb";
import { INTENT, researchLinks } from "@/lib/companies";
import { waited, when } from "@/lib/dashboard";
import {
  LuArrowLeft, LuPhoneCall, LuEyeOff, LuEye, LuExternalLink, LuTriangleAlert, LuEraser, LuArrowRight, LuClock,
} from "react-icons/lu";

const TZ = "Europe/Amsterdam";
const time = (iso: string) => new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

function minutes(start: string, end: string) {
  const m = Math.round((Date.parse(end) - Date.parse(start)) / 60_000);
  return m < 1 ? "minder dan een minuut" : `${m} min`;
}

export default async function BedrijfDetail({ params }: { params: Promise<{ key: string }> }) {
  const raw = (await params).key;
  let key = raw;
  try {
    key = decodeURIComponent(raw);
  } catch {
    // Al gedecodeerd, of kapot: dan de ruwe waarde.
  }
  const { sb, admin } = await requirePerm("bezoek");
  const { companies } = await loadCompanies(sb, 90, admin.permissions);
  const c = companies.find((x) => x.key === key);
  if (!c) notFound();

  const back = `/admin/bezoek/bedrijven/${encodeURIComponent(c.key)}`;
  const canCall = admin.permissions.includes("bellijst");
  const now = new Date();
  const days = new Set(c.sessions.map((s) => s.start.slice(0, 10))).size;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/bezoek/bedrijven" className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
          <LuArrowLeft className="text-[12px]" /> Alle bedrijven
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyAvatar name={c.name} level={c.score.level} size={52} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate font-heading text-[24px] font-bold text-[#312e82]">{c.name}</h1>
                <LevelPill level={c.score.level} value={c.score.value} />
                {c.lead && <LeadPill lead={c.lead} />}
                {c.ignored && <span className="apill bg-black/[0.05] !text-[11.5px] text-black/45">Niet volgen</span>}
              </div>
              <p className="mt-0.5 text-[13px] text-black/45">
                {c.domain && c.domain !== c.name && <span className="font-mono">{c.domain} · </span>}
                {c.source && <span title={SOURCE_LABEL[c.source].explain}>herkend aan {SOURCE_LABEL[c.source].label}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.lead ? (
              <Link href={`/admin/bellijst?filter=alles#lead-${c.lead.id}`} className="abtn-ghost">
                <LuPhoneCall className="text-[14px]" /> Naar de lead
              </Link>
            ) : canCall && !c.ignored ? (
              <form action={addLeadFromCompany.bind(null, c.key, back)}>
                <button className="abtn"><LuPhoneCall className="text-[14px]" /> Op bellijst</button>
              </form>
            ) : null}
            <form action={setCompanyIgnored.bind(null, c.key, c.name, c.domain, !c.ignored, back)}>
              <button className="abtn-ghost" title="Niet meer volgen: verbergen, en nieuwe bezoeken zonder bedrijfsnaam opslaan">
                {c.ignored ? <><LuEye className="text-[14px]" /> Weer volgen</> : <><LuEyeOff className="text-[14px]" /> Niet volgen</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {c.score.hint && (
        <p className="flex items-center gap-2.5 rounded-2xl border border-[#c77700]/20 bg-[#fff8ec] px-5 py-3.5 text-[14px] text-[#1c1a4e]">
          <LuTriangleAlert className="shrink-0 text-[16px] text-[#c77700]" /> {c.score.hint}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Bezoeken", value: String(c.sessions.length), sub: days > 1 ? `op ${days} dagen` : "op één dag" },
          { label: "Pagina's bekeken", value: String(c.views), sub: `${c.pages.length} verschillende` },
          { label: "Eerste bezoek", value: when(c.firstSeen), sub: `${waited(c.firstSeen, now)} geleden` },
          { label: "Laatste bezoek", value: when(c.lastSeen), sub: `${waited(c.lastSeen, now)} geleden` },
        ].map((s) => (
          <div key={s.label} className="acard p-4 sm:p-5">
            <p className="text-[12.5px] font-semibold text-black/45">{s.label}</p>
            <p className="mt-1 font-heading text-[20px] font-bold leading-tight text-[#1c1a4e] first-letter:uppercase">{s.value}</p>
            <p className="text-[12px] text-black/40">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="acard self-start overflow-hidden">
          <div className="border-b border-black/[0.06] px-6 py-4">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Bezoeken</h2>
          </div>
          <ol className="divide-y divide-black/[0.05]">
            {c.sessions.map((s) => (
              <li key={s.start + s.pages[0].path} className="px-6 py-4">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px]">
                  <span className="font-semibold text-[#1c1a4e] first-letter:uppercase">{when(s.start)}</span>
                  <span className="flex items-center gap-1 text-[12.5px] text-black/40">
                    <LuClock className="text-[11px]" /> {minutes(s.start, s.end)}
                  </span>
                  <span className="text-[12.5px] text-black/40">{s.referrer ? `via ${s.referrer}` : "direct of onbekend"}</span>
                </p>
                <ol className="mt-2 space-y-1">
                  {s.pages.map((p, i) => {
                    const intent = INTENT.find((x) => x.test.test(p.path));
                    return (
                      <li key={i} className="flex items-center gap-2.5 text-[13.5px]">
                        <span className="w-10 shrink-0 font-mono text-[12px] tabular-nums text-black/35">{time(p.at)}</span>
                        <span className="min-w-0 truncate font-mono text-[#312e82]">{p.path}</span>
                        {intent && intent.weight >= 2 && (
                          <span className="apill shrink-0 bg-[#fdeef4] !px-1.5 !py-0 !text-[10.5px] text-[#e0356b]">{intent.label}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section className="acard p-6">
            <h2 className="mb-2 font-heading text-[16px] font-bold text-[#312e82]">Waarom {c.score.level}</h2>
            {c.score.signals.length ? (
              <ul className="space-y-1.5 text-[14px] text-black/65">
                {c.score.signals.map((s) => (
                  <li key={s} className="flex items-center gap-2"><LuArrowRight className="shrink-0 text-[12px] text-[#e75387]" /> {s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-black/45">Eén kort bezoek, zonder pagina&apos;s die op interesse wijzen.</p>
            )}
            <p className="mt-3 text-[12.5px] text-black/40">
              Contact en diensten wegen zwaar, terugkomen ook. Vacatures en werknemerspagina&apos;s tellen niet mee.
            </p>
          </section>

          <section className="acard p-6">
            <h2 className="mb-3 font-heading text-[16px] font-bold text-[#312e82]">Meest bekeken</h2>
            <ul className="space-y-1.5">
              {c.pages.slice(0, 8).map((p) => (
                <li key={p.path} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="truncate font-mono text-[#312e82]">{p.path}</span>
                  <span className="shrink-0 tabular-nums text-black/40">{p.count}×</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="acard p-6">
            <h2 className="mb-3 font-heading text-[16px] font-bold text-[#312e82]">Uitzoeken</h2>
            <div className="flex flex-wrap gap-2">
              {researchLinks(c.name, c.domain).map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="abtn-ghost !py-1.5 text-[13px]">
                  {l.label} <LuExternalLink className="text-[12px]" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-black/40">
              Zoek wie er werkt en wie over verzuim gaat — vaak HR of de directeur.
            </p>
          </section>

          <div className="px-1">
            <ConfirmButton
              action={forgetCompany.bind(null, c.key, c.name, c.domain)}
              message={`${c.name} vergeten? De bedrijfsnaam verdwijnt uit alle eerdere bezoeken en wordt niet meer vastgelegd. Dit kan niet ongedaan worden gemaakt.`}
              className="flex items-center gap-1.5 text-[13px] text-black/40 underline-offset-2 hover:text-[#e0356b] hover:underline"
            >
              <LuEraser className="text-[13px]" /> Vergeten — voor een verzoek om verwijdering
            </ConfirmButton>
          </div>
        </div>
      </div>
    </div>
  );
}
