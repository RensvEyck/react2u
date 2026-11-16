import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  heropenOnboarding, markeerOnboardingVerstuurd, nieuweOnboardingLink, saveOnboardingIntern, saveOnboardingNotitie, saveVorigeArbodienst, trekOnboardingIn,
  verstuurOnboarding, verwijderOnboarding, wisselTaak, wisWerknemers, zetOnboardingOpen,
} from "@/app/admin/onboardingActions";
import OnboardingForm from "@/components/admin/OnboardingForm";
import OnboardingTabs from "@/components/admin/OnboardingTabs";
import MachtigingBeheer from "@/components/admin/MachtigingBeheer";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { onboardingUrl } from "@/lib/mail";
import {
  datumNl, documentInfo, documentKlaar, gekozen, INRICHTING, isDocument, isTaak, MACHTIGING, ONBOARDING_WEERGAVE, onboardingWeergave, taakInfo, taakKan,
  taakKlaar, takenVoor, takenVoortgang, voortgang, vultIn, WERKNEMER_KOLOMMEN, type DocumentSleutel, type Machtiging, type Onboarding, type OnboardingGebeurtenis,
  type VeldGroep, type Werknemer,
} from "@/lib/onboarding";
import { momentLang } from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil, LuStickyNote, LuFileDown, LuCircleCheck,
  LuCircle, LuPencilLine, LuBookOpenCheck, LuFlag, LuEraser, LuFileSpreadsheet, LuBuilding2, LuSquareCheckBig, LuPartyPopper, LuClock, LuSignature,
  LuForward, LuRocket,
} from "react-icons/lu";

/**
 * Eén onboarding: het hele traject op één scherm. Links wat de klant doet
 * (versturen of herinneren, de voortgang per document), rechts wat React2u
 * zelf regelt (de checklist tot de klant live is), daaronder wat de klant
 * invulde (met het werknemersbestand als Excel voor XpertSuite), de tijdlijn
 * en de gegevens om aan te passen.
 */

const ICONEN: Record<OnboardingGebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, ingevuld: LuPencilLine,
  gelezen: LuBookOpenCheck, afgerond: LuFlag, ingetrokken: LuBan, heropend: LuRotateCcw, gewist: LuEraser, taak: LuSquareCheckBig,
  machtiging: LuSignature, doorgestuurd: LuForward, live: LuRocket,
};

const docNaam = (d: unknown) => (isDocument(d) ? documentInfo(d).titel : "een document");
const taakNaam = (t: unknown) => (isTaak(t) ? taakInfo(t).titel : "een taak");

function zin(g: OnboardingGebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${d.automatisch ? " (automatisch)" : door}`;
    case "bekeken": return "Bekeken door de klant";
    case "ingevuld": return `${docNaam(d.document)} ${d.opnieuw ? "aangepast" : "ingevuld"} door de klant`;
    case "gelezen": return `${docNaam(d.document)} afgevinkt door de klant`;
    case "afgerond": return "De klant is klaar: alles ingevuld of afgevinkt";
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
    case "gewist": return `Werknemersbestand gewist${door}${d.aantal ? ` (${d.aantal} medewerkers)` : ""}`;
    case "taak": return `${taakNaam(d.taak)}: ${d.klaar ? "afgevinkt" : "weer opengezet"}${door}`;
    case "machtiging":
      switch (d.actie) {
        case "uitgenodigd": return `${d.naam} (${d.email}) uitgenodigd om de machtiging online te tekenen`;
        case "opnieuw": return `Herinnering voor de machtiging naar ${d.naam}`;
        case "verwijderd": return `Uitnodiging voor de machtiging van ${d.naam} weggehaald`;
        case "bekeken": return `${d.naam} opende de machtiging`;
        case "getekend": return `${d.naam} tekende de machtiging online`;
        case "overdracht": return `Opdracht tot overdracht met ${d.aantal} ${d.aantal === 1 ? "machtiging" : "machtigingen"} naar ${d.email}, namens de werkgever`;
        default: return "Machtiging";
      }
    case "doorgestuurd": return `${docNaam(d.stap)} doorgestuurd naar ${d.naam} (${d.email})${door}`;
    case "live": return `Mail "jullie zijn live" naar ${d.aan}${door}`;
    default: return g.soort;
  }
}

const maskeer = (bsn?: string) => (bsn ? `•••••${bsn.slice(-4)}` : "");

function Velden({ groepen, data }: { groepen: VeldGroep[]; data: Record<string, string> }) {
  return (
    <div className="space-y-5">
      {groepen.map((g) => (
        <div key={g.titel}>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{g.titel}</p>
          <dl className="mt-2 divide-y divide-black/[0.05]">
            {g.velden.map((v) => (
              <div key={v.naam} className="grid grid-cols-[180px_1fr] gap-4 py-2 text-[14px]">
                <dt className="text-black/50">{v.label}</dt>
                <dd className="whitespace-pre-line break-words text-[#1c1a4e]">{data[v.naam] || <span className="text-black/30">Leeg</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function Balk({ klaar, totaal, kleur = "#0a7a4b" }: { klaar: number; totaal: number; kleur?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
      <div className="h-full rounded-full transition-all" style={{ width: `${totaal ? (klaar / totaal) * 100 : 0}%`, background: kleur }} />
    </div>
  );
}

export default async function OnboardingAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  // De splitsing (Rens, 16 nov 2026): "klant" is de onboarding van de klant zelf, "werknemers" zijn de mensen van de klant
  // (het werknemersbestand voor XpertSuite en de machtigingen die zij tekenen).
  const tab = (await searchParams).tab === "werknemer" ? "werknemer" : "werkgever";
  const { sb } = await requirePerm("bellijst");
  const [res, tijdlijnRes, machtigingenRes] = await Promise.all([
    sb.from("onboardings").select("*").eq("id", id).maybeSingle(),
    sb.from("onboarding_gebeurtenissen").select("*").eq("onboarding_id", id).order("at", { ascending: false }).limit(200),
    sb.from("onboarding_machtigingen").select("id, naam, email, status, uitgenodigd_at, herinnerd_at, bekeken_at, getekend_at, overdracht_at, aantal_bekeken, getekend_ip").eq("onboarding_id", id).order("created_at"),
  ]);
  if (!res.data) notFound();
  const o = res.data as Onboarding;
  const tijdlijn = (tijdlijnRes.data as OnboardingGebeurtenis[]) || [];
  // Vóór migratie 0038 bestaat de tabel niet; dan gewoon geen lijst.
  const machtigingen = (machtigingenRes.data as Pick<Machtiging, "id" | "naam" | "email" | "status" | "uitgenodigd_at" | "herinnerd_at" | "bekeken_at" | "getekend_at" | "overdracht_at" | "aantal_bekeken" | "getekend_ip">[] | null) || [];
  const w = onboardingWeergave(o);
  const s = ONBOARDING_WEERGAVE[w];
  const link = onboardingUrl(o.token);
  const basis = `/admin/onboardingvoorbeeld/${o.id}`;
  const open = o.status !== "ingetrokken";
  const v = voortgang(o);
  const t = takenVoortgang(o);
  const docs = gekozen(o);
  const taken = takenVoor(o);
  const inrichting = o.antwoorden.inrichting?.data as Record<string, string> | undefined;
  const werknemers = ((o.antwoorden.werknemers?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || [];
  const ingevuld = Object.keys(o.antwoorden).filter(isDocument) as DocumentSleutel[];
  const laatsteTaak = Object.values(o.taken || {}).map((x) => x.at).sort().pop();
  const getekend = machtigingen.filter((m) => m.status === "getekend").length;
  const basisLink = `/admin/onboarding/${o.id}`;
  const telling = machtigingen.length ? `${getekend}/${machtigingen.length} getekend` : "";
  // De vorige arbodienst vult React2u in (0039); een onboarding van vóór die migratie heeft hem nog van de klant.
  const arbodienst = o.vorige_arbodienst ?? (o.antwoorden.machtiging?.data as Record<string, string> | undefined) ?? null;
  const kandidaten = werknemers
    .map((r) => ({ naam: [r.roepnaam || r.voorletters, r.tussenvoegsels, r.achternaam].filter(Boolean).join(" "), email: r.email_werk || r.email_thuis || "" }))
    .filter((k) => k.email && k.naam);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/onboarding" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle onboardings
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{o.bedrijf}</h1>
            <span className="apill bg-black/[0.04] font-mono text-black/60">{o.nummer}</span>
            <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
            {o.aantal_bekeken > 0 && (
              <span className="apill bg-black/[0.04] text-black/55" title={o.laatst_bekeken_at ? `Laatst ${momentLang(o.laatst_bekeken_at)}` : undefined}>
                <LuEye className="text-[13px]" /> {o.aantal_bekeken}× bekeken
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={basis} target="_blank" className="abtn-ghost !py-1.5 text-[13px]" title="Zo ziet de klant de onboarding, ook als concept"><LuEye /> Voorbeeld</Link>
            {o.status === "afgerond" && (
              <form action={zetOnboardingOpen.bind(null, o.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]" title="Bijvoorbeeld als je er een document bij zet"><LuRotateCcw /> Weer openzetten</button>
              </form>
            )}
            {o.status === "ingetrokken" && (
              <form action={heropenOnboarding.bind(null, o.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]"><LuRotateCcw /> Heropenen</button>
              </form>
            )}
            {open && (
              <ConfirmButton
                action={trekOnboardingIn.bind(null, o.id)}
                message="Onboarding intrekken? De klant ziet daarna alleen nog dat hij niet meer beschikbaar is, met jouw contactgegevens."
                className="abtn-ghost !py-1.5 text-[13px]"
              >
                <LuBan /> Intrekken
              </ConfirmButton>
            )}
            <ConfirmButton action={verwijderOnboarding.bind(null, o.id)} message={`Onboarding ${o.nummer} definitief verwijderen, met alles wat de klant invulde? De link werkt daarna niet meer.`} className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]">
              <LuTrash2 /> Verwijderen
            </ConfirmButton>
          </div>
        </div>
      </div>

      {w === "ingericht" && (
        <div className="flex items-center gap-4 rounded-[16px] bg-[#e3f6ed] px-5 py-4 text-[#0a7a4b]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[20px]"><LuPartyPopper /></span>
          <p className="text-[14.5px]">
            <span className="font-bold">{o.bedrijf} is live.</span> De klant leverde alles aan{o.afgerond_at ? ` (${momentLang(o.afgerond_at)})` : ""} en alle taken van React2u zijn af
            {laatsteTaak ? ` (${momentLang(laatsteTaak)})` : ""}.
          </p>
        </div>
      )}
      {w === "afgerond" && (
        <div className="flex items-center gap-4 rounded-[16px] bg-[#fff4e5] px-5 py-4 text-[#7a4a06]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[20px] text-[#b86e00]"><LuClock /></span>
          <p className="text-[14.5px]">
            <span className="font-bold">De klant is klaar{o.afgerond_at ? ` sinds ${momentLang(o.afgerond_at)}` : ""}.</span> Nu is React2u aan zet: nog {t.totaal - t.klaar} van {t.totaal} taken
            om {o.bedrijf} in te richten.{" "}
            <a href="#inrichten" className="font-bold underline underline-offset-2">Naar de checklist</a>
          </p>
        </div>
      )}

      <OnboardingTabs actief={tab} werkgever={basisLink} werknemer={`${basisLink}?tab=werknemer`} telling={telling || undefined} />

      {tab === "werkgever" && (<>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard p-6">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
            {o.status === "concept" ? "Versturen" : o.status === "ingetrokken" ? "Ingetrokken" : "Herinnering sturen"}
          </h2>
          {open ? (
            <div className="mt-3">
              <OfferteVersturen
                id={o.id}
                link={link}
                email={o.email}
                aanhef={o.contactpersoon}
                bedrijf={o.bedrijf}
                verstuurd={o.status !== "concept"}
                afzenderNaam={o.afzender_naam}
                zelfVersturen={o.status === "concept" ? markeerOnboardingVerstuurd.bind(null, o.id) : undefined}
                actie={verstuurOnboarding.bind(null, o.id)}
                woord="onboarding"
              />
              {o.status !== "concept" && (
                <form action={nieuweOnboardingLink.bind(null, o.id)} className="mt-3">
                  <button className="text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">
                    <LuLink className="mr-1 inline" /> Link bij de verkeerde terechtgekomen? Maak een nieuwe link
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-black/55">De link toont alleen nog je contactgegevens. Heropen de onboarding om hem weer te gebruiken.</p>
          )}
        </section>

        <section className="acard p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat de klant doet</h2>
            <span className="text-[13px] font-semibold text-black/55">{v.klaar} van {v.totaal} klaar</span>
          </div>
          <div className="mt-3"><Balk klaar={v.klaar} totaal={v.totaal} /></div>
          <ul className="mt-4 divide-y divide-black/[0.05]">
            {docs.map((d) => {
              const klaar = documentKlaar(o, d.sleutel);
              const invul = vultIn(o, d.sleutel);
              const wanneer = invul ? o.antwoorden[d.sleutel]?.at : o.gelezen[d.sleutel];
              return (
                <li key={d.sleutel} className="flex items-center gap-3 py-2.5">
                  {klaar ? <LuCircleCheck className="shrink-0 text-[18px] text-[#0a7a4b]" /> : <LuCircle className="shrink-0 text-[18px] text-black/20" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#1c1a4e]">{d.titel}</span>
                    <span className="block text-[12.5px] text-black/45">
                      {invul ? "Online invullen" : d.invullen ? (d.excel ? "Excel meegestuurd" : "Pdf meegestuurd") : "Lezen"}
                      {wanneer ? ` · ${invul ? "ingevuld" : "afgevinkt"} ${momentLang(wanneer)}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Link href={`${basis}/${d.sleutel}`} target="_blank" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline"><LuEye /> Bekijk</Link>
                    {d.sleutel === "werknemers" && !invul ? (
                      <a href={`${basis}/excel`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline"><LuFileSpreadsheet /> Excel</a>
                    ) : d.sleutel === "werknemers" ? null : (
                      <a href={`${basis}/pdf/${d.sleutel}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline"><LuFileDown /> Pdf</a>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {o.status !== "concept" && (
        <section id="inrichten" className="acard scroll-mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuSquareCheckBig /> Inrichten bij React2u</h2>
              <p className="mt-1 text-[13.5px] text-black/50">Wat wij regelen voordat {o.bedrijf} live is. Vink af wat gedaan is; de klant ziet dit niet.</p>
            </div>
            <span className="text-[13px] font-semibold text-black/55">{t.klaar} van {t.totaal} gedaan</span>
          </div>
          <div className="mt-3"><Balk klaar={t.klaar} totaal={t.totaal} kleur="#312e82" /></div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {taken.map((taak) => {
              const klaar = taakKlaar(o, taak.sleutel);
              const kan = taakKan(o, taak);
              const gedaan = o.taken?.[taak.sleutel];
              return (
                <li key={taak.sleutel} className={`rounded-[14px] border p-4 transition-colors ${klaar ? "border-[#0a7a4b]/25 bg-[#f3fbf7]" : kan ? "border-black/[0.07] bg-white" : "border-black/[0.06] bg-black/[0.015]"}`}>
                  <form action={wisselTaak.bind(null, o.id, taak.sleutel)} className="flex items-start gap-3">
                    <button
                      type="submit"
                      role="checkbox"
                      aria-checked={klaar}
                      aria-label={`${taak.titel}${klaar ? ": afgevinkt, weer openzetten" : ": afvinken"}`}
                      disabled={!open}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 text-[14px] text-white transition-colors disabled:opacity-50 ${klaar ? "border-[#0a7a4b] bg-[#0a7a4b]" : "border-black/20 bg-white hover:border-[#312e82]"}`}
                    >
                      {klaar && <LuCircleCheck className="text-[15px]" />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[14.5px] font-semibold ${klaar ? "text-[#0a7a4b]" : "text-[#1c1a4e]"}`}>{taak.titel}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-black/50">
                        {gedaan
                          ? `Gedaan ${momentLang(gedaan.at)}${gedaan.door ? ` door ${gedaan.door}` : ""}`
                          : kan
                            ? taak.kort
                            : `${taak.kort} Kan zodra de klant ${documentInfo(taak.na!).titel.toLowerCase()} heeft ${vultIn(o, taak.na!) ? "ingevuld" : "afgevinkt"}.`}
                      </span>
                    </span>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {docs.some((d) => d.sleutel === "inrichting") && (
        <section className="acard p-6">
          <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuBuilding2 /> Inrichting nieuwe klant</h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {inrichting ? (
              <div>
                <p className="mb-4 text-[13px] text-black/50">
                  Ingevuld {momentLang(o.antwoorden.inrichting!.at)}{o.antwoorden.inrichting!.door ? ` door ${o.antwoorden.inrichting!.door}` : ""}.{" "}
                  <a href={`${basis}/pdf/inrichting`} target="_blank" rel="noopener" className="font-semibold text-[#312e82] hover:underline">Als pdf</a>
                </p>
                <Velden groepen={INRICHTING} data={inrichting} />
              </div>
            ) : (
              <p className="text-[14px] text-black/50">
                {vultIn(o, "inrichting") ? "Nog niet ingevuld door de klant." : "Meegestuurd als pdf: de klant mailt het formulier terug."}
              </p>
            )}
            <form action={saveOnboardingIntern.bind(null, o.id)} className="space-y-3 rounded-[14px] bg-[#f6f5fb] p-5">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">In te vullen door React2u</p>
              <div>
                <label className="alabel" htmlFor="ob-cs">Contractsoort</label>
                <input id="ob-cs" className="ainput" name="contractsoort" defaultValue={o.contractsoort || ""} maxLength={200} placeholder="Bijvoorbeeld abonnement Recover" />
              </div>
              <div>
                <label className="alabel" htmlFor="ob-deb">Debiteurnummer</label>
                <input id="ob-deb" className="ainput" name="debiteurnummer" defaultValue={o.debiteurnummer || ""} maxLength={60} />
                <p className="mt-1 text-[12px] text-black/45">Gaat als code werkgever mee in het Excelbestand voor XpertSuite.</p>
              </div>
              <div>
                <label className="alabel" htmlFor="ob-cm">Vaste casemanager</label>
                <input id="ob-cm" className="ainput" name="casemanager" defaultValue={o.casemanager || ""} maxLength={200} placeholder="Voor- en achternaam" />
                <p className="mt-1 text-[12px] text-black/45">Staat op de klantpagina en in de mail &quot;jullie zijn live&quot;.</p>
              </div>
              <button className="abtn-ghost !py-1.5 text-[13px]">Opslaan</button>
            </form>
          </div>
        </section>
      )}

      {docs.some((d) => d.sleutel === "werknemers") && (
        <section className="acard p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuFileSpreadsheet /> Werknemersbestand</h2>
            {werknemers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <a href={`/admin/onboarding/${o.id}/werknemers`} className="abtn !py-1.5 text-[13px]"><LuFileSpreadsheet /> Download voor XpertSuite</a>
                <ConfirmButton
                  action={wisWerknemers.bind(null, o.id)}
                  message="Werknemersbestand wissen? Doe dit pas als het in XpertSuite staat: de burgerservicenummers zijn daarna hier weg."
                  className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]"
                >
                  <LuEraser /> Wissen na import
                </ConfirmButton>
              </div>
            )}
          </div>
          {werknemers.length ? (
            <>
              <p className="mt-1 text-[13px] text-black/50">
                {werknemers.length} {werknemers.length === 1 ? "medewerker" : "medewerkers"}, ingevuld {momentLang(o.antwoorden.werknemers!.at)}. Het Excelbestand heeft de 37 kolommen van het importbestand van XpertSuite
                {o.debiteurnummer ? `, met ${o.debiteurnummer} als code werkgever` : "; vul hierboven het debiteurnummer in, dan gaat dat mee als code werkgever"}.
              </p>
              <div className="mt-4 overflow-x-auto rounded-[12px] border border-black/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-black/[0.02] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-black/45">
                      <th className="px-3 py-2">Naam</th><th className="px-3 py-2">Geboren</th><th className="px-3 py-2">BSN</th>
                      <th className="px-3 py-2">Woonplaats</th><th className="px-3 py-2">Functie</th><th className="px-3 py-2">In dienst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {werknemers.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-black/[0.05]">
                        <td className="px-3 py-2 font-semibold text-[#1c1a4e]">{[r.roepnaam, r.tussenvoegsels, r.achternaam].filter(Boolean).join(" ")}</td>
                        <td className="px-3 py-2 text-black/60">{datumNl(r.geboortedatum)}</td>
                        <td className="px-3 py-2 font-mono text-black/60">{maskeer(r.bsn)}</td>
                        <td className="px-3 py-2 text-black/60">{r.plaats}</td>
                        <td className="px-3 py-2 text-black/60">{r.functie}</td>
                        <td className="px-3 py-2 text-black/60">{datumNl(r.startdatum)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {werknemers.length > 50 && <p className="mt-2 text-[12.5px] text-black/45">En nog {werknemers.length - 50}; alles staat in het Excelbestand.</p>}
            </>
          ) : (
            <p className="mt-3 text-[14px] text-black/50">
              {vultIn(o, "werknemers")
                ? `Nog niet ingevuld. De klant vult per medewerker ${WERKNEMER_KOLOMMEN.filter((k) => k.verplicht).length} verplichte velden in.`
                : o.gelezen.werknemers && tijdlijn.some((g) => g.soort === "gewist")
                  ? "Gewist na de import in XpertSuite."
                  : "Meegestuurd als Excel: de klant mailt het ingevulde bestand terug."}
            </p>
          )}
        </section>
      )}

      </>)}

      {tab === "werknemer" && (<>
      <section className="acard p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuSignature /></span>
            <div>
              <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Machtiging overdracht verzuimdossier: de werknemers van {o.bedrijf}</h2>
              <p className="mt-1 max-w-[760px] text-[13.5px] leading-[1.55] text-black/55">
                Alleen bij een overstap van een andere arbodienst. Jij vult de vorige arbodienst in en nodigt de zieke medewerkers met een lopend dossier uit; zij tekenen online op hun telefoon, met IP-registratie. Daarna verstuur je namens {o.bedrijf} de opdracht tot overdracht. De werkgever ziet hier niets van op zijn onboardingpagina.
              </p>
            </div>
          </div>
          <Link href="/admin/onboarding/werknemers" className="abtn-ghost !py-1.5 text-[13px]"><LuSignature /> Alle werknemers</Link>
        </div>
      </section>

      <section className="acard p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Vorige arbodienst en bedrijfsarts</h2>
          {arbodienst && <a href={`${basis}/pdf/machtiging`} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuFileDown /> Lege machtiging als pdf</a>}
        </div>
        <p className="mt-1 text-[13.5px] text-black/50">{MACHTIGING[0].tekst} Weet je het e-mailadres van de arbodienst? Daar gaat straks de opdracht heen.</p>
        <form action={saveVorigeArbodienst.bind(null, o.id)} className="mt-4 grid gap-4 sm:grid-cols-2">
          {MACHTIGING[0].velden.map((v) => (
            <div key={v.naam} className={v.half ? "" : "sm:col-span-2"}>
              <label className="alabel" htmlFor={`va-${v.naam}`}>{v.label}{v.verplicht ? " *" : ""}</label>
              <input id={`va-${v.naam}`} className="ainput" name={v.naam} type={v.type || "text"} defaultValue={arbodienst?.[v.naam] || ""} maxLength={v.max ?? 200} required={v.verplicht} />
              {v.hint && <p className="mt-1 text-[12px] text-black/45">{v.hint}</p>}
            </div>
          ))}
          <div className="sm:col-span-2"><button className="abtn-ghost !py-1.5 text-[13px]">{arbodienst ? "Opslaan" : "Vorige arbodienst opslaan"}</button></div>
        </form>
      </section>

      <MachtigingBeheer id={o.id} bedrijf={o.bedrijf} arbodienst={arbodienst} kandidaten={kandidaten} lijst={machtigingen} open={o.status !== "concept" && o.status !== "ingetrokken"} />

      {(() => {
        const wTijdlijn = tijdlijn.filter((g) => g.soort === "machtiging" || g.soort === "gewist" || (g.soort === "ingevuld" && g.details?.document === "werknemers"));
        return wTijdlijn.length > 0 ? (
          <section className="acard p-6">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat er gebeurde met de werknemers</h2>
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
              {wTijdlijn.map((g) => {
                const Icoon = ICONEN[g.soort] || LuPencil;
                return (
                  <li key={g.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f9] text-[13px] text-[#312e82]"><Icoon /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] text-[#1c1a4e]">{zin(g)}</span>
                      <span className="block text-[12.5px] text-black/45">{momentLang(g.at)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null;
      })()}
      </>)}

      {tab === "werkgever" && (<>
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat er gebeurde</h2>
        {tijdlijn.length === 0 ? (
          <p className="mt-3 text-[14px] text-black/50">Nog niets.</p>
        ) : (
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {tijdlijn.map((g) => {
              const Icoon = ICONEN[g.soort] || LuPencil;
              return (
                <li key={g.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f9] text-[13px] text-[#312e82]"><Icoon /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] text-[#1c1a4e]">{zin(g)}</span>
                    <span className="block text-[12.5px] text-black/45">{momentLang(g.at)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <OnboardingForm begin={o} nieuw={false} ingevuld={ingevuld} />

      <section className="acard p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuStickyNote /> Notitie</h2>
        <p className="mt-1 text-[13px] text-black/50">Alleen voor jullie; de klant ziet dit niet.</p>
        <form action={saveOnboardingNotitie.bind(null, o.id)} className="mt-3 space-y-3">
          <textarea className="ainput min-h-[90px]" name="notitie" defaultValue={o.notitie || ""} maxLength={5000} aria-label="Notitie" />
          <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
        </form>
      </section>
      </>)}
    </div>
  );
}
