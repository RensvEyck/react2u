import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import {
  totals, byDay, lastDays, topPaths, topReferrers, topCountries,
  type Ranked,
} from "@/lib/analytics";
import { fetchPageViews } from "@/lib/analyticsDb";
import { fetchConversions } from "@/lib/conversionsDb";
import { byKind, byPath, overallRate } from "@/lib/conversions";
import { loadCompanies } from "@/lib/companiesDb";
import { waited } from "@/lib/dashboard";
import BezoekTabs from "@/components/admin/BezoekTabs";
import { CompanyAvatar, LeadPill, LevelPill } from "@/components/admin/CompanyBits";
import { LuUsers, LuEye, LuBuilding, LuExternalLink, LuInfo, LuArrowRight, LuInbox } from "react-icons/lu";

const RANGES = [
  { key: "7", label: "7 dagen" },
  { key: "30", label: "30 dagen" },
  { key: "90", label: "90 dagen" },
] as const;

function List({ title, rows, empty }: { title: string; rows: Ranked[]; empty: string }) {
  const max = rows[0]?.count || 1;
  return (
    <div className="acard">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">{title}</h2>
      </div>
      <div className="divide-y divide-black/[0.05]">
        {rows.length === 0 && <p className="px-6 py-8 text-center text-[13.5px] text-black/40">{empty}</p>}
        {rows.map((r) => (
          <div key={r.label} className="relative px-6 py-3">
            <div
              className="absolute inset-y-0 left-0 bg-[#eef0ff]"
              style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-4">
              <span className="truncate text-[14px] text-[#1c1a4e]" title={r.label}>{r.label}</span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-black/45">{r.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BezoekAdmin({
  searchParams,
}: {
  searchParams: Promise<{ dagen?: string }>;
}) {
  const { dagen } = await searchParams;
  const range = RANGES.some((r) => r.key === dagen) ? Number(dagen) : 7;

  const { sb, admin } = await requirePerm("bezoek");
  const days = lastDays(range);
  const since = `${days[0]}T00:00:00Z`;

  const [views, { companies: all }, { conversions, ready: conversiesKlaar }] = await Promise.all([
    fetchPageViews(sb, since),
    loadCompanies(sb, range, admin.permissions),
    fetchConversions(sb, since),
  ]);
  const t = totals(views);
  const perSoort = byKind(conversions);
  const perPagina = byPath(conversions, views).slice(0, 10);
  const conversie = overallRate(conversions, t.visitors);
  const series = byDay(views, days);
  const companies = all.filter((c) => !c.ignored);
  const warm = companies.filter((c) => c.score.level === "warm").length;
  const maxDay = Math.max(1, ...series.map((d) => d.views));
  const herkend = views.filter((v) => v.is_company).length;
  const aandeel = views.length ? Math.round((herkend / views.length) * 100) : 0;

  const stats = [
    { label: "Bezoekers", value: String(t.visitors), icon: LuUsers, tint: "bg-[#eef0ff] text-[#312e82]" },
    { label: "Paginaweergaven", value: String(t.views), icon: LuEye, tint: "bg-[#e6f7f4] text-[#0e9f8a]" },
    { label: "Herkende bedrijven", value: String(companies.length), icon: LuBuilding, tint: "bg-[#fdeef4] text-[#e0356b]" },
    {
      label: conversie === null ? "Aanvragen" : `Aanvragen · ${String(conversie).replace(".", ",")}% van de bezoekers`,
      value: String(conversions.length),
      icon: LuInbox,
      tint: "bg-[#fff4e5] text-[#c77700]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Bezoek</h1>
          <p className="text-[14.5px] text-black/50">
            Wie er op de website komt. Adminverkeer telt niet mee.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => {
            const active = Number(r.key) === range;
            return (
              <Link
                key={r.key}
                href={r.key === "7" ? "/admin/bezoek" : `/admin/bezoek?dagen=${r.key}`}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition ${
                  active ? "border-[#312e82] bg-[#312e82] text-white"
                         : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>

      <BezoekTabs active="overzicht" warm={warm} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="acard flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[20px] ${s.tint}`}>
              <s.icon />
            </div>
            <div>
              <p className="font-heading text-[26px] font-bold leading-none text-[#1c1a4e]">{s.value}</p>
              <p className="mt-1 text-[13px] font-medium text-black/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="acard p-6">
        <h2 className="mb-5 font-heading text-[16px] font-bold text-[#312e82]">Per dag</h2>
        <div className="flex h-[150px] items-end gap-1">
          {series.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-[#312e82]/85 transition group-hover:bg-[#e75387]"
                style={{ height: `${Math.max(2, (d.views / maxDay) * 130)}px` }}
              />
              <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-lg bg-[#1c1a4e] px-2 py-1 text-[11px] text-white group-hover:block">
                {d.views} weergaven · {d.visitors} bezoekers
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11.5px] text-black/35">
          <span>{new Date(days[0]).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
          <span>{new Date(days[days.length - 1]).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
        </div>
      </div>

      <div className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div>
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Bedrijven die langskwamen</h2>
            <p className="text-[12.5px] text-black/40">{aandeel}% van het verkeer herleidbaar tot een bedrijf · warmste eerst</p>
          </div>
          <Link href={`/admin/bezoek/bedrijven${range !== 30 ? `?dagen=${range}` : ""}`} className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            Alle bedrijven <LuArrowRight className="text-[13px]" />
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <LuBuilding className="mx-auto text-[24px] text-black/20" />
            <p className="mt-3 text-[14px] text-black/45">Nog geen bedrijf herkend in deze periode.</p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {companies.slice(0, 6).map((c) => (
              <li key={c.key}>
                <Link href={`/admin/bezoek/bedrijven/${encodeURIComponent(c.key)}`} className="flex items-center gap-3.5 px-6 py-3.5 transition hover:bg-[#fafafd]">
                  <CompanyAvatar name={c.name} level={c.score.level} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">{c.name}</p>
                      <LevelPill level={c.score.level} value={c.score.value} />
                      {c.lead && <LeadPill lead={c.lead} />}
                    </div>
                    <p className="truncate text-[12.5px] text-black/45">
                      {c.sessions.length} bezoek{c.sessions.length === 1 ? "" : "en"} · {c.pages.slice(0, 3).map((p) => p.path).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-black/35">{waited(c.lastSeen, new Date())} geleden</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conversies: wat levert de site op, en welke pagina doet dat. */}
      <div className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div>
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Aanvragen per pagina</h2>
            <p className="text-[12.5px] text-black/40">
              Elk verstuurd formulier telt als aanvraag, met de pagina waar het stond. Conversie = aanvragen per honderd bezoekers van die pagina.
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-black/55">
            {perSoort.map((k) => (
              <li key={k.kind}><span className="font-semibold tabular-nums text-[#1c1a4e]">{k.count}</span> {k.label.toLowerCase()}</li>
            ))}
          </ul>
        </div>
        {!conversiesKlaar ? (
          <p className="px-6 py-8 text-center text-[13.5px] text-black/45">
            Aanvragen meten werkt na migratie <code className="font-mono">0013</code> in Supabase.
          </p>
        ) : perPagina.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13.5px] text-black/40">Nog geen aanvragen in deze periode.</p>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-black/40">
                <th scope="col" className="px-6 py-2.5 font-semibold">Pagina</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Bezoekers</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Aanvragen</th>
                <th scope="col" className="px-6 py-2.5 text-right font-semibold">Conversie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {perPagina.map((r) => (
                <tr key={r.path}>
                  <td className="truncate px-6 py-3 text-[#1c1a4e]" title={r.path}>{r.path}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-black/55">{r.visitors}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#1c1a4e]">{r.conversions}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-black/55">{r.rate === null ? "–" : `${String(r.rate).replace(".", ",")}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <List title="Populairste pagina's" rows={topPaths(views)} empty="Nog geen bezoek geregistreerd." />
        <List title="Verwijzende sites" rows={topReferrers(views)} empty="Nog geen verwijzingen — bezoekers komen direct." />
      </div>

      <List title="Landen" rows={topCountries(views)} empty="Nog geen gegevens." />

      <div className="acard flex items-start gap-3 px-6 py-5 text-[13.5px] text-black/55">
        <LuInfo className="mt-0.5 shrink-0 text-[15px] text-black/30" />
        <p>
          Er worden geen IP-adressen opgeslagen — alleen de organisatie erachter en een
          bezoekershash die elke nacht verandert. Bedrijfsherkenning werkt alleen bij bezoek
          vanaf een bedrijfsnetwerk; thuiswerkers en mobiel verkeer blijven onherkenbaar.
          Uitgebreidere cijfers staan in{" "}
          <a
            href="https://vercel.com/flex-hero-s-projects/react2u/analytics"
            target="_blank"
            rel="noopener"
            className="font-semibold text-[#e75387] hover:underline"
          >
            Vercel Analytics <LuExternalLink className="inline text-[11px]" />
          </a>.
        </p>
      </div>
    </div>
  );
}
