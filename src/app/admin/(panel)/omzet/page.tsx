import Link from "next/link";
import { LuArrowRight, LuClock, LuRotateCcw } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { euro } from "@/lib/offertes";
import {
  abonnementen, abonnementsbrug, jaarTotNu, loopt, maandenTot, maandNaam, maandVan, omzetPerMaand, perKlant, perLabel, plusMaanden,
  type Gestopt, type GetekendeOfferte,
} from "@/lib/omzet";
import { cel, maandVanWeek, oordeel, optellen, urenIndex, urenTekst, wekenTot, type Medewerker, type UrenRij } from "@/lib/uren";
import { abonnementHervatten, abonnementStoppen } from "@/app/admin/omzetActions";
import { Kerncijfer, MigratieNodig, verandering } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import { OordeelPil } from "@/components/admin/UrenBits";

/**
 * Omzet (migratie 0035, recht `omzet`): per maand uit de getekende offertes
 * (abonnementen en eenmalig) en de declarabele uren × uurtarief, met de
 * klanten, de labels en de uren van deze maand. Rekenregels in lib/omzet.ts.
 */

function euroKort(n: number): string {
  if (Math.abs(n) >= 1000) return `€${(n / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}k`;
  return euro(Math.round(n));
}

export default async function Omzet() {
  const { sb } = await requirePerm("omzet");
  const nu = new Date();
  const maand = maandVan(nu);
  const sinds = `${plusMaanden(maand, -24)}-01`;
  const [o, g, m, u] = await Promise.all([
    sb.from("offertes").select("id, nummer, bedrijf, vorm, regels, keuze, medewerkers, status, getekend_at").eq("status", "getekend").limit(2000),
    sb.from("abonnementen_gestopt").select("offerte_id, vanaf, reden"),
    sb.from("medewerkers").select("*").order("sort"),
    sb.from("uren").select("medewerker_id, week, declarabel, afwezig").gte("week", sinds).limit(10000),
  ]);
  if (isMissingTable(g.error) || isMissingTable(m.error) || isMissingTable(u.error)) {
    return (
      <div className="space-y-6">
        <Kop />
        <MigratieNodig bestand="0035_omzet_uren.sql" wat="De omzet en de uren hebben drie nieuwe tabellen en een nieuw recht nodig." />
      </div>
    );
  }

  const gestopt = (g.data as Gestopt[] | null) || [];
  const medewerkers = ((m.data as Medewerker[] | null) || []).map((x) => ({ ...x, contracturen: Number(x.contracturen), uurtarief: x.uurtarief === null ? null : Number(x.uurtarief) }));
  const uren = ((u.data as UrenRij[] | null) || []).map((r) => ({ ...r, declarabel: Number(r.declarabel), afwezig: Number(r.afwezig) }));
  const abos = abonnementen((o.data as unknown as GetekendeOfferte[] | null) || [], gestopt);

  const reeks = omzetPerMaand(abos, medewerkers, uren, maandenTot(maand, 25));
  const laatste12 = reeks.slice(-12);
  const deze = reeks[reeks.length - 1];
  const vorige = reeks[reeks.length - 2];
  const ytd = jaarTotNu(reeks, maand);
  const brug = abonnementsbrug(abos, maand);
  const labels = perLabel(abos, maand);
  const klanten = perKlant(abos, maand);
  const gestoptLijst = abos.filter((a) => a.stop).sort((x, y) => (y.stop || "").localeCompare(x.stop || ""));
  const reden = new Map(gestopt.map((x) => [x.offerte_id, x.reden]));

  // De uren van deze maand per medewerker: de weken waarvan de donderdag in deze maand valt.
  const weken = wekenTot(`${plusMaanden(maand, 1)}-07`, 7).filter((w) => maandVanWeek(w) === maand);
  const index = urenIndex(uren);
  const urenRijen = medewerkers
    .map((mw) => {
      const t = optellen(weken.map((w) => cel(mw, index.get(`${mw.id}|${w}`))));
      return { mw, t, omzet: mw.uurtarief === null ? null : Math.round(t.declarabel * mw.uurtarief * 100) / 100 };
    })
    .filter((r) => r.mw.actief || r.t.weken > 0);
  const team = optellen(medewerkers.flatMap((mw) => weken.map((w) => cel(mw, index.get(`${mw.id}|${w}`)))));
  const maxLabel = Math.max(1, ...labels.map((l) => l.perMaand));
  const kiesMaanden = (start: string) => {
    const van = start > plusMaanden(maand, -12) ? start : plusMaanden(maand, -12);
    const lijst: string[] = [];
    for (let x = van; x <= plusMaanden(maand, 12); x = plusMaanden(x, 1)) lijst.push(x);
    return lijst;
  };

  return (
    <div className="space-y-6">
      <Kop />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kerncijfer
          label="Abonnementen"
          waarde={euro(deze.abonnementen)}
          achter="per maand"
          verschil={(() => { const v = verandering(deze.abonnementen, vorige.abonnementen); return v === null ? null : { procent: v, tegen: `t.o.v. ${maandNaam(vorige.maand)}` }; })()}
          sub={`${klanten.length} klant${klanten.length === 1 ? "" : "en"} · ${euro(deze.abonnementen * 12)} per jaar`}
          accent
        />
        <Kerncijfer
          label={`Omzet ${maandNaam(maand)}`}
          waarde={euro(deze.totaal)}
          sub={[`abonnementen ${euro(deze.abonnementen)}`, deze.uren ? `uren ${euro(deze.uren)}` : "", deze.eenmalig ? `eenmalig ${euro(deze.eenmalig)}` : ""].filter(Boolean).join(" · ")}
        />
        <Kerncijfer
          label={`Jaar tot nu, ${maand.slice(0, 4)}`}
          waarde={euro(ytd.dit)}
          verschil={(() => { const v = verandering(ytd.dit, ytd.vorig); return v === null ? null : { procent: v, tegen: "t.o.v. vorig jaar" }; })()}
          sub={
            ytd.vorig === null ? "vorig jaar nog niet compleet in de cijfers"
              : ytd.vorig === 0 ? `vorig jaar tot ${maandNaam(maand)}: nog geen omzet`
              : `vorig jaar tot ${maandNaam(maand)}: ${euro(ytd.vorig)}`
          }
        />
        <Kerncijfer
          label={`Declarabel, ${maandNaam(maand)}`}
          waarde={team.procent === null ? "–" : `${team.procent}%`}
          sub={team.weken ? `${urenTekst(team.declarabel)} van ${urenTekst(team.beschikbaar)} beschikbare uren` : "nog geen uren ingevuld"}
          href="/admin/omzet/uren"
        />
      </div>

      <section className="acard p-6" aria-labelledby="omzet-maanden">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="omzet-maanden" className="font-heading text-[16px] font-bold text-[#312e82]">Omzet per maand</h2>
          <p className="text-[13px] text-black/45">
            12 maanden: <span className="font-semibold text-[#1c1a4e]">{euro(laatste12.reduce((s, x) => s + x.totaal, 0))}</span>
          </p>
        </div>
        <Staven
          titel="Omzet per maand, laatste 12 maanden"
          reeksen={[
            { key: "abonnementen", label: "Abonnementen", kleur: KLEUR.violet },
            { key: "uren", label: "Declarabele uren", kleur: KLEUR.aqua },
            { key: "eenmalig", label: "Eenmalig", kleur: KLEUR.geel },
          ]}
          punten={laatste12.map((x) => ({
            key: x.maand, label: maandNaam(x.maand), titel: maandNaam(x.maand, true),
            waarden: { abonnementen: x.abonnementen, uren: x.uren, eenmalig: x.eenmalig },
          }))}
          formaat={euroKort}
          hoogte={200}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard p-6" aria-labelledby="brug-kop">
          <h2 id="brug-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Abonnementen in {maandNaam(maand, true)}</h2>
          <p className="mb-4 text-[12.5px] text-black/40">Wat er per maand binnenkomt, en hoe dat deze maand veranderde.</p>
          <dl className="space-y-2.5 text-[14px] tabular-nums">
            <div className="flex justify-between gap-3"><dt className="text-black/55">Liep in {maandNaam(vorige.maand, true)}</dt><dd className="text-[#1c1a4e]">{euro(brug.begin)}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/55">Nieuw getekend <span className="text-black/35">({brug.nieuw.aantal})</span></dt>
              <dd className="font-medium text-[#0a7a4b]">+ {euro(brug.nieuw.bedrag)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/55">Gestopt <span className="text-black/35">({brug.gestopt.aantal})</span></dt>
              <dd className="font-medium text-[#b25e09]">− {euro(brug.gestopt.bedrag)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-black/[0.08] pt-2.5 font-semibold">
              <dt className="text-[#1c1a4e]">Loopt nu</dt><dd className="text-[#1c1a4e]">{euro(brug.eind)}</dd>
            </div>
          </dl>
        </section>

        <section className="acard p-6" aria-labelledby="labels-kop">
          <h2 id="labels-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Per label</h2>
          <p className="mb-4 text-[12.5px] text-black/40">Het abonnement per maand, verdeeld over de onderdelen van de offertes.</p>
          {labels.length === 0 ? (
            <p className="text-[14px] text-black/45">Nog geen lopende abonnementen.</p>
          ) : (
            <ul className="space-y-3">
              {labels.map((l) => (
                <li key={l.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="flex items-center gap-2 font-medium text-[#1c1a4e]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.kleur }} aria-hidden />{l.label.replace(/^React2u\s+/, "")}
                    </span>
                    <span className="tabular-nums text-black/50">
                      {l.klanten} klant{l.klanten === 1 ? "" : "en"} · <span className="font-semibold text-[#1c1a4e]">{euro(l.perMaand)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/[0.05]">
                    <div className="h-full rounded-full" style={{ width: `${(l.perMaand / maxLabel) * 100}%`, background: l.kleur }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="acard overflow-hidden" id="klanten" aria-labelledby="klanten-kop">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <h2 id="klanten-kop" className="font-heading text-[16px] font-bold text-[#312e82]">
            Klanten <span className="ml-1 text-[13px] font-semibold text-black/35">{klanten.length}</span>
          </h2>
          <p className="text-[12.5px] text-black/40">Lopende abonnementen, grootste eerst. Stopt een klant, beëindig dan zijn abonnement.</p>
        </div>
        {klanten.length === 0 ? (
          <p className="px-6 py-8 text-center text-[14px] text-black/45">Nog geen getekende abonnementen.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {klanten.map((k) => (
              <li key={k.sleutel} className="px-6 py-3.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">{k.bedrijf}</p>
                    <p className="text-[12.5px] text-black/45">
                      Sinds {maandNaam(k.sinds, true)} ·{" "}
                      {k.abonnementen.map((a, i) => (
                        <span key={a.offerte.id}>
                          {i > 0 && ", "}
                          <Link href={`/admin/offertes/${a.offerte.id}`} className="hover:text-[#e75387] hover:underline">{a.offerte.nummer}</Link>
                        </span>
                      ))}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-[#1c1a4e]">
                    {euro(k.perMaand)} <span className="text-[12.5px] font-normal text-black/40">per maand</span>
                  </p>
                </div>
                <details className="group/stop mt-1">
                  <summary className="inline-flex cursor-pointer list-none text-[12.5px] font-semibold text-black/40 hover:text-[#b25e09] [&::-webkit-details-marker]:hidden">
                    Abonnement beëindigen…
                  </summary>
                  <div className="mt-2 space-y-2">
                    {k.abonnementen.map((a) => (
                      <form key={a.offerte.id} action={abonnementStoppen} className="flex flex-wrap items-end gap-2 rounded-xl bg-[#fafafd] p-3">
                        <input type="hidden" name="offerte_id" value={a.offerte.id} />
                        <p className="w-full text-[12.5px] text-black/55">Offerte {a.offerte.nummer}: {euro(a.perMaand)} per maand</p>
                        <label className="text-[12.5px] text-black/55">
                          <span className="mb-1 block">Laatste maand met omzet</span>
                          <select name="vanaf" defaultValue={plusMaanden(maand, 1)} className="ainput !w-auto !py-1.5 text-[13px]">
                            {kiesMaanden(plusMaanden(a.start, 1)).map((x) => (
                              <option key={x} value={x}>{maandNaam(plusMaanden(x, -1), true)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-[180px] flex-1 text-[12.5px] text-black/55">
                          <span className="mb-1 block">Reden (mag leeg)</span>
                          <input name="reden" className="ainput !py-1.5 text-[13px]" placeholder="Bijvoorbeeld: overgestapt, bedrijf gestopt" maxLength={500} />
                        </label>
                        <button className="abtn-ghost !py-1.5 text-[13px]">Beëindigen</button>
                      </form>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        {gestoptLijst.length > 0 && (
          <div id="gestopt" className="border-t border-black/[0.06] bg-[#fafafd] px-6 py-4">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-black/35">Gestopt</p>
            <ul className="space-y-1.5">
              {gestoptLijst.map((a) => (
                <li key={a.offerte.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
                  <span className="font-medium text-[#1c1a4e]">{a.offerte.bedrijf}</span>
                  <span className="text-black/45">
                    {euro(a.perMaand)} per maand, tot en met {maandNaam(plusMaanden(a.stop!, -1), true)}
                    {loopt(a, maand) ? " (loopt nog)" : ""}
                    {reden.get(a.offerte.id) ? ` · ${reden.get(a.offerte.id)}` : ""}
                  </span>
                  <form action={abonnementHervatten.bind(null, a.offerte.id)} className="ml-auto">
                    <button className="flex items-center gap-1 text-[12.5px] font-semibold text-black/40 hover:text-[#312e82]"><LuRotateCcw className="text-[12px]" /> Hervatten</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="acard overflow-hidden" id="uren" aria-labelledby="uren-kop">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div>
            <h2 id="uren-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Declarabele uren in {maandNaam(maand, true)}</h2>
            <p className="text-[12.5px] text-black/40">{weken.length} weken, tegen de norm van ieder</p>
          </div>
          <Link href="/admin/omzet/uren" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            Uren invullen <LuArrowRight className="text-[13px]" />
          </Link>
        </div>
        {urenRijen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <LuClock className="text-[26px] text-black/25" />
            <p className="text-[14px] text-black/45">Nog geen medewerkers. Voeg ze toe bij Uren invullen.</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.06]">
                  <th className="px-6 py-2.5 font-semibold">Medewerker</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Declarabel</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Beschikbaar</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Declarabiliteit</th>
                  <th className="px-6 py-2.5 text-right font-semibold">Omzet</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {urenRijen.map(({ mw, t, omzet }) => (
                  <tr key={mw.id} className="border-b border-black/[0.04] last:border-0">
                    <td className="px-6 py-2.5">
                      <p className="font-medium text-[#1c1a4e]">{mw.naam}</p>
                      <p className="text-[12px] text-black/40">{[mw.functie, `norm ${mw.norm}%`].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#1c1a4e]">{t.weken ? urenTekst(t.declarabel) : "–"}</td>
                    <td className="px-3 py-2.5 text-right text-black/55">{t.weken ? urenTekst(t.beschikbaar) : "–"}</td>
                    <td className="px-3 py-2.5 text-right">
                      {t.procent === null ? <span className="text-black/35">niet ingevuld</span> : <OordeelPil procent={t.procent} oordeel={oordeel(t.procent, mw.norm)} />}
                    </td>
                    <td className="px-6 py-2.5 text-right font-semibold text-[#1c1a4e]">
                      {omzet === null ? <span className="text-[12px] font-normal text-black/35">geen uurtarief</span> : euro(omzet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-center text-[12.5px] text-black/35">
        De omzet komt uit getekende offertes en ingevulde uren. Facturen en betalingen staan in de boekhouding, niet hier.
      </p>
    </div>
  );
}

function Kop() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Omzet</h1>
        <p className="text-[14.5px] text-black/50">Uit de getekende offertes en de declarabele uren, per maand.</p>
      </div>
      <Link href="/admin/omzet/uren" className="abtn"><LuClock /> Uren invullen</Link>
    </div>
  );
}
