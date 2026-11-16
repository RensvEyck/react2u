"use server";
import { after } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import {
  controleerVelden, controleerWerknemers, documentInfo, INRICHTING, isDocument, MACHTIGING, ONBOARDING_FOUT, schoneWerknemers, schoonVelden,
  type OnboardingPubliek,
} from "@/lib/onboarding";
import { notifyOnboarding, onboardingAdminUrl } from "@/lib/mail";

/*
 * Wat de klant op /onboarding/<token> doet (migratie 0037): een document
 * invullen of afvinken. Next controleert de vorm van de invoer, de database
 * of het mag (token, status, gekozen document) en hoe groot het is. Seintjes
 * aan de afzender gaan pas na het antwoord (after).
 */

export type OnboardingState = { ok: boolean; fout?: string; velden?: Record<string, string>; rijen?: Record<number, Record<string, string>> };

const TOKEN = /^[a-f0-9]{48,}$/;
const fout = (code: string | undefined): OnboardingState => ({ ok: false, fout: ONBOARDING_FOUT[code || ""] || ONBOARDING_FOUT.storing });

type Uitkomst = { ok: boolean; fout?: string; eerste?: boolean; afgerond?: boolean } | null;

async function seintje(token: string, uitkomst: Uitkomst, document?: string) {
  if (!uitkomst?.ok || !(uitkomst.eerste || uitkomst.afgerond)) return;
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  const o = data as OnboardingPubliek | null;
  if (!o?.afzender_email) return;
  const basis = { to: o.afzender_email, nummer: o.nummer, bedrijf: o.bedrijf, adminLink: onboardingAdminUrl(o.id) };
  if (uitkomst.afgerond) await notifyOnboarding({ ...basis, soort: "afgerond" });
  else if (uitkomst.eerste && document && isDocument(document)) await notifyOnboarding({ ...basis, soort: "ingevuld", document: documentInfo(document).titel.toLowerCase() });
}

/** Een formulier opslaan: inrichting, machtiging of het werknemersbestand. */
export async function slaOnboardingOp(token: string, document: string, invoer: Record<string, unknown>, naam?: string): Promise<OnboardingState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!isDocument(document) || documentInfo(document).invullen === null) return fout("document");
  if (!(await withinLimit("onboarding-opslaan", { limit: 60, windowSeconds: 60 * 60 }))) return fout("limiet");

  let data: Record<string, unknown>;
  if (document === "werknemers") {
    const rijen = schoneWerknemers(invoer?.rijen);
    if (!rijen.length) return { ok: false, fout: "Voeg minstens één medewerker toe." };
    const fouten = controleerWerknemers(rijen);
    if (Object.keys(fouten).length) return { ok: false, fout: "Niet alles klopt nog. De velden met een rode rand vragen aandacht.", rijen: fouten };
    data = { rijen };
  } else {
    const groepen = document === "inrichting" ? INRICHTING : MACHTIGING;
    const velden = schoonVelden(groepen, invoer || {});
    const fouten = controleerVelden(groepen, velden);
    if (Object.keys(fouten).length) return { ok: false, fout: "Niet alles klopt nog. Kijk de velden met een melding even na.", velden: fouten };
    data = velden;
  }

  const { data: res, error } = await supabasePublic().rpc("onboarding_opslaan", {
    p_token: token, p_document: document, p_data: data, p_naam: String(naam || "").trim().slice(0, 200) || null,
  });
  const uitkomst = res as Uitkomst;
  if (error || !uitkomst) {
    console.error("[onboarding] opslaan mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return fout(uitkomst.fout);
  after(() => seintje(token, uitkomst, document));
  return { ok: true };
}

/** Een document afvinken: gelezen, of gedownload en geregeld. */
export async function vinkOnboardingAf(token: string, document: string): Promise<OnboardingState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!isDocument(document)) return fout("document");
  if (!(await withinLimit("onboarding-afvinken", { limit: 120, windowSeconds: 60 * 60 }))) return fout("limiet");
  const { data: res, error } = await supabasePublic().rpc("onboarding_gelezen", { p_token: token, p_document: document });
  const uitkomst = res as Uitkomst;
  if (error || !uitkomst) {
    console.error("[onboarding] afvinken mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return fout(uitkomst.fout);
  after(() => seintje(token, uitkomst));
  return { ok: true };
}
