import Link from "next/link";
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuCircleDashed, LuDownload, LuLink2, LuTrendingDown, LuTrendingUp, LuUserPlus } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { firstName } from "@/lib/dashboard";
import { datumOver } from "@/lib/offertes";
import { oordeel, urenTekst, weekNummer } from "@/lib/uren";
import {
  cijferTekst, kwartaalLabel, kwartaalSleutel, kwartaalVanDatum, leesKwartaal, plusKwartalen, SCHALEN, TEKSTVRAGEN, trend, trendTekst,
  weekTitel, zelfdeKwartaal, type Kwartaal, type Schaal, type SchaalSamenvatting,
} from "@/lib/weekevaluatie";
import { haalKwartaal, type Collega } from "@/lib/weekevaluatieDb";
import { Kerncijfer, MigratieNodig } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import { OordeelPil } from "@/components/admin/UrenBits";

/**
 * Het kwartaaloverzicht van de weekevaluaties (recht `omzet`), voor de
 * kwartaalmeeting: per collega de gemiddelden en de trend per vraag tegenover
 * het kwartaal ervoor, wie welke weken miste, de open antwoorden per week, de
 * declarabele uren ernaast als de collega aan een medewerker gekoppeld is, en
 * de export als Excelbestand. ?kwartaal=2026-Q4 kiest het kwartaal.
 */

const REEKSEN = [
  { key: "energie", label: "Energie", kleur: KLEUR.aqua },
  { key: "werkdruk", label: "Werkdruk", kleur: KLEUR.geel },
  { key: "cijfer", label: "Cijfer", kleur: KLEUR.violet },
];

export default async function Team({ searchParams }: { searchParams: Promise<{ kwartaal?: string }> }) {
  const { sb } = await requirePerm("omzet");
  const vandaag = datumOver(0);
  const nu = kwartaalVanDatum(vandaag);
  const k = leesKwartaal((await searchParams).kwartaal) ?? nu;
  const o = await haalKwartaal(sb, k, vandaag);
  if (!o) {
    return (
      <div className="space-y-6">
        <Kop k={k} nu={nu} />
        <MigratieNodig bestand="0044_weekevaluatie.sql" wat="Het kwartaaloverzicht heeft de tabel weekevaluaties en de functie weekevaluatie_deelnemers nodig." />
      </div>
    );
  }

  const weekPunten = o.verstreken.map((w) => {
    const rijen = o.evaluaties.filter((e) => e.week === w);
    const gem = (s: Schaal) => {
      const v = rijen.map((e) => e.antwoorden[s]).filter((x): x is number => typeof x === "number");
      return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
    };
    return { key: w, label: `wk ${weekNummer(w).week}`, titel: `${weekTitel(w)} · ${rijen.length} ingevuld`, waarden: { energie: gem("energie"), werkdruk: gem("werkdruk"), cijfer: gem("cijfer") } };
  });
  const verschil = (s: Schaal) => {
    const t = trend(o.team[s].gem, o.teamVorig[s].gem);
    return t === null ? undefined : `${trendTekst(t)} t.o.v. ${kwartaalLabel(o.vorig)}`;
  };
  const dekking = o.verwacht ? Math.round((o.ingevuld / o.verwacht) * 100) : null;

  return (
    <div className="space-y-6">
      <Kop k={k} nu={nu} />

      {o.collegas.length === 0 ? (
        <div className="acard flex flex-col items-center px-8 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuUserPlus /></span>
          <h2 className="mt-4 font-heading text-[20px] font-bold text-[#312e82]">Nog niemand doet mee</h2>
          <p className="mt-1.5 max-w-[460px] text-[14.5px] text-black/50">
            Nodig een collega uit met de rol <strong className="font-semibold text-[#1c1a4e]">Werknemer</strong>, of geef een bestaande rol het recht Weekevaluatie.
            Daarna verschijnen hier de cijfers per kwartaal.
          </p>
          <Link href="/admin/gebruikers" className="abtn mt-6">Naar Gebruikers</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kerncijfer
              label="Ingevuld"
              waarde={dekking === null ? "–" : `${dekking}%`}
              achter={o.verwacht ? `${o.ingevuld} van ${o.verwacht} weken` : undefined}
              sub={[o.gemist ? `${o.gemist} gemist` : "niets gemist", o.open ? `${o.open} nog open` : ""].filter(Boolean).join(" · ")}
              accent={dekking !== null && dekking >= 90}
            />
            <Kerncijfer label="Cijfer voor de week" waarde={cijferTekst(o.team.cijfer.gem)} achter={o.team.cijfer.n ? `gemiddeld, ${o.team.cijfer.n}×` : undefined} sub={verschil("cijfer") ?? "nog niets om mee te vergelijken"} />
            <Kerncijfer label="Energie" waarde={cijferTekst(o.team.energie.gem)} achter={o.team.energie.n ? "gemiddeld" : undefined} sub={verschil("energie") ?? "nog niets om mee te vergelijken"} />
            <Kerncijfer label="Werkdruk te doen" waarde={cijferTekst(o.team.werkdruk.gem)} achter={o.team.werkdruk.n ? "gemiddeld" : undefined} sub={verschil("werkdruk") ?? "nog niets om mee te vergelijken"} />
          </div>

          <section className="acard p-6" aria-labelledby="team-kop">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="team-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Het team per week</h2>
              <p className="text-[12.5px] text-black/40">Gemiddelde over wie die week invulde. {o.collegas.length === 1 ? "Eén collega doet mee." : `${o.collegas.length} collega's doen mee.`}</p>
            </div>
            {o.evaluaties.length === 0 ? (
              <p className="text-[14px] text-black/45">Nog geen weekevaluaties in {kwartaalLabel(k, true)}.</p>
            ) : (
              <Staven titel={`Energie, werkdruk en cijfer per week, ${kwartaalLabel(k)}`} reeksen={REEKSEN} punten={weekPunten} gestapeld={false} formaat={(n) => cijferTekst(n)} minTop={10} hoogte={200} />
            )}
          </section>

          <div className="space-y-6">
            {o.collegas.map((c) => <CollegaKaart key={c.d.user_id} c={c} vorig={kwartaalLabel(o.vorig)} />)}
          </div>

          <p className="text-[12.5px] text-black/40">
            Wat collega&apos;s hier schrijven is persoonlijk. Bespreek het in de kwartaalmeeting met de collega zelf; de export is voor de voorbereiding, niet om door te sturen.
          </p>
        </>
      )}
    </div>
  );
}

function Kop({ k, nu }: { k: Kwartaal; nu: Kwartaal }) {
  const href = (q: Kwartaal) => (zelfdeKwartaal(q, nu) ? "/admin/weekevaluatie/team" : `/admin/weekevaluatie/team?kwartaal=${kwartaalSleutel(q)}`);
  const isNu = zelfdeKwartaal(k, nu);
  const toekomst = k.jaar * 4 + k.kwartaal > nu.jaar * 4 + nu.kwartaal;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/admin/weekevaluatie" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft className="text-[13px]" /> Mijn weekevaluatie</Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Weekevaluaties van het team</h1>
        <p className="text-[14.5px] text-black/50">Per kwartaal, voor de kwartaalmeeting: gemiddelden, trends, wat er geschreven is en wie welke week miste.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex items-center gap-1" aria-label="Kwartaal">
          <Link href={href(plusKwartalen(k, -1))} className="abtn-ghost !px-2.5 !py-1.5 text-[13px]" aria-label="Vorig kwartaal"><LuChevronLeft /></Link>
          <span className="min-w-[96px] text-center text-[14px] font-semibold text-[#1c1a4e]" aria-current="page">{kwartaalLabel(k)}{isNu ? <span className="block text-[11px] font-medium text-black/40">dit kwartaal</span> : null}</span>
          <Link href={href(plusKwartalen(k, 1))} className={`abtn-ghost !px-2.5 !py-1.5 text-[13px] ${toekomst || isNu ? "pointer-events-none opacity-50" : ""}`} aria-label="Volgend kwartaal" aria-disabled={toekomst || isNu}><LuChevronRight /></Link>
        </nav>
        <a href={`/admin/weekevaluatie/team/export?kwartaal=${kwartaalSleutel(k)}`} className="abtn-ghost !py-2 text-[13.5px]" download>
          <LuDownload className="text-[14px]" /> Export {kwartaalLabel(k)}
        </a>
      </div>
    </div>
  );
}

function CollegaKaart({ c, vorig }: { c: Collega; vorig: string }) {
  const n = c.deelname.ingevuld.length;
  const wekenMetTekst = c.evaluaties.filter((e) => TEKSTVRAGEN.some((t) => e.antwoorden[t.sleutel])).sort((a, b) => b.week.localeCompare(a.week));
  const punten = c.evaluaties.length
    ? [...c.evaluaties].sort((a, b) => a.week.localeCompare(b.week)).map((e) => ({
        key: e.week, label: `wk ${weekNummer(e.week).week}`, titel: weekTitel(e.week),
        waarden: { energie: e.antwoorden.energie || 0, werkdruk: e.antwoorden.werkdruk || 0, cijfer: e.antwoorden.cijfer || 0 },
      }))
    : [];
  const u = c.uren;
  const procent = u?.procent ?? null;
  // Zonder koppeling aan een medewerker kennen we alleen het e-mailadres; de voornaam daaruit leest prettiger.
  const titel = c.medewerker ? c.naam : firstName(c.d.email) ?? c.d.email;
  const voornaam = titel.split(/\s+/)[0];
  return (
    <section className="acard overflow-hidden" id={`collega-${c.d.user_id}`} aria-labelledby={`collega-${c.d.user_id}-kop`}>
      <div className="flex flex-wrap items-center gap-4 border-b border-black/[0.06] px-6 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[15px] font-bold text-[#312e82]">{titel[0]?.toUpperCase()}</span>
        <div className="min-w-[180px] flex-1">
          <h2 id={`collega-${c.d.user_id}-kop`} className="font-heading text-[17px] font-bold text-[#1c1a4e]">{titel}</h2>
          <p className="text-[12.5px] text-black/45">
            {[c.medewerker?.functie, c.medewerker ? null : c.d.email].filter(Boolean).join(" · ")}
            {!c.medewerker && (
              <> · <Link href="/admin/omzet/uren#medewerkers" className="inline-flex items-center gap-1 font-semibold text-[#312e82] hover:underline"><LuLink2 className="text-[11px]" /> koppel aan een medewerker</Link> voor de uren</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`apill ${c.deelname.verwacht && n === c.deelname.verwacht ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#eef0ff] text-[#312e82]"}`}>
            {n} van {c.deelname.verwacht} {c.deelname.verwacht === 1 ? "week" : "weken"} ingevuld
          </span>
          {c.deelname.gemist.length > 0 && (
            <span className="apill bg-[#fff4e5] text-[#c77700]" title={c.deelname.gemist.map(weekTitel).join(", ")}>
              gemist: {c.deelname.gemist.map((w) => `wk ${weekNummer(w).week}`).join(", ")}
            </span>
          )}
          {c.deelname.open.length > 0 && <span className="apill bg-black/[0.05] text-black/55">{c.deelname.open.length === 1 ? "1 week" : `${c.deelname.open.length} weken`} nog open</span>}
          {u && u.weken > 0 && procent !== null && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-black/50">
              declarabel <OordeelPil procent={procent} oordeel={oordeel(procent, c.medewerker!.norm)} />
              <span className="hidden sm:inline">({urenTekst(u.declarabel)} van {urenTekst(u.beschikbaar)} uur)</span>
            </span>
          )}
        </div>
      </div>

      {n === 0 ? (
        <p className="px-6 py-5 text-[14px] text-black/45">Nog geen weekevaluatie in dit kwartaal.</p>
      ) : (
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {SCHALEN.map((s) => <SchaalTegel key={s.sleutel} label={s.kort} nu={c.gem[s.sleutel]} vorig={c.gemVorig[s.sleutel]} vorigLabel={vorig} />)}
          </dl>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Per week</p>
            <Staven titel={`${titel}: energie, werkdruk en cijfer per week`} reeksen={REEKSEN} punten={punten} gestapeld={false} formaat={(x) => cijferTekst(x)} minTop={10} hoogte={140} />
          </div>
        </div>
      )}

      {wekenMetTekst.length > 0 && (
        <details className="group/tekst border-t border-black/[0.06]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3.5 text-[13.5px] font-semibold text-[#312e82] hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
            <span className="group-open/tekst:hidden">Lees wat {voornaam} schreef ({wekenMetTekst.length} {wekenMetTekst.length === 1 ? "week" : "weken"})</span>
            <span className="hidden group-open/tekst:inline">Verberg de antwoorden</span>
          </summary>
          <ol className="divide-y divide-black/[0.05] border-t border-black/[0.06]">
            {wekenMetTekst.map((e) => (
              <li key={e.week} className="px-6 py-4">
                <p className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                  <span className="font-semibold text-[#1c1a4e]">{weekTitel(e.week)}</span>
                  <span className="tabular-nums text-black/45">
                    {SCHALEN.map((s) => `${s.kort.toLowerCase()} ${cijferTekst(e.antwoorden[s.sleutel])}`).join(" · ")}
                  </span>
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {TEKSTVRAGEN.filter((t) => e.antwoorden[t.sleutel]).map((t) => (
                    <div key={t.sleutel} className="rounded-xl bg-[#fafafd] px-4 py-3">
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-black/45">{t.kort}</p>
                      <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{e.antwoorden[t.sleutel]}</p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}
      {n > 0 && wekenMetTekst.length === 0 && (
        <p className="flex items-center gap-2 border-t border-black/[0.06] px-6 py-3 text-[13px] text-black/40"><LuCircleDashed /> Alleen cijfers, nog geen tekst in dit kwartaal.</p>
      )}
    </section>
  );
}

/** Eén schaal: het gemiddelde groot, de trend tegenover het vorige kwartaal, het bereik klein. */
function SchaalTegel({ label, nu, vorig, vorigLabel }: { label: string; nu: SchaalSamenvatting; vorig: SchaalSamenvatting; vorigLabel: string }) {
  const t = trend(nu.gem, vorig.gem);
  return (
    <div className="rounded-2xl bg-[#fafafd] px-4 py-3">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-[24px] font-bold leading-none tabular-nums text-[#1c1a4e]">{cijferTekst(nu.gem)}</span>
        {t !== null && (
          <span className={`inline-flex items-center gap-0.5 text-[12.5px] font-semibold tabular-nums ${t > 0 ? "text-[#0a7a4b]" : t < 0 ? "text-[#b25e09]" : "text-black/40"}`} title={`${trendTekst(t)} t.o.v. ${vorigLabel} (${cijferTekst(vorig.gem)})`}>
            {t > 0 ? <LuTrendingUp className="text-[12px]" /> : t < 0 ? <LuTrendingDown className="text-[12px]" /> : null}
            {trendTekst(t)}
          </span>
        )}
      </dd>
      <dd className="mt-0.5 text-[11.5px] text-black/40">
        {nu.n ? `${nu.laagste === nu.hoogste ? `steeds ${nu.laagste}` : `${nu.laagste} tot ${nu.hoogste}`} · ${nu.n}×` : "geen cijfer"}
        {t === null && vorig.gem !== null ? ` · ${vorigLabel}: ${cijferTekst(vorig.gem)}` : ""}
      </dd>
    </div>
  );
}
