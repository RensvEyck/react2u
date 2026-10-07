import Link from "next/link";
import type { IconType } from "react-icons";
import {
  LuInbox, LuPhone, LuSearch, LuUsers, LuArrowRight, LuPlus, LuCircleCheck,
  LuMessageSquare, LuBuilding, LuFilePen, LuCalendarClock, LuTrendingUp, LuTrendingDown,
  LuCircleAlert, LuCheck, LuPhoneCall, LuServer, LuHistory,
} from "react-icons/lu";
import { requireAdmin } from "@/lib/admin";
import type { Permission } from "@/lib/permissions";
import type { Lead, Page, PageView, Post, Vacancy } from "@/lib/types";
import { needsCall, sortLeads, today, LEAD_STATUS } from "@/lib/leads";
import { byDay, lastDays, totals } from "@/lib/analytics";
import { summarize, type CompanyProfile } from "@/lib/companies";
import { LevelPill } from "@/components/admin/CompanyBits";
import { fetchPageViews } from "@/lib/analyticsDb";
import { analysePage, analysePost, analyseVacancy, countIssues } from "@/lib/seo";
import { actorName, collapseCascades, editHref, sentence, type Context, type Revision } from "@/lib/revisions";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import {
  daysBetween, firstName, greeting, longDate, systemChecks, trend, waited,
} from "@/lib/dashboard";

type InboxRow = { kind: "bericht" | "sollicitatie"; id: string; name: string; about: string; at: string };
type Draft = { key: string; kind: string; title: string; href: string; at: string };
type Expiring = { id: string; title: string; href: string; days: number };

const none = Promise.resolve({ data: null, count: 0 });

export default async function AdminDashboard() {
  const { sb, admin } = await requireAdmin();
  const can = (p: Permission) => admin.permissions.includes(p);
  const now = new Date();
  const day = today(now);
  const days14 = lastDays(14, now);

  // Alleen ophalen wat deze gebruiker mag zien. RLS zou de rest leeg
  // teruggeven, maar dan staat er een tegel met 0 die niet klopt.
  const contentPerms = can("paginas") || can("blog") || can("vacatures") || can("instellingen") || can("seo");
  const [msgsRes, appsRes, leadsRes, viewsRes, pagesRes, postsRes, vacanciesRes, missingRes, activityRes, profilesRes] = await Promise.all([
    can("postvak")
      ? sb.from("contact_messages").select("id, name, subject, created_at", { count: "exact" })
          .eq("read", false).order("created_at", { ascending: true }).limit(6)
      : none,
    can("postvak")
      ? sb.from("applications").select("id, name, vacancy_title, created_at", { count: "exact" })
          .eq("status", "nieuw").order("created_at", { ascending: true }).limit(6)
      : none,
    can("bellijst") ? sb.from("leads").select("*") : none,
    can("bezoek")
      // "*" zodat het vóór en na migratie 0010 werkt (company_domain wel of niet).
      ? fetchPageViews(sb, `${days14[0]}T00:00:00Z`, "*")
          .then((data) => ({ data, count: data.length }))
      : none,
    can("paginas") || can("seo") ? sb.from("pages").select("*").order("sort") : none,
    can("blog") || can("seo") ? sb.from("posts").select("*") : none,
    can("vacatures") || can("seo") ? sb.from("vacancies").select("*") : none,
    // Zonder migratie 0007 geeft dit een fout; count blijft dan leeg en telt als 0.
    can("seo") ? sb.from("missing_paths").select("path", { count: "exact", head: true }).eq("ignored", false) : none,
    // Wijzigingslog: RLS geeft alleen onderdelen die deze gebruiker mag zien.
    // Beginversies (zonder auteur) zijn geen wijziging van iemand en tellen niet mee.
    contentPerms
      ? sb.from("revisions").select("*").not("actor", "is", null).order("created_at", { ascending: false }).limit(24)
      : none,
    can("bezoek") ? sb.from("company_profiles").select("key, name, domain, ignored, lead_id") : none,
  ]);

  /* ---------- postvak ---------- */
  // Oudste eerst: wat het langst wacht, moet het eerst.
  const unhandled = (msgsRes.count ?? 0) + (appsRes.count ?? 0);
  const inbox: InboxRow[] = [
    ...(((msgsRes.data as { id: string; name: string; subject: string | null; created_at: string }[]) || []).map((m) => ({
      kind: "bericht" as const, id: m.id, name: m.name, about: m.subject || "Bericht via de website", at: m.created_at,
    }))),
    ...(((appsRes.data as { id: string; name: string; vacancy_title: string | null; created_at: string }[]) || []).map((a) => ({
      kind: "sollicitatie" as const, id: a.id, name: a.name, about: a.vacancy_title || "Open sollicitatie", at: a.created_at,
    }))),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const oldest = inbox[0];

  /* ---------- bellijst ---------- */
  const leads = (leadsRes.data as Lead[]) || [];
  const toCall = sortLeads(leads.filter((l) => needsCall(l, day)), day);
  const overdue = toCall.filter((l) => l.status === "terugbellen" && l.follow_up_on && l.follow_up_on < day).length;

  /* ---------- bezoek ---------- */
  const views = (viewsRes.data as PageView[]) || [];
  const weekStart = `${days14[7]}T00:00:00Z`;
  const current = views.filter((v) => v.created_at >= weekStart);
  const previous = views.filter((v) => v.created_at < weekStart);
  const visitors = totals(current).visitors;
  const visitorTrend = trend(visitors, totals(previous).visitors);
  const series = byDay(views, days14);
  const maxDay = Math.max(1, ...series.map((d) => d.visitors));
  // Dezelfde herkenning en score als Bezoek → Bedrijven, zonder wie niet gevolgd wordt.
  const followed = summarize(
    current.filter((v) => v.is_company),
    (profilesRes.data as CompanyProfile[]) || [],
    leads,
    now
  ).filter((c) => !c.ignored);
  const companies = followed.slice(0, 5);

  /* ---------- inhoud ---------- */
  const pages = (pagesRes.data as Page[]) || [];
  const posts = (postsRes.data as Post[]) || [];
  const vacancies = (vacanciesRes.data as Vacancy[]) || [];

  const drafts: Draft[] = [
    ...(can("paginas") ? pages.filter((p) => !p.published).map((p) => ({
      key: `p-${p.id}`, kind: "Pagina", title: p.title, href: `/admin/paginas/${p.slug}`, at: p.updated_at,
    })) : []),
    ...(can("blog") ? posts.filter((p) => p.status === "draft").map((p) => ({
      key: `b-${p.id}`, kind: "Artikel", title: p.title, href: `/admin/blog/${p.id}`, at: p.updated_at,
    })) : []),
    ...(can("vacatures") ? vacancies.filter((v) => v.status === "draft").map((v) => ({
      key: `v-${v.id}`, kind: "Vacature", title: v.title, href: `/admin/vacatures/${v.id}`, at: v.updated_at,
    })) : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  // Een live vacature met een verstreken einddatum valt uit Google for Jobs,
  // maar staat nog wél op de site. Dat wil je zien voordat een sollicitant het ziet.
  const expiring: Expiring[] = can("vacatures")
    ? vacancies
        .filter((v) => v.status === "published" && v.valid_through)
        .map((v) => ({ id: v.id, title: v.title, href: `/admin/vacatures/${v.id}`, days: daysBetween(day, v.valid_through!) }))
        .filter((v) => v.days <= 14)
        .sort((a, b) => a.days - b.days)
    : [];

  const seo = can("seo")
    ? countIssues([...pages.map(analysePage), ...posts.map(analysePost), ...vacancies.map(analyseVacancy)])
    : null;
  const open404 = missingRes.count ?? 0;
  const seoIssues = (seo?.errors ?? 0) + open404;

  const activity = collapseCascades((activityRes.data as Revision[]) || []).slice(0, 8);
  const ctx: Context = {
    pageTitles: new Map(pages.map((p) => [p.id, p.title])),
    pageSlugs: new Map(pages.map((p) => [p.id, p.slug])),
    blockLabels: BLOCK_TEMPLATES,
  };

  /* ---------- account en systeem ---------- */
  // Een herinnering "zet tweestapsverificatie aan" is er niet meer: zonder kom
  // je sinds 7 okt 2026 niet voorbij het inlogscherm (requireAdmin).
  const checks = can("instellingen") || can("gebruikers") ? systemChecks(process.env) : [];
  const failing = checks.filter((c) => !c.ok);

  const attention =
    (unhandled > 0 ? 1 : 0) + (toCall.length > 0 ? 1 : 0) + (seoIssues > 0 ? 1 : 0) +
    (expiring.length > 0 ? 1 : 0);

  const name = firstName(admin.email);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13.5px] font-medium text-black/40 first-letter:uppercase">{longDate(now)}</p>
          <h1 className="font-heading text-[28px] font-bold leading-tight text-[#312e82]">
            {greeting(now)}{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-0.5 text-[14.5px] text-black/50">
            {attention === 0
              ? "Niets dat op je wacht — alles is bij."
              : attention === 1
                ? "Er vraagt één ding je aandacht."
                : `Er vragen ${attention} dingen je aandacht.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {can("vacatures") && <Link href="/admin/vacatures/nieuw" className="abtn"><LuPlus /> Nieuwe vacature</Link>}
          {can("blog") && <Link href="/admin/blog/nieuw" className="abtn-ghost"><LuPlus className="text-[14px]" /> Nieuw artikel</Link>}
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {can("postvak") && (
          <Tile
            href={unhandled ? "/admin/postvak-in?filter=ongelezen" : "/admin/postvak-in"}
            icon={LuInbox}
            tint="bg-[#fdeef4] text-[#e0356b]"
            value={unhandled}
            label="Te behandelen"
            detail={oldest ? `Oudste wacht ${waited(oldest.at, now)}` : "Postvak is bij"}
            urgent={unhandled > 0}
          />
        )}
        {can("bellijst") && (
          <Tile
            href="/admin/bellijst"
            icon={LuPhone}
            tint="bg-[#eef0ff] text-[#312e82]"
            value={toCall.length}
            label="Vandaag bellen"
            detail={
              overdue ? `${overdue} terugbelafspraak${overdue === 1 ? "" : "en"} verlopen`
                : toCall.length ? "Op volgorde van urgentie" : "Niemand te bellen"
            }
            urgent={overdue > 0}
          />
        )}
        {can("bezoek") && (
          <Tile
            href="/admin/bezoek"
            icon={LuUsers}
            tint="bg-[#e6f7f4] text-[#0e9f8a]"
            value={visitors}
            label="Bezoekers deze week"
            detail={
              visitorTrend === null ? `${followed.length} bedrijf${followed.length === 1 ? "" : "en"} herkend`
                : `${visitorTrend >= 0 ? "+" : ""}${visitorTrend}% t.o.v. vorige week`
            }
            trendUp={visitorTrend === null ? undefined : visitorTrend >= 0}
          />
        )}
        {seo && (
          <Tile
            href={open404 && !seo.errors ? "/admin/seo/doorverwijzingen" : "/admin/seo"}
            icon={LuSearch}
            tint="bg-[#fff4e5] text-[#c77700]"
            value={seoIssues}
            label="SEO-aandachtspunten"
            detail={
              seoIssues === 0 ? "Titels, omschrijvingen en adressen in orde"
                : [
                    seo.errors ? `${seo.errors} zonder titel of omschrijving` : "",
                    open404 ? `${open404} adres${open404 === 1 ? "" : "sen"} geeft 404` : "",
                  ].filter(Boolean).join(" · ")
            }
            urgent={seoIssues > 0}
          />
        )}
      </div>

      {(can("postvak") || can("bellijst")) && (
        <div className={`grid gap-6 ${can("postvak") && can("bellijst") ? "lg:grid-cols-2" : ""}`}>
          {can("postvak") && (
            <Panel title="Te behandelen" href="/admin/postvak-in" linkLabel="Postvak IN">
              {inbox.length === 0 ? (
                <Done text="Niets meer te behandelen." />
              ) : (
                inbox.slice(0, 5).map((r) => (
                  <Link
                    key={`${r.kind}-${r.id}`}
                    href={`/admin/postvak-in?filter=${r.kind === "bericht" ? "berichten" : "sollicitaties"}#${r.kind}-${r.id}`}
                    className="flex items-center gap-3.5 px-6 py-3.5 transition hover:bg-[#fafafd]"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] ${
                      r.kind === "bericht" ? "bg-[#fff4e5] text-[#c77700]" : "bg-[#eef0ff] text-[#312e82]"
                    }`}>
                      {r.kind === "bericht" ? <LuMessageSquare /> : <LuUsers />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">{r.name}</p>
                      <p className="truncate text-[12.5px] text-black/45">{r.about}</p>
                    </div>
                    <span className="shrink-0 text-[12px] tabular-nums text-black/35">wacht {waited(r.at, now)}</span>
                  </Link>
                ))
              )}
            </Panel>
          )}

          {can("bellijst") && (
            <Panel title="Vandaag bellen" href="/admin/bellijst" linkLabel="Bellijst">
              {toCall.length === 0 ? (
                <Done text="Niemand te bellen — de lijst is bij." />
              ) : (
                toCall.slice(0, 5).map((l) => {
                  const late = l.status === "terugbellen" && l.follow_up_on && l.follow_up_on < day;
                  const firstNote = l.notes?.split("\n").find((s) => s.trim());
                  return (
                    <div key={l.id} className="flex items-center gap-3.5 px-6 py-3">
                      <Link href={`/admin/bellijst?filter=alles#lead-${l.id}`} className="group min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e] group-hover:text-[#e75387]">{l.name}</p>
                          <span className={`apill shrink-0 !px-2 !py-0 !text-[11px] ${late ? "bg-[#fdeef4] text-[#e0356b]" : LEAD_STATUS[l.status].cls}`}>
                            {late ? "Verlopen" : LEAD_STATUS[l.status].label}
                          </span>
                        </div>
                        <p className="truncate text-[12.5px] text-black/45">
                          {[l.company, firstNote].filter(Boolean).join(" · ") || "Geen notities"}
                        </p>
                      </Link>
                      {l.phone ? (
                        <a
                          href={`tel:${l.phone.replace(/\s/g, "")}`}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#e75387] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#d43d73]"
                          aria-label={`Bel ${l.name}`}
                        >
                          <LuPhoneCall className="text-[13px]" /> <span className="hidden sm:inline">Bel</span>
                        </a>
                      ) : (
                        <span className="shrink-0 text-[12px] text-black/30">geen nummer</span>
                      )}
                    </div>
                  );
                })
              )}
            </Panel>
          )}
        </div>
      )}

      {can("bezoek") && (
        <div className="acard overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Bezoek, afgelopen twee weken</h2>
            <Link href="/admin/bezoek" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
              Alle cijfers <LuArrowRight className="text-[13px]" />
            </Link>
          </div>
          <div className="grid gap-8 p-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div
                className="flex h-[120px] items-end gap-1.5"
                role="img"
                aria-label={`Bezoekers per dag, oudste eerst: ${series.map((d) => d.visitors).join(", ")}`}
              >
                {series.map((d, i) => (
                  <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                    <div
                      className={`w-full rounded-t-[5px] transition-colors ${i < 7 ? "bg-[#312e82]/20" : "bg-[#312e82]/85"} group-hover:bg-[#e75387]`}
                      style={{ height: `${Math.max(3, (d.visitors / maxDay) * 100)}%` }}
                    />
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1c1a4e] px-2 py-1 text-[11px] text-white group-hover:block">
                      {new Date(d.day).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} · {d.visitors} bezoekers
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-black/35">
                <span>vorige week</span>
                <span>deze week</span>
              </div>
            </div>
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-black/35">
                <LuBuilding className="text-[13px]" /> Bedrijven deze week
              </p>
              {companies.length === 0 ? (
                <p className="text-[13.5px] text-black/40">
                  {process.env.ANALYTICS_SALT ? "Nog geen bedrijf herkend deze week." : "Bezoekregistratie staat uit."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {companies.map((c) => (
                    <li key={c.key}>
                      <Link
                        href={`/admin/bezoek/bedrijven/${encodeURIComponent(c.key)}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[#fafafd]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[14px] font-medium text-[#1c1a4e]">{c.name}</span>
                          {c.score.level !== "koud" && <LevelPill level={c.score.level} value={c.score.value} />}
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-black/40">{c.sessions.length}× · {waited(c.lastSeen, now)} geleden</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {(drafts.length > 0 || expiring.length > 0) && (
        <div className={`grid gap-6 ${drafts.length && expiring.length ? "lg:grid-cols-2" : ""}`}>
          {drafts.length > 0 && (
            <Panel title="Nog niet gepubliceerd" icon={LuFilePen}>
              {drafts.slice(0, 5).map((d) => (
                <Link key={d.key} href={d.href} className="flex items-center gap-3 px-6 py-3 transition hover:bg-[#fafafd]">
                  <span className="apill shrink-0 bg-black/[0.05] !text-[11px] text-black/50">{d.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1c1a4e]">{d.title}</span>
                  <span className="shrink-0 text-[12px] text-black/35">{waited(d.at, now)} geleden</span>
                </Link>
              ))}
            </Panel>
          )}
          {expiring.length > 0 && (
            <Panel title="Vacatures die aflopen" icon={LuCalendarClock}>
              {expiring.map((v) => (
                <Link key={v.id} href={v.href} className="flex items-center gap-3 px-6 py-3 transition hover:bg-[#fafafd]">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1c1a4e]">{v.title}</span>
                  <span className={`apill shrink-0 !text-[11.5px] ${v.days < 0 ? "bg-[#fdeef4] text-[#e0356b]" : "bg-[#fff4e5] text-[#c77700]"}`}>
                    {v.days < 0 ? "Verlopen, staat nog live" : v.days === 0 ? "Loopt vandaag af" : `Nog ${v.days} dag${v.days === 1 ? "" : "en"}`}
                  </span>
                </Link>
              ))}
            </Panel>
          )}
        </div>
      )}

      {activity.length > 0 && (
        <Panel title="Laatste wijzigingen" icon={LuHistory} href="/admin/prullenbak" linkLabel="Prullenbak">
          {activity.map((r) => {
            const who = actorName(r, admin.userId) || "Iemand";
            const href = r.action === "delete" ? "/admin/prullenbak" : editHref(r, ctx);
            const body = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[12.5px] font-bold text-[#312e82]">
                  {who === "Jij" ? (firstName(admin.email)?.[0] || "J") : who[0].toUpperCase()}
                </span>
                <p className="min-w-0 flex-1 truncate text-[14px] text-black/60">
                  <span className="font-semibold text-[#1c1a4e]">{who}</span> {sentence(r, ctx)}
                </p>
                <span className="shrink-0 text-[12px] text-black/35">{waited(r.created_at, now)} geleden</span>
              </>
            );
            return href ? (
              <Link key={r.id} href={href} className="flex items-center gap-3 px-6 py-3 transition hover:bg-[#fafafd]">{body}</Link>
            ) : (
              <div key={r.id} className="flex items-center gap-3 px-6 py-3">{body}</div>
            );
          })}
        </Panel>
      )}

      {checks.length > 0 && (
        <div className="acard px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <LuServer className="text-[15px] text-black/35" />
            <h2 className="font-heading text-[15px] font-bold text-[#312e82]">Koppelingen</h2>
            <span className={`apill ml-auto !text-[11.5px] ${failing.length ? "bg-[#fff4e5] text-[#c77700]" : "bg-[#e6f7f4] text-[#0e9f8a]"}`}>
              {failing.length ? `${failing.length} van ${checks.length} uit` : "Alles aan"}
            </span>
          </div>
          <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2.5">
                {c.ok
                  ? <LuCheck className="mt-[3px] shrink-0 text-[14px] text-[#0e9f8a]" />
                  : <LuCircleAlert className="mt-[3px] shrink-0 text-[14px] text-[#c77700]" />}
                <div>
                  <p className="text-[14px] font-medium text-[#1c1a4e]">{c.label}</p>
                  {!c.ok && <p className="text-[12.5px] leading-snug text-black/45">{c.impact}</p>}
                </div>
              </li>
            ))}
          </ul>
          {failing.length > 0 && (
            <p className="mt-3 text-[12.5px] text-black/40">
              Aanzetten gaat met omgevingsvariabelen in Vercel (Settings → Environment Variables), daarna opnieuw deployen.
            </p>
          )}
        </div>
      )}

      <p className="text-center text-[12.5px] text-black/35">
        Tip: druk op <kbd className="akbd">⌘K</kbd> om overal naartoe te springen of iets te zoeken.
      </p>
    </div>
  );
}

function Tile({
  href, icon: Icon, tint, value, label, detail, urgent, trendUp,
}: {
  href: string;
  icon: IconType;
  tint: string;
  value: number;
  label: string;
  detail: string;
  urgent?: boolean;
  trendUp?: boolean;
}) {
  const tone = urgent ? "text-[#e0356b]"
    : trendUp === true ? "text-[#0e9f8a]"
    : trendUp === false ? "text-[#c77700]"
    : "text-black/40";
  return (
    <Link
      href={href}
      className={`acard group relative flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${
        urgent ? "ring-1 ring-[#e75387]/25" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-[18px] ${tint}`}>
          <Icon />
        </span>
        <LuArrowRight className="text-black/20 transition group-hover:translate-x-1 group-hover:text-[#e75387]" />
      </div>
      <div>
        <p className="font-heading text-[26px] font-bold leading-none tabular-nums text-[#1c1a4e] sm:text-[30px]">{value}</p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-black/60 sm:text-[13.5px]">{label}</p>
        <p className={`mt-0.5 flex items-start gap-1 text-[12px] leading-snug sm:text-[12.5px] ${tone}`}>
          {trendUp === true && <LuTrendingUp className="mt-px shrink-0 text-[13px]" />}
          {trendUp === false && <LuTrendingDown className="mt-px shrink-0 text-[13px]" />}
          {detail}
        </p>
      </div>
    </Link>
  );
}

function Panel({
  title, href, linkLabel, icon: Icon, children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: IconType;
  children: React.ReactNode;
}) {
  return (
    <div className="acard overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          {Icon && <Icon className="text-[16px] text-black/35" />} {title}
        </h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            {linkLabel} <LuArrowRight className="text-[13px]" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-black/[0.05]">{children}</div>
    </div>
  );
}

function Done({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <LuCircleCheck className="text-[26px] text-[#0e9f8a]/70" />
      <p className="text-[14px] text-black/45">{text}</p>
    </div>
  );
}
