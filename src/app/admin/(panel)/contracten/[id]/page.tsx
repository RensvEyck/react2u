import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  heropenContract, markeerContractVerstuurd, nieuweContractLink, saveContractNotitie, trekContractIn, verstuurContract, verwijderContract,
} from "@/app/admin/contractActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ContractForm from "@/components/admin/ContractForm";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { offerteKeuzes, partnerKeuzes } from "@/lib/contractBeheer";
import { contractUrl } from "@/lib/mail";
import {
  CONTRACT_SOORT, CONTRACT_WEERGAVE, contractWeergave, looptijdNu, looptijdTekst, soortVan, versieTekst, type Contract, type ContractGebeurtenis,
} from "@/lib/contracten";
import { resellerVergoeding, wijktAf } from "@/lib/contractTekst";
import { apparaatUit, datumLang, datumOver, momentLang } from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil, LuSignature, LuMailCheck,
  LuStickyNote, LuFileDown, LuShieldCheck, LuTriangleAlert, LuFilePenLine, LuCalendarClock, LuHandshake,
} from "react-icons/lu";

/**
 * Eén contract (een basiscontract of een resellerovereenkomst): versturen of
 * herinneren, wat de klant of partner deed, en daaronder het formulier. Na
 * ondertekening staat het vast: dan staat hier wat er getekend is, met de
 * handtekening, het bewijs en tot wanneer het loopt.
 */

const ICONEN: Record<ContractGebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, code: LuMailCheck,
  getekend: LuSignature, ingetrokken: LuBan, heropend: LuRotateCcw,
};

function zin(g: ContractGebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return d.offerte ? `Aangemaakt bij ${d.offerte}${door}` : d.partner ? `Aangemaakt voor partner ${d.partner}${door}` : `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${door}`;
    case "bekeken": return "Bekeken";
    case "code": return `Bevestigingscode gemaild naar ${g.door || "de ondertekenaar"}`;
    case "getekend": return `Getekend door ${g.door}${d.functie ? ` (${d.functie})` : ""}${d.bevestigd ? ", met de code uit de mail" : ""}`;
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
  }
}

export default async function ContractAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [contractRes, tijdlijnRes, offertes, partners] = await Promise.all([
    sb.from("contracten").select("*").eq("id", id).maybeSingle(),
    sb.from("contract_gebeurtenissen").select("*").eq("contract_id", id).order("at", { ascending: false }).limit(200),
    offerteKeuzes(sb),
    partnerKeuzes(sb),
  ]);
  if (!contractRes.data) notFound();
  const c = contractRes.data as Contract;
  const soort = soortVan(c);
  const reseller = soort === "reseller";
  const partner = c.partner_id ? partners.find((p) => p.id === c.partner_id) : null;
  const tijdlijn = (tijdlijnRes.data as ContractGebeurtenis[]) || [];
  const w = contractWeergave(c);
  const s = CONTRACT_WEERGAVE[w];
  const link = contractUrl(c.token);
  const getekend = c.status === "getekend";
  const open = c.status === "concept" || c.status === "verstuurd";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/contracten" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle contracten
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{c.bedrijf}</h1>
            <span className="apill bg-black/[0.04] font-mono text-black/60">{c.nummer}</span>
            {reseller && <span className="apill bg-[#eef0ff] text-[#312e82]"><LuHandshake className="text-[13px]" /> {CONTRACT_SOORT.reseller.naam}</span>}
            <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
            {c.aantal_bekeken > 0 && (
              <span className="apill bg-black/[0.04] text-black/55" title={c.laatst_bekeken_at ? `Laatst ${momentLang(c.laatst_bekeken_at)}` : undefined}>
                <LuEye className="text-[13px]" /> {c.aantal_bekeken}× bekeken
              </span>
            )}
            {!getekend && wijktAf(c.tekst, soort) && <span className="apill bg-[#fff4e5] text-[#7a4a06]"><LuTriangleAlert className="text-[13px]" /> Aangepaste tekst</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/contractvoorbeeld/${c.id}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Voorbeeld</Link>
            {!getekend && (
              <a href={`/admin/contractvoorbeeld/${c.id}/concept?download=1`} className="abtn-ghost !py-1.5 text-[13px]" title="Het contract als pdf met het stempel CONCEPT, om mee te sturen of te printen">
                <LuFileDown /> Concept-pdf
              </a>
            )}
            {c.offerte_id && (
              <Link href={`/admin/offertes/${c.offerte_id}`} className="abtn-ghost !py-1.5 text-[13px]"><LuFilePenLine /> Offerte</Link>
            )}
            {partner && (
              <Link href={`/admin/partners/${partner.id}`} className="abtn-ghost !py-1.5 text-[13px]"><LuHandshake /> {partner.kantoor}</Link>
            )}
            {c.status === "ingetrokken" && (
              <form action={heropenContract.bind(null, c.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]"><LuRotateCcw /> Heropenen</button>
              </form>
            )}
            {open && (
              <ConfirmButton
                action={trekContractIn.bind(null, c.id)}
                message={`Contract intrekken? De ${CONTRACT_SOORT[soort].wederpartij} ziet daarna alleen nog dat het niet meer geldt, met jouw contactgegevens.`}
                className="abtn-ghost !py-1.5 text-[13px]"
              >
                <LuBan /> Intrekken
              </ConfirmButton>
            )}
            {!getekend && (
              <ConfirmButton action={verwijderContract.bind(null, c.id)} message={`Contract ${c.nummer} definitief verwijderen? De link werkt daarna niet meer.`} className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]">
                <LuTrash2 /> Verwijderen
              </ConfirmButton>
            )}
          </div>
        </div>
      </div>

      {getekend ? (
        <Getekend c={c} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
              {c.status === "verstuurd" ? "Herinnering sturen" : c.status === "concept" ? "Versturen" : "Ingetrokken"}
            </h2>
            {open ? (
              <div className="mt-3">
                <OfferteVersturen
                  id={c.id}
                  link={link}
                  email={c.email}
                  aanhef={c.contactpersoon}
                  bedrijf={c.bedrijf}
                  verstuurd={c.status === "verstuurd"}
                  afzenderNaam={c.afzender_naam}
                  zelfVersturen={c.status === "concept" ? markeerContractVerstuurd.bind(null, c.id) : undefined}
                  actie={verstuurContract.bind(null, c.id)}
                  woord={reseller ? "overeenkomst" : "contract"}
                />
                {c.status === "verstuurd" && (
                  <form action={nieuweContractLink.bind(null, c.id)} className="mt-3">
                    <button className="text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">
                      <LuLink className="mr-1 inline" /> Link bij de verkeerde terechtgekomen? Maak een nieuwe link
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[14px] text-black/55">De link toont alleen nog je contactgegevens. Heropen het contract om het weer te gebruiken.</p>
            )}
          </section>

          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat de {CONTRACT_SOORT[soort].wederpartij} deed</h2>
            <Tijdlijn items={tijdlijn} />
          </section>
        </div>
      )}

      {getekend ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Notitie c={c} />
          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Tijdlijn</h2>
            <Tijdlijn items={tijdlijn} />
          </section>
        </div>
      ) : (
        <>
          <ContractForm key={c.updated_at} begin={c} nieuw={false} offertes={offertes} partners={partners} />
          <Notitie c={c} />
        </>
      )}
    </div>
  );
}

function Tijdlijn({ items }: { items: ContractGebeurtenis[] }) {
  if (!items.length) return <p className="mt-3 text-[14px] text-black/45">Nog niets gebeurd.</p>;
  return (
    <ol className="mt-4 space-y-3">
      {items.map((g) => {
        const Icoon = ICONEN[g.soort] || LuPencil;
        const kleur = g.soort === "getekend" ? "bg-[#e3f6ed] text-[#0a7a4b]" : g.soort === "bekeken" ? "bg-[#e6f2ff] text-[#0b6bcb]" : "bg-black/[0.04] text-black/50";
        return (
          <li key={g.id} className="flex items-start gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] ${kleur}`}><Icoon /></span>
            <span className="min-w-0 text-[13.5px]">
              <span className="block text-[#1c1a4e]">{zin(g)}</span>
              <span className="block text-[12px] text-black/40">{momentLang(g.at)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Notitie({ c }: { c: Contract }) {
  return (
    <section className="acard p-6">
      <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuStickyNote /> Interne notitie</h2>
      <p className="mt-0.5 text-[13px] text-black/45">Alleen voor collega&apos;s; de klant ziet dit nooit. Blijft bewerkbaar, ook na ondertekening.</p>
      <form action={saveContractNotitie.bind(null, c.id)} className="mt-3 space-y-3">
        <textarea className="ainput min-h-[90px]" name="notitie" defaultValue={c.notitie || ""} maxLength={5000} aria-label="Interne notitie" />
        <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
      </form>
    </section>
  );
}

function Getekend({ c }: { c: Contract }) {
  const inhoud = c.getekend_inhoud!;
  const og = inhoud.opdrachtgever || {};
  const soort = soortVan(inhoud);
  const n = soort === "basiscontract" && inhoud.einddatum ? looptijdNu(inhoud.ingangsdatum, inhoud.einddatum, datumOver(0)) : null;
  const pct = soort === "reseller" ? resellerVergoeding(inhoud.tekst) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="acard p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Getekend</h2>
          <p className="text-[13.5px] text-black/50">Tekst {versieTekst(inhoud.tekst_versie, soort)}{inhoud.aanvullend ? ", met aanvullende afspraken" : ""}</p>
        </div>
        <div className="mt-4 grid gap-4 rounded-[14px] bg-black/[0.025] p-4 text-[13.5px] sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-black/40">{CONTRACT_SOORT[soort].rollen[1]}</p>
            <p className="mt-1 text-[#1c1a4e]">
              <span className="block font-semibold">{og.naam || inhoud.bedrijf}</span>
              {og.adres && <span className="block">{og.adres}</span>}
              {(og.postcode || og.plaats) && <span className="block">{[og.postcode, og.plaats].filter(Boolean).join(" ")}</span>}
              {og.kvk && <span className="block">KvK {og.kvk}</span>}
              {og.email && <span className="block break-all">{og.email}</span>}
              {og.telefoon && <span className="block">{og.telefoon}</span>}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-black/40">{soort === "reseller" ? "Vergoeding en looptijd" : "Looptijd"}</p>
            {soort === "reseller" ? (
              <p className="mt-1 text-[#1c1a4e]">
                {pct && <span className="block">{pct.jaarEen}% van het aansluittarief in het eerste contractjaar, {pct.vervolg}% daarna</span>}
                <span className="block">Sinds {datumLang(inhoud.ingangsdatum)}, voor onbepaalde tijd</span>
              </p>
            ) : (
              <p className="mt-1 text-[#1c1a4e]">
                <span className="block">{datumLang(inhoud.ingangsdatum)} tot en met {datumLang(inhoud.einddatum)} ({looptijdTekst(inhoud.ingangsdatum, inhoud.einddatum || "")})</span>
                <span className="block">Daarna telkens 12 maanden verlengd</span>
                {inhoud.offerte_kenmerk && <span className="block text-black/55">Bij {inhoud.offerte_kenmerk}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-[14px] bg-[#eef0ff] p-4 text-[13.5px] text-[#312e82]">
          <LuCalendarClock className="mt-0.5 shrink-0 text-[18px]" />
          {n ? (
            <p>
              <span className="block font-semibold">{n.verlengd ? `Verlengd tot ${datumLang(n.periodeEinde)}` : n.begonnen ? `Loopt tot ${datumLang(n.periodeEinde)}` : `Gaat in op ${datumLang(inhoud.ingangsdatum)}`}</span>
              <span className="block text-black/60">Opzeggen kan uiterlijk {datumLang(n.opzeggenUiterlijk)}, per aangetekende brief; anders loopt het 12 maanden door.</span>
            </p>
          ) : (
            <p>
              <span className="block font-semibold">Loopt sinds {datumLang(inhoud.ingangsdatum)}, voor onbepaalde tijd</span>
              <span className="block text-black/60">Opzeggen kan altijd, per e-mail, met een opzegtermijn van één maand (artikel 8.2). De vergoeding over al aangebrachte klanten loopt daarna door (artikel 8.3).</span>
            </p>
          )}
        </div>
      </section>
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Ondertekening</h2>
        {c.handtekening && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.handtekening} alt={`Handtekening van ${inhoud.getekend_naam}`} className="mt-3 w-full rounded-[12px] border border-black/[0.07] bg-white" />
        )}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
          <dt className="text-black/45">Naam</dt><dd className="font-semibold text-[#1c1a4e]">{inhoud.getekend_naam}</dd>
          <dt className="text-black/45">Functie</dt><dd className="text-[#1c1a4e]">{inhoud.getekend_functie}</dd>
          <dt className="text-black/45">E-mail</dt>
          <dd className="break-all text-[#1c1a4e]">
            {inhoud.getekend_email}
            {inhoud.bevestiging && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[#e3f6ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0a7a4b]"><LuShieldCheck /> bevestigd met code</span>}
          </dd>
          <dt className="text-black/45">Moment</dt><dd className="text-[#1c1a4e]">{momentLang(inhoud.getekend_at)}, te {inhoud.getekend_plaats}</dd>
          {c.getekend_ip && (<><dt className="text-black/45">IP-adres</dt><dd className="font-mono text-[12.5px] text-[#1c1a4e]">{c.getekend_ip}</dd></>)}
          {c.getekend_agent && (<><dt className="text-black/45">Apparaat</dt><dd className="text-[#1c1a4e]" title={c.getekend_agent}>{apparaatUit(c.getekend_agent) || <span className="break-words text-[12px] text-black/55">{c.getekend_agent}</span>}</dd></>)}
        </dl>
        {c.getekend_hash && (
          <p className="mt-4 break-all rounded-[10px] bg-black/[0.03] px-3 py-2 font-mono text-[11.5px] text-black/50" title="SHA-256 van de vastgelegde inhoud">{c.getekend_hash}</p>
        )}
        <p className="mt-3 text-[12.5px] text-black/45">
          De getekende versie staat vast en kan niet meer worden gewijzigd of verwijderd. De {CONTRACT_SOORT[soort].wederpartij} kreeg hem als pdf, met het ondertekeningscertificaat, en ziet hem terug via zijn link.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/admin/contractvoorbeeld/${c.id}/pdf?download=1`} className="abtn !py-1.5 text-[13px]"><LuFileDown /> Download pdf</a>
          <Link href={`/admin/contractvoorbeeld/${c.id}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Zoals de klant het ziet</Link>
        </div>
      </section>
    </div>
  );
}
