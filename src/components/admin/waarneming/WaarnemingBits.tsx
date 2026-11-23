import Link from "next/link";
import { LuArrowRight, LuCalendarRange, LuShieldAlert, LuUsersRound } from "react-icons/lu";
import { Avatar } from "@/components/admin/AccountMenu";
import {
  collegaBij, fase, gedekteKlanten, inkorten, klantenVan, naamVan, periodeTekst, standTekst, voornaamVan,
  MAX_TOELICHTING, NIETS_MEDISCH_WAARNEMING, TOEQAN_REGEL, type Collega, type Fase, type Waarneming, type WnKlant,
} from "@/lib/waarneming";

/** Bouwstenen van de waarneming (0057): pillen, de kaart van één waarneming, het formulier en de rij per collega. */

const FASE: Record<Fase, { label: string; kleur: string; stip: string }> = {
  actief: { label: "Nu", kleur: "bg-[#e6f6ee] text-[#1b7f4b]", stip: "bg-[#2fa66f]" },
  komend: { label: "Komend", kleur: "bg-[#eef0ff] text-[#312e82]", stip: "bg-[#5b57c7]" },
  voorbij: { label: "Geweest", kleur: "bg-black/[0.05] text-black/50", stip: "bg-black/25" },
};

export function FasePil({ f }: { f: Fase }) {
  const x = FASE[f];
  return <span className={`apill !py-0 inline-flex items-center gap-1.5 text-[11.5px] ${x.kleur}`}><span className={`h-1.5 w-1.5 rounded-full ${x.stip}`} aria-hidden /> {x.label}</span>;
}

export function Wie({ c, email, leeg }: { c: Collega | null; email?: string | null; leeg?: string }) {
  if (!c && !email) return <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#b86e00]"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[#e3a04a] text-[12px]">?</span> {leeg || "Nog geen waarnemer"}</span>;
  const naam = naamVan(c, email);
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-semibold text-[#1c1a4e]">
      <Avatar email={c?.email || email || "?"} className="h-7 w-7 text-[11px]" /> <span className="truncate">{naam}</span>
    </span>
  );
}

/** De kaart van één waarneming in het overzicht. */
export function WaarnemingKaartje({ w, collegas, klanten, vandaag, userId }: { w: Waarneming; collegas: Collega[]; klanten: WnKlant[]; vandaag: string; userId: string }) {
  const f = fase(w, vandaag);
  const afwezige = collegaBij(w.afwezige, collegas, w.afwezige_email);
  const waarnemer = collegaBij(w.waarnemer, collegas, w.waarnemer_email);
  const gedekt = gedekteKlanten(w, klanten, collegas);
  const jouw = w.afwezige === userId ? "jij" : w.waarnemer === userId ? "jij neemt waar" : null;
  return (
    <article className={`acard flex min-w-0 flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${!w.waarnemer && f !== "voorbij" ? "border-l-[3px] border-l-[#e3a04a]" : ""}`} id={`waarneming-${w.id}`} data-fase={f} data-afwezige={naamVan(afwezige, w.afwezige_email)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <FasePil f={f} />
        {jouw && <span className="apill !py-0 bg-[#fdecf4] text-[11px] text-[#c2185b]">{jouw}</span>}
        <span className="ml-auto text-[12.5px] text-black/45">{standTekst(w, vandaag)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Wie c={afwezige} email={w.afwezige_email} />
        <LuArrowRight className="shrink-0 text-black/30" aria-hidden />
        <Wie c={waarnemer} email={w.waarnemer_email} />
      </div>
      <p className="flex items-center gap-1.5 text-[13.5px] text-black/60"><LuCalendarRange className="shrink-0 text-black/35" aria-hidden /> {periodeTekst(w.van, w.tot)}</p>
      <p className="flex items-start gap-1.5 text-[13px] text-black/55">
        <LuUsersRound className="mt-0.5 shrink-0 text-black/35" aria-hidden />
        <span>
          {gedekt.length === 0 ? "Nog geen klant op naam" : gedekt.length === 1 ? "1 klant" : `${gedekt.length} klanten`}
          {gedekt.length > 0 && <span className="text-black/40">: {gedekt.slice(0, 3).map((k) => k.bedrijf).join(", ")}{gedekt.length > 3 ? ` en nog ${gedekt.length - 3}` : ""}</span>}
        </span>
      </p>
      {w.toelichting && <p className="rounded-xl bg-[#fbfaff] px-3.5 py-2.5 text-[13px] leading-[1.5] text-black/60">{inkorten(w.toelichting, 160)}</p>}
      <Link href={`/admin/waarneming/${w.id}`} className="mt-auto inline-flex items-center gap-1 self-start text-[13px] font-semibold text-[#312e82] hover:underline">De kaart <LuArrowRight className="text-[13px]" /></Link>
    </article>
  );
}

/**
 * De velden van het formulier. Bij het plannen gaat het om alle klanten op
 * naam; op de kaart van de waarneming kun je dat beperken tot een deel
 * (`metKlanten`). Het beheer kiest voor wie het geldt.
 */
export function WaarnemingVelden({ w, collegas, klanten, afwezige, beheer, vandaag, prefix, metKlanten }: {
  w?: Waarneming | null; collegas: Collega[]; klanten: WnKlant[]; afwezige: Collega | null; beheer: boolean; vandaag: string; prefix: string; metKlanten: boolean;
}) {
  const opNaam = afwezige ? klantenVan(afwezige, klanten, collegas) : [];
  const gekozen = new Set(w?.klant_ids || []);
  const keuze = metKlanten ? [...opNaam, ...klanten.filter((k) => gekozen.has(k.id) && !opNaam.some((x) => x.id === k.id))] : [];
  return (
    <>
      {beheer && (
        <div>
          <label htmlFor={`${prefix}-afwezige`} className="alabel">Voor wie</label>
          <select id={`${prefix}-afwezige`} name="afwezige" defaultValue={w?.afwezige ?? afwezige?.user_id ?? ""} className="ainput">
            {collegas.map((c) => <option key={c.user_id} value={c.user_id}>{naamVan(c)}{c.functie ? ` · ${c.functie}` : ""}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-van`} className="alabel">Eerste dag weg</label>
          <input id={`${prefix}-van`} name="van" type="date" required min={w ? undefined : vandaag} defaultValue={w?.van ?? ""} className="ainput" />
        </div>
        <div>
          <label htmlFor={`${prefix}-tot`} className="alabel">Laatste dag weg</label>
          <input id={`${prefix}-tot`} name="tot" type="date" required min={vandaag} defaultValue={w?.tot ?? ""} className="ainput" />
        </div>
      </div>
      <div>
        <label htmlFor={`${prefix}-waarnemer`} className="alabel">Wie neemt waar</label>
        <select id={`${prefix}-waarnemer`} name="waarnemer" defaultValue={w?.waarnemer ?? ""} className="ainput">
          <option value="">Nog niet bekend, het beheer regelt het</option>
          {collegas.filter((c) => c.user_id !== (w?.afwezige ?? afwezige?.user_id)).map((c) => <option key={c.user_id} value={c.user_id}>{naamVan(c)}{c.functie ? ` · ${c.functie}` : ""}</option>)}
        </select>
        <p className="mt-1 text-[12.5px] text-black/45">De waarnemer krijgt een mail met je klanten en wat je hieronder meegeeft.</p>
      </div>
      {metKlanten ? (
        <fieldset>
          <legend className="alabel">Welke klanten</legend>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-[#1c1a4e]">
            <input type="radio" name="klanten" value="alle" defaultChecked={!w || w.klant_ids.length === 0} className="h-4 w-4 accent-[#312e82]" />
            <span>Alle klanten op naam van {afwezige ? voornaamVan(afwezige) : "de collega"} <span className="text-black/45">({opNaam.length})</span></span>
          </label>
          <label className="mt-1.5 flex cursor-pointer items-center gap-2.5 text-[13.5px] text-[#1c1a4e]">
            <input type="radio" name="klanten" value="deze" defaultChecked={Boolean(w && w.klant_ids.length > 0)} className="h-4 w-4 accent-[#312e82]" />
            <span>Alleen deze klanten</span>
          </label>
          {keuze.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-black/45">Op de stamkaarten staat nog geen klant op naam van {afwezige ? voornaamVan(afwezige) : "deze collega"}. Het beheer vult de casemanager in op de stamkaart.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2" id={`${prefix}-klantkeuze`}>
              {keuze.map((k) => (
                <li key={k.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#fbfaff] px-3 py-2 text-[13.5px] text-[#1c1a4e]">
                    <input type="checkbox" name="klant" value={k.id} defaultChecked={gekozen.has(k.id)} className="h-4 w-4 accent-[#312e82]" />
                    <span className="min-w-0 truncate">{k.bedrijf}{k.plaats ? <span className="text-black/40"> · {k.plaats}</span> : null}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      ) : (
        <p className="rounded-xl bg-[#fbfaff] px-3.5 py-2.5 text-[13px] leading-[1.5] text-black/60">
          <span className="font-semibold text-[#312e82]">Welke klanten:</span>{" "}
          {afwezige && !beheer
            ? opNaam.length === 0
              ? "op de stamkaarten staat nog geen klant op jouw naam; het beheer vult de casemanager in."
              : `alle ${opNaam.length} ${opNaam.length === 1 ? "klant" : "klanten"} die op de stamkaart op jouw naam ${opNaam.length === 1 ? "staat" : "staan"}. Alleen een deel? Pas dat na het plannen aan op de kaart.`
            : "alle klanten die op de stamkaart op naam van de collega staan. Alleen een deel? Pas dat na het plannen aan op de kaart."}
        </p>
      )}
      <div>
        <label htmlFor={`${prefix}-toelichting`} className="alabel">Wat moet de waarnemer weten?</label>
        <textarea id={`${prefix}-toelichting`} name="toelichting" rows={3} maxLength={MAX_TOELICHTING} defaultValue={w?.toelichting ?? ""} placeholder="Lopende afspraken, wie terugbelt, waar het dossier van de werkwijze staat." className="ainput resize-y" />
        <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-black/45"><LuShieldAlert className="mt-0.5 shrink-0 text-[13px]" aria-hidden /> {NIETS_MEDISCH_WAARNEMING}</p>
        <p className="mt-1 text-[12.5px] text-black/45">{TOEQAN_REGEL}</p>
      </div>
    </>
  );
}

/** Per collega: naam, functie, klanten op naam, en of hij er is, weg is of waarneemt. */
export function PerCollega({ collegas, klanten, waarnemingen, vandaag, userId }: { collegas: Collega[]; klanten: WnKlant[]; waarnemingen: Waarneming[]; vandaag: string; userId: string }) {
  if (collegas.length === 0) return <p className="text-[13.5px] text-black/45">Nog geen collega met het recht waarneming.</p>;
  return (
    <ul className="divide-y divide-black/[0.05]" id="per-collega">
      {collegas.map((c) => {
        const opNaam = klantenVan(c, klanten, collegas);
        const weg = waarnemingen.filter((w) => w.afwezige === c.user_id && fase(w, vandaag) === "actief");
        const neemt = waarnemingen.filter((w) => w.waarnemer === c.user_id && fase(w, vandaag) === "actief");
        const straks = waarnemingen.filter((w) => w.afwezige === c.user_id && fase(w, vandaag) === "komend").sort((a, b) => a.van.localeCompare(b.van))[0];
        const stand = weg[0]
          ? { tekst: `is er niet, ${standTekst(weg[0], vandaag)}${weg[0].waarnemer ? `, ${voornaamVan(collegaBij(weg[0].waarnemer, collegas, weg[0].waarnemer_email), weg[0].waarnemer_email)} neemt waar` : ", nog geen waarnemer"}`, kleur: weg[0].waarnemer ? "text-[#b86e00]" : "text-[#e0356b] font-semibold" }
          : neemt.length
            ? { tekst: `neemt waar voor ${neemt.map((w) => voornaamVan(collegaBij(w.afwezige, collegas, w.afwezige_email), w.afwezige_email)).join(" en ")}`, kleur: "text-[#1b7f4b]" }
            : straks
              ? { tekst: `is er, weg ${standTekst(straks, vandaag)}`, kleur: "text-black/55" }
              : { tekst: "is er", kleur: "text-black/55" };
        return (
          <li key={c.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3" data-collega={naamVan(c)}>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar email={c.email} className="h-8 w-8 text-[12px]" />
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold text-[#1c1a4e]">{naamVan(c)}{c.user_id === userId ? <span className="font-normal text-black/40"> (jij)</span> : null}</span>
                <span className="block truncate text-[12.5px] text-black/45">{c.functie || "functie nog niet ingevuld"} · {opNaam.length === 0 ? "geen klant op naam" : opNaam.length === 1 ? "1 klant" : `${opNaam.length} klanten`}</span>
              </span>
            </span>
            <span className={`w-full text-[13px] sm:w-auto ${stand.kleur}`}>{stand.tekst}</span>
          </li>
        );
      })}
    </ul>
  );
}
