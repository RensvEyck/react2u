"use client";
import { useActionState, useMemo, useState } from "react";
import { sendKandidaatMail, type KandidaatMailState } from "@/app/admin/actions";
import { SJABLONEN, sjabloonDef, stelOp, veldWaarde, type Sjabloon, type VeldKey } from "@/lib/kandidaatMail";
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuMail, LuSend, LuX } from "react-icons/lu";

const IDLE: KandidaatMailState = { status: "idle" };

const FASE_LABEL: Record<string, string> = { gesprek: "Gesprek", afgewezen: "Afgewezen", aanbod: "Aanbod" };

export type Gemaild = { label: string; wanneer: string; door: string };

/**
 * "Mail kandidaat" op de sollicitatiekaart: kies een vast sjabloon, vul het
 * moment of de plek in, voeg eventueel een eigen alinea toe en zie rechts de
 * mail zoals de kandidaat hem leest, in zijn taal. Verstuurd wordt via de
 * server action; de fase gaat mee (uitnodiging → gesprek, afwijzing →
 * afgewezen) en de mail komt in het logboek onder de kaart.
 *
 * De fase alleen verzetten mailt niemand. Staat een kandidaat op afgewezen
 * zonder dat er een afwijzing is gestuurd, dan zegt `herinnering` dat, met één
 * klik naar het voorgestelde sjabloon.
 */
export default function KandidaatMail({
  appId, naam, email, vacature, taal, retainLonger, afzender, gemaild, voorstel = "uitnodiging", herinnering,
}: {
  appId: string;
  naam: string;
  email: string;
  vacature: string | null;
  taal: "nl" | "en";
  retainLonger: boolean;
  /** Voornaam van wie is ingelogd, als standaard onder de mail. */
  afzender: string;
  gemaild: Gemaild[];
  /** Het sjabloon dat past bij de fase, als eerste keuze. */
  voorstel?: Sjabloon;
  /** Wat de kandidaat nog niet van ons hoorde, bijv. "Nog geen afwijzing gemaild". */
  herinnering?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sjabloon, setSjabloon] = useState<Sjabloon>(voorstel);
  const [velden, setVelden] = useState<Partial<Record<VeldKey, string>>>({});
  const [toevoeging, setToevoeging] = useState("");
  const [naamAfzender, setNaamAfzender] = useState(afzender);
  const [state, action, pending] = useActionState(sendKandidaatMail.bind(null, appId), IDLE);

  const def = sjabloonDef(sjabloon);
  const waarde = (k: VeldKey) => veldWaarde(def, k, velden, taal);
  const brief = useMemo(() => {
    // Een leeg verplicht veld (nog geen moment) als "…" in het voorbeeld, niet als gat in de zin.
    const d = sjabloonDef(sjabloon);
    const ingevuld = Object.fromEntries(d.velden.map((v) => [v.key, veldWaarde(d, v.key, velden, taal) || "…"]));
    return stelOp(sjabloon, { naam, vacature, taal, retainLonger, afzender: naamAfzender, ...ingevuld, toevoeging });
  }, [sjabloon, naam, vacature, taal, retainLonger, naamAfzender, velden, toevoeging]);
  const faseLabel = def.fase ? FASE_LABEL[def.fase] : null;

  return (
    <div className="mt-4 border-t border-black/[0.06] pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="abtn-ghost !py-1.5 text-[13px]">
          {open ? <LuX className="text-[13px]" /> : <LuMail className="text-[13px]" />}
          {open ? "Sluiten" : "Mail kandidaat"}
        </button>
        {herinnering && !open && state.status !== "ok" && (
          <button
            type="button" onClick={() => { setSjabloon(voorstel); setOpen(true); }}
            className="apill bg-[#fff4e5] text-[12.5px] text-[#a35f00] ring-1 ring-[#c77700]/20 transition hover:bg-[#ffecd1]"
          >
            <LuCircleAlert className="mr-1 inline text-[12px]" />
            {herinnering}
          </button>
        )}
        {gemaild.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2 text-[12.5px] text-black/55" aria-label="Verstuurde mails">
            {gemaild.map((m, i) => (
              <li key={i} className="apill bg-black/[0.05] text-black/65">
                <LuSend className="mr-1 inline text-[11px]" />
                {m.label} <span className="opacity-60">· {m.wanneer} · {m.door}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <form action={action} className="mt-4 grid gap-5 rounded-[14px] border border-[#312e82]/12 bg-[#f7f7fc] p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="alabel mb-2">Sjabloon</p>
              <div className="flex flex-wrap gap-2">
                {SJABLONEN.map((s) => (
                  <button
                    key={s.key} type="button" onClick={() => setSjabloon(s.key)} aria-pressed={sjabloon === s.key}
                    className={`apill !px-3 !py-1.5 text-[13px] transition ${sjabloon === s.key ? "bg-[#312e82] text-white" : "bg-white text-black/60 ring-1 ring-black/10 hover:bg-[#eef0ff]"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="sjabloon" value={sjabloon} />
              <p className="mt-2 text-[12.5px] text-black/50">
                {def.uitleg}
                {faseLabel && <> Zet de fase op <strong className="font-semibold text-[#312e82]">{faseLabel}</strong>.</>}
                {taal === "en" && <> De kandidaat solliciteerde via de Engelse site: de mail gaat <strong className="font-semibold text-[#312e82]">in het Engels</strong>.</>}
              </p>
            </div>

            {def.velden.map((v) => (
              <label key={v.key} className="block">
                <span className="alabel">{v.label}</span>
                <input
                  name={v.key} value={waarde(v.key)} placeholder={v.hint} required={v.verplicht} maxLength={300}
                  onChange={(e) => setVelden((x) => ({ ...x, [v.key]: e.target.value }))}
                  className="ainput mt-1 w-full text-[13.5px]"
                />
              </label>
            ))}

            <label className="block">
              <span className="alabel">Persoonlijke toevoeging <span className="font-normal text-black/40">(optioneel, wordt een eigen alinea)</span></span>
              <textarea
                name="toevoeging" rows={3} value={toevoeging} maxLength={2000}
                onChange={(e) => setToevoeging(e.target.value)}
                placeholder={sjabloon.startsWith("afwijzing") ? "bijv. Je ervaring met re-integratie sprak ons aan; voor deze rol zochten we vooral iemand met een medische achtergrond." : "bijv. Neem gerust je vragen mee."}
                className="ainput mt-1 w-full text-[13.5px]"
              />
            </label>

            <label className="block">
              <span className="alabel">Je naam onder de mail</span>
              <input name="afzender" value={naamAfzender} maxLength={80} required onChange={(e) => setNaamAfzender(e.target.value)} className="ainput mt-1 w-full max-w-[260px] text-[13.5px]" />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button className="abtn !py-2 text-[13.5px] disabled:opacity-50" disabled={pending}>
                {pending ? <LuLoaderCircle className="animate-spin text-[14px]" /> : <LuSend className="text-[14px]" />}
                {pending ? "Versturen…" : `Verstuur naar ${email}`}
              </button>
              <span className="text-[12.5px] text-black/40">Antwoorden van de kandidaat komen bij jou terecht.</span>
            </div>

            {state.status === "ok" && (
              <p role="status" className="flex items-start gap-2.5 rounded-xl bg-[#e6f7f4] px-4 py-3 text-[13.5px] text-[#0b6b5d]">
                <LuCircleCheck className="mt-0.5 shrink-0 text-[15px]" />
                <span>
                  Verstuurd naar {state.naar}: &ldquo;{state.onderwerp}&rdquo;.
                  {state.fase && <> De fase staat nu op {FASE_LABEL[state.fase] || state.fase}.</>}
                </span>
              </p>
            )}
            {state.status === "fout" && (
              <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] text-[#b4234f]">
                <LuCircleAlert className="mt-0.5 shrink-0 text-[15px]" />
                <span>{state.melding}</span>
              </p>
            )}
          </div>

          <div className="rounded-[12px] border border-black/[0.06] bg-white p-5 text-[14px] leading-[1.6] text-[#1c1a4e]" lang={taal} aria-label="Voorbeeld van de mail">
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-[#312e82]/60">Zo leest {naam.split(" ")[0]} het</p>
            <p className="mb-4 font-heading text-[15.5px] font-bold text-[#312e82]">{brief.onderwerp}</p>
            <p className="mb-3">{brief.aanhef}</p>
            {brief.alineas.map((a, i) => (
              <p key={i} className="mb-3 whitespace-pre-line">{a}</p>
            ))}
            {/* De groet zoals in de mail (sendBrief in mail.ts): groet, naam vet, de rest gedempt. */}
            <p className="mt-5">{brief.groet[0]}</p>
            {brief.groet[1] && <p className="font-heading font-bold">{brief.groet[1]}</p>}
            {brief.groet.slice(2).map((r, i) => (
              <p key={i} className="text-[13px] text-black/50">{r}</p>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
