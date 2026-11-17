"use client";
import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BODY, BREED, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT } from "@/components/blocks/Gedeeld";
import {
  DOWNLOAD, Icoon, initialen, knop, Kopbalk, Label, Melding, MUTE, OMLAAG, outfit, PAGINA_CSS, scrollNaar, SectieKop, TELEFOON, telLink, useInBeeld, veld, Vink, Voet,
  voornaam, type Huis, type Modus,
} from "./ContractPagina";
import {
  actieSleutel, CHECKLIST_KOLOMMEN, CHECKLIST_KOP, CHECKLIST_NAAM, CHECKLIST_TITEL, CHECKLIST_UITLEG, CHECKLIST_VRAGEN, checklistBegin, checklistVoortgang, datumSleutel,
  MAX_ACTIE, onderdeelBeantwoord, type ChecklistData, type ChecklistStand,
} from "@/lib/contractChecklist";
import { soortVan, type ContractPubliek } from "@/lib/contracten";
import type { ContactInfo } from "@/lib/content";
import { datumLang } from "@/lib/offertes";
import { slaChecklistOp, type ChecklistState } from "@/app/(offerte)/contract/actions";

/*
 * De Checklist arbeidsomstandigheden zoals de klant hem invult
 * (/contract/<token>/checklist, migratie 0042), en hetzelfde scherm als
 * voorbeeld in het beheer. Dezelfde taal als de contractpagina
 * (ContractPagina.tsx) en de stappagina's van de onboarding: de kopbalk met de
 * weg terug naar het contract, de opening in de lila tint met wat dit is en
 * "Zo werkt het", en dan het formulier als wit vel: de vijf gegevens bovenaan
 * en de acht onderdelen van het Word-bestand, elk met de actiepunten en
 * afspraken en de datum van afronding.
 *
 * Opslaan kan alleen de klant (modus klant, een verstuurd of getekend
 * contract); een collega en het voorbeeld zien het formulier, maar de knop
 * staat uit. Wat opgeslagen is, komt bij het beheer en als pdf in de mail.
 */

const veldLabel = "text-[14.5px] font-bold";
const randFout = "!border-[#B42318] focus:!shadow-[0_0_0_3px_rgba(180,35,24,0.14)]";

export default function ContractChecklistPagina({
  contract, checklist, token, modus, contact, basis,
}: {
  contract: ContractPubliek;
  /** Wat al ingevuld is, of null. */
  checklist: ChecklistStand | null;
  token?: string;
  modus: Modus;
  contact: ContactInfo;
  /** De contractpagina waar deze checklist bij hoort: /contract/<token> of /admin/contractvoorbeeld/<id>. */
  basis: string;
}) {
  const huis: Huis = { contact };
  const pdf = `${basis}/checklist/pdf`;
  const kanOpslaan = modus === "klant" && contract.status !== "concept" && Boolean(token);
  const [waarden, setWaarden] = useState<ChecklistData>(() => checklistBegin(contract, checklist));
  const [state, setState] = useState<ChecklistState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const v = checklistVoortgang(waarden);
  const fouten = state?.velden || {};
  const bijOpslaan = useInBeeld("opslaan");
  const tel = telLink(contract.afzender_telefoon);
  const afzender = voornaam(contract.afzender_naam) || "React2u";

  // De datum bovenaan: vandaag, pas in de browser (anders verschillen server en browser rond middernacht), alleen bij een lege checklist.
  useEffect(() => {
    if (checklist) return;
    const t = setTimeout(() => setWaarden((w) => (w.datum ? w : { ...w, datum: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) })), 0);
    return () => clearTimeout(t);
  }, [checklist]);

  const zet = (sleutel: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setWaarden((w) => ({ ...w, [sleutel]: e.target.value }));

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!kanOpslaan || !token) {
      setState({
        ok: false,
        fout:
          modus === "voorbeeld"
            ? "Dit is een voorbeeld: invullen kan pas als het contract verstuurd is."
            : modus === "collega"
              ? "Als collega kun je de checklist bekijken; invullen doet de klant via zijn link."
              : "Deze checklist kan niet meer worden opgeslagen.",
      });
      return;
    }
    start(async () => {
      const r = await slaChecklistOp(token, waarden);
      setState(r);
      if (r.ok) router.refresh();
      else if (r.velden) {
        const eerste = Object.keys(r.velden).find((k) => k !== "leeg");
        if (eerste) document.getElementById(`cl-${eerste.replace(/_(actie|datum)$/, "-$1")}`)?.focus();
      }
    });
  }

  const feiten = [
    { label: "Contract", waarde: contract.nummer },
    { label: "Onderdelen", waarde: `${v.beantwoord} van ${v.totaal}`, sub: "beantwoord" },
    checklist
      ? { label: checklist.versie > 1 ? "Bijgewerkt op" : "Ingevuld op", waarde: datumLang(checklist.versie > 1 ? checklist.bijgewerkt_at : checklist.ingevuld_at), sub: checklist.door ? `door ${checklist.door}` : undefined }
      : { label: "Duurt ongeveer", waarde: "10 minuten", sub: "tussendoor opslaan kan" },
  ];
  const onderdelen = [
    { id: "checklist-kop", label: "De checklist" },
    { id: "onderdelen", label: "De onderdelen" },
    { id: "opslaan", label: "Opslaan" },
  ];

  return (
    <div className={`hv ${outfit.variable} contract-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <Kopbalk
        contract={contract}
        onderdelen={onderdelen}
        terug={{ href: basis, label: "Het contract" }}
        actie={<a href={`${pdf}?download=1`} className={`${knop.rand} !h-[48px] md:!h-[52px]`}><Icoon d={DOWNLOAD} size={15} /> Pdf</a>}
      />
      <Melding modus={modus} soort={soortVan(contract)} />
      <main>
        {/* De opening, zoals op het contract */}
        <section id="checklist-kop" className="scroll-mt-[96px] px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
            <div className="relative flex flex-col gap-6">
              <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
                <a href={basis} className="hover:underline" style={{ color: MUTE }}>Contract {contract.nummer}</a><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{contract.bedrijf}</span>
              </p>
              <div>
                {/* Kleur inline: de algemene kopstijl van de site wint anders van de Tailwind-klasse. */}
                <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
                  React2u
                  <span className="mt-1 block text-[50px] leading-[1.02] tracking-[-1.6px] md:text-[76px] md:tracking-[-2.2px]">
                    Checklist<span style={{ color: PINK }}>.</span>
                  </span>
                  <span className="hv-dienst mt-4 block text-[18px] font-bold leading-[1.5] tracking-normal md:text-[21px]">Arbeidsomstandigheden: de inventarisatie bij het basiscontract.</span>
                </h1>
              </div>
              <div className="flex max-w-[620px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>
                  Beste {voornaam(contract.contactpersoon) || "relatie"}, dit hoort bij je contract.
                </p>
                <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                  <p className="m-0">{CHECKLIST_UITLEG.kort}</p>
                  <p className="m-0">{CHECKLIST_UITLEG.invullen}</p>
                </div>
              </div>
              <dl className="m-0 flex flex-wrap gap-x-10 gap-y-4">
                {feiten.map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[13px]" style={{ color: MUTE }}>{f.label}</dt>
                    <dd className="m-0 mt-0.5 text-[16px] font-bold" style={{ color: NAVY }}>{f.waarde}</dd>
                    {f.sub && <dd className="m-0 text-[13px]" style={{ color: MUTE }}>{f.sub}</dd>}
                  </div>
                ))}
              </dl>
              <div className="geen-print flex flex-wrap gap-3 pt-1">
                <button type="button" onClick={() => scrollNaar("onderdelen")} className={knop.roze}>{checklist ? "Bekijk of vul aan" : "Vul de checklist in"} <Icoon d={OMLAAG} /></button>
                <a href={`${pdf}?download=1`} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download als pdf</a>
              </div>
            </div>
            <div className="relative"><ZoWerktHet contract={contract} tel={tel} /></div>
          </div>
        </section>
        <div className="h-10 md:h-16" />

        {/* Het formulier als wit vel */}
        <section id="onderdelen" aria-label={CHECKLIST_NAAM} className="scroll-mt-[96px]" style={{ background: SOFT }}>
          <div className={`${BREED} flex flex-col gap-10 py-16 md:gap-14 md:py-[112px]`}>
            <SectieKop
              eyebrow="De checklist"
              titel="Acht onderdelen, één formulier."
              tekst="De vijf gegevens bovenaan en de acht onderdelen, zoals op het formulier van React2u. Wat je hier invult, komt zo in de pdf en bij ons in het dossier."
            />
            <form id="checklist-formulier" onSubmit={verstuur} noValidate className="min-w-0 rounded-[28px] border bg-white px-6 py-9 shadow-[0_24px_48px_-40px_rgba(50,46,131,0.35)] md:px-12 md:py-14 xl:px-16" style={{ borderColor: LINE }}>
              <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-7" style={{ borderColor: LINE }}>
                <div className="flex flex-col gap-2">
                  <Label>Inventarisatie</Label>
                  <h2 className={`${kop} m-0 text-[28px] leading-[1.15] tracking-[-0.6px] md:text-[34px]`} style={{ color: NAVY }}>{CHECKLIST_TITEL}</h2>
                  <p className="m-0 text-[15px]" style={{ color: MUTE }}>Bij basiscontract {contract.nummer} tussen React2u en {contract.opdrachtgever?.naam || contract.bedrijf}</p>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-bold tabular-nums"
                  style={v.beantwoord === v.totaal ? { background: "#E3F6ED", color: "#0A7A4B" } : { background: SOFT, color: NAVY }}
                  aria-live="polite"
                >
                  {v.beantwoord === v.totaal && <Vink size={13} dik={3} />}
                  {v.beantwoord} van {v.totaal} beantwoord
                </span>
              </header>

              {/* De vijf gegevens bovenaan, in de volgorde van het formulier: links plaats en datum, rechts bedrijf, naam en functie */}
              <fieldset className="m-0 mt-8 min-w-0 border-0 p-0">
                <legend className="sr-only">Gegevens</legend>
                <div className="grid gap-4 md:grid-cols-2">
                  {CHECKLIST_KOP.map((k) => {
                    const id = `cl-${k.naam}`;
                    const fout = fouten[k.naam];
                    return (
                      <Fragment key={k.naam}>
                        {k.naam === "functie" && <span className="hidden md:block" aria-hidden="true" />}
                        <label htmlFor={id} className="flex flex-col gap-1.5">
                          <span className={veldLabel} style={{ color: NAVY }}>{k.label}{k.verplicht && <span style={{ color: PINK }}> *</span>}</span>
                          <input
                            id={id}
                            className={`${veld} ${fout ? randFout : ""}`}
                            type={k.type || "text"}
                            value={waarden[k.naam] || ""}
                            onChange={zet(k.naam)}
                            maxLength={k.max ?? 200}
                            autoComplete={k.autocomplete}
                            aria-invalid={Boolean(fout)}
                            aria-describedby={fout || k.hint ? `${id}-uitleg` : undefined}
                          />
                          {(fout || k.hint) && <span id={`${id}-uitleg`} className={`text-[13.5px] ${fout ? "font-semibold text-[#B42318]" : ""}`} style={fout ? undefined : { color: MUTE }}>{fout || k.hint}</span>}
                        </label>
                      </Fragment>
                    );
                  })}
                </div>
              </fieldset>

              {/* De acht onderdelen: de drie kolommen van het formulier */}
              <div className="mt-10">
                <div className="hidden gap-x-6 border-b pb-3 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_180px]" style={{ borderColor: LINE }} aria-hidden="true">
                  {CHECKLIST_KOLOMMEN.map((k) => <Label key={k}>{k}</Label>)}
                </div>
                <ol className="m-0 list-none p-0">
                  {CHECKLIST_VRAGEN.map((q, i) => {
                    const beantwoord = onderdeelBeantwoord(waarden, q.id);
                    const actieId = `cl-${q.id}-actie`;
                    const datumId = `cl-${q.id}-datum`;
                    const foutDatum = fouten[datumSleutel(q.id)];
                    return (
                      <li key={q.id} id={`onderdeel-${q.id}`} className="grid gap-5 border-b py-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_180px] md:gap-x-6" style={{ borderColor: LINE }}>
                        <div className="flex items-start gap-3.5">
                          <span className={`${kop} mt-px grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] transition-colors`} style={beantwoord ? { background: NAVY, color: "#fff" } : { background: LAV, color: NAVY }}>
                            {beantwoord ? <Vink size={14} dik={3} /> : i + 1}
                          </span>
                          <div className="flex flex-col gap-2">
                            <span className="md:hidden"><Label>{CHECKLIST_KOLOMMEN[0]}</Label></span>
                            {q.alineas.map((a, j) => <p key={j} className="m-0 text-[16px] font-bold leading-[1.5]" style={{ color: NAVY }}>{a}</p>)}
                          </div>
                        </div>
                        <label htmlFor={actieId} className="relative flex flex-col gap-1.5">
                          <span className={`${veldLabel} md:sr-only`} style={{ color: NAVY }}>{CHECKLIST_KOLOMMEN[1]}</span>
                          {q.toelichting && <span className="text-[14px] leading-[1.5]" style={{ color: MUTE }}>{q.toelichting}</span>}
                          <textarea
                            id={actieId}
                            className={`${veld} h-auto min-h-[104px] py-3 leading-[1.55]`}
                            value={waarden[actieSleutel(q.id)] || ""}
                            onChange={zet(actieSleutel(q.id))}
                            maxLength={MAX_ACTIE}
                            placeholder="Wat is geregeld, wat moet nog, met wie"
                          />
                        </label>
                        <label htmlFor={datumId} className="relative flex flex-col gap-1.5">
                          <span className={`${veldLabel} md:sr-only`} style={{ color: NAVY }}>{CHECKLIST_KOLOMMEN[2]}</span>
                          <input
                            id={datumId}
                            className={`${veld} ${foutDatum ? randFout : ""}`}
                            type="date"
                            value={waarden[datumSleutel(q.id)] || ""}
                            onChange={zet(datumSleutel(q.id))}
                            aria-invalid={Boolean(foutDatum)}
                            aria-describedby={foutDatum ? `${datumId}-uitleg` : undefined}
                          />
                          {foutDatum && <span id={`${datumId}-uitleg`} className="text-[13.5px] font-semibold text-[#B42318]">{foutDatum}</span>}
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Opslaan */}
              <div id="opslaan" className="mt-8 flex scroll-mt-[112px] flex-col gap-4">
                {state && !state.ok && <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#8A1C12]">{state.fout}</p>}
                {state?.ok && (
                  <p role="status" className="m-0 flex items-start gap-2.5 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]">
                    <span className="mt-0.5 shrink-0"><Vink size={16} dik={3} /></span>
                    Opgeslagen. Dank je wel! Je krijgt een kopie als pdf in je mail; aanvullen kan altijd via dezelfde link.
                  </p>
                )}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="m-0 max-w-[520px] text-[13px] leading-[1.5]" style={{ color: MUTE }}>
                    Je kunt tussendoor opslaan en later verder; de datums van afronding komen vaak later. {afzender} leest mee en neemt de checklist mee in het gesprek.
                  </p>
                  <button type="submit" disabled={bezig || !kanOpslaan} className={`${knop.roze} !h-[56px] w-full !text-[16px] md:w-auto`}>
                    {bezig ? "Opslaan…" : <>{checklist ? "Wijzigingen opslaan" : "Checklist opslaan"}<Pijl /></>}
                  </button>
                </div>
                {!kanOpslaan && (
                  <p className="m-0 text-[14px]" style={{ color: MUTE }}>
                    {modus === "voorbeeld"
                      ? "Voorbeeld: zo vult de klant de checklist in. Hier kan niets worden opgeslagen."
                      : modus === "collega"
                        ? "Je bekijkt de checklist als collega; invullen doet de klant via zijn link."
                        : "Deze checklist kan niet meer worden opgeslagen."}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>
      <Voet contract={contract} huis={huis} pdf={pdf} />

      {/* Op de telefoon: onderaan de stand en de knop om op te slaan, tot je bij Opslaan bent. */}
      {kanOpslaan && (
        <div className={`geen-print fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-white/95 px-4 py-3 backdrop-blur-md transition-transform sm:hidden ${bijOpslaan ? "translate-y-full" : ""}`} style={{ borderColor: LINE }}>
          <span className="shrink-0 text-[13.5px] font-bold tabular-nums" style={{ color: NAVY }}>{v.beantwoord}/{v.totaal}</span>
          <button type="submit" form="checklist-formulier" disabled={bezig} className={`${knop.roze} flex-1`}>{bezig ? "Opslaan…" : <>Opslaan<Pijl size={14} /></>}</button>
        </div>
      )}
    </div>
  );
}

/** De witte kaart in de opening: zo werkt het, in drie stappen, en de contactpersoon. */
function ZoWerktHet({ contract, tel }: { contract: ContractPubliek; tel: string | null }) {
  const stappen = [
    { kop: "Loop de onderdelen door", tekst: "Acht vragen over wat de Arbowet van je vraagt, zoals op het formulier." },
    { kop: "Noteer actiepunten en afspraken", tekst: "Per onderdeel wat er is geregeld of nog moet, en de datum waarop het af is." },
    { kop: "Sla op, en vul later aan", tekst: "Je krijgt een kopie als pdf; wij lezen mee en nemen het mee in het gesprek." },
  ];
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <Label>Zo werkt het</Label>
        <span className="h-3 w-3 rounded-full" style={{ background: PINK }} aria-hidden="true" />
      </div>
      <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
        {stappen.map((s, i) => (
          <li key={s.kop} className="flex items-start gap-3.5">
            <span className={`${kop} grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px]`} style={{ background: LAV, color: NAVY }}>{i + 1}</span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15.5px] font-bold leading-[1.35]" style={{ color: NAVY }}>{s.kop}</span>
              <span className="text-[14.5px] leading-[1.5]" style={{ color: BODY }}>{s.tekst}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-4 text-[13px] leading-[1.5]" style={{ color: MUTE }}>
        {contract.verstuurd_at ? `De checklist ging op ${datumLang(contract.verstuurd_at)} als pdf mee met het contract.` : "De checklist gaat als pdf mee met het contract."}
      </p>
      <div className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
        <span className={`${kop} flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[15px] text-white`} style={{ background: NAVY }} aria-hidden="true">
          {initialen(contract.afzender_naam)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>{contract.afzender_naam || "React2u"}</p>
          <p className="m-0 truncate text-[13.5px]" style={{ color: MUTE }}>Je contactpersoon bij React2u</p>
        </div>
        {tel && (
          <a href={tel} aria-label={`Bel ${contract.afzender_naam || "React2u"}`} className="hv-btn hv-btn-rand flex h-10 w-10 items-center justify-center rounded-full">
            <Icoon d={TELEFOON} size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

