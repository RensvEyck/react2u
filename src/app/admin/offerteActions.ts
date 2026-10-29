"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  controleer, datumLang, isVorm, normaliseerFactuur, normaliseerRegels, normaliseerVervolg, type Offerte, type OfferteStatus,
} from "@/lib/offertes";
import { sleutelUit, STANDAARD_SJABLONEN } from "@/lib/offerteSjablonen";
import { sendOfferte, offerteUrl } from "@/lib/mail";

/*
 * Offertes in het beheer (migratie 0024). Alles achter het salesrecht
 * (`bellijst`), net als partners. Wat de klant doet (bekijken, kiezen,
 * tekenen, afwijzen) staat niet hier maar in app/(offerte)/offerte/actions.ts;
 * de database laat het beheer die velden ook niet schrijven.
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type OfferteFormState = { fout?: string } | null;
export type VersturenState = { ok?: boolean; fout?: string } | null;

const tekst = (fd: FormData, naam: string, max = 200) => String(fd.get(naam) ?? "").trim().slice(0, max) || null;

function foutUit(error: { code?: string; hint?: string; message?: string } | null): string {
  if (!error) return "Opslaan mislukt.";
  if (error.hint === "offerte-getekend") return "Deze offerte is getekend en kan niet meer worden gewijzigd.";
  if (error.code === "PGRST205" || error.code === "42P01") return "Offertes staan nog niet aan: migratie 0024 moet eerst in Supabase worden uitgevoerd.";
  // Een kolom uit 0025 (vorm, inhoud, voorwaarden, …) ontbreekt nog.
  if (error.code === "PGRST204" || error.code === "42703") return "Er ontbreekt een kolom: migraties 0025 en 0026 moeten eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres of het aantal medewerkers).";
  return "Opslaan mislukt.";
}

async function log(sb: Sb, offerteId: string, soort: string, door: string, details?: Record<string, unknown>) {
  await sb.from("offerte_gebeurtenissen").insert({ offerte_id: offerteId, soort, door, details: details ?? null });
}

function ververs(id?: string) {
  revalidatePath("/admin/offertes");
  if (id) revalidatePath(`/admin/offertes/${id}`);
}

/**
 * Nieuwe offerte of wijzigen. De editor stuurt de regels als JSON; die gaan
 * door normaliseerRegels, zodat er nooit iets anders in de database komt dan
 * de vorm uit lib/offertes.ts. Bij een fout komt de melding terug en blijft
 * alles in de editor staan; bij succes naar de offerte zelf.
 */
export async function saveOfferte(_prev: OfferteFormState, fd: FormData): Promise<OfferteFormState> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const id = String(fd.get("id") || "");
  let regels: unknown = [];
  let vervolg: unknown = [];
  try {
    regels = JSON.parse(String(fd.get("regels") || "[]"));
    vervolg = JSON.parse(String(fd.get("vervolg") || "[]"));
  } catch {
    return { fout: "De onderdelen konden niet worden gelezen. Probeer het opnieuw." };
  }
  const vorm = fd.get("vorm");
  const medewerkersRuw = Number(String(fd.get("medewerkers") || "").replace(/\D/g, ""));
  const geldig = String(fd.get("geldig_tot") || "");
  const rij = {
    bedrijf: tekst(fd, "bedrijf") || "",
    contactpersoon: tekst(fd, "contactpersoon"),
    email: tekst(fd, "email", 254)?.toLowerCase() ?? null,
    telefoon: tekst(fd, "telefoon", 40),
    medewerkers: medewerkersRuw > 0 ? Math.min(medewerkersRuw, 1_000_000) : null,
    vorm: isVorm(vorm) ? vorm : "verzuimbegeleiding",
    titel: tekst(fd, "titel") || "Offerte",
    betreft: tekst(fd, "betreft"),
    intro: tekst(fd, "intro", 5000),
    inhoud: tekst(fd, "inhoud", 30000),
    voorwaarden: tekst(fd, "voorwaarden", 10000),
    vervolg: normaliseerVervolg(vervolg),
    regels: normaliseerRegels(regels),
    geldig_tot: /^\d{4}-\d{2}-\d{2}$/.test(geldig) ? geldig : null,
    afzender_naam: tekst(fd, "afzender_naam"),
    afzender_functie: tekst(fd, "afzender_functie"),
    afzender_email: tekst(fd, "afzender_email", 254)?.toLowerCase() ?? null,
    afzender_telefoon: tekst(fd, "afzender_telefoon", 40),
  };
  // Factuurgegevens vooraf (0026); alleen meesturen als het formulier ze kent, zodat een oudere editor ze niet wist.
  const factuur = fd.has("factuur_adres")
    ? normaliseerFactuur({
        adres: fd.get("factuur_adres"), postcode: fd.get("factuur_postcode"), plaats: fd.get("factuur_plaats"),
        email: fd.get("factuur_email"), kvk: fd.get("factuur_kvk"), inkoopnummer: fd.get("factuur_inkoopnummer"),
      })
    : undefined;
  if (factuur?.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(factuur.email)) return { fout: "Het e-mailadres voor de facturen klopt niet." };
  if (factuur?.kvk && !/^\d{8}$/.test(factuur.kvk)) return { fout: "Een KvK-nummer heeft 8 cijfers." };
  const opslaan = factuur ? { ...rij, factuur: Object.keys(factuur).length ? factuur : null } : rij;
  if (!rij.bedrijf) return { fout: "Vul de naam van het bedrijf in." };
  if (rij.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rij.email)) return { fout: "Het e-mailadres van de klant klopt niet." };

  if (id) {
    const { data: oud } = await sb.from("offertes").select("status").eq("id", id).maybeSingle();
    const { error } = await sb.from("offertes").update(opslaan).eq("id", id);
    if (error) return { fout: foutUit(error) };
    // Een concept wijzigt de hele dag; pas als de klant meekijkt is een wijziging het vermelden waard.
    if (oud && (oud as { status: OfferteStatus }).status !== "concept") await log(sb, id, "gewijzigd", admin.email);
    ververs(id);
    redirect(`/admin/offertes/${id}?opgeslagen=offerte`);
  }

  const { data, error } = await sb.from("offertes").insert({ ...opslaan, created_by: user.id }).select("id").single();
  if (error || !data) return { fout: foutUit(error) };
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email);
  ververs();
  redirect(`/admin/offertes/${nieuw}?opgeslagen=offerte-nieuw`);
}

async function laad(sb: Sb, id: string): Promise<Offerte | null> {
  const { data } = await sb.from("offertes").select("*").eq("id", id).maybeSingle();
  return (data as Offerte | null) ?? null;
}

/**
 * De offerte mailen naar de klant (of een herinnering). Eerst versturen, dan
 * de status: lukt de mail niet, dan blijft de offerte zoals hij was en zegt
 * de melding waarom. De link kopiëren en zelf sturen kan altijd
 * (markeerVerstuurd).
 */
export async function verstuurOfferte(id: string, _prev: VersturenState, fd: FormData): Promise<VersturenState> {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) return { fout: "Deze offerte bestaat niet meer." };
  if (o.status === "getekend" || o.status === "afgewezen") return { fout: "Deze offerte is al afgerond." };
  const aan = String(fd.get("aan") || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(aan)) return { fout: "Vul een geldig e-mailadres in." };
  const fouten = controleer({ ...o, email: aan, regels: normaliseerRegels(o.regels) });
  if (fouten.length) return { fout: fouten[0] };

  const herinnering = o.status === "verstuurd";
  const res = await sendOfferte({
    to: aan,
    aanhef: tekst(fd, "aanhef", 120) ?? o.contactpersoon?.split(" ")[0] ?? null,
    bedrijf: o.bedrijf,
    nummer: o.nummer,
    titel: o.titel,
    link: offerteUrl(o.token),
    bericht: tekst(fd, "bericht", 5000),
    geldigTot: o.geldig_tot ? datumLang(o.geldig_tot) : null,
    afzender: { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || admin.email, telefoon: o.afzender_telefoon },
    herinnering,
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
    .from("offertes")
    .update({ status: "verstuurd", verstuurd_at: o.verstuurd_at ?? new Date().toISOString(), email: o.email ?? aan })
    .eq("id", id);
  if (error) return { fout: foutUit(error) };
  await log(sb, id, herinnering ? "herinnering" : "verstuurd", admin.email, { aan });
  ververs(id);
  return { ok: true };
}

/** De link zelf gestuurd (WhatsApp, eigen mail): de offerte gaat open voor de klant zonder dat het systeem mailt. */
export async function markeerVerstuurd(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o || o.status !== "concept") redirect(`/admin/offertes/${id}`);
  const fouten = controleer({ ...o, email: o.email || "zelf@verstuurd.nl", regels: normaliseerRegels(o.regels) });
  if (fouten.length) redirect(`/admin/offertes/${id}?fout=offerte-onvolledig`);
  const { error } = await sb.from("offertes").update({ status: "verstuurd", verstuurd_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/offertes/${id}?fout=opslaan`);
  await log(sb, id, "verstuurd", admin.email, { handmatig: true });
  ververs(id);
  redirect(`/admin/offertes/${id}?opgeslagen=offerte-open`);
}

/** Intrekken: de link toont daarna alleen nog dat de offerte niet meer geldt, met de contactgegevens. */
export async function trekOfferteIn(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("offertes").update({ status: "ingetrokken" }).eq("id", id).in("status", ["concept", "verstuurd"]);
  if (error) redirect(`/admin/offertes/${id}?fout=opslaan`);
  await log(sb, id, "ingetrokken", admin.email);
  ververs(id);
  redirect(`/admin/offertes/${id}?opgeslagen=offerte-ingetrokken`);
}

/** Na een afwijzing of intrekking weer openzetten; een afwijzing verdwijnt dan (de tijdlijn houdt hem). */
export async function heropenOfferte(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o || (o.status !== "afgewezen" && o.status !== "ingetrokken")) redirect(`/admin/offertes/${id}`);
  const status = o.verstuurd_at ? "verstuurd" : "concept";
  const { error } = await sb.from("offertes").update({ status }).eq("id", id);
  if (error) redirect(`/admin/offertes/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`/admin/offertes/${id}?opgeslagen=offerte-heropend`);
}

/** Een kopie als nieuw concept, met een eigen nummer en link. Handig voor een aangepaste versie of een vergelijkbare klant. */
export async function dupliceerOfferte(id: string) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) redirect("/admin/offertes");
  const bron = o.status === "getekend" && o.getekend_inhoud ? { ...o, regels: o.getekend_inhoud.regels } : o;
  const { data, error } = await sb
    .from("offertes")
    .insert({
      bedrijf: bron.bedrijf, contactpersoon: bron.contactpersoon, email: bron.email, telefoon: bron.telefoon, factuur: bron.factuur ?? null,
      medewerkers: bron.medewerkers, titel: bron.titel, intro: bron.intro, regels: normaliseerRegels(bron.regels),
      vorm: bron.vorm, betreft: bron.betreft, inhoud: bron.inhoud, voorwaarden: bron.voorwaarden, vervolg: bron.vervolg,
      afzender_naam: bron.afzender_naam, afzender_functie: bron.afzender_functie,
      afzender_email: bron.afzender_email, afzender_telefoon: bron.afzender_telefoon,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/offertes/${id}?fout=opslaan`);
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email, { kopie_van: o.nummer });
  ververs();
  redirect(`/admin/offertes/${nieuw}?opgeslagen=offerte-kopie`);
}

/** Verwijderen kan zolang hij niet getekend is; een getekende offerte weigert de database. */
export async function verwijderOfferte(id: string) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("offertes").delete().eq("id", id);
  if (error) redirect(`/admin/offertes/${id}?fout=${error.hint === "offerte-getekend" ? "offerte-getekend" : "opslaan"}`);
  ververs();
  redirect("/admin/offertes?opgeslagen=definitief-weg");
}

/** Een nieuwe link, als de oude bij de verkeerde terecht is gekomen. De oude werkt meteen niet meer. */
export async function nieuweOfferteLink(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("offertes").update({ token: randomBytes(32).toString("hex") }).eq("id", id).neq("status", "getekend");
  if (error) redirect(`/admin/offertes/${id}?fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { link: "vernieuwd" });
  ververs(id);
  redirect(`/admin/offertes/${id}?opgeslagen=offerte-link`);
}

/** De interne notitie: blijft bewerkbaar, ook na ondertekening. De klant ziet hem nooit. */
export async function saveOfferteNotitie(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("offertes").update({ notitie: tekst(fd, "notitie", 5000) }).eq("id", id);
  ververs(id);
  redirect(`/admin/offertes/${id}?opgeslagen=notitie`);
}

/* ---------- sjablonen (migratie 0025) ---------- */

/**
 * De tekst, onderdelen, voorwaarden en stappen van deze offerte bewaren als
 * sjabloon: een bestaand sjabloon overschrijven (dezelfde sleutel, ook een
 * standaard) of een nieuw sjabloon met een eigen naam. Klantgegevens gaan niet
 * mee; de aanhef wel, dus gebruik daar {contactpersoon} in plaats van een naam.
 */
export async function bewaarAlsSjabloon(id: string, fd: FormData) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) redirect("/admin/offertes");
  const keuze = String(fd.get("sjabloon") || "");
  const nieuweNaam = tekst(fd, "naam", 120);
  const bestaand = keuze && keuze !== "nieuw" ? keuze : null;
  if (!bestaand && !nieuweNaam) redirect(`/admin/offertes/${id}?fout=sjabloon-naam#sjabloon`);
  const standaard = bestaand ? STANDAARD_SJABLONEN.find((s) => s.sleutel === bestaand) : undefined;
  const { data: rij } = bestaand
    ? await sb.from("offerte_sjablonen").select("naam, omschrijving, geldig_dagen").eq("sleutel", bestaand).maybeSingle()
    : { data: null };
  const huidig = rij as { naam: string; omschrijving: string | null; geldig_dagen: number } | null;
  const geldig = Number(fd.get("geldig_dagen"));
  const bron = o.status === "getekend" && o.getekend_inhoud ? { ...o, ...o.getekend_inhoud } : o;
  const record = {
    sleutel: bestaand || sleutelUit(nieuweNaam!),
    vorm: o.vorm,
    naam: bestaand ? huidig?.naam || standaard?.naam || bestaand : nieuweNaam!,
    omschrijving: tekst(fd, "omschrijving", 300) ?? huidig?.omschrijving ?? standaard?.omschrijving ?? null,
    titel: bron.titel,
    intro: bron.intro,
    inhoud: bron.inhoud ?? null,
    voorwaarden: bron.voorwaarden ?? null,
    vervolg: normaliseerVervolg(bron.vervolg),
    regels: normaliseerRegels(bron.regels),
    geldig_dagen: geldig >= 1 && geldig <= 365 ? Math.round(geldig) : huidig?.geldig_dagen ?? standaard?.geldigDagen ?? 30,
    updated_at: new Date().toISOString(),
    updated_by: admin.email,
  };
  // Een nieuwe naam mag geen bestaande sleutel overschrijven.
  if (!bestaand) {
    const bezet = STANDAARD_SJABLONEN.some((s) => s.sleutel === record.sleutel) ||
      Boolean((await sb.from("offerte_sjablonen").select("sleutel").eq("sleutel", record.sleutel).maybeSingle()).data);
    if (bezet) redirect(`/admin/offertes/${id}?fout=sjabloon-bestaat#sjabloon`);
  }
  const { error } = await sb.from("offerte_sjablonen").upsert(record);
  if (error) redirect(`/admin/offertes/${id}?fout=${error.code === "PGRST205" || error.code === "42P01" ? "migratie-0025" : "opslaan"}#sjabloon`);
  revalidatePath("/admin/offertes/sjablonen");
  redirect(`/admin/offertes/${id}?opgeslagen=sjabloon#sjabloon`);
}

/** Een aangepast standaardsjabloon terug naar de versie uit de code, of een eigen sjabloon verwijderen. */
export async function verwijderSjabloon(sleutel: string) {
  const { sb } = await requirePerm("bellijst");
  const isStandaard = STANDAARD_SJABLONEN.some((s) => s.sleutel === sleutel);
  await sb.from("offerte_sjablonen").delete().eq("sleutel", sleutel);
  revalidatePath("/admin/offertes/sjablonen");
  redirect(`/admin/offertes/sjablonen?opgeslagen=${isStandaard ? "sjabloon-standaard" : "definitief-weg"}`);
}
