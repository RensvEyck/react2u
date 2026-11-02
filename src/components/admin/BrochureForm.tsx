"use client";
import { useActionState } from "react";
import { saveBrochure, type BrochureFormState } from "@/app/admin/brochureActions";
import { BERICHT_STANDAARD, type Brochure } from "@/lib/brochures";
import { LuSave } from "react-icons/lu";

/** Waarmee het formulier begint: leeg, vooringevuld (uit een aanvraag) of een bestaande brochure. */
export type BrochureBegin = Partial<
  Pick<Brochure, "id" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "bericht" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon">
>;

/**
 * De brochure in het beheer: voor wie, het persoonlijke woord en wie hem
 * stuurt. De inhoud zelf (de zes diensten) komt van de site en is niet per
 * brochure aan te passen; dat houdt elke brochure gelijk aan wat we zeggen.
 */
export default function BrochureForm({ begin, nieuw }: { begin: BrochureBegin; nieuw: boolean }) {
  const [state, action, bezig] = useActionState<BrochureFormState, FormData>(saveBrochure, null);
  return (
    <form action={action} className="space-y-6">
      {begin.id && <input type="hidden" name="id" value={begin.id} />}
      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Prospect</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="alabel" htmlFor="br-bedrijf">Bedrijf *</label>
            <input id="br-bedrijf" className="ainput" name="bedrijf" defaultValue={begin.bedrijf || ""} required maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="br-cp">Contactpersoon</label>
            <input id="br-cp" className="ainput" name="contactpersoon" defaultValue={begin.contactpersoon || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="br-email">E-mail</label>
            <input id="br-email" className="ainput" name="email" type="email" defaultValue={begin.email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="br-tel">Telefoon</label>
            <input id="br-tel" className="ainput" name="telefoon" defaultValue={begin.telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Persoonlijk woord</h2>
        <p className="mt-1 text-[13.5px] text-black/50">
          Staat bovenaan de brochure, onder de aanhef. Gebruik {"{bedrijf}"} en {"{voornaam}"}: die vult de brochure zelf in.
        </p>
        <textarea id="br-bericht" className="ainput mt-4 min-h-[160px]" name="bericht" defaultValue={begin.bericht ?? BERICHT_STANDAARD} maxLength={5000} />
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Afzender</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Staat als contactpersoon op de brochure en in de mail; het mailadres is waar de prospect op antwoordt.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="br-an">Naam</label>
            <input id="br-an" className="ainput" name="afzender_naam" defaultValue={begin.afzender_naam || ""} maxLength={200} />
          </div>
          <div>
            <label className="alabel" htmlFor="br-af">Functie</label>
            <input id="br-af" className="ainput" name="afzender_functie" defaultValue={begin.afzender_functie || ""} maxLength={200} placeholder="Mag leeg" />
          </div>
          <div>
            <label className="alabel" htmlFor="br-ae">E-mail</label>
            <input id="br-ae" className="ainput" name="afzender_email" type="email" defaultValue={begin.afzender_email || ""} maxLength={254} />
          </div>
          <div>
            <label className="alabel" htmlFor="br-at">Telefoon</label>
            <input id="br-at" className="ainput" name="afzender_telefoon" defaultValue={begin.afzender_telefoon || ""} maxLength={40} />
          </div>
        </div>
      </section>

      {state?.fout && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{state.fout}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="abtn" disabled={bezig}><LuSave /> {bezig ? "Opslaan…" : nieuw ? "Brochure aanmaken" : "Opslaan"}</button>
        {nieuw && <span className="text-[13px] text-black/50">Daarna kun je hem bekijken en versturen.</span>}
      </div>
    </form>
  );
}
