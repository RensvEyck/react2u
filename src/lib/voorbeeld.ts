import { draftMode } from "next/headers";
import { DatabaseFout, getPublishedVacancies, getVacancy } from "./content";
import { supabaseServer } from "./supabase/server";
import { OPEN_SOLLICITATIE } from "./taal";
import type { Vacancy } from "./types";

/**
 * Voorbeeldmodus: een beheerder ziet de site alsof de conceptvacatures al live
 * staan. Aan via /api/voorbeeld (alleen met het recht `vacatures`), uit via de
 * balk onderaan de site. Technisch is het Draft Mode van Next: wie de cookie
 * heeft krijgt elke pagina vers gerenderd en nooit uit de cache, iedereen
 * anders ziet de gewone statische site.
 *
 * De cookie zelf geeft geen toegang. In de voorbeeldmodus lezen we met de
 * sessie van de bezoeker (supabaseServer), dus RLS beslist: een beheerder met
 * het recht `vacatures` ziet de concepten, een ander met dezelfde cookie ziet
 * alleen wat gepubliceerd is. Een gesloten vacature staat, net als op de
 * gewone site, als "vervuld" op haar eigen pagina en nergens in een lijst.
 */
export async function inVoorbeeld(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false; // buiten een verzoek, bijvoorbeeld tijdens de build
  }
}

const ZICHTBAAR = ["published", "draft"];
// Eén vacature op haar eigen pagina: ook gesloten (vervuld), net als buiten
// de voorbeeldmodus (getVacancy in lib/content.ts).
const ZICHTBAAR_LOS = [...ZICHTBAAR, "closed"];

/** De vacatures voor de pagina's: gepubliceerd, of in de voorbeeldmodus ook de concepten. */
export async function getZichtbareVacatures(): Promise<Vacancy[]> {
  if (!(await inVoorbeeld())) return getPublishedVacancies();
  const sb = await supabaseServer();
  const { data, error } = await sb.from("vacancies").select("*").in("status", ZICHTBAAR)
    .order("published_at", { ascending: false, nullsFirst: false }).order("title");
  if (error) throw new DatabaseFout("vacatures (voorbeeld)", error);
  // De open sollicitatie heeft een eigen vaste pagina; als concept-vacature zou
  // hij er in het overzicht dubbel staan.
  return ((data as Vacancy[]) || []).filter((v) => v.slug !== OPEN_SOLLICITATIE.nl);
}

/** Eén vacature voor de pagina: gepubliceerd, of in de voorbeeldmodus ook een concept. */
export async function getZichtbareVacature(slug: string): Promise<Vacancy | null> {
  if (!(await inVoorbeeld())) return getVacancy(slug);
  const sb = await supabaseServer();
  const { data, error } = await sb.from("vacancies").select("*").eq("slug", slug).in("status", ZICHTBAAR_LOS).maybeSingle();
  if (error) throw new DatabaseFout(`vacature ${slug} (voorbeeld)`, error);
  return (data as Vacancy) || null;
}
