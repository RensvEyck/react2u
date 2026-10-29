import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  bewaarAlsSjabloon, dupliceerOfferte, heropenOfferte, markeerVerstuurd, nieuweOfferteLink, saveOfferteNotitie, trekOfferteIn, verwijderOfferte,
} from "@/app/admin/offerteActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteEditor from "@/components/admin/OfferteEditor";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { laadCatalogus, laadSjablonen, inVorm } from "@/lib/offerteBeheer";
import type { Sjabloon } from "@/lib/offerteSjablonen";
import { offerteUrl } from "@/lib/mail";
import {
  apparaatUit, berekenTotalen, datumLang, euro, factuurRegels, herstelKeuze, momentLang, normaliseerRegels, prijsLabel, regelbedrag, weergaveVan,
  WEERGAVE, VORMEN, type Gebeurtenis, type Offerte,
} from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuCopy, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil,
  LuSignature, LuCircleX, LuMousePointerClick, LuStickyNote, LuBookmarkPlus, LuMailCheck, LuFileDown, LuShieldCheck,
} from "react-icons/lu";

/**
 * Eén offerte: versturen of herinneren, wat de klant deed (tijdlijn en zijn
 * tussenstand), en daaronder de editor. Na ondertekening is de offerte vast:
 * dan staat hier wat er getekend is, met de handtekening en het bewijs.
 */

const ICONEN: Record<Gebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, code: LuMailCheck,
  getekend: LuSignature, afgewezen: LuCircleX, ingetrokken: LuBan, heropend: LuRotateCcw,
};

function zin(g: Gebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return d.kopie_van ? `Aangemaakt als kopie van ${d.kopie_van}${door}` : `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${door}`;
    case "bekeken": return "Bekeken door de klant";
    case "code": return `Bevestigingscode gemaild naar ${g.door || "de klant"}`;
    case "getekend": return `Getekend door ${g.door}${d.functie ? ` (${d.functie})` : ""}${d.bevestigd ? ", met de code uit de mail" : ""}`;
    case "afgewezen": return `Niet akkoord${g.door ? ` volgens ${g.door}` : ""}${d.reden ? `: "${d.reden}"` : ""}`;
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
  }
}

export default async function OfferteAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [offerteRes, tijdlijnRes, catalogus] = await Promise.all([
    sb.from("offertes").select("*").eq("id", id).maybeSingle(),
    sb.from("offerte_gebeurtenissen").select("*").eq("offerte_id", id).order("at", { ascending: false }).limit(200),
    laadCatalogus(sb),
  ]);
  const { sjablonen, tabel: sjabloonTabel } = await laadSjablonen(sb, catalogus);
  if (!offerteRes.data) notFound();
  const o = inVorm(offerteRes.data as Offerte);
  const tijdlijn = (tijdlijnRes.data as Gebeurtenis[]) || [];
  const w = weergaveVan(o);
  const s = WEERGAVE[w];
  const link = offerteUrl(o.token);
  const getekend = o.status === "getekend";
  const klantKeuze = o.status === "verstuurd" && o.keuze ? berekenTotalen(o.regels, herstelKeuze(o.regels, o.keuze), o.medewerkers) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/offertes" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle offertes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{o.bedrijf}</h1>
            <span className="apill bg-black/[0.04] font-mono text-black/60">{o.nummer}</span>
            <span className="apill bg-black/[0.04] text-black/60">
              <span className="h-2 w-2 rounded-full" style={{ background: VORMEN[o.vorm].kleur }} aria-hidden="true" /> {VORMEN[o.vorm].kort}
              {o.betreft ? ` · ${o.betreft}` : ""}
            </span>
            <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
            {o.aantal_bekeken > 0 && (
              <span className="apill bg-black/[0.04] text-black/55" title={o.laatst_bekeken_at ? `Laatst ${momentLang(o.laatst_bekeken_at)}` : undefined}>
                <LuEye className="text-[13px]" /> {o.aantal_bekeken}× bekeken
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/offertevoorbeeld/${o.id}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Voorbeeld</Link>
            <form action={dupliceerOfferte.bind(null, o.id)}>
              <button className="abtn-ghost !py-1.5 text-[13px]"><LuCopy /> Dupliceren</button>
            </form>
            {(o.status === "afgewezen" || o.status === "ingetrokken") && (
              <form action={heropenOfferte.bind(null, o.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]"><LuRotateCcw /> Heropenen</button>
              </form>
            )}
            {(o.status === "concept" || o.status === "verstuurd") && (
              <ConfirmButton
                action={trekOfferteIn.bind(null, o.id)}
                message="Offerte intrekken? De klant ziet daarna alleen nog dat hij niet meer geldig is, met jouw contactgegevens."
                className="abtn-ghost !py-1.5 text-[13px]"
              >
                <LuBan /> Intrekken
              </ConfirmButton>
            )}
            {!getekend && (
              <ConfirmButton action={verwijderOfferte.bind(null, o.id)} message={`Offerte ${o.nummer} definitief verwijderen? De link werkt daarna niet meer.`} className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]">
                <LuTrash2 /> Verwijderen
              </ConfirmButton>
            )}
          </div>
        </div>
      </div>

      {getekend ? (
        <Getekend o={o} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
              {o.status === "verstuurd" ? "Herinnering sturen" : o.status === "concept" ? "Versturen" : "Afgerond"}
            </h2>
            {o.status === "concept" || o.status === "verstuurd" ? (
              <div className="mt-3">
                {w === "verlopen" && (
                  <p className="mb-3 rounded-[10px] bg-[#fff4e5] px-3 py-2 text-[13px] text-[#7a4a06]">
                    Deze offerte is verlopen ({datumLang(o.geldig_tot)}). Zet hieronder een nieuwe geldigheidsdatum, sla op en stuur een herinnering.
                  </p>
                )}
                <OfferteVersturen
                  id={o.id}
                  link={link}
                  email={o.email}
                  aanhef={o.contactpersoon}
                  bedrijf={o.bedrijf}
                  verstuurd={o.status === "verstuurd"}
                  afzenderNaam={o.afzender_naam}
                  zelfVersturen={o.status === "concept" ? markeerVerstuurd.bind(null, o.id) : undefined}
                />
                {o.status === "verstuurd" && (
                  <form action={nieuweOfferteLink.bind(null, o.id)} className="mt-3">
                    <button className="text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">
                      <LuLink className="mr-1 inline" /> Link bij de verkeerde terechtgekomen? Maak een nieuwe link
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-[14px] text-black/60">
                {o.status === "afgewezen" && (
                  <>
                    <p>De klant gaf op {momentLang(o.afgewezen_at)} aan niet akkoord te gaan.</p>
                    {o.afgewezen_reden && <blockquote className="rounded-[12px] bg-[#fdecea] px-4 py-3 text-[#8a1c12]">&ldquo;{o.afgewezen_reden}&rdquo;</blockquote>}
                    <p>Pas de offerte aan en zet hem met Heropenen weer open, of maak met Dupliceren een nieuwe versie.</p>
                  </>
                )}
                {o.status === "ingetrokken" && <p>Ingetrokken. De link toont alleen nog dat de offerte niet meer geldt, met de contactgegevens van de afzender.</p>}
              </div>
            )}
          </section>

          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat de klant deed</h2>
            {klantKeuze && (
              <div className="mt-3 rounded-[12px] bg-[#eef0ff] px-4 py-3 text-[13.5px] text-[#312e82]">
                <p className="flex items-center gap-2 font-semibold"><LuMousePointerClick /> Aangeklikt{o.keuze_at ? ` (${momentLang(o.keuze_at)})` : ""}</p>
                <p className="mt-1 text-black/60">{klantKeuze.regels.map((r) => r.regel.naam).join(", ")}</p>
                <p className="mt-1 font-semibold">{euro(klantKeuze.perMaand)} per maand{klantKeuze.eenmalig ? ` + ${euro(klantKeuze.eenmalig)} eenmalig` : ""}</p>
              </div>
            )}
            <Tijdlijn items={tijdlijn} />
          </section>
        </div>
      )}

      {getekend ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Notitie o={o} />
          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Tijdlijn</h2>
            <Tijdlijn items={tijdlijn} />
          </section>
          {sjabloonTabel && <AlsSjabloon o={o} sjablonen={sjablonen} />}
        </div>
      ) : (
        <>
          <OfferteEditor key={o.updated_at} begin={o} catalogus={catalogus} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Notitie o={o} />
            {sjabloonTabel && <AlsSjabloon o={o} sjablonen={sjablonen} />}
          </div>
        </>
      )}
    </div>
  );
}

function Tijdlijn({ items }: { items: Gebeurtenis[] }) {
  if (!items.length) return <p className="mt-3 text-[14px] text-black/45">Nog niets gebeurd.</p>;
  return (
    <ol className="mt-4 space-y-3">
      {items.map((g) => {
        const Icoon = ICONEN[g.soort];
        const kleur = g.soort === "getekend" ? "bg-[#e3f6ed] text-[#0a7a4b]" : g.soort === "afgewezen" ? "bg-[#fdecea] text-[#b42318]" : g.soort === "bekeken" ? "bg-[#e6f2ff] text-[#0b6bcb]" : "bg-black/[0.04] text-black/50";
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

function Notitie({ o }: { o: Offerte }) {
  return (
    <section className="acard p-6">
      <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuStickyNote /> Interne notitie</h2>
      <p className="mt-0.5 text-[13px] text-black/45">Alleen voor collega&apos;s; de klant ziet dit nooit. Blijft bewerkbaar, ook na ondertekening.</p>
      <form action={saveOfferteNotitie.bind(null, o.id)} className="mt-3 space-y-3">
        <textarea className="ainput min-h-[90px]" name="notitie" defaultValue={o.notitie || ""} maxLength={5000} aria-label="Interne notitie" />
        <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
      </form>
    </section>
  );
}

function Getekend({ o }: { o: Offerte }) {
  const inhoud = o.getekend_inhoud!;
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="acard p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Getekend</h2>
          <p className="font-heading text-[26px] font-bold tabular-nums text-[#0a7a4b]">
            {euro(t.perMaand)}<span className="ml-1 text-[14px] font-medium text-black/45">per maand</span>
            {t.eenmalig > 0 && <span className="ml-2 text-[15px] text-[#1c1a4e]">+ {euro(t.eenmalig)} eenmalig</span>}
          </p>
        </div>
        <table className="mt-4 w-full text-[14px]">
          <tbody className="divide-y divide-black/[0.05]">
            {t.regels.map(({ regel, bedrag, periode }) => (
              <tr key={regel.id}>
                <td className="py-2.5 pr-3">
                  <span className="font-semibold text-[#1c1a4e]">{regel.naam}</span>
                  <span className="block text-[12.5px] text-black/45">{prijsLabel(regel)}</span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#1c1a4e]">
                  {bedrag === null ? "op aanvraag" : bedrag === 0 ? "inbegrepen" : `${euro(regelbedrag({ bedrag, periode }).bedrag!)}${periode === "jaar" ? " per maand" : " eenmalig"}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[12.5px] text-black/45">
          {inhoud.medewerkers ? `${inhoud.medewerkers} medewerkers · ` : ""}exclusief btw · tarieven bij gebruik zoals in de offerte
        </p>
        {inhoud.factuur && (
          <div className="mt-5 grid gap-4 rounded-[14px] bg-black/[0.025] p-4 text-[13.5px] sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-black/40">Factuuradres</p>
              <p className="mt-1 text-[#1c1a4e]">{[inhoud.bedrijf, ...factuurRegels(inhoud.factuur)].map((r, i) => <span key={i} className="block">{r}</span>)}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-black/40">Facturen</p>
              <p className="mt-1 text-[#1c1a4e]">
                <span className="block break-all">{inhoud.factuur.email}</span>
                {inhoud.factuur.kvk && <span className="block">KvK {inhoud.factuur.kvk}</span>}
                {inhoud.factuur.inkoopnummer ? <span className="block font-semibold">Inkoopnummer {inhoud.factuur.inkoopnummer}</span> : <span className="block text-black/45">Geen inkoopnummer</span>}
              </p>
            </div>
          </div>
        )}
      </section>
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Ondertekening</h2>
        {o.handtekening && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.handtekening} alt={`Handtekening van ${inhoud.getekend_naam}`} className="mt-3 w-full rounded-[12px] border border-black/[0.07] bg-white" />
        )}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
          <dt className="text-black/45">Naam</dt><dd className="font-semibold text-[#1c1a4e]">{inhoud.getekend_naam}</dd>
          {inhoud.getekend_functie && (<><dt className="text-black/45">Functie</dt><dd className="text-[#1c1a4e]">{inhoud.getekend_functie}</dd></>)}
          <dt className="text-black/45">E-mail</dt>
          <dd className="break-all text-[#1c1a4e]">
            {inhoud.getekend_email}
            {inhoud.bevestiging && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[#e3f6ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0a7a4b]"><LuShieldCheck /> bevestigd met code</span>}
          </dd>
          <dt className="text-black/45">Moment</dt><dd className="text-[#1c1a4e]">{momentLang(inhoud.getekend_at)}</dd>
          {o.getekend_ip && (<><dt className="text-black/45">IP-adres</dt><dd className="font-mono text-[12.5px] text-[#1c1a4e]">{o.getekend_ip}</dd></>)}
          {o.getekend_agent && (<><dt className="text-black/45">Apparaat</dt><dd className="text-[#1c1a4e]" title={o.getekend_agent}>{apparaatUit(o.getekend_agent) || <span className="break-words text-[12px] text-black/55">{o.getekend_agent}</span>}</dd></>)}
        </dl>
        {o.getekend_hash && (
          <p className="mt-4 break-all rounded-[10px] bg-black/[0.03] px-3 py-2 font-mono text-[11.5px] text-black/50" title="SHA-256 van de vastgelegde inhoud">
            {o.getekend_hash}
          </p>
        )}
        <p className="mt-3 text-[12.5px] text-black/45">
          De getekende versie staat vast en kan niet meer worden gewijzigd of verwijderd. De klant kreeg hem als pdf, met het ondertekeningscertificaat, en ziet hem terug via zijn link.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/admin/offertevoorbeeld/${o.id}/pdf?download=1`} className="abtn !py-1.5 text-[13px]"><LuFileDown /> Download pdf</a>
          <Link href={`/admin/offertevoorbeeld/${o.id}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Zoals de klant hem ziet</Link>
        </div>
      </section>
    </div>
  );
}

/**
 * De tekst, onderdelen, voorwaarden en stappen van deze offerte als sjabloon
 * bewaren, zodat de volgende offerte van deze vorm ermee begint. Zo pas je een
 * sjabloon aan: maak een offerte, schaaf hem bij en bewaar hem hier.
 */
function AlsSjabloon({ o, sjablonen }: { o: Offerte; sjablonen: Sjabloon[] }) {
  const zelfdeVorm = sjablonen.filter((s) => s.vorm === o.vorm);
  const standaard = zelfdeVorm.length === 1 ? zelfdeVorm[0].sleutel : "nieuw";
  return (
    <section id="sjabloon" className="acard p-6">
      <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuBookmarkPlus /> Bewaar als sjabloon</h2>
      <p className="mt-0.5 text-[13px] text-black/45">
        Tekst, onderdelen, voorwaarden en stappen van deze offerte worden het beginpunt voor nieuwe offertes. Klantgegevens gaan niet mee;
        gebruik in de tekst {"{contactpersoon}"} en {"{bedrijf}"} in plaats van namen.
      </p>
      <form action={bewaarAlsSjabloon.bind(null, o.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="alabel" htmlFor="sj-keuze">Sjabloon</label>
          <select id="sj-keuze" name="sjabloon" className="ainput" defaultValue={standaard}>
            {sjablonen.map((s) => (
              <option key={s.sleutel} value={s.sleutel}>Overschrijf: {s.naam}{s.vorm !== o.vorm ? ` (${VORMEN[s.vorm].kort})` : ""}</option>
            ))}
            <option value="nieuw">Nieuw sjabloon</option>
          </select>
        </div>
        <div>
          <label className="alabel" htmlFor="sj-naam">Naam (bij een nieuw sjabloon)</label>
          <input id="sj-naam" name="naam" className="ainput" maxLength={120} placeholder={`Bijv. ${VORMEN[o.vorm].kort} voor de bouw`} />
        </div>
        <div>
          <label className="alabel" htmlFor="sj-geldig">Standaard geldig (dagen)</label>
          <input id="sj-geldig" name="geldig_dagen" className="ainput" inputMode="numeric" placeholder="Zoals nu" />
        </div>
        <div className="sm:col-span-2">
          <button className="abtn-ghost !py-1.5 text-[13px]"><LuBookmarkPlus /> Bewaren als sjabloon</button>
        </div>
      </form>
    </section>
  );
}
