"use server";
import { after } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import { aandachtspunten, controleerAntwoorden, EVALUATIE_EMAIL, EVALUATIE_FOUT, schoonAntwoorden, type EvaluatiePubliek } from "@/lib/evaluatie";
import { momentLang } from "@/lib/offertes";
import { bevestigEvaluatieIngevuld, evaluatieAdminUrl, evaluatieUrl, notifyEvaluatie } from "@/lib/mail";
import { evaluatiePdf } from "@/lib/evaluatiePdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

/*
 * Wat de klant op /evaluatie/<token> doet (migratie 0043): de evaluatie
 * invullen of aanpassen. Next controleert de vorm van de invoer, de database
 * of het mag (token, status) en hoe groot het is. De seintjes aan de afzender
 * en de bevestiging aan de klant gaan pas na het antwoord (after).
 */

export type EvaluatieState = { ok: boolean; fout?: string; velden?: Record<string, string> };

const TOKEN = /^[a-f0-9]{48,}$/;
const fout = (code: string | undefined): EvaluatieState => ({ ok: false, fout: EVALUATIE_FOUT[code || ""] || EVALUATIE_FOUT.storing });

type Uitkomst = { ok: boolean; fout?: string; eerste?: boolean; email?: string | null; contactpersoon?: string | null } | null;

async function lees(token: string): Promise<EvaluatiePubliek | null> {
  const { data } = await supabasePublic().rpc("evaluatie_bekijken", { p_token: token, p_tel: false });
  return (data as EvaluatiePubliek | null) ?? null;
}

/**
 * Na opslaan: een seintje aan de afzender (met de aandachtspunten), en de
 * eerste keer een bevestiging aan de klant met de ingevulde evaluatie als pdf.
 */
async function seintje(token: string, uitkomst: Uitkomst) {
  if (!uitkomst?.ok) return;
  const e = await lees(token);
  if (!e) return;
  const punten = aandachtspunten(e.antwoorden).map((p) => p.naam);
  if (e.afzender_email) {
    await notifyEvaluatie({ to: e.afzender_email, nummer: e.nummer, bedrijf: e.bedrijf, adminLink: evaluatieAdminUrl(e.id), soort: "ingevuld", opnieuw: !uitkomst.eerste, door: e.ingevuld_door, aandachtspunten: punten });
  }
  if (!uitkomst.eerste || !uitkomst.email) return;
  const { contact, certificaten } = await offerteHuisstijl();
  const bijlage = await evaluatiePdf({ e, contact })
    .then((b) => ({ filename: `Klantevaluatie ${e.bedrijf}.pdf`, content: b }))
    .catch((err) => { console.error("[evaluatie] kopie-pdf mislukt:", err); return null; });
  await bevestigEvaluatieIngevuld({
    to: uitkomst.email, aanhef: uitkomst.contactpersoon?.split(" ")[0] ?? null, bedrijf: e.bedrijf, nummer: e.nummer, link: evaluatieUrl(token),
    moment: momentLang(e.ingevuld_at), door: e.ingevuld_door, aandachtspunten: punten,
    afzender: { naam: e.afzender_naam, functie: e.afzender_functie, email: e.afzender_email || EVALUATIE_EMAIL, telefoon: e.afzender_telefoon },
    bijlage, contact, certificaten,
  });
}

/** De evaluatie opslaan: de checklist, de vrije vakken, het volgende bezoek en de acties. */
export async function slaEvaluatieOp(token: string, invoer: unknown, naam?: string): Promise<EvaluatieState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!(await withinLimit("evaluatie-opslaan", { limit: 60, windowSeconds: 60 * 60 }))) return fout("limiet");
  const data = schoonAntwoorden(invoer);
  const fouten = controleerAntwoorden(data);
  if (Object.keys(fouten).length) {
    const open = Object.keys(fouten).filter((k) => k.startsWith("checklist.")).length;
    return {
      ok: false,
      fout: open ? `Nog ${open === 1 ? "één punt" : `${open} punten`} van de checklist zonder antwoord. Kies per punt ja, nee of niet van toepassing.` : "Niet alles klopt nog. Kijk de velden met een melding even na.",
      velden: fouten,
    };
  }
  const { data: res, error } = await supabasePublic().rpc("evaluatie_opslaan", { p_token: token, p_data: data, p_naam: String(naam || "").trim().slice(0, 200) || null });
  const uitkomst = res as Uitkomst;
  if (error || !uitkomst) {
    console.error("[evaluatie] opslaan mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return fout(uitkomst.fout);
  after(() => seintje(token, uitkomst));
  return { ok: true };
}
