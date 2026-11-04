"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { leesUren, maandagVan } from "@/lib/uren";

/**
 * Omzet en uren (migratie 0035), alles achter het recht `omzet`. De database
 * controleert hetzelfde (has_perm('omzet')); dit geeft een nette melding.
 */

const UUID = /^[0-9a-f-]{36}$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function getal(formData: FormData, naam: string): number | null {
  const ruw = String(formData.get(naam) ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!ruw) return null;
  const n = Number(ruw);
  return Number.isFinite(n) ? n : null;
}

const tussen = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/* ---------- medewerkers ---------- */

export async function medewerkerOpslaan(formData: FormData) {
  const { sb } = await requirePerm("omzet");
  const id = String(formData.get("id") || "");
  const naam = String(formData.get("naam") || "").trim();
  const terug = `/admin/omzet/uren${String(formData.get("terug") || "")}`;
  if (!naam) redirect(`/admin/omzet/uren?fout=medewerker-naam#medewerkers`);
  const tarief = getal(formData, "uurtarief");
  const rij = {
    naam: naam.slice(0, 120),
    functie: String(formData.get("functie") || "").trim().slice(0, 120) || null,
    contracturen: tussen(getal(formData, "contracturen") ?? 36, 0, 60),
    norm: Math.round(tussen(getal(formData, "norm") ?? 75, 0, 100)),
    uurtarief: tarief === null ? null : tussen(tarief, 0, 1000),
    // Een niet aangevinkt vakje stuurt niets mee: dan is hij inactief.
    actief: formData.get("actief") === "aan",
  };
  const { error } = UUID.test(id)
    ? await sb.from("medewerkers").update(rij).eq("id", id)
    : await sb.from("medewerkers").insert({ ...rij, sort: Date.now() % 1_000_000 });
  if (error) redirect(`/admin/omzet/uren?fout=${isMissingTable(error) ? "migratie-0035" : "opslaan"}#medewerkers`);
  revalidatePath("/admin/omzet", "layout");
  redirect(`${terug}${terug.includes("?") ? "&" : "?"}opgeslagen=medewerker#medewerkers`);
}

/** Weg met al zijn uren. Wie vertrekt maar meetelt in het verleden: liever op inactief zetten. */
export async function medewerkerVerwijderen(id: string) {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(id)) return;
  await sb.from("medewerkers").delete().eq("id", id);
  revalidatePath("/admin/omzet", "layout");
  redirect("/admin/omzet/uren?opgeslagen=medewerker-weg#medewerkers");
}

/* ---------- uren ---------- */

export type UrenUitslag = { ok: true; declarabel: number; afwezig: number } | { ok: false; fout: string };

/**
 * Eén vakje in het urenoverzicht: declarabel en afwezig voor een medewerker in
 * een week. Twee keer leeg haalt de week weg, zodat "niet ingevuld" iets anders
 * blijft dan "nul uur".
 */
export async function urenBewaren(medewerkerId: string, week: string, declarabel: string, afwezig: string): Promise<UrenUitslag> {
  const { sb, admin } = await requirePerm("omzet");
  if (!UUID.test(medewerkerId) || !DATUM.test(week) || maandagVan(week) !== week) return { ok: false, fout: "Onbekende week." };
  const d = leesUren(declarabel);
  const a = leesUren(afwezig);
  if (d === null || a === null) return { ok: false, fout: "Vul uren in als getal, bijvoorbeeld 7,5." };
  if (!declarabel.trim() && !afwezig.trim()) {
    const { error } = await sb.from("uren").delete().eq("medewerker_id", medewerkerId).eq("week", week);
    if (error) return { ok: false, fout: "Wissen mislukt." };
    revalidatePath("/admin/omzet");
    return { ok: true, declarabel: 0, afwezig: 0 };
  }
  const { error } = await sb
    .from("uren")
    .upsert({ medewerker_id: medewerkerId, week, declarabel: d, afwezig: a, door: admin.email }, { onConflict: "medewerker_id,week" });
  if (error) return { ok: false, fout: isMissingTable(error) ? "Voer eerst migratie 0035 uit." : "Opslaan mislukt." };
  revalidatePath("/admin/omzet");
  return { ok: true, declarabel: d, afwezig: a };
}

/* ---------- abonnementen ---------- */

/** Een getekend abonnement beëindigen: vanaf die maand telt het niet meer in de omzet. */
export async function abonnementStoppen(formData: FormData) {
  const { sb, admin } = await requirePerm("omzet");
  const offerteId = String(formData.get("offerte_id") || "");
  const maand = String(formData.get("vanaf") || "");
  if (!UUID.test(offerteId) || !/^\d{4}-\d{2}$/.test(maand)) redirect("/admin/omzet?fout=stoppen#klanten");
  // Een los opgevoerde klant (0036) stopt in zijn eigen rij, niet bij de offertes.
  if (formData.get("bron") === "los") {
    const { error } = await sb.from("losse_opdrachten").update({ stop: `${maand}-01` }).eq("id", offerteId);
    if (error) redirect("/admin/omzet?fout=stoppen#klanten");
    revalidatePath("/admin/omzet");
    revalidatePath("/admin/verkoop", "layout");
    redirect("/admin/omzet?opgeslagen=gestopt#klanten");
  }
  const { error } = await sb.from("abonnementen_gestopt").upsert({
    offerte_id: offerteId,
    vanaf: `${maand}-01`,
    reden: String(formData.get("reden") || "").trim().slice(0, 500) || null,
    door: admin.email,
  });
  if (error) redirect(`/admin/omzet?fout=${isMissingTable(error) ? "migratie-0035" : "stoppen"}#klanten`);
  revalidatePath("/admin/omzet");
  redirect("/admin/omzet?opgeslagen=gestopt#klanten");
}

/** `bron` is "los" voor een los opgevoerde klant (0036), anders een offerte; via bind, vóór de FormData. */
export async function abonnementHervatten(offerteId: string, bron: "los" | "offerte") {
  const { sb } = await requirePerm("omzet");
  if (!UUID.test(offerteId)) return;
  if (bron === "los") await sb.from("losse_opdrachten").update({ stop: null }).eq("id", offerteId);
  else await sb.from("abonnementen_gestopt").delete().eq("offerte_id", offerteId);
  revalidatePath("/admin/omzet");
  redirect("/admin/omzet?opgeslagen=hervat#gestopt");
}
