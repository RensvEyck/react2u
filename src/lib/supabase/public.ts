import { createClient } from "@supabase/supabase-js";

// Anonymous client for public reads and public form submissions (RLS enforced).
export function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
