import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-based client for the admin area (authenticated requests).
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch (err) {
            // Server Components mogen geen cookies zetten — dat negeren we.
            // Een andere fout (bv. vanuit een Server Action, waar dit wél hoort
            // te werken) loggen we, zodat een mislukte cookie-schrijfactie niet
            // stil verdwijnt zoals bij het uitlogprobleem.
            if (!(err instanceof Error) || !err.message.includes("Cookies can only be modified")) {
              console.error("supabaseServer: cookies.setAll mislukt", err);
            }
          }
        },
      },
    }
  );
}
