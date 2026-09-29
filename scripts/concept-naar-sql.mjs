#!/usr/bin/env node
/**
 * Zet concepten uit src/content/<naam>.json om naar SQL voor Supabase.
 *
 *   node scripts/concept-naar-sql.mjs home werkgevers werknemers verzuimprotocol > concept.sql
 *   node scripts/concept-naar-sql.mjs --alle > concept.sql
 *
 * Plak de uitvoer in de SQL-editor van Supabase. Alles gebeurt in één
 * transactie. Er wordt niets verwijderd: de huidige blokken van een pagina
 * verhuizen naar een nieuwe, niet-gepubliceerde pagina "<slug>-oud-<datum>".
 * Bestaat een pagina nog niet (zoals /werkgevers), dan wordt hij aangemaakt,
 * met de titel en SEO-teksten uit het conceptbestand.
 *
 * Dit script leest alleen en schrijft naar stdout; het praat niet met de
 * database. Zie CONTEXT.md, *Concepten*.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const map = fileURLToPath(new URL("../src/content/", import.meta.url));
let namen = process.argv.slice(2);
if (namen.includes("--alle")) {
  namen = readdirSync(map).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
}
if (!namen.length || namen.some((n) => !/^[a-z0-9-]+$/.test(n))) {
  console.error("Gebruik: node scripts/concept-naar-sql.mjs <naam> [<naam> …]   of   --alle");
  process.exit(1);
}

// Dollar-quoting: dan hoeft er in de JSON niets ge-escaped te worden. De tag
// mag alleen niet zelf in de tekst voorkomen.
const TAG = "$concept$";
const q = (s) => (s == null || s === "" ? "null" : `'${String(s).replaceAll("'", "''")}'`);
// Datum én tijd: dan kan het script ook twee keer op één dag draaien zonder
// te botsen op de reservepagina van de eerste keer.
const datum = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");

let sql = `-- Concepten uit src/content/: ${namen.join(", ")}
-- Huidige blokken blijven bewaard op verborgen pagina's "<slug>-oud-${datum}".
begin;
`;

for (const naam of namen) {
  const pad = `${map}${naam}.json`;
  const concept = JSON.parse(readFileSync(pad, "utf8"));
  const { slug, title } = concept;
  if (!slug || !title || !Array.isArray(concept.blocks) || concept.blocks.length === 0) {
    console.error(`${pad}: "slug", "title" en een niet-lege "blocks"-lijst zijn verplicht.`);
    process.exit(1);
  }
  const blocks = concept.blocks.map(({ type, label, data }) => ({ type, label: label ?? null, data: data ?? {} }));
  const json = JSON.stringify(blocks);
  if (json.includes(TAG)) {
    console.error(`${pad} bevat ${TAG}; kies een andere tag in dit script.`);
    process.exit(1);
  }
  const oud = `${slug}-oud-${datum}`;

  sql += `
-- /${slug === "home" ? "" : slug}  (src/content/${naam}.json)

-- Pagina aanmaken als hij nog niet bestaat; een bestaande pagina houdt zijn titel en SEO.
insert into public.pages (slug, title, published, sort, seo_title, seo_description)
values (${q(slug)}, ${q(title)}, true, ${Number.isInteger(concept.sort) ? concept.sort : 50}, ${q(concept.seo_title)}, ${q(concept.seo_description)})
on conflict (slug) do nothing;

-- De huidige blokken naar een verborgen reservepagina — alleen als er blokken zijn.
insert into public.pages (slug, title, published, sort)
select ${q(oud)}, ${q(`${title} (oud, ${datum})`)}, false, 999
where exists (
  select 1 from public.blocks b join public.pages p on p.id = b.page_id where p.slug = ${q(slug)}
);

update public.blocks
set page_id = (select id from public.pages where slug = ${q(oud)})
where page_id = (select id from public.pages where slug = ${q(slug)});

insert into public.blocks (page_id, type, label, sort, data)
select p.id, b->>'type', b->>'label', (t.i - 1)::int, b->'data'
from public.pages p,
     jsonb_array_elements(${TAG}${json}${TAG}::jsonb) with ordinality as t(b, i)
where p.slug = ${q(slug)};

update public.pages set updated_at = now(), published = true where slug = ${q(slug)};
`;
}

sql += `
commit;
`;
process.stdout.write(sql);
