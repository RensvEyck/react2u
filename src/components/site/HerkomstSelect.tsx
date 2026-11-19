"use client";
import { HERKOMSTEN } from "@/lib/herkomst";
import { useTaal } from "./Taal";

/**
 * De keuzelijst "Hoe heb je ons gevonden?" (migratie 0047), voor het contact-
 * en kennismakenformulier. De waarden zijn de sleutels uit lib/herkomst.ts,
 * de teksten komen uit het woordenboek in de taal van de pagina. Verplicht,
 * met "anders of weet ik niet meer" als uitweg: zonder antwoord is de telling
 * in /admin/bezoek niets waard, en een keuze kost één tik.
 *
 * Het label zet het formulier er zelf omheen, in zijn eigen stijl; dit is
 * alleen de lijst met het pijltje (appearance-none haalt het standaardpijltje
 * weg, net als bij "Aantal medewerkers" op kennismaken).
 */
export default function HerkomstSelect({ className, kleur = "#322E83" }: { className: string; kleur?: string }) {
  const { t } = useTaal();
  const h = t.formulier.herkomst;
  return (
    <span className="relative block">
      <select className={`${className} appearance-none pr-11`} name="herkomst" required defaultValue="">
        <option value="" disabled>{h.kies}</option>
        {HERKOMSTEN.map((k) => <option key={k} value={k}>{h.opties[k]}</option>)}
      </select>
      <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={kleur} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </span>
  );
}
