import Link from "next/link";
import { LuArrowRight, LuCalendarRange, LuInfo, LuPlus, LuTriangleAlert, LuUserRoundCheck, LuUsersRound } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import { collegaBij, kort, naamVan, perFase, periodeTekst, standTekst, TOEQAN_REGEL, voornaamVan } from "@/lib/waarneming";
import { haalOverzicht } from "@/lib/waarnemingDb";
import { inMijnReact2u } from "@/lib/weergave";
import { waarnemingPlannen } from "@/app/admin/waarnemingActions";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import Uitklap from "@/components/admin/Uitklap";
import { PerCollega, WaarnemingKaartje, WaarnemingVelden } from "@/components/admin/waarneming/WaarnemingBits";

/**
 * Waarneming (0060; Rens, 23 nov 2026): wie neemt wie waar als iemand er niet
 * is. Wat nu loopt, wat komt, een eigen knop "Ik ben er even niet", de stand
 * per collega en wat geweest is. Het beheer (recht omzet, in Beheer) ziet wat
 * nog te regelen is en plant ook voor een ander. In Mijn React2u kijkt een
 * beheerder als collega.
 */
export default async function Waarneming() {
  const { sb, admin } = await requirePerm("waarneming");
  const mijn = await inMijnReact2u(admin.permissions);
  const beheer = admin.permissions.includes("omzet") && !mijn;
  const vandaag = datumOver(0);
  const uit = await haalOverzicht(sb, vandaag);

  if (!uit.ok) {
    return (
      <div className="space-y-6">
        <Kop />
        {uit.fout === "migratie" ? (
          <MigratieNodig bestand="0060_waarneming.sql" wat="De waarneming heeft een nieuwe tabel en een nieuw recht nodig." />
        ) : (
          <p className="acard px-6 py-5 text-[14px] text-black/55">De waarneming kon niet geladen worden. Probeer het straks nog eens.</p>
        )}
      </div>
    );
  }

  const { waarnemingen, collegas, klanten } = uit.data;
  const fasen = perFase(waarnemingen, vandaag);
  const ik = collegaBij(admin.userId, collegas, admin.email);
  const teRegelen = beheer ? kort(waarnemingen, admin.userId, vandaag, true).teRegelen : [];
  const afwezigNu = new Set(fasen.actief.map((w) => w.afwezige)).size;
  const kaartje = (w: (typeof waarnemingen)[number]) => <WaarnemingKaartje key={w.id} w={w} collegas={collegas} klanten={klanten} vandaag={vandaag} userId={admin.userId} />;

  return (
    <div className="space-y-6">
      <Kop afwezigNu={afwezigNu} komend={fasen.komend.length} />

      {/* ---------- nog te regelen (beheer) ---------- */}
      {teRegelen.length > 0 && (
        <section className="acard flex flex-wrap items-start gap-4 border-l-[3px] border-l-[#c77700] px-5 py-4" id="waarneming-te-regelen" aria-labelledby="te-regelen-kop">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4e5] text-[18px] text-[#c77700]"><LuTriangleAlert /></span>
          <div className="min-w-[200px] flex-1">
            <h2 id="te-regelen-kop" className="text-[14.5px] font-semibold text-[#1c1a4e]">
              {teRegelen.length === 1 ? "Eén afwezigheid zonder waarnemer" : `${teRegelen.length} afwezigheden zonder waarnemer`}
            </h2>
            <p className="text-[13px] text-black/55">
              Zet er een waarnemer bij, dan weten de klanten en de collega&apos;s bij wie ze terechtkunnen:{" "}
              {teRegelen.slice(0, 3).map((w, n) => (
                <span key={w.id}>{n > 0 ? ", " : ""}<Link href={`/admin/waarneming/${w.id}#wijzigen`} className="font-semibold text-[#312e82] hover:underline">{voornaamVan(collegaBij(w.afwezige, collegas, w.afwezige_email), w.afwezige_email)} {standTekst(w, vandaag)}</Link></span>
              ))}
              {teRegelen.length > 3 ? ` en nog ${teRegelen.length - 3}.` : "."}
            </p>
          </div>
        </section>
      )}

      {/* ---------- nu ---------- */}
      <section id="nu" aria-labelledby="nu-kop" className="space-y-3">
        <h2 id="nu-kop" className="flex items-center gap-2 font-heading text-[17px] font-bold text-[#312e82]"><LuUserRoundCheck className="text-black/35" /> Nu</h2>
        {fasen.actief.length === 0 ? (
          <p className="acard px-6 py-5 text-[14px] text-black/55" id="nu-leeg">Iedereen is er vandaag.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{fasen.actief.map(kaartje)}</div>
        )}
      </section>

      {/* ---------- komend ---------- */}
      <section id="komend" aria-labelledby="komend-kop" className="space-y-3">
        <h2 id="komend-kop" className="flex items-center gap-2 font-heading text-[17px] font-bold text-[#312e82]"><LuCalendarRange className="text-black/35" /> Komend</h2>
        {fasen.komend.length === 0 ? (
          <p className="acard px-6 py-5 text-[14px] text-black/55" id="komend-leeg">Niets gepland. Weet je al dat je er een poos niet bent? Zet het erin, dan kan het beheer op tijd een waarnemer regelen.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{fasen.komend.map(kaartje)}</div>
        )}
      </section>

      {/* ---------- plannen ---------- */}
      <Uitklap id="nieuw" label="Ik ben er even niet">
        <form action={waarnemingPlannen} className="space-y-4">
          <p className="text-[13.5px] text-black/55">
            {beheer ? "Plan je eigen afwezigheid, of regel de waarneming voor een collega." : "Zeg wanneer je er niet bent en wie het werk overneemt. Weet je dat nog niet, dan regelt het beheer het."}
          </p>
          <WaarnemingVelden collegas={collegas} klanten={klanten} afwezige={ik} beheer={beheer} vandaag={vandaag} prefix="nieuw" metKlanten={false} />
          <button className="abtn"><LuPlus /> Plan de waarneming</button>
        </form>
      </Uitklap>

      {/* ---------- per collega ---------- */}
      <section className="acard p-6" id="collegas" aria-labelledby="collegas-kop">
        <h2 id="collegas-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuUsersRound className="text-black/35" /> Per collega</h2>
        <p className="mt-0.5 text-[12.5px] text-black/45">Wie er is, wie er niet is en wie waarneemt. De klanten per collega komen van het veld casemanager op de stamkaart.</p>
        <div className="mt-3"><PerCollega collegas={collegas} klanten={klanten} waarnemingen={waarnemingen} vandaag={vandaag} userId={admin.userId} /></div>
      </section>

      {/* ---------- geweest ---------- */}
      {fasen.voorbij.length > 0 && (
        <details className="acard group" id="geweest">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-[14.5px] font-semibold text-[#1c1a4e]">
            <span>Geweest <span className="font-normal text-black/40">({fasen.voorbij.length})</span></span>
            <LuArrowRight className="text-black/30 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.06]">
            {fasen.voorbij.slice(0, 12).map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-[13.5px] text-black/60">
                <span className="tabular-nums text-black/45">{periodeTekst(w.van, w.tot)}</span>
                <Link href={`/admin/waarneming/${w.id}`} className="font-semibold text-[#1c1a4e] hover:underline">{naamVan(collegaBij(w.afwezige, collegas, w.afwezige_email), w.afwezige_email)}</Link>
                <span className="text-black/35">→</span>
                <span>{w.waarnemer ? naamVan(collegaBij(w.waarnemer, collegas, w.waarnemer_email), w.waarnemer_email) : "geen waarnemer"}</span>
              </li>
            ))}
          </ul>
          {fasen.voorbij.length > 12 && <p className="px-6 py-3 text-[12.5px] text-black/40">De laatste twaalf; ouder dan een jaar wordt niet getoond.</p>}
        </details>
      )}

      <p className="flex items-start gap-2 text-[12.5px] text-black/40">
        <LuInfo className="mt-0.5 shrink-0" aria-hidden />
        <span>{TOEQAN_REGEL} Op de klantenkaart en het klantenbord staat zolang de naam van de waarnemer bij de klant; het CM-overleg ziet wie er de komende weken niet is.</span>
      </p>
    </div>
  );
}

function Kop({ afwezigNu, komend }: { afwezigNu?: number; komend?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Waarneming</h1>
        <p className="text-[14.5px] text-black/50">
          Wie neemt wie waar als iemand er niet is.
          {typeof afwezigNu === "number" && (
            <span className="block text-[13px] text-black/40 sm:ml-2 sm:inline" data-waarneming-kop>
              {afwezigNu === 0 ? "Iedereen is er vandaag" : afwezigNu === 1 ? "1 collega is er vandaag niet" : `${afwezigNu} collega's zijn er vandaag niet`}{komend ? `, ${komend} gepland` : ""}
            </span>
          )}
        </p>
      </div>
      <a href="#nieuw" className="abtn"><LuPlus /> Ik ben er even niet</a>
    </div>
  );
}
