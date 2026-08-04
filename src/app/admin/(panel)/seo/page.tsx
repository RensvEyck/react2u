import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { saveSeoSettings } from "@/app/admin/actions";
import ImageField from "@/components/admin/ImageField";
import type { Page, Post, Vacancy } from "@/lib/types";
import {
  analysePage, analysePost, analyseVacancy, countIssues, normalizeSeoSettings,
  TITLE_MAX, DESC_MAX, type SeoRow, type FieldCheck, type Severity,
} from "@/lib/seo";
import { LuExternalLink, LuPencil, LuTriangleAlert, LuCircleAlert, LuCheck } from "react-icons/lu";

const TONE: Record<Severity, string> = {
  ok: "text-[#0e9f8a]",
  warn: "text-[#c77700]",
  error: "text-[#e0356b]",
};

function Field({ check, max }: { check: FieldCheck; max: number }) {
  const Icon = check.severity === "ok" ? LuCheck : check.severity === "warn" ? LuTriangleAlert : LuCircleAlert;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <Icon className={`shrink-0 text-[13px] ${TONE[check.severity]}`} />
        <span className={`text-[12px] font-semibold tabular-nums ${TONE[check.severity]}`}>
          {check.length}/{max}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[13px] text-black/60" title={check.value}>
        {check.value || <span className="text-black/30">—</span>}
      </p>
      {check.message && <p className={`mt-0.5 text-[12px] ${TONE[check.severity]}`}>{check.message}</p>}
    </div>
  );
}

function Row({ r }: { r: SeoRow }) {
  return (
    <div className={`grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[220px_1fr_1fr_auto] md:items-start ${r.published ? "" : "opacity-55"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="apill bg-black/[0.05] text-black/50">{r.kind}</span>
          {!r.published && <span className="apill bg-black/[0.05] text-black/40">Concept</span>}
        </div>
        <p className="mt-1 truncate text-[14.5px] font-semibold text-[#1c1a4e]" title={r.label}>{r.label}</p>
        <p className="truncate text-[12.5px] text-black/35">{r.path}</p>
      </div>
      <Field check={r.title} max={TITLE_MAX} />
      <Field check={r.description} max={DESC_MAX} />
      <div className="flex items-center gap-1">
        {r.published && (
          <a href={r.path} target="_blank" className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-[#312e82]" title="Bekijk">
            <LuExternalLink className="text-[15px]" />
          </a>
        )}
        <Link href={r.editHref} className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-[#e75387]" title="Bewerken">
          <LuPencil className="text-[15px]" />
        </Link>
      </div>
    </div>
  );
}

export default async function SeoAdmin() {
  const { sb } = await requireAdmin();
  const [pagesRes, postsRes, vacanciesRes, seoRes] = await Promise.all([
    sb.from("pages").select("*").order("sort"),
    sb.from("posts").select("*").order("created_at", { ascending: false }),
    sb.from("vacancies").select("*").order("created_at", { ascending: false }),
    sb.from("site_settings").select("value").eq("key", "seo").maybeSingle(),
  ]);

  const rows: SeoRow[] = [
    ...((pagesRes.data as Page[]) || []).map(analysePage),
    ...((postsRes.data as Post[]) || []).map(analysePost),
    ...((vacanciesRes.data as Vacancy[]) || []).map(analyseVacancy),
  ];

  // Problemen eerst; binnen dezelfde ernst blijft de oorspronkelijke volgorde.
  const order: Record<Severity, number> = { error: 0, warn: 1, ok: 2 };
  const sorted = [...rows].sort((a, b) => order[a.worst] - order[b.worst]);

  const { errors, warnings, ok } = countIssues(rows);
  const seo = normalizeSeoSettings(seoRes.data?.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">SEO</h1>
          <p className="text-[14.5px] text-black/50">
            Wat Google straks toont — inclusief de waarden die automatisch worden afgeleid.
          </p>
        </div>
        <a href="/sitemap.xml" target="_blank" className="abtn-ghost">
          Bekijk sitemap <LuExternalLink className="text-[13px]" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Moet aandacht", value: errors, tint: "bg-[#fdeef4] text-[#e0356b]", Icon: LuCircleAlert },
          { label: "Kan beter", value: warnings, tint: "bg-[#fff4e5] text-[#c77700]", Icon: LuTriangleAlert },
          { label: "In orde", value: ok, tint: "bg-[#e6f7f4] text-[#0e9f8a]", Icon: LuCheck },
        ].map((s) => (
          <div key={s.label} className="acard flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[20px] ${s.tint}`}>
              <s.Icon />
            </div>
            <div>
              <p className="font-heading text-[26px] font-bold leading-none text-[#1c1a4e]">{s.value}</p>
              <p className="mt-1 text-[13px] font-medium text-black/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-[13px] text-black/40">
        Concepten tellen niet mee — die staan niet in Google.
      </p>

      <div className="acard overflow-hidden">
        <div className="hidden grid-cols-[220px_1fr_1fr_auto] gap-4 border-b border-black/[0.06] bg-[#fafafd] px-6 py-3 text-[12px] font-semibold uppercase tracking-wide text-black/40 md:grid">
          <span>Pagina</span>
          <span>Titel</span>
          <span>Omschrijving</span>
          <span />
        </div>
        <div className="divide-y divide-black/[0.05]">
          {sorted.map((r) => <Row key={`${r.kind}-${r.id}`} r={r} />)}
          {sorted.length === 0 && (
            <p className="px-6 py-10 text-center text-black/45">Nog geen content om te controleren.</p>
          )}
        </div>
      </div>

      <form action={saveSeoSettings} className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Standaardwaarden</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Gebruikt wanneer een pagina zelf niets invult, en bij het delen van een link op
          LinkedIn, WhatsApp of X.
        </p>
        <div className="space-y-4">
          <div>
            <label className="alabel">Standaard omschrijving</label>
            <textarea className="ainput" name="description" rows={2} defaultValue={seo.description} />
          </div>
          <ImageField
            name="share_image"
            label="Deelafbeelding — 1200×630 werkt het beste (leeg = het logo)"
            defaultValue={seo.share_image}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}
