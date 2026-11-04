import Link from "next/link";
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuPlus, LuTrash2, LuUserRound } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver, euro } from "@/lib/offertes";
import { maandagVan, plusWeken, urenTekst, weekBereik, weekNummer, wekenTot, type Medewerker, type UrenRij } from "@/lib/uren";
import { medewerkerOpslaan, medewerkerVerwijderen } from "@/app/admin/omzetActions";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import ConfirmButton from "@/components/admin/ConfirmButton";
import UrenRooster from "@/components/admin/UrenRooster";

/**
 * Uren invullen (migratie 0035, recht `omzet`): zes weken naast elkaar, per
 * medewerker de declarabele uren en de afwezigheid, en daaronder de
 * medewerkers zelf (contracturen, norm, uurtarief). ?tot=<datum> schuift het
 * venster; standaard eindigt het bij deze week.
 */

const WEKEN = 6;

export default async function Uren({ searchParams }: { searchParams: Promise<{ tot?: string }> }) {
  const { sb } = await requirePerm("omzet");
  const vandaag = datumOver(0);
  const ruw = (await searchParams).tot;
  const tot = ruw && /^\d{4}-\d{2}-\d{2}$/.test(ruw) ? maandagVan(ruw) : maandagVan(vandaag);
  const weken = wekenTot(tot, WEKEN);
  const [m, u] = await Promise.all([
    sb.from("medewerkers").select("*").order("actief", { ascending: false }).order("sort"),
    sb.from("uren").select("medewerker_id, week, declarabel, afwezig").gte("week", weken[0]).lte("week", weken[weken.length - 1]),
  ]);
  if (isMissingTable(m.error) || isMissingTable(u.error)) {
    return (
      <div className="space-y-6">
        <Kop />
        <MigratieNodig bestand="0035_omzet_uren.sql" wat="Het urenoverzicht heeft de tabellen medewerkers en uren nodig." />
      </div>
    );
  }

  const medewerkers = ((m.data as Medewerker[] | null) || []).map((x) => ({ ...x, contracturen: Number(x.contracturen), uurtarief: x.uurtarief === null ? null : Number(x.uurtarief) }));
  const actief = medewerkers.filter((x) => x.actief);
  const begin = Object.fromEntries(((u.data as UrenRij[] | null) || []).map((r) => [`${r.medewerker_id}|${r.week}`, { declarabel: Number(r.declarabel), afwezig: Number(r.afwezig) }]));
  const dezeWeek = maandagVan(vandaag);
  const href = (maandag: string) => (maandag === dezeWeek ? "/admin/omzet/uren" : `/admin/omzet/uren?tot=${maandag}`);
  const terug = tot === dezeWeek ? "" : `?tot=${tot}`;

  return (
    <div className="space-y-6">
      <Kop />

      <section className="acard overflow-hidden" aria-labelledby="rooster-kop">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div>
            <h2 id="rooster-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Declarabele uren per week</h2>
            <p className="text-[12.5px] text-black/40">Vul per week de declarabele uren in, en wat iemand afwezig was (verlof, ziekte, feestdag). Elk vakje bewaart zichzelf; Enter gaat een rij omlaag.</p>
          </div>
          <nav className="flex items-center gap-1" aria-label="Weken">
            <Link href={href(plusWeken(tot, -WEKEN))} className="abtn-ghost !px-2.5 !py-1.5 text-[13px]" aria-label="Eerdere weken"><LuChevronLeft /></Link>
            <Link href="/admin/omzet/uren" className={`abtn-ghost !py-1.5 text-[13px] ${tot === dezeWeek ? "pointer-events-none opacity-50" : ""}`}>Deze week</Link>
            <Link href={href(plusWeken(tot, WEKEN))} className={`abtn-ghost !px-2.5 !py-1.5 text-[13px] ${tot >= dezeWeek ? "pointer-events-none opacity-50" : ""}`} aria-label="Latere weken"><LuChevronRight /></Link>
          </nav>
        </div>
        <UrenRooster
          key={tot}
          weken={weken.map((w) => ({ week: w, nummer: weekNummer(w).week, bereik: weekBereik(w), nu: w === dezeWeek }))}
          medewerkers={actief.map(({ id, naam, functie, contracturen, norm }) => ({ id, naam, functie, contracturen, norm }))}
          begin={begin}
        />
      </section>

      <section className="acard overflow-hidden" id="medewerkers" aria-labelledby="medewerkers-kop">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 id="medewerkers-kop" className="font-heading text-[16px] font-bold text-[#312e82]">
            Medewerkers <span className="ml-1 text-[13px] font-semibold text-black/35">{medewerkers.length}</span>
          </h2>
          <p className="text-[12.5px] text-black/40">
            De norm is het deel van de beschikbare uren dat declarabel hoort te zijn. Met een uurtarief tellen de uren mee in de omzet.
          </p>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {medewerkers.map((mw) => (
            <li key={mw.id}>
              <details className="group/mw">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-3 hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[13px] font-bold text-[#312e82]">{mw.naam[0]?.toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14.5px] font-semibold ${mw.actief ? "text-[#1c1a4e]" : "text-black/40"}`}>
                      {mw.naam}{!mw.actief && <span className="ml-2 text-[12px] font-normal">(inactief)</span>}
                    </span>
                    <span className="block text-[12.5px] text-black/45">
                      {[mw.functie, `${urenTekst(mw.contracturen)} uur per week`, `norm ${mw.norm}%`, mw.uurtarief === null ? "geen uurtarief" : `${euro(mw.uurtarief)} per uur`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-[12.5px] font-semibold text-black/35 group-open/mw:hidden">Wijzig</span>
                </summary>
                <div className="px-6 pb-5">
                  <MedewerkerForm mw={mw} terug={terug} />
                  <div className="mt-3">
                    <ConfirmButton
                      action={medewerkerVerwijderen.bind(null, mw.id)}
                      message={`${mw.naam} en al zijn ingevulde uren verwijderen? Zet hem liever op inactief als zijn uren in het verleden moeten blijven meetellen.`}
                      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-black/40 hover:text-[#b42318]"
                    >
                      <LuTrash2 className="text-[13px]" /> Verwijderen
                    </ConfirmButton>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div id="nieuw" className="border-t border-black/[0.06] bg-[#fafafd] px-6 py-5">
          <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1c1a4e]"><LuUserRound className="text-black/35" /> Medewerker toevoegen</p>
          <MedewerkerForm terug={terug} />
        </div>
      </section>
    </div>
  );
}

function Kop() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/admin/omzet" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft className="text-[13px]" /> Omzet</Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Uren</h1>
        <p className="text-[14.5px] text-black/50">Declarabele uren per medewerker per week, tegen de norm van ieder.</p>
      </div>
    </div>
  );
}

function MedewerkerForm({ mw, terug }: { mw?: Medewerker; terug: string }) {
  const id = mw?.id ?? "nieuw";
  const veld = "ainput !py-2 text-[14px]";
  return (
    <form action={medewerkerOpslaan} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {mw && <input type="hidden" name="id" value={mw.id} />}
      <input type="hidden" name="terug" value={terug} />
      <label className="lg:col-span-2">
        <span className="alabel">Naam</span>
        <input id={`mw-naam-${id}`} name="naam" required maxLength={120} defaultValue={mw?.naam} className={veld} placeholder="Bijvoorbeeld Susanne Linders" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">Functie</span>
        <input id={`mw-functie-${id}`} name="functie" maxLength={120} defaultValue={mw?.functie ?? ""} className={veld} placeholder="Bijvoorbeeld casemanager" />
      </label>
      <label>
        <span className="alabel">Uur per week</span>
        <input id={`mw-uren-${id}`} name="contracturen" inputMode="decimal" defaultValue={mw ? urenTekst(mw.contracturen) : "36"} className={veld} />
      </label>
      <label>
        <span className="alabel">Norm (%)</span>
        <input id={`mw-norm-${id}`} name="norm" inputMode="numeric" defaultValue={mw ? String(mw.norm) : "75"} className={veld} />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">Uurtarief (€) <span className="font-normal text-black/40">leeg: telt niet in de omzet</span></span>
        <input id={`mw-tarief-${id}`} name="uurtarief" inputMode="decimal" defaultValue={mw?.uurtarief === null || mw?.uurtarief === undefined ? "" : String(mw.uurtarief).replace(".", ",")} className={veld} placeholder="bijvoorbeeld 95" />
      </label>
      <label className="flex items-end gap-2 pb-2.5 text-[13.5px] text-black/60 lg:col-span-2">
        <input type="checkbox" name="actief" value="aan" defaultChecked={mw ? mw.actief : true} className="h-4 w-4 accent-[#312e82]" />
        Actief: staat in het rooster
      </label>
      <div className="flex items-end lg:col-span-2">
        <button className="abtn !py-2 text-[14px]">{mw ? "Opslaan" : <><LuPlus /> Toevoegen</>}</button>
      </div>
    </form>
  );
}
