"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { leesIdee, leesReactie, leesStatus, naamVan, reactieBrief, statusBrief, type Idee, type IdeeStatus } from "@/lib/ideeen";
import type { ZetUitkomst } from "@/app/admin/inwerkreisActions";

/**
 * Ideeënbord (0055). Indienen, je eigen idee aanpassen of weghalen, stemmen
 * en reageren: iedereen met het recht ideeen. De status en de reden zetten:
 * het recht omzet. De database controleert hetzelfde (de policies); dit geeft
 * een nette melding, en mailt de inbrenger als er iets met zijn idee gebeurt.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bord = (q = "", anker = "") => `/admin/ideeen${q ? `?${q}` : ""}${anker ? `#${anker}` : ""}`;
const kaart = (id: string, q = "", anker = "") => `/admin/ideeen/${id}${q ? `?${q}` : ""}${anker ? `#${anker}` : ""}`;
const foutSleutel = (error: { code?: string; message: string }) => (isMissingTable(error) ? "migratie-0055" : /row-level security|policy/i.test(error.message) ? "idee-niet-van-jou" : "opslaan");

function ververs(id?: string) {
  revalidatePath("/admin/ideeen", "layout");
  if (id) revalidatePath(`/admin/ideeen/${id}`);
  revalidatePath("/admin");
}

/* ---------- indienen en aanpassen ---------- */

export async function ideeIndienen(formData: FormData) {
  const { sb } = await requirePerm("ideeen");
  const invoer = leesIdee(formData);
  if ("fout" in invoer) redirect(bord(`fout=${invoer.fout}`, "nieuw"));
  const { data, error } = await sb.from("ideeen").insert(invoer).select("id").single();
  if (error) redirect(bord(`fout=${foutSleutel(error)}`, "nieuw"));
  ververs();
  redirect(kaart((data as { id: string }).id, "opgeslagen=idee"));
}

export async function ideeWijzigen(formData: FormData) {
  const { sb } = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!UUID.test(id)) redirect(bord("fout=opslaan"));
  const invoer = leesIdee(formData);
  if ("fout" in invoer) redirect(kaart(id, `fout=${invoer.fout}`, "wijzigen"));
  const { data, error } = await sb.from("ideeen").update(invoer).eq("id", id).select("id");
  if (error || !data?.length) redirect(kaart(id, `fout=${error ? foutSleutel(error) : "idee-niet-van-jou"}`, "wijzigen"));
  ververs(id);
  redirect(kaart(id, "opgeslagen=idee-bewaard"));
}

export async function ideeVerwijderen(id: string) {
  const { sb } = await requireAdmin();
  if (!UUID.test(id)) redirect(bord("fout=opslaan"));
  const { data, error } = await sb.from("ideeen").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(kaart(id, "fout=idee-niet-van-jou"));
  ververs(id);
  redirect(bord("opgeslagen=idee-weg"));
}

/* ---------- stemmen ---------- */

/** Een stem geven of intrekken; de database houdt het bij één per collega en weigert de eigen ideeën. */
export async function stemZetten(id: string, aan: boolean): Promise<ZetUitkomst> {
  const { sb, admin } = await requirePerm("ideeen");
  if (!UUID.test(id)) return { ok: false, fout: "Dat lukte niet." };
  if (aan) {
    const { error } = await sb.from("idee_stemmen").insert({ idee_id: id, user_id: admin.userId });
    // Al gestemd (unieke sleutel): dan staat de stem er, en is het goed.
    if (error && error.code !== "23505") return { ok: false, fout: /row-level security|policy/i.test(error.message) ? "Op je eigen idee stem je niet." : "Stemmen lukte niet. Probeer het nog eens." };
  } else {
    const { error } = await sb.from("idee_stemmen").delete().eq("idee_id", id).eq("user_id", admin.userId);
    if (error) return { ok: false, fout: "Intrekken lukte niet. Probeer het nog eens." };
  }
  ververs(id);
  return { ok: true };
}

/* ---------- reacties ---------- */

export async function reactiePlaatsen(formData: FormData) {
  const { sb, admin } = await requirePerm("ideeen");
  const id = String(formData.get("idee_id") || "");
  if (!UUID.test(id)) redirect(bord("fout=opslaan"));
  const invoer = leesReactie(formData);
  if ("fout" in invoer) redirect(kaart(id, `fout=${invoer.fout}`, "reageren"));
  const { error } = await sb.from("idee_reacties").insert({ idee_id: id, tekst: invoer.tekst });
  if (error) redirect(kaart(id, `fout=${foutSleutel(error)}`, "reageren"));
  // De inbrenger krijgt een mail, niet als hij zelf reageerde. Een mislukte mail laat de reactie staan.
  const { data } = await sb.from("ideeen").select("id, titel, door, door_email").eq("id", id).maybeSingle();
  const idee = data as Pick<Idee, "id" | "titel" | "door" | "door_email"> | null;
  if (idee?.door_email && idee.door !== admin.userId) {
    const brief = reactieBrief(voornaam(idee.door_email), idee, naamVan(admin.email), invoer.tekst, await link(id));
    await mail(idee.door_email, brief, admin.email);
  }
  ververs(id);
  redirect(kaart(id, "opgeslagen=reactie", "reacties"));
}

export async function reactieWeg(id: string, ideeId: string) {
  const { sb } = await requireAdmin();
  if (!UUID.test(id) || !UUID.test(ideeId)) redirect(bord("fout=opslaan"));
  const { data, error } = await sb.from("idee_reacties").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(kaart(ideeId, "fout=idee-niet-van-jou", "reacties"));
  ververs(ideeId);
  redirect(kaart(ideeId, "opgeslagen=reactie-weg", "reacties"));
}

/* ---------- status (beheer) ---------- */

export async function statusZetten(formData: FormData) {
  const { sb, admin } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  if (!UUID.test(id)) redirect(bord("fout=opslaan"));
  const invoer = leesStatus(formData);
  if ("fout" in invoer) redirect(kaart(id, `fout=${invoer.fout}`, "status"));
  const { data: eerder } = await sb.from("ideeen").select("status").eq("id", id).maybeSingle();
  const { data, error } = await sb.from("ideeen").update({ status: invoer.status, reden: invoer.reden }).eq("id", id).select("id, titel, door, door_email, status").single();
  if (error) redirect(kaart(id, `fout=${/niet_nu_met_reden/.test(error.message) ? "idee-reden" : foutSleutel(error)}`, "status"));
  const idee = data as Pick<Idee, "id" | "titel" | "door" | "door_email" | "status">;
  const veranderd = (eerder as { status?: IdeeStatus } | null)?.status !== invoer.status;
  // Mail alleen bij een echt andere status, en niet aan jezelf.
  if (veranderd && idee.door_email && idee.door !== admin.userId) {
    await mail(idee.door_email, statusBrief(voornaam(idee.door_email), idee, invoer.status, invoer.reden, await link(id)));
  }
  ververs(id);
  redirect(kaart(id, `opgeslagen=idee-status-${invoer.status}`, "status"));
}

/* ---------- meldingen ---------- */

/** Het bord bekeken: alles wat voor jou nieuw was, is gezien. */
export async function meldingenGezien(): Promise<void> {
  const { sb, admin } = await requireAdmin();
  const { error } = await sb.from("idee_meldingen").update({ gelezen_at: new Date().toISOString() }).eq("user_id", admin.userId).is("gelezen_at", null);
  if (!error) revalidatePath("/admin");
}

/* ---------- hulp ---------- */

const voornaam = (email: string) => naamVan(email).includes("@") ? null : naamVan(email);

async function link(id: string) {
  const { siteBasis } = await import("@/lib/mail");
  return `${siteBasis()}/admin/ideeen/${id}`;
}

async function mail(aan: string, brief: { onderwerp: string; alineas: string[]; groet: string[] }, replyTo?: string) {
  const [{ sendBrief }, { offerteHuisstijl }] = await Promise.all([import("@/lib/mail"), import("@/lib/offerteHuisstijl")]);
  const { contact, certificaten } = await offerteHuisstijl();
  const res = await sendBrief({ to: aan, subject: brief.onderwerp, alineas: brief.alineas, groet: brief.groet, replyTo, contact, certificaten });
  if (!res.ok) console.error("[ideeen] mail aan %s mislukt: %s", aan, res.reden);
}

