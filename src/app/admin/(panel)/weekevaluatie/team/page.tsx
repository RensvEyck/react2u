import Link from "next/link";
import {
  LuArrowLeft, LuChevronLeft, LuChevronRight, LuCircleDashed, LuDownload, LuLink2, LuMessageSquareText, LuPlus, LuTarget, LuTrash2,
  LuMegaphone, LuSend, LuTrendingDown, LuTrendingUp, LuTriangleAlert, LuUserPlus,
} from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import { oordeel, urenTekst } from "@/lib/uren";
import {
  cijferTekst, keuzeLabel, kwartaalLabel, kwartaalSleutel, kwartaalVanDatum, leesKwartaal, maandKort, MAX_DOELEN, plusKwartalen, SCHALEN,
  schalenZin, TEKSTVRAGEN, trend, trendTekst, vraag, weekKort, weekTitel, wekenInKwartaal, zelfdeKwartaal,
  type Antwoorden, type Keuze, type Kwartaal, type Melding, type Schaal, type SchaalSamenvatting,
} from "@/lib/weekevaluatie";
import { haalKwartaal, type Collega } from "@/lib/weekevaluatieDb";
import { weekevaluatieDoelOpslaan, weekevaluatieDoelVerwijderen } from "@/app/admin/weekevaluatieActions";
import { Kerncijfer, MigratieNodig } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import { OordeelPil } from "@/components/admin/UrenBits";
import ConfirmButton from "@/components/admin/ConfirmButton";

/**
 * Het kwartaaloverzicht van de weekevaluaties (recht `omzet`), opgebouwd als
 * de agenda van de kwartaalmeeting: per collega de doelen en hun voortgang,
 * hoe het ging (gemiddelden en trend tegenover het kwartaal ervoor, de twee
 * zwaarste weken, de signalen), toewijding en groei per maand, waar hij
 * tegenaan liep en welke kennis hij miste, wat hij zelf wil bespreken, zijn
 * terugblik, en dan de nieuwe doelen. Bovenaan het team, met de thema's die
 * samen het opleidingsplan vormen. ?kwartaal=2026-Q4 kiest het kwartaal.
 */

const REEKSEN = [
  { key: "energie", label: "Energie", kleur: KLEUR.aqua },
  { key: "tijd", label: "Werk paste in de tijd", kleur: KLEUR.geel },
  { key: "kennis", label: "Kennis", kleur: KLEUR.violet },
];
const WEEK_SCHALEN = SCHALEN.filter((s) => s.moment === "week");

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
    return { key: w, label: weekKort(w), titel: `${weekTitel(w)} · ${rijen.length} ingevuld`, waarden: { energie: gem("energie"), tijd: gem("tijd"), kennis: gem("kennis") } };
  });
  const verschil = (s: Schaal) => {
    const t = trend(o.team[s].gem, o.teamVorig[s].gem);
    return t === null ? "nog niets om mee te vergelijken" : `${trendTekst(t)} t.o.v. ${kwartaalLabel(o.vorig)}`;
  };
  const dekking = o.verwacht ? Math.round((o.ingevuld / o.verwacht) * 100) : null;
  const scherm = kwartaalSleutel(k);

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
          {o.collegas.length > 1 && (
            <nav className="flex flex-wrap items-center gap-2 text-[13px]" aria-label="Collega's">
              <span className="text-black/45">Naar:</span>
              {o.collegas.map((c) => (
                <a key={c.d.user_id} href={`#collega-${c.d.user_id}`} className="apill bg-white text-[#312e82] ring-1 ring-black/[0.08] hover:ring-[#312e82]/40">{c.naam}</a>
              ))}
            </nav>
          )}

          {o.signalen.length > 0 && (
            <section className="acard flex items-start gap-3 border-l-[3px] border-l-[#c77700] px-6 py-4" aria-labelledby="signalen-kop">
              <LuTriangleAlert className="mt-0.5 shrink-0 text-[17px] text-[#c77700]" />
              <div className="min-w-0 text-[13.5px] text-black/65">
                <h2 id="signalen-kop" className="font-semibold text-[#1c1a4e]">Twee zware weken achter elkaar</h2>
                <ul className="mt-1 space-y-0.5">
                  {o.signalen.map((s) => (
                    <li key={`${s.user_id}-${s.week}`}>
                      <a href={`#collega-${s.user_id}`} className="font-semibold text-[#312e82] hover:underline">{o.collegas.find((c) => c.d.user_id === s.user_id)?.naam}</a>
                      {" "}in {weekKort(plusWeek(s.week, -1))} en {weekKort(s.week)}: een 4 of lager voor {schalenZin(s.schalen)}.
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kerncijfer
              label="Ingevuld"
              waarde={dekking === null ? "–" : `${dekking}%`}
              achter={o.verwacht ? `${o.ingevuld} van ${o.verwacht} weken` : undefined}
              sub={[o.gemist ? `${o.gemist} gemist` : "niets gemist", o.open ? `${o.open} nog open` : ""].filter(Boolean).join(" · ")}
              accent={dekking !== null && dekking >= 90}
            />
            <Kerncijfer label="Energie" waarde={cijferTekst(o.team.energie.gem)} achter={o.team.energie.n ? "gemiddeld" : undefined} sub={verschil("energie")} />
            <Kerncijfer label="Werk paste in de tijd" waarde={cijferTekst(o.team.tijd.gem)} achter={o.team.tijd.n ? "gemiddeld" : undefined} sub={verschil("tijd")} />
            <Kerncijfer label="Kennis" waarde={cijferTekst(o.team.kennis.gem)} achter={o.team.kennis.n ? "gemiddeld" : undefined} sub={verschil("kennis")} />
          </div>

          <section className="acard p-6" aria-labelledby="team-kop">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="team-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Het team per week</h2>
              <p className="text-[12.5px] text-black/40">Gemiddelde over wie die week invulde. {o.collegas.length === 1 ? "Eén collega doet mee." : `${o.collegas.length} collega's doen mee.`}</p>
            </div>
            {o.evaluaties.length === 0 ? (
              <p className="text-[14px] text-black/45">Nog geen weekevaluaties in {kwartaalLabel(k, true)}.</p>
            ) : (
              <Staven titel={`Energie, tijd en kennis per week, ${kwartaalLabel(k)}`} reeksen={REEKSEN} punten={weekPunten} gestapeld={false} formaat={(n) => cijferTekst(n)} minTop={10} hoogte={200} />
            )}
          </section>

          {(o.knelpunten.length > 0 || o.kennis.length > 0) && (
            <section className="acard p-6" aria-labelledby="themas-kop">
              <h2 id="themas-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Waar het team tegenaan liep</h2>
              <p className="mb-4 text-[12.5px] text-black/40">Hoe vaak een thema gekozen is, over alle weken van het kwartaal. De kennis is het begin van het opleidingsplan.</p>
              <div className="grid gap-6 md:grid-cols-2">
                <Telling titel="Knelpunten" lijst={o.knelpunten} leeg="Geen knelpunten gekozen." />
                <Telling titel="Kennis die gemist werd" lijst={o.kennis} leeg="Niemand miste kennis." />
              </div>
            </section>
          )}

          {o.meldingen.length > 0 && (
            <section className="acard p-6" aria-labelledby="meldingen-kop">
              <h2 id="meldingen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuMegaphone /> Gemeld en gedeeld</h2>
              <p className="mb-4 text-[12.5px] text-black/40">Zorgen, ideeën, complimenten en vragen van het team in {kwartaalLabel(k, true)}, nieuwste eerst.</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {o.meldingen.map((m) => (
                  <MeldingKaart key={`${m.user_id}-${m.week}`} m={m} naam={o.collegas.find((c) => c.d.user_id === m.user_id)?.naam} href={`#collega-${m.user_id}`} />
                ))}
              </ul>
            </section>
          )}

          <div className="space-y-6">
            {o.collegas.map((c) => (
              <CollegaKaart key={c.d.user_id} c={c} k={k} vorig={kwartaalLabel(o.vorig)} volgend={o.volgend} scherm={scherm} doelenAan={o.doelenAan} />
            ))}
          </div>

          <p className="text-[12.5px] text-black/40">
            Wat collega&apos;s hier schrijven is persoonlijk en voor het gesprek, nooit voor beoordeling of salaris. Bespreek het in de kwartaalmeeting met de collega zelf; de export is voor de voorbereiding, niet om door te sturen.
          </p>
        </>
      )}
    </div>
  );
}

function plusWeek(week: string, n: number): string {
  return new Date(new Date(`${week}T00:00:00Z`).getTime() + n * 7 * 86_400_000).toISOString().slice(0, 10);
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
        <p className="text-[14.5px] text-black/50">De agenda van de kwartaalmeeting, per collega: doelen, hoe het ging, toewijding, knelpunten, wat hij wil bespreken en de nieuwe doelen.</p>
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

function Telling({ titel, lijst, leeg }: { titel: string; lijst: (Keuze & { aantal: number })[]; leeg: string }) {
  const max = Math.max(1, ...lijst.map((x) => x.aantal));
  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{titel}</p>
      {lijst.length === 0 ? (
        <p className="text-[13.5px] text-black/40">{leeg}</p>
      ) : (
        <ul className="space-y-2">
          {lijst.map((x) => (
            <li key={x.sleutel}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="font-medium text-[#1c1a4e]">{x.label}</span>
                <span className="tabular-nums text-black/50">{x.aantal}×</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.05]"><div className="h-full rounded-full bg-[#6250d6]" style={{ width: `${(x.aantal / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Agendapunt({ n, titel, children }: { n: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-black/[0.06] px-6 py-5">
      <h3 className="mb-3 flex items-center gap-2.5 font-heading text-[15px] font-bold text-[#312e82]">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#312e82] text-[12px] font-bold text-white">{n}</span>
        {titel}
      </h3>
      <div className="sm:pl-[34px]">{children}</div>
    </section>
  );
}

function CollegaKaart({ c, k, vorig, volgend, scherm, doelenAan }: { c: Collega; k: Kwartaal; vorig: string; volgend: Kwartaal; scherm: string; doelenAan: boolean }) {
  const n = c.deelname.ingevuld.length;
  const voornaam = c.naam.split(/\s+/)[0];
  const punten = [...c.evaluaties].sort((a, b) => a.week.localeCompare(b.week)).map((e) => ({
    key: e.week, label: weekKort(e.week), titel: weekTitel(e.week),
    waarden: { energie: e.antwoorden.energie || 0, tijd: e.antwoorden.tijd || 0, kennis: e.antwoorden.kennis || 0 },
  }));
  const perWeek = new Map(c.evaluaties.map((e) => [e.week, e.antwoorden]));
  const u = c.uren;
  const procent = u?.procent ?? null;
  const laatsteWeek = wekenInKwartaal(k).slice(-1)[0];
  const wekenMetTekst = [...c.evaluaties].sort((a, b) => b.week.localeCompare(a.week)).filter((e) => TEKSTVRAGEN.some((t) => e.antwoorden[t.sleutel]));
  return (
    <article className="acard overflow-hidden" id={`collega-${c.d.user_id}`} aria-labelledby={`collega-${c.d.user_id}-kop`}>
      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[15px] font-bold text-[#312e82]">{c.naam[0]?.toUpperCase()}</span>
        <div className="min-w-[180px] flex-1">
          <h2 id={`collega-${c.d.user_id}-kop`} className="font-heading text-[18px] font-bold text-[#1c1a4e]">{c.naam}</h2>
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
            <span className="apill bg-[#fff4e5] text-[#c77700]" title={c.deelname.gemist.map(weekTitel).join(", ")}>gemist: {c.deelname.gemist.map(weekKort).join(", ")}</span>
          )}
          {c.deelname.open.length > 0 && <span className="apill bg-black/[0.05] text-black/55">{c.deelname.open.length === 1 ? "1 week" : `${c.deelname.open.length} weken`} nog open</span>}
          {c.signalen.length > 0 && <span className="apill gap-1 bg-[#fdecea] text-[#b42318]"><LuTriangleAlert className="text-[11px]" /> twee zware weken</span>}
          {u && u.weken > 0 && procent !== null && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-black/50">
              declarabel <OordeelPil procent={procent} oordeel={oordeel(procent, c.medewerker!.norm)} />
              <span className="hidden sm:inline">({urenTekst(u.declarabel)} van {urenTekst(u.beschikbaar)} uur)</span>
            </span>
          )}
        </div>
      </div>

      <Agendapunt n={1} titel={`Doelen voor ${kwartaalLabel(k)}`}>
        {c.doelen.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Geen doelen vastgelegd voor dit kwartaal. Spreek ze af in punt 8.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {c.doelen.map((d) => (
              <li key={d.doel.id} className="rounded-2xl bg-[#fafafd] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-start gap-2 text-[14px] font-semibold text-[#1c1a4e]"><LuTarget className="mt-0.5 shrink-0 text-[14px] text-[#312e82]" /> {d.doel.titel}</p>
                  <span className="shrink-0 text-right">
                    <span className="block font-heading text-[20px] font-bold leading-none tabular-nums text-[#1c1a4e]">{cijferTekst(d.gem)}</span>
                    <span className="text-[11px] text-black/40">voortgang</span>
                  </span>
                </div>
                {d.perWeek.length > 0 ? (
                  <div className="mt-2 flex h-9 items-end gap-1" role="img" aria-label={`Voortgang per week: ${d.perWeek.map((p) => `${weekKort(p.week)} ${p.cijfer}`).join(", ")}`}>
                    {d.perWeek.map((p) => (
                      <span key={p.week} title={`${weekKort(p.week)}: ${p.cijfer}`} className="w-2.5 rounded-t-[3px] bg-[#1baf7a]" style={{ height: `${p.cijfer * 10}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[12.5px] text-black/40">Nog geen voortgang ingevuld.</p>
                )}
                {d.laatste && <p className="mt-2 text-[13px] text-black/60"><span className="text-black/40">{weekKort(d.laatste.week)}:</span> {d.laatste.tekst}</p>}
              </li>
            ))}
          </ul>
        )}
      </Agendapunt>

      <Agendapunt n={2} titel="Hoe ging het">
        {n === 0 ? (
          <p className="text-[13.5px] text-black/45">Nog geen weekevaluatie in dit kwartaal.</p>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WEEK_SCHALEN.map((s) => <SchaalTegel key={s.sleutel} label={s.kort} nu={c.gem[s.sleutel]} vorig={c.gemVorig[s.sleutel]} vorigLabel={vorig} />)}
            </dl>
            <Staven titel={`${c.naam}: energie, tijd en kennis per week`} reeksen={REEKSEN} punten={punten} gestapeld={false} formaat={(x) => cijferTekst(x)} minTop={10} hoogte={140} />
            {(c.zwaarste.length > 0 || c.signalen.length > 0) && (
              <div className="space-y-1.5 text-[13.5px] text-black/60">
                {c.zwaarste.length > 0 && (
                  <p>
                    <span className="font-semibold text-[#1c1a4e]">Zwaarste weken:</span>{" "}
                    {c.zwaarste.map((z) => `${weekKort(z.week)} (${["energie", "tijd", "emotie", "herstel"].map((s) => `${vraag(s as Schaal).kort.toLowerCase()} ${cijferTekst(perWeek.get(z.week)?.[s as Schaal])}`).join(" · ")})`).join("; ")}
                  </p>
                )}
                {c.signalen.map((s) => (
                  <p key={s.week} className="flex items-start gap-1.5 text-[#b42318]"><LuTriangleAlert className="mt-0.5 shrink-0 text-[13px]" /> {weekKort(plusWeek(s.week, -1))} en {weekKort(s.week)}: twee keer een 4 of lager voor {schalenZin(s.schalen)}.</p>
                ))}
              </div>
            )}
            {c.toelichtingen.length > 0 && <Teksten titel="Toelichting bij de cijfers" lijst={c.toelichtingen} />}
          </div>
        )}
      </Agendapunt>

      <Agendapunt n={3} titel="Toewijding en groei, per maand">
        {c.maanden.ingevuld === 0 ? (
          <p className="text-[13.5px] text-black/45">Nog geen maandvragen in dit kwartaal. Die staan in de laatste week van elke maand.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[360px] text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.06]">
                  <th className="py-2 pr-3 text-left font-semibold">Stelling</th>
                  {c.maanden.maanden.map((m) => <th key={m} className="px-2 py-2 text-right font-semibold">{maandKort(m)}</th>)}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {c.maanden.rijen.map((r) => (
                  <tr key={r.sleutel} className="border-b border-black/[0.04]">
                    <td className="py-1.5 pr-3 text-black/65" title={r.label}>{r.kort}</td>
                    {r.waarden.map((w, i) => <td key={i} className={`px-2 py-1.5 text-right ${w !== null && w <= 5 ? "font-semibold text-[#b25e09]" : "text-[#1c1a4e]"}`}>{cijferTekst(w)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {c.maandToelichtingen.length > 0 && <div className="mt-3"><Teksten titel="Toelichting" lijst={c.maandToelichtingen} /></div>}
          </div>
        )}
      </Agendapunt>

      <Agendapunt n={4} titel="Knelpunten, kennis en wat nodig is">
        {c.knelpunten.length === 0 && c.kennis.length === 0 && c.kennisTeksten.length === 0 && c.nodig.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Geen knelpunten, kennisvragen of wensen aangegeven.</p>
        ) : (
          <div className="space-y-3">
            {c.knelpunten.length > 0 && <Chips titel="Liep tegenaan" lijst={c.knelpunten} />}
            {c.kennis.length > 0 && <Chips titel="Miste kennis over" lijst={c.kennis} />}
            {c.kennisTeksten.length > 0 && (
              <ul className="space-y-1 text-[13.5px] text-black/65">
                {c.kennisTeksten.map((t) => <li key={t.week}><span className="text-black/40">{weekKort(t.week)}:</span> {t.tekst}</li>)}
              </ul>
            )}
            {c.nodig.length > 0 && <Teksten titel={`Wat ${voornaam} nodig heeft`} lijst={c.nodig} />}
          </div>
        )}
      </Agendapunt>

      <Agendapunt n={5} titel="Gemeld en gedeeld">
        {c.meldingen.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Niets gemeld of gedeeld in dit kwartaal.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {c.meldingen.map((m) => <MeldingKaart key={m.week} m={m} />)}
          </ul>
        )}
      </Agendapunt>

      <Agendapunt n={6} titel={`Wil ${voornaam} bespreken`}>
        {c.bespreken.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Niets aangevinkt om te bespreken.</p>
        ) : (
          <ul className="space-y-2">
            {c.bespreken.map((b) => (
              <li key={`${b.week}-${b.sleutel}`} className="rounded-xl bg-[#fafafd] px-4 py-3">
                <p className="flex flex-wrap items-center gap-x-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">
                  <LuMessageSquareText className="text-[12px] text-[#312e82]" /> {b.vraag} · {weekKort(b.week)}
                  {b.themas.length > 0 && <span className="normal-case tracking-normal text-[#312e82]">{b.themas.join(" · ")}</span>}
                </p>
                {b.tekst && <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{b.tekst}</p>}
              </li>
            ))}
          </ul>
        )}
      </Agendapunt>

      <Agendapunt n={7} titel="Terugblik op het kwartaal">
        {!c.terugblik ? (
          <p className="text-[13.5px] text-black/45">De terugblik staat in de laatste week van het kwartaal ({weekTitel(laatsteWeek)}).</p>
        ) : (
          <Terugblik a={c.terugblik.antwoorden} />
        )}
      </Agendapunt>

      <Agendapunt n={8} titel={`Doelen voor ${kwartaalLabel(volgend)}`}>
        {!doelenAan ? (
          <p className="text-[13.5px] text-black/45">Doelen vastleggen kan zodra migratie 0045 in Supabase is uitgevoerd.</p>
        ) : (
          <div className="space-y-3">
            {c.doelenVolgend.length > 0 ? (
              <ul className="space-y-1.5">
                {c.doelenVolgend.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#fafafd] px-4 py-2.5">
                    <span className="text-[14px] text-[#1c1a4e]">
                      <span className="font-semibold">{d.titel}</span>
                      {d.toelichting && <span className="block text-[12.5px] text-black/45">{d.toelichting}</span>}
                    </span>
                    <ConfirmButton
                      action={weekevaluatieDoelVerwijderen.bind(null, d.id, c.d.user_id, scherm)}
                      message={`Doel "${d.titel}" verwijderen?`}
                      className="shrink-0 rounded-lg p-1.5 text-black/35 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                    >
                      <LuTrash2 className="text-[14px]" aria-label="Verwijderen" />
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-black/45">Nog geen doelen voor volgend kwartaal. Spreek er één tot drie af; {voornaam} ziet ze vanaf dat kwartaal elke week in de weekevaluatie.</p>
            )}
            {c.doelenVolgend.length < MAX_DOELEN && (
              <form action={weekevaluatieDoelOpslaan} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" id={`doel-${c.d.user_id}`}>
                <input type="hidden" name="user_id" value={c.d.user_id} />
                <input type="hidden" name="scherm" value={scherm} />
                <input type="hidden" name="voor" value={kwartaalSleutel(volgend)} />
                <input name="titel" required maxLength={160} placeholder="Nieuw doel, kort" aria-label={`Nieuw doel voor ${c.naam}`} className="ainput !py-2 text-[14px]" />
                <input name="toelichting" maxLength={1000} placeholder="Waaraan merk je dat het lukt?" aria-label="Toelichting" className="ainput !py-2 text-[14px]" />
                <button className="abtn !py-2 text-[13.5px]"><LuPlus /> Doel toevoegen</button>
              </form>
            )}
          </div>
        )}
      </Agendapunt>

      {wekenMetTekst.length > 0 && (
        <details className="group/tekst border-t border-black/[0.06]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3.5 text-[13.5px] font-semibold text-[#312e82] hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
            <span className="group-open/tekst:hidden">Alle antwoorden van {voornaam} per week ({wekenMetTekst.length} {wekenMetTekst.length === 1 ? "week" : "weken"})</span>
            <span className="hidden group-open/tekst:inline">Verberg de antwoorden</span>
          </summary>
          <ol className="divide-y divide-black/[0.05] border-t border-black/[0.06]">
            {wekenMetTekst.map((e) => (
              <li key={e.week} className="px-6 py-4">
                <p className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                  <span className="font-semibold text-[#1c1a4e]">{weekTitel(e.week)}</span>
                  <span className="tabular-nums text-black/45">{WEEK_SCHALEN.map((s) => `${s.kort.toLowerCase()} ${cijferTekst(e.antwoorden[s.sleutel])}`).join(" · ")}</span>
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {TEKSTVRAGEN.filter((t) => e.antwoorden[t.sleutel]).map((t) => (
                    <div key={t.sleutel} className="rounded-xl bg-[#fafafd] px-4 py-3">
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-black/45">{t.kort}</p>
                      {t.keuzes && e.antwoorden[t.keuzes]?.length ? <p className="mt-0.5 text-[12.5px] text-[#312e82]">{e.antwoorden[t.keuzes]!.map((x) => keuzeLabel(t.keuzes!, x)).join(" · ")}</p> : null}
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
    </article>
  );
}

/** Een vrije tekst per week, nieuwste eerst. */
function Teksten({ titel, lijst }: { titel: string; lijst: { week: string; tekst: string }[] }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{titel}</p>
      <ul className="space-y-1 text-[13.5px] leading-relaxed text-black/65">
        {lijst.map((t) => <li key={t.week} className="whitespace-pre-line"><span className="text-black/40">{weekKort(t.week)}:</span> {t.tekst}</li>)}
      </ul>
    </div>
  );
}

/** Eén melding: de soort, of hij meteen doorgestuurd is, de week en de tekst. */
function MeldingKaart({ m, naam, href }: { m: Melding; naam?: string; href?: string }) {
  const zorg = m.soort === "zorg";
  return (
    <li className={`rounded-2xl px-4 py-3 ${zorg ? "bg-[#fff4e5]" : "bg-[#fafafd]"}`}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-black/50">
        <span className={`inline-flex items-center gap-1 ${zorg ? "text-[#b25e09]" : "text-[#312e82]"}`}><LuMegaphone className="text-[12px]" /> {m.soortLabel}</span>
        <span>· {weekKort(m.week)}</span>
        {naam && href && <a href={href} className="text-[#312e82] hover:underline">· {naam}</a>}
        {m.verstuurd && <span className="apill gap-1 !py-0 !text-[11px] bg-[#e6f7f4] text-[#0e9f8a]"><LuSend className="text-[10px]" /> meteen doorgestuurd</span>}
      </p>
      <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{m.tekst}</p>
    </li>
  );
}

function Chips({ titel, lijst }: { titel: string; lijst: (Keuze & { aantal: number })[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[12.5px] text-black/45">{titel}:</span>
      {lijst.map((x) => (
        <span key={x.sleutel} className="apill bg-[#eef0ff] text-[#312e82]">{x.label} <span className="tabular-nums text-[#312e82]/60">{x.aantal}×</span></span>
      ))}
    </div>
  );
}

function Terugblik({ a }: { a: Antwoorden }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {a.blijven !== undefined && (
        <div className="rounded-xl bg-[#fafafd] px-4 py-3 sm:col-span-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-black/45">Over een jaar nog bij React2u</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={`font-heading text-[22px] font-bold tabular-nums ${a.blijven <= 5 ? "text-[#b25e09]" : "text-[#1c1a4e]"}`}>{a.blijven}</span>
            <span className="text-[12.5px] text-black/40">van 10</span>
          </p>
          {a.blijven_waarom && <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{a.blijven_waarom}</p>}
        </div>
      )}
      {(["kwartaal_hoogtepunt", "kwartaal_anders"] as const).filter((s) => a[s]).map((s) => (
        <div key={s} className="rounded-xl bg-[#fafafd] px-4 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-black/45">{vraag(s).kort}</p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{a[s]}</p>
        </div>
      ))}
    </div>
  );
}

/** Eén schaal: het gemiddelde groot, de trend tegenover het vorige kwartaal, het bereik klein. */
function SchaalTegel({ label, nu, vorig, vorigLabel }: { label: string; nu: SchaalSamenvatting; vorig: SchaalSamenvatting; vorigLabel: string }) {
  const t = trend(nu.gem, vorig.gem);
  return (
    <div className="rounded-2xl bg-[#fafafd] px-4 py-3">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-black/45">{label}</dt>
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
