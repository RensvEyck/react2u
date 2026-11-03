"use client";
import { useActionState, useState } from "react";
import { saveContract, type ContractFormState } from "@/app/admin/contractActions";
import { looptijdTekst, offerteKenmerk, standaardEinde, type Contract, type OfferteKeuze } from "@/lib/contracten";
import { CONTRACT_STANDAARD, CONTRACT_VERSIE, wijktAf } from "@/lib/contractTekst";
import { LuSave, LuRotateCcw, LuTriangleAlert, LuCircleCheck } from "react-icons/lu";

/** Waarmee het formulier begint: leeg, vanuit een offerte, of een bestaand contract. */
export type ContractBegin = Partial<
  Pick<Contract, "id" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "opdrachtgever" | "offerte_id" | "offerte_kenmerk" | "ingangsdatum" | "einddatum" | "tekst" | "aanvullend" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon">
>;

/**
 * Het contract in het beheer: voor wie, de looptijd, de offerte waar het bij
 * hoort, wat sales al weet over de organisatie van de klant, en de tekst. De
 * tekst begint als de standaard (lib/contractTekst.ts) en is per contract aan
 * te passen; een afwijking staat er duidelijk bij.
 */
export default function ContractForm({ begin, nieuw, offertes }: { begin: ContractBegin; nieuw: boolean; offertes: OfferteKeuze[] }) {
  const [state, action, bezig] = useActionState<ContractFormState, FormData>(saveContract, null);
  const [ingang, setIngang] = useState(begin.ingangsdatum || "");
  const [einde, setEinde] = useState(begin.einddatum || "");
  // Volgt de einddatum de ingang (een jaar later)? Tot iemand hem zelf wijzigt.
  const [volgt, setVolgt] = useState(!begin.einddatum || begin.einddatum === standaardEinde(begin.ingangsdatum || ""));
  const [offerteId, setOfferteId] = useState(begin.offerte_id || "");
  const [kenmerk, setKenmerk] = useState(begin.offerte_kenmerk || "");
  const [tekst, setTekst] = useState(begin.tekst || CONTRACT_STANDAARD);
  const og = begin.opdrachtgever || {};
  const afwijkend = wijktAf(tekst);
  const looptijd = ingang && einde && einde > ingang ? looptijdTekst(ingang, einde) : null;

  function kiesOfferte(id: string) {
    setOfferteId(id);
    const o = offertes.find((x) => x.id === id);
    setKenmerk(o ? offerteKenmerk(o) : "");
  }

  return (
    <form action={action} className="space-y-6">
      {begin.id && <input type="hidden" name="id" value={begin.id} />}
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Klant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="ct-bedrijf">Bedrijf *</label>
            <input id="ct-bedrijf" className="ainput" name="bedrijf" defaultValue={begin.bedrijf || ""} required maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-cp">Contactpersoon</label>
            <input id="ct-cp" className="ainput" name="contactpersoon" defaultValue={begin.contactpersoon || ""} maxLength={200} placeholder="Meestal wie tekent" />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-email">E-mail</label>
            <input id="ct-email" className="ainput" name="email" type="email" defaultValue={begin.email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-tel">Telefoon</label>
            <input id="ct-tel" className="ainput" name="telefoon" defaultValue={begin.telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Looptijd en offerte</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Artikel 1: na de einddatum wordt het contract telkens met 12 maanden verlengd, met een opzegtermijn van 3 maanden.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="ct-ingang">Ingangsdatum *</label>
            <input
              id="ct-ingang"
              className="ainput"
              type="date"
              name="ingangsdatum"
              value={ingang}
              required
              onChange={(e) => {
                setIngang(e.target.value);
                if (volgt && e.target.value) setEinde(standaardEinde(e.target.value));
              }}
            />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-einde">Einddatum *</label>
            <input
              id="ct-einde"
              className="ainput"
              type="date"
              name="einddatum"
              value={einde}
              required
              onChange={(e) => {
                setEinde(e.target.value);
                setVolgt(false);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <span className="text-[13px] text-black/50">Looptijd:</span>
            {[12, 24, 36].map((m) => (
              <button
                key={m}
                type="button"
                disabled={!ingang}
                onClick={() => {
                  setEinde(standaardEinde(ingang, m));
                  setVolgt(m === 12);
                }}
                className={`apill transition-colors ${einde && ingang && einde === standaardEinde(ingang, m) ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}
              >
                {m / 12} jaar
              </button>
            ))}
            {looptijd && <span className="text-[13px] font-semibold text-[#312e82]">{looptijd}</span>}
          </div>
          <div>
            <label className="alabel" htmlFor="ct-offerte">Hoort bij offerte</label>
            <select id="ct-offerte" name="offerte_id" className="ainput" value={offerteId} onChange={(e) => kiesOfferte(e.target.value)}>
              <option value="">Geen offerte koppelen</option>
              {offertes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nummer} · {o.bedrijf}{o.status === "getekend" ? " · getekend" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="alabel" htmlFor="ct-kenmerk">Kenmerk in het contract (overweging D)</label>
            <input id="ct-kenmerk" className="ainput" name="offerte_kenmerk" value={kenmerk} onChange={(e) => setKenmerk(e.target.value)} maxLength={200} placeholder="Leeg: naam en KvK-nummer van de klant" />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Organisatie van de klant</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Zoals in het handelsregister; dit komt in de kop van het contract. Mag leeg: de klant vult het in bij het tekenen en ziet wat je al invulde.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label className="alabel" htmlFor="ct-onaam">Statutaire naam</label>
            <input id="ct-onaam" className="ainput" name="og_naam" defaultValue={og.naam || ""} maxLength={200} placeholder="Bijvoorbeeld Bakkerij Jansen B.V." />
          </div>
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="ct-okvk">KvK-nummer</label>
            <input id="ct-okvk" className="ainput" name="og_kvk" defaultValue={og.kvk || ""} inputMode="numeric" maxLength={12} placeholder="8 cijfers" />
          </div>
          <div className="sm:col-span-3">
            <label className="alabel" htmlFor="ct-oadres">Straat en huisnummer</label>
            <input id="ct-oadres" className="ainput" name="og_adres" defaultValue={og.adres || ""} maxLength={200} />
          </div>
          <div className="sm:col-span-1">
            <label className="alabel" htmlFor="ct-opostcode">Postcode</label>
            <input id="ct-opostcode" className="ainput" name="og_postcode" defaultValue={og.postcode || ""} maxLength={12} />
          </div>
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="ct-oplaats">Vestigingsplaats</label>
            <input id="ct-oplaats" className="ainput" name="og_plaats" defaultValue={og.plaats || ""} maxLength={100} />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Aanvullende afspraken</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Alleen als er iets bijzonders is afgesproken. Komt als laatste artikel in het contract; een lege regel begint een nieuwe bepaling.
        </p>
        <textarea id="ct-aanvullend" className="ainput mt-4 min-h-[90px]" name="aanvullend" defaultValue={begin.aanvullend || ""} maxLength={5000} placeholder="Mag leeg" />
      </section>

      <section className="acard p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Tekst van het contract</h2>
          {afwijkend ? (
            <span className="apill bg-[#fff4e5] text-[#7a4a06]"><LuTriangleAlert /> Aangepast, wijkt af van de standaard</span>
          ) : (
            <span className="apill bg-[#e3f6ed] text-[#0a7a4b]"><LuCircleCheck /> Standaardtekst, versie {CONTRACT_VERSIE}</span>
          )}
        </div>
        <p className="mt-1 text-[13.5px] text-black/50">
          De tekst van het Basiscontract Arbodienstverlening. Pas hem alleen aan als dat juridisch is afgestemd.
        </p>
        <details className="mt-3" open={afwijkend}>
          <summary className="cursor-pointer text-[13.5px] font-semibold text-[#312e82]">Tekst bekijken of aanpassen</summary>
          <p className="mt-3 text-[12.5px] text-black/45">
            Opmaak: <code className="font-mono">## 1. Titel</code> begint een artikel, <code className="font-mono">1.1. tekst</code> een bepaling,{" "}
            <code className="font-mono">A. tekst</code> een overweging, <code className="font-mono">**vet**</code> zet iets vet. Invulvelden:{" "}
            <code className="font-mono">{"{ingangsdatum}"}</code>, <code className="font-mono">{"{einddatum}"}</code>, <code className="font-mono">{"{offerte}"}</code>.
          </p>
          <textarea
            id="ct-tekst"
            className="ainput mt-3 min-h-[420px] font-mono text-[12.5px] leading-[1.6]"
            name="tekst"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            maxLength={60000}
            spellCheck={false}
          />
          {afwijkend && (
            <button type="button" onClick={() => setTekst(CONTRACT_STANDAARD)} className="abtn-ghost mt-3 !py-1.5 text-[13px]">
              <LuRotateCcw /> Terug naar de standaardtekst
            </button>
          )}
        </details>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Afzender</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Staat als contactpersoon op de contractpagina en in de mail. Namens React2u tekent de bestuurder; zijn handtekening staat er al in.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="ct-an">Naam</label>
            <input id="ct-an" className="ainput" name="afzender_naam" defaultValue={begin.afzender_naam || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-af">Functie</label>
            <input id="ct-af" className="ainput" name="afzender_functie" defaultValue={begin.afzender_functie || ""} maxLength={200} placeholder="Mag leeg" />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-ae">E-mail</label>
            <input id="ct-ae" className="ainput" name="afzender_email" type="email" defaultValue={begin.afzender_email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ct-at">Telefoon</label>
            <input id="ct-at" className="ainput" name="afzender_telefoon" defaultValue={begin.afzender_telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      {state?.fout && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{state.fout}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="abtn" disabled={bezig}><LuSave /> {bezig ? "Opslaan…" : nieuw ? "Contract aanmaken" : "Opslaan"}</button>
        {nieuw && <span className="text-[13px] text-black/50">Daarna kun je het bekijken en versturen.</span>}
      </div>
    </form>
  );
}
