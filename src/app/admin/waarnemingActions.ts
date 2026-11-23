"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver } from "@/lib/offertes";
import { afwezigeBrief, collegaBij, gedekteKlanten, isUuid, leesWaarneming, naamVan, waarnemerBrief, type Waarneming } from "@/lib/waarneming";
import { haalCollegas, haalKlanten } from "@/lib/waarnemingDb";

/**
 * Waarneming (0057). Je eigen afwezigheid plannen, aanpassen en weghalen:
 * iedereen met het recht waarneming. Voor een ander regelen: het recht omzet.
 * De database controleert hetzelfde (de policies); dit geeft een nette
 * melding en mailt de waarnemer (en de afwezige, als het beheer het regelde).
 */

const lijst = (q = "", anker = "") => `/admin/waarneming${q ? `?${q}` : ""}${anker ? `#${anker}` : ""}`;
const kaart = (id: string, q = "", anker = "") => `/admin/waarneming/${id}${q ? `?${q}` : ""}${anker ? `#${anker}` : ""}`;
const foutSleutel = (error: { code?: string; message: string }) =>
  isMissingTable(error) ? "migratie-0057" : /row-level security|policy/i.test(error.message) ? "waarneming-niet-van-jou" : error.code === "23514" ? "waarneming-datum" : "opslaan";

function ververs(id?: string) {
  revalidatePath("/admin/waarneming", "layout");
  if (id) revalidatePath(`/admin/waarneming/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/klanten", "layout");
  revalidatePath("/admin/klantenbord");
  revalidatePath("/admin/overleg");
}

export async function waarnemingPlannen(formData: FormData) {
  const { sb, admin } = await requirePerm("waarneming");
  const beheer = admin.permissions.includes("omzet");
  const collegas = await haalCollegas(sb);
  const invoer = leesWaarneming(formData, { userId: admin.userId, beheer, collegas, vandaag: datumOver(0) });
  if ("fout" in invoer) redirect(lijst(`fout=${invoer.fout}`, "nieuw"));
  const { data, error } = await sb.from("waarnemingen").insert(invoer).select("*").single();
  if (error) redirect(lijst(`fout=${foutSleutel(error)}`, "nieuw"));
  const w = data as Waarneming;
  await mails(sb, w, { nieuweWaarnemer: Boolean(w.waarnemer), doorBeheer: w.afwezige !== admin.userId, collegas });
  ververs();
  redirect(kaart(w.id, "opgeslagen=waarneming"));
}

export async function waarnemingWijzigen(formData: FormData) {
  const { sb, admin } = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!isUuid(id)) redirect(lijst("fout=opslaan"));
  const beheer = admin.permissions.includes("omzet");
  const [collegas, oud] = await Promise.all([haalCollegas(sb), sb.from("waarnemingen").select("*").eq("id", id).maybeSingle()]);
  if (oud.error || !oud.data) redirect(kaart(id, "fout=waarneming-niet-van-jou"));
  const was = oud.data as Waarneming;
  // Een collega past alleen zijn eigen waarneming aan; de afwezige blijft dan wie het was.
  const invoer = leesWaarneming(formData, { userId: beheer ? was.afwezige : admin.userId, beheer, collegas, vandaag: datumOver(0) });
  if ("fout" in invoer) redirect(kaart(id, `fout=${invoer.fout}`, "wijzigen"));
  const { data, error } = await sb.from("waarnemingen").update(invoer).eq("id", id).select("*");
  if (error || !data?.length) redirect(kaart(id, `fout=${error ? foutSleutel(error) : "waarneming-niet-van-jou"}`, "wijzigen"));
  const w = data[0] as Waarneming;
  const periodeAnders = w.van !== was.van || w.tot !== was.tot;
  await mails(sb, w, { nieuweWaarnemer: Boolean(w.waarnemer) && (w.waarnemer !== was.waarnemer || periodeAnders), doorBeheer: w.afwezige !== admin.userId && (periodeAnders || w.waarnemer !== was.waarnemer), collegas });
  ververs(id);
  redirect(kaart(id, "opgeslagen=waarneming-bewaard"));
}

export async function waarnemingWeg(id: string) {
  const { sb } = await requireAdmin();
  if (!isUuid(id)) redirect(lijst("fout=opslaan"));
  const { data, error } = await sb.from("waarnemingen").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(kaart(id, "fout=waarneming-niet-van-jou"));
  ververs(id);
  redirect(lijst("opgeslagen=waarneming-weg"));
}

/* ---------- mails ---------- */

type Sb = Awaited<ReturnType<typeof requireAdmin>>["sb"];

/** De waarnemer hoort dat hij waarneemt; de afwezige hoort het als het beheer het voor hem regelde. Een mislukte mail houdt niets tegen. */
async function mails(sb: Sb, w: Waarneming, o: { nieuweWaarnemer: boolean; doorBeheer: boolean; collegas: Awaited<ReturnType<typeof haalCollegas>> }) {
  if (!o.nieuweWaarnemer && !o.doorBeheer) return;
  const afwezige = collegaBij(w.afwezige, o.collegas, w.afwezige_email);
  const waarnemer = collegaBij(w.waarnemer, o.collegas, w.waarnemer_email);
  const { siteBasis } = await import("@/lib/mail");
  const link = `${siteBasis()}/admin/waarneming/${w.id}`;
  const taken: Promise<void>[] = [];
  if (o.nieuweWaarnemer && waarnemer?.email) {
    const klanten = gedekteKlanten(w, await haalKlanten(sb), o.collegas).map((k) => k.bedrijf);
    const brief = waarnemerBrief({ waarnemer: naamVan(waarnemer), afwezige: naamVan(afwezige, w.afwezige_email), van: w.van, tot: w.tot, klanten, toelichting: w.toelichting, link, doorBeheer: o.doorBeheer });
    taken.push(mail(waarnemer.email, brief, o.doorBeheer ? undefined : afwezige?.email || undefined));
  }
  if (o.doorBeheer && afwezige?.email) {
    taken.push(mail(afwezige.email, afwezigeBrief({ afwezige: naamVan(afwezige), waarnemer: waarnemer ? naamVan(waarnemer) : null, van: w.van, tot: w.tot, link })));
  }
  await Promise.all(taken);
}

async function mail(aan: string, brief: { onderwerp: string; alineas: string[]; groet: string[] }, replyTo?: string) {
  const [{ sendBrief }, { offerteHuisstijl }] = await Promise.all([import("@/lib/mail"), import("@/lib/offerteHuisstijl")]);
  const { contact, certificaten } = await offerteHuisstijl();
  const res = await sendBrief({ to: aan, subject: brief.onderwerp, alineas: brief.alineas, groet: brief.groet, replyTo, contact, certificaten });
  if (!res.ok) console.error("[waarneming] mail aan %s mislukt: %s", aan, res.reden);
}
