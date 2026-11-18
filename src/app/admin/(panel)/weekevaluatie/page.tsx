import Link from "next/link";
import { LuChartColumn, LuCircleCheck, LuCircleDashed, LuLock } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver } from "@/lib/offertes";
import { cel, maandagVan, plusWeken, weekNummer, type Medewerker, type UrenRij } from "@/lib/uren";
import {
  cijferTekst, heeftTekst, normaliseerAntwoorden, openWeken, SCHALEN, TEKSTVRAGEN, weekStand, weekTitel, type Evaluatie,
} from "@/lib/weekevaluatie";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import { KLEUR, Staven } from "@/components/admin/Grafiek";
import WeekevaluatieForm, { type UrenVanWeek } from "@/components/admin/WeekevaluatieForm";

/**
 * Mijn weekevaluatie (migratie 0044, recht `weekevaluatie`): deze week en
 * vorige week invullen of aanpassen, daaronder je laatste twaalf weken als
 * grafiek en je geschiedenis om terug te lezen. Alleen je eigen rijen; de
 * database laat niets anders zien (policies in 0044).
 */

const GESCHIEDENIS = 26;

const MOMENT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export default async function Weekevaluatie({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { sb, admin } = await requirePerm("weekevaluatie");
  const vandaag = datumOver(0);
  const [vorige, deze] = openWeken(vandaag);
  const ruw = (await searchParams).week;
  const gekozen = ruw && /^\d{4}-\d{2}-\d{2}$/.test(ruw) ? maandagVan(ruw) : deze;
  const sinds = plusWeken(deze, -GESCHIEDENIS);

  const [e, m] = await Promise.all([
    sb.from("weekevaluaties").select("*").eq("user_id", admin.userId).gte("week", sinds).order("week", { ascending: false }),
    // Vóór 0044 heeft medewerkers geen user_id; dan gewoon geen uren erbij.
    sb.from("medewerkers").select("*").eq("user_id", admin.userId).maybeSingle(),
  ]);
  if (isMissingTable(e.error)) {
    return (
      <div className="space-y-6">
        <Kop />
        <MigratieNodig bestand="0044_weekevaluatie.sql" wat="De weekevaluatie heeft een nieuwe tabel, een nieuw recht en de rol Werknemer nodig." />
      </div>
    );
  }
  const evaluaties: Evaluatie[] = ((e.data as Evaluatie[] | null) || []).map((x) => ({ ...x, antwoorden: normaliseerAntwoorden(x.antwoorden) }));
  const perWeek = new Map(evaluaties.map((x) => [x.week, x]));
  const medewerker = (m.data as Medewerker | null) || null;
  const uren = medewerker
    ? ((await sb.from("uren").select("medewerker_id, week, declarabel, afwezig").eq("medewerker_id", medewerker.id).gte("week", sinds)).data as UrenRij[] | null) || []
    : [];
  const urenVan = (week: string): UrenVanWeek => {
    if (!medewerker) return null;
    const rij = uren.find((u) => u.week === week);
    if (!rij) return null;
    const c = cel({ contracturen: Number(medewerker.contracturen) }, { ...rij, declarabel: Number(rij.declarabel), afwezig: Number(rij.afwezig) });
    return { declarabel: c.declarabel, afwezig: c.afwezig, beschikbaar: c.beschikbaar, procent: c.procent, norm: medewerker.norm };
  };

  const stand = weekStand(gekozen, vandaag);
  const huidige = perWeek.get(gekozen) || null;
  const toekomst = stand === "toekomst";

  // De grafiek: de laatste twaalf weken tot en met deze week.
  const grafiekWeken = Array.from({ length: 12 }, (_, i) => plusWeken(deze, i - 11));
  const grafiek = grafiekWeken.map((w) => {
    const a = perWeek.get(w)?.antwoorden || {};
    return { key: w, label: `wk ${weekNummer(w).week}`, titel: weekTitel(w), waarden: { energie: a.energie || 0, werkdruk: a.werkdruk || 0, cijfer: a.cijfer || 0 } };
  });
  const heeftGrafiek = evaluaties.some((x) => grafiekWeken.includes(x.week));

  // De geschiedenis: alle gesloten weken sinds `sinds` die ingevuld zijn, plus de gemiste ertussen (na de eerste).
  const eerste = evaluaties.length ? evaluaties[evaluaties.length - 1].week : null;
  const geschiedenis: string[] = [];
  if (eerste) for (let w = plusWeken(vorige, -1); w >= eerste; w = plusWeken(w, -1)) geschiedenis.push(w);

  return (
    <div className="space-y-6">
      <Kop kanOverzicht={admin.permissions.includes("omzet")} />

      <nav className="grid gap-3 sm:grid-cols-2" aria-label="Weken">
        {[deze, vorige].map((w) => {
          const ingevuld = perWeek.has(w);
          const actief = w === gekozen;
          return (
            <Link
              key={w}
              href={w === deze ? "/admin/weekevaluatie" : `/admin/weekevaluatie?week=${w}`}
              aria-current={actief ? "page" : undefined}
              className={`acard flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${actief ? "!border-[#312e82]/40 ring-1 ring-[#312e82]/30" : ""}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${ingevuld ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#fff4e5] text-[#c77700]"}`}>
                {ingevuld ? <LuCircleCheck /> : <LuCircleDashed />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{w === deze ? "Deze week" : "Vorige week"}</span>
                <span className="block truncate text-[15px] font-semibold text-[#1c1a4e]">{weekTitel(w)}</span>
                <span className="block text-[12.5px] text-black/45">{ingevuld ? `Ingevuld · cijfer ${cijferTekst(perWeek.get(w)!.antwoorden.cijfer)}` : "Nog niet ingevuld"}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="acard p-6 sm:p-8" aria-labelledby="week-kop">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="week-kop" className="font-heading text-[20px] font-bold text-[#312e82]">{weekTitel(gekozen)}</h2>
          {stand === "gesloten" && <span className="apill gap-1 bg-black/[0.05] text-black/55"><LuLock className="text-[11px]" /> gesloten</span>}
          {toekomst && <span className="apill bg-black/[0.05] text-black/55">nog niet begonnen</span>}
        </div>
        {toekomst ? (
          <p className="text-[14.5px] text-black/50">Die week is nog niet begonnen. Kies deze week of vorige week.</p>
        ) : stand === "gesloten" && !huidige ? (
          <p className="text-[14.5px] text-black/50">Deze week heb je niet ingevuld, en hij is inmiddels gesloten. Een week kun je tot het eind van de week erna invullen.</p>
        ) : (
          <WeekevaluatieForm
            key={gekozen}
            week={gekozen}
            antwoorden={huidige?.antwoorden || null}
            open={stand === "open"}
            bijgewerkt={huidige ? MOMENT.format(new Date(huidige.updated_at)) : null}
            uren={urenVan(gekozen)}
          />
        )}
      </section>

      {heeftGrafiek && (
        <section className="acard p-6" aria-labelledby="grafiek-kop">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="grafiek-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Jouw laatste twaalf weken</h2>
            <p className="text-[12.5px] text-black/40">Energie, werkdruk en je cijfer per week. Een lege week is een week zonder evaluatie.</p>
          </div>
          <Staven
            titel="Jouw energie, werkdruk en cijfer per week, laatste twaalf weken"
            reeksen={[
              { key: "energie", label: "Energie", kleur: KLEUR.aqua },
              { key: "werkdruk", label: "Werkdruk", kleur: KLEUR.geel },
              { key: "cijfer", label: "Cijfer", kleur: KLEUR.violet },
            ]}
            punten={grafiek}
            gestapeld={false}
            formaat={(n) => cijferTekst(n)}
            minTop={10}
            hoogte={160}
          />
        </section>
      )}

      {geschiedenis.length > 0 && (
        <section className="acard overflow-hidden" aria-labelledby="geschiedenis-kop">
          <div className="border-b border-black/[0.06] px-6 py-4">
            <h2 id="geschiedenis-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Eerdere weken</h2>
            <p className="text-[12.5px] text-black/40">Om terug te lezen; aanpassen kan niet meer.</p>
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {geschiedenis.map((w) => {
              const x = perWeek.get(w);
              if (!x) {
                return (
                  <li key={w} className="flex items-center gap-3 px-6 py-3 text-[13.5px] text-black/40">
                    <LuCircleDashed className="shrink-0 text-[15px]" /> {weekTitel(w)} <span className="ml-auto text-[12.5px]">niet ingevuld</span>
                  </li>
                );
              }
              const a = x.antwoorden;
              return (
                <li key={w}>
                  <details className="group/week">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
                      <span className="text-[14.5px] font-semibold text-[#1c1a4e]">{weekTitel(w)}</span>
                      <span className="flex flex-wrap gap-x-3 text-[12.5px] tabular-nums text-black/50">
                        {SCHALEN.map((s) => (
                          <span key={s.sleutel}>{s.kort.toLowerCase()} <span className="font-semibold text-[#1c1a4e]">{cijferTekst(a[s.sleutel])}</span></span>
                        ))}
                      </span>
                      <span className="ml-auto text-[12.5px] font-semibold text-black/35 group-open/week:hidden">{heeftTekst(a) ? "Lees" : ""}</span>
                    </summary>
                    <div className="grid gap-4 px-6 pb-5 sm:grid-cols-2">
                      {TEKSTVRAGEN.filter((t) => a[t.sleutel]).map((t) => (
                        <div key={t.sleutel}>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{t.kort}</p>
                          <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1c1a4e]">{a[t.sleutel]}</p>
                        </div>
                      ))}
                      {!heeftTekst(a) && <p className="text-[13.5px] text-black/40">Alleen cijfers, geen tekst.</p>}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kop({ kanOverzicht = false }: { kanOverzicht?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Mijn weekevaluatie</h1>
        <p className="text-[14.5px] text-black/50">Vijf cijfers en een paar zinnen, elke week. Tot het eind van de week erna kun je nog aanpassen.</p>
      </div>
      {kanOverzicht && (
        <Link href="/admin/weekevaluatie/team" className="abtn-ghost !py-2 text-[13.5px]"><LuChartColumn className="text-[14px]" /> Kwartaaloverzicht</Link>
      )}
    </div>
  );
}
