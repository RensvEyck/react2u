"use server";
import { after } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import {
  controleerVelden, controleerWerknemers, documentInfo, INRICHTING, isDocument, MACHTIGING, ONBOARDING_EMAIL, ONBOARDING_FOUT, schoneWerknemers, schoonVelden,
  takenVoor, type OnboardingPubliek,
} from "@/lib/onboarding";
import { momentLang } from "@/lib/offertes";
import { notifyOnboarding, onboardingAdminUrl, onboardingUrl, sendOnboardingDoorgestuurd, sendOnboardingKlant } from "@/lib/mail";
import { onboardingPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

/*
 * Wat de klant op /onboarding/<token> doet (migratie 0037): een document
 * invullen of afvinken. Next controleert de vorm van de invoer, de database
 * of het mag (token, status, gekozen document) en hoe groot het is. Seintjes
 * aan de afzender gaan pas na het antwoord (after).
 */

export type OnboardingState = { ok: boolean; fout?: string; velden?: Record<string, string>; rijen?: Record<number, Record<string, string>> };

const TOKEN = /^[a-f0-9]{48,}$/;
const fout = (code: string | undefined): OnboardingState => ({ ok: false, fout: ONBOARDING_FOUT[code || ""] || ONBOARDING_FOUT.storing });

type Uitkomst = { ok: boolean; fout?: string; eerste?: boolean; afgerond?: boolean; email?: string | null; contactpersoon?: string | null } | null;

async function lees(token: string): Promise<OnboardingPubliek | null> {
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  return (data as OnboardingPubliek | null) ?? null;
}

const afzenderVan = (o: OnboardingPubliek) => ({ naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || ONBOARDING_EMAIL, telefoon: o.afzender_telefoon });

/**
 * Na opslaan of afvinken: een seintje aan de afzender (de eerste keer en als
 * alles af is), en sinds 0038 ook aan de klant zelf: "ontvangen" met een
 * kopie als pdf (niet het werknemersbestand: daar staan BSN's in), en
 * "jullie deel is klaar" met wat React2u nu doet.
 */
async function seintje(token: string, uitkomst: Uitkomst, document?: string) {
  if (!uitkomst?.ok || !(uitkomst.eerste || uitkomst.afgerond)) return;
  const o = await lees(token);
  if (!o) return;
  const basis = { nummer: o.nummer, bedrijf: o.bedrijf, adminLink: onboardingAdminUrl(o.id) };
  const doc = document && isDocument(document) ? documentInfo(document) : null;
  if (o.afzender_email) {
    const to = o.afzender_email;
    if (uitkomst.afgerond) await notifyOnboarding({ ...basis, to, soort: "afgerond" });
    else if (uitkomst.eerste && doc) await notifyOnboarding({ ...basis, to, soort: "ingevuld", document: doc.titel.toLowerCase() });
  }
  if (!uitkomst.email) return;
  const { contact } = await offerteHuisstijl();
  const klant = { to: uitkomst.email, aanhef: uitkomst.contactpersoon?.split(" ")[0] ?? null, bedrijf: o.bedrijf, nummer: o.nummer, link: onboardingUrl(token), afzender: afzenderVan(o), contact };
  if (uitkomst.eerste && doc) {
    const antwoord = o.antwoorden?.[doc.sleutel];
    const aantal = doc.sleutel === "werknemers" ? ((antwoord?.data as { rijen?: unknown[] } | undefined)?.rijen?.length ?? 0) : 0;
    // De kopie: de ingevulde pdf, behalve voor het werknemersbestand (BSN's horen niet in een mail).
    const bijlage = doc.sleutel !== "werknemers" && antwoord
      ? await onboardingPdf({ document: doc.sleutel, bedrijf: o.bedrijf, nummer: o.nummer, contact, antwoord }).then((b) => ({ filename: `${doc.titel} ${o.bedrijf}.pdf`, content: b })).catch((e) => { console.error("[onboarding] kopie-pdf mislukt:", e); return null; })
      : null;
    await sendOnboardingKlant({
      ...klant, soort: "ontvangen", bijlage,
      document: doc.sleutel === "werknemers" ? `het werknemersbestand (${aantal} ${aantal === 1 ? "medewerker" : "medewerkers"})` : doc.titel.toLowerCase(),
      moment: antwoord ? momentLang(antwoord.at) : undefined, door: antwoord?.door ?? null,
    });
  }
  if (uitkomst.afgerond) {
    await sendOnboardingKlant({ ...klant, soort: "klaar", taken: takenVoor(o).map((t) => ({ kop: t.klantKop, tekst: t.klant })) });
  }
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

/* ---------- 0038: een stap doorsturen ---------- */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Een stap doorsturen naar een collega van de klant: de database legt het vast, Next mailt de link naar die stap. */
export async function stuurStapDoor(token: string, stap: string, invoer: { naam: string; email: string; van: string; bericht?: string }): Promise<OnboardingState> {
  if (!TOKEN.test(token)) return fout("onbekend");
  if (!isDocument(stap)) return fout("document");
  const naam = String(invoer?.naam || "").trim().slice(0, 120);
  const email = String(invoer?.email || "").trim().toLowerCase().slice(0, 254);
  const van = String(invoer?.van || "").trim().slice(0, 120);
  const bericht = String(invoer?.bericht || "").trim().slice(0, 2000) || null;
  if (naam.length < 2) return { ok: false, fout: "Vul de naam van je collega in." };
  if (!EMAIL.test(email)) return { ok: false, fout: "Dit e-mailadres klopt niet." };
  if (van.length < 2) return { ok: false, fout: "Vul je eigen naam in, zodat je collega weet van wie het komt." };
  if (!(await withinLimit("onboarding-doorsturen", { limit: 20, windowSeconds: 60 * 60 }))) return fout("limiet");

  const { data, error } = await supabasePublic().rpc("onboarding_doorsturen", { p_token: token, p_stap: stap, p_naam: naam, p_email: email, p_van: van });
  const uitkomst = data as { ok: boolean; fout?: string; bedrijf?: string } | null;
  if (error || !uitkomst) {
    console.error("[onboarding] doorsturen mislukt:", error?.message);
    return fout("storing");
  }
  if (!uitkomst.ok) return uitkomst.fout === "limiet" ? { ok: false, fout: "Vandaag zijn er al veel stappen doorgestuurd. Probeer het morgen nog eens." } : fout(uitkomst.fout);

  const [o, { contact }] = await Promise.all([lees(token), offerteHuisstijl()]);
  if (!o) return fout("onbekend");
  const d = documentInfo(stap);
  const verzonden = await sendOnboardingDoorgestuurd({
    to: email, naam, van, bedrijf: o.bedrijf, stap: d.titel, actie: o.invullen.includes(stap) && d.invullen ? d.invullen : d.lezen,
    link: `${onboardingUrl(token)}/${stap}`, bericht, afzender: afzenderVan(o), contact,
  });
  return verzonden.ok ? { ok: true } : { ok: false, fout: "De mail kon niet worden verstuurd. Kopieer de link van deze pagina en stuur hem zelf." };
}
