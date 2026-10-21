"use server";

import { draftMode, headers } from "next/headers";
import { redirect } from "next/navigation";
import { pathFromReferer } from "@/lib/conversions";
import { veiligPad } from "@/lib/inloggen";

/** Zet de voorbeeldmodus uit en blijft op dezelfde pagina. */
export async function stopVoorbeeld() {
  (await draftMode()).disable();
  redirect(veiligPad(pathFromReferer((await headers()).get("referer"))));
}
