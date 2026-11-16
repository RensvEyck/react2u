import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  heropenOnboarding, markeerOnboardingVerstuurd, nieuweOnboardingLink, saveOnboardingIntern, saveOnboardingNotitie, trekOnboardingIn, verstuurOnboarding,
  verwijderOnboarding, wisWerknemers, zetOnboardingOpen,
} from "@/app/admin/onboardingActions";
import OnboardingForm from "@/components/admin/OnboardingForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { onboardingUrl } from "@/lib/mail";
import {
  datumNl, documentInfo, documentKlaar, gekozen, INRICHTING, isDocument, MACHTIGING, ONBOARDING_WEERGAVE, onboardingWeergave, voortgang, vultIn,
  WERKNEMER_KOLOMMEN, type DocumentSleutel, type Onboarding, type OnboardingGebeurtenis, type VeldGroep, type Werknemer,
} from "@/lib/onboarding";
import { momentLang } from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil, LuStickyNote, LuFileDown, LuCircleCheck,
  LuCircle, LuPencilLine, LuBookOpenCheck, LuFlag, LuEraser, LuFileSpreadsheet, LuBuilding2,
} from "react-icons/lu";

/**
 * Eén onboarding: versturen of herinneren, de voortgang per document, wat de
 * klant invulde (met het werknemersbestand als Excel voor XpertSuite), de
 * tijdlijn en de gegevens om aan te passen.
 */

const ICONEN: Record<OnboardingGebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, ingevuld: LuPencilLine,
  gelezen: LuBookOpenCheck, afgerond: LuFlag, ingetrokken: LuBan, heropend: LuRotateCcw, gewist: LuEraser,
};

const docNaam = (d: unknown) => (isDocument(d) ? documentInfo(d).titel : "een document");

function zin(g: OnboardingGebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${door}`;
    case "bekeken": return "Bekeken door de klant";
    case "ingevuld": return `${docNaam(d.document)} ${d.opnieuw ? "aangepast" : "ingevuld"} door de klant`;
    case "gelezen": return `${docNaam(d.document)} afgevinkt door de klant`;
    case "afgerond": return "Alles compleet";
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
    case "gewist": return `Werknemersbestand gewist${door}${d.aantal ? ` (${d.aantal} medewerkers)` : ""}`;
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

export default async function OnboardingAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [res, tijdlijnRes] = await Promise.all([
    sb.from("onboardings").select("*").eq("id", id).maybeSingle(),
    sb.from("onboarding_gebeurtenissen").select("*").eq("onboarding_id", id).order("at", { ascending: false }).limit(200),
  ]);
  if (!res.data) notFound();
  const o = res.data as Onboarding;
  const tijdlijn = (tijdlijnRes.data as OnboardingGebeurtenis[]) || [];
  const w = onboardingWeergave(o);
  const s = ONBOARDING_WEERGAVE[w];
  const link = onboardingUrl(o.token);
  const open = o.status !== "ingetrokken";
  const v = voortgang(o);
  const docs = gekozen(o);
  const inrichting = o.antwoorden.inrichting?.data as Record<string, string> | undefined;
  const machtiging = o.antwoorden.machtiging?.data as Record<string, string> | undefined;
  const werknemers = ((o.antwoorden.werknemers?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || [];
  const ingevuld = Object.keys(o.antwoorden).filter(isDocument) as DocumentSleutel[];

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
            <a href={link} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Voorbeeld</a>
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
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Voortgang</h2>
            <span className="text-[13px] font-semibold text-black/55">{v.klaar} van {v.totaal} klaar</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full rounded-full bg-[#0a7a4b] transition-all" style={{ width: `${v.totaal ? (v.klaar / v.totaal) * 100 : 0}%` }} />
          </div>
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
                  {d.sleutel === "werknemers" && !invul ? (
                    <a href={`${link}/excel`} className="text-[12.5px] font-semibold text-[#312e82] hover:underline">Excel</a>
                  ) : (
                    <a href={`${link}/pdf/${d.sleutel}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline"><LuFileDown /> Pdf</a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {docs.some((d) => d.sleutel === "inrichting") && (
        <section className="acard p-6">
          <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuBuilding2 /> Inrichting nieuwe klant</h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {inrichting ? (
              <div>
                <p className="mb-4 text-[13px] text-black/50">
                  Ingevuld {momentLang(o.antwoorden.inrichting!.at)}{o.antwoorden.inrichting!.door ? ` door ${o.antwoorden.inrichting!.door}` : ""}.
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
                {werknemers.length} {werknemers.length === 1 ? "medewerker" : "medewerkers"}, ingevuld {momentLang(o.antwoorden.werknemers!.at)}. Het Excelbestand heeft de 37 kolommen van het importbestand van XpertSuite.
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

      {machtiging && (
        <section className="acard p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Machtiging: vorige arbodienst</h2>
            <a href={`${link}/pdf/machtiging`} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuFileDown /> Machtiging als pdf</a>
          </div>
          <div className="mt-4"><Velden groepen={MACHTIGING} data={machtiging} /></div>
        </section>
      )}

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
    </div>
  );
}
