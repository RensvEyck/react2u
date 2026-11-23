import Link from "next/link";
import { LuLock, LuMessageCircle, LuShieldAlert } from "react-icons/lu";
import { Avatar } from "@/components/admin/AccountMenu";
import StemKnop from "@/components/admin/ideeen/StemKnop";
import { stemZetten } from "@/app/admin/ideeenActions";
import {
  bronTekst, IDEE_SOORTEN, IDEE_STATUS, magStemmen, MAX_TEKST, MAX_TITEL, naamVan, NIETS_MEDISCH_BORD, soortInfo, statusInfo, toonTekst, wanneer,
  type BordIdee, type Idee, type IdeeStatus, type Kijker,
} from "@/lib/ideeen";

/** De bouwstenen van het bord: pillen, de kaart en de velden van het formulier. */

export function SoortPil({ soort }: { soort: Idee["soort"] }) {
  const s = soortInfo(soort);
  return <span className={`apill !py-0 text-[11px] ${s.kleur}`}>{s.kort}</span>;
}

export function StatusPil({ status, groot = false }: { status: IdeeStatus; groot?: boolean }) {
  const s = statusInfo(status);
  return (
    <span className={`apill inline-flex items-center gap-1.5 ${groot ? "!text-[12.5px]" : "!py-0 text-[11px]"} ${s.kleur}`} data-status={status}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.stip}`} aria-hidden /> {s.label}
    </span>
  );
}

export function VertrouwelijkPil() {
  return <span className="apill inline-flex items-center gap-1 !py-0 bg-[#1c1a4e] text-[11px] text-white"><LuLock className="text-[11px]" aria-hidden /> alleen beheer</span>;
}

/**
 * Eén idee op het bord: soort en status, de titel (naar de kaart), het begin
 * van de tekst, wat het beheer erbij schreef, wie en wanneer, reacties en de
 * stemknop.
 */
export function IdeeKaart({ idee, kijker, vandaag }: { idee: BordIdee; kijker: Kijker; vandaag: string }) {
  const eigen = idee.door === kijker.userId;
  const bron = bronTekst(idee);
  const tekst = toonTekst(idee);
  return (
    <article className="acard flex min-w-0 flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lg" data-idee={idee.titel} data-status={idee.status} id={`idee-${idee.id}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <SoortPil soort={idee.soort} />
        <StatusPil status={idee.status} />
        {idee.vertrouwelijk && <VertrouwelijkPil />}
        {eigen && <span className="apill !py-0 bg-[#fdecf4] text-[11px] text-[#c2185b]">jouw idee</span>}
      </div>
      <h3 className="font-heading text-[17px] font-bold leading-snug text-[#1c1a4e]">
        <Link href={`/admin/ideeen/${idee.id}`} className="hover:text-[#e75387]">{idee.titel}</Link>
      </h3>
      {tekst && <p className="line-clamp-3 whitespace-pre-line text-[14px] leading-[1.55] text-black/60">{tekst}</p>}
      {idee.reden && idee.status !== "ingediend" && (
        <p className="rounded-xl bg-[#fbfaff] px-3.5 py-2.5 text-[13px] leading-[1.5] text-black/60">
          <span className="font-semibold text-[#312e82]">Het beheer:</span> {idee.reden}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
        <span className="flex min-w-0 items-start gap-2 text-[12.5px] leading-[1.45] text-black/45">
          <Avatar email={idee.door_email || "?"} className="h-6 w-6 text-[11px]" />
          <span className="min-w-0 pt-0.5"><span className="font-semibold text-black/60">{eigen ? "Jij" : naamVan(idee.door_email)}</span> · {wanneer(idee.created_at, vandaag)}{bron ? ` · ${bron}` : ""}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Link href={`/admin/ideeen/${idee.id}#reacties`} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold tabular-nums text-black/45 transition-colors hover:bg-[#f6f5fb] hover:text-[#312e82]" aria-label={`${idee.reacties} ${idee.reacties === 1 ? "reactie" : "reacties"}`} data-reacties={idee.reacties}>
            <LuMessageCircle className="text-[15px]" aria-hidden /> {idee.reacties}
          </Link>
          <StemKnop aantal={idee.stemmen} mijn={idee.mijnStem} mag={magStemmen(idee, kijker)} zet={stemZetten.bind(null, idee.id)} />
        </span>
      </div>
    </article>
  );
}

/** De velden van een idee, voor indienen en aanpassen. */
export function IdeeVelden({ idee, prefix }: { idee?: Pick<Idee, "titel" | "tekst" | "soort" | "vertrouwelijk"> | null; prefix: string }) {
  return (
    <>
      <div>
        <label htmlFor={`${prefix}-titel`} className="alabel">Waar gaat het over?</label>
        <input id={`${prefix}-titel`} name="titel" required maxLength={MAX_TITEL} defaultValue={idee?.titel ?? ""} placeholder="Kort, zoals een kop: Vaste belmomenten in de ochtend" className="ainput" />
      </div>
      <div>
        <label htmlFor={`${prefix}-tekst`} className="alabel">Vertel</label>
        <textarea id={`${prefix}-tekst`} name="tekst" required rows={4} maxLength={MAX_TEKST} defaultValue={idee?.tekst ?? ""} placeholder="Wat is het, waarom helpt het, wat heb je nodig?" className="ainput resize-y" />
      </div>
      <fieldset>
        <legend className="alabel">Wat is het?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {IDEE_SOORTEN.map((s) => (
            <label key={s.key} className="cursor-pointer">
              <input type="radio" name="soort" value={s.key} defaultChecked={(idee?.soort ?? "idee") === s.key} className="peer sr-only" />
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors peer-checked:border-transparent peer-checked:ring-2 peer-checked:ring-[#312e82]/60 peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#e75387]/35 ${s.kleur} border-transparent opacity-70 peer-checked:opacity-100`}>{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-[#1c1a4e]">
        <input type="checkbox" name="vertrouwelijk" value="aan" defaultChecked={Boolean(idee?.vertrouwelijk)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#312e82]" />
        <span>
          <span className="inline-flex items-center gap-1.5 font-semibold"><LuLock className="text-[13px] text-[#312e82]" aria-hidden /> Alleen voor het beheer</span>
          <span className="block text-[12.5px] text-black/50">Dan staat het niet op het bord voor je collega&apos;s; het beheer leest het wel en geeft je terugkoppeling.</span>
        </span>
      </label>
      <p className="flex items-start gap-1.5 text-[12.5px] text-black/45"><LuShieldAlert className="mt-0.5 shrink-0 text-[13px]" aria-hidden /> {NIETS_MEDISCH_BORD}</p>
    </>
  );
}

/** De vijf statussen op een rij, zoals een idee ze doorloopt; "niet nu" staat ernaast. */
export function StatusPad({ status }: { status: IdeeStatus }) {
  const pad = IDEE_STATUS.filter((s) => s.key !== "niet_nu");
  const huidig = pad.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-wrap items-center gap-y-2" aria-label="Waar het idee staat">
      {pad.map((s, i) => {
        const gehad = huidig >= 0 && i <= huidig;
        const nu = s.key === status;
        return (
          <li key={s.key} className="flex items-center">
            {i > 0 && <span className={`mx-1.5 h-px w-4 sm:w-6 ${gehad ? "bg-[#312e82]" : "bg-black/15"}`} aria-hidden />}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${nu ? statusInfo(s.key).kleur + " ring-2 ring-black/10" : gehad ? "text-[#312e82]" : "text-black/35"}`} aria-current={nu ? "step" : undefined}>
              <span className={`h-2 w-2 rounded-full ${gehad ? statusInfo(s.key).stip : "bg-black/15"}`} aria-hidden /> {s.label}
            </span>
          </li>
        );
      })}
      {status === "niet_nu" && (
        <li className="ml-2 flex items-center">
          <StatusPil status="niet_nu" groot />
        </li>
      )}
    </ol>
  );
}
