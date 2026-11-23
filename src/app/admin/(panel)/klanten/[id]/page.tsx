import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuGlobe, LuLayoutGrid, LuMail, LuPhone } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { fetchPageViews } from "@/lib/analyticsDb";
import { summarize, type CompanyProfile } from "@/lib/companies";
import { getSetting } from "@/lib/content";
import { isMissingTable } from "@/lib/dbErrors";
import { herkomstLabel } from "@/lib/herkomst";
import type { KlantBestand } from "@/lib/klantBestanden";
import { bedrijfSleutel, bezoekPerKlant, statusInfo, tijdlijnRegels, vandaagNL, type Bezoek, type Gesprek, type Klant } from "@/lib/klanten";
import type { LosseOpdracht } from "@/lib/losseOpdrachten";
import { datumLang } from "@/lib/offertes";
import {
  afsprakenUitOffertes, documentenVoor, losseAfspraken, stamkaartVolledigheid, voorstelStamkaart, type DocumentBronnen, type KlantTarief, type StamkaartBronnen,
} from "@/lib/stamkaart";
import { normalizeTarieven } from "@/lib/tarieven";
import type { PageView } from "@/lib/types";
import { alsWnKlant, dekkingPil, wieNeemtWaar } from "@/lib/waarneming";
import { haalDekking } from "@/lib/waarnemingDb";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import Tabs from "@/components/admin/Tabs";
import { Eigenaar, StatusPill } from "@/components/admin/klantenbord/bits";
import DocumentenTab from "@/components/admin/klanten/DocumentenTab";
import StamkaartTab from "@/components/admin/klanten/StamkaartTab";
import TarievenTab from "@/components/admin/klanten/TarievenTab";
import TijdlijnTab from "@/components/admin/klanten/TijdlijnTab";
import WaarnemingPil from "@/components/admin/waarneming/WaarnemingPil";

/**
 * De stamkaart van één klant (migratie 0048), in vier tabbladen: de
 * bedrijfsgegevens (met wat de modules al weten als voorstel), alle documenten
 * uit alle modules met de eigen bestanden erbij, de tariefafspraken uit de
 * getekende offertes en losse opdrachten plus de afwijkende afspraken, en de
 * tijdlijn van het bord. Alles van dezelfde klant wordt op de bedrijfssleutel
 * gevonden (bedrijf_sleutel in SQL, bedrijfSleutel in TypeScript), zoals het
 * bord zijn koppelingen vindt.
 */

type Tab = "stamkaart" | "documenten" | "tarieven" | "tijdlijn";
const TABS: Tab[] = ["stamkaart", "documenten", "tarieven", "tijdlijn"];

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

/** Eerst licht (id en bedrijf) om de rijen van deze klant te vinden, dan de volledige rijen: regels, antwoorden en getekende inhoud zijn groot. */
async function vanKlant<T>(sb: Sb, tabel: string, sleutel: string, kolommen: string): Promise<T[]> {
  const { data } = await sb.from(tabel).select("id, bedrijf").limit(5000);
  const ids = ((data as { id: string; bedrijf: string }[] | null) || []).filter((r) => bedrijfSleutel(r.bedrijf) === sleutel).map((r) => r.id);
  if (!ids.length) return [];
  const { data: rijen } = await sb.from(tabel).select(kolommen).in("id", ids).order("created_at", { ascending: false });
  return (rijen as unknown as T[] | null) || [];
}

export default async function KlantPagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "stamkaart";
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { sb, admin } = await requirePerm("bellijst");
  const kRes = await sb.from("klanten").select("*").eq("id", id).maybeSingle();
  if (kRes.error && isMissingTable(kRes.error)) {
    return <MigratieNodig bestand="0040_klantenbord.sql" wat="De stamkaart hoort bij een kaart op het klantenbord." />;
  }
  if (!kRes.data) notFound();
  const k = kRes.data as Klant;
  const stamkaartAan = "kvk" in k;
  const sleutel = k.sleutel || bedrijfSleutel(k.bedrijf);
  const vandaag = vandaagNL();
  const nu = new Date();
  const metBezoek = admin.permissions.includes("bezoek");
  const sinds = new Date(nu.getTime() - 14 * 86_400_000).toISOString();

  type OfferteRij = StamkaartBronnen["offertes"][number] & DocumentBronnen["offertes"][number] & Parameters<typeof afsprakenUitOffertes>[0][number];
  type ContractRij = StamkaartBronnen["contracten"][number] & DocumentBronnen["contracten"][number];
  type OnboardingRij = StamkaartBronnen["onboardings"][number] & DocumentBronnen["onboardings"][number];

  const [offertes, brochures, contracten, onboardings, evaluaties, gRes, lRes, loRes, tRes, fRes, pvRes, prRes, tarieven] = await Promise.all([
    vanKlant<OfferteRij>(sb, "offertes", sleutel, "id, nummer, status, bedrijf, vorm, contactpersoon, email, telefoon, medewerkers, regels, keuze, factuur, getekend_inhoud, getekend_naam, getekend_functie, getekend_at, afgewezen_at, verstuurd_at, bekeken_at, geldig_tot, created_at"),
    vanKlant<DocumentBronnen["brochures"][number]>(sb, "brochures", sleutel, "id, nummer, token, status, bedrijf, verstuurd_at, bekeken_at, created_at"),
    vanKlant<ContractRij>(sb, "contracten", sleutel, "id, nummer, status, soort, bedrijf, contactpersoon, email, telefoon, opdrachtgever, getekend_naam, getekend_functie, getekend_at, ingangsdatum, verstuurd_at, bekeken_at, created_at"),
    vanKlant<OnboardingRij>(sb, "onboardings", sleutel, "id, nummer, status, bedrijf, contactpersoon, email, telefoon, documenten, invullen, taken, antwoorden, gelezen, casemanager, debiteurnummer, vorige_arbodienst, bekeken_at, verstuurd_at, afgerond_at, created_at"),
    vanKlant<DocumentBronnen["evaluaties"][number]>(sb, "evaluaties", sleutel, "id, nummer, status, bedrijf, verstuurd_at, bekeken_at, ingevuld_at, ingevuld_door, created_at"),
    sb.from("klant_gesprekken").select("*").eq("klant_id", id).order("op", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    sb.from("leads").select("id, name, company, phone, email").limit(2000),
    sb.from("losse_opdrachten").select("*").limit(2000),
    sb.from("klant_tarieven").select("*").eq("klant_id", id).order("ingangsdatum", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    sb.from("klant_bestanden").select("*").eq("klant_id", id).order("created_at", { ascending: false }),
    metBezoek ? fetchPageViews(sb, sinds, "path, referrer_host, visitor_hash, created_at, company, company_domain, company_source, is_company", { onlyCompanies: true }).catch(() => [] as PageView[]) : Promise.resolve([] as PageView[]),
    metBezoek ? sb.from("company_profiles").select("key, name, domain, ignored, lead_id") : Promise.resolve({ data: null }),
    getSetting("tarieven").catch(() => null),
  ]);

  // De checklist bij elk basiscontract (0042) en de machtigingen bij elke onboarding (0038).
  const contractIds = contracten.map((c) => c.id);
  const onboardingIds = onboardings.map((o) => o.id);
  const [clRes, mRes] = await Promise.all([
    contractIds.length ? sb.from("contract_checklists").select("contract_id, door, ingevuld_at, bijgewerkt_at").in("contract_id", contractIds) : Promise.resolve({ data: null }),
    onboardingIds.length ? sb.from("onboarding_machtigingen").select("id, onboarding_id, naam, status, uitgenodigd_at, getekend_at, overdracht_at").in("onboarding_id", onboardingIds) : Promise.resolve({ data: null }),
  ]);

  const gesprekken = (gRes.data as Gesprek[] | null) || [];
  const leads = (lRes.data as StamkaartBronnen["leads"] | null) || [];
  const losse = ((loRes.data as LosseOpdracht[] | null) || []).map((l) => ({ ...l, bedrag: Number(l.bedrag) }));
  const tariefrijen = ((tRes.data as KlantTarief[] | null) || []).map((t) => ({ ...t, bedrag: t.bedrag === null ? null : Number(t.bedrag) }));
  const bestanden = (fRes.data as KlantBestand[] | null) || [];
  const bedrijvenOpSite = metBezoek
    ? summarize((pvRes as PageView[]).filter((v) => v.is_company), ((prRes as { data: CompanyProfile[] | null }).data) || [], [], nu).filter((c) => !c.ignored)
    : [];
  const bezoek: Bezoek | null = bezoekPerKlant([k], bedrijvenOpSite)[k.id] || null;
  const tarievenjaar = normalizeTarieven(tarieven).jaar;

  const voorstel = stamkaartAan
    ? voorstelStamkaart(k, { offertes, contracten, onboardings, leads, bedrijven: bedrijvenOpSite.map((b) => ({ name: b.name, domain: b.domain })) })
    : [];
  const docs = documentenVoor(k, {
    brochures, offertes, contracten, onboardings, evaluaties, bestanden,
    checklists: (clRes.data as DocumentBronnen["checklists"] | null) || [],
    machtigingen: (mRes.data as DocumentBronnen["machtigingen"] | null) || [],
  }, vandaag);
  const offerteAfspraken = afsprakenUitOffertes(offertes, sleutel);
  const los = losseAfspraken(losse, sleutel);
  const regels = tijdlijnRegels(gesprekken, bezoek);
  const v = stamkaartVolledigheid(k);
  const s = statusInfo(k.status);
  const plaats = k.bezoek_plaats || k.post_plaats;
  const basis = `/admin/klanten/${k.id}`;
  // Waarneming (0060): is de casemanager van deze klant er nu niet, dan staat erbij wie waarneemt. Vóór de migratie: niets.
  const dekking = await haalDekking(sb, vandaag);
  const waarnemingPil = dekking ? dekkingPil(wieNeemtWaar(alsWnKlant(k), dekking.waarnemingen, vandaag, dekking.collegas), vandaag) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/klanten" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle klanten
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-[26px] font-bold leading-tight text-[#312e82]">{k.bedrijf}</h1>
              <StatusPill status={k.status} />
              <Eigenaar naam={k.eigenaar} groot />
              {waarnemingPil && <WaarnemingPil pil={waarnemingPil} />}
            </div>
            <p className="mt-1 text-[14px] text-black/50">
              {s.uitleg}
              {plaats ? ` · ${plaats}` : ""}
              {k.kvk ? ` · KvK ${k.kvk}` : ""}
              {k.startdatum ? ` · klant sinds ${datumLang(k.startdatum)}` : ""}
              {k.herkomst ? ` · via ${herkomstLabel(k.herkomst)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {k.telefoon && <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} className="abtn-ghost !py-1.5 text-[13px]"><LuPhone /> {k.telefoon}</a>}
            {k.email && <a href={`mailto:${k.email}`} className="abtn-ghost !py-1.5 text-[13px]"><LuMail /> Mail</a>}
            {k.website && <a href={k.website} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuGlobe /> Site</a>}
            <Link href={`/admin/klantenbord#klant-${k.id}`} className="abtn-ghost !py-1.5 text-[13px]"><LuLayoutGrid /> Op het bord</Link>
          </div>
        </div>
      </div>

      <Tabs
        label="Stamkaart"
        active={tab}
        tabs={[
          { key: "stamkaart", label: "Stamkaart", href: basis, badge: v.ingevuld < v.totaal && stamkaartAan && voorstel.length ? voorstel.length : undefined },
          { key: "documenten", label: "Documenten", href: `${basis}?tab=documenten`, badge: docs.length || undefined },
          { key: "tarieven", label: "Tariefafspraken", href: `${basis}?tab=tarieven`, badge: offerteAfspraken.length + los.length + tariefrijen.length || undefined },
          { key: "tijdlijn", label: "Tijdlijn", href: `${basis}?tab=tijdlijn` },
        ]}
      />

      {!stamkaartAan && tab !== "tijdlijn" && (
        <MigratieNodig bestand="0048_stamkaart.sql" wat="De stamkaart, de eigen bestanden en de afwijkende tariefafspraken hebben nieuwe velden en tabellen nodig." />
      )}

      {tab === "stamkaart" && <StamkaartTab klant={k} voorstel={voorstel} aan={stamkaartAan} />}
      {tab === "documenten" && <DocumentenTab klantId={k.id} bedrijf={k.bedrijf} docs={docs} bestanden={bestanden} aan={stamkaartAan && !fRes.error} />}
      {tab === "tarieven" && <TarievenTab klantId={k.id} offertes={offerteAfspraken} los={los} tarieven={tariefrijen} vandaag={vandaag} tarievenjaar={tarievenjaar} aan={stamkaartAan && !tRes.error} />}
      {tab === "tijdlijn" && <TijdlijnTab klantId={k.id} regels={regels} vandaag={vandaag} />}
    </div>
  );
}
