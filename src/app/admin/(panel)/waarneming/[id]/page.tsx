import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuArrowRight, LuCalendarRange, LuIdCard, LuPencil, LuTrash2, LuTriangleAlert, LuUsersRound } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import { collegaBij, duurDagen, fase, gedekteKlanten, isUuid, naamVan, overlapt, periodeTekst, standTekst, voornaamVan } from "@/lib/waarneming";
import { haalWaarneming } from "@/lib/waarnemingDb";
import { inMijnReact2u } from "@/lib/weergave";
import { waarnemingWeg, waarnemingWijzigen } from "@/app/admin/waarnemingActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import { FasePil, WaarnemingVelden, Wie } from "@/components/admin/waarneming/WaarnemingBits";

/**
 * De kaart van één waarneming (0060): wie er niet is, wie waarneemt, welke
 * klanten en wat de waarnemer moet weten. De afwezige collega past het aan
 * zolang het nog loopt of komt; het beheer altijd, ook de klanten en voor wie.
 */
export default async function WaarnemingKaart({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { sb, admin } = await requirePerm("waarneming");
  const mijn = await inMijnReact2u(admin.permissions);
  const beheer = admin.permissions.includes("omzet") && !mijn;
  const vandaag = datumOver(0);
  const uit = await haalWaarneming(sb, id, vandaag);
  if (!uit.ok) {
    return uit.fout === "migratie"
      ? <MigratieNodig bestand="0060_waarneming.sql" wat="De waarneming heeft een nieuwe tabel en een nieuw recht nodig." />
      : <p className="acard px-6 py-5 text-[14px] text-black/55">De waarneming kon niet geladen worden. Probeer het straks nog eens.</p>;
  }
  if (!uit.data.waarneming) notFound();
  const { waarneming: w, collegas, klanten, andere } = uit.data;
  const f = fase(w, vandaag);
  const afwezige = collegaBij(w.afwezige, collegas, w.afwezige_email);
  const waarnemer = collegaBij(w.waarnemer, collegas, w.waarnemer_email);
  const gedekt = gedekteKlanten(w, klanten, collegas);
  const eigen = w.afwezige === admin.userId;
  const magWijzigen = beheer || (eigen && f !== "voorbij");
  const magStamkaart = admin.permissions.includes("bellijst");
  const dubbel = overlapt(w, andere);
  const dagen = duurDagen(w.van, w.tot);
  const door = collegaBij(w.door, collegas);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/waarneming" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle waarnemingen
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FasePil f={f} />
              {eigen && <span className="apill !py-0 bg-[#fdecf4] text-[11px] text-[#c2185b]">jouw afwezigheid</span>}
              {!w.waarnemer && f !== "voorbij" && <span className="apill !py-0 bg-[#fff4e5] text-[11px] text-[#b86e00]">nog geen waarnemer</span>}
            </div>
            <h1 className="mt-1.5 font-heading text-[26px] font-bold leading-tight text-[#312e82]" data-waarneming-titel>
              {eigen ? "Jij bent" : `${naamVan(afwezige, w.afwezige_email)} is`} er niet {periodeTekst(w.van, w.tot)}
            </h1>
            <p className="mt-1 text-[14.5px] text-black/50">
              {dagen} {dagen === 1 ? "dag" : "dagen"} · {standTekst(w, vandaag)}
              {w.waarnemer ? ` · ${voornaamVan(waarnemer, w.waarnemer_email)} neemt waar` : f === "voorbij" ? " · zonder waarnemer" : " · het beheer zoekt nog een waarnemer"}
            </p>
          </div>
          {magWijzigen && <a href="#wijzigen" className="abtn-ghost !py-2 text-[13.5px]"><LuPencil /> Aanpassen</a>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {/* ---------- wie ---------- */}
          <section className="acard p-6" id="wie" aria-labelledby="wie-kop">
            <h2 id="wie-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Wie</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Er niet</p>
                <Wie c={afwezige} email={w.afwezige_email} />
              </div>
              <LuArrowRight className="hidden text-black/30 sm:block" aria-hidden />
              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Neemt waar</p>
                <Wie c={waarnemer} email={w.waarnemer_email} leeg={f === "voorbij" ? "Geen waarnemer" : "Nog geen waarnemer"} />
              </div>
            </div>
            {dubbel && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff4e5] px-3.5 py-2.5 text-[13px] text-[#8a5a00]" id="overlap">
                <LuTriangleAlert className="mt-0.5 shrink-0" aria-hidden /> Deze periode overlapt met een andere afwezigheid van {eigen ? "jou" : voornaamVan(afwezige, w.afwezige_email)}. Dat kan kloppen (twee waarnemers), maar kijk het even na.
              </p>
            )}
          </section>

          {/* ---------- klanten ---------- */}
          <section className="acard p-6" id="klanten" aria-labelledby="klanten-kop">
            <h2 id="klanten-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
              <LuUsersRound className="text-black/35" /> {gedekt.length === 0 ? "Klanten" : gedekt.length === 1 ? "1 klant" : `${gedekt.length} klanten`}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-black/45">
              {w.klant_ids.length > 0 ? "Alleen deze klanten gaan over naar de waarnemer." : `Alle klanten die op de stamkaart op naam van ${eigen ? "jou" : voornaamVan(afwezige, w.afwezige_email)} staan.`}
            </p>
            {gedekt.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-black/50">Op de stamkaarten staat nog geen klant op naam. Het beheer vult het veld casemanager in op de stamkaart; daarna staan ze hier vanzelf.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-klanten={gedekt.length}>
                {gedekt.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fbfaff] px-3.5 py-2 text-[13.5px]">
                    <span className="min-w-0 truncate text-[#1c1a4e]">{k.bedrijf}{k.plaats ? <span className="text-black/40"> · {k.plaats}</span> : null}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[12px] text-black/40">
                      {k.medewerkers ? `${k.medewerkers} wn` : ""}
                      {magStamkaart && <Link href={`/admin/klanten/${k.id}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-black/35 hover:bg-[#eef0ff] hover:text-[#312e82]" aria-label={`Stamkaart van ${k.bedrijf}`} title="Stamkaart"><LuIdCard className="text-[14px]" /></Link>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- toelichting ---------- */}
          <section className="acard p-6" id="toelichting" aria-labelledby="toelichting-kop">
            <h2 id="toelichting-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Wat de waarnemer moet weten</h2>
            {w.toelichting ? (
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.6] text-[#1c1a4e]">{w.toelichting}</p>
            ) : (
              <p className="mt-2 text-[13.5px] text-black/45">Nog niets meegegeven.{magWijzigen ? " Zet bij Aanpassen erbij wat er loopt." : ""}</p>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          {/* ---------- stand ---------- */}
          <section className="acard p-6" id="stand" aria-labelledby="stand-kop">
            <h2 id="stand-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuCalendarRange className="text-black/35" /> Periode</h2>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              <div className="flex justify-between gap-3"><dt className="text-black/45">Eerste dag weg</dt><dd className="font-semibold text-[#1c1a4e]">{periodeTekst(w.van, w.van)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-black/45">Laatste dag weg</dt><dd className="font-semibold text-[#1c1a4e]">{periodeTekst(w.tot, w.tot)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-black/45">Gepland door</dt><dd className="text-[#1c1a4e]">{w.door === admin.userId ? "jij" : door ? naamVan(door) : w.door === w.afwezige ? naamVan(afwezige, w.afwezige_email) : "het beheer"}</dd></div>
            </dl>
            {w.waarnemer && f !== "voorbij" && <p className="mt-3 text-[12.5px] text-black/45">{voornaamVan(waarnemer, w.waarnemer_email)} kreeg een mail met de klanten en de toelichting. Op de klantenkaart en het klantenbord staat zolang de naam van de waarnemer bij de klant.</p>}
          </section>

          {/* ---------- aanpassen ---------- */}
          {magWijzigen && (
            <section className="acard p-6" id="wijzigen" aria-labelledby="wijzigen-kop">
              <h2 id="wijzigen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuPencil className="text-black/35" /> Aanpassen</h2>
              <form action={waarnemingWijzigen} className="mt-3 space-y-4">
                <input type="hidden" name="id" value={w.id} />
                <WaarnemingVelden w={w} collegas={collegas} klanten={klanten} afwezige={afwezige} beheer={beheer} vandaag={vandaag} prefix="wijzig" metKlanten />
                <button className="abtn">Bewaren</button>
              </form>
              <div className="mt-4 border-t border-black/[0.06] pt-4">
                <ConfirmButton action={waarnemingWeg.bind(null, w.id)} message="Deze waarneming weghalen? De klanten staan dan weer alleen op naam van de casemanager." className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#b42318] hover:underline">
                  <LuTrash2 aria-hidden /> Weghalen
                </ConfirmButton>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
