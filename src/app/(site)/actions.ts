"use server";
import { supabasePublic } from "@/lib/supabase/public";
import { notifyContactMessage, notifyApplication } from "@/lib/mail";

export type FormState = { ok: boolean; error?: string } | null;

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
  const { error } = await sb.from("contact_messages").insert({ name, email, phone, subject, message });
  if (error) return { ok: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  await notifyContactMessage({ name, email, phone, subject, message });
  return { ok: true };
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

  const { error } = await sb.from("applications").insert({
    vacancy_id: vacancyId || null,
    vacancy_title: vacancyTitle || null,
    name, email,
    phone: phone || null,
    motivation: motivation || null,
    cv_path: cvPath,
  });
  if (error) return { ok: false, error: "Er ging iets mis bij het versturen. Probeer het later opnieuw." };
  await notifyApplication({
    name, email,
    phone: phone || null,
    vacancyTitle: vacancyTitle || null,
    motivation: motivation || null,
    hasCv: Boolean(cvPath),
  });
  return { ok: true };
}
