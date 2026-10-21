import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { veiligPad } from "@/lib/inloggen";

/**
 * Zet de voorbeeldmodus aan (zie src/lib/voorbeeld.ts) en stuurt door naar
 * `pad`, standaard /vacatures. Alleen voor wie het recht `vacatures` heeft;
 * anderen gaan naar de login. GET, omdat de admin er gewoon een link naartoe
 * heeft: aanzetten verandert alleen wat deze beheerder zelf ziet.
 */
export async function GET(req: Request) {
  await requirePerm("vacatures");
  (await draftMode()).enable();
  redirect(veiligPad(new URL(req.url).searchParams.get("pad")));
}
