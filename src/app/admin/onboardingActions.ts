"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  controleerOnboarding, controleerVelden, datumNl, documentKlaar, gekozen, isTaak, keuzeUit, MACHTIGING, MACHTIGING_FOUT, ONBOARDING_EMAIL, OVERDRACHT_BRIEF,
  schoonVelden, takenVoortgang, vultIn, type MachtigingenGetekend, type Onboarding, type OnboardingStatus,
} from "@/lib/onboarding";
import { machtigingUrl, notifyOnboarding, onboardingAdminUrl, onboardingUrl, sendMachtiging, sendOnboarding, sendOnboardingKlant, sendOverdracht } from "@/lib/mail";
import { overdrachtPdf } from "@/lib/onboardingPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { VersturenState } from "./offerteActions";

/*
 * Onboarding in het beheer (migratie 0037): aanmaken met de documentkeuze,
 * versturen, intrekken, en wat React2u zelf invult. Alles achter het
 * salesrecht (`bellijst`), net als brochures en contracten. Wat de klant doet
 * (bekijken, invullen, afvinken) schrijft alleen de database (0037).
 */

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

export type OnboardingFormState = { fout?: string } | null;

const tekst = (fd: FormData, naam: string, max = 200) => String(fd.get(naam) ?? "").trim().slice(0, max) || null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function foutUit(error: { code?: string; message?: string } | null): string {
  if (!error) return "Opslaan mislukt.";
  if (error.code === "PGRST205" || error.code === "42P01") return "Onboarding staat nog niet aan: migratie 0037 moet eerst in Supabase worden uitgevoerd.";
  if (error.code === "23514") return "Een van de velden klopt niet (bijvoorbeeld het e-mailadres).";
  return "Opslaan mislukt.";
}

async function log(sb: Sb, id: string, soort: string, door: string, details?: Record<string, unknown>) {
  await sb.from("onboarding_gebeurtenissen").insert({ onboarding_id: id, soort, door, details: details ?? null });
}

function ververs(id?: string) {
  revalidatePath("/admin/onboarding");
  if (id) revalidatePath(`/admin/onboarding/${id}`);
}

async function laad(sb: Sb, id: string): Promise<Onboarding | null> {
  const { data } = await sb.from("onboardings").select("*").eq("id", id).maybeSingle();
  return (data as Onboarding | null) ?? null;
}

/** Nieuwe onboarding of wijzigen, met de keuze per document (mee_<sleutel>, invul_<sleutel>). */
export async function saveOnboarding(_prev: OnboardingFormState, fd: FormData): Promise<OnboardingFormState> {
  const { sb, user, admin } = await requirePerm("bellijst");
  const id = String(fd.get("id") || "");
  const keuze = keuzeUit(fd.getAll("mee").map(String), fd.getAll("invul").map(String));
  const rij = {
    bedrijf: tekst(fd, "bedrijf") || "",
    contactpersoon: tekst(fd, "contactpersoon"),
    email: tekst(fd, "email", 254)?.toLowerCase() ?? null,
    telefoon: tekst(fd, "telefoon", 40),
    bericht: tekst(fd, "bericht", 5000),
    documenten: keuze.documenten,
    invullen: keuze.invullen,
    afzender_naam: tekst(fd, "afzender_naam"),
    afzender_functie: tekst(fd, "afzender_functie"),
    afzender_email: tekst(fd, "afzender_email", 254)?.toLowerCase() ?? ONBOARDING_EMAIL,
    afzender_telefoon: tekst(fd, "afzender_telefoon", 40),
  };
  if (!rij.bedrijf) return { fout: "Vul de naam van het bedrijf in." };
  if (!rij.documenten.length) return { fout: "Kies minstens één document om mee te sturen." };
  if (rij.email && !EMAIL.test(rij.email)) return { fout: "Het e-mailadres van de klant klopt niet." };
  if (rij.afzender_email && !EMAIL.test(rij.afzender_email)) return { fout: "Het e-mailadres van de afzender klopt niet." };

  if (id) {
    const oud = await laad(sb, id);
    if (!oud) return { fout: "Deze onboarding bestaat niet meer." };
    const { error } = await sb.from("onboardings").update(rij).eq("id", id);
    if (error) return { fout: foutUit(error) };
    if (oud.status !== "concept") await log(sb, id, "gewijzigd", admin.email);
    ververs(id);
    redirect(`/admin/onboarding/${id}?opgeslagen=onboarding`);
  }

  const { data, error } = await sb.from("onboardings").insert({ ...rij, created_by: user.id }).select("id").single();
  if (error || !data) return { fout: foutUit(error) };
  const nieuw = (data as { id: string }).id;
  await log(sb, nieuw, "aangemaakt", admin.email);
  ververs();
  redirect(`/admin/onboarding/${nieuw}?opgeslagen=onboarding-nieuw`);
}

/** Mailen naar de klant (of een herinnering). Eerst de mail, dan de status. */
export async function verstuurOnboarding(id: string, _prev: VersturenState, fd: FormData): Promise<VersturenState> {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) return { fout: "Deze onboarding bestaat niet meer." };
  if (o.status === "ingetrokken") return { fout: "Deze onboarding is ingetrokken. Heropen hem eerst." };
  const aan = String(fd.get("aan") || "").trim().toLowerCase();
  if (!EMAIL.test(aan)) return { fout: "Vul een geldig e-mailadres in." };
  const fouten = controleerOnboarding({ ...o, email: aan });
  if (fouten.length) return { fout: fouten[0] };

  const herinnering = o.status !== "concept";
  const { contact } = await offerteHuisstijl();
  const res = await sendOnboarding({
    to: aan,
    aanhef: tekst(fd, "aanhef", 120) ?? o.contactpersoon?.split(" ")[0] ?? null,
    bedrijf: o.bedrijf,
    nummer: o.nummer,
    link: onboardingUrl(o.token),
    bericht: tekst(fd, "bericht", 5000),
    afzender: { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || ONBOARDING_EMAIL, telefoon: o.afzender_telefoon },
    herinnering,
    documenten: gekozen(o).map((d) => ({
      titel: d.titel,
      kort: d.kort,
      kleur: d.kleur,
      actie: vultIn(o, d.sleutel) ? d.invullen! : d.lezen,
      klaar: herinnering && documentKlaar(o, d.sleutel),
    })),
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
    .from("onboardings")
    .update({ status: o.status === "concept" ? "verstuurd" : o.status, verstuurd_at: o.verstuurd_at ?? new Date().toISOString(), email: o.email ?? aan })
    .eq("id", id);
  if (error) return { fout: foutUit(error) };
  await log(sb, id, herinnering ? "herinnering" : "verstuurd", admin.email, { aan });
  ververs(id);
  return { ok: true };
}

/** De link zelf gestuurd: de onboarding gaat open zonder mail van het systeem. */
export async function markeerOnboardingVerstuurd(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o || o.status !== "concept") redirect(`/admin/onboarding/${id}`);
  if (controleerOnboarding(o).length) redirect(`/admin/onboarding/${id}?fout=onboarding-onvolledig`);
  const { error } = await sb.from("onboardings").update({ status: "verstuurd", verstuurd_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "verstuurd", admin.email, { handmatig: true });
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding-open`);
}

export async function trekOnboardingIn(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("onboardings").update({ status: "ingetrokken" }).eq("id", id).in("status", ["concept", "verstuurd", "afgerond"]);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "ingetrokken", admin.email);
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding-ingetrokken`);
}

export async function heropenOnboarding(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o || o.status !== "ingetrokken") redirect(`/admin/onboarding/${id}`);
  const status: OnboardingStatus = o.afgerond_at ? "afgerond" : o.verstuurd_at ? "verstuurd" : "concept";
  const { error } = await sb.from("onboardings").update({ status }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding-heropend`);
}

/** Een afgeronde onboarding weer openzetten, bijvoorbeeld als er een document bij komt. */
export async function zetOnboardingOpen(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("onboardings").update({ status: "verstuurd", afgerond_at: null }).eq("id", id).eq("status", "afgerond");
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "heropend", admin.email);
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding-heropend`);
}

export async function verwijderOnboarding(id: string) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("onboardings").delete().eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  ververs();
  redirect("/admin/onboarding?opgeslagen=definitief-weg");
}

export async function nieuweOnboardingLink(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const { error } = await sb.from("onboardings").update({ token: randomBytes(32).toString("hex") }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { link: "vernieuwd" });
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding-link`);
}

export async function saveOnboardingNotitie(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("onboardings").update({ notitie: tekst(fd, "notitie", 5000) }).eq("id", id);
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=notitie`);
}

/**
 * Een taak van React2u afvinken of weer openzetten (lib/onboarding.ts, TAKEN):
 * wat er na de documenten van de klant nog moet gebeuren voordat hij live is.
 */
export async function wisselTaak(id: string, taak: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o || !isTaak(taak)) redirect(`/admin/onboarding/${id}`);
  const wasKlaar = Boolean(o.taken?.[taak]);
  const taken = { ...(o.taken || {}) };
  if (wasKlaar) delete taken[taak];
  else taken[taak] = { at: new Date().toISOString(), door: admin.email };
  const { error } = await sb.from("onboardings").update({ taken }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "taak", admin.email, { taak, klaar: !wasKlaar });
  // De laatste taak afgevinkt terwijl de klant klaar is: dan is hij live, en krijgt hij dat te horen (één keer).
  let live = false;
  const t = takenVoortgang({ ...o, taken });
  if (!wasKlaar && o.status === "afgerond" && t.klaar === t.totaal && o.email) {
    const { count } = await sb.from("onboarding_gebeurtenissen").select("id", { count: "exact", head: true }).eq("onboarding_id", id).eq("soort", "live");
    if (!count) {
      const { contact } = await offerteHuisstijl();
      const res = await sendOnboardingKlant({
        to: o.email, soort: "live", aanhef: o.contactpersoon?.split(" ")[0] ?? null, bedrijf: o.bedrijf, nummer: o.nummer, link: onboardingUrl(o.token),
        afzender: { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || ONBOARDING_EMAIL, telefoon: o.afzender_telefoon },
        casemanager: o.casemanager, contact,
      });
      if (res.ok) {
        await log(sb, id, "live", admin.email, { aan: o.email, casemanager: o.casemanager ?? "" });
        live = true;
      }
    }
  }
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=${live ? "onboarding-live" : wasKlaar ? "taak-open" : "taak-klaar"}#inrichten`);
}

/** Het blok "in te vullen door React2u": contractsoort en debiteurnummer. */
export async function saveOnboardingIntern(id: string, fd: FormData) {
  const { sb } = await requirePerm("bellijst");
  const { error } = await sb.from("onboardings").update({ contractsoort: tekst(fd, "contractsoort"), debiteurnummer: tekst(fd, "debiteurnummer", 60), casemanager: tekst(fd, "casemanager") }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding`);
}

/**
 * Het werknemersbestand wissen, als het in XpertSuite staat: daar staan
 * burgerservicenummers in, en die horen hier niet langer dan nodig. De klant
 * ziet het document daarna als afgehandeld, niet weer als open.
 */
export async function wisWerknemers(id: string) {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o?.antwoorden?.werknemers) redirect(`/admin/onboarding/${id}`);
  const aantal = Array.isArray((o.antwoorden.werknemers.data as { rijen?: unknown[] })?.rijen)
    ? (o.antwoorden.werknemers.data as { rijen: unknown[] }).rijen.length
    : 0;
  const { werknemers: _weg, ...rest } = o.antwoorden;
  void _weg;
  // Gewist telt als gedaan: zet hem op gelezen, zodat de onboarding niet weer openvalt.
  const { error } = await sb
    .from("onboardings")
    .update({ antwoorden: rest, invullen: o.invullen.filter((s) => s !== "werknemers"), gelezen: { ...o.gelezen, werknemers: new Date().toISOString() } })
    .eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?fout=opslaan`);
  await log(sb, id, "gewist", admin.email, { document: "werknemers", aantal });
  ververs(id);
  redirect(`/admin/onboarding/${id}?opgeslagen=onboarding`);
}

/* ---------- 0039: het deel Werknemer, de machtiging vanuit het beheer ---------- */

export type BeheerState = { ok: boolean; fout?: string; melding?: string };
const mfout = (code: string | undefined): BeheerState => ({ ok: false, fout: MACHTIGING_FOUT[code || ""] || MACHTIGING_FOUT.storing });
const afzenderVan = (o: Onboarding) => ({ naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || ONBOARDING_EMAIL, telefoon: o.afzender_telefoon });

/** De vorige arbodienst van de klant: React2u vult hem in, hij komt op elke machtiging en in de opdracht. */
export async function saveVorigeArbodienst(id: string, fd: FormData) {
  const { sb, admin } = await requirePerm("bellijst");
  const velden = schoonVelden(MACHTIGING, Object.fromEntries(fd.entries()) as Record<string, unknown>);
  const fouten = controleerVelden(MACHTIGING, velden);
  if (Object.keys(fouten).length) redirect(`/admin/onboarding/${id}?tab=werknemer&fout=arbodienst`);
  const { error } = await sb.from("onboardings").update({ vorige_arbodienst: velden }).eq("id", id);
  if (error) redirect(`/admin/onboarding/${id}?tab=werknemer&fout=opslaan`);
  await log(sb, id, "gewijzigd", admin.email, { vorige_arbodienst: velden.arbodienst });
  ververs(id);
  redirect(`/admin/onboarding/${id}?tab=werknemer&opgeslagen=arbodienst`);
}

/**
 * Een werknemer uitnodigen om de machtiging online te tekenen (met IP-registratie):
 * de database maakt de persoonlijke link via dezelfde functie als voorheen de
 * klant, Next mailt hem. Dezelfde naam en e-mail nog eens is een herinnering.
 */
export async function nodigMachtigingUitBeheer(id: string, invoer: { naam: string; email: string }): Promise<BeheerState> {
  const { sb } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) return { ok: false, fout: "Deze onboarding bestaat niet meer." };
  if (o.status === "concept") return { ok: false, fout: "Verstuur de onboarding eerst; daarna kunnen werknemers tekenen." };
  if (!o.vorige_arbodienst) return mfout("arbodienst");
  const naam = String(invoer?.naam || "").trim().slice(0, 120);
  const email = String(invoer?.email || "").trim().toLowerCase().slice(0, 254);
  if (naam.length < 2) return mfout("naam");
  if (!EMAIL.test(email)) return mfout("email");

  const { data, error } = await sb.rpc("onboarding_machtiging_uitnodigen", { p_token: o.token, p_naam: naam, p_email: email });
  const uitkomst = data as { ok: boolean; fout?: string; id?: string; mtoken?: string; opnieuw?: boolean } | null;
  if (error || !uitkomst) {
    console.error("[onboarding] machtiging uitnodigen mislukt:", error?.message);
    return mfout("storing");
  }
  if (!uitkomst.ok) return mfout(uitkomst.fout);
  const { contact } = await offerteHuisstijl();
  const verzonden = await sendMachtiging({
    to: email, naam, bedrijf: o.bedrijf, arbodienst: o.vorige_arbodienst.arbodienst || null, link: machtigingUrl(uitkomst.mtoken!),
    afzender: afzenderVan(o), opnieuw: Boolean(uitkomst.opnieuw), contact,
  });
  if (!verzonden.ok) {
    if (!uitkomst.opnieuw && uitkomst.id) await sb.rpc("onboarding_machtiging_verwijderen", { p_token: o.token, p_id: uitkomst.id });
    return mfout("mail");
  }
  ververs(id);
  return { ok: true, melding: uitkomst.opnieuw ? `Herinnering gestuurd naar ${email}.` : `Uitnodiging gestuurd naar ${email}.` };
}

/** Een uitnodiging weghalen, zolang er niet getekend is. */
export async function verwijderMachtigingBeheer(id: string, mid: string): Promise<BeheerState> {
  const { sb } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) return { ok: false, fout: "Deze onboarding bestaat niet meer." };
  const { data, error } = await sb.rpc("onboarding_machtiging_verwijderen", { p_token: o.token, p_id: mid });
  const uitkomst = data as { ok: boolean; fout?: string } | null;
  if (error || !uitkomst) return mfout("storing");
  if (!uitkomst.ok) return mfout(uitkomst.fout);
  ververs(id);
  return { ok: true, melding: "Uitnodiging weggehaald." };
}

/**
 * De opdracht tot overdracht, namens de werkgever, naar de vorige arbodienst
 * (Rens, 16 nov 2026: de werknemer tekent, React2u regelt de rest): de brief
 * met alle getekende machtigingen als één pdf, naar het mailadres van de
 * arbodienst, met de werkgever en medisch@react2u.nl erbij.
 */
export async function verstuurOverdrachtBeheer(id: string, aan?: string): Promise<BeheerState> {
  const { sb, admin } = await requirePerm("bellijst");
  const o = await laad(sb, id);
  if (!o) return { ok: false, fout: "Deze onboarding bestaat niet meer." };
  if (!o.vorige_arbodienst) return mfout("arbodienst");
  const email = String(aan || o.vorige_arbodienst.email || "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(email)) return { ok: false, fout: "Vul het e-mailadres van de vorige arbodienst in; daar gaat de opdracht heen." };

  const { data: g } = await sb.rpc("onboarding_machtigingen_getekend", { p_token: o.token });
  const getekend = g as MachtigingenGetekend | null;
  if (!getekend?.machtigingen.length) return mfout("geen-getekend");
  const { data, error } = await sb.rpc("onboarding_overdracht_versturen", { p_token: o.token, p_aan: email });
  const uitkomst = data as { ok: boolean; fout?: string } | null;
  if (error || !uitkomst) {
    console.error("[onboarding] overdracht vastleggen mislukt:", error?.message);
    return mfout("storing");
  }
  if (!uitkomst.ok) return mfout(uitkomst.fout);

  const { contact } = await offerteHuisstijl();
  const pdf = await overdrachtPdf(getekend, contact).catch((e) => { console.error("[onboarding] opdracht-pdf mislukt:", e); return null; });
  if (!pdf) return mfout("storing");
  const verzonden = await sendOverdracht({
    to: email, werkgeverEmail: o.email, bedrijf: o.bedrijf, contactpersoon: o.contactpersoon,
    aantal: getekend.machtigingen.length, namen: getekend.machtigingen.map((m) => ({ naam: m.gegevens.naam, geboortedatum: datumNl(m.gegevens.geboortedatum) })),
    arbodienst: o.vorige_arbodienst.arbodienst || null, alineas: OVERDRACHT_BRIEF.alineas(o.bedrijf, getekend.machtigingen.length),
    pdf: { filename: `${OVERDRACHT_BRIEF.onderwerp(o.bedrijf)}.pdf`, content: pdf }, contact,
  });
  if (!verzonden.ok) return { ok: false, fout: "De mail aan de arbodienst kon niet worden verstuurd. Download de opdracht en stuur hem zelf." };
  if (o.afzender_email && o.afzender_email !== admin.email) {
    await notifyOnboarding({ to: o.afzender_email, nummer: o.nummer, bedrijf: o.bedrijf, adminLink: onboardingAdminUrl(o.id), soort: "overdracht", aantal: getekend.machtigingen.length });
  }
  ververs(id);
  return { ok: true, melding: `Opdracht verstuurd naar ${email}, met ${getekend.machtigingen.length} getekende ${getekend.machtigingen.length === 1 ? "machtiging" : "machtigingen"}; de werkgever en medisch@react2u.nl kregen een kopie.` };
}
