import type { supabaseServer } from "./supabase/server";
import { supabasePublic } from "./supabase/public";
import type { Conversion, ConversionKind } from "./conversions";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * Eén conversie vastleggen. Nooit een fout naar de aanroeper: de inzending
 * zelf is dan al gelukt, en vóór migratie 0013 bestaat de tabel nog niet.
 */
export async function recordConversion(kind: ConversionKind, path: string): Promise<void> {
  try {
    await supabasePublic().from("conversions").insert({ kind, path: path.slice(0, 200) });
  } catch {
    // zie boven
  }
}

const PAGE = 1000;

/**
 * Alle conversies sinds een moment, in blokken van 1000 (zie fetchPageViews
 * voor waarom). `ready: false` betekent dat de tabel er nog niet is.
 */
export async function fetchConversions(sb: Sb, since: string): Promise<{ conversions: Conversion[]; ready: boolean }> {
  const out: Conversion[] = [];
  for (let from = 0; from < 20_000; from += PAGE) {
    const { data, error } = await sb
      .from("conversions")
      .select("id, kind, path, created_at")
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
