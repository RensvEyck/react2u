#!/usr/bin/env node
/**
 * Zet een concept uit src/content/<naam>.json om naar SQL voor Supabase.
 *
 *   node scripts/concept-naar-sql.mjs home > home.sql
 *
 * Plak de uitvoer in de SQL-editor van Supabase. Er wordt niets verwijderd: de
 * huidige blokken van de pagina verhuizen naar een nieuwe, niet-gepubliceerde
 * pagina "<slug>-oud-<datum>". Terugdraaien kan dus via het adminpaneel, of
 * door de blokken weer terug te hangen.
 *
 * Dit script leest alleen en schrijft naar stdout; het praat niet met de
 * database. Zie CONTEXT.md, *Concepten*.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const naam = process.argv[2];
if (!naam || !/^[a-z0-9-]+$/.test(naam)) {
  console.error("Gebruik: node scripts/concept-naar-sql.mjs <naam>   (bv. home)");
  process.exit(1);
}

const pad = fileURLToPath(new URL(`../src/content/${naam}.json`, import.meta.url));
const concept = JSON.parse(readFileSync(pad, "utf8"));
const slug = concept.slug;
if (!slug || !Array.isArray(concept.blocks) || concept.blocks.length === 0) {
  console.error(`${pad}: "slug" en een niet-lege "blocks"-lijst zijn verplicht.`);
  process.exit(1);
}

const blocks = concept.blocks.map(({ type, label, data }) => ({ type, label: label ?? null, data: data ?? {} }));
const json = JSON.stringify(blocks);
// Dollar-quoting: dan hoeft er in de JSON niets ge-escaped te worden. De tag
// mag alleen niet zelf in de tekst voorkomen.
const tag = "$concept$";
if (json.includes(tag)) {
  console.error(`De inhoud bevat ${tag}; kies een andere tag in dit script.`);
  process.exit(1);
}

const datum = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const oud = `${slug}-oud-${datum}`;
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

process.stdout.write(`-- Nieuwe opbouw voor /${slug === "home" ? "" : slug}, gegenereerd uit src/content/${naam}.json
-- De huidige blokken blijven bewaard op de verborgen pagina "${oud}".
begin;

insert into public.pages (slug, title, published, sort)
values (${q(oud)}, ${q(`${slug} (oud, ${datum})`)}, false, 999);

update public.blocks
set page_id = (select id from public.pages where slug = ${q(oud)})
where page_id = (select id from public.pages where slug = ${q(slug)});

insert into public.blocks (page_id, type, label, sort, data)
select p.id, b->>'type', b->>'label', (t.i - 1)::int, b->'data'
from public.pages p,
     jsonb_array_elements(${tag}${json}${tag}::jsonb) with ordinality as t(b, i)
where p.slug = ${q(slug)};

update public.pages set updated_at = now() where slug = ${q(slug)};

commit;
`);
