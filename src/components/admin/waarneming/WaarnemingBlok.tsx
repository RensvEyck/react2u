import Link from "next/link";
import { LuArrowRight, LuUserRoundCheck } from "react-icons/lu";
import type { requirePerm } from "@/lib/admin";
import { Avatar } from "@/components/admin/AccountMenu";
import { collegaBij, gedekteKlanten, naamVan, nuOfBinnenkort, periodeTekst, sorteer, voornaamVan } from "@/lib/waarneming";
import { haalDekking, haalKlanten } from "@/lib/waarnemingDb";

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];
const WEKEN_VOORUIT = 28;

/**
 * In het CM-overleg (0057): wie er de komende vier weken niet is en wie dan
 * waarneemt, zodat het team het meeneemt bij de verdeling. Niets te melden,
 * dan staat het blok er niet. Vóór de migratie ook niet.
 */
export default async function WaarnemingBlok({ sb, vandaag }: { sb: Sb; vandaag: string }) {
  const d = await haalDekking(sb, vandaag);
  if (!d) return null;
  const lijst = sorteer(d.waarnemingen.filter((w) => nuOfBinnenkort(w, vandaag, WEKEN_VOORUIT)), vandaag);
  if (lijst.length === 0) return null;
  const klanten = await haalKlanten(sb);
  return (
    <section className="acard p-6" id="waarneming-overleg" aria-labelledby="waarneming-overleg-kop">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="waarneming-overleg-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuUserRoundCheck className="text-black/35" /> Wie er de komende weken niet is</h2>
          <p className="mt-0.5 text-[12.5px] text-black/45">Neem het mee bij de verdeling van dossiers en klanten.</p>
        </div>
        <Link href="/admin/waarneming" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#312e82] hover:underline">Alle waarneming <LuArrowRight className="text-[13px]" /></Link>
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {lijst.map((w) => {
          const afwezige = collegaBij(w.afwezige, d.collegas, w.afwezige_email);
          const waarnemer = collegaBij(w.waarnemer, d.collegas, w.waarnemer_email);
          const n = gedekteKlanten(w, klanten, d.collegas).length;
          return (
            <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-[#1c1a4e]"><Avatar email={afwezige?.email || w.afwezige_email || "?"} className="h-6 w-6 text-[10px]" /> {naamVan(afwezige, w.afwezige_email)}</span>
              <span className="text-black/50">{periodeTekst(w.van, w.tot)}</span>
              <span className={w.waarnemer ? "text-black/60" : "font-semibold text-[#b86e00]"}>{w.waarnemer ? `${voornaamVan(waarnemer, w.waarnemer_email)} neemt waar` : "nog geen waarnemer"}</span>
              <span className="text-[12px] text-black/40">{n === 0 ? "geen klant op naam" : n === 1 ? "1 klant" : `${n} klanten`}</span>
              <Link href={`/admin/waarneming/${w.id}`} className="ml-auto text-[12.5px] font-semibold text-[#312e82] hover:underline">Kaart</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
