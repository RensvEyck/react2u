import "server-only";
import type { supabaseServer } from "./supabase/server";
import { catalogusStandaard, catalogusUit, type CatalogusGroep, type TarievenData } from "./offerteCatalogus";
import { normaliseerRegels, normaliseerVervolg, type Offerte } from "./offertes";
import { alleSjablonen, type Sjabloon, type SjabloonRij } from "./offerteSjablonen";

/*
 * Wat de offerteschermen in het beheer uit de database halen, los van de
 * schermen zelf: de prijslijst (live), de standaardafzender en een
 * offerteaanvraag uit het Postvak IN als beginpunt.
 */

type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * De prijslijst zoals hij live staat: het blok `dgTarieven` op
 * /verzuimabonnementen. Lukt dat niet (geen blok, andere vorm), dan de versie
 * uit de repo.
 */
export async function laadCatalogus(sb: Sb): Promise<CatalogusGroep[]> {
  try {
    const { data: pagina } = await sb.from("pages").select("id").eq("slug", "verzuimabonnementen").maybeSingle();
    if (pagina) {
      const { data: blok } = await sb
        .from("blocks")
        .select("data")
        .eq("page_id", (pagina as { id: string }).id)
        .eq("type", "dgTarieven")
        .order("sort")
        .limit(1)
        .maybeSingle();
      const groepen = catalogusUit((blok as { data: TarievenData } | null)?.data);
      if (groepen.length >= 2) return groepen;
    }
  } catch {
    // terugval hieronder
  }
  return catalogusStandaard();
}

/** "rens.van.eyck@react2u.nl" → "Rens van Eyck": een redelijke eerste gok voor de afzendernaam. */
export function naamUitEmail(email: string): string {
  const lokaal = email.split("@")[0] || "";
  const kleine = new Set(["van", "de", "der", "den", "het", "ter", "ten", "te"]);
  return lokaal
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && kleine.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** De afzender van een nieuwe offerte: die van je vorige offerte, anders je e-mail en het algemene nummer. */
export async function standaardAfzender(sb: Sb, userId: string, email: string) {
  const [vorigeRes, contactRes] = await Promise.all([
    sb.from("offertes").select("afzender_naam, afzender_functie, afzender_email, afzender_telefoon").eq("created_by", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
  ]);
  const vorige = vorigeRes.data as Pick<Offerte, "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon"> | null;
  if (vorige?.afzender_naam) return vorige;
  const contact = (contactRes.data as { value?: { phoneDisplay?: string } } | null)?.value;
  return {
    afzender_naam: naamUitEmail(email),
    afzender_functie: null,
    afzender_email: email,
    afzender_telefoon: (contact?.phoneDisplay || "085 - 620 58 00").replace(/\s*-\s*/, " "),
  };
}

/**
 * Een offerteaanvraag uit het Postvak IN als beginpunt (?bericht=<id>): naam,
 * mail en telefoon, en uit de tekst van submitOfferte het bedrijf, het aantal
 * medewerkers en de gekozen aansluiting.
 */
export async function uitAanvraag(sb: Sb, id: string) {
  const { data } = await sb.from("contact_messages").select("name, email, phone, subject, message").eq("id", id).maybeSingle();
  if (!data) return null;
  const m = data as { name: string; email: string; phone: string | null; subject: string | null; message: string | null };
  const tekst = m.message || "";
  const regel = (label: string) => tekst.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"))?.[1]?.trim() || null;
  const aansluiting = regel("Aansluiting") || regel("Interesse") || "";
  const medewerkers = Number((regel("Aantal medewerkers") || "").replace(/\D/g, "")) || null;
  return {
    bedrijf: regel("Bedrijf") || "",
    contactpersoon: m.name,
    email: m.email,
    telefoon: m.phone,
    medewerkers,
    startpunt: /compleet/i.test(aansluiting) ? "compleet" : /verrichtingen/i.test(aansluiting) ? "basis" : "keuze",
  };
}

/** Een rij uit de database met de regels in vorm, voor de schermen. */
export function inVorm(o: Offerte): Offerte {
  return { ...o, vorm: o.vorm || "verzuimbegeleiding", regels: normaliseerRegels(o.regels), vervolg: normaliseerVervolg(o.vervolg) };
}

/**
 * Alle sjablonen: de standaard uit de code met daaroverheen de aanpassingen
 * van het team. Zonder migratie 0025 (geen tabel) gewoon de standaard.
 */
export async function laadSjablonen(sb: Sb, catalogus?: CatalogusGroep[]): Promise<{ sjablonen: Sjabloon[]; tabel: boolean }> {
  const [c, res] = await Promise.all([catalogus ? Promise.resolve(catalogus) : laadCatalogus(sb), sb.from("offerte_sjablonen").select("*")]);
  const rijen = res.error ? [] : ((res.data as SjabloonRij[]) || []);
  return { sjablonen: alleSjablonen(c, rijen), tabel: !res.error };
}
