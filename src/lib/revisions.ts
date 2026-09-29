import type { Permission } from "./permissions";
import { firstName } from "./dashboard";

/**
 * Versiegeschiedenis, prullenbak en wijzigingslog. Puur: geen database.
 *
 * Een revisie is een momentopname die een databasetrigger maakt (migratie
 * 0008). Bij insert en update is `data` de rij zoals hij ná het opslaan was;
 * bij delete de laatste stand. De eerste revisie van een rij van vóór het
 * versiebeheer heeft geen auteur: dat is de beginversie.
 */

export type RevisionTable = "pages" | "blocks" | "posts" | "vacancies" | "site_settings";

export type Revision = {
  id: number;
  table_name: RevisionTable;
  row_id: string;
  action: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  actor: string | null;
  actor_email: string | null;
  created_at: string;
};

/** Welk recht een tabel vraagt — gelijk aan de policy "read revisions". */
export const TABLE_PERMISSIONS: Record<RevisionTable, Permission[]> = {
  pages: ["paginas"],
  blocks: ["paginas"],
  posts: ["blog"],
  vacancies: ["vacatures"],
  site_settings: ["instellingen", "seo"],
};

export function mayRestore(table: RevisionTable, permissions: Permission[]): boolean {
  return TABLE_PERMISSIONS[table].some((p) => permissions.includes(p));
}

/** Primaire sleutel per tabel; site_settings heeft een tekstsleutel. */
export const primaryKey = (table: RevisionTable) => (table === "site_settings" ? "key" : "id");

/**
 * De velden om terug te schrijven. `updated_at` zet de database zelf, en bij
 * een blok blijft de huidige plek staan: een oude versie terugzetten hoort
 * de volgorde op de pagina niet ongemerkt te verschuiven.
 */
export function restorableFields(table: RevisionTable, data: Record<string, unknown>, keepSort: boolean) {
  const { updated_at: _u, ...rest } = data;
  void _u;
  if (table === "blocks" && keepSort) {
    const { sort: _s, ...withoutSort } = rest;
    void _s;
    return withoutSort;
  }
  return rest;
}

/* ---------- beschrijven ---------- */

const SETTING_NAMES: Record<string, string> = {
  contact: "de contactgegevens",
  documents: "de documenten in de footer",
  certificates: "de certificaten",
  seo: "de SEO-standaarden",
  maintenance: "de onderhoudsmodus",
};

const FIELD_NAMES: Record<string, string> = {
  title: "titel", slug: "adres", seo_title: "SEO-titel", seo_description: "omschrijving",
  og_image: "deelafbeelding", published: "publicatie", status: "status", data: "inhoud", label: "naam",
  excerpt: "samenvatting", body_md: "tekst", cover_image: "afbeelding", author: "auteur",
  location: "locatie", employment_type: "dienstverband", hours: "uren", salary: "salaris",
  intro: "intro", description_md: "omschrijving", valid_through: "einddatum", value: "inhoud",
  type: "bloktype", page_id: "pagina",
};

// Velden die bij elke opslag veranderen of die de gebruiker niet zelf kiest.
const IGNORED = new Set(["updated_at", "created_at", "sort", "published_at", "id"]);

/** Welke velden verschillen tussen twee versies, als leesbare namen. */
export function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown>): string[] {
  if (!before) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const k of keys) {
    if (IGNORED.has(k)) continue;
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) out.push(FIELD_NAMES[k] || k);
  }
  return [...new Set(out)];
}

export type Context = {
  /** Titels van pagina's op id, voor "blok X op pagina Y". */
  pageTitles: Map<string, string>;
  /** Slugs van pagina's op id, voor links naar een blok. */
  pageSlugs: Map<string, string>;
  /** Labels van bloktypes. */
  blockLabels: Record<string, { label: string }>;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** De naam van het onderdeel zelf: "Contact", "Hero — op Contact", "Verzuim voorkomen". */
export function displayName(rev: Revision, ctx: Context): string {
  const d = rev.data;
  switch (rev.table_name) {
    case "pages":
      return str(d.title) || str(d.slug);
    case "blocks": {
      const name = str(d.label) || ctx.blockLabels[str(d.type)]?.label || str(d.type) || "Blok";
      const page = ctx.pageTitles.get(str(d.page_id));
      return page ? `${name} — op ${page}` : name;
    }
    case "posts":
    case "vacancies":
      return str(d.title);
    case "site_settings":
      return SETTING_NAMES[rev.row_id] || rev.row_id;
  }
}

/** "blok ‘Hero’ op Contact", "artikel ‘Verzuim voorkomen’", "de contactgegevens". */
export function subject(rev: Revision, ctx: Context): string {
  const d = rev.data;
  switch (rev.table_name) {
    case "pages":
      return `pagina ‘${str(d.title) || str(d.slug)}’`;
    case "blocks": {
      const name = str(d.label) || ctx.blockLabels[str(d.type)]?.label || str(d.type) || "blok";
      const page = ctx.pageTitles.get(str(d.page_id));
      return `blok ‘${name}’${page ? ` op ${page}` : ""}`;
    }
    case "posts":
      return `artikel ‘${str(d.title)}’`;
    case "vacancies":
      return `vacature ‘${str(d.title)}’`;
    case "site_settings":
      return SETTING_NAMES[rev.row_id] || `instelling ‘${rev.row_id}’`;
  }
}

const VERB: Record<Revision["action"], string> = { insert: "maakte", update: "wijzigde", delete: "verwijderde" };

/** "wijzigde blok ‘Hero’ op Contact". De auteur staat er los voor, zie actorName(). */
export function sentence(rev: Revision & { blocks?: number }, ctx: Context): string {
  if (rev.table_name === "site_settings" && rev.row_id === "maintenance" && rev.action !== "delete") {
    const on = (rev.data.value as { enabled?: boolean } | null)?.enabled;
    return on ? "zette de onderhoudsmodus aan" : "zette de onderhoudsmodus uit";
  }
  const extra = rev.blocks ? ` met ${rev.blocks} blok${rev.blocks === 1 ? "" : "ken"}` : "";
  return `${VERB[rev.action]} ${subject(rev, ctx)}${extra}`;
}

/** "Jij", "Rens", "marieke@…", of null voor de beginversie. */
export function actorName(rev: Revision, currentUserId: string): string | null {
  if (!rev.actor) return null;
  if (rev.actor === currentUserId) return "Jij";
  return firstName(rev.actor_email) || rev.actor_email || "Onbekend";
}

/** Waar je het onderdeel bewerkt, of null als het niet (meer) bestaat. */
export function editHref(rev: Revision, ctx: Context): string | null {
  const d = rev.data;
  switch (rev.table_name) {
    case "pages":
      return `/admin/paginas/${str(d.slug)}`;
    case "blocks": {
      const slug = ctx.pageSlugs.get(str(d.page_id));
      return slug ? `/admin/paginas/${slug}/blok/${rev.row_id}` : null;
    }
    case "posts":
      return `/admin/blog/${rev.row_id}`;
    case "vacancies":
      return `/admin/vacatures/${rev.row_id}`;
    case "site_settings":
      return rev.row_id === "seo" ? "/admin/seo" : "/admin/instellingen";
  }
}

/**
 * Voor het wijzigingslog: blokken die meegingen met een verwijderde pagina
 * (zelfde transactie, dus zelfde tijdstip) vallen weg, en de pagina krijgt
 * het aantal. Anders staat één klik er als vijf regels.
 */
export function collapseCascades(revs: Revision[]): (Revision & { blocks: number })[] {
  const pageDeletes = new Map(
    revs.filter((r) => r.table_name === "pages" && r.action === "delete").map((r) => [`${r.row_id}@${r.created_at}`, r.id])
  );
  const counts = new Map<number, number>();
  const kept = revs.filter((r) => {
    if (r.table_name !== "blocks" || r.action !== "delete") return true;
    const page = pageDeletes.get(`${str(r.data.page_id)}@${r.created_at}`);
    if (page === undefined) return true;
    counts.set(page, (counts.get(page) || 0) + 1);
    return false;
  });
  return kept.map((r) => ({ ...r, blocks: counts.get(r.id) || 0 }));
}

/* ---------- versielijst ---------- */

export type Version = Revision & {
  /** Velden die in deze versie veranderden ten opzichte van de vorige. */
  changed: string[];
  /** De nieuwste versie die nog bestaat — die staat nu live. */
  current: boolean;
};

/**
 * Revisies van één rij als versielijst, nieuwste eerst. Verwijderingen staan
 * er niet in: die horen in de prullenbak, niet in de geschiedenis van iets
 * dat er nog is.
 */
export function versions(revs: Revision[]): Version[] {
  const saved = revs
    .filter((r) => r.action !== "delete")
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  const out = saved.map((r, i) => ({
    ...r,
    changed: changedFields(i > 0 ? saved[i - 1].data : null, r.data),
    current: i === saved.length - 1,
  }));
  return out.reverse();
}

/* ---------- prullenbak ---------- */

export type TrashItem = Revision & {
  /** Bij een pagina: hoeveel blokken er met haar mee verdwenen. */
  blocks: number;
};

/**
 * Wat verwijderd is en nog niet terug: per rij de laatste revisie, als die een
 * verwijdering is en de rij niet meer bestaat.
 *
 * Blokken die meegingen met een verwijderde pagina (zelfde moment, zelfde
 * pagina — de database verwijdert ze in dezelfde transactie) staan niet los in
 * de lijst: die komen terug met de pagina.
 */
export function trash(revs: Revision[], existing: Set<string>): TrashItem[] {
  const latest = new Map<string, Revision>();
  for (const r of revs) {
    const key = `${r.table_name}:${r.row_id}`;
    const seen = latest.get(key);
    if (!seen || r.created_at > seen.created_at || (r.created_at === seen.created_at && r.id > seen.id)) latest.set(key, r);
  }
  const deleted = [...latest.values()].filter((r) => r.action === "delete" && !existing.has(`${r.table_name}:${r.row_id}`));
  const pageDeletes = new Map(deleted.filter((r) => r.table_name === "pages").map((r) => [r.row_id, r.created_at]));
  const withPage = (r: Revision) =>
    r.table_name === "blocks" && pageDeletes.get(str(r.data.page_id)) === r.created_at;

  return deleted
    .filter((r) => !withPage(r))
    .map((r) => ({
      ...r,
      blocks: r.table_name === "pages" ? deleted.filter((b) => withPage(b) && b.data.page_id === r.row_id).length : 0,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
