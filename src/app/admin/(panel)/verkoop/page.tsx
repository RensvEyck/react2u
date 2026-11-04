import Link from "next/link";
import { LuArrowRight, LuBookOpen, LuFilePenLine, LuPlus } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver, euro } from "@/lib/offertes";
import { maandenTot, maandNaam, maandVan } from "@/lib/omzet";
import { haalVerkoop, verkoopOverzicht } from "@/lib/opvolgenDb";
import type { BrochureRij } from "@/lib/opvolgen";
import { kern, periodeVan, PERIODES, perMaand, perVerkoper, perVorm, pijplijn, trechter, type Groep, type Stap, type VerkoopOfferte } from "@/lib/verkoop";
import { Kerncijfer, MigratieNodig } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import { OpvolgRij } from "@/components/admin/VerkoopBlok";

/**
 * Het salesdashboard: hoe de verkoop loopt over een periode (30 dagen, 90
 * dagen of 12 maanden), met de trechter van brochure tot handtekening, de
 * open pijplijn per fase, de maanden, per soort offerte en per verkoper, en
 * alles wat opgevolgd moet worden. Rekenregels in lib/verkoop.ts; het recht is
 * het salesrecht (bellijst), net als offertes.
 */

const OFFERTE =
  "id, nummer, status, vorm, bedrijf, contactpersoon, email, telefoon, medewerkers, regels, keuze, keuze_at, geldig_tot, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, getekend_at, afgewezen_at, afzender_naam";
const BROCHURE =
  "id, nummer, status, bedrijf, contactpersoon, email, telefoon, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken";

export default async function Verkoop({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const periode = periodeVan((await searchParams).periode);
  const nu = new Date();
  const jaar = new Date(nu.getTime() - 400 * 86_400_000).toISOString();
  const [o, b, opvolg] = await Promise.all([
    // Twaalf maanden en wat nu openstaat; de regels per offerte zijn nodig voor de waarde.
    sb.from("offertes").select(OFFERTE)
      .or(`status.eq.verstuurd,verstuurd_at.gte.${jaar},created_at.gte.${jaar},getekend_at.gte.${jaar}`)
      .order("created_at", { ascending: false }).limit(1000),
    sb.from("brochures").select(BROCHURE).neq("status", "concept").gte("verstuurd_at", jaar).limit(1000),
    haalVerkoop(sb, nu),
  ]);
  if (isMissingTable(o.error)) {
    return (
      <div className="space-y-6">
        <Kop periode={periode.key} />
        <MigratieNodig bestand="0024_offertes.sql" wat="Het salesdashboard rekent met de offertes." />
      </div>
    );
  }

  const offertes = ((o.data as unknown as VerkoopOfferte[] | null) || []).map((x) => ({ ...x, vorm: x.vorm || "verzuimbegeleiding" }));
  const brochures = (b.data as unknown as BrochureRij[] | null) || [];
  const sinds = datumOver(-periode.dagen, nu);
  const k = kern(offertes, sinds, nu);
  const t = trechter(offertes, brochures, sinds);
  const fasen = pijplijn(offertes, nu);
  const maanden = perMaand(offertes, maandenTot(maandVan(nu), 12), nu);
  const vormen = perVorm(offertes, sinds, nu);
  const verkopers = perVerkoper(offertes, sinds, nu);
  const { signalen } = verkoopOverzicht(opvolg, [], nu);
  const pijplijnTotaal = fasen.reduce((s, f) => s + f.perMaand, 0);

  return (
    <div className="space-y-6">
      <Kop periode={periode.key} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kerncijfer
          label={`Getekend, ${periode.label}`}
          waarde={euro(k.getekend.perMaand)}
          achter="per maand"
          sub={`${k.getekend.aantal} offerte${k.getekend.aantal === 1 ? "" : "s"}${k.getekend.eenmalig ? ` · ${euro(k.getekend.eenmalig)} eenmalig` : ""}`}
          href="/admin/offertes?filter=getekend"
          accent={k.getekend.aantal > 0}
        />
        <Kerncijfer
          label={`Hitrate, ${periode.label}`}
          waarde={k.hitrate.procent === null ? "–" : `${k.hitrate.procent}%`}
          sub={k.hitrate.afgerond ? `${k.hitrate.getekend} van ${k.hitrate.afgerond} afgeronde offertes` : `${k.verstuurd} verstuurd, nog niets afgerond`}
        />
        <Kerncijfer
          label="Doorlooptijd"
          waarde={k.doorlooptijd === null ? "–" : String(k.doorlooptijd)}
          achter={k.doorlooptijd === null ? undefined : k.doorlooptijd === 1 ? "dag" : "dagen"}
          sub="van versturen tot tekenen, de middelste"
        />
        <Kerncijfer
          label="Gemiddelde deal"
          waarde={k.gemiddeld === null ? "–" : euro(k.gemiddeld)}
          achter={k.gemiddeld === null ? undefined : "per maand"}
          sub="per getekend abonnement"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard p-6" aria-labelledby="pijplijn-kop">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="pijplijn-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Open pijplijn</h2>
            <p className="text-[13px] text-black/45"><span className="font-semibold text-[#1c1a4e]">{euro(pijplijnTotaal)}</span> per maand</p>
          </div>
          <ul className="space-y-3.5">
            {fasen.map((f) => (
              <li key={f.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="font-medium text-[#1c1a4e]">{f.label}</span>
                  <span className="tabular-nums text-black/50">
                    {f.aantal} · <span className="font-semibold text-[#1c1a4e]">{euro(f.perMaand)}</span> p/m{f.eenmalig ? ` + ${euro(f.eenmalig)}` : ""}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-black/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pijplijnTotaal ? Math.max(f.perMaand ? 2 : 0, (f.perMaand / pijplijnTotaal) * 100) : 0}%`, background: KLEUR.violet, opacity: f.key === "niet-geopend" ? 0.45 : f.key === "bekeken" ? 0.7 : 1 }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-black/40">Hoe verder de klant is, hoe groter de kans: wie onderdelen koos, is aan het rekenen.</p>
        </section>

        <section className="acard p-6" aria-labelledby="trechter-kop">
          <h2 id="trechter-kop" className="mb-4 font-heading text-[16px] font-bold text-[#312e82]">Van brochure tot handtekening</h2>
          <Trechter stappen={t.brochures} icoon={<LuBookOpen />} />
          <div className="my-4 border-t border-black/[0.06]" />
          <Trechter stappen={t.offertes} icoon={<LuFilePenLine />} />
          <p className="mt-4 text-[12.5px] text-black/40">Over wat er in de gekozen periode verstuurd is.</p>
        </section>
      </div>

      <section className="acard p-6" aria-labelledby="maanden-kop">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="maanden-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Offertes per maand</h2>
          <p className="text-[13px] text-black/45">
            Getekend in 12 maanden: <span className="font-semibold text-[#1c1a4e]">{euro(maanden.reduce((s, m) => s + m.perMaand, 0))}</span> per maand
          </p>
        </div>
        <Staven
          titel="Offertes per maand, verstuurd en getekend"
          gestapeld={false}
          reeksen={[{ key: "verstuurd", label: "Verstuurd", kleur: KLEUR.violet }, { key: "getekend", label: "Getekend", kleur: KLEUR.aqua }]}
          punten={maanden.map((m) => ({ key: m.maand, label: maandNaam(m.maand), titel: maandNaam(m.maand, true), waarden: { verstuurd: m.verstuurd, getekend: m.getekend } }))}
          formaat={(n) => String(Math.round(n))}
          minTop={2}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <GroepTabel titel="Per soort offerte" groepen={vormen} periode={periode.label} />
        <GroepTabel titel="Per verkoper" groepen={verkopers} periode={periode.label} />
      </div>

      <section className="acard overflow-hidden" aria-labelledby="opvolgen-kop">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <h2 id="opvolgen-kop" className="font-heading text-[16px] font-bold text-[#312e82]">
            Opvolgen <span className="ml-1 text-[13px] font-semibold text-black/35">{signalen.length}</span>
          </h2>
          <Link href="/admin/bellijst" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            Bellijst <LuArrowRight className="text-[13px]" />
          </Link>
        </div>
        {signalen.length ? (
          <div className="divide-y divide-black/[0.05]">{signalen.map((s) => <OpvolgRij key={s.key} s={s} />)}</div>
        ) : (
          <p className="px-6 py-8 text-center text-[14px] text-black/45">Niets op te volgen: elke offerte, brochure en contract is bij.</p>
        )}
      </section>
    </div>
  );
}

function Kop({ periode }: { periode: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Verkoop</h1>
        <p className="text-[14.5px] text-black/50">Hoe de verkoop loopt: wat er binnenkomt, waar het blijft hangen en wie je vandaag belt.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <nav className="flex gap-1 rounded-xl bg-black/[0.04] p-1" aria-label="Periode">
          {PERIODES.map((p) => (
            <Link
              key={p.key}
              href={p.key === "90" ? "/admin/verkoop" : `/admin/verkoop?periode=${p.key}`}
              aria-current={p.key === periode ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${p.key === periode ? "bg-white text-[#312e82] shadow-sm" : "text-black/50 hover:text-[#312e82]"}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <Link href="/admin/offertes/nieuw" className="abtn"><LuPlus /> Nieuwe offerte</Link>
      </div>
    </div>
  );
}

function Trechter({ stappen, icoon }: { stappen: Stap[]; icoon: React.ReactNode }) {
  const max = Math.max(1, stappen[0]?.aantal ?? 0);
  return (
    <ol className="space-y-2">
      {stappen.map((s, i) => {
        const vorige = i ? stappen[i - 1].aantal : null;
        const door = vorige ? Math.round((s.aantal / vorige) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-[13.5px]">
            <span className="flex items-center gap-2 truncate text-black/60">
              {i === 0 && <span className="text-[14px] text-black/35" aria-hidden>{icoon}</span>}
              <span className={i === 0 ? "font-medium text-[#1c1a4e]" : "pl-[22px]"}>{s.label}</span>
            </span>
            <span className="h-2.5 rounded-full bg-black/[0.05]">
              <span className="block h-full rounded-full" style={{ width: `${(s.aantal / max) * 100}%`, background: KLEUR.aqua, minWidth: s.aantal ? 4 : 0 }} />
            </span>
            <span className="w-[5.5rem] text-right tabular-nums">
              <span className="font-semibold text-[#1c1a4e]">{s.aantal}</span>
              {door !== null && <span className="ml-1.5 text-[12px] text-black/40">{door}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function GroepTabel({ titel, groepen, periode }: { titel: string; groepen: Groep[]; periode: string }) {
  return (
    <section className="acard overflow-hidden">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">{titel}</h2>
        <p className="text-[12.5px] text-black/40">{periode}; open is wat nu openstaat</p>
      </div>
      {groepen.length === 0 ? (
        <p className="px-6 py-8 text-center text-[14px] text-black/45">Nog niets in deze periode.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13.5px]">
            <thead className="whitespace-nowrap text-[11.5px] uppercase tracking-[0.06em] text-black/40">
              <tr className="border-b border-black/[0.06]">
                <th className="px-6 py-2.5 font-semibold" />
                <th className="px-3 py-2.5 text-right font-semibold">Verstuurd</th>
                <th className="px-3 py-2.5 text-right font-semibold">Open</th>
                <th className="px-3 py-2.5 text-right font-semibold">Getekend</th>
                <th className="px-3 py-2.5 text-right font-semibold">Hitrate</th>
                <th className="px-6 py-2.5 text-right font-semibold">Per maand</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {groepen.map((g) => (
                <tr key={g.sleutel} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-6 py-2.5">
                    <span className="flex items-center gap-2 whitespace-nowrap font-medium text-[#1c1a4e]">
                      {g.kleur && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.kleur }} aria-hidden />}
                      {g.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-black/60">{g.verstuurd}</td>
                  <td className="px-3 py-2.5 text-right text-black/60">{g.open}</td>
                  <td className="px-3 py-2.5 text-right text-black/60">{g.getekend}</td>
                  <td className="px-3 py-2.5 text-right text-black/60">{g.hitrate === null ? "–" : `${g.hitrate}%`}</td>
                  <td className="px-6 py-2.5 text-right font-semibold text-[#1c1a4e]">
                    {euro(g.perMaand)}
                    {g.eenmalig > 0 && <span className="block text-[11.5px] font-normal text-black/40">+ {euro(g.eenmalig)} eenmalig</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
