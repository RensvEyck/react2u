import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { deleteRedirect, saveRedirect, setMissingIgnored } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import PathField, { type PathOption } from "@/components/admin/PathField";
import SeoTabs from "@/components/admin/SeoTabs";
import { waited } from "@/lib/dashboard";
import { isMissingTable } from "@/lib/dbErrors";
import {
  suggestDestination, WORDPRESS_REDIRECTS, type MissingPath, type Redirect,
} from "@/lib/redirects";
import {
  LuArrowRight, LuTrash2, LuEyeOff, LuEye, LuCircleCheck, LuExternalLink, LuLink2Off, LuTriangleAlert,
  LuChevronDown, LuSparkles, LuDatabase,
} from "react-icons/lu";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "genegeerd", label: "Genegeerd" },
] as const;

export default async function RedirectsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; bron?: string; doel?: string; verwijderd?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter === "genegeerd" ? "genegeerd" : "open";
  const { sb } = await requirePerm("seo");

  const [redirectsRes, missingRes, pagesRes, postsRes, vacanciesRes] = await Promise.all([
    sb.from("redirects").select("*").order("created_at", { ascending: false }),
    sb.from("missing_paths").select("*").order("hits", { ascending: false }).order("last_seen", { ascending: false }).limit(300),
    sb.from("pages").select("slug, title, published").order("sort"),
    sb.from("posts").select("slug, title, status"),
    sb.from("vacancies").select("slug, title, status"),
  ]);

  if (isMissingTable(redirectsRes.error) || isMissingTable(missingRes.error)) return <SetupNeeded />;

  const redirects = (redirectsRes.data as Redirect[]) || [];
  const missing = (missingRes.data as MissingPath[]) || [];
  const open = missing.filter((m) => !m.ignored);
  const ignored = missing.filter((m) => m.ignored);
  const shown = filter === "open" ? open : ignored;

  // Alleen wat live staat: een doorverwijzing naar een concept is een 404.
  const options: PathOption[] = [
    { path: "/", label: "Home", kind: "Pagina" },
    ...((pagesRes.data as { slug: string; title: string; published: boolean }[]) || [])
      .filter((p) => p.published && p.slug !== "home")
      .map((p) => ({ path: `/${p.slug}`, label: p.title, kind: "Pagina" })),
    { path: "/blog", label: "Blog", kind: "Overzicht" },
    ...((postsRes.data as { slug: string; title: string; status: string }[]) || [])
      .filter((p) => p.status === "published")
      .map((p) => ({ path: `/blog/${p.slug}`, label: p.title, kind: "Artikel" })),
    { path: "/vacatures", label: "Vacatures", kind: "Overzicht" },
    { path: "/vacatures/open-sollicitatie", label: "Open sollicitatie", kind: "Pagina" },
    ...((vacanciesRes.data as { slug: string; title: string; status: string }[]) || [])
      .filter((v) => v.status === "published")
      .map((v) => ({ path: `/vacatures/${v.slug}`, label: v.title, kind: "Vacature" })),
  ];

  const now = new Date();
  const totalHits = redirects.reduce((n, r) => n + r.hits, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">SEO</h1>
        <p className="text-[14.5px] text-black/50">
          Stuur oude of verkeerde adressen door, zodat bezoekers en Google gewoon aankomen.
        </p>
      </div>

      <SeoTabs active="doorverwijzingen" open404={open.length} />

      {sp.verwijderd && sp.bron && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#312e82]/15 bg-[#f4f3fd] px-5 py-4">
          <LuTriangleAlert className="mt-0.5 shrink-0 text-[17px] text-[#312e82]" />
          <p className="text-[14px] text-[#1c1a4e]">
            {sp.verwijderd === "artikel" ? "Het artikel" : "De pagina"} is verwijderd. Het adres{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">{sp.bron}</code> kan nog in Google of
            in een mail staan — kies hieronder waar het voortaan heen gaat. Laat je het leeg, dan krijgen bezoekers de
            404-pagina.
          </p>
        </div>
      )}

      {/* ---------- 404's ---------- */}
      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div>
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Niet gevonden</h2>
            <p className="text-[13px] text-black/45">Adressen waarop bezoekers de afgelopen maanden een 404 kregen, vaakst eerst.</p>
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => {
              const active = f.key === filter;
              const count = f.key === "open" ? open.length : ignored.length;
              return (
                <Link
                  key={f.key}
                  href={f.key === "open" ? "/admin/seo/doorverwijzingen" : "/admin/seo/doorverwijzingen?filter=genegeerd"}
                  className={`rounded-full border px-3.5 py-1 text-[13px] font-semibold transition ${
                    active ? "border-[#312e82] bg-[#312e82] text-white" : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 text-[12px] ${active ? "text-white/60" : "text-black/35"}`}>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <LuCircleCheck className="text-[26px] text-[#0e9f8a]/70" />
            <p className="text-[14px] text-black/45">
              {filter === "open"
                ? "Geen openstaande 404's — alles wat bezoekers opvragen, bestaat."
                : "Niets genegeerd."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {shown.map((m) => {
              const suggestion = suggestDestination(m.path, options);
              const internal = m.last_referrer?.startsWith("/");
              return (
                <li key={m.path} className="px-6 py-4">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-mono text-[14px] font-medium text-[#1c1a4e]">{m.path}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-black/45">
                        <span className="font-semibold tabular-nums text-black/60">{m.hits}×</span>
                        <span>laatst {waited(m.last_seen, now)} geleden</span>
                        {m.last_referrer && (internal ? (
                          <span className="flex items-center gap-1 font-medium text-[#e0356b]">
                            <LuLink2Off className="text-[12px]" /> kapotte link op {m.last_referrer}
                          </span>
                        ) : (
                          <span>via {m.last_referrer}</span>
                        ))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {filter === "open" ? (
                        <form action={setMissingIgnored.bind(null, m.path, true)}>
                          <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-black/40 hover:bg-black/5 hover:text-black/70" title="Uit de lijst halen — bijvoorbeeld bots die naar /wp-login zoeken">
                            <LuEyeOff className="text-[13px]" /> Negeren
                          </button>
                        </form>
                      ) : (
                        <form action={setMissingIgnored.bind(null, m.path, false)}>
                          <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-black/40 hover:bg-black/5 hover:text-black/70">
                            <LuEye className="text-[13px]" /> Terugzetten
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-start gap-2">
                    {suggestion && (
                      <form action={saveRedirect}>
                        <input type="hidden" name="source" value={m.path} />
                        <input type="hidden" name="destination" value={suggestion.path} />
                        <button
                          className="inline-flex items-center gap-2 rounded-xl bg-[#312e82] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#23205f]"
                          title={`Doorsturen naar "${suggestion.label}"`}
                        >
                          <LuSparkles className="text-[13px] text-[#ff8ab5]" />
                          <span>Doorsturen naar <span className="font-mono font-medium">{suggestion.path}</span></span>
                        </button>
                      </form>
                    )}
                    <details className="group min-w-0 basis-full sm:basis-auto sm:flex-1">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-black/[0.1] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#312e82] transition hover:border-[#312e82] [&::-webkit-details-marker]:hidden">
                        {suggestion ? "Ander adres…" : "Doorsturen…"}
                        <LuChevronDown className="text-[13px] transition group-open:rotate-180" />
                      </summary>
                      <form action={saveRedirect} className="mt-3 grid gap-3 rounded-xl bg-[#fafafd] p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <input type="hidden" name="source" value={m.path} />
                        <div>
                          <label className="alabel">Doorsturen naar</label>
                          <PathField name="destination" options={options} placeholder="Zoek een pagina, of /pad of https://…" required />
                        </div>
                        <button className="abtn justify-center">Opslaan <LuArrowRight className="text-[14px]" /></button>
                      </form>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- nieuw ---------- */}
      <form action={saveRedirect} id="nieuw" className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Nieuwe doorverwijzing</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Plak het oude adres gerust in zijn geheel (https://react2u.nl/…). Eindigt het op <code className="font-mono">{"/*"}</code>, dan
          gaat alles eronder mee.
        </p>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <label className="alabel" htmlFor="bron">Oud adres</label>
            <input
              id="bron"
              className="ainput font-mono !text-[14px]"
              name="source"
              defaultValue={sp.bron || ""}
              placeholder="/oude-pagina"
              autoFocus={Boolean(sp.bron)}
              required
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <LuArrowRight className="mx-auto hidden text-[18px] text-black/25 md:mb-3 md:block" />
          <div>
            <label className="alabel">Nieuw adres</label>
            <PathField name="destination" options={options} defaultValue={sp.doel || ""} placeholder="/pagina of https://…" required />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="alabel" htmlFor="soort">Soort</label>
            <select id="soort" name="permanent" className="ainput" defaultValue="permanent">
              <option value="permanent">Permanent (308) — de pagina is verhuisd</option>
              <option value="tijdelijk">Tijdelijk (307) — komt later terug</option>
            </select>
          </div>
          <div>
            <label className="alabel" htmlFor="notitie">Notitie (optioneel)</label>
            <input id="notitie" className="ainput" name="note" placeholder="Waarom, voor later" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Doorverwijzing opslaan</button>
        </div>
      </form>

      {/* ---------- actief ---------- */}
      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Actieve doorverwijzingen</h2>
          {redirects.length > 0 && (
            <span className="text-[12.5px] text-black/40">{totalHits} keer gebruikt</span>
          )}
        </div>
        {redirects.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-black/45">
            Nog geen eigen doorverwijzingen. De vaste lijst van de oude site staat hieronder.
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {redirects.map((r) => (
              <li key={r.id} className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-6 py-3.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[13.5px]">
                  <span className="break-all font-medium text-[#1c1a4e]">{r.source}</span>
                  <LuArrowRight className="shrink-0 text-[13px] text-black/30" />
                  <span className="break-all text-[#312e82]">{r.destination}</span>
                </div>
                <div className="flex items-center gap-3 text-[12.5px] text-black/40">
                  <span className={`apill !px-2 !py-0 !text-[11px] ${r.permanent ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#fff4e5] text-[#c77700]"}`}>
                    {r.permanent ? "308" : "307"}
                  </span>
                  <span className="tabular-nums" title={r.last_hit_at ? `Laatst ${waited(r.last_hit_at, now)} geleden` : "Nog niet gebruikt"}>
                    {r.hits}×
                  </span>
                  {r.note && <span className="hidden max-w-[220px] truncate lg:inline" title={r.note}>{r.note}</span>}
                  <a href={r.source.replace(/\/\*$/, "")} target="_blank" className="rounded-lg p-1.5 hover:bg-black/5 hover:text-[#312e82]" title="Uitproberen">
                    <LuExternalLink className="text-[14px]" />
                  </a>
                  <ConfirmButton
                    action={deleteRedirect.bind(null, r.id)}
                    message={`Doorverwijzing van ${r.source} verwijderen? Bezoekers krijgen daar dan weer een 404.`}
                    className="rounded-lg p-1.5 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                  >
                    <LuTrash2 className="text-[14px]" />
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- vast ---------- */}
      <details className="acard group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-heading text-[15px] font-bold text-[#312e82]">Vaste lijst van de oude website</span>
            <span className="block text-[13px] text-black/45">
              {WORDPRESS_REDIRECTS.length} regels uit de WordPress-tijd. Staan in de code en gaan altijd voor.
            </span>
          </span>
          <LuChevronDown className="shrink-0 text-black/35 transition group-open:rotate-180" />
        </summary>
        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.06]">
          {WORDPRESS_REDIRECTS.map((r) => (
            <li key={r.source} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-6 py-2.5 font-mono text-[13px]">
              <span className="break-all text-[#1c1a4e]">{r.source.replace(/\/:\w+\*$/, "/*")}</span>
              <LuArrowRight className="shrink-0 text-[12px] text-black/30" />
              <span className="break-all text-black/50">{r.destination.replace(/^https:\/\/[^/]+\/storage\/v1\/object\/public\/media\//, "media/")}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">SEO</h1>
        <p className="text-[14.5px] text-black/50">Stuur oude of verkeerde adressen door.</p>
      </div>
      <SeoTabs active="doorverwijzingen" />
      <div className="acard flex items-start gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]">
          <LuDatabase />
        </span>
        <div>
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Nog één stap: de database bijwerken</h2>
          <p className="mt-1 text-[14px] text-black/55">
            Doorverwijzingen en de 404-lijst hebben twee nieuwe tabellen nodig. Voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0007_doorverwijzingen.sql</code>{" "}
            uit in de SQL-editor van Supabase. Tot die tijd werkt de site gewoon; alleen dit scherm blijft leeg.
          </p>
        </div>
      </div>
    </div>
  );
}
