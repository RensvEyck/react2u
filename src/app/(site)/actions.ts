"use server";
import { headers } from "next/headers";
import { supabasePublic } from "@/lib/supabase/public";
import { notifyContactMessage, notifyApplication, notifyOfferte, notifyTerugbel } from "@/lib/mail";
import { withinLimit, requestIp, type Throttle } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { uploadCv, MAX_CV_BYTES, CV_TYPES } from "@/lib/cvs";
import { recordConversion } from "@/lib/conversionsDb";
import { pathFromReferer, type ConversionKind } from "@/lib/conversions";
import { geldigEmail, TERUGBEL_MOMENTEN } from "@/lib/formulier";
import { isTaal, type Taal } from "@/lib/taal";
import { woordenboek, type Woordenboek } from "@/lib/woordenboek";

export type FormState = { ok: boolean; error?: string } | null;

const veld = (fd: FormData, naam: string) => String(fd.get(naam) || "").trim();

/**
 * De formulieren van de Nederlandse en de Engelse site posten naar dezelfde
 * acties en sturen een veld `taal` mee. Foutmeldingen komen uit het woordenboek
 * van die taal, en de inzending onthoudt de taal (kolom `lang`, migratie 0015),
 * zodat het Postvak IN laat zien dat iemand Engels verwacht.
 */
function taalUit(fd: FormData): Taal {
  const t = fd.get("taal");
  return isTaal(t) ? t : "nl";
}

type Fouten = Woordenboek["formulier"]["fouten"];

/**
 * De poort voor elk formulier, in deze volgorde:
 * 1. honeypot — een bot dat het verborgen veld invult krijgt "gelukt" te zien
 *    en verder niets;
 * 2. limiet per IP en per soort (src/lib/rateLimit.ts);
 * 3. Turnstile, als dat aan staat (src/lib/turnstile.ts).
 * Geeft null terug als de inzending door mag.
 */
async function poort(fd: FormData, kind: ConversionKind, fout: Fouten, perIp?: Throttle): Promise<FormState> {
  if (String(fd.get("website") || "")) return { ok: true };
  if (!(await withinLimit(kind, perIp))) return { ok: false, error: fout.limiet };
  if (!(await verifyTurnstile(veld(fd, "cf-turnstile-response") || null, await requestIp()))) {
    return { ok: false, error: fout.spamcontrole };
  }
  return null;
}

/** De pagina waar het formulier stond, voor de conversiemeting. */
async function paginaPad(): Promise<string> {
  return pathFromReferer((await headers()).get("referer"));
}

type Rij = Record<string, unknown>;

/**
 * Insert met de optionele kolommen uit latere migraties (`lang` uit 0015,
 * `retain_longer` uit 0013), en zonder als een van die kolommen er nog niet is
 * (Postgres 42703 of de schema-cache van PostgREST, PGRST204). Dan gaat die
 * informatie verloren, de inzending niet: een formulier mag nooit stuk zijn
 * omdat één kolom ontbreekt.
 */
async function insertMetExtra(tabel: "contact_messages" | "applications", rij: Rij, extra: Rij) {
  const sb = supabasePublic();
  const { error } = await sb.from(tabel).insert({ ...rij, ...extra });
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
  const stop = await poort(formData, "contact", fout);
  if (stop) return stop;
  const name = veld(formData, "name");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const subject = veld(formData, "subject");
  const message = veld(formData, "message");
  if (!name || !email || !phone || !message) return { ok: false, error: fout.contactVerplicht };
  if (!geldigEmail(email)) return { ok: false, error: fout.emailOngeldig };

  const error = await insertMetExtra("contact_messages", { name, email, phone, subject, message }, { lang: taal });
  if (error) return { ok: false, error: fout.algemeen };
  await Promise.all([
    recordConversion("contact", await paginaPad()),
    notifyContactMessage({ name, email, phone, subject, message, taal }),
  ]);
  return { ok: true };
}

/** Sollicitaties: strenger, want hier hangt een bestand aan. */
const SOLLICITATIE_LIMIET: Throttle = { limit: 3, windowSeconds: 60 * 60 };

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const stop = await poort(formData, "sollicitatie", fout, SOLLICITATIE_LIMIET);
  if (stop) return stop;
  const vacancyId = veld(formData, "vacancy_id");
  const vacancyTitle = veld(formData, "vacancy_title");
  const name = veld(formData, "name");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const motivation = veld(formData, "motivation");
  // Toestemming om een jaar te bewaren (zie src/lib/retention.ts).
  const retainLonger = formData.get("retain_longer") === "on";
  if (!name || !email) return { ok: false, error: fout.sollicitatieVerplicht };
  if (!geldigEmail(email)) return { ok: false, error: fout.emailOngeldig };

  let cvPath: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) return { ok: false, error: fout.cvTeGroot };
    if (!CV_TYPES.includes(cv.type)) return { ok: false, error: fout.cvType };
    cvPath = await uploadCv(cv);
    if (!cvPath) return { ok: false, error: fout.cvUpload };
  }

  const error = await insertMetExtra("applications", {
    vacancy_id: vacancyId || null,
    vacancy_title: vacancyTitle || null,
    name, email,
    phone: phone || null,
    motivation: motivation || null,
    cv_path: cvPath,
  }, { retain_longer: retainLonger, lang: taal });
  if (error) return { ok: false, error: fout.sollicitatieAlgemeen };
  await Promise.all([
    recordConversion("sollicitatie", await paginaPad()),
    notifyApplication({
      name, email,
      phone: phone || null,
      vacancyTitle: vacancyTitle || null,
      motivation: motivation || null,
      hasCv: Boolean(cvPath),
      taal,
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
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const stop = await poort(formData, "offerte", fout);
  if (stop) return stop;
  const name = veld(formData, "name");
  const company = veld(formData, "company");
  const email = veld(formData, "email");
  const phone = veld(formData, "phone");
  const extra = veld(formData, "message");
  const employees = Math.round(Number(formData.get("employees")) || 0);
  const gekozen = veld(formData, "pakket");
  const pakket = PAKKETTEN.includes(gekozen) ? gekozen : gekozen.slice(0, 80) || "Onbekend";
  if (!name || !company || !email || !phone || employees < 1) return { ok: false, error: fout.offerteVerplicht };
  if (!geldigEmail(email)) return { ok: false, error: fout.emailOngeldig };

  // De samenvatting is voor het Postvak IN en blijft Nederlands: dat leest het team.
  const message = [
    `Aansluiting: ${pakket}`,
    `Bedrijf: ${company}`,
    `Aantal medewerkers: ${employees}`,
    extra ? `\n${extra}` : "",
  ].filter(Boolean).join("\n");

  const error = await insertMetExtra("contact_messages", {
    name, email, phone, subject: `Offerteaanvraag: ${pakket}`, message,
  }, { lang: taal });
  if (error) return { ok: false, error: fout.algemeen };
  await Promise.all([
    recordConversion("offerte", await paginaPad()),
    notifyOfferte({ name, company, email, phone, pakket, employees, message: extra || null, taal }),
  ]);
  return { ok: true };
}

/**
 * Terugbelverzoek vanuit de belbalk op de werkgeverspagina's (mobiel). Alleen
 * naam en nummer zijn nodig: hoe minder velden, hoe meer mensen hem invullen.
 * Komt als bericht in het Postvak IN, zodat hij met één klik op de bellijst
 * kan, en gaat per mail naar sales. Het gekozen moment is de Nederlandse waarde
 * uit TERUGBEL_MOMENTEN, ook op de Engelse site: dat leest het team.
 */
export async function submitTerugbel(_prev: FormState, formData: FormData): Promise<FormState> {
  const taal = taalUit(formData);
  const fout = woordenboek(taal).formulier.fouten;
  const stop = await poort(formData, "terugbel", fout);
  if (stop) return stop;
  const name = veld(formData, "name");
  const phone = veld(formData, "phone");
  const company = veld(formData, "company");
  const email = veld(formData, "email");
  const gekozen = veld(formData, "moment");
  const moment = (TERUGBEL_MOMENTEN as readonly string[]).includes(gekozen) ? gekozen : TERUGBEL_MOMENTEN[0];
  if (!name || !phone) return { ok: false, error: fout.terugbelVerplicht };
  if (phone.replace(/\D/g, "").length < 8) return { ok: false, error: fout.telefoonOngeldig };
  if (email && !geldigEmail(email)) return { ok: false, error: fout.emailOngeldig };

  const path = await paginaPad();
  const message = [
    `Wanneer: ${moment}`,
    company ? `Bedrijf: ${company}` : "",
    `Pagina: ${path}`,
  ].filter(Boolean).join("\n");

  const error = await insertMetExtra("contact_messages", {
    name, email, phone, subject: "Terugbelverzoek", message,
  }, { lang: taal });
  if (error) return { ok: false, error: fout.terugbelAlgemeen };
  await Promise.all([
    recordConversion("terugbel", path),
    notifyTerugbel({ name, phone, company: company || null, moment, path }),
  ]);
  return { ok: true };
}
