import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { veiligTerugPad } from "@/lib/terug";
import LoginForm from "./LoginForm";

/**
 * Het inlogscherm. Wie al volledig is ingelogd (beheerder, en met code als
 * die vereist is) hoeft hier niets: die gaat meteen door, naar waar hij heen
 * wilde of naar het dashboard. Anders zag je na een bladwijzer of de
 * terugknop een leeg inlogformulier terwijl je gewoon ingelogd was.
 *
 * Halverwege inloggen (wachtwoord gegeven, code nog niet) blijf je hier: dat
 * deel doet het formulier zelf.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ terug?: string }>;
}) {
  const { terug } = await searchParams;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    const codeNodig = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    if (!codeNodig) {
      const { data } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (data) redirect(veiligTerugPad(terug) ?? "/admin");
    }
  }
  return <LoginForm />;
}
