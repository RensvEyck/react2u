"use server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { notifyContactMessage, notifyApplication, notifyOfferte, notifyTerugbel } from "@/lib/mail";
import { withinLimit, requestIp, LIMIET_MELDING, type Throttle } from "@/lib/rateLimit";
import { verifyTurnstile, TURNSTILE_MELDING } from "@/lib/turnstile";
import { uploadCv, MAX_CV_BYTES, CV_TYPES } from "@/lib/cvs";
import { recordConversion } from "@/lib/conversionsDb";
import { pathFromReferer, type ConversionKind } from "@/lib/conversions";
import { geldigEmail, TERUGBEL_MOMENTEN } from "@/lib/formulier";

export type FormState = { ok: boolean; error?: string } | null;

const veld = (fd: FormData, naam: string) => String(fd.get(naam) || "").trim();

const EMAIL_MELDING = "Controleer je e-mailadres: dat lijkt niet te kloppen.";

/**
 * De poort voor elk formulier, in deze volgorde:
 * 1. honeypot — een bot dat het verborgen veld invult krijgt "gelukt" te zien
 *    en verder niets;
 * 2. limiet per IP en per soort (src/lib/rateLimit.ts);
 * 3. Turnstile, als dat aan staat (src/lib/turnstile.ts).
 * Geeft null terug als de inzending door mag.
 */
async function poort(fd: FormData, kind: ConversionKind, perIp?: Throttle): Promise<FormState> {
  if (String(fd.get("website") || "")) return { ok: true };
  if (!(await withinLimit(kind, perIp))) return { ok: false, error: LIMIET_MELDING };
  if (!(await verifyTurnstile(veld(fd, "cf-turnstile-response") || null, await requestIp()))) {
    return { ok: false, error: TURNSTILE_MELDING };
  }
  return null;
}

/** De pagina waar het formulier stond, voor de conversiemeting. */
async function paginaPad(): Promise<string> {
  return pathFromReferer((await headers()).get("referer"));
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const stop = await poort(formData, "contact");
  if (stop) return stop;
  const name = veld(formData, "name");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const subject = veld(formData, "subject");
  const message = veld(formData, "message");
  if (!name || !email || !phone || !message)
    return { ok: false, error: "Vul naam, e-mailadres, telefoonnummer en bericht in." };
  if (!geldigEmail(email)) return { ok: false, error: EMAIL_MELDING };

  const sb = supabasePublic();
  const { error } = await sb.from("contact_messages").insert({ name, email, phone, subject, message });
  if (error) return { ok: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  await Promise.all([
    recordConversion("contact", await paginaPad()),
    notifyContactMessage({ name, email, phone, subject, message }),
  ]);
  return { ok: true };
}

/** Sollicitaties: strenger, want hier hangt een bestand aan. */
const SOLLICITATIE_LIMIET: Throttle = { limit: 3, windowSeconds: 60 * 60 };

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const stop = await poort(formData, "sollicitatie", SOLLICITATIE_LIMIET);
  if (stop) return stop;
  const vacancyId = veld(formData, "vacancy_id");
  const vacancyTitle = veld(formData, "vacancy_title");
  const name = veld(formData, "name");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const motivation = veld(formData, "motivation");
  // Toestemming om een jaar te bewaren (zie src/lib/retention.ts).
  const retainLonger = formData.get("retain_longer") === "on";
  if (!name || !email) return { ok: false, error: "Vul in ieder geval je naam en e-mailadres in." };
  if (!geldigEmail(email)) return { ok: false, error: EMAIL_MELDING };

  let cvPath: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) return { ok: false, error: "CV is te groot (max 8 MB)." };
    if (!CV_TYPES.includes(cv.type)) return { ok: false, error: "Upload je CV als PDF of Word-bestand." };
    cvPath = await uploadCv(cv);
    if (!cvPath) return { ok: false, error: "CV uploaden is niet gelukt. Probeer het opnieuw." };
  }

  const sb = supabasePublic();
  const rij = {
    vacancy_id: vacancyId || null,
    vacancy_title: vacancyTitle || null,
    name, email,
    phone: phone || null,
    motivation: motivation || null,
    cv_path: cvPath,
  };
  let { error } = await sb.from("applications").insert({ ...rij, retain_longer: retainLonger });
  // Vóór migratie 0013 bestaat de kolom niet. Dan zonder: de toestemming gaat
  // dan verloren, de sollicitatie niet.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await sb.from("applications").insert(rij));
  }
  if (error) return { ok: false, error: "Er ging iets mis bij het versturen. Probeer het later opnieuw." };
  await Promise.all([
    recordConversion("sollicitatie", await paginaPad()),
    notifyApplication({
      name, email,
      phone: phone || null,
      vacancyTitle: vacancyTitle || null,
      motivation: motivation || null,
      hasCv: Boolean(cvPath),
    }),
  ]);
  return { ok: true };
}

const PAKKETTEN = ["Casemanagement Compleet", "Verrichtingenbasis", "Maatwerk"];

/**
 * Offerteaanvraag vanaf de tarievenpagina. Komt als bericht in het Postvak IN
 * (geen eigen tabel: het is een lead zoals een contactbericht) en gaat per mail
 * naar sales.
 */
export async function submitOfferte(_prev: FormState, formData: FormData): Promise<FormState> {
  const stop = await poort(formData, "offerte");
  if (stop) return stop;
  const name = veld(formData, "name");
  const company = veld(formData, "company");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const extra = veld(formData, "message");
  const employees = Math.round(Number(formData.get("employees")) || 0);
  const gekozen = veld(formData, "pakket");
  const pakket = PAKKETTEN.includes(gekozen) ? gekozen : gekozen.slice(0, 80) || "Onbekend";
  if (!name || !company || !email || !phone || employees < 1)
    return { ok: false, error: "Vul naam, bedrijfsnaam, e-mailadres, telefoonnummer en het aantal medewerkers in." };
  if (!geldigEmail(email)) return { ok: false, error: EMAIL_MELDING };

  const message = [
    `Aansluiting: ${pakket}`,
    `Bedrijf: ${company}`,
    `Aantal medewerkers: ${employees}`,
    extra ? `\n${extra}` : "",
  ].filter(Boolean).join("\n");

  const sb = supabasePublic();
  const { error } = await sb.from("contact_messages").insert({
    name, email, phone, subject: `Offerteaanvraag: ${pakket}`, message,
  });
  if (error) return { ok: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  await Promise.all([
    recordConversion("offerte", await paginaPad()),
    notifyOfferte({ name, company, email, phone, pakket, employees, message: extra || null }),
  ]);
  return { ok: true };
}

/**
 * Terugbelverzoek vanuit de belbalk op de werkgeverspagina's (mobiel). Alleen
 * naam en nummer zijn nodig: hoe minder velden, hoe meer mensen hem invullen.
 * Komt als bericht in het Postvak IN, zodat hij met één klik op de bellijst
 * kan, en gaat per mail naar sales.
 */
export async function submitTerugbel(_prev: FormState, formData: FormData): Promise<FormState> {
  const stop = await poort(formData, "terugbel");
  if (stop) return stop;
  const name = veld(formData, "name");
  const phone = veld(formData, "phone");
  const company = veld(formData, "company");
  const email = veld(formData, "email");
  const gekozen = veld(formData, "moment");
  const moment = (TERUGBEL_MOMENTEN as readonly string[]).includes(gekozen) ? gekozen : TERUGBEL_MOMENTEN[0];
  if (!name || !phone) return { ok: false, error: "Vul je naam en telefoonnummer in." };
  if (phone.replace(/\D/g, "").length < 8) return { ok: false, error: "Controleer je telefoonnummer." };
  if (email && !geldigEmail(email)) return { ok: false, error: EMAIL_MELDING };

  const path = await paginaPad();
  const message = [
    `Wanneer: ${moment}`,
    company ? `Bedrijf: ${company}` : "",
    `Pagina: ${path}`,
  ].filter(Boolean).join("\n");

  const sb = supabasePublic();
  const { error } = await sb.from("contact_messages").insert({
    name, email, phone, subject: "Terugbelverzoek", message,
  });
  if (error) return { ok: false, error: "Er ging iets mis. Bel ons gerust direct." };
  await Promise.all([
    recordConversion("terugbel", path),
    notifyTerugbel({ name, phone, company: company || null, moment, path }),
  ]);
  return { ok: true };
}
