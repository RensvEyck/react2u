import "server-only";
import type { supabaseServer } from "./supabase/server";
import { normaliseerOpdrachtgever, offerteKenmerk, type OfferteKeuze, type PartnerKeuze } from "./contracten";
import { resellerTekst } from "./contractTekst";
import { normaliseerFactuur, OFFERTE_EMAIL, type Offerte } from "./offertes";
import type { Partner } from "./types";

/*
 * Wat de contractschermen in het beheer uit de database halen: de offertes om
 * aan te koppelen, een offerte als beginpunt van een nieuw basiscontract, en de
 * partners voor een resellerovereenkomst (0033).
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

/** Alle partners, actief eerst: bij wie een resellerovereenkomst hoort. Leeg zonder migratie 0022. */
export async function partnerKeuzes(sb: Sb): Promise<PartnerKeuze[]> {
  const { data } = await sb.from("partners").select("id, kantoor, code, actief, pct_jaar_een, pct_vervolg").order("actief", { ascending: false }).order("kantoor");
  return ((data as PartnerKeuze[] | null) || []).map((p) => ({ ...p, pct_jaar_een: Number(p.pct_jaar_een), pct_vervolg: Number(p.pct_vervolg) }));
}

/**
 * Een partner als beginpunt (?partner=<id>): het kantoor, de contactpersoon en
 * zijn gegevens, en de tekst met de percentages die met deze partner zijn
 * afgesproken (artikel 3.1). Het KvK-nummer en het adres vult de partner zelf
 * in bij het tekenen.
 */
export async function uitPartner(sb: Sb, id: string) {
  const { data } = await sb.from("partners").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const p = data as Partner;
  const pct = { jaarEen: Number(p.pct_jaar_een), vervolg: Number(p.pct_vervolg) };
  const velden = {
    partner_id: p.id,
    bedrijf: p.kantoor,
    contactpersoon: p.naam,
    email: p.email,
    telefoon: p.telefoon,
    opdrachtgever: normaliseerOpdrachtgever({ naam: p.kantoor, email: p.email, telefoon: p.telefoon }),
    tekst: resellerTekst(pct),
  };
  return { kantoor: p.kantoor, pct, velden };
}
