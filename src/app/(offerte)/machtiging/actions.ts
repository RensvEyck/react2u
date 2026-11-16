"use server";
import { after } from "next/server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/analytics";
import { controleerMachtigingWerknemer, MACHTIGING_FOUT, MACHTIGING_WERKNEMER, ONBOARDING_EMAIL, schoonVelden, type MachtigingenGetekend, type MachtigingPubliek } from "@/lib/onboarding";
import { momentLang } from "@/lib/offertes";
import { bevestigMachtigingGetekend, machtigingUrl, notifyOnboarding, onboardingAdminUrl } from "@/lib/mail";
import { machtigingGetekendPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

/*
 * Wat de werknemer op /machtiging/<token> doet (0038): zijn gegevens invullen
 * en de machtiging tekenen. Next controleert de vorm (elfproef, datum), de
 * database de rest en legt de momentopname met hash vast. De bevestiging met
 * de pdf en het seintje aan React2u gaan pas na het antwoord (after).
 */

export type MachtigingState = { ok: boolean; fout?: string; velden?: Record<string, string> };

const TOKEN = /^[a-f0-9]{48,}$/;
const fout = (code: string | undefined): MachtigingState => ({ ok: false, fout: MACHTIGING_FOUT[code || ""] || MACHTIGING_FOUT.storing });

export async function tekenMachtiging(token: string, invoer: { gegevens: Record<string, unknown>; handtekening: string; akkoord: boolean }): Promise<MachtigingState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!invoer?.akkoord) return fout("akkoord");
  const gegevens = schoonVelden(MACHTIGING_WERKNEMER, invoer.gegevens || {});
  const velden = controleerMachtigingWerknemer(gegevens);
  if (Object.keys(velden).length) return { ok: false, fout: "Niet alles klopt nog. Kijk de velden met een melding even na.", velden };
  const handtekening = String(invoer.handtekening || "");
  if (!handtekening.startsWith("data:image/png;base64,") || handtekening.length < 200 || handtekening.length > 300_000) return fout("handtekening");
  if (!(await withinLimit("machtiging-tekenen", { limit: 20, windowSeconds: 60 * 60 }))) return fout("limiet");

  const h = await headers();
  const { data, error } = await supabasePublic().rpc("onboarding_machtiging_tekenen", {
    p_token: token, p_gegevens: gegevens, p_handtekening: handtekening, p_ip: clientIp(h), p_agent: h.get("user-agent"),
  });
  const uitkomst = data as { ok: boolean; fout?: string; onboarding_id?: string } | null;
  if (error || !uitkomst) {
    console.error("[machtiging] tekenen mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return fout(uitkomst.fout);

  after(async () => {
    const sb = supabasePublic();
    const [{ data: g }, { data: p }, { contact }] = await Promise.all([
      sb.rpc("onboarding_machtiging_getekend", { p_token: token }),
      sb.rpc("onboarding_machtiging_bekijken", { p_token: token, p_tel: false }),
      offerteHuisstijl(),
    ]);
    const getekend = g as MachtigingenGetekend | null;
    const pagina = p as MachtigingPubliek | null;
    const m = getekend?.machtigingen[0];
    if (!getekend || !m || !pagina) return;
    const pdf = await machtigingGetekendPdf(getekend, m, contact).catch((e) => { console.error("[machtiging] pdf mislukt:", e); return null; });
    const afzender = { naam: pagina.afzender_naam, functie: null, email: pagina.afzender_email || ONBOARDING_EMAIL, telefoon: pagina.afzender_telefoon };
    await Promise.all([
      bevestigMachtigingGetekend({
        to: m.email, naam: m.gegevens.naam, bedrijf: getekend.bedrijf, arbodienst: getekend.arbodienst.arbodienst || null, moment: momentLang(m.getekend_at),
        link: machtigingUrl(token), afzender, pdf: pdf ? { filename: `Machtiging overdracht verzuimdossier ${m.gegevens.naam}.pdf`, content: pdf } : null, contact,
      }),
      pagina.afzender_email && uitkomst.onboarding_id
        ? notifyOnboarding({ to: pagina.afzender_email, nummer: getekend.nummer, bedrijf: getekend.bedrijf, adminLink: onboardingAdminUrl(uitkomst.onboarding_id), soort: "getekend", naam: m.gegevens.naam })
        : Promise.resolve(),
    ]);
  });
  return { ok: true };
}
