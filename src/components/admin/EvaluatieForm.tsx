"use client";
import { useActionState } from "react";
import { saveEvaluatie, type EvaluatieFormState } from "@/app/admin/evaluatieActions";
import { BERICHT_STANDAARD, type Evaluatie } from "@/lib/evaluatie";
import { LuSave } from "react-icons/lu";

/** Waarmee het formulier begint: leeg, vooringevuld (vanuit het klantenbord) of een bestaande evaluatie. */
export type EvaluatieBegin = Partial<
  Pick<Evaluatie, "id" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "bericht" | "bezoek_datum" | "bezoek_tijd" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon">
>;

/**
 * De klantevaluatie in het beheer: voor wie, wanneer het bezoek is, het
 * persoonlijke woord en de afzender. De vragen zelf staan vast in de code
 * (lib/evaluatie.ts), letterlijk uit het Word-formulier.
 */
export default function EvaluatieForm({ begin, nieuw }: { begin: EvaluatieBegin; nieuw: boolean }) {
  const [state, action, bezig] = useActionState<EvaluatieFormState, FormData>(saveEvaluatie, null);
  return (
    <form action={action} className="space-y-6">
      {begin.id && <input type="hidden" name="id" value={begin.id} />}
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Klant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="ev-bedrijf">Bedrijf *</label>
            <input id="ev-bedrijf" className="ainput" name="bedrijf" defaultValue={begin.bedrijf || ""} required maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-cp">Contactpersoon</label>
            <input id="ev-cp" className="ainput" name="contactpersoon" defaultValue={begin.contactpersoon || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-email">E-mail</label>
            <input id="ev-email" className="ainput" name="email" type="email" defaultValue={begin.email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-tel">Telefoon</label>
            <input id="ev-tel" className="ainput" name="telefoon" defaultValue={begin.telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Het bezoek</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Wanneer je de evaluatie met de klant bespreekt. Staat bovenaan het formulier en in de mail; mag leeg.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="ev-datum">Datum bezoek</label>
            <input id="ev-datum" className="ainput" name="bezoek_datum" type="date" defaultValue={begin.bezoek_datum || ""} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-tijd">Tijd</label>
            <input id="ev-tijd" className="ainput" name="bezoek_tijd" defaultValue={begin.bezoek_tijd || ""} maxLength={40} placeholder="Bijvoorbeeld 10.00 uur" />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Persoonlijk woord</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Staat bovenaan de evaluatiepagina. Gebruik {"{bedrijf}"} en {"{voornaam}"}: die vult de pagina zelf in.
        </p>
        <textarea id="ev-bericht" className="ainput mt-4 min-h-[150px]" name="bericht" defaultValue={begin.bericht ?? BERICHT_STANDAARD} maxLength={5000} aria-label="Persoonlijk woord" />
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Afzender</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Staat als aanspreekpunt op de pagina en in de mail, en krijgt een seintje als de klant de evaluatie opent of invult.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="ev-an">Naam</label>
            <input id="ev-an" className="ainput" name="afzender_naam" defaultValue={begin.afzender_naam || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-af">Functie</label>
            <input id="ev-af" className="ainput" name="afzender_functie" defaultValue={begin.afzender_functie || ""} maxLength={200} placeholder="Mag leeg" />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-ae">E-mail</label>
            <input id="ev-ae" className="ainput" name="afzender_email" type="email" defaultValue={begin.afzender_email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="ev-at">Telefoon</label>
            <input id="ev-at" className="ainput" name="afzender_telefoon" defaultValue={begin.afzender_telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      {state?.fout && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{state.fout}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="abtn" disabled={bezig}><LuSave /> {bezig ? "Opslaan…" : nieuw ? "Evaluatie aanmaken" : "Opslaan"}</button>
        {nieuw && <span className="text-[13px] text-black/50">Daarna kun je hem bekijken en versturen.</span>}
      </div>
    </form>
  );
}
