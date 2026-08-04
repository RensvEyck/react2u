import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-off migration: copy all wp-content assets from the old WordPress hosting
// into the Supabase "media" bucket under wp/<year>/<month>/<file>.
const EXTRA_URLS = [
  "https://react2u.nl/wp-content/uploads/2023/07/cropped-cropped-Logo_react2u.png",
  "https://react2u.nl/wp-content/uploads/2023/05/cropped-favicon-react2u-32x32.png",
  "https://react2u.nl/wp-content/uploads/2023/05/cropped-favicon-react2u-180x180.png",
  "https://react2u.nl/wp-content/uploads/2023/05/Logo-kleur.svg",
  "https://react2u.nl/wp-content/uploads/2025/05/Algemene%20voorwaarden%20r2u.pdf",
  "https://react2u.nl/wp-content/uploads/2025/05/Klachtenprocedure%20r2u.pdf",
  "https://react2u.nl/wp-content/uploads/2025/05/Privacy%20reglement%20r2u.pdf",
];

function keyForUrl(u: string): string {
  const rel = decodeURIComponent(new URL(u).pathname.split("/wp-content/uploads/")[1] || "unknown");
  return "wp/" + rel.replace(/[^a-zA-Z0-9./_-]+/g, "-");
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sb = createClient(base, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { data: blocks } = await sb.from("blocks").select("data");
  const { data: pages } = await sb.from("pages").select("og_image");
  const haystack = JSON.stringify(blocks || []) + JSON.stringify(pages || []);
  const re = /https?:\/\/(?:www\.)?react2u\.nl\/wp-content\/uploads\/[^"\\\s]+/g;
  const urls = new Set<string>([...(haystack.match(re) || []), ...EXTRA_URLS]);

  const migrated: Record<string, string> = {};
  const failed: string[] = [];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (!res.ok) {
        failed.push(`${u} (http ${res.status})`);
        continue;
      }
      const buf = await res.arrayBuffer();
      const key = keyForUrl(u);
      const { error } = await sb.storage.from("media").upload(key, buf, {
        contentType: res.headers.get("content-type") || undefined,
        upsert: false,
      });
      if (error && !/exists|duplicate/i.test(error.message)) {
        failed.push(`${u} (${error.message})`);
        continue;
      }
      migrated[u] = `${base}/storage/v1/object/public/media/${key}`;
    } catch {
      failed.push(u);
    }
  }
  return NextResponse.json({ count: Object.keys(migrated).length, migrated, failed });
}
