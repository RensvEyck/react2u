"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { controleerEvaluatie, EVALUATIE_EMAIL, type Evaluatie, type EvaluatieStatus } from "@/lib/evaluatie";
import { evaluatieUrl, sendEvaluatie } from "@/lib/mail";
import { datumLang } from "@/lib/offertes";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { VersturenState } from "./offerteActions";

/*
 * De klantevaluatie in het beheer (migratie 0043): aanmaken, versturen of
 * herinneren, intrekken, heropenen, een nieuwe link en een notitie. Alles
 * achter het salesrecht (`bellijst`), net als de onboarding. Wat de klant
 * doet (bekijken, invullen) schrijft alleen de database.
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type EvaluatieFormState = { fout?: string } | null;

const BASIS = "/admin/documenten/evaluaties";
const tekst = (fd: FormData, naam: string, max = 200) => String(fd.get(naam) ?? "").trim().slice(0, max) || null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function foutUit(error: { code?: string; message?: string } | null): string {
  if (!error) return "Opslaan mislukt.";
  if (error.code === "PGRST205" || error.code === "42P01") return "Klantevaluaties staan nog niet aan: migratie 0043 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres).";
  return "Opslaan mislukt.";
}

async function log(sb: Sb, id: string, soort: string, door: string, details?: Record<string, unknown>) {
  await sb.from("evaluatie_gebeurtenissen").insert({ evaluatie_id: id, soort, door, details: details ?? null });
}

function ververs(id?: string) {
  revalidatePath("/admin/documenten");
  revalidatePath(BASIS);
  if (id) revalidatePath(`${BASIS}/${id}`);
}

async function laad(sb: Sb, id: string): Promise<Evaluatie | null> {
  const { data } = await sb.from("evaluaties").select("*").eq("id", id).maybeSingle();
  return (data as Evaluatie | null) ?? null;
}

/** Nieuwe evaluatie of wijzigen: de klant, het bezoek, het persoonlijke woord en de afzender. */
export async function saveEvaluatie(_prev: EvaluatieFormState, fd: FormData): Promise<EvaluatieFormState> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const id = String(fd.get("id") || "");
  const datum = tekst(fd, "bezoek_datum", 10);
  const rij = {
    bedrijf: tekst(fd, "bedrijf") || "",
    contactpersoon: tekst(fd, "contactpersoon"),
    email: tekst(fd, "email", 254)?.toLowerCase() ?? null,
    telefoon: tekst(fd, "telefoon", 40),
    bericht: tekst(fd, "bericht", 5000),
    bezoek_datum: datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : null,
    bezoek_tijd: tekst(fd, "bezoek_tijd", 40),
    afzender_naam: tekst(fd, "afzender_naam"),
    afzender_functie: tekst(fd, "afzender_functie"),
    afzender_email: tekst(fd, "afzender_email", 254)?.toLowerCase() ?? EVALUATIE_EMAIL,
    afzender_telefoon: tekst(fd, "afzender_telefoon", 40),
  };
  if (!rij.bedrijf) return { fout: "Vul de naam van het bedrijf in." };
  if (datum && !rij.bezoek_datum) return { fout: "De datum van het bezoek klopt niet." };
  if (rij.email && !EMAIL.test(rij.email)) return { fout: "Het e-mailadres van de klant klopt niet." };
  if (rij.afzender_email && !EMAIL.test(rij.afzender_email)) return { fout: "Het e-mailadres van de afzender klopt niet." };

  if (id) {
    const oud = await laad(sb, id);
    if (!oud) return { fout: "Deze evaluatie bestaat niet meer." };
    const { error } = await sb.from("evaluaties").update(rij).eq("id", id);
    if (error) return { fout: foutUit(error) };
    if (oud.status !== "concept") await log(sb, id, "gewijzigd", admin.email);
    ververs(id);
    redirect(`${BASIS}/${id}?opgeslagen=evaluatie`);
  }

  const { data, error } = await sb.from("evaluaties").insert({ ...rij, created_by: user.id }).select("id").single();
  if (error || !data) return { fout: foutUit(error) };
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email);
  ververs();
  redirect(`${BASIS}/${nieuw}?opgeslagen=evaluatie-nieuw`);
}

/** Mailen naar de klant (of een herinnering). Eerst de mail, dan de status. */
export async function verstuurEvaluatie(id: string, _prev: VersturenState, fd: FormData): Promise<VersturenState> {
  const { sb, admin } = await requirePerm("bellijst");
  const e = await laad(sb, id);
  if (!e) return { fout: "Deze evaluatie bestaat niet meer." };
  if (e.status === "ingetrokken") return { fout: "Deze evaluatie is ingetrokken. Heropen hem eerst." };
  const aan = String(fd.get("aan") || "").trim().toLowerCase();
  if (!EMAIL.test(aan)) return { fout: "Vul een geldig e-mailadres in." };
  const fouten = controleerEvaluatie({ ...e, email: aan });
  if (fouten.length) return { fout: fouten[0] };

  const herinnering = e.status !== "concept";
  const { contact } = await offerteHuisstijl();
  const res = await sendEvaluatie({
    to: aan,
    aanhef: tekst(fd, "aanhef", 120) ?? e.contactpersoon?.split(" ")[0] ?? null,
    bedrijf: e.bedrijf,
    nummer: e.nummer,
    link: evaluatieUrl(e.token),
    bericht: tekst(fd, "bericht", 5000),
    afzender: { naam: e.afzender_naam, functie: e.afzender_functie, email: e.afzender_email || EVALUATIE_EMAIL, telefoon: e.afzender_telefoon },
    herinnering,
    bezoek: e.bezoek_datum ? datumLang(e.bezoek_datum) : null,
    contact,
  });
  if (!res.ok) {
    return {
      fout:
        res.reden === "uit"
          ? "Mailen staat uit (Resend is niet ingesteld). Kopieer de link en stuur hem zelf."
          : `De mail is niet verstuurd${res.melding ? `: ${res.melding}` : ""}. Kopieer de link en stuur hem zelf, of probeer het opnieuw.`,
    };
  }
  const { error } = await sb
    .from("evaluaties")
    .update({ status: e.status === "concept" ? "verstuurd" : e.status, verstuurd_at: e.verstuurd_at ?? new Date().toISOString(), email: e.email ?? aan })
    .eq("id", id);
  if (error) return { fout: foutUit(error) };
  await log(sb, id, herinnering ? "herinnering" : "verstuurd", admin.email, { aan });
  ververs(id);
  return { ok: true };
}

/** De link zelf gestuurd: de evaluatie gaat open zonder mail van het systeem. */
export async function markeerEvaluatieVerstuurd(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const e = await laad(sb, id);
  if (!e || e.status !== "concept") redirect(`${BASIS}/${id}`);
  if (controleerEvaluatie(e).length) redirect(`${BASIS}/${id}?fout=evaluatie-onvolledig`);
  const { error } = await sb.from("evaluaties").update({ status: "verstuurd", verstuurd_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`${BASIS}/${id}?fout=opslaan`);
  await log(sb, id, "verstuurd", admin.email, { handmatig: true });
  ververs(id);
  redirect(`${BASIS}/${id}?opgeslagen=evaluatie-open`);
}

export async function trekEvaluatieIn(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("evaluaties").update({ status: "ingetrokken" }).eq("id", id).in("status", ["concept", "verstuurd", "ingevuld"]);
  if (error) redirect(`${BASIS}/${id}?fout=opslaan`);
  await log(sb, id, "ingetrokken", admin.email);
  ververs(id);
  redirect(`${BASIS}/${id}?opgeslagen=evaluatie-ingetrokken`);
}

export async function heropenEvaluatie(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const e = await laad(sb, id);
  if (!e || e.status !== "ingetrokken") redirect(`${BASIS}/${id}`);
  const status: EvaluatieStatus = e.ingevuld_at ? "ingevuld" : e.verstuurd_at ? "verstuurd" : "concept";
  const { error } = await sb.from("evaluaties").update({ status }).eq("id", id);
  if (error) redirect(`${BASIS}/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`${BASIS}/${id}?opgeslagen=evaluatie-heropend`);
}

export async function verwijderEvaluatie(id: string) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("evaluaties").delete().eq("id", id);
  if (error) redirect(`${BASIS}/${id}?fout=opslaan`);
  ververs();
  redirect(`${BASIS}?opgeslagen=definitief-weg`);
}

export async function nieuweEvaluatieLink(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("evaluaties").update({ token: randomBytes(32).toString("hex") }).eq("id", id);
  if (error) redirect(`${BASIS}/${id}?fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { link: "vernieuwd" });
  ververs(id);
  redirect(`${BASIS}/${id}?opgeslagen=evaluatie-link`);
}

export async function saveEvaluatieNotitie(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("evaluaties").update({ notitie: tekst(fd, "notitie", 5000) }).eq("id", id);
  ververs(id);
  redirect(`${BASIS}/${id}?opgeslagen=notitie`);
}
