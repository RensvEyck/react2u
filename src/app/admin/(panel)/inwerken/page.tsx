import Link from "next/link";
import { LuArrowRight, LuFlag, LuHandshake, LuPlus, LuRoute } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { dagTekst, FASES, soortAantal, SOORT_VOLGORDE, stappenWoord } from "@/lib/inwerkreis";
import { haalOverzicht } from "@/lib/inwerkreisDb";
import { datumOver } from "@/lib/offertes";
import { inwerkreisStarten, inwerkSjabloonToevoegen } from "@/app/admin/inwerkreisActions";
import { DagenBalk } from "@/components/admin/inwerk/Reis";

/**
 * Inwerken (0050, recht omzet): de lopende inwerkreizen, een reis starten voor
 * een nieuwe collega, en per functie het sjabloon met de stappen. De
 * sjablonen beginnen leeg (Rens, 19 nov 2026: "leeg sjabloon"); de inhoud
 * komt van React2u zelf.
 */
export default async function Inwerken() {
  const { sb } = await requirePerm("omzet");
  const vandaag = datumOver(0);
  const uit = await haalOverzicht(sb, vandaag);

  if (!uit.ok) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Inwerken</h1>
        <p className="acard px-6 py-5 text-[14px] text-black/55">
          {uit.fout === "migratie" ? "De inwerkreis staat nog niet aan: migratie 0050 moet eerst in Supabase worden uitgevoerd." : "Kon de inwerkreizen niet laden. Probeer het straks nog eens."}
        </p>
      </div>
    );
  }

  const { reizen, sjablonen, collegas } = uit.data;
  const metReis = new Set(reizen.map((r) => r.reis.user_id));
  const zonderReis = collegas.filter((c) => !metReis.has(c.user_id));
  const lopend = reizen.filter((r) => !r.reis.afgerond_at);
  const afgerond = reizen.filter((r) => r.reis.afgerond_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Inwerken</h1>
        <p className="text-[14.5px] text-black/50">
          Een inwerkreis per nieuwe collega: per functie een sjabloon met taken, oefencasussen en mijlpalen voor de eerste 30, 60 en 90 dagen.
        </p>
      </div>

      <section className="acard overflow-hidden" aria-labelledby="lopend-kop" id="lopend">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
          <h2 id="lopend-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuRoute /> Lopende inwerkreizen
            <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#312e82]">{lopend.length}</span>
          </h2>
          <p className="text-[12.5px] text-black/40">De collega ziet de reis onder Inwerkreis en op het eigen dashboard.</p>
        </div>
        {lopend.length === 0 ? (
          <p className="px-6 py-5 text-[13.5px] text-black/45">Er loopt nu geen inwerkreis. Start er hieronder een voor een nieuwe collega.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {lopend.map((r) => (
              <li key={r.reis.id}>
                <Link href={`/admin/inwerken/${r.reis.id}`} className="grid gap-x-6 gap-y-3 px-6 py-4 transition-colors hover:bg-black/[0.02] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-reis={r.collega?.email || r.reis.user_id}>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#1c1a4e]">{r.collega?.naam || "Onbekende collega"}</p>
                    <p className="truncate text-[12.5px] text-black/45">{r.functie} · {dagTekst(r.stand.dag)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {!r.reis.aan && <span className="apill bg-black/[0.06] !py-0.5 text-[11.5px] text-black/55">Staat uit</span>}
                      {r.reis.buddy &&<span className="apill bg-[#f6f5fb] !py-0.5 text-[11.5px] text-black/55"><LuHandshake className="text-[11px]" /> {r.reis.buddy}</span>}
                      {r.stand.mijlpalenOpen > 0 && (
                        <span className="apill bg-[#fff4e5] !py-0.5 text-[11.5px] text-[#b86e00]"><LuFlag className="text-[11px]" /> {r.stand.mijlpalenOpen === 1 ? "1 mijlpaal" : `${r.stand.mijlpalenOpen} mijlpalen`} af te tekenen</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 self-center">
                    <DagenBalk stand={r.stand} klein />
                    <p className="mt-1.5 text-[12px] tabular-nums text-black/45">{r.stand.gedaan} van {r.stand.totaal} {stappenWoord(r.stand.totaal)} gedaan</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {afgerond.length > 0 && (
          <details className="border-t border-black/[0.05] px-6 py-3">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">Afgeronde inwerkreizen ({afgerond.length})</summary>
            <ul className="mt-2 space-y-1.5 pb-1">
              {afgerond.map((r) => (
                <li key={r.reis.id}>
                  <Link href={`/admin/inwerken/${r.reis.id}`} className="text-[13.5px] text-[#312e82] hover:underline">{r.collega?.naam || "Onbekende collega"} · {r.functie}</Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="acard p-6" aria-labelledby="starten-kop" id="starten">
        <h2 id="starten-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Inwerkreis starten</h2>
        <p className="mb-4 mt-0.5 text-[12.5px] text-black/45">
          Voor een collega met een inlog. Nog geen inlog? Nodig de collega eerst uit onder Gebruikers, met de rol Werknemer.
        </p>
        {zonderReis.length === 0 ? (
          <p className="text-[13.5px] text-black/45">Iedere collega met een inlog heeft al een inwerkreis.</p>
        ) : (
          <form action={inwerkreisStarten} className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="start-collega" className="alabel">Collega</label>
              <select id="start-collega" name="user_id" required className="ainput" defaultValue="">
                <option value="" disabled>Kies een collega</option>
                {zonderReis.map((c) => <option key={c.user_id} value={c.user_id}>{c.naam} · {c.rol}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="start-functie" className="alabel">Functie</label>
              <select id="start-functie" name="sjabloon_id" required className="ainput" defaultValue="">
                <option value="" disabled>Kies een functie</option>
                {sjablonen.map((s) => <option key={s.id} value={s.id}>{s.functie}{s.stappen.length ? "" : " (nog leeg)"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="start-datum" className="alabel">Eerste werkdag</label>
              <input id="start-datum" name="startdatum" type="date" required defaultValue={vandaag} className="ainput" />
            </div>
            <div>
              <label htmlFor="start-buddy" className="alabel">Buddy</label>
              <input id="start-buddy" name="buddy" maxLength={120} placeholder="Naam van de collega die meeloopt" className="ainput" />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button className="abtn"><LuRoute /> Inwerkreis starten</button>
              <p className="text-[12.5px] text-black/40">Een leeg sjabloon mag: de collega ziet de stappen zodra je ze toevoegt.</p>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="sjablonen-kop" id="sjablonen" className="space-y-3">
        <div>
          <h2 id="sjablonen-kop" className="font-heading text-[18px] font-bold text-[#312e82]">Sjablonen per functie</h2>
          <p className="text-[13px] text-black/45">Wat een nieuwe collega in die functie doet. Een wijziging geldt meteen, ook voor wie al onderweg is.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sjablonen.map((s) => (
            <article key={s.id} className="acard flex flex-col gap-4 p-5" data-functie={s.functie}>
              <div>
                <h3 className="font-heading text-[17px] font-bold text-[#1c1a4e]">
                  <Link href={`/admin/inwerken/sjabloon/${s.id}`} className="hover:text-[#312e82] hover:underline">{s.functie}</Link>
                </h3>
                <p className="mt-0.5 text-[12.5px] text-black/45">
                  {s.stappen.length === 0 ? "Nog leeg" : `${s.stappen.length} ${stappenWoord(s.stappen.length)}`}
                  {s.inGebruik > 0 ? ` · bij ${s.inGebruik} ${s.inGebruik === 1 ? "collega" : "collega's"} in gebruik` : ""}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2">
                {FASES.map((f) => (
                  <div key={f.fase} className="rounded-[12px] bg-[#f6f5fb] px-3 py-2">
                    <dt className="text-[11.5px] font-semibold leading-tight text-black/45">Tot dag {f.tot}</dt>
                    <dd className="font-heading text-[20px] font-bold leading-none tabular-nums text-[#1c1a4e]">{s.stappen.filter((x) => x.fase === f.fase).length}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[12px] text-black/40">
                {SOORT_VOLGORDE.map((k) => soortAantal(k, s.stappen.filter((x) => x.soort === k).length)).join(" · ")}
              </p>
              <div className="mt-auto">
                <Link href={`/admin/inwerken/sjabloon/${s.id}`} className="abtn-ghost !px-3.5 !py-2 text-[13.5px]">{s.stappen.length ? "Sjabloon bewerken" : "Sjabloon vullen"} <LuArrowRight /></Link>
              </div>
            </article>
          ))}
          <form action={inwerkSjabloonToevoegen} className="flex flex-col gap-3 rounded-[16px] border border-dashed border-black/[0.12] p-5">
            <label htmlFor="nieuwe-functie" className="font-heading text-[15px] font-bold text-[#1c1a4e]">Nieuwe functie</label>
            <input id="nieuwe-functie" name="functie" required maxLength={120} placeholder="Bijvoorbeeld Bedrijfsarts" className="ainput" />
            <div className="mt-auto"><button className="abtn-ghost !px-3.5 !py-2 text-[13.5px]"><LuPlus /> Sjabloon toevoegen</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
