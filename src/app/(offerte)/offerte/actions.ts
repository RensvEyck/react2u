"use server";
import { after } from "next/server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/analytics";
import {
  berekenTotalen, euro, momentLang, normaliseerRegels, ONDERTEKEN_FOUT, type OffertePubliek,
} from "@/lib/offertes";
import {
  bevestigOfferteGetekend, notifyOfferteAfgewezen, notifyOfferteGetekend, offerteAdminUrl, offerteUrl,
} from "@/lib/mail";

/*
 * Wat de klant op /offerte/<token> doet. Alles loopt via de functies uit
 * migratie 0024 met de publieke sleutel: het token is de sleutel, de database
 * controleert de rest (status, geldigheid, keuze) en legt de getekende versie
 * vast. De mails gaan pas ná het antwoord (after), zodat de klant niet op
 * Resend wacht.
 */

export type TekenState = { ok: boolean; fout?: string };

const TOKEN = /^[a-f0-9]{48,}$/;

/** De tussenstand van de klant, zodat sales ziet wat er is aangeklikt. Faalt stil: het is een extra. */
export async function bewaarKeuze(token: string, keuze: string[]): Promise<void> {
  if (!TOKEN.test(token) || !Array.isArray(keuze) || keuze.length > 200) return;
  await supabasePublic().rpc("offerte_keuze_bewaren", { p_token: token, p_keuze: keuze.map(String) });
}

async function lees(token: string): Promise<OffertePubliek | null> {
  const { data } = await supabasePublic().rpc("offerte_bekijken", { p_token: token, p_tel: false });
  return (data as OffertePubliek | null) ?? null;
}

export async function ondertekenOfferte(
  token: string,
  invoer: { keuze: string[]; naam: string; functie: string; email: string; handtekening: string; akkoord: boolean },
): Promise<TekenState> {
  if (!TOKEN.test(token)) return { ok: false, fout: ONDERTEKEN_FOUT.onbekend };
  if (!invoer.akkoord) return { ok: false, fout: ONDERTEKEN_FOUT.akkoord };
  // Ruim: wie zich vergist in zijn naam probeert het een paar keer, een script niet tientallen.
  if (!(await withinLimit("offerte-teken", { limit: 20, windowSeconds: 60 * 60 }))) return { ok: false, fout: ONDERTEKEN_FOUT.limiet };

  const h = await headers();
  const { data, error } = await supabasePublic().rpc("offerte_ondertekenen", {
    p_token: token,
    p_keuze: (invoer.keuze || []).map(String).slice(0, 200),
    p_naam: String(invoer.naam || "").slice(0, 200),
    p_functie: String(invoer.functie || "").slice(0, 200),
    p_email: String(invoer.email || "").slice(0, 300),
    p_handtekening: String(invoer.handtekening || "").slice(0, 300_001),
    p_ip: clientIp(h),
    p_agent: h.get("user-agent"),
  });
  if (error || !data) {
    console.error("[offerte] ondertekenen mislukt:", error?.message);
    return { ok: false, fout: ONDERTEKEN_FOUT.storing };
  }
  const uitkomst = data as { ok: boolean; fout?: string; id?: string; hash?: string; getekend_at?: string };
  if (!uitkomst.ok) return { ok: false, fout: ONDERTEKEN_FOUT[uitkomst.fout || ""] || ONDERTEKEN_FOUT.storing };

  after(async () => {
    const o = await lees(token);
    if (!o || !o.getekend_inhoud) return;
    const inhoud = o.getekend_inhoud;
    const regels = normaliseerRegels(inhoud.regels);
    const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
    const totalen = [
      ...(t.perJaar ? [{ label: "Per jaar", bedrag: euro(t.perJaar) }] : []),
      ...(t.eenmalig ? [{ label: "Eenmalig", bedrag: euro(t.eenmalig) }] : []),
    ];
    const afzender = { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email, telefoon: o.afzender_telefoon };
    await Promise.all([
      bevestigOfferteGetekend({
        to: inhoud.getekend_email,
        naam: inhoud.getekend_naam,
        bedrijf: inhoud.bedrijf,
        nummer: inhoud.nummer,
        link: offerteUrl(token),
        hash: o.getekend_hash || "",
        moment: momentLang(inhoud.getekend_at),
        regels: t.regels.map((r) => ({
          naam: r.regel.naam,
          bedrag: r.bedrag === null ? "Op aanvraag" : `${euro(r.bedrag)}${r.periode === "jaar" ? " per jaar" : ""}`,
        })),
        totalen,
        afzender,
      }),
      notifyOfferteGetekend({
        nummer: inhoud.nummer,
        bedrijf: inhoud.bedrijf,
        naam: inhoud.getekend_naam,
        functie: inhoud.getekend_functie,
        email: inhoud.getekend_email,
        perJaar: euro(t.perJaar),
        eenmalig: t.eenmalig ? euro(t.eenmalig) : null,
        regels: t.regels.map((r) => r.regel.naam),
        adminLink: offerteAdminUrl(o.id),
        afzenderEmail: o.afzender_email,
      }),
    ]);
  });
  return { ok: true };
}

export async function wijsOfferteAf(token: string, invoer: { reden: string; naam: string }): Promise<TekenState> {
  if (!TOKEN.test(token)) return { ok: false, fout: ONDERTEKEN_FOUT.onbekend };
  if (!(await withinLimit("offerte-afwijzen", { limit: 10, windowSeconds: 60 * 60 }))) return { ok: false, fout: ONDERTEKEN_FOUT.limiet };
  const reden = String(invoer.reden || "").slice(0, 2000);
  const naam = String(invoer.naam || "").slice(0, 120);
  const { data, error } = await supabasePublic().rpc("offerte_afwijzen", { p_token: token, p_reden: reden, p_naam: naam });
  const uitkomst = data as { ok: boolean; fout?: string; id?: string; nummer?: string } | null;
  if (error || !uitkomst) return { ok: false, fout: ONDERTEKEN_FOUT.storing };
  if (!uitkomst.ok) return { ok: false, fout: ONDERTEKEN_FOUT[uitkomst.fout || ""] || ONDERTEKEN_FOUT.storing };
  after(async () => {
    const o = await lees(token);
    if (!o) return;
    await notifyOfferteAfgewezen({
      nummer: o.nummer, bedrijf: o.bedrijf, reden: reden.trim() || null, naam: naam.trim() || null,
      adminLink: offerteAdminUrl(o.id), afzenderEmail: o.afzender_email,
    });
  });
  return { ok: true };
}
