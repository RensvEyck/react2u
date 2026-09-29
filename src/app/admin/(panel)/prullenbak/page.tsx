import { requireAdmin } from "@/lib/admin";
import { restoreRevision } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import { isMissingTable } from "@/lib/dbErrors";
import { when } from "@/lib/dashboard";
import { actorName, displayName, mayRestore, trash, type Context, type Revision } from "@/lib/revisions";
import { LuTrash2, LuRotateCcw, LuShieldCheck, LuDatabase } from "react-icons/lu";

const KIND: Record<string, { label: string; cls: string }> = {
  pages: { label: "Pagina", cls: "bg-[#eef0ff] text-[#312e82]" },
  blocks: { label: "Blok", cls: "bg-black/[0.05] text-black/55" },
  posts: { label: "Artikel", cls: "bg-[#fdeef4] text-[#e0356b]" },
  vacancies: { label: "Vacature", cls: "bg-[#e6f7f4] text-[#0e9f8a]" },
};

/**
 * Alles wat verwijderd is en nog terug kan. Wat je hier ziet hangt af van je
 * rechten: RLS op `revisions` geeft alleen de onderdelen die je mag bewerken.
 */
export default async function Prullenbak() {
  const { sb, admin } = await requireAdmin();

  const deletes = await sb
    .from("revisions")
    .select("*")
    .eq("action", "delete")
    .in("table_name", ["pages", "blocks", "posts", "vacancies"])
    .order("created_at", { ascending: false })
    .limit(400);

  if (isMissingTable(deletes.error)) return <SetupNeeded />;
  const revs = (deletes.data as Revision[]) || [];

  const ids = (table: string) => [...new Set(revs.filter((r) => r.table_name === table).map((r) => r.row_id))];
  const [pages, blocks, posts, vacancies, allPages] = await Promise.all([
    sb.from("pages").select("id").in("id", ids("pages")),
    sb.from("blocks").select("id").in("id", ids("blocks")),
    sb.from("posts").select("id").in("id", ids("posts")),
    sb.from("vacancies").select("id").in("id", ids("vacancies")),
    sb.from("pages").select("id, title, slug"),
  ]);
  const existing = new Set<string>([
    ...((pages.data as { id: string }[]) || []).map((r) => `pages:${r.id}`),
    ...((blocks.data as { id: string }[]) || []).map((r) => `blocks:${r.id}`),
    ...((posts.data as { id: string }[]) || []).map((r) => `posts:${r.id}`),
    ...((vacancies.data as { id: string }[]) || []).map((r) => `vacancies:${r.id}`),
  ]);

  const pageRows = (allPages.data as { id: string; title: string; slug: string }[]) || [];
  const ctx: Context = {
    pageTitles: new Map(pageRows.map((p) => [p.id, p.title])),
    pageSlugs: new Map(pageRows.map((p) => [p.id, p.slug])),
    blockLabels: BLOCK_TEMPLATES,
  };
  const items = trash(revs, existing);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Prullenbak</h1>
        <p className="text-[14.5px] text-black/50">
          Verwijderde pagina&apos;s, artikelen, vacatures en blokken van het afgelopen jaar. Terugzetten zet ze precies
          terug zoals ze waren — met hetzelfde adres, en een pagina met al haar blokken.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="acard flex flex-col items-center gap-2 px-6 py-14 text-center">
          <LuTrash2 className="text-[28px] text-black/20" />
          <p className="text-[14.5px] text-black/45">De prullenbak is leeg.</p>
        </div>
      ) : (
        <ul className="acard divide-y divide-black/[0.05] overflow-hidden">
          {items.map((r) => {
            const who = actorName(r, admin.userId);
            const d = r.data as Record<string, string>;
            const path =
              r.table_name === "pages" ? (d.slug === "home" ? "/" : `/${d.slug}`)
              : r.table_name === "posts" ? `/blog/${d.slug}`
              : r.table_name === "vacancies" ? `/vacatures/${d.slug}`
              : null;
            const wasLive =
              (r.table_name === "pages" && (r.data.published as boolean)) ||
              ((r.table_name === "posts" || r.table_name === "vacancies") && d.status === "published");
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                <span className={`apill shrink-0 !text-[11.5px] ${KIND[r.table_name]?.cls}`}>{KIND[r.table_name]?.label}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">
                    {displayName(r, ctx)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-black/45">
                    <span>Verwijderd {when(r.created_at)}{who ? ` door ${who === "Jij" ? "jou" : who}` : ""}</span>
                    {path && <span className="font-mono">{path}</span>}
                    {r.blocks > 0 && <span>met {r.blocks} blok{r.blocks === 1 ? "" : "ken"}</span>}
                  </p>
                </div>
                {mayRestore(r.table_name, admin.permissions) && (
                  <ConfirmButton
                    action={restoreRevision.bind(null, r.id, "/admin/prullenbak")}
                    message={
                      wasLive
                        ? "Terugzetten? Het stond live toen het verwijderd werd, en staat dan meteen weer op de site."
                        : "Terugzetten?"
                    }
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#312e82] transition hover:bg-[#eef0ff]"
                  >
                    <LuRotateCcw className="text-[14px]" /> Terugzetten
                  </ConfirmButton>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-start gap-3 px-1 text-[13px] text-black/45">
        <LuShieldCheck className="mt-0.5 shrink-0 text-[15px] text-black/30" />
        <p>
          Berichten, sollicitaties en leads komen hier niet: die zijn persoonsgegevens en worden bij verwijderen echt
          gewist, cv inbegrepen. Alles in de prullenbak verdwijnt na een jaar vanzelf.
        </p>
      </div>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Prullenbak</h1>
      <div className="acard flex items-start gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]">
          <LuDatabase />
        </span>
        <div>
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Nog één stap: de database bijwerken</h2>
          <p className="mt-1 text-[14px] text-black/55">
            Versies en de prullenbak hebben een nieuwe tabel nodig. Voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0008_versies.sql</code>{" "}
            uit in de SQL-editor van Supabase. Pas daarna wordt bij elke opslag een versie bewaard.
          </p>
        </div>
      </div>
    </div>
  );
}
