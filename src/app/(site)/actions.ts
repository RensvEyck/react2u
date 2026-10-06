"use server";
import { supabasePublic } from "@/lib/supabase/public";
import { notifyContactMessage, notifyApplication, notifyOfferte } from "@/lib/mail";
import { isTaal, type Taal } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";

export type FormState = { ok: boolean; error?: string } | null;

/**
 * De formulieren van de Nederlandse en de Engelse site posten naar dezelfde
 * acties en sturen een veld `taal` mee. Foutmeldingen komen uit het woordenboek
 * van die taal, en de inzending onthoudt de taal (kolom `lang`), zodat het
 * Postvak IN laat zien dat iemand Engels verwacht.
 */
function taalUit(formData: FormData): Taal {
  const t = formData.get("taal");
  return isTaal(t) ? t : "nl";
}

type Rij = Record<string, unknown>;

/**
 * Insert mét `lang`, en zonder als die kolom er nog niet is (migratie 0015 niet
 * gedraaid: Postgres 42703 of de schema-cache van PostgREST, PGRST204). Een
 * formulier mag nooit stuk zijn omdat één kolom ontbreekt.
 */
async function insertMetTaal(tabel: "contact_messages" | "applications", rij: Rij, taal: Taal) {
  const sb = supabasePublic();
  const { error } = await sb.from(tabel).insert({ ...rij, lang: taal });
  if (!error) return null;
  if (error.code === "42703" || error.code === "PGRST204") {
    const { error: zonder } = await sb.from(tabel).insert(rij);
    return zonder;
  }
  return error;
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !email || !phone || !message) return { ok: false, error: fout.contactVerplicht };

  const error = await insertMetTaal("contact_messages", { name, email, phone, subject, message }, taal);
  if (error) return { ok: false, error: fout.algemeen };
  await notifyContactMessage({ name, email, phone, subject, message, taal });
  return { ok: true };
}

const MAX_CV_BYTES = 8 * 1024 * 1024;
const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const vacancyId = String(formData.get("vacancy_id") || "");
  const vacancyTitle = String(formData.get("vacancy_title") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const motivation = String(formData.get("motivation") || "").trim();
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !email) return { ok: false, error: fout.sollicitatieVerplicht };

  const sb = supabasePublic();
  let cvPath: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) return { ok: false, error: fout.cvTeGroot };
    if (!CV_TYPES.includes(cv.type)) return { ok: false, error: fout.cvType };
    const ext = cv.name.split(".").pop() || "pdf";
    cvPath = `${crypto.randomUUID()}/${cv.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `cv.${ext}`}`;
    const { error: upErr } = await sb.storage.from("cvs").upload(cvPath, cv, { contentType: cv.type });
    if (upErr) return { ok: false, error: fout.cvUpload };
  }

  const error = await insertMetTaal("applications", {
    vacancy_id: vacancyId || null,
    vacancy_title: vacancyTitle || null,
    name, email,
    phone: phone || null,
    motivation: motivation || null,
    cv_path: cvPath,
  }, taal);
  if (error) return { ok: false, error: fout.sollicitatieAlgemeen };
  await notifyApplication({
    name, email,
    phone: phone || null,
    vacancyTitle: vacancyTitle || null,
    motivation: motivation || null,
    hasCv: Boolean(cvPath),
    taal,
  });
  return { ok: true };
}

const PAKKETTEN = ["Casemanagement Compleet", "Verrichtingenbasis", "Maatwerk"];

/**
 * Offerteaanvraag vanaf de tarievenpagina. Komt als bericht in het Postvak IN
 * (geen eigen tabel: het is een lead zoals een contactbericht) en gaat per mail
 * naar sales.
 */
export async function submitOfferte(_prev: FormState, formData: FormData): Promise<FormState> {
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const extra = String(formData.get("message") || "").trim();
  const employees = Math.round(Number(formData.get("employees")) || 0);
  const gekozen = String(formData.get("pakket") || "").trim();
  const pakket = PAKKETTEN.includes(gekozen) ? gekozen : gekozen.slice(0, 80) || "Onbekend";
  const honeypot = String(formData.get("website") || "");
  if (honeypot) return { ok: true };
  if (!name || !company || !email || !phone || employees < 1) return { ok: false, error: fout.offerteVerplicht };

  // De samenvatting is voor het Postvak IN en blijft Nederlands: dat leest het team.
  const message = [
    `Aansluiting: ${pakket}`,
    `Bedrijf: ${company}`,
    `Aantal medewerkers: ${employees}`,
    extra ? `\n${extra}` : "",
  ].filter(Boolean).join("\n");

  const error = await insertMetTaal("contact_messages", {
    name, email, phone, subject: `Offerteaanvraag: ${pakket}`, message,
  }, taal);
  if (error) return { ok: false, error: fout.algemeen };
  await notifyOfferte({ name, company, email, phone, pakket, employees, message: extra || null, taal });
  return { ok: true };
}
