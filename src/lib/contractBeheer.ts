import "server-only";
import type { supabaseServer } from "./supabase/server";
import { normaliseerOpdrachtgever, offerteKenmerk, type OfferteKeuze } from "./contracten";
import { normaliseerFactuur, OFFERTE_EMAIL, type Offerte } from "./offertes";

/*
 * Wat de contractschermen in het beheer uit de database halen: de offertes om
 * aan te koppelen, en een offerte als beginpunt van een nieuw contract.
 */

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/** Verstuurde en getekende offertes, nieuwste eerst: waar een contract bij kan horen. */
export async function offerteKeuzes(sb: Sb): Promise<OfferteKeuze[]> {
  const { data } = await sb
    .from("offertes")
    .select("id, nummer, bedrijf, status, getekend_at, verstuurd_at")
    .in("status", ["verstuurd", "getekend"])
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as OfferteKeuze[] | null) || [];
}

/**
 * Een offerte als beginpunt (?offerte=<id>): dezelfde klant en afzender, het
 * kenmerk van de offerte, en wat de klant bij het tekenen invulde (factuuradres
 * en KvK) als gegevens van zijn organisatie. Wie de offerte tekende, wordt de
 * contactpersoon: die tekent meestal ook het contract.
 */
export async function uitOfferte(sb: Sb, id: string) {
  const { data } = await sb.from("offertes").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const o = data as Offerte;
  const getekend = o.status === "getekend" && o.getekend_inhoud;
  const f = normaliseerFactuur(getekend ? o.getekend_inhoud!.factuur : o.factuur);
  const velden = {
    bedrijf: o.bedrijf,
    contactpersoon: (getekend ? o.getekend_inhoud!.getekend_naam : null) || o.contactpersoon,
    email: (getekend ? o.getekend_inhoud!.getekend_email : null) || o.email,
    telefoon: o.telefoon,
    opdrachtgever: normaliseerOpdrachtgever({ naam: o.bedrijf, adres: f.adres, postcode: f.postcode, plaats: f.plaats, kvk: f.kvk }),
    offerte_id: o.id,
    offerte_kenmerk: offerteKenmerk(o),
    afzender_naam: o.afzender_naam,
    afzender_functie: o.afzender_functie,
    afzender_email: o.afzender_email || OFFERTE_EMAIL,
    afzender_telefoon: o.afzender_telefoon,
  };
  return { nummer: o.nummer, velden };
}
