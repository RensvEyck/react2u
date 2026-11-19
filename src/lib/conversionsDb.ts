import type { supabaseServer } from "./supabase/server";
import { supabasePublic } from "./supabase/public";
import type { Conversion, ConversionExtra, ConversionKind } from "./conversions";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * Eén conversie vastleggen. Nooit een fout naar de aanroeper: de inzending
 * zelf is dan al gelukt, en vóór migratie 0013 bestaat de tabel nog niet.
 *
 * `extra` zijn de kolommen uit migratie 0047 (herkomst, bron, landingspagina,
 * visitor_hash). Bestaan die nog niet (Postgres 42703, of de schema-cache van
 * PostgREST: PGRST204), dan zonder, zodat de telling zelf niet verloren gaat.
 */
export async function recordConversion(kind: ConversionKind, path: string, extra: ConversionExtra = {}): Promise<void> {
  try {
    const rij = { kind, path: path.slice(0, 200) };
    const meer = Object.fromEntries(Object.entries(extra).filter(([, v]) => v));
    const sb = supabasePublic();
    const { error } = await sb.from("conversions").insert({ ...rij, ...meer });
    if (error && Object.keys(meer).length && (error.code === "42703" || error.code === "PGRST204")) {
      await sb.from("conversions").insert(rij);
    }
  } catch {
    // zie boven
  }
}

const PAGE = 1000;

/**
 * Alle conversies sinds een moment, in blokken van 1000 (zie fetchPageViews
 * voor waarom). `ready: false` betekent dat de tabel er nog niet is. Met `*`
 * komen de kolommen van 0047 vanzelf mee, en vóór die migratie ontbreken ze
 * gewoon.
 */
export async function fetchConversions(sb: Sb, since: string): Promise<{ conversions: Conversion[]; ready: boolean }> {
  const out: Conversion[] = [];
  for (let from = 0; from < 20_000; from += PAGE) {
    const { data, error } = await sb
      .from("conversions")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { conversions: out, ready: from > 0 };
    if (!data?.length) break;
    out.push(...(data as Conversion[]));
    if (data.length < PAGE) break;
  }
  return { conversions: out, ready: true };
}
