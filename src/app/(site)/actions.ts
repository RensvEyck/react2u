"use server";
import { supabasePublic } from "@/lib/supabase/public";
import {
  notifyContactMessage, notifyApplication, notifyOfferte,
  bevestigContact, bevestigOfferte, bevestigSollicitatie,
} from "@/lib/mail";
import { CONTACT_FALLBACK, getSettings, type ContactInfo } from "@/lib/content";
import { normalizeKoppelingen, type Koppelingen } from "@/lib/koppelingen";

/**
 * Wat het formulier na het versturen te zien krijgt. Bij `ok`:
 * - `kennismakingUrl`: de agendalink uit de instellingen, voor de knop
 *   "Plan direct een kennismaking" na een offerteaanvraag (leeg = geen knop);
 * - `werkdagen`: binnen hoeveel werkdagen een sollicitant van ons hoort;
 * - `bevestigdNaar`: het adres waar een bevestigingsmail heen is, alleen als
 *   Resend hem aannam — anders belooft de bedankmelding geen mail.
 */
export type FormState =
  | { ok: true; kennismakingUrl?: string; werkdagen?: number; bevestigdNaar?: string }
  | { ok: false; error: string }
  | null;

/** Contactgegevens en koppelingen, voor de bedankmelding en de bevestigingsmail. */
async function siteGegevens(): Promise<{ contact: ContactInfo; koppelingen: Koppelingen }> {
  const s = await getSettings(["contact", "koppelingen"]);
  return {
    contact: { ...CONTACT_FALLBACK, ...((s.contact as Partial<ContactInfo>) || {}) },
    koppelingen: normalizeKoppelingen(s.koppelingen),
  };
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !email || !phone || !message)
    return { ok: false, error: "Vul naam, e-mailadres, telefoonnummer en bericht in." };

  const sb = supabasePublic();
  const [{ error }, { contact }] = await Promise.all([
    sb.from("contact_messages").insert({ name, email, phone, subject, message }),
    siteGegevens(),
  ]);
  if (error) return { ok: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  // De melding aan het team en de bevestiging aan de invuller staan los van
  // elkaar en van de inzending: mislukt er een, dan is het bericht toch binnen.
  const [, bevestigd] = await Promise.all([
    notifyContactMessage({ name, email, phone, subject, message }),
    bevestigContact({ name, email, contact }),
  ]);
  return { ok: true, bevestigdNaar: bevestigd ? email : undefined };
}

const MAX_CV_BYTES = 8 * 1024 * 1024;
const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const vacancyId = String(formData.get("vacancy_id") || "");
  const vacancyTitle = String(formData.get("vacancy_title") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const motivation = String(formData.get("motivation") || "").trim();
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !email) return { ok: false, error: "Vul in ieder geval je naam en e-mailadres in." };

  const sb = supabasePublic();
  let cvPath: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) return { ok: false, error: "CV is te groot (max 8 MB)." };
    if (!CV_TYPES.includes(cv.type)) return { ok: false, error: "Upload je CV als PDF of Word-bestand." };
    const ext = cv.name.split(".").pop() || "pdf";
    cvPath = `${crypto.randomUUID()}/${cv.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `cv.${ext}`}`;
    const { error: upErr } = await sb.storage.from("cvs").upload(cvPath, cv, { contentType: cv.type });
    if (upErr) return { ok: false, error: "CV uploaden is niet gelukt. Probeer het opnieuw." };
  }

  const [{ error }, { contact, koppelingen }] = await Promise.all([
    sb.from("applications").insert({
      vacancy_id: vacancyId || null,
      vacancy_title: vacancyTitle || null,
      name, email,
      phone: phone || null,
      motivation: motivation || null,
      cv_path: cvPath,
    }),
    siteGegevens(),
  ]);
  if (error) return { ok: false, error: "Er ging iets mis bij het versturen. Probeer het later opnieuw." };
  const werkdagen = koppelingen.sollicitatie_werkdagen;
  const [, bevestigd] = await Promise.all([
    notifyApplication({
      name, email,
      phone: phone || null,
      vacancyTitle: vacancyTitle || null,
      motivation: motivation || null,
      hasCv: Boolean(cvPath),
    }),
    bevestigSollicitatie({ name, email, vacancyTitle: vacancyTitle || null, werkdagen, contact }),
  ]);
  return { ok: true, werkdagen, bevestigdNaar: bevestigd ? email : undefined };
}

const PAKKETTEN = ["Casemanagement Compleet", "Verrichtingenbasis", "Maatwerk"];

/**
 * Offerteaanvraag vanaf de tarievenpagina of Kennismaken. Komt als bericht in
 * het Postvak IN (geen eigen tabel: het is een lead zoals een contactbericht),
 * gaat per mail naar sales, en de aanvrager krijgt een bevestiging.
 *
 * `employees` is een getal; Kennismaken stuurt daarnaast `employees_label`
 * mee ("11 tot 50"), zodat de samenvatting zegt wat er gekozen is.
 */
export async function submitOfferte(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const extra = String(formData.get("message") || "").trim();
  const employees = Math.round(Number(formData.get("employees")) || 0);
  const employeesLabel = String(formData.get("employees_label") || "").trim().slice(0, 40) || String(employees);
  const gekozen = String(formData.get("pakket") || "").trim();
  const pakket = PAKKETTEN.includes(gekozen) ? gekozen : gekozen.slice(0, 80) || "Onbekend";
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !company || !email || !phone || employees < 1)
    return { ok: false, error: "Vul naam, bedrijfsnaam, e-mailadres, telefoonnummer en het aantal medewerkers in." };

  const message = [
    `Aansluiting: ${pakket}`,
    `Bedrijf: ${company}`,
    `Aantal medewerkers: ${employeesLabel}`,
    extra ? `\n${extra}` : "",
  ].filter(Boolean).join("\n");

  const sb = supabasePublic();
  const [{ error }, { contact, koppelingen }] = await Promise.all([
    sb.from("contact_messages").insert({
      name, email, phone, subject: `Offerteaanvraag: ${pakket}`, message,
    }),
    siteGegevens(),
  ]);
  if (error) return { ok: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  const kennismakingUrl = koppelingen.kennismaking_url;
  const [, bevestigd] = await Promise.all([
    notifyOfferte({ name, company, email, phone, pakket, employees: employeesLabel, message: extra || null }),
    bevestigOfferte({ name, email, company, pakket, employees: employeesLabel, kennismakingUrl, contact }),
  ]);
  return { ok: true, kennismakingUrl: kennismakingUrl || undefined, bevestigdNaar: bevestigd ? email : undefined };
}
