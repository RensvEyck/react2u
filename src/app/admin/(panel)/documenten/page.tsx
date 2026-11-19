import Link from "next/link";
import type { IconType } from "react-icons";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver } from "@/lib/offertes";
import { DOC_SOORTEN, DOC_VOLGORDE, dagenTekst, staatUit, tellingen, type DocRij, type DocSoort } from "@/lib/klantdocumenten";
import { LuArrowRight, LuBookOpen, LuClipboardCheck, LuClipboardList, LuEye, LuEyeOff, LuFilePenLine, LuHandshake, LuInbox, LuPlus, LuScrollText } from "react-icons/lu";

/**
 * Documenten: één ingang voor alles wat React2u naar een klant stuurt om te
 * lezen, te tekenen of in te vullen (Rens, 17 nov 2026: "misschien moeten we
 * het in de sidebar gewoon documenten noemen", en 19 nov: "maak de sidebar een
 * stuk minder uitgebreid [...] zet daar alle documenten neer"). Offertes,
 * contracten, onboarding en brochures staan daardoor niet meer los in het
 * menu; ze zijn hier, in het palet (⌘K) en op hun eigen adres te vinden.
 *
 * Bovenaan wat bij klanten ligt, het langst wachtende eerst; daaronder per
 * soort een tegel in de volgorde van de klantreis.
 */

const ICOON: Record<DocSoort, IconType> = {
  brochure: LuBookOpen,
  offerte: LuFilePenLine,
  contract: LuScrollText,
  onboarding: LuClipboardCheck,
  evaluatie: LuClipboardList,
};

const TABEL: Record<DocSoort, { tabel: string; kolommen: string }> = {
  brochure: { tabel: "brochures", kolommen: "id, bedrijf, status, verstuurd_at, bekeken_at, created_at" },
  offerte: { tabel: "offertes", kolommen: "id, bedrijf, status, verstuurd_at, bekeken_at, created_at, geldig_tot" },
  contract: { tabel: "contracten", kolommen: "id, bedrijf, status, verstuurd_at, bekeken_at, created_at" },
  onboarding: { tabel: "onboardings", kolommen: "id, bedrijf, status, verstuurd_at, bekeken_at, created_at" },
  evaluatie: { tabel: "evaluaties", kolommen: "id, bedrijf, status, verstuurd_at, bekeken_at, created_at" },
};

/** Wat bij een soort hoort maar geen document voor één klant is. */
const EXTRA: Partial<Record<DocSoort, { label: string; href: string }>> = {
  offerte: { label: "Sjablonen", href: "/admin/offertes/sjablonen" },
  onboarding: { label: "Werknemers", href: "/admin/onboarding/werknemers" },
};

const ZICHTBAAR_UIT = 8;

export default async function Documenten() {
  const { sb } = await requirePerm("bellijst");
  const resultaten = await Promise.all(
    DOC_VOLGORDE.map(async (soort) => {
      const { tabel, kolommen } = TABEL[soort];
      const { data, error } = await sb.from(tabel).select(kolommen).order("created_at", { ascending: false }).limit(1000);
      const rijen = ((data as unknown as Omit<DocRij, "soort">[] | null) || []).map((r) => ({ ...r, soort }) as DocRij);
      return { soort, rijen, fout: error ? (isMissingTable(error) ? "nog niet aan" : "kon niet laden") : null };
    }),
  );
  const alle = resultaten.flatMap((r) => r.rijen);
  const fouten = Object.fromEntries(resultaten.map((r) => [r.soort, r.fout])) as Record<DocSoort, string | null>;
  const vandaag = datumOver(0);
  const telling = tellingen(alle, vandaag);
  const uit = staatUit(alle, new Date(), vandaag);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Documenten</h1>
        <p className="text-[14.5px] text-black/50">
          Alles wat je naar een klant stuurt om te lezen, te tekenen of in te vullen: van de eerste brochure tot de jaarlijkse evaluatie.
        </p>
      </div>

      <section className="acard overflow-hidden" aria-labelledby="bij-de-klant" id="bij-de-klant-lijst">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
          <h2 id="bij-de-klant" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuInbox /> Ligt bij de klant
            <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#312e82]">{uit.length}</span>
          </h2>
          <p className="text-[12.5px] text-black/40">Het langst wachtende bovenaan: daar moet je achteraan.</p>
        </div>
        {uit.length === 0 ? (
          <p className="px-6 py-5 text-[13.5px] text-black/45">Er ligt nu niets bij klanten. Alles wat je verstuurt en nog niet getekend of ingevuld is, komt hier te staan.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {uit.slice(0, ZICHTBAAR_UIT).map((r) => {
              const info = DOC_SOORTEN[r.soort];
              return (
                <li key={`${r.soort}-${r.id}`}>
                  {/* Op een telefoon twee regels (bedrijf en dagen, dan soort en geopend), breed één regel met vaste kolommen. */}
                  <Link href={info.detail(r.id)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-5 py-3 transition-colors hover:bg-black/[0.02] sm:grid-cols-[124px_minmax(0,1fr)_auto_76px] sm:px-6">
                    <span className="col-start-1 row-start-1 truncate text-[14px] font-semibold text-[#1c1a4e] sm:col-start-2">{r.bedrijf}</span>
                    <span className={`col-start-2 row-start-1 text-right text-[12.5px] tabular-nums sm:col-start-4 ${r.dagen >= 14 ? "font-semibold text-[#b25e09]" : "text-black/45"}`}>{dagenTekst(r.dagen)}</span>
                    <span className="col-span-2 row-start-2 flex items-center gap-3 sm:contents">
                      <span className="apill justify-self-start !py-0.5 text-[11.5px] sm:col-start-1 sm:row-start-1" style={{ color: info.kleur, background: info.achter }}>{info.label}</span>
                      <span className={`flex items-center gap-1.5 text-[12.5px] sm:col-start-3 sm:row-start-1 ${r.geopend ? "text-[#0b6bcb]" : "text-black/40"}`}>
                        {r.geopend ? <LuEye /> : <LuEyeOff />} {r.geopend ? "geopend" : "nog niet geopend"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {uit.length > ZICHTBAAR_UIT && (
          <p className="border-t border-black/[0.05] px-6 py-3 text-[12.5px] text-black/45">
            En nog {uit.length - ZICHTBAAR_UIT}; per soort staan ze allemaal in de lijst hieronder.
          </p>
        )}
      </section>

      <section aria-labelledby="soorten" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <h2 id="soorten" className="sr-only">Per soort</h2>
        {DOC_VOLGORDE.map((soort) => {
          const info = DOC_SOORTEN[soort];
          const Icoon = ICOON[soort];
          const t = telling[soort];
          return (
            <article key={soort} className="acard flex flex-col gap-4 p-5" data-soort={soort}>
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[20px]" style={{ color: info.kleur, background: info.achter }}><Icoon /></span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[17px] font-bold text-[#1c1a4e]">
                    <Link href={info.lijst} className="hover:text-[#312e82] hover:underline">{info.meervoud}</Link>
                  </h3>
                  <p className="mt-0.5 text-[13px] leading-[1.5] text-black/50">{info.uitleg}</p>
                </div>
                {EXTRA[soort] && (
                  <Link href={EXTRA[soort]!.href} className="ml-auto shrink-0 pt-1 text-[12.5px] font-semibold text-[#312e82] hover:underline">{EXTRA[soort]!.label}</Link>
                )}
              </div>
              <div className="mt-auto space-y-4">
                {fouten[soort] ? (
                  <p className="rounded-[12px] bg-[#fff4e5] px-3 py-2.5 text-[12.5px] text-[#7a4206]">{info.meervoud}: {fouten[soort]}.</p>
                ) : (
                  <dl className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Concept", n: t.concept, kleur: "#1c1a4e" },
                      { label: "Bij klant", n: t.uit, kleur: "#312e82" },
                      { label: info.klaar, n: t.klaar, kleur: "#0a7a4b" },
                    ].map((c) => (
                      <div key={c.label} className="flex flex-col justify-between gap-1 rounded-[12px] bg-[#f6f5fb] px-3 py-2">
                        <dt className="text-[11.5px] font-semibold leading-tight text-black/45">{c.label}</dt>
                        <dd className="font-heading text-[20px] font-bold leading-none tabular-nums" style={{ color: c.kleur }}>{c.n}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={info.nieuw} className="abtn !px-3.5 !py-2 text-[13.5px]"><LuPlus /> Nieuw</Link>
                  <Link href={info.lijst} className="abtn-ghost !px-3.5 !py-2 text-[13.5px]">Alle {info.meervoud.toLowerCase()} <LuArrowRight /></Link>
                </div>
              </div>
            </article>
          );
        })}
        <article className="flex flex-col gap-3 rounded-[16px] border border-dashed border-black/[0.12] p-5" data-soort="reseller">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04] text-[20px] text-black/50"><LuHandshake /></span>
            <div className="min-w-0">
              <h3 className="font-heading text-[17px] font-bold text-[#1c1a4e]">Resellerovereenkomst</h3>
              <p className="mt-0.5 text-[13px] leading-[1.5] text-black/50">Voor partners, niet voor klanten: online tekenen of het getekende exemplaar uploaden staat bij de partner.</p>
            </div>
          </div>
          <div className="mt-auto">
            <Link href="/admin/partners" className="abtn-ghost !px-3.5 !py-2 text-[13.5px]">Naar partners <LuArrowRight /></Link>
          </div>
        </article>
      </section>
    </div>
  );
}
