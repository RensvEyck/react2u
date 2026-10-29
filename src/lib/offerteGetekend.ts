import "server-only";
import { supabasePublic } from "./supabase/public";
import { offerteUrl, type Bijlage } from "./mail";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { offertePdf } from "./offertePdf";
import { pdfNaam, type CertificaatGegevens, type OffertePubliek } from "./offertes";

/**
 * De getekende offerte als pdf-bijlage, of null als hij (nog) niet getekend
 * is. Alles via het token en de publieke functies uit 0024–0026, net als de
 * klantpagina: de klantroute, de beheerroute en de mails na het tekenen maken
 * zo precies dezelfde pdf.
 */
export async function getekendePdf(token: string, bekend?: OffertePubliek | null): Promise<Bijlage | null> {
  const sb = supabasePublic();
  const o = bekend ?? ((await sb.rpc("offerte_bekijken", { p_token: token, p_tel: false })).data as OffertePubliek | null);
  if (!o || o.status !== "getekend" || !o.getekend_inhoud || !o.getekend_hash) return null;
  const [{ data: certificaat }, huis] = await Promise.all([
    sb.rpc("offerte_certificaat", { p_token: token }),
    offerteHuisstijl(),
  ]);
  const content = await offertePdf({
    inhoud: o.getekend_inhoud,
    hash: o.getekend_hash,
    handtekening: o.handtekening,
    certificaat: (certificaat as CertificaatGegevens | null) ?? null,
    contact: huis.contact,
    link: offerteUrl(token),
    afzenderFunctie: o.afzender_functie,
  });
  return { filename: pdfNaam(o.getekend_inhoud), content };
}

/**
 * De pdf als antwoord van een route. Standaard in de browser (inline); met
 * `download` als bestand. De naam twee keer: ASCII voor oude browsers, en
 * volledig (filename*) voor de rest.
 */
export function pdfAntwoord(b: Bijlage, download = false): Response {
  const ascii = b.filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(new Uint8Array(b.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(b.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
