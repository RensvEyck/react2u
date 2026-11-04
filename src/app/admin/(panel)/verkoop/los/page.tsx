import Link from "next/link";
import { LuArrowLeft, LuPlus, LuRepeat, LuTrash2, LuZap } from "react-icons/lu";
import { requireAdmin } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumLang, datumOver, euro, VORMEN, VORM_KEYS } from "@/lib/offertes";
import { maandNaam, maandVan, plusMaanden } from "@/lib/omzet";
import { losLabel, SOORT_LOS, type LosseOpdracht } from "@/lib/losseOpdrachten";
import { losOpslaan, losVerwijderen } from "@/app/admin/losActions";
import { Kerncijfer, MigratieNodig } from "@/components/admin/Kerncijfer";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { redirect } from "next/navigation";

/**
 * Losse klanten en opdrachten (migratie 0036): wat buiten de offertes om is
 * afgesproken, één voor één opgevoerd. Een klant met een abonnement (per
 * maand, sinds een datum) of een losse opdracht (een totaal op een datum).
 * Het telt mee in het salesdashboard en de omzet (lib/losseOpdrachten.ts).
 * Salesrecht of het recht omzet, net als de policy.
 */

export default async function Los() {
  const { sb, admin } = await requireAdmin();
  if (!admin.permissions.includes("bellijst") && !admin.permissions.includes("omzet")) redirect("/admin?fout=geen-rechten");
  const [l, v] = await Promise.all([
    sb.from("losse_opdrachten").select("*").order("datum", { ascending: false }).limit(2000),
    // Bekende verkopers als suggestie: de afzenders op de offertes.
    sb.from("offertes").select("afzender_naam").not("afzender_naam", "is", null).limit(1000),
  ]);
  if (isMissingTable(l.error)) {
    return (
      <div className="space-y-6">
        <Kop />
        <MigratieNodig bestand="0036_losse_opdrachten.sql" wat="Losse klanten en opdrachten hebben een nieuwe tabel nodig." />
      </div>
    );
  }

  const alle = ((l.data as LosseOpdracht[] | null) || []).map((x) => ({ ...x, bedrag: Number(x.bedrag) }));
  const maand = maandVan(new Date());
  const jaar = maand.slice(0, 4);
  const loopt = (x: LosseOpdracht) => x.soort === "abonnement" && x.datum.slice(0, 7) <= maand && (!x.stop || x.stop.slice(0, 7) > maand);
  const abonnementen = alle.filter((x) => x.soort === "abonnement");
  const lopend = abonnementen.filter(loopt);
  const opdrachten = alle.filter((x) => x.soort === "eenmalig");
  const ditJaar = opdrachten.filter((x) => x.datum.startsWith(jaar));
  const verkopers = [...new Set([
    ...((v.data as { afzender_naam: string }[] | null) || []).map((x) => x.afzender_naam.trim()),
    ...alle.map((x) => (x.verkoper || "").trim()),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));

  return (
    <div className="space-y-6">
      <Kop />
      {/* Bekende verkopers als keuze in elk formulier op deze pagina. */}
      <datalist id="los-verkopers">{verkopers.map((x) => <option key={x} value={x} />)}</datalist>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kerncijfer
          label="Lopende abonnementen"
          waarde={euro(lopend.reduce((s, x) => s + x.bedrag, 0))}
          achter="per maand"
          sub={`${lopend.length} klant${lopend.length === 1 ? "" : "en"}${abonnementen.length > lopend.length ? ` · ${abonnementen.length - lopend.length} gestopt of nog niet begonnen` : ""}`}
          accent={lopend.length > 0}
        />
        <Kerncijfer
          label={`Losse opdrachten ${jaar}`}
          waarde={euro(ditJaar.reduce((s, x) => s + x.bedrag, 0))}
          sub={`${ditJaar.length} opdracht${ditJaar.length === 1 ? "" : "en"}${opdrachten.length > ditJaar.length ? ` · ${opdrachten.length} in totaal` : ""}`}
        />
        <Kerncijfer label="Opgevoerd" waarde={String(alle.length)} sub="klanten en opdrachten buiten de offertes om" />
      </div>

      <section className="acard p-6" id="nieuw" aria-labelledby="nieuw-kop">
        <h2 id="nieuw-kop" className="mb-1 flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuPlus className="text-black/35" /> Opvoeren</h2>
        <p className="mb-4 text-[13px] text-black/45">Een bestaande klant die al een abonnement had voordat de offertes in het systeem kwamen, of een losse opdracht.</p>
        <LosForm vandaag={datumOver(0)} />
      </section>

      <section className="acard overflow-hidden" id="lijst" aria-labelledby="lijst-kop">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 id="lijst-kop" className="font-heading text-[16px] font-bold text-[#312e82]">
            Opgevoerd <span className="ml-1 text-[13px] font-semibold text-black/35">{alle.length}</span>
          </h2>
        </div>
        {alle.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-black/45">Nog niets opgevoerd. Begin hierboven met je eerste klant of opdracht.</p>
        ) : (
          <>
            {[
              { titel: "Klanten met abonnement", lijst: abonnementen, Icoon: LuRepeat },
              { titel: "Losse opdrachten", lijst: opdrachten, Icoon: LuZap },
            ].filter((g) => g.lijst.length).map((g) => (
              <div key={g.titel}>
                <p className="flex items-center gap-2 border-b border-black/[0.05] bg-[#fafafd] px-6 py-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-black/40">
                  <g.Icoon className="text-[13px]" /> {g.titel} <span className="font-semibold text-black/30">{g.lijst.length}</span>
                </p>
                <ul className="divide-y divide-black/[0.05]">
                  {g.lijst.map((x) => {
                    const lab = losLabel(x.vorm);
                    const gestopt = x.soort === "abonnement" && x.stop && x.stop.slice(0, 7) <= maand;
                    return (
                      <li key={x.id} id={`los-${x.id}`}>
                        <details className="group/rij">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={`truncate text-[14.5px] font-semibold ${gestopt ? "text-black/45" : "text-[#1c1a4e]"}`}>{x.bedrijf}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0 text-[11px] font-semibold text-black/55">
                                  <span className="h-2 w-2 rounded-full" style={{ background: lab.kleur }} aria-hidden />{lab.kort}
                                </span>
                                {gestopt && <span className="rounded-full bg-[#fff4e5] px-2 py-0 text-[11px] font-semibold text-[#b25e09]">Gestopt</span>}
                              </span>
                              <span className="block text-[12.5px] text-black/45">
                                {[
                                  x.omschrijving,
                                  x.soort === "abonnement"
                                    ? `sinds ${datumLang(x.datum)}${x.stop ? `, tot en met ${maandNaam(plusMaanden(x.stop.slice(0, 7), -1), true)}` : ""}`
                                    : datumLang(x.datum),
                                  x.verkoper,
                                ].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-[#1c1a4e]">
                              {euro(x.bedrag)} <span className="text-[12.5px] font-normal text-black/40">{x.soort === "abonnement" ? "per maand" : "eenmalig"}</span>
                            </span>
                            <span className="text-[12.5px] font-semibold text-black/35 group-open/rij:hidden">Wijzig</span>
                          </summary>
                          <div className="border-t border-black/[0.05] bg-[#fcfcfe] px-6 py-5">
                            <LosForm los={x} vandaag={datumOver(0)} />
                            <div className="mt-3">
                              <ConfirmButton
                                action={losVerwijderen.bind(null, x.id)}
                                message={`${x.bedrijf} verwijderen? Het telt dan ook in het verleden niet meer mee in de omzet. Is de klant gestopt, vul dan liever "gestopt vanaf" in.`}
                                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-black/40 hover:text-[#b42318]"
                              >
                                <LuTrash2 className="text-[13px]" /> Verwijderen
                              </ConfirmButton>
                            </div>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function Kop() {
  return (
    <div>
      <Link href="/admin/verkoop" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft className="text-[13px]" /> Verkoop</Link>
      <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Losse klanten en opdrachten</h1>
      <p className="text-[14.5px] text-black/50">Wat buiten de offertes om is afgesproken. Het telt mee in het salesdashboard en de omzet.</p>
    </div>
  );
}

function LosForm({ los, vandaag }: { los?: LosseOpdracht; vandaag: string }) {
  const id = los?.id ?? "nieuw";
  const veld = "ainput !py-2 text-[14px]";
  // De soort stuurt met :has() wat er zichtbaar is: geen "gestopt" bij een losse opdracht, en de juiste tekst
  // bij het bedrag. De klassen staan voluit, anders vindt Tailwind ze niet.
  return (
    <form action={losOpslaan} className="group/los grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {los && <input type="hidden" name="id" value={los.id} />}
      <fieldset className="sm:col-span-2 lg:col-span-6">
        <legend className="alabel">Soort</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["abonnement", "eenmalig"] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.1] bg-white p-3 has-[:checked]:border-[#312e82] has-[:checked]:bg-[#f7f7fc]">
              <input id={`los-soort-${s}-${id}`} type="radio" name="soort" value={s} defaultChecked={(los?.soort ?? "abonnement") === s} className="mt-0.5 accent-[#312e82]" />
              <span>
                <span className="block text-[14px] font-semibold text-[#1c1a4e]">{SOORT_LOS[s].label}</span>
                <span className="block text-[12.5px] text-black/45">
                  {s === "abonnement" ? "Een vast bedrag per maand, sinds een datum; telt elke maand mee tot hij stopt." : "Eén bedrag op één datum, bijvoorbeeld een RI&E of een traject."}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="lg:col-span-3">
        <span className="alabel">Klant</span>
        <input id={`los-bedrijf-${id}`} name="bedrijf" required maxLength={200} defaultValue={los?.bedrijf} className={veld} placeholder="Bijvoorbeeld Van Dijk Bouw" />
      </label>
      <label className="lg:col-span-3">
        <span className="alabel">Omschrijving</span>
        <input id={`los-omschrijving-${id}`} name="omschrijving" maxLength={300} defaultValue={los?.omschrijving ?? ""} className={veld} placeholder="Bijvoorbeeld verzuimbegeleiding, 40 medewerkers" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">Dienst</span>
        <select id={`los-vorm-${id}`} name="vorm" defaultValue={los?.vorm ?? ""} className={veld}>
          <option value="">Overig</option>
          {VORM_KEYS.map((v) => <option key={v} value={v}>{VORMEN[v].label}</option>)}
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">
          <span className="group-has-[input[value=eenmalig]:checked]/los:hidden">Bedrag per maand (€)</span>
          <span className="hidden group-has-[input[value=eenmalig]:checked]/los:inline">Totaalbedrag (€)</span>
        </span>
        <input id={`los-bedrag-${id}`} name="bedrag" required inputMode="decimal" defaultValue={los ? String(los.bedrag).replace(".", ",") : ""} className={veld} placeholder="Bijvoorbeeld 450" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">
          <span className="group-has-[input[value=eenmalig]:checked]/los:hidden">Klant sinds</span>
          <span className="hidden group-has-[input[value=eenmalig]:checked]/los:inline">Datum van de opdracht</span>
        </span>
        <input id={`los-datum-${id}`} type="date" name="datum" required defaultValue={los?.datum ?? vandaag} className={veld} />
      </label>
      <label className="lg:col-span-2 group-has-[input[value=eenmalig]:checked]/los:hidden">
        <span className="alabel">Gestopt vanaf <span className="font-normal text-black/40">eerste maand zonder omzet</span></span>
        <input id={`los-stop-${id}`} type="month" name="stop" defaultValue={los?.stop?.slice(0, 7) ?? ""} className={veld} placeholder="jjjj-mm, leeg: loopt door" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">Verkoper</span>
        <input id={`los-verkoper-${id}`} name="verkoper" maxLength={120} defaultValue={los?.verkoper ?? ""} className={veld} list="los-verkopers" placeholder="Wie de klant binnenhaalde" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">Contactpersoon</span>
        <input id={`los-cp-${id}`} name="contactpersoon" maxLength={200} defaultValue={los?.contactpersoon ?? ""} className={veld} />
      </label>
      <label className="sm:col-span-2 lg:col-span-4">
        <span className="alabel">Notitie</span>
        <input id={`los-notitie-${id}`} name="notitie" maxLength={2000} defaultValue={los?.notitie ?? ""} className={veld} placeholder="Bijvoorbeeld: contract op papier, factuur via Exact" />
      </label>
      <label className="lg:col-span-2">
        <span className="alabel">E-mail</span>
        <input id={`los-email-${id}`} type="email" name="email" maxLength={254} defaultValue={los?.email ?? ""} className={veld} />
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-6">
        <button className="abtn !py-2 text-[14px]">{los ? "Opslaan" : <><LuPlus /> Opvoeren</>}</button>
      </div>
    </form>
  );
}
