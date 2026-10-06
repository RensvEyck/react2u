import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublic } from "./supabase/public";
import { serviceRoleAvailable, supabaseAdmin } from "./supabase/admin";

/**
 * Alles rond cv-bestanden in de private bucket `cvs`.
 *
 * Twee regels die hier hard gelden (zie CONTEXT.md, *Bewaartermijnen en privacy*):
 * - verwijderen controleert of het bestand écht weg is: Supabase Storage meldt
 *   géén fout als een policy het tegenhoudt, `remove()` geeft dan een lege
 *   lijst terug en het bestand blijft staan;
 * - de volgorde is eerst het bestand, dan de rij — andersom houd je een wees
 *   over waar niets meer naar verwijst.
 */

export const MAX_CV_BYTES = 8 * 1024 * 1024;
export const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type Storage = Pick<SupabaseClient, "storage">;

/**
 * Verwijdert cv's en geeft `true` terug als ze allemaal weg zijn. Een bestand
 * dat na `remove()` nog in de lijst staat, telt als mislukt.
 */
export async function removeCvs(sb: Storage, paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  const { data: removed, error } = await sb.storage.from("cvs").remove(paths);
  if (error) return false;
  const gone = new Set(((removed as { name: string }[] | null) || []).map((o) => o.name));
  for (const path of paths.filter((p) => !gone.has(p))) {
    const slash = path.lastIndexOf("/");
    const folder = slash > -1 ? path.slice(0, slash) : "";
    const name = path.slice(slash + 1);
    const { data } = await sb.storage.from("cvs").list(folder, { search: name, limit: 10 });
    if ((data || []).some((f) => f.name === name)) return false;
  }
  return true;
}

/**
 * Zet een cv in de bucket en geeft het pad terug, of null als het niet lukte.
 *
 * Met SUPABASE_SERVICE_ROLE_KEY gaat dit buiten RLS om: dat is hier bewust,
 * zodat de publieke sleutel geen schrijfrecht op de bucket meer nodig heeft
 * (migratie 0014) en niemand buiten dit formulier om bestanden kan plaatsen.
 * De aanroeper heeft dan al gecontroleerd: honeypot, limiet per IP, type en
 * grootte. Zonder die sleutel valt het terug op de anon-sleutel — dat werkt
 * alleen zolang 0014 niet gedraaid is.
 */
export async function uploadCv(cv: File): Promise<string | null> {
  const ext = cv.name.split(".").pop() || "pdf";
  const path = `${crypto.randomUUID()}/${cv.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `cv.${ext}`}`;
  const sb = serviceRoleAvailable() ? supabaseAdmin() : supabasePublic();
  const { error } = await sb.storage.from("cvs").upload(path, cv, { contentType: cv.type });
  return error ? null : path;
}
