import index from "../content/plaatsen-index.json";

/*
 * Welke gemeenten een eigen tekst hebben, zonder de teksten zelf. lib/gemeenten.ts
 * gebruikt dit voor de indexeringsregel, en lib/gemeenten.ts komt via het
 * sitemapblok ook in de admin-bundel terecht: met de volledige plaatsen.json
 * (1 MB) erachter zou de blokeditor die hele tekstset downloaden.
 *
 * plaatsen-index.json is afgeleid van plaatsen.json; plaatsteksten.test.ts
 * controleert dat ze gelijk lopen. Bijwerken na het toevoegen of verwijderen van
 * een gemeente:
 *
 *   node -e 'const d=require("./src/content/plaatsen.json");const s=Object.keys(d).filter(k=>!k.startsWith("_")).sort();const f="./src/content/plaatsen-index.json";const o=require(f);o.slugs=s;require("fs").writeFileSync(f,JSON.stringify(o,null,1)+"\\n")'
 */
const MET_TEKST = new Set<string>((index as { slugs: string[] }).slugs);

export const heeftPlaatsTekst = (slug: string) => MET_TEKST.has(slug);
export const indexSlugs = (): string[] => [...MET_TEKST];
