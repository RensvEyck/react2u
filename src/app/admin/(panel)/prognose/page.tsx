import Link from "next/link";
import { LuCalendarClock, LuCircleAlert, LuCircleCheck, LuHeartPulse, LuSlidersHorizontal, LuUserPlus, LuUsers } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { maandNaam } from "@/lib/omzet";
import { datumLang } from "@/lib/offertes";
import {
  draagkracht, EENMALIGE_VORMEN, fteTekst, isCasemanager, maandLang, vormLabel,
  type Bijdrage, type Draagkracht, type StartBron,
} from "@/lib/prognose";
import { haalPrognose, MAANDEN_VOORUIT, type PrognoseData } from "@/lib/prognoseDb";
import { cijferTekst } from "@/lib/weekevaluatie";
import { prognoseNormenOpslaan } from "@/app/admin/prognoseActions";
import { Kerncijfer } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import PrognoseAanvullen from "@/components/admin/PrognoseAanvullen";

/**
 * Prognose van de werkdruk (migratie 0049, recht `omzet`): hoeveel werknemers
 * React2u de komende twaalf maanden begeleidt, hoeveel fte casemanagement dat
 * vraagt en hoe dat zich verhoudt tot de bezetting, met wanneer je moet
 * werven. Daarnaast wat de casemanagers zelf in hun weekevaluatie zeggen, per
 * maand en per persoon naast hun portefeuille. Rekenregels in lib/prognose.ts.
 *
 * ?extra=1&vanaf=2027-03 rekent met een extra collega vanaf een maand,
 * ?kans=50 met een andere kans op de pijplijn; niets wordt opgeslagen.
 */

const nl = (n: number) => n.toLocaleString("nl-NL");

const START: Record<StartBron, string> = {
  offerte: "ingangsdatum offerte",
  kaart: "startdatum op de kaart",
  contract: "ingangsdatum contract",
  getekend: "tekenen plus inrichting",
  verwacht: "verwacht",
  loopt: "loopt al",
};

const DRAAG: Record<Draagkracht, { tekst: string; cls: string }> = {
  krap: { tekst: "krap", cls: "bg-[#fdecea] text-[#b42318]" },
  redelijk: { tekst: "redelijk", cls: "bg-[#fff4e5] text-[#b25e09]" },
  ruim: { tekst: "ruim", cls: "bg-[#e3f6ed] text-[#0a7a4b]" },
};

export default async function Prognose({ searchParams }: { searchParams: Promise<{ extra?: string; vanaf?: string; kans?: string }> }) {
  const { sb, admin } = await requirePerm("omzet");
  const q = await searchParams;
  const extra = Number(String(q.extra ?? "").replace(",", "."));
  const vanaf = /^\d{4}-\d{2}$/.test(q.vanaf ?? "") ? q.vanaf! : null;
  const kansQ = Number(q.kans);
  const scenario = Number.isFinite(extra) && extra > 0 && extra <= 20 ? { extraFte: Math.round(extra * 10) / 10, vanaf } : undefined;
  const kansOverride = Number.isFinite(kansQ) && q.kans && kansQ >= 0 && kansQ <= 100 ? Math.round(kansQ) : null;
  const d = await haalPrognose(sb, scenario, kansOverride);
  const kanSales = admin.permissions.includes("bellijst");

  const nu = d.maanden[0];
  const over3 = d.maanden[3];
  const grootste = d.norm ? [...d.maanden].sort((a, b) => (a.ruimte ?? 0) - (b.ruimte ?? 0))[0] : null;
  const draag = draagkracht(d.recentTijd.gem);
  const scenarioActief = Boolean(scenario || kansOverride !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Prognose</h1>
          <p className="max-w-[720px] text-[14.5px] text-black/50">
            Hoeveel casemanagers je de komende twaalf maanden nodig hebt, uit de klanten, de getekende offertes en de pijplijn, naast wat de casemanagers zelf in hun weekevaluatie zeggen.
          </p>
        </div>
        <a href="#normen" className="abtn-ghost !py-2 text-[13.5px]"><LuSlidersHorizontal className="text-[14px]" /> Normen</a>
      </div>

      <AdviesBlok d={d} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kerncijfer
          label="Werknemers nu"
          waarde={nl(nu.werknemersZeker)}
          achter={`bij ${d.bijdragen.filter((b) => b.soort === "lopend").length} klanten`}
          sub={d.huidig.zonderAantal ? `${d.huidig.zonderAantal} klant${d.huidig.zonderAantal === 1 ? "" : "en"} zonder aantal, telt als 0` : "van alle lopende klanten bekend"}
        />
        <Kerncijfer
          label="Bezetting casemanagement"
          waarde={`${fteTekst(d.bezetting)} fte`}
          sub={d.norm ? `1 fte op ${nl(d.norm)} werknemers${d.normBron === "afgeleid" ? ", de huidige verhouding" : ""}` : "nog zonder norm"}
        />
        <Kerncijfer
          label={`Nodig in ${maandNaam(over3.maand)}`}
          waarde={d.norm ? `${fteTekst(over3.nodigVerwacht)} fte` : `${nl(over3.werknemersVerwacht)}`}
          achter={d.norm ? undefined : "werknemers"}
          sub={d.norm ? `zeker ${fteTekst(over3.nodigZeker)}, met pijplijn ${fteTekst(over3.nodigVerwacht)}` : `zeker ${nl(over3.werknemersZeker)}, met pijplijn ${nl(over3.werknemersVerwacht)}`}
        />
        <Kerncijfer
          label="Werkdruk volgens het team"
          waarde={cijferTekst(d.recentTijd.gem)}
          achter={d.recentTijd.n ? "werk paste in de tijd" : undefined}
          sub={d.recentTijd.n ? `${draag ? DRAAG[draag].tekst : ""} · energie ${cijferTekst(d.recentEnergie.gem)} · laatste vier weken, ${d.recentTijd.n}×` : "nog geen weekevaluaties van casemanagers"}
          href="/admin/weekevaluatie/team"
        />
      </div>

      <section className="acard p-6" aria-labelledby="grafiek-kop">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="grafiek-kop" className="font-heading text-[16px] font-bold text-[#312e82]">
            {d.norm ? "Nodig tegenover de bezetting" : "Werknemers onder contract"}, komende {MAANDEN_VOORUIT} maanden
          </h2>
          {scenarioActief && <span className="apill bg-[#eef0ff] text-[#312e82]">met een scenario</span>}
        </div>
        {d.norm ? (
          <Staven
            titel="Benodigde fte casemanagement tegenover de bezetting, per maand"
            reeksen={[
              { key: "zeker", label: "Nodig, zeker", kleur: KLEUR.violet },
              { key: "verwacht", label: "Nodig, met pijplijn", kleur: KLEUR.geel },
              { key: "bezetting", label: "Bezetting", kleur: KLEUR.aqua },
            ]}
            punten={d.maanden.map((m) => ({ key: m.maand, label: maandNaam(m.maand), titel: maandLang(m.maand), waarden: { zeker: m.nodigZeker ?? 0, verwacht: m.nodigVerwacht ?? 0, bezetting: m.bezetting } }))}
            gestapeld={false}
            formaat={(n) => `${fteTekst(n)}`}
            minTop={2}
            hoogte={210}
          />
        ) : (
          <>
            <Staven
              titel="Werknemers onder contract per maand"
              reeksen={[
                { key: "zeker", label: "Lopend en getekend", kleur: KLEUR.violet },
                { key: "pijplijn", label: "Pijplijn, gewogen", kleur: KLEUR.geel },
              ]}
              punten={d.maanden.map((m) => ({ key: m.maand, label: maandNaam(m.maand), titel: maandLang(m.maand), waarden: { zeker: m.werknemersZeker, pijplijn: m.werknemersVerwacht - m.werknemersZeker } }))}
              formaat={(n) => nl(Math.round(n))}
              hoogte={210}
            />
            <p className="mt-3 text-[13px] text-black/50">Zodra elke lopende klant een aantal werknemers heeft, of je de norm per fte instelt, rekent dit scherm het om naar casemanagers.</p>
          </>
        )}
        <details className="group/tabel mt-4">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#312e82] [&::-webkit-details-marker]:hidden">
            <span className="group-open/tabel:hidden">Per maand: wie erbij komt en wat het vraagt</span>
            <span className="hidden group-open/tabel:inline">Verberg per maand</span>
          </summary>
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]" id="prognose-per-maand">
              <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.06]">
                  <th className="py-2 pr-3 font-semibold">Maand</th>
                  <th className="px-2 py-2 text-right font-semibold">Werknemers</th>
                  <th className="px-2 py-2 text-right font-semibold">Met pijplijn</th>
                  <th className="px-2 py-2 text-right font-semibold">Eenmalig</th>
                  <th className="px-2 py-2 text-right font-semibold">Nodig</th>
                  <th className="px-2 py-2 text-right font-semibold">Bezetting</th>
                  <th className="py-2 pl-3 font-semibold">Erbij</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.maanden.map((m) => (
                  <tr key={m.maand} className="border-b border-black/[0.04] align-top">
                    <td className="py-1.5 pr-3 text-black/60">{maandLang(m.maand)}</td>
                    <td className="px-2 py-1.5 text-right text-[#1c1a4e]">{nl(m.werknemersZeker)}</td>
                    <td className="px-2 py-1.5 text-right text-[#1c1a4e]">{nl(m.werknemersVerwacht)}</td>
                    <td className="px-2 py-1.5 text-right text-black/60">{m.inrichtingUren + m.eenmaligUren ? `${m.inrichtingUren + m.eenmaligUren} uur` : "–"}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-[#1c1a4e]">{!d.norm ? "–" : fteTekst(m.nodigZeker) === fteTekst(m.nodigVerwacht) ? fteTekst(m.nodigZeker) : `${fteTekst(m.nodigZeker)} – ${fteTekst(m.nodigVerwacht)}`}</td>
                    <td className={`px-2 py-1.5 text-right ${m.ruimte !== null && m.ruimte < 0 ? "font-semibold text-[#b42318]" : "text-[#1c1a4e]"}`}>{fteTekst(m.bezetting)}</td>
                    <td className="py-1.5 pl-3 text-black/60">{m.nieuweKlanten.map((k) => `${k.bedrijf}${k.kans < 1 ? ` (${Math.round(k.kans * 100)}%)` : ""}`).join(", ") || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {grootste && grootste.ruimte !== null && grootste.ruimte < 0 && (
          <p className="mt-3 text-[12.5px] text-black/45">Grootste tekort: {fteTekst(-grootste.ruimte)} fte in {maandLang(grootste.maand)}, met de pijplijn erbij.</p>
        )}
      </section>

      <Werkdruk d={d} />

      <section className="acard p-6" aria-labelledby="scenario-kop">
        <h2 id="scenario-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Wat als</h2>
        <p className="mb-4 text-[12.5px] text-black/40">Reken met een extra collega of een andere kans op de pijplijn. Er wordt niets opgeslagen.</p>
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <label>
            <span className="alabel">Extra fte</span>
            <input name="extra" inputMode="decimal" defaultValue={scenario ? String(scenario.extraFte).replace(".", ",") : ""} placeholder="bijvoorbeeld 1" className="ainput !py-2 text-[14px]" />
          </label>
          <label>
            <span className="alabel">Vanaf</span>
            <select name="vanaf" defaultValue={vanaf ?? ""} className="ainput !py-2 text-[14px]">
              <option value="">nu</option>
              {d.maanden.slice(1).map((m) => <option key={m.maand} value={m.maand}>{maandLang(m.maand)}</option>)}
            </select>
          </label>
          <label>
            <span className="alabel">Kans pijplijn (%)</span>
            <input name="kans" inputMode="numeric" defaultValue={kansOverride ?? ""} placeholder={String(d.kans)} className="ainput !py-2 text-[14px]" />
          </label>
          <div className="flex items-end gap-2">
            <button className="abtn !py-2 text-[14px]">Doorrekenen</button>
            {scenarioActief && <Link href="/admin/prognose" className="abtn-ghost !py-2 text-[13.5px]">Wissen</Link>}
          </div>
        </form>
      </section>

      <Bronnen d={d} />

      {(d.zonderAantal.length > 0 || d.zonderCasemanager.length > 0 || d.zonderIngang.length > 0) && (
        <section className="acard p-6" id="aanvullen" aria-labelledby="aanvullen-kop">
          <h2 id="aanvullen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuCircleAlert className="text-[#c77700]" /> Maak de prognose scherper</h2>
          <p className="mb-4 text-[12.5px] text-black/40">Wat hier ontbreekt, telt nu als nul of als een schatting. Eén keer aanvullen is genoeg; het komt op de stamkaart.</p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {d.zonderAantal.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Aantal werknemers ({d.zonderAantal.length})</p>
                <PrognoseAanvullen veld="medewerkers" kanBewerken={kanSales} rijen={d.zonderAantal.map((b) => ({ klantId: b.klantId!, bedrijf: b.bedrijf, voorstel: b.voorstel ? String(b.voorstel) : "" }))} />
              </div>
            )}
            {d.zonderCasemanager.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Casemanager ({d.zonderCasemanager.length})</p>
                <PrognoseAanvullen
                  veld="casemanager"
                  kanBewerken={kanSales}
                  namen={d.medewerkers.filter(isCasemanager).map((m) => m.naam)}
                  rijen={d.zonderCasemanager.map((b) => ({ klantId: b.klantId!, bedrijf: b.bedrijf, voorstel: "" }))}
                />
              </div>
            )}
            {d.zonderIngang.length > 0 && (
              <div className="lg:col-span-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Getekend, zonder ingangsdatum op de offerte ({d.zonderIngang.length})</p>
                <ul className="mt-1 divide-y divide-black/[0.05]">
                  {d.zonderIngang.map((b) => (
                    <li key={b.sleutel} className="flex flex-wrap items-center gap-3 py-2 text-[13.5px]">
                      <span className="min-w-[160px] flex-1 font-semibold text-[#1c1a4e]">{b.bedrijf}</span>
                      <span className="text-black/50">rekent nu met {b.start ? datumLang(b.start) : "–"} ({START[b.startBron]})</span>
                      {b.offerteId && <Link href={`/admin/offertes/${b.offerteId}`} className="font-semibold text-[#312e82] hover:underline">Ingangsdatum zetten</Link>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <Normen d={d} />
    </div>
  );
}

function AdviesBlok({ d }: { d: PrognoseData }) {
  const a = d.advies;
  if (a.soort === "geen-norm") {
    return (
      <div className="acard flex items-start gap-3 border-l-[3px] border-l-[#c77700] px-6 py-4">
        <LuCircleAlert className="mt-0.5 shrink-0 text-[17px] text-[#c77700]" />
        <div className="text-[14px] text-black/65">
          <p className="font-semibold text-[#1c1a4e]">Nog geen advies over het aantal casemanagers</p>
          <p className="mt-0.5">
            {d.huidig.zonderAantal
              ? `Van ${d.huidig.zonderAantal} lopende klant${d.huidig.zonderAantal === 1 ? "" : "en"} weet het systeem het aantal werknemers niet. Vul dat aan, dan rekent het de huidige verhouding uit; of stel zelf in hoeveel werknemers één casemanager aankan.`
              : "Er zijn nog geen casemanagers met contracturen, of geen werknemers onder contract. Zet de casemanagers in Omzet → Uren, of stel de norm zelf in."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[13px] font-semibold">
            {d.huidig.zonderAantal > 0 && <a href="#aanvullen" className="text-[#312e82] hover:underline">Aantallen aanvullen</a>}
            <a href="#normen" className="text-[#312e82] hover:underline">Norm instellen</a>
          </div>
        </div>
      </div>
    );
  }
  if (a.soort === "ruimte") {
    return (
      <div className="acard flex items-start gap-3 border-l-[3px] border-l-[#0e9f8a] px-6 py-4">
        <LuCircleCheck className="mt-0.5 shrink-0 text-[17px] text-[#0e9f8a]" />
        <div className="text-[14px] text-black/65">
          <p className="font-semibold text-[#1c1a4e]">De bezetting is genoeg voor de komende {MAANDEN_VOORUIT} maanden</p>
          <p className="mt-0.5">Ook met de pijplijn erbij en een kwart fte speling. {d.recentTijd.gem !== null && draagkracht(d.recentTijd.gem) === "krap" ? "Maar de casemanagers zeggen zelf dat het werk niet in de tijd past; kijk hieronder bij de werkdruk." : ""}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="acard flex items-start gap-3 border-l-[3px] border-l-[#e75387] px-6 py-4">
      <LuUserPlus className="mt-0.5 shrink-0 text-[17px] text-[#e75387]" />
      <div className="text-[14px] text-black/65">
        <p className="font-semibold text-[#1c1a4e]">
          Begin uiterlijk in {maandLang(a.uiterlijk)} met werven: vanaf {maandLang(a.maand)} is er {fteTekst(a.tekort)} fte te weinig
        </p>
        <p className="mt-0.5">
          {a.zeker ? "Dat volgt al uit de lopende en getekende klanten, zonder de pijplijn." : "Dat geldt als de pijplijn tekent zoals verwacht; met alleen de zekere klanten is het nog genoeg."} Met {d.normen.wervingsMaanden} maanden voor werven en inwerken.
        </p>
      </div>
    </div>
  );
}

function Werkdruk({ d }: { d: PrognoseData }) {
  const draag = draagkracht(d.recentTijd.gem);
  const metData = d.gemetenCasemanagers.some((g) => g.n > 0);
  return (
    <section className="acard overflow-hidden" aria-labelledby="werkdruk-kop">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h2 id="werkdruk-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuHeartPulse /> Werkdruk volgens de weekevaluaties</h2>
        <p className="text-[12.5px] text-black/40">Wat de casemanagers zelf invullen, als controle op de prognose. Die rekent met verhoudingen; de weekevaluatie zegt of die verhouding te dragen is.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          {!d.weekevaluatiesAan ? (
            <p className="text-[13.5px] text-black/45">De weekevaluatie staat nog niet aan.</p>
          ) : !metData ? (
            <p className="text-[13.5px] text-black/45">Nog geen weekevaluaties van casemanagers. Zodra ze invullen, staat hier per maand hoe het werk in de tijd paste en hoeveel energie ze hadden.</p>
          ) : (
            <Staven
              titel="Werk paste in de tijd en energie per maand, casemanagers"
              reeksen={[{ key: "tijd", label: "Werk paste in de tijd", kleur: KLEUR.geel }, { key: "energie", label: "Energie", kleur: KLEUR.aqua }]}
              punten={d.gemetenCasemanagers.map((g) => ({ key: g.maand, label: maandNaam(g.maand), titel: `${maandLang(g.maand)} · ${g.n} evaluaties`, waarden: { tijd: g.tijd ?? 0, energie: g.energie ?? 0 } }))}
              gestapeld={false}
              formaat={(n) => cijferTekst(n)}
              minTop={10}
              hoogte={150}
            />
          )}
          {draag && d.norm && (
            <p className={`mt-4 rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${draag === "krap" ? "bg-[#fdecea] text-[#7a1d14]" : draag === "redelijk" ? "bg-[#fff4e5] text-[#7a4206]" : "bg-[#e3f6ed] text-[#0a5a37]"}`}>
              {draag === "krap"
                ? `Bij 1 fte op ${nl(d.norm)} werknemers geven de casemanagers gemiddeld een ${cijferTekst(d.recentTijd.gem)} voor "werk paste in de tijd". Dat is krap: de prognose rekent dan te optimistisch. Zet de norm lager tot de weekevaluatie weer boven de 6 zit.`
                : draag === "redelijk"
                  ? `Bij 1 fte op ${nl(d.norm)} werknemers geven de casemanagers een ${cijferTekst(d.recentTijd.gem)}: te doen, zonder veel ruimte. Meer werknemers per casemanager zou krap worden.`
                  : `Bij 1 fte op ${nl(d.norm)} werknemers geven de casemanagers een ${cijferTekst(d.recentTijd.gem)}: het werk past. Deze verhouding is een goede norm voor de prognose.`}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Per casemanager</p>
          {d.radar.length === 0 ? (
            <p className="text-[13.5px] text-black/45">Nog geen actieve casemanagers in Omzet → Uren. Zet daar wie casemanager is, met de contracturen.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-[13px]" id="prognose-radar">
                <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                  <tr className="border-b border-black/[0.06]">
                    <th className="py-2 pr-3 font-semibold">Casemanager</th>
                    <th className="px-2 py-2 text-right font-semibold">Werknemers</th>
                    <th className="px-2 py-2 text-right font-semibold">Belasting</th>
                    <th className="px-2 py-2 text-right font-semibold">Tijd</th>
                    <th className="py-2 pl-2 text-right font-semibold">Energie</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {d.radar.map((r) => {
                    const zwaar = (r.bezetting ?? 0) > 110 || (r.tijd !== null && r.tijd < 6);
                    return (
                      <tr key={r.medewerker.id} className="border-b border-black/[0.04]">
                        <td className="py-2 pr-3">
                          <span className="font-semibold text-[#1c1a4e]">{r.medewerker.naam}</span>
                          <span className="block text-[11.5px] text-black/40">{fteTekst(r.fte)} fte · {r.klanten} klant{r.klanten === 1 ? "" : "en"}{r.erbij ? ` · +${nl(r.erbij)} op komst` : ""}</span>
                        </td>
                        <td className="px-2 py-2 text-right text-[#1c1a4e]">{nl(r.werknemers)}</td>
                        <td className={`px-2 py-2 text-right ${zwaar ? "font-semibold text-[#b42318]" : "text-[#1c1a4e]"}`}>{r.bezetting === null ? "–" : `${r.bezetting}%`}</td>
                        <td className={`px-2 py-2 text-right ${r.tijd !== null && r.tijd < 6 ? "font-semibold text-[#b42318]" : "text-[#1c1a4e]"}`}>{r.medewerker.user_id ? cijferTekst(r.tijd) : <span className="text-[11.5px] text-black/35">niet gekoppeld</span>}</td>
                        <td className="py-2 pl-2 text-right text-[#1c1a4e]">{r.medewerker.user_id ? cijferTekst(r.energie) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-black/40">
            Belasting: werknemers van de klanten met deze casemanager op de kaart, gedeeld door wat 1 fte volgens de norm aankan. Tijd en energie: gemiddelde van de laatste vier weken. Rood: boven 110% of onder de 6.
          </p>
        </div>
      </div>
    </section>
  );
}

function Bronnen({ d }: { d: PrognoseData }) {
  const groep = (soort: Bijdrage["soort"]) => d.bijdragen.filter((b) => b.soort === soort);
  const delen: { soort: Bijdrage["soort"]; titel: string; icoon: React.ReactNode }[] = [
    { soort: "lopend", titel: "Lopende klanten", icoon: <LuUsers /> },
    { soort: "getekend", titel: "Getekend, gaat nog in", icoon: <LuCalendarClock /> },
    { soort: "pijplijn", titel: `Pijplijn, met ${d.kans}% kans`, icoon: <LuCircleAlert /> },
  ];
  return (
    <section className="acard overflow-hidden" aria-labelledby="bronnen-kop">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h2 id="bronnen-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Waar de prognose mee rekent</h2>
        <p className="text-[12.5px] text-black/40">
          De kans op de pijplijn is {d.normen.kansPijplijn !== null ? "ingesteld" : d.hitrate !== null ? `de eigen hitrate van het laatste halfjaar (${d.hitrate}%)` : "een derde, tot er een hitrate te meten is"}.
          {d.opdrachten.length > 0 && ` Daarnaast ${d.opdrachten.length} eenmalige opdracht${d.opdrachten.length === 1 ? "" : "en"}.`}
        </p>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {delen.map(({ soort, titel, icoon }) => {
          const lijst = groep(soort);
          const totaal = lijst.reduce((s, b) => s + (b.werknemers ?? 0), 0);
          return (
            <div key={soort}>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{icoon} {titel}</p>
              <p className="mt-1 font-heading text-[22px] font-bold tabular-nums text-[#1c1a4e]">{nl(totaal)} <span className="text-[13px] font-medium text-black/40">werknemers · {lijst.length}</span></p>
              <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto pr-1 text-[13px]">
                {lijst.slice(0, 50).map((b) => (
                  <li key={b.sleutel} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[#1c1a4e]">
                      {b.klantId ? <Link href={`/admin/klanten/${b.klantId}`} className="hover:underline">{b.bedrijf}</Link> : b.offerteId ? <Link href={`/admin/offertes/${b.offerteId}`} className="hover:underline">{b.bedrijf}</Link> : b.bedrijf}
                      {b.start && soort !== "lopend" && <span className="block text-[11.5px] text-black/40">{datumLang(b.start)} · {START[b.startBron]}</span>}
                    </span>
                    <span className={`shrink-0 tabular-nums ${b.werknemers === null ? "text-black/35" : "text-black/60"}`}>{b.werknemers === null ? "onbekend" : nl(b.werknemers)}</span>
                  </li>
                ))}
                {!lijst.length && <li className="text-black/40">Niets.</li>}
              </ul>
            </div>
          );
        })}
      </div>
      {d.opdrachten.length > 0 && (
        <div className="border-t border-black/[0.06] px-6 py-4 text-[13px] text-black/60">
          <span className="font-semibold text-[#1c1a4e]">Eenmalig: </span>
          {d.opdrachten.map((o) => `${vormLabel(o.vorm)} ${o.bedrijf} (${maandNaam(o.maand)}${o.kans < 1 ? `, ${Math.round(o.kans * 100)}%` : ""}${d.normen.urenPerOpdracht[o.vorm] ? `, ${d.normen.urenPerOpdracht[o.vorm]} uur` : ", nog zonder urennorm"})`).join(" · ")}
        </div>
      )}
    </section>
  );
}

function Normen({ d }: { d: PrognoseData }) {
  const n = d.normen;
  const veld = "ainput !py-2 text-[14px]";
  return (
    <section className="acard p-6" id="normen" aria-labelledby="normen-kop">
      <h2 id="normen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuSlidersHorizontal /> Normen</h2>
      <p className="mb-5 text-[12.5px] text-black/40">
        Leeg betekent: reken het uit, of laat het weg. Er wordt niets uit een prijs afgeleid.
        {d.normenDoor && ` Laatst ingesteld door ${d.normenDoor}.`}
      </p>
      {!d.normenAan ? (
        <p className="text-[13.5px] text-black/45">Normen bewaren kan zodra migratie 0049 in Supabase is uitgevoerd. Tot dan rekent de prognose met de standaard.</p>
      ) : (
        <form action={prognoseNormenOpslaan} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="alabel">Werknemers per fte casemanager</span>
              <input name="werknemersPerFte" inputMode="numeric" defaultValue={n.werknemersPerFte ?? ""} placeholder={d.huidig.verhouding ? `nu ${nl(d.huidig.verhouding)}` : "uit te rekenen"} className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Leeg: de huidige verhouding{d.huidig.verhouding ? ` (${nl(d.huidig.verhouding)})` : ", zodra elke klant een aantal heeft"}.</span>
            </label>
            <label>
              <span className="alabel">Uren in een volle werkweek</span>
              <input name="urenPerFte" inputMode="decimal" defaultValue={n.urenPerFte} className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Om contracturen naar fte te rekenen.</span>
            </label>
            <label>
              <span className="alabel">Kans op de pijplijn (%)</span>
              <input name="kansPijplijn" inputMode="numeric" defaultValue={n.kansPijplijn ?? ""} placeholder={d.hitrate !== null ? `hitrate ${d.hitrate}` : "33"} className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Leeg: de eigen hitrate van het laatste halfjaar.</span>
            </label>
            <label>
              <span className="alabel">Inrichten per nieuwe klant (uur)</span>
              <input name="inrichtingUren" inputMode="decimal" defaultValue={n.inrichtingUren ?? ""} placeholder="telt niet mee" className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Extra in de maand dat een klant start.</span>
            </label>
            <label>
              <span className="alabel">Start na tekenen (weken)</span>
              <input name="inrichtingWeken" inputMode="numeric" defaultValue={n.inrichtingWeken} className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Als er geen ingangsdatum is.</span>
            </label>
            <label>
              <span className="alabel">Werven en inwerken (maanden)</span>
              <input name="wervingsMaanden" inputMode="numeric" defaultValue={n.wervingsMaanden} className={veld} />
              <span className="mt-1 block text-[12px] text-black/40">Zo ver vooruit komt het advies.</span>
            </label>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">Uren per eenmalige opdracht</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {EENMALIGE_VORMEN.map((v) => (
                <label key={v}>
                  <span className="alabel">{vormLabel(v)}</span>
                  <input name={`uren_${v}`} inputMode="decimal" defaultValue={n.urenPerOpdracht[v] ?? ""} placeholder="–" className={veld} />
                </label>
              ))}
            </div>
          </div>
          <button className="abtn">Normen opslaan</button>
        </form>
      )}
    </section>
  );
}
