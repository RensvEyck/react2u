"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/admin";
import { bestandType, isBestandSoort, KLANT_BUCKET, MAX_GROOTTE, padVanKlant, type KlantBestandSoort } from "@/lib/klantBestanden";
import { type Gesprek, type Klant } from "@/lib/klanten";
import { isStamkaartVeld, schoonStamkaart, schoonTarief, stamkaartRegel, type KlantTarief, type StamkaartInvoer, type StamkaartVeld, type TariefInvoer } from "@/lib/stamkaart";

/*
 * De stamkaart (migratie 0048): de bedrijfsgegevens bewerken of aanvullen uit
 * de modules, afwijkende tariefafspraken bijhouden en eigen bestanden bij een
 * klant vastleggen. Alles achter het salesrecht (`bellijst`), net als het bord.
 * De acties geven een resultaat terug; de schermen verversen zichzelf.
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type StamkaartResultaat = { ok: true; klant: Klant; gesprek: Gesprek | null } | { ok: false; fout: string };
export type TariefResultaat = { ok: true; tarief: KlantTarief | null } | { ok: false; fout: string };
export type BestandResultaat = { ok: true } | { ok: false; fout: string };

function foutUit(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Opslaan mislukt.";
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") return "De stamkaart staat nog niet aan: migratie 0048 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres of een te lange tekst).";
  return "Opslaan mislukt.";
}

async function laad(sb: Sb, id: string): Promise<Klant | null> {
  const { data } = await sb.from("klanten").select("*").eq("id", id).maybeSingle();
  return (data as Klant | null) ?? null;
}

async function log(sb: Sb, klantId: string, tekst: string, door: string): Promise<Gesprek | null> {
  const { data } = await sb.from("klant_gesprekken").insert({ klant_id: klantId, soort: "stamkaart", tekst: tekst.slice(0, 5000), door, contact: false }).select("*").single();
  return (data as Gesprek | null) ?? null;
}

const ververs = (id: string) => {
  revalidatePath(`/admin/klanten/${id}`);
  revalidatePath("/admin/klanten");
  revalidatePath("/admin/klantenbord");
};

/**
 * De stamkaart opslaan. Alleen wat verandert komt in de tijdlijn ("Stamkaart
 * bijgewerkt: KvK-nummer, IBAN"); niets veranderd is geen regel.
 */
export async function wijzigStamkaart(id: string, invoer: StamkaartInvoer): Promise<StamkaartResultaat> {
  const { sb, admin } = await requirePerm("bellijst");
  const oud = await laad(sb, id);
  if (!oud) return { ok: false, fout: "Deze klant staat niet (meer) op het bord." };
  const { velden, fout } = schoonStamkaart(invoer);
  if (fout) return { ok: false, fout };
  const gewijzigd = (Object.keys(velden) as StamkaartVeld[]).filter((v) => (velden as Record<string, unknown>)[v] !== ((oud as Record<string, unknown>)[v] ?? null));
  if (!gewijzigd.length) return { ok: true, klant: oud, gesprek: null };
  const update: Record<string, unknown> = {};
  for (const v of gewijzigd) update[v] = (velden as Record<string, unknown>)[v];
  const { data, error } = await sb.from("klanten").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, fout: foutUit(error) };
  if (!data) return { ok: false, fout: "Deze klant staat niet (meer) op het bord." };
  const gesprek = await log(sb, id, stamkaartRegel(gewijzigd), admin.email);
  ververs(id);
  return { ok: true, klant: data as Klant, gesprek };
}

/**
 * Het voorstel uit de modules overnemen: de velden die nu leeg zijn, met waar
 * ze vandaan kwamen in de tijdlijn. Een veld dat intussen gevuld is blijft.
 */
export async function neemVoorstelOver(id: string, voorstel: { veld: string; waarde: string; bron: string }[]): Promise<StamkaartResultaat> {
  const { sb, admin } = await requirePerm("bellijst");
  const oud = await laad(sb, id);
  if (!oud) return { ok: false, fout: "Deze klant staat niet (meer) op het bord." };
  const invoer: StamkaartInvoer = {};
  const bronnen: Partial<Record<StamkaartVeld, string>> = {};
  for (const v of Array.isArray(voorstel) ? voorstel.slice(0, 50) : []) {
    if (!isStamkaartVeld(v.veld) || !v.waarde) continue;
    const huidig = (oud as Record<string, unknown>)[v.veld];
    if (huidig !== null && huidig !== undefined && String(huidig).trim() !== "") continue;
    invoer[v.veld] = String(v.waarde);
    bronnen[v.veld] = String(v.bron || "").slice(0, 80);
  }
  if (!Object.keys(invoer).length) return { ok: true, klant: oud, gesprek: null };
  const { velden, fout } = schoonStamkaart(invoer);
  if (fout) return { ok: false, fout };
  const { data, error } = await sb.from("klanten").update(velden).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, fout: foutUit(error) };
  if (!data) return { ok: false, fout: "Deze klant staat niet (meer) op het bord." };
  const gesprek = await log(sb, id, stamkaartRegel(Object.keys(velden) as StamkaartVeld[], bronnen), admin.email);
  ververs(id);
  return { ok: true, klant: data as Klant, gesprek };
}

/* ---------- afwijkende tariefafspraken ---------- */

export async function bewaarTarief(klantId: string, invoer: TariefInvoer, id?: string | null): Promise<TariefResultaat> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const r = schoonTarief(invoer);
  if (!r.ok) return r;
  if (id) {
    const { data, error } = await sb.from("klant_tarieven").update(r.rij).eq("id", id).eq("klant_id", klantId).select("*").maybeSingle();
    if (error) return { ok: false, fout: foutUit(error) };
    if (!data) return { ok: false, fout: "Deze afspraak bestaat niet meer." };
    ververs(klantId);
    return { ok: true, tarief: data as KlantTarief };
  }
  const { data, error } = await sb.from("klant_tarieven").insert({ ...r.rij, klant_id: klantId, created_by: user.id }).select("*").single();
  if (error || !data) return { ok: false, fout: foutUit(error) };
  await log(sb, klantId, `Tariefafspraak vastgelegd: ${r.rij.omschrijving}`, admin.email);
  ververs(klantId);
  return { ok: true, tarief: data as KlantTarief };
}

export async function verwijderTarief(klantId: string, id: string): Promise<TariefResultaat> {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("klant_tarieven").delete().eq("id", id).eq("klant_id", klantId);
  if (error) return { ok: false, fout: foutUit(error) };
  ververs(klantId);
  return { ok: true, tarief: null };
}

/* ---------- eigen bestanden ---------- */

/** Een geüpload bestand vastleggen bij de klant. Lukt dat niet, dan gaat het bestand weer uit de bucket. */
export async function registreerKlantBestand(
  klantId: string,
  invoer: { pad: string; naam: string; grootte: number; soort: KlantBestandSoort; omschrijving?: string | null },
): Promise<BestandResultaat> {
  const { sb, admin } = await requirePerm("bellijst");
  if (!padVanKlant(invoer.pad, klantId)) return { ok: false, fout: "Dit bestand hoort niet bij deze klant." };
  const type = bestandType(invoer.naam);
  if (!type || !(invoer.grootte > 0) || invoer.grootte > MAX_GROOTTE) return { ok: false, fout: "Alleen pdf, Word, Excel en afbeeldingen tot 20 MB." };

  // Staat het er echt? Zonder bestand geen rij.
  const [map, naam] = invoer.pad.split("/");
  const { data: lijst } = await sb.storage.from(KLANT_BUCKET).list(map, { search: naam, limit: 5 });
  if (!lijst?.some((f) => f.name === naam)) return { ok: false, fout: "Het bestand is niet aangekomen. Probeer het opnieuw." };

  const soort: KlantBestandSoort = isBestandSoort(invoer.soort) ? invoer.soort : "overig";
  const { error } = await sb.from("klant_bestanden").insert({
    klant_id: klantId,
    pad: invoer.pad,
    naam: invoer.naam.trim().slice(0, 255) || naam,
    grootte: Math.round(invoer.grootte),
    type,
    soort,
    omschrijving: invoer.omschrijving?.trim().slice(0, 300) || null,
    geupload_door: admin.email,
  });
  if (error) {
    await sb.storage.from(KLANT_BUCKET).remove([invoer.pad]);
    return { ok: false, fout: error.code === "PGRST205" || error.code === "42P01" ? "Bestanden staan nog niet aan: migratie 0048 moet eerst in Supabase worden uitgevoerd." : "Vastleggen mislukt." };
  }
  ververs(klantId);
  return { ok: true };
}

/** Een bestand weghalen: eerst uit de bucket, dan de rij. */
export async function verwijderKlantBestand(klantId: string, id: string): Promise<BestandResultaat> {
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("klant_bestanden").select("pad").eq("id", id).eq("klant_id", klantId).maybeSingle();
  if (!data) return { ok: false, fout: "Dit bestand bestaat niet meer." };
  const { error: opslag } = await sb.storage.from(KLANT_BUCKET).remove([(data as { pad: string }).pad]);
  if (opslag) return { ok: false, fout: "Verwijderen mislukt." };
  await sb.from("klant_bestanden").delete().eq("id", id);
  ververs(klantId);
  return { ok: true };
}
