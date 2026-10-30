"use server";
import { randomInt } from "crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/analytics";
import {
  berekenTotalen, euro, factuurFout, momentLang, normaliseerFactuur, normaliseerRegels, OFFERTE_EMAIL, ONDERTEKEN_FOUT, regelbedrag,
  type Factuur, type OffertePubliek,
} from "@/lib/offertes";
import {
  bevestigOfferteGetekend, notifyOfferteAfgewezen, notifyOfferteGetekend, offerteAdminUrl, offerteUrl, sendOfferteCode,
} from "@/lib/mail";
import { getekendePdf } from "@/lib/offerteGetekend";

/*
 * Wat de klant op /offerte/<token> doet. Alles loopt via de functies uit
 * migratie 0024 met de publieke sleutel: het token is de sleutel, de database
 * controleert de rest (status, geldigheid, keuze) en legt de getekende versie
 * vast. De mails gaan pas ná het antwoord (after), zodat de klant niet op
 * Resend wacht.
 *
 * Sinds 0026 tekent de klant met een code die naar zijn e-mailadres gaat.
 * Next maakt en mailt de code; de database bewaart alleen de hash, en alleen
 * als OFFERTE_SLEUTEL meekomt. Zo kan niemand met een directe aanroep een
 * eigen code vastleggen en om de mail heen tekenen.
 */

export type TekenState = { ok: boolean; fout?: string };
export type CodeState = { ok: boolean; fout?: string };

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

/**
 * Een bevestigingscode van zes cijfers naar het e-mailadres van wie tekent.
 * Een nieuwe code vervangt de vorige; de database staat er hooguit vijf per
 * uur per offerte toe, de limiet hier vangt het rondstrooien over offertes heen.
 */
export async function vraagCode(token: string, email: string): Promise<CodeState> {
  if (!TOKEN.test(token)) return { ok: false, fout: ONDERTEKEN_FOUT.onbekend };
  const adres = String(email || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) return { ok: false, fout: ONDERTEKEN_FOUT.email };
  const sleutel = process.env.OFFERTE_SLEUTEL;
  if (!sleutel) {
    console.error("[offerte] OFFERTE_SLEUTEL ontbreekt: er kan geen bevestigingscode worden verstuurd");
    return { ok: false, fout: ONDERTEKEN_FOUT.storing };
  }
  if (!(await withinLimit("offerte-code", { limit: 10, windowSeconds: 60 * 60 }))) return { ok: false, fout: ONDERTEKEN_FOUT.limiet };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await supabasePublic().rpc("offerte_code_vastleggen", { p_token: token, p_email: adres, p_code: code, p_sleutel: sleutel });
  const uitkomst = data as { ok: boolean; fout?: string } | null;
  if (error || !uitkomst) {
    console.error("[offerte] code vastleggen mislukt:", error?.message);
    return { ok: false, fout: ONDERTEKEN_FOUT.storing };
  }
  if (!uitkomst.ok) return { ok: false, fout: ONDERTEKEN_FOUT[uitkomst.fout || ""] || ONDERTEKEN_FOUT.storing };

  const o = await lees(token);
  const verzonden = await sendOfferteCode({
    to: adres,
    code,
    nummer: o?.nummer || "",
    bedrijf: o?.bedrijf || "",
    afzender: { naam: o?.afzender_naam ?? null, functie: o?.afzender_functie ?? null, email: o?.afzender_email || OFFERTE_EMAIL, telefoon: o?.afzender_telefoon ?? null },
  });
  if (!verzonden.ok) return { ok: false, fout: ONDERTEKEN_FOUT.mail };
  return { ok: true };
}

export async function ondertekenOfferte(
  token: string,
  invoer: {
    keuze: string[]; naam: string; functie: string; email: string; handtekening: string; akkoord: boolean;
    code: string; factuur: Partial<Factuur>;
  },
): Promise<TekenState> {
  if (!TOKEN.test(token)) return { ok: false, fout: ONDERTEKEN_FOUT.onbekend };
  if (!invoer.akkoord) return { ok: false, fout: ONDERTEKEN_FOUT.akkoord };
  const factuur = normaliseerFactuur(invoer.factuur);
  const ff = factuurFout(factuur);
  if (ff) return { ok: false, fout: ONDERTEKEN_FOUT[ff] };
  const code = String(invoer.code || "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) return { ok: false, fout: ONDERTEKEN_FOUT.code };
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
    p_code: code,
    p_factuur: factuur,
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
    // De pdf hoort bij beide mails; lukt hij niet, dan gaan de mails zonder (de link werkt altijd).
    const pdf = await getekendePdf(token, o).catch((e) => {
      console.error("[offerte] pdf maken mislukt:", e);
      return null;
    });
    const regels = normaliseerRegels(inhoud.regels);
    const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
    const totalen = [
      ...(t.perMaand ? [{ label: "Per maand", bedrag: euro(t.perMaand) }] : []),
      ...(t.eenmalig ? [{ label: "Eenmalig", bedrag: euro(t.eenmalig) }] : []),
    ];
    const afzender = { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || OFFERTE_EMAIL, telefoon: o.afzender_telefoon };
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
          bedrag: r.bedrag === null ? "Op aanvraag" : r.bedrag === 0 ? "Inbegrepen" : (() => {
            const b = regelbedrag(r);
            return `${euro(b.bedrag!)} ${b.per === "maand" ? "per maand" : "eenmalig"}`;
          })(),
        })),
        totalen,
        afzender,
        pdf,
      }),
      notifyOfferteGetekend({
        nummer: inhoud.nummer,
        bedrijf: inhoud.bedrijf,
        naam: inhoud.getekend_naam,
        functie: inhoud.getekend_functie,
        email: inhoud.getekend_email,
        perMaand: euro(t.perMaand),
        eenmalig: t.eenmalig ? euro(t.eenmalig) : null,
        regels: t.regels.map((r) => r.regel.naam),
        adminLink: offerteAdminUrl(o.id),
        afzenderEmail: o.afzender_email,
        factuur: inhoud.factuur ?? null,
        pdf,
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
