#!/usr/bin/env node
/**
 * Zet concepten uit src/content/<naam>.json om naar SQL voor Supabase.
 *
 *   node scripts/concept-naar-sql.mjs home werkgevers werknemers verzuimprotocol > concept.sql
 *   node scripts/concept-naar-sql.mjs --alle > concept.sql
 *   node scripts/concept-naar-sql.mjs --alle --datum 20261006 --seo > concept.sql
 *
 * Plak de uitvoer in de SQL-editor van Supabase. Alles gebeurt in één
 * transactie. Er wordt niets verwijderd: de huidige blokken van een pagina
 * verhuizen naar een nieuwe, niet-gepubliceerde pagina "<slug>-oud-<datum>",
 * die ook de oude titel en SEO-teksten meekrijgt. Bestaat een pagina nog niet
 * (zoals /werkgevers), dan wordt hij aangemaakt, met de titel en SEO-teksten
 * uit het conceptbestand.
 *
 *   --datum <JJJJMMDD[-UUMM]>  de datum in de naam van de reservepagina
 *                              (standaard: nu, met tijd); bestaat die naam al,
 *                              dan faalt de transactie en gebeurt er niets.
 *   --seo                      een bestaande pagina krijgt ook de titel en de
 *                              SEO-teksten uit het concept (zoals staging ze
 *                              toont); zonder deze vlag houdt hij zijn eigen.
 *                              Lege velden in het concept laten de huidige
 *                              waarde staan.
 *
 * Dit script leest alleen en schrijft naar stdout; het praat niet met de
 * database. Zie CONTEXT.md, *Concepten*.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const map = fileURLToPath(new URL("../src/content/", import.meta.url));

const argv = process.argv.slice(2);
/** Haalt een vlag (met eventuele waarde) uit argv; null als hij er niet staat. */
function vlag(naam, metWaarde = false) {
  const i = argv.indexOf(naam);
  if (i === -1) return null;
  const waarde = metWaarde ? argv[i + 1] : undefined;
  argv.splice(i, metWaarde ? 2 : 1);
  return metWaarde ? (waarde ?? "") : true;
}
const alle = vlag("--alle") === true;
const seo = vlag("--seo") === true;
const datumArg = vlag("--datum", true);
if (datumArg !== null && !/^\d{8}(-\d{4})?$/.test(datumArg)) {
  console.error(`--datum verwacht JJJJMMDD of JJJJMMDD-UUMM, niet "${datumArg}".`);
  process.exit(1);
}

const isConcept = (c) =>
  c && typeof c === "object" && typeof c.slug === "string" && typeof c.title === "string" && Array.isArray(c.blocks) && c.blocks.length > 0;

let namen = argv;
if (alle) {
  namen = readdirSync(map)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort()
    .filter((n) => {
      // src/content/ bevat ook bestanden die geen pagina zijn (plaatsen.json).
      const ok = isConcept(JSON.parse(readFileSync(`${map}${n}.json`, "utf8")));
      if (!ok) console.error(`${n}.json overgeslagen: geen conceptpagina.`);
      return ok;
    });
}
if (!namen.length || namen.some((n) => !/^[a-z0-9-]+$/.test(n))) {
  console.error("Gebruik: node scripts/concept-naar-sql.mjs <naam> [<naam> …]   of   --alle   [--datum JJJJMMDD] [--seo]");
  process.exit(1);
}

// Dollar-quoting: dan hoeft er in de JSON niets ge-escaped te worden. De tag
// mag alleen niet zelf in de tekst voorkomen.
const TAG = "$concept$";
const q = (s) => (s == null || s === "" ? "null" : `'${String(s).replaceAll("'", "''")}'`);
// Datum én tijd: dan kan het script ook twee keer op één dag draaien zonder
// te botsen op de reservepagina van de eerste keer. Met --datum kies je zelf.
const datum = datumArg ?? new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");

let sql = `-- Concepten uit src/content/: ${namen.join(", ")}
-- Huidige blokken (en titel/SEO) blijven bewaard op verborgen pagina's "<slug>-oud-${datum}".${seo ? "\n-- Bestaande pagina's krijgen de titel en SEO-teksten uit het concept (--seo)." : ""}
begin;
`;

for (const naam of namen) {
  const pad = `${map}${naam}.json`;
  const concept = JSON.parse(readFileSync(pad, "utf8"));
  if (!isConcept(concept)) {
    console.error(`${pad}: "slug", "title" en een niet-lege "blocks"-lijst zijn verplicht.`);
    process.exit(1);
  }
  const { slug, title } = concept;
  const blocks = concept.blocks.map(({ type, label, data }) => ({ type, label: label ?? null, data: data ?? {} }));
  const json = JSON.stringify(blocks);
  if (json.includes(TAG)) {
    console.error(`${pad} bevat ${TAG}; kies een andere tag in dit script.`);
    process.exit(1);
  }
  const oud = `${slug}-oud-${datum}`;

  sql += `
-- /${slug === "home" ? "" : slug}  (src/content/${naam}.json, ${blocks.length} blokken)

-- Pagina aanmaken als hij nog niet bestaat; een bestaande pagina houdt zijn rij (en dus zijn id).
insert into public.pages (slug, title, published, sort, seo_title, seo_description)
values (${q(slug)}, ${q(title)}, true, ${Number.isInteger(concept.sort) ? concept.sort : 50}, ${q(concept.seo_title)}, ${q(concept.seo_description)})
on conflict (slug) do nothing;

-- De huidige blokken naar een verborgen reservepagina, met de oude titel en SEO — alleen als er blokken zijn.
insert into public.pages (slug, title, published, sort, seo_title, seo_description, og_image)
select ${q(oud)}, p.title || ' (oud, ${datum})', false, 999, p.seo_title, p.seo_description, p.og_image
from public.pages p
where p.slug = ${q(slug)}
  and exists (select 1 from public.blocks b where b.page_id = p.id);

update public.blocks
set page_id = (select id from public.pages where slug = ${q(oud)})
where page_id = (select id from public.pages where slug = ${q(slug)})
  and exists (select 1 from public.pages where slug = ${q(oud)});

insert into public.blocks (page_id, type, label, sort, data)
select p.id, b->>'type', b->>'label', (t.i - 1)::int, b->'data'
from public.pages p,
     jsonb_array_elements(${TAG}${json}${TAG}::jsonb) with ordinality as t(b, i)
where p.slug = ${q(slug)};

update public.pages
set updated_at = now(),
    published = true${
      seo
        ? `,
    title = ${q(title)},
    seo_title = coalesce(${q(concept.seo_title)}, seo_title),
    seo_description = coalesce(${q(concept.seo_description)}, seo_description)`
        : ""
    }
where slug = ${q(slug)};
`;
}

sql += `
commit;
`;
process.stdout.write(sql);
