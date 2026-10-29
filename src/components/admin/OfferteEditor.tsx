"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { saveOfferte, type OfferteFormState } from "@/app/admin/offerteActions";
import { LEAVE_QUESTION, setUnsaved } from "@/lib/unsaved";
import {
  berekenTotalen, controleer, EENHEDEN, euro, nieuwId, prijsLabel, secties, SOORTEN, standaardKeuze, bedragVoor,
  VORMEN, VORM_KEYS, regelbedrag, type Eenheid, type Offerte, type Regel, type Soort, type Stap, type Vorm,
} from "@/lib/offertes";
import { alsRegel, type CatalogusGroep } from "@/lib/offerteCatalogus";
import OfferteTekst from "@/components/offerte/OfferteTekst";
import {
  LuPlus, LuSave, LuEye, LuArrowUp, LuArrowDown, LuCopy, LuTrash2, LuChevronDown, LuSearch, LuX, LuListPlus,
  LuCircleAlert, LuCircleCheck, LuPencil,
} from "react-icons/lu";

/*
 * De offerte samenstellen: klant, onderdelen, tekst en afzender, met rechts
 * wat de klant straks ziet (het totaal bij de standaardkeuze) en wat er nog
 * ontbreekt. De onderdelen komen uit de prijslijst (de bouwdoos) of zijn
 * eigen regels; elke regel is vast, een optie, een keuze uit een groep of een
 * tarief bij gebruik (zie lib/offertes.ts).
 */

export type EditorBegin = Partial<Pick<
  Offerte,
  | "id" | "status" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "medewerkers" | "titel" | "intro" | "geldig_tot"
  | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "vorm" | "betreft" | "inhoud" | "voorwaarden" | "factuur"
>> & { regels?: Regel[]; vervolg?: Stap[] | null };

/** Tekstvak met een knop om te zien hoe het er voor de klant uitziet (OfferteTekst). */
function TekstVeld({
  id, naam, label, uitleg, waarde, setWaarde, max, hoog,
}: {
  id: string; naam: string; label: string; uitleg: React.ReactNode; waarde: string; setWaarde: (s: string) => void; max: number; hoog?: boolean;
}) {
  const [zien, setZien] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <label className="alabel !mb-0" htmlFor={id}>{label}</label>
        <div role="tablist" className="inline-flex rounded-[9px] bg-black/[0.04] p-0.5 text-[12.5px] font-semibold">
          {(["Bewerken", "Voorbeeld"] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={zien === (i === 1)}
              onClick={() => setZien(i === 1)}
              className={`rounded-[7px] px-2.5 py-1 ${zien === (i === 1) ? "bg-white text-[#312e82] shadow-sm" : "text-black/45"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Het veld blijft in het formulier, ook in het voorbeeld. */}
      <textarea
        id={id}
        name={naam}
        className={`ainput font-mono !text-[13px] leading-[1.6] ${hoog ? "min-h-[320px]" : "min-h-[120px]"} ${zien ? "hidden" : ""}`}
        value={waarde}
        maxLength={max}
        onChange={(e) => setWaarde(e.target.value)}
      />
      {zien && (
        <div className="max-h-[520px] overflow-y-auto rounded-[12px] border border-black/[0.08] bg-[#fbfaf7] p-5">
          {waarde.trim() ? <OfferteTekst tekst={waarde} klein /> : <p className="text-[13px] text-black/40">Nog leeg.</p>}
        </div>
      )}
      <p className="mt-1.5 text-[12.5px] text-black/45">{uitleg}</p>
    </div>
  );
}

const SOORT_KLEUR: Record<Soort, string> = {
  vast: "bg-[#e3f6ed] text-[#0a7a4b]",
  optie: "bg-[#eef0ff] text-[#312e82]",
  keuze: "bg-[#fce9f0] text-[#c40f60]",
  tarief: "bg-black/[0.05] text-black/55",
};
const SOORT_KORT: Record<Soort, string> = { vast: "Vast", optie: "Optie", keuze: "Keuze", tarief: "Tarief" };

function Kaart({ titel, uitleg, actie, children, id }: { titel: string; uitleg?: string; actie?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="acard">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
        <div>
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">{titel}</h2>
          {uitleg && <p className="mt-0.5 text-[13px] text-black/45">{uitleg}</p>}
        </div>
        {actie}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/** Prijsveld met eigen tekst, zodat "38," tijdens het typen niet wegspringt. */
function PrijsVeld({ waarde, onChange, id }: { waarde: number | null; onChange: (n: number | null) => void; id: string }) {
  const [tekst, setTekst] = useState(waarde === null ? "" : String(waarde).replace(".", ","));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-black/40">€</span>
      <input
        id={id}
        className="ainput !pl-8 tabular-nums"
        inputMode="decimal"
        value={tekst}
        placeholder="Op aanvraag"
        onChange={(e) => {
          const t = e.target.value;
          setTekst(t);
          const ruw = t.trim().replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
          if (!ruw) return onChange(null);
          const n = Number(ruw);
          if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100) / 100);
        }}
      />
    </div>
  );
}

export default function OfferteEditor({
  begin, catalogus,
}: {
  /** Ook de regels van een startpunt uit de URL (?start=) komen hierin, op de server gemaakt: willekeurige ids in de browser zouden niet overeenkomen met de serverrender. */
  begin: EditorBegin;
  catalogus: CatalogusGroep[];
}) {
  const [state, action, bezig] = useActionState<OfferteFormState, FormData>(saveOfferte, null);
  const [regels, setRegels] = useState<Regel[]>(begin.regels || []);
  const [medewerkers, setMedewerkers] = useState(begin.medewerkers ? String(begin.medewerkers) : "");
  const [bedrijf, setBedrijf] = useState(begin.bedrijf || "");
  const [email, setEmail] = useState(begin.email || "");
  const [geldig, setGeldig] = useState(begin.geldig_tot || "");
  const [vorm, setVorm] = useState<Vorm>(begin.vorm || "verzuimbegeleiding");
  const [inhoud, setInhoud] = useState(begin.inhoud || "");
  const [voorwaarden, setVoorwaarden] = useState(begin.voorwaarden || "");
  const [vervolg, setVervolg] = useState<Stap[]>(begin.vervolg || []);
  const [open, setOpen] = useState<string | null>(null);
  const [kiezer, setKiezer] = useState(false);
  const [dirty, setDirty] = useState(Boolean(!begin.id && begin.regels?.length));
  const verzonden = useRef(false);

  const n = Number(medewerkers.replace(/\D/g, "")) || null;
  const totalen = useMemo(() => berekenTotalen(regels, standaardKeuze(regels), n), [regels, n]);
  const fouten = controleer({ bedrijf, email, regels, geldig_tot: geldig || null });
  const groepNamen = [...new Set(regels.filter((r) => r.soort === "keuze").map((r) => r.groep || "keuze"))];
  const sectieNamen = [...new Set([...regels.map((r) => r.sectie), ...catalogus.map((g) => g.items[0]?.sectie).filter(Boolean) as string[]])];

  // Niet opgeslagen werk: vragen bij weggaan (zie BlockEditor voor het waarom van de capture-fase).
  useEffect(() => {
    setUnsaved(dirty);
    return () => setUnsaved(false);
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!verzonden.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || a.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm(LEAVE_QUESTION)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
  // Een fout van de server: het werk staat er nog, dus weer bewaken.
  useEffect(() => {
    if (state?.fout) verzonden.current = false;
  }, [state]);

  const wijzig = (f: (r: Regel[]) => Regel[]) => {
    setRegels(f);
    setDirty(true);
  };
  const zet = (id: string, patch: Partial<Regel>) => wijzig((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const weg = (id: string) => wijzig((rs) => rs.filter((r) => r.id !== id));
  const kopie = (id: string) =>
    wijzig((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const k = { ...rs[i], id: nieuwId(), naam: `${rs[i].naam} (kopie)`, aan: undefined };
      return [...rs.slice(0, i + 1), k, ...rs.slice(i + 1)];
    });
  /** Een plek omhoog of omlaag binnen de eigen kop. */
  const schuif = (id: string, richting: -1 | 1) =>
    wijzig((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      let j = i + richting;
      while (j >= 0 && j < rs.length && rs[j].sectie !== rs[i].sectie) j += richting;
      if (j < 0 || j >= rs.length) return rs;
      const kopie = [...rs];
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
      return kopie;
    });
  /** Een hele kop omhoog of omlaag. */
  const schuifSectie = (naam: string, richting: -1 | 1) =>
    wijzig((rs) => {
      const s = secties(rs);
      const i = s.findIndex((x) => x.naam === naam);
      const j = i + richting;
      if (i < 0 || j < 0 || j >= s.length) return rs;
      [s[i], s[j]] = [s[j], s[i]];
      return s.flatMap((x) => x.regels);
    });
  const hernoemSectie = (oud: string, nieuw: string) => wijzig((rs) => rs.map((r) => (r.sectie === oud ? { ...r, sectie: nieuw } : r)));
  const eigenRegel = () => {
    // Onder de eerste kop (meestal Aansluiting): daar hoort een eigen regel als een intake of korting meestal thuis.
    const r: Regel = { id: nieuwId(), sectie: secties(regels)[0]?.naam || "Onderdelen", naam: "Nieuw onderdeel", prijs: null, eenheid: "eenmalig", soort: "optie" };
    wijzig((rs) => [...rs, r]);
    setOpen(r.id);
  };

  return (
    <form
      action={action}
      onSubmit={() => {
        verzonden.current = true;
        setUnsaved(false);
      }}
      onInput={() => setDirty(true)}
    >
      {begin.id && <input type="hidden" name="id" value={begin.id} />}
      <input type="hidden" name="regels" value={JSON.stringify(regels)} />
      <input type="hidden" name="vorm" value={vorm} />
      <input type="hidden" name="vervolg" value={JSON.stringify(vervolg.filter((s) => s.kop.trim()))} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <Kaart titel="Klant">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="alabel" htmlFor="of-vorm">Soort offerte</label>
                <select
                  id="of-vorm"
                  className="ainput"
                  value={vorm}
                  onChange={(e) => {
                    setVorm(e.target.value as Vorm);
                    setDirty(true);
                  }}
                >
                  {VORM_KEYS.map((v) => <option key={v} value={v}>{VORMEN[v].label}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="alabel" htmlFor="of-betreft">{VORMEN[vorm].betreft || "Betreft"}</label>
                <input id="of-betreft" className="ainput" name="betreft" defaultValue={begin.betreft || ""} maxLength={200} placeholder={VORMEN[vorm].betreftHint || "Mag leeg; staat bovenaan de offerte"} />
              </div>
              <div className="lg:col-span-2">
                <label className="alabel" htmlFor="of-bedrijf">Bedrijf *</label>
                <input id="of-bedrijf" className="ainput" name="bedrijf" required value={bedrijf} onChange={(e) => setBedrijf(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="alabel" htmlFor="of-mw">Aantal medewerkers</label>
                <input id="of-mw" className="ainput tabular-nums" name="medewerkers" inputMode="numeric" value={medewerkers} onChange={(e) => setMedewerkers(e.target.value)} placeholder="Voor de prijs per medewerker" />
              </div>
              <div>
                <label className="alabel" htmlFor="of-cp">Contactpersoon</label>
                <input id="of-cp" className="ainput" name="contactpersoon" defaultValue={begin.contactpersoon || ""} placeholder="Voor de aanhef en het tekenvenster" />
              </div>
              <div>
                <label className="alabel" htmlFor="of-email">E-mail</label>
                <input id="of-email" className="ainput" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="alabel" htmlFor="of-tel">Telefoon</label>
                <input id="of-tel" className="ainput" name="telefoon" type="tel" defaultValue={begin.telefoon || ""} />
              </div>
            </div>
            {/* Vooraf invullen scheelt de klant werk: hij ziet het ingevuld en bevestigt bij het tekenen. */}
            <details className="group mt-4 rounded-[12px] border border-black/[0.07] px-4 py-3" open={Boolean(begin.factuur?.adres)}>
              <summary className="cursor-pointer list-none text-[13.5px] font-semibold text-[#312e82]">
                <span className="group-open:hidden">+ Factuurgegevens vooraf invullen</span>
                <span className="hidden group-open:inline">Factuurgegevens</span>
                <span className="ml-2 font-normal text-black/45">mag leeg; de klant vult ze aan bij het tekenen</span>
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <label className="alabel" htmlFor="of-fadres">Straat en huisnummer</label>
                  <input id="of-fadres" className="ainput" name="factuur_adres" defaultValue={begin.factuur?.adres || ""} maxLength={200} />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-fpostcode">Postcode</label>
                  <input id="of-fpostcode" className="ainput" name="factuur_postcode" defaultValue={begin.factuur?.postcode || ""} maxLength={12} />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-fplaats">Plaats</label>
                  <input id="of-fplaats" className="ainput" name="factuur_plaats" defaultValue={begin.factuur?.plaats || ""} maxLength={100} />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-femail">Facturen per mail naar</label>
                  <input id="of-femail" className="ainput" name="factuur_email" type="email" defaultValue={begin.factuur?.email || ""} placeholder="Leeg: naar wie tekent" />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-fkvk">KvK-nummer</label>
                  <input id="of-fkvk" className="ainput tabular-nums" name="factuur_kvk" inputMode="numeric" defaultValue={begin.factuur?.kvk || ""} maxLength={20} />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-finkoop">Inkoopnummer</label>
                  <input id="of-finkoop" className="ainput" name="factuur_inkoopnummer" defaultValue={begin.factuur?.inkoopnummer || ""} maxLength={60} />
                </div>
              </div>
            </details>
          </Kaart>

          <Kaart
            id="onderdelen"
            titel="Onderdelen"
            uitleg="Wat de klant ziet en kan aanklikken. Bedragen exclusief btw."
            actie={
              regels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="abtn !py-1.5 text-[13px]" onClick={() => setKiezer(true)}><LuListPlus /> Uit de prijslijst</button>
                  <button type="button" className="abtn-ghost !py-1.5 text-[13px]" onClick={eigenRegel}><LuPlus /> Eigen onderdeel</button>
                </div>
              )
            }
          >
            {regels.length === 0 ? (
              <div>
                <p className="text-[14px] text-black/50">Nog geen onderdelen. Kies ze uit de prijslijst of voeg een eigen onderdeel toe.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="abtn-ghost !py-1.5 text-[13px]" onClick={() => setKiezer(true)}><LuListPlus /> Zelf kiezen uit de prijslijst</button>
                  <button type="button" className="abtn-ghost !py-1.5 text-[13px]" onClick={eigenRegel}><LuPlus /> Eigen onderdeel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {secties(regels).map((s, si, alle) => (
                  <div key={s.naam}>
                    <div className="mb-2 flex items-center gap-2">
                      {s.kleur && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.kleur }} aria-hidden="true" />}
                      {s.label && <span className="shrink-0 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: s.kleur || "#312e82" }}>{s.label}</span>}
                      <input
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-heading text-[15px] font-bold text-[#1c1a4e] hover:border-black/10 focus:border-[#312e82]/40 focus:outline-none"
                        value={s.naam}
                        aria-label="Naam van deze kop"
                        onChange={(e) => hernoemSectie(s.naam, e.target.value || " ")}
                      />
                      <button type="button" disabled={si === 0} onClick={() => schuifSectie(s.naam, -1)} className="rounded p-1 text-black/35 hover:text-[#312e82] disabled:opacity-30" aria-label="Kop omhoog"><LuArrowUp /></button>
                      <button type="button" disabled={si === alle.length - 1} onClick={() => schuifSectie(s.naam, 1)} className="rounded p-1 text-black/35 hover:text-[#312e82] disabled:opacity-30" aria-label="Kop omlaag"><LuArrowDown /></button>
                    </div>
                    <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-[14px] border border-black/[0.07]">
                      {s.regels.map((r, ri) => (
                        <RegelRij
                          key={r.id}
                          r={r}
                          medewerkers={n}
                          open={open === r.id}
                          eerste={ri === 0}
                          laatste={ri === s.regels.length - 1}
                          groepNamen={groepNamen}
                          sectieNamen={sectieNamen}
                          wissel={() => setOpen(open === r.id ? null : r.id)}
                          zet={(p) => zet(r.id, p)}
                          weg={() => weg(r.id)}
                          kopie={() => kopie(r.id)}
                          schuif={(d) => schuif(r.id, d)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <datalist id="of-groepen">{groepNamen.map((g) => <option key={g} value={g} />)}</datalist>
            <datalist id="of-secties">{sectieNamen.map((g) => <option key={g} value={g} />)}</datalist>
          </Kaart>

          <Kaart titel="Tekst" uitleg="Gebruik {bedrijf}, {contactpersoon}, {voornaam} of {betreft}: die worden op de offerte ingevuld.">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="alabel" htmlFor="of-titel">Titel</label>
                  <input id="of-titel" className="ainput" name="titel" defaultValue={begin.titel || "Verzuimbegeleiding op maat"} maxLength={200} />
                </div>
                <div>
                  <label className="alabel" htmlFor="of-geldig">Geldig tot en met</label>
                  <input id="of-geldig" className="ainput" name="geldig_tot" type="date" value={geldig} onChange={(e) => setGeldig(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="alabel" htmlFor="of-intro">Persoonlijke boodschap</label>
                <textarea
                  id="of-intro"
                  className="ainput min-h-[130px]"
                  name="intro"
                  maxLength={5000}
                  defaultValue={begin.intro || ""}
                  placeholder={"Bijvoorbeeld: Beste {contactpersoon}, bedankt voor het prettige gesprek van dinsdag…"}
                />
                <p className="mt-1.5 text-[12.5px] text-black/45">Bovenaan de offerte, met je naam erbij. Een lege regel begint een nieuwe alinea.</p>
              </div>
              <TekstVeld
                id="of-inhoud"
                naam="inhoud"
                label="Over deze offerte"
                waarde={inhoud}
                setWaarde={setInhoud}
                max={30000}
                hoog
                uitleg={<><code>## Kop</code>, <code>### Tussenkop</code>, <code>- punt</code>, <code>1. stap</code>, <code>&gt; uitgelichte zin</code>, <code>**vet**</code>. Staat boven de onderdelen.</>}
              />
              <TekstVeld
                id="of-voorwaarden"
                naam="voorwaarden"
                label="Voorwaarden"
                waarde={voorwaarden}
                setWaarde={setVoorwaarden}
                max={10000}
                uitleg="Facturatie, betalingstermijn, annulering. Gaat mee in wat de klant tekent; de algemene voorwaarden en de geldigheid zet de offerte er zelf onder."
              />
              <div>
                <p className="alabel">Zo gaat het verder</p>
                <div className="space-y-2">
                  {vervolg.map((s, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-[12px] border border-black/[0.07] p-3 sm:flex-row sm:items-start">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[13px] font-bold text-[#312e82]">{i + 1}</span>
                      <input className="ainput sm:w-[34%]" value={s.kop} maxLength={80} aria-label={`Stap ${i + 1}: kop`} placeholder="Kop"
                        onChange={(e) => { setVervolg((v) => v.map((x, j) => (j === i ? { ...x, kop: e.target.value } : x))); setDirty(true); }} />
                      <input className="ainput flex-1" value={s.tekst} maxLength={400} aria-label={`Stap ${i + 1}: tekst`} placeholder="Wat er gebeurt"
                        onChange={(e) => { setVervolg((v) => v.map((x, j) => (j === i ? { ...x, tekst: e.target.value } : x))); setDirty(true); }} />
                      <button type="button" className="rounded-lg p-2 text-black/35 hover:bg-[#fdecea] hover:text-[#b42318]" aria-label={`Stap ${i + 1} verwijderen`}
                        onClick={() => { setVervolg((v) => v.filter((_, j) => j !== i)); setDirty(true); }}>
                        <LuTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
                {vervolg.length < 4 && (
                  <button type="button" className="abtn-ghost mt-2 !py-1.5 text-[13px]" onClick={() => { setVervolg((v) => [...v, { kop: "", tekst: "" }]); setDirty(true); }}>
                    <LuPlus /> Stap toevoegen
                  </button>
                )}
                {vervolg.length === 0 && <p className="mt-1.5 text-[12.5px] text-black/45">Leeg: de offerte toont drie algemene stappen.</p>}
              </div>
            </div>
          </Kaart>

          <Kaart titel="Afzender" uitleg="Staat op de offerte als contactpersoon en krijgt de meldingen (geopend, getekend, niet akkoord).">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="alabel" htmlFor="of-an">Naam</label>
                <input id="of-an" className="ainput" name="afzender_naam" defaultValue={begin.afzender_naam || ""} />
              </div>
              <div>
                <label className="alabel" htmlFor="of-af">Functie</label>
                <input id="of-af" className="ainput" name="afzender_functie" defaultValue={begin.afzender_functie || ""} placeholder="Bijvoorbeeld accountmanager" />
              </div>
              <div>
                <label className="alabel" htmlFor="of-ae">E-mail</label>
                <input id="of-ae" className="ainput" name="afzender_email" type="email" defaultValue={begin.afzender_email || ""} />
              </div>
              <div>
                <label className="alabel" htmlFor="of-at">Telefoon</label>
                <input id="of-at" className="ainput" name="afzender_telefoon" type="tel" defaultValue={begin.afzender_telefoon || ""} />
              </div>
            </div>
          </Kaart>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="acard p-5">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-black/45">Bij de standaardkeuze</p>
            {totalen.perMaand > 0 || totalen.eenmalig === 0 ? (
              <>
                <p className="mt-1 font-heading text-[30px] font-bold tabular-nums text-[#1c1a4e]">{euro(totalen.perMaand)}<span className="ml-1.5 text-[14px] font-medium text-black/45">per maand</span></p>
                <p className="text-[12.5px] text-black/45">{euro(totalen.perJaar)} per jaar</p>
                {totalen.eenmalig > 0 && <p className="mt-1 text-[14px] font-semibold tabular-nums text-[#1c1a4e]">+ {euro(totalen.eenmalig)} eenmalig</p>}
              </>
            ) : (
              <p className="mt-1 font-heading text-[30px] font-bold tabular-nums text-[#1c1a4e]">{euro(totalen.eenmalig)}<span className="ml-1.5 text-[14px] font-medium text-black/45">eenmalig</span></p>
            )}
            {groepNamen.length > 0 && <p className="mt-1 text-[12.5px] text-black/45">De klant kan in {groepNamen.length === 1 ? "de keuzegroep" : `${groepNamen.length} keuzegroepen`} een andere optie kiezen; het totaal rekent mee.</p>}
            <ul className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-4 text-[13px]">
              {totalen.regels.map(({ regel, bedrag, periode }) => (
                <li key={regel.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-black/60">{regel.naam}</span>
                  <span className="shrink-0 tabular-nums text-[#1c1a4e]">
                    {bedrag === null ? "op aanvraag" : `${euro(regelbedrag({ bedrag, periode }).bedrag!)}${periode === "jaar" ? " /mnd" : ""}`}
                  </span>
                </li>
              ))}
              {totalen.regels.length === 0 && <li className="text-black/40">Nog niets dat meetelt.</li>}
            </ul>
          </div>

          <div className="acard p-5">
            {fouten.length === 0 ? (
              <p className="flex items-start gap-2 text-[13.5px] text-[#0a7a4b]"><LuCircleCheck className="mt-0.5 shrink-0" /> Klaar om te versturen na het opslaan.</p>
            ) : (
              <ul className="space-y-2 text-[13.5px] text-[#9a5a00]">
                {fouten.map((f) => <li key={f} className="flex items-start gap-2"><LuCircleAlert className="mt-0.5 shrink-0" /> {f}</li>)}
              </ul>
            )}
            {begin.status === "verstuurd" && (
              <p className="mt-3 rounded-[10px] bg-[#fff4e5] px-3 py-2 text-[13px] text-[#7a4a06]">De klant heeft de link al. Wat je opslaat, ziet hij meteen.</p>
            )}
            {state?.fout && <p role="alert" className="mt-3 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13px] text-[#b42318]">{state.fout}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button className="abtn justify-center" disabled={bezig}><LuSave /> {bezig ? "Opslaan…" : begin.id ? "Opslaan" : "Offerte aanmaken"}</button>
              {begin.id && (
                <Link href={`/admin/offertevoorbeeld/${begin.id}`} target="_blank" className="abtn-ghost justify-center"><LuEye /> Voorbeeld{dirty ? " (laatst opgeslagen)" : ""}</Link>
              )}
            </div>
          </div>
        </aside>
      </div>

      {kiezer && (
        <CatalogusKiezer
          catalogus={catalogus}
          aanwezig={new Set(regels.map((r) => r.naam.toLowerCase()))}
          sluit={() => setKiezer(false)}
          voegToe={(items) => {
            wijzig((rs) => [...rs, ...items]);
            setKiezer(false);
          }}
        />
      )}
    </form>
  );
}

function RegelRij({
  r, medewerkers, open, eerste, laatste, groepNamen, sectieNamen, wissel, zet, weg, kopie, schuif,
}: {
  r: Regel; medewerkers: number | null; open: boolean; eerste: boolean; laatste: boolean; groepNamen: string[]; sectieNamen: string[];
  wissel: () => void; zet: (p: Partial<Regel>) => void; weg: () => void; kopie: () => void; schuif: (d: -1 | 1) => void;
}) {
  const b = bedragVoor(r, medewerkers);
  const id = (veld: string) => `of-${r.id}-${veld}`;
  return (
    <li className={open ? "bg-[#fafafd]" : "bg-white"}>
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3">
        <div className="flex shrink-0 flex-col">
          <button type="button" disabled={eerste} onClick={() => schuif(-1)} className="rounded p-0.5 text-[13px] text-black/30 hover:text-[#312e82] disabled:opacity-25" aria-label="Omhoog"><LuArrowUp /></button>
          <button type="button" disabled={laatste} onClick={() => schuif(1)} className="rounded p-0.5 text-[13px] text-black/30 hover:text-[#312e82] disabled:opacity-25" aria-label="Omlaag"><LuArrowDown /></button>
        </div>
        <button type="button" onClick={wissel} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[14px] font-semibold text-[#1c1a4e]">{r.naam}</span>
            <span className={`apill !px-2 !py-0.5 !text-[11px] ${SOORT_KLEUR[r.soort]}`}>
              {SOORT_KORT[r.soort]}{r.soort === "keuze" ? `: ${r.groep}` : ""}{(r.soort === "optie" || r.soort === "keuze") && r.aan ? " · standaard aan" : ""}
            </span>
          </span>
          <span className="mt-0.5 block text-[12.5px] text-black/45">
            {prijsLabel(r)}{r.aantal ? ` × ${r.aantal}` : ""}
            {b && b.bedrag > 0 ? ` = ${euro(regelbedrag(b).bedrag!)}${b.periode === "jaar" ? " per maand" : ""}` : ""}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={wissel} className="rounded-lg p-2 text-black/35 hover:bg-black/[0.04] hover:text-[#312e82]" aria-label={open ? "Inklappen" : "Bewerken"}>
            {open ? <LuChevronDown className="rotate-180" /> : <LuPencil />}
          </button>
          <button type="button" onClick={kopie} className="rounded-lg p-2 text-black/35 hover:bg-black/[0.04] hover:text-[#312e82]" aria-label="Dupliceren"><LuCopy /></button>
          <button type="button" onClick={weg} className="rounded-lg p-2 text-black/35 hover:bg-[#fdecea] hover:text-[#b42318]" aria-label="Verwijderen"><LuTrash2 /></button>
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-black/[0.05] px-4 pb-5 pt-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <label className="alabel" htmlFor={id("naam")}>Naam</label>
            <input id={id("naam")} className="ainput" value={r.naam} onChange={(e) => zet({ naam: e.target.value })} maxLength={200} />
          </div>
          <div className="md:col-span-2">
            <label className="alabel" htmlFor={id("sectie")}>Kop</label>
            <input id={id("sectie")} className="ainput" list="of-secties" value={r.sectie} onChange={(e) => zet({ sectie: e.target.value })} maxLength={120} />
            <span className="sr-only">{sectieNamen.length} bestaande koppen</span>
          </div>
          <div className="md:col-span-2">
            <label className="alabel" htmlFor={id("soort")}>Soort</label>
            <select
              id={id("soort")}
              className="ainput"
              value={r.soort}
              onChange={(e) => {
                const soort = e.target.value as Soort;
                zet({ soort, groep: soort === "keuze" ? r.groep || groepNamen[0] || "aansluiting" : undefined, aan: soort === "vast" || soort === "tarief" ? undefined : r.aan });
              }}
            >
              {SOORTEN.map((s) => <option key={s.key} value={s.key}>{s.label}: {s.uitleg.toLowerCase()}</option>)}
            </select>
          </div>
          {r.soort === "keuze" && (
            <div>
              <label className="alabel" htmlFor={id("groep")}>Keuzegroep</label>
              <input id={id("groep")} className="ainput" list="of-groepen" value={r.groep || ""} onChange={(e) => zet({ groep: e.target.value })} maxLength={60} />
            </div>
          )}
          {(r.soort === "optie" || r.soort === "keuze") && (
            <label className="flex items-center gap-2 self-end pb-2.5 text-[13.5px] text-black/70">
              <input type="checkbox" checked={Boolean(r.aan)} onChange={(e) => zet({ aan: e.target.checked || undefined })} className="h-4 w-4 accent-[#312e82]" />
              {r.soort === "optie" ? "Staat standaard aan" : "Voorgeselecteerd"}
            </label>
          )}
          <div className={r.soort === "keuze" || r.soort === "optie" ? "lg:col-start-1" : ""}>
            <label className="alabel" htmlFor={id("prijs")}>Prijs (excl. btw)</label>
            <PrijsVeld id={id("prijs")} waarde={r.prijs} onChange={(prijs) => zet({ prijs, eenheid: prijs !== null && r.eenheid === "op_aanvraag" ? "eenmalig" : r.eenheid })} />
          </div>
          <div>
            <label className="alabel" htmlFor={id("eenheid")}>Eenheid</label>
            <select id={id("eenheid")} className="ainput" value={r.eenheid} onChange={(e) => zet({ eenheid: e.target.value as Eenheid, prijs: e.target.value === "op_aanvraag" ? null : r.prijs })}>
              {EENHEDEN.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="alabel" htmlFor={id("aantal")}>Aantal</label>
            <input
              id={id("aantal")}
              className="ainput tabular-nums"
              inputMode="decimal"
              value={r.aantal ?? ""}
              placeholder={r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker" ? `Medewerkers${medewerkers ? ` (${medewerkers})` : ""}` : "1"}
              onChange={(e) => {
                const v = Number(e.target.value.replace(",", "."));
                zet({ aantal: e.target.value.trim() && Number.isFinite(v) && v > 0 ? v : undefined });
              }}
            />
          </div>
          {r.prijs === null && (
            <div className="md:col-span-2">
              <label className="alabel" htmlFor={id("ptekst")}>Prijs als tekst</label>
              <input id={id("ptekst")} className="ainput" value={r.prijsTekst || ""} onChange={(e) => zet({ prijsTekst: e.target.value || undefined })} placeholder="Leeg: Op aanvraag. Bijv. €89 p.p. en €0,42 per km" maxLength={60} />
            </div>
          )}
          <div>
            <label className="alabel" htmlFor={id("badge")}>Label</label>
            <input id={id("badge")} className="ainput" value={r.badge || ""} onChange={(e) => zet({ badge: e.target.value || undefined })} placeholder="Bijv. Meest gekozen" maxLength={40} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="alabel" htmlFor={id("oms")}>Omschrijving</label>
            <textarea id={id("oms")} className="ainput min-h-[72px]" value={r.omschrijving || ""} onChange={(e) => zet({ omschrijving: e.target.value || undefined })} maxLength={1000} />
          </div>
          {(r.soort === "keuze" || r.punten?.length) && (
            <div className="md:col-span-2 lg:col-span-4">
              <label className="alabel" htmlFor={id("punten")}>Wat erbij hoort (één per regel)</label>
              <textarea
                id={id("punten")}
                className="ainput min-h-[72px]"
                value={(r.punten || []).join("\n")}
                onChange={(e) => zet({ punten: e.target.value.split("\n").map((p) => p.replace(/^\s+/, "")).filter((p, i, a) => p || i === a.length - 1).slice(0, 12) })}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function CatalogusKiezer({
  catalogus, aanwezig, sluit, voegToe,
}: {
  catalogus: CatalogusGroep[];
  aanwezig: Set<string>;
  sluit: () => void;
  voegToe: (regels: Regel[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [zoek, setZoek] = useState("");
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  const z = zoek.trim().toLowerCase();
  const sleutel = (gi: number, ii: number) => `${gi}:${ii}`;
  const groepen = catalogus
    .map((g, gi) => ({ g, gi, items: g.items.map((item, ii) => ({ item, ii })).filter(({ item }) => !z || `${g.naam} ${item.naam} ${item.omschrijving || ""}`.toLowerCase().includes(z)) }))
    .filter((x) => x.items.length);
  const wissel = (k: string) => setGekozen((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        sluit();
      }}
      onClick={(e) => e.target === e.currentTarget && sluit()}
      className="m-auto flex max-h-[88vh] w-[calc(100%-32px)] max-w-[760px] flex-col overflow-hidden rounded-[18px] bg-white p-0 backdrop:bg-[#1c1a4e]/45"
      aria-label="Onderdelen uit de prijslijst"
    >
      <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4">
        <LuSearch className="shrink-0 text-black/35" />
        <input
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
          placeholder="Zoek in de prijslijst, bijvoorbeeld bedrijfsarts of coaching"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
        />
        <button type="button" onClick={sluit} className="rounded-lg p-1.5 text-black/40 hover:bg-black/[0.04]" aria-label="Sluiten"><LuX /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {groepen.length === 0 && <p className="py-8 text-center text-[14px] text-black/45">Niets gevonden. Voeg het toe als eigen onderdeel.</p>}
        {groepen.map(({ g, gi, items }) => (
          <div key={g.naam} className="mb-5">
            <p className="mb-1.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: g.kleur || "#312e82" }}>
              {g.kleur && <span className="h-2 w-2 rounded-full" style={{ background: g.kleur }} />}
              {g.naam}
            </p>
            <ul className="divide-y divide-black/[0.04] rounded-[12px] border border-black/[0.07]">
              {items.map(({ item, ii }) => {
                const k = sleutel(gi, ii);
                const staat = aanwezig.has(item.naam.toLowerCase());
                return (
                  <li key={k}>
                    <label className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-[#fafafd] ${gekozen.has(k) ? "bg-[#f4f4fd]" : ""}`}>
                      <input type="checkbox" checked={gekozen.has(k)} onChange={() => wissel(k)} className="h-4 w-4 shrink-0 accent-[#312e82]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#1c1a4e]">{item.naam}</span>
                        {item.omschrijving && <span className="block truncate text-[12.5px] text-black/45">{item.omschrijving}</span>}
                      </span>
                      {staat && <span className="apill shrink-0 bg-black/[0.04] !text-[11px] text-black/45">staat erin</span>}
                      <span className={`apill shrink-0 !px-2 !py-0.5 !text-[11px] ${SOORT_KLEUR[item.soort]}`}>{SOORT_KORT[item.soort]}</span>
                      <span className="w-[150px] shrink-0 text-right text-[13px] tabular-nums text-black/60">{prijsLabel(item)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-[#fafafd] px-5 py-3.5">
        <p className="text-[13px] text-black/45">Soort en prijs pas je daarna per onderdeel aan.</p>
        <button
          type="button"
          className="abtn"
          disabled={gekozen.size === 0}
          onClick={() => {
            const regels: Regel[] = [];
            catalogus.forEach((g, gi) => g.items.forEach((item, ii) => gekozen.has(sleutel(gi, ii)) && regels.push(alsRegel(item))));
            voegToe(regels);
          }}
        >
          <LuPlus /> {gekozen.size ? `${gekozen.size} toevoegen` : "Toevoegen"}
        </button>
      </div>
    </dialog>
  );
}
