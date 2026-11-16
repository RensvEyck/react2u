"use server";
import { after } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { withinLimit } from "@/lib/rateLimit";
import {
  controleerVelden, controleerWerknemers, documentInfo, INRICHTING, isDocument, MACHTIGING, MACHTIGING_FOUT, ONBOARDING_EMAIL, ONBOARDING_FOUT, OVERDRACHT_BRIEF,
  schoneWerknemers, schoonVelden, takenVoor, type MachtigingenGetekend, type OnboardingPubliek,
} from "@/lib/onboarding";
import { datumNl } from "@/lib/onboarding";
import { momentLang } from "@/lib/offertes";
import {
  machtigingUrl, notifyOnboarding, onboardingAdminUrl, onboardingUrl, sendMachtiging, sendOnboardingDoorgestuurd, sendOnboardingKlant, sendOverdracht,
} from "@/lib/mail";
import { onboardingPdf, overdrachtPdf } from "@/lib/onboardingPdf";
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

/* ---------- 0038: de machtiging online tekenen, de opdracht tot overdracht, een stap doorsturen ---------- */

const mfout = (code: string | undefined): OnboardingState => ({ ok: false, fout: MACHTIGING_FOUT[code || ""] || MACHTIGING_FOUT.storing });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * De werkgever nodigt een medewerker met een lopend dossier uit om de
 * machtiging online te tekenen: de database maakt de persoonlijke link, Next
 * mailt hem. Lukt de mail niet bij een nieuwe uitnodiging, dan gaat de
 * uitnodiging weer weg; de werkgever ziet dan één melding, geen spookrij.
 */
export async function nodigMachtigingUit(token: string, invoer: { naam: string; email: string }): Promise<OnboardingState> {
  if (!TOKEN.test(token)) return mfout("onbekend");
  const naam = String(invoer?.naam || "").trim().slice(0, 120);
  const email = String(invoer?.email || "").trim().toLowerCase().slice(0, 254);
  if (naam.length < 2) return mfout("naam");
  if (!EMAIL.test(email)) return mfout("email");
  if (!(await withinLimit("machtiging-uitnodigen", { limit: 40, windowSeconds: 60 * 60 }))) return mfout("limiet");

  const sb = supabasePublic();
  const { data, error } = await sb.rpc("onboarding_machtiging_uitnodigen", { p_token: token, p_naam: naam, p_email: email });
  const uitkomst = data as { ok: boolean; fout?: string; id?: string; mtoken?: string; opnieuw?: boolean } | null;
  if (error || !uitkomst) {
    console.error("[onboarding] machtiging uitnodigen mislukt:", error?.message);
    return mfout("storing");
  }
  if (!uitkomst.ok) return mfout(uitkomst.fout);

  const [o, { contact }] = await Promise.all([lees(token), offerteHuisstijl()]);
  if (!o) return mfout("onbekend");
  const verzonden = await sendMachtiging({
    to: email, naam, bedrijf: o.bedrijf, arbodienst: (o.antwoorden?.machtiging?.data as Record<string, string> | undefined)?.arbodienst || null,
    link: machtigingUrl(uitkomst.mtoken!), afzender: afzenderVan(o), opnieuw: Boolean(uitkomst.opnieuw), contact,
  });
  if (!verzonden.ok) {
    if (!uitkomst.opnieuw && uitkomst.id) await sb.rpc("onboarding_machtiging_verwijderen", { p_token: token, p_id: uitkomst.id });
    return mfout("mail");
  }
  return { ok: true };
}

/** Een uitnodiging weghalen, zolang er niet getekend is. */
export async function verwijderMachtiging(token: string, id: string): Promise<OnboardingState> {
  if (!TOKEN.test(token) || !/^[0-9a-f-]{36}$/.test(id)) return mfout("onbekend");
  if (!(await withinLimit("machtiging-verwijderen", { limit: 60, windowSeconds: 60 * 60 }))) return mfout("limiet");
  const { data, error } = await supabasePublic().rpc("onboarding_machtiging_verwijderen", { p_token: token, p_id: id });
  const uitkomst = data as { ok: boolean; fout?: string } | null;
  if (error || !uitkomst) return mfout("storing");
  return uitkomst.ok ? { ok: true } : mfout(uitkomst.fout);
}

/**
 * De opdracht tot overdracht naar de vorige arbodienst (Rens, 16 nov 2026: de
 * werkgever stuurt de getekende machtigingen zelf, met de opdracht; de
 * arbodienst stuurt React2u daarna de lijst). Eén knop: de brief en alle
 * getekende machtigingen als één pdf, naar het mailadres van de arbodienst,
 * met de werkgever en medisch@react2u.nl erbij.
 */
export async function verstuurOverdracht(token: string, aan?: string): Promise<OnboardingState> {
  if (!TOKEN.test(token)) return mfout("onbekend");
  if (!(await withinLimit("machtiging-overdracht", { limit: 10, windowSeconds: 60 * 60 }))) return mfout("limiet");
  const sb = supabasePublic();
  const o = await lees(token);
  if (!o) return mfout("onbekend");
  const arbodienst = (o.antwoorden?.machtiging?.data as Record<string, string> | undefined) || {};
  const email = String(aan || arbodienst.email || "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(email)) return { ok: false, fout: "Vul het e-mailadres van je vorige arbodienst in; daar gaat de opdracht heen." };

  const { data: g } = await sb.rpc("onboarding_machtigingen_getekend", { p_token: token });
  const getekend = g as MachtigingenGetekend | null;
  if (!getekend?.machtigingen.length) return mfout("geen-getekend");

  const { data, error } = await sb.rpc("onboarding_overdracht_versturen", { p_token: token, p_aan: email });
  const uitkomst = data as { ok: boolean; fout?: string; aantal?: number } | null;
  if (error || !uitkomst) {
    console.error("[onboarding] overdracht vastleggen mislukt:", error?.message);
    return mfout("storing");
  }
  if (!uitkomst.ok) return mfout(uitkomst.fout);

  const { contact } = await offerteHuisstijl();
  const pdf = await overdrachtPdf(getekend, contact).catch((e) => { console.error("[onboarding] opdracht-pdf mislukt:", e); return null; });
  if (!pdf) return mfout("storing");
  const verzonden = await sendOverdracht({
    to: email, werkgeverEmail: getekend.email ?? null, bedrijf: o.bedrijf, contactpersoon: getekend.contactpersoon ?? o.contactpersoon ?? null,
    aantal: getekend.machtigingen.length, namen: getekend.machtigingen.map((m) => ({ naam: m.gegevens.naam, geboortedatum: datumNl(m.gegevens.geboortedatum) })),
    arbodienst: arbodienst.arbodienst || null, alineas: OVERDRACHT_BRIEF.alineas(o.bedrijf, getekend.machtigingen.length),
    pdf: { filename: `${OVERDRACHT_BRIEF.onderwerp(o.bedrijf)}.pdf`, content: pdf }, contact,
  });
  if (!verzonden.ok) return { ok: false, fout: "De mail aan je arbodienst kon niet worden verstuurd. Download de opdracht hieronder en stuur hem zelf." };
  if (o.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = o;
    after(() => notifyOnboarding({ to: afzender_email, nummer, bedrijf, adminLink: onboardingAdminUrl(id), soort: "overdracht", aantal: getekend.machtigingen.length }));
  }
  return { ok: true };
}

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
