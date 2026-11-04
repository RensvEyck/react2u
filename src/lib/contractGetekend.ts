import "server-only";
import { supabasePublic } from "./supabase/public";
import { contractUrl, type Bijlage } from "./mail";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { contractPdf } from "./contractPdf";
import { contractPdfNaam, normaliseerOpdrachtgever, soortVan, type Contract, type ContractCertificaat, type ContractPubliek, type GetekendContract } from "./contracten";

/**
 * Het getekende contract als pdf-bijlage, of null als het (nog) niet getekend
 * is. Via het token en de publieke functies uit 0031, net als de klantpagina:
 * de klantroute, de beheerroute en de mails na het tekenen maken zo precies
 * dezelfde pdf (zoals lib/offerteGetekend.ts).
 */
export async function getekendContractPdf(token: string, bekend?: ContractPubliek | null): Promise<Bijlage | null> {
  const sb = supabasePublic();
  const c = bekend ?? ((await sb.rpc("contract_bekijken", { p_token: token, p_tel: false })).data as ContractPubliek | null);
  if (!c || c.status !== "getekend" || !c.getekend_inhoud || !c.getekend_hash) return null;
  const [{ data: certificaat }, huis] = await Promise.all([sb.rpc("contract_certificaat", { p_token: token }), offerteHuisstijl()]);
  const content = await contractPdf({
    inhoud: c.getekend_inhoud,
    hash: c.getekend_hash,
    handtekening: c.handtekening,
    certificaat: (certificaat as ContractCertificaat | null) ?? null,
    contact: huis.contact,
    link: contractUrl(token),
  });
  return { filename: contractPdfNaam(c.getekend_inhoud), content };
}

/**
 * Een concept om intern te bespreken: het contract zoals het nu is, met wat
 * sales al over de klant invulde, zonder handtekening en certificaat. Alleen
 * voor een contract dat (nog) niet getekend is.
 */
export async function conceptContractPdf(
  c: Pick<Contract, "nummer" | "status" | "soort" | "bedrijf" | "contactpersoon" | "opdrachtnemer" | "opdrachtgever" | "offerte_kenmerk" | "ingangsdatum" | "einddatum" | "tekst" | "tekst_versie" | "aanvullend" | "afzender_naam" | "afzender_functie" | "afzender_email" | "verstuurd_at">,
  link: string,
): Promise<Bijlage | null> {
  if (c.status === "getekend" || c.status === "ingetrokken") return null;
  const huis = await offerteHuisstijl();
  const inhoud: GetekendContract = {
    nummer: c.nummer, soort: soortVan(c), bedrijf: c.bedrijf, contactpersoon: c.contactpersoon,
    opdrachtnemer: c.opdrachtnemer, opdrachtgever: normaliseerOpdrachtgever(c.opdrachtgever),
    // Een resellerovereenkomst gaat pas in bij ondertekening; het concept noemt dan geen datum.
    offerte_kenmerk: c.offerte_kenmerk, ingangsdatum: c.ingangsdatum ?? "", einddatum: c.einddatum,
    tekst: c.tekst, tekst_versie: c.tekst_versie, aanvullend: c.aanvullend,
    afzender_naam: c.afzender_naam, afzender_functie: c.afzender_functie, afzender_email: c.afzender_email, verstuurd_at: c.verstuurd_at,
    // Een concept is niet getekend; het document toont deze velden dan niet.
    getekend_naam: "", getekend_functie: "", getekend_email: "", getekend_plaats: "", getekend_at: "",
  };
  const content = await contractPdf({ inhoud, hash: "", handtekening: null, certificaat: null, contact: huis.contact, link, concept: true });
  return { filename: contractPdfNaam(c, "concept"), content };
}
