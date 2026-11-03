"use server";
import { randomInt } from "crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/analytics";
import { CONTRACT_EMAIL, CONTRACT_FOUT, looptijdTekst, normaliseerOpdrachtgever, opdrachtgeverFout, type ContractPubliek, type Opdrachtgever } from "@/lib/contracten";
import { datumLang, momentLang } from "@/lib/offertes";
import { bevestigContractGetekend, contractAdminUrl, contractUrl, notifyContractGetekend, sendContractCode } from "@/lib/mail";
import { getekendContractPdf } from "@/lib/contractGetekend";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

/*
 * Wat de klant op /contract/<token> doet, zoals bij een offerte
 * (app/(offerte)/offerte/actions.ts): alles via de functies uit migratie 0031
 * met de publieke sleutel. De database controleert de rest en legt de getekende
 * versie vast; de mails gaan pas ná het antwoord (after).
 *
 * De code: Next maakt en mailt hem, de database bewaart alleen de hash, en
 * alleen met OFFERTE_SLEUTEL (dezelfde sleutel als voor offertes).
 */

export type ContractState = { ok: boolean; fout?: string };

const TOKEN = /^[a-f0-9]{48,}$/;

async function lees(token: string): Promise<ContractPubliek | null> {
  const { data } = await supabasePublic().rpc("contract_bekijken", { p_token: token, p_tel: false });
  return (data as ContractPubliek | null) ?? null;
}

const fout = (code: string | undefined): ContractState => ({ ok: false, fout: CONTRACT_FOUT[code || ""] || CONTRACT_FOUT.storing });

/** Een bevestigingscode van zes cijfers naar het e-mailadres van wie tekent. Een nieuwe code vervangt de vorige. */
export async function vraagContractCode(token: string, email: string): Promise<ContractState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  const adres = String(email || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) return fout("email");
  const sleutel = process.env.OFFERTE_SLEUTEL;
  if (!sleutel) {
    console.error("[contract] OFFERTE_SLEUTEL ontbreekt: er kan geen bevestigingscode worden verstuurd");
    return fout("storing");
  }
  if (!(await withinLimit("contract-code", { limit: 10, windowSeconds: 60 * 60 }))) return fout("limiet");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await supabasePublic().rpc("contract_code_vastleggen", { p_token: token, p_email: adres, p_code: code, p_sleutel: sleutel });
  const uitkomst = data as { ok: boolean; fout?: string } | null;
  if (error || !uitkomst) {
    console.error("[contract] code vastleggen mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return fout(uitkomst.fout);

  const [c, { contact }] = await Promise.all([lees(token), offerteHuisstijl()]);
  const verzonden = await sendContractCode({
    to: adres,
    code,
    nummer: c?.nummer || "",
    bedrijf: c?.bedrijf || "",
    afzender: { naam: c?.afzender_naam ?? null, functie: c?.afzender_functie ?? null, email: c?.afzender_email || CONTRACT_EMAIL, telefoon: c?.afzender_telefoon ?? null },
    contact,
  });
  if (!verzonden.ok) return fout("mail");
  return { ok: true };
}

export async function ondertekenContract(
  token: string,
  invoer: { naam: string; functie: string; email: string; plaats: string; handtekening: string; akkoord: boolean; code: string; opdrachtgever: Partial<Opdrachtgever> },
): Promise<ContractState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!invoer.akkoord) return fout("akkoord");
  const og = normaliseerOpdrachtgever(invoer.opdrachtgever);
  const of = opdrachtgeverFout(og);
  if (of) return fout(of);
  const code = String(invoer.code || "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) return fout("code");
  if (!(await withinLimit("contract-teken", { limit: 20, windowSeconds: 60 * 60 }))) return fout("limiet");

  const h = await headers();
  const { data, error } = await supabasePublic().rpc("contract_ondertekenen", {
    p_token: token,
    p_naam: String(invoer.naam || "").slice(0, 200),
    p_functie: String(invoer.functie || "").slice(0, 200),
    p_email: String(invoer.email || "").slice(0, 300),
    p_handtekening: String(invoer.handtekening || "").slice(0, 300_001),
    p_code: code,
    p_opdrachtgever: og,
    p_plaats: String(invoer.plaats || "").slice(0, 120),
    p_ip: clientIp(h),
    p_agent: h.get("user-agent"),
  });
  if (error || !data) {
    console.error("[contract] ondertekenen mislukt:", error?.message);
    return fout("storing");
  }
  const uitkomst = data as { ok: boolean; fout?: string };
  if (!uitkomst.ok) return fout(uitkomst.fout);

  after(async () => {
    const c = await lees(token);
    if (!c || !c.getekend_inhoud) return;
    const inhoud = c.getekend_inhoud;
    // De pdf hoort bij beide mails; lukt hij niet, dan gaan de mails zonder (de link werkt altijd).
    const pdf = await getekendContractPdf(token, c).catch((e) => {
      console.error("[contract] pdf maken mislukt:", e);
      return null;
    });
    const og2 = inhoud.opdrachtgever || {};
    const looptijd = `${looptijdTekst(inhoud.ingangsdatum, inhoud.einddatum)}, van ${datumLang(inhoud.ingangsdatum)} tot en met ${datumLang(inhoud.einddatum)}`;
    const organisatie = [og2.naam || inhoud.bedrijf, og2.adres || "", [og2.postcode, og2.plaats].filter(Boolean).join(" "), og2.kvk ? `KvK ${og2.kvk}` : ""].filter(Boolean);
    const afzender = { naam: c.afzender_naam, functie: c.afzender_functie, email: c.afzender_email || CONTRACT_EMAIL, telefoon: c.afzender_telefoon };
    const { contact } = await offerteHuisstijl();
    await Promise.all([
      bevestigContractGetekend({
        to: inhoud.getekend_email,
        naam: inhoud.getekend_naam,
        bedrijf: og2.naam || inhoud.bedrijf,
        nummer: inhoud.nummer,
        link: contractUrl(token),
        hash: c.getekend_hash || "",
        moment: momentLang(inhoud.getekend_at),
        regels: [
          { label: "Opdrachtgever", waarde: `${og2.naam || inhoud.bedrijf}${og2.kvk ? `, KvK ${og2.kvk}` : ""}` },
          { label: "Getekend door", waarde: `${inhoud.getekend_naam}, ${inhoud.getekend_functie}` },
          { label: "Ingangsdatum", waarde: datumLang(inhoud.ingangsdatum) },
          { label: "Looptijd", waarde: `${looptijdTekst(inhoud.ingangsdatum, inhoud.einddatum)}, daarna stilzwijgend verlengd` },
          ...(inhoud.offerte_kenmerk ? [{ label: "Offerte", waarde: inhoud.offerte_kenmerk }] : []),
        ],
        afzender,
        pdf,
        contact,
      }),
      notifyContractGetekend({
        nummer: inhoud.nummer,
        bedrijf: inhoud.bedrijf,
        naam: inhoud.getekend_naam,
        functie: inhoud.getekend_functie,
        email: inhoud.getekend_email,
        organisatie,
        looptijd,
        adminLink: contractAdminUrl(c.id),
        afzenderEmail: c.afzender_email,
        pdf,
      }),
    ]);
  });
  return { ok: true };
}
