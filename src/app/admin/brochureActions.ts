"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { BROCHURE_EMAIL, controleerBrochure, type Brochure, type BrochureStatus } from "@/lib/brochures";
import { brochureDiensten } from "@/lib/brochureHuisstijl";
import { brochureUrl, sendBrochure } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { VersturenState } from "./offerteActions";

/*
 * Brochures in het beheer (migratie 0030): aanmaken, versturen, intrekken.
 * Alles achter het salesrecht (`bellijst`), net als offertes. Wat de prospect
 * doet (bekijken) schrijft alleen de database zelf (brochure_bekijken).
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type BrochureFormState = { fout?: string } | null;

const tekst = (fd: FormData, naam: string, max = 200) => String(fd.get(naam) ?? "").trim().slice(0, max) || null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function foutUit(error: { code?: string; message?: string } | null): string {
  if (!error) return "Opslaan mislukt.";
  if (error.code === "PGRST205" || error.code === "42P01") return "Brochures staan nog niet aan: migratie 0030 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres).";
  return "Opslaan mislukt.";
}

async function log(sb: Sb, brochureId: string, soort: string, door: string, details?: Record<string, unknown>) {
  await sb.from("brochure_gebeurtenissen").insert({ brochure_id: brochureId, soort, door, details: details ?? null });
}

function ververs(id?: string) {
  revalidatePath("/admin/brochures");
  if (id) revalidatePath(`/admin/brochures/${id}`);
}

async function laad(sb: Sb, id: string): Promise<Brochure | null> {
  const { data } = await sb.from("brochures").select("*").eq("id", id).maybeSingle();
  return (data as Brochure | null) ?? null;
}

/** Nieuwe brochure of wijzigen. Bij een fout komt de melding terug en blijft alles staan; bij succes naar de brochure zelf. */
export async function saveBrochure(_prev: BrochureFormState, fd: FormData): Promise<BrochureFormState> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const id = String(fd.get("id") || "");
  const rij = {
    bedrijf: tekst(fd, "bedrijf") || "",
    contactpersoon: tekst(fd, "contactpersoon"),
    email: tekst(fd, "email", 254)?.toLowerCase() ?? null,
    telefoon: tekst(fd, "telefoon", 40),
    bericht: tekst(fd, "bericht", 5000),
    afzender_naam: tekst(fd, "afzender_naam"),
    afzender_functie: tekst(fd, "afzender_functie"),
    afzender_email: tekst(fd, "afzender_email", 254)?.toLowerCase() ?? BROCHURE_EMAIL,
    afzender_telefoon: tekst(fd, "afzender_telefoon", 40),
  };
  if (!rij.bedrijf) return { fout: "Vul de naam van het bedrijf in." };
  if (rij.email && !EMAIL.test(rij.email)) return { fout: "Het e-mailadres van de prospect klopt niet." };
  if (rij.afzender_email && !EMAIL.test(rij.afzender_email)) return { fout: "Het e-mailadres van de afzender klopt niet." };

  if (id) {
    const oud = await laad(sb, id);
    if (!oud) return { fout: "Deze brochure bestaat niet meer." };
    const { error } = await sb.from("brochures").update(rij).eq("id", id);
    if (error) return { fout: foutUit(error) };
    if (oud.status !== "concept") await log(sb, id, "gewijzigd", admin.email);
    ververs(id);
    redirect(`/admin/brochures/${id}?opgeslagen=brochure`);
  }

  const { data, error } = await sb.from("brochures").insert({ ...rij, created_by: user.id }).select("id").single();
  if (error || !data) return { fout: foutUit(error) };
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email);
  ververs();
  redirect(`/admin/brochures/${nieuw}?opgeslagen=brochure-nieuw`);
}

/**
 * De brochure mailen naar de prospect (of een herinnering). Eerst versturen,
 * dan de status: lukt de mail niet, dan blijft de brochure zoals hij was en
 * zegt de melding waarom.
 */
export async function verstuurBrochure(id: string, _prev: VersturenState, fd: FormData): Promise<VersturenState> {
  const { sb, admin } = await requirePerm("bellijst");
  const b = await laad(sb, id);
  if (!b) return { fout: "Deze brochure bestaat niet meer." };
  if (b.status === "ingetrokken") return { fout: "Deze brochure is ingetrokken. Heropen hem eerst." };
  const aan = String(fd.get("aan") || "").trim().toLowerCase();
  if (!EMAIL.test(aan)) return { fout: "Vul een geldig e-mailadres in." };
  const fouten = controleerBrochure({ ...b, email: aan });
  if (fouten.length) return { fout: fouten[0] };

  const herinnering = b.status === "verstuurd";
  const [{ contact }, diensten] = await Promise.all([offerteHuisstijl(), brochureDiensten()]);
  const res = await sendBrochure({
    to: aan,
    aanhef: tekst(fd, "aanhef", 120) ?? b.contactpersoon?.split(" ")[0] ?? null,
    bedrijf: b.bedrijf,
    nummer: b.nummer,
    link: brochureUrl(b.token),
    bericht: tekst(fd, "bericht", 5000),
    afzender: { naam: b.afzender_naam, functie: b.afzender_functie, email: b.afzender_email || BROCHURE_EMAIL, telefoon: b.afzender_telefoon },
    herinnering,
    diensten: diensten.map((d) => ({ naam: d.naam, kleur: d.kleur, tekst: d.omschrijving, dienst: d.dienst })),
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
    .from("brochures")
    .update({ status: "verstuurd", verstuurd_at: b.verstuurd_at ?? new Date().toISOString(), email: b.email ?? aan })
    .eq("id", id);
  if (error) return { fout: foutUit(error) };
  await log(sb, id, herinnering ? "herinnering" : "verstuurd", admin.email, { aan });
  ververs(id);
  return { ok: true };
}

/** De link zelf gestuurd (WhatsApp, eigen mail): de brochure gaat open zonder dat het systeem mailt. */
export async function markeerBrochureVerstuurd(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const b = await laad(sb, id);
  if (!b || b.status !== "concept") redirect(`/admin/brochures/${id}`);
  if (controleerBrochure(b).length) redirect(`/admin/brochures/${id}?fout=brochure-onvolledig`);
  const { error } = await sb.from("brochures").update({ status: "verstuurd", verstuurd_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/brochures/${id}?fout=opslaan`);
  await log(sb, id, "verstuurd", admin.email, { handmatig: true });
  ververs(id);
  redirect(`/admin/brochures/${id}?opgeslagen=brochure-open`);
}

/** Intrekken: de link toont daarna alleen nog dat de brochure niet meer beschikbaar is, met de contactgegevens. */
export async function trekBrochureIn(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("brochures").update({ status: "ingetrokken" }).eq("id", id).in("status", ["concept", "verstuurd"]);
  if (error) redirect(`/admin/brochures/${id}?fout=opslaan`);
  await log(sb, id, "ingetrokken", admin.email);
  ververs(id);
  redirect(`/admin/brochures/${id}?opgeslagen=brochure-ingetrokken`);
}

/** Na een intrekking weer openzetten. */
export async function heropenBrochure(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const b = await laad(sb, id);
  if (!b || b.status !== "ingetrokken") redirect(`/admin/brochures/${id}`);
  const status: BrochureStatus = b.verstuurd_at ? "verstuurd" : "concept";
  const { error } = await sb.from("brochures").update({ status }).eq("id", id);
  if (error) redirect(`/admin/brochures/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`/admin/brochures/${id}?opgeslagen=brochure-heropend`);
}

export async function verwijderBrochure(id: string) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("brochures").delete().eq("id", id);
  if (error) redirect(`/admin/brochures/${id}?fout=opslaan`);
  ververs();
  redirect("/admin/brochures?opgeslagen=definitief-weg");
}

/** Een nieuwe link, als de oude bij de verkeerde terecht is gekomen. De oude werkt meteen niet meer. */
export async function nieuweBrochureLink(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("brochures").update({ token: randomBytes(32).toString("hex") }).eq("id", id);
  if (error) redirect(`/admin/brochures/${id}?fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { link: "vernieuwd" });
  ververs(id);
  redirect(`/admin/brochures/${id}?opgeslagen=brochure-link`);
}

/** De interne notitie; de prospect ziet hem nooit. */
export async function saveBrochureNotitie(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("brochures").update({ notitie: tekst(fd, "notitie", 5000) }).eq("id", id);
  ververs(id);
  redirect(`/admin/brochures/${id}?opgeslagen=notitie`);
}
