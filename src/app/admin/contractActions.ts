"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  CONTRACT_EMAIL, contractFeiten, contractKort, controleerContract, normaliseerOpdrachtgever, offerteKenmerk, opdrachtnemerUit, soortVan,
  type Contract, type ContractSoort, type ContractStatus,
} from "@/lib/contracten";
import { contractStructuur, standaardTekst, standaardVersie, wijktAf } from "@/lib/contractTekst";
import { contractUrl, sendContract } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { VersturenState } from "./offerteActions";

/*
 * Contracten in het beheer (migratie 0031, de resellerovereenkomst sinds 0033):
 * aanmaken, versturen, intrekken.
 * Alles achter het salesrecht (`bellijst`), net als offertes. Wat de klant doet
 * (bekijken, tekenen) staat in app/(offerte)/contract/actions.ts; de database
 * laat het beheer die velden ook niet schrijven.
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type ContractFormState = { fout?: string } | null;

const tekst = (fd: FormData, naam: string, max = 200) => String(fd.get(naam) ?? "").trim().slice(0, max) || null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/;

function foutUit(error: { code?: string; hint?: string; message?: string } | null): string {
  if (!error) return "Opslaan mislukt.";
  if (error.hint === "contract-getekend") return "Dit contract is getekend en kan niet meer worden gewijzigd.";
  if (error.code === "PGRST205" || error.code === "42P01") return "Contracten staan nog niet aan: migratie 0031 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "PGRST204" || error.code === "42703") return "De resellerovereenkomst staat nog niet aan: migratie 0033 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres, of een einddatum vóór de ingangsdatum).";
  return "Opslaan mislukt.";
}

async function log(sb: Sb, contractId: string, soort: string, door: string, details?: Record<string, unknown>) {
  await sb.from("contract_gebeurtenissen").insert({ contract_id: contractId, soort, door, details: details ?? null });
}

function ververs(id?: string, partnerId?: string | null) {
  revalidatePath("/admin/contracten");
  if (id) revalidatePath(`/admin/contracten/${id}`);
  if (partnerId) revalidatePath(`/admin/partners/${partnerId}`);
}

async function laad(sb: Sb, id: string): Promise<Contract | null> {
  const { data } = await sb.from("contracten").select("*").eq("id", id).maybeSingle();
  return (data as Contract | null) ?? null;
}

/** React2u als partij: elke keer vers uit Instellingen, zodat een verhuizing of nieuw KvK-nummer meteen meegaat. */
async function opdrachtnemer() {
  const { contact } = await offerteHuisstijl();
  return opdrachtnemerUit(contact);
}

/**
 * Nieuw contract of wijzigen. Bij een fout komt de melding terug en blijft
 * alles staan; bij succes naar het contract zelf. De tekst komt uit het
 * formulier (daar begint hij als de standaard); leeg wordt de standaard. De
 * soort ligt vast bij het aanmaken; een resellerovereenkomst heeft geen
 * looptijd en geen offerte, wel een partner.
 */
export async function saveContract(_prev: ContractFormState, fd: FormData): Promise<ContractFormState> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const id = String(fd.get("id") || "");
  const oud = id ? await laad(sb, id) : null;
  if (id && !oud) return { fout: "Dit contract bestaat niet meer." };
  if (oud?.status === "getekend") return { fout: "Dit contract is getekend en kan niet meer worden gewijzigd." };
  const soort: ContractSoort = oud ? soortVan(oud) : fd.get("soort") === "reseller" ? "reseller" : "basiscontract";
  const reseller = soort === "reseller";
  const ingangsdatum = reseller ? null : String(fd.get("ingangsdatum") || "");
  const einddatum = reseller ? null : String(fd.get("einddatum") || "");
  const offerteId = reseller ? "" : String(fd.get("offerte_id") || "");
  const partnerId = reseller ? String(fd.get("partner_id") || "") : "";
  const tekstIn = String(fd.get("tekst") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 60000);
  const og = normaliseerOpdrachtgever({
    naam: fd.get("og_naam"), adres: fd.get("og_adres"), postcode: fd.get("og_postcode"), plaats: fd.get("og_plaats"), kvk: fd.get("og_kvk"),
    ...(reseller ? { email: fd.get("og_email"), telefoon: fd.get("og_telefoon") } : {}),
  });

  const rij = {
    bedrijf: tekst(fd, "bedrijf") || "",
    contactpersoon: tekst(fd, "contactpersoon"),
    email: tekst(fd, "email", 254)?.toLowerCase() ?? null,
    telefoon: tekst(fd, "telefoon", 40),
    opdrachtgever: Object.keys(og).length ? og : null,
    opdrachtnemer: await opdrachtnemer(),
    offerte_id: UUID.test(offerteId) ? offerteId : null,
    offerte_kenmerk: reseller ? null : tekst(fd, "offerte_kenmerk"),
    // Alleen bij de reseller: zo blijft een basiscontract ook op te slaan zonder migratie 0033.
    ...(reseller ? { partner_id: UUID.test(partnerId) ? partnerId : null } : {}),
    ingangsdatum,
    einddatum,
    tekst: tekstIn || standaardTekst(soort),
    aanvullend: tekst(fd, "aanvullend", 5000),
    afzender_naam: tekst(fd, "afzender_naam"),
    afzender_functie: tekst(fd, "afzender_functie"),
    afzender_email: tekst(fd, "afzender_email", 254)?.toLowerCase() ?? CONTRACT_EMAIL,
    afzender_telefoon: tekst(fd, "afzender_telefoon", 40),
  };
  // De versie hoort bij de standaardtekst; een aangepaste tekst noemt zijn versie niet.
  const tekst_versie = wijktAf(rij.tekst, soort) ? null : standaardVersie(soort);
  const wie = reseller ? "de reseller" : "de klant";

  if (!rij.bedrijf) return { fout: reseller ? "Vul de naam van het kantoor in." : "Vul de naam van het bedrijf in." };
  if (rij.email && !EMAIL.test(rij.email)) return { fout: `Het e-mailadres van ${wie} klopt niet.` };
  if (rij.afzender_email && !EMAIL.test(rij.afzender_email)) return { fout: "Het e-mailadres van de afzender klopt niet." };
  if (!reseller) {
    if (!ingangsdatum || !einddatum || !DATUM.test(ingangsdatum) || !DATUM.test(einddatum)) return { fout: "Vul de ingangsdatum en de einddatum in." };
    if (einddatum <= ingangsdatum) return { fout: "De einddatum moet na de ingangsdatum liggen." };
  }
  if (og.kvk && !/^\d{8}$/.test(og.kvk)) return { fout: "Een KvK-nummer heeft 8 cijfers." };
  if (og.email && !EMAIL.test(og.email)) return { fout: "Het e-mailadres van het kantoor klopt niet." };
  if (!contractStructuur(rij.tekst).artikelen.length) return { fout: "De contracttekst heeft geen artikelen (een artikel begint met ## 1. Titel)." };

  // Gekoppeld aan een offerte zonder eigen kenmerk: het nummer en de datum van die offerte.
  if (rij.offerte_id && !rij.offerte_kenmerk) {
    const { data } = await sb.from("offertes").select("nummer, getekend_at, verstuurd_at").eq("id", rij.offerte_id).maybeSingle();
    if (data) rij.offerte_kenmerk = offerteKenmerk(data as { nummer: string; getekend_at: string | null; verstuurd_at: string | null });
  }

  if (oud) {
    const { error } = await sb.from("contracten").update({ ...rij, tekst_versie }).eq("id", id);
    if (error) return { fout: foutUit(error) };
    if (oud.status !== "concept") await log(sb, id, "gewijzigd", admin.email);
    ververs(id, ("partner_id" in rij ? rij.partner_id : null) || oud.partner_id);
    redirect(`/admin/contracten/${id}?opgeslagen=contract`);
  }

  const { data, error } = await sb.from("contracten").insert({ ...rij, ...(reseller ? { soort } : {}), tekst_versie, created_by: user.id }).select("id").single();
  if (error || !data) return { fout: foutUit(error) };
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email, rij.offerte_id ? { offerte: rij.offerte_kenmerk } : reseller && rij.bedrijf ? { partner: rij.bedrijf } : undefined);
  ververs(undefined, "partner_id" in rij ? rij.partner_id : null);
  redirect(`/admin/contracten/${nieuw}?opgeslagen=contract-nieuw`);
}

/**
 * Het contract mailen naar de klant (of een herinnering). Eerst versturen, dan
 * de status: lukt de mail niet, dan blijft het contract zoals het was. De
 * gegevens van React2u worden bij het versturen nog eens ververst.
 */
export async function verstuurContract(id: string, _prev: VersturenState, fd: FormData): Promise<VersturenState> {
  const { sb, admin } = await requirePerm("bellijst");
  const c = await laad(sb, id);
  if (!c) return { fout: "Dit contract bestaat niet meer." };
  if (c.status === "getekend") return { fout: "Dit contract is al getekend." };
  if (c.status === "ingetrokken") return { fout: "Dit contract is ingetrokken. Heropen het eerst." };
  const aan = String(fd.get("aan") || "").trim().toLowerCase();
  if (!EMAIL.test(aan)) return { fout: "Vul een geldig e-mailadres in." };
  const on = await opdrachtnemer();
  const fouten = controleerContract({ ...c, email: aan, opdrachtnemer: on });
  if (fouten.length) return { fout: fouten[0] };

  const herinnering = c.status === "verstuurd";
  const { contact } = await offerteHuisstijl();
  const res = await sendContract({
    to: aan,
    soort: soortVan(c),
    aanhef: tekst(fd, "aanhef", 120) ?? c.contactpersoon?.split(" ")[0] ?? null,
    bedrijf: c.bedrijf,
    nummer: c.nummer,
    link: contractUrl(c.token),
    bericht: tekst(fd, "bericht", 5000),
    afzender: { naam: c.afzender_naam, functie: c.afzender_functie, email: c.afzender_email || CONTRACT_EMAIL, telefoon: c.afzender_telefoon },
    herinnering,
    feiten: contractFeiten(c),
    kort: contractKort(c),
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
    .from("contracten")
    .update({ status: "verstuurd", verstuurd_at: c.verstuurd_at ?? new Date().toISOString(), email: c.email ?? aan, opdrachtnemer: on })
    .eq("id", id);
  if (error) return { fout: foutUit(error) };
  await log(sb, id, herinnering ? "herinnering" : "verstuurd", admin.email, { aan });
  ververs(id, c.partner_id);
  return { ok: true };
}

/** De link zelf gestuurd (WhatsApp, eigen mail): het contract gaat open zonder dat het systeem mailt. */
export async function markeerContractVerstuurd(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const c = await laad(sb, id);
  if (!c || c.status !== "concept") redirect(`/admin/contracten/${id}`);
  const on = await opdrachtnemer();
  if (controleerContract({ ...c, opdrachtnemer: on }).length) redirect(`/admin/contracten/${id}?fout=contract-onvolledig`);
  const { error } = await sb.from("contracten").update({ status: "verstuurd", verstuurd_at: new Date().toISOString(), opdrachtnemer: on }).eq("id", id);
  if (error) redirect(`/admin/contracten/${id}?fout=opslaan`);
  await log(sb, id, "verstuurd", admin.email, { handmatig: true });
  ververs(id);
  redirect(`/admin/contracten/${id}?opgeslagen=contract-open`);
}

/** Intrekken: de link toont daarna alleen nog dat het contract niet meer geldt, met de contactgegevens. */
export async function trekContractIn(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("contracten").update({ status: "ingetrokken" }).eq("id", id).in("status", ["concept", "verstuurd"]);
  if (error) redirect(`/admin/contracten/${id}?fout=opslaan`);
  await log(sb, id, "ingetrokken", admin.email);
  ververs(id);
  redirect(`/admin/contracten/${id}?opgeslagen=contract-ingetrokken`);
}

/** Na een intrekking weer openzetten. */
export async function heropenContract(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const c = await laad(sb, id);
  if (!c || c.status !== "ingetrokken") redirect(`/admin/contracten/${id}`);
  const status: ContractStatus = c.verstuurd_at ? "verstuurd" : "concept";
  const { error } = await sb.from("contracten").update({ status }).eq("id", id);
  if (error) redirect(`/admin/contracten/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`/admin/contracten/${id}?opgeslagen=contract-heropend`);
}

export async function verwijderContract(id: string) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("contracten").delete().eq("id", id);
  if (error) redirect(`/admin/contracten/${id}?fout=opslaan`);
  ververs();
  redirect("/admin/contracten?opgeslagen=definitief-weg");
}

/** Een nieuwe link, als de oude bij de verkeerde terecht is gekomen. De oude werkt meteen niet meer. */
export async function nieuweContractLink(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("contracten").update({ token: randomBytes(32).toString("hex") }).eq("id", id).neq("status", "getekend");
  if (error) redirect(`/admin/contracten/${id}?fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { link: "vernieuwd" });
  ververs(id);
  redirect(`/admin/contracten/${id}?opgeslagen=contract-link`);
}

/** De interne notitie; de klant ziet hem nooit. Blijft bewerkbaar, ook na ondertekening. */
export async function saveContractNotitie(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("contracten").update({ notitie: tekst(fd, "notitie", 5000) }).eq("id", id);
  ververs(id);
  redirect(`/admin/contracten/${id}?opgeslagen=notitie`);
}
