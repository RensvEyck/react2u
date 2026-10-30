import "server-only";
import { supabasePublic } from "./supabase/public";
import { offerteUrl, type Bijlage } from "./mail";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { offertePdf } from "./offertePdf";
import { herstelKeuze, normaliseerRegels, pdfNaam, type CertificaatGegevens, type GetekendeInhoud, type OffertePubliek } from "./offertes";

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
 * Een concept om intern te bespreken: de offerte zoals hij nu is, met de
 * keuze die de klant op dat moment heeft (uit de pagina, anders zijn bewaarde
 * tussenstand), zonder handtekening en certificaat. Alleen voor een offerte
 * die (nog) niet getekend is; een getekende heeft zijn eigen pdf.
 */
export async function conceptPdf(o: OffertePubliek, keuze: string[] | null, link: string): Promise<Bijlage | null> {
  if (o.status === "getekend" || o.status === "ingetrokken") return null;
  const regels = normaliseerRegels(o.regels);
  if (!regels.length) return null;
  const huis = await offerteHuisstijl();
  const inhoud: GetekendeInhoud = {
    nummer: o.nummer, vorm: o.vorm, bedrijf: o.bedrijf, contactpersoon: o.contactpersoon, medewerkers: o.medewerkers,
    titel: o.titel, betreft: o.betreft, intro: o.intro, inhoud: o.inhoud, voorwaarden: o.voorwaarden, vervolg: o.vervolg,
    regels, keuze: herstelKeuze(regels, keuze ?? o.keuze), geldig_tot: o.geldig_tot,
    afzender_naam: o.afzender_naam, afzender_functie: o.afzender_functie, afzender_email: o.afzender_email, verstuurd_at: o.verstuurd_at,
    // Een concept is niet getekend; het document toont deze velden dan niet.
    getekend_naam: "", getekend_functie: null, getekend_email: "", getekend_at: "",
  };
  const content = await offertePdf({ inhoud, hash: "", handtekening: null, certificaat: null, contact: huis.contact, link, concept: true });
  return { filename: pdfNaam(o, "concept"), content };
}

/** De keuze uit `?keuze=a,b` van de downloadlink, of null als die er niet is. */
export function keuzeUitUrl(url: URL): string[] | null {
  const ruw = url.searchParams.get("keuze");
  if (ruw === null) return null;
  return ruw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 200);
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
