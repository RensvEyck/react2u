"use client";
import { useActionState, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sendKandidaatMail, type KandidaatMailState } from "@/app/admin/actions";
import {
  briefAlsTekst, groetVoor, openPlek, SJABLONEN, sjabloonDef, stelOp, veldWaarde, type Sjabloon, type VeldKey,
} from "@/lib/kandidaatMail";
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuMail, LuPencil, LuRotateCcw, LuSend, LuX } from "react-icons/lu";

const IDLE: KandidaatMailState = { status: "idle" };

const FASE_LABEL: Record<string, string> = { gesprek: "Gesprek", afgewezen: "Afgewezen", aanbod: "Aanbod" };

export type Gemaild = { label: string; wanneer: string; door: string };

/** Een tekstvak zo hoog als zijn inhoud, ook na een andere schermbreedte of als de letter later laadt. */
function pasHoogteAan(...vakken: (HTMLTextAreaElement | null)[]) {
  for (const el of vakken) {
    if (!el) continue;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
}

/**
 * "Mail kandidaat" op de sollicitatiekaart: kies een sjabloon, vul het moment
 * of de plek in en pas daarna de mail zelf aan, onderwerp en tekst, precies
 * zoals de kandidaat hem krijgt. Verstuurd wordt via de server action; de fase
 * gaat mee (uitnodiging → gesprek, afwijzing → afgewezen) en de mail komt in het
 * logboek onder de kaart.
 *
 * Zolang je niets aan de tekst verandert, volgt hij het sjabloon en de velden.
 * Typ je erin, dan blijft jouw versie staan; "Terug naar het sjabloon" begint
 * opnieuw. Een leeg veld staat als "[moment]" in de tekst, en dan kan er nog
 * niets weg.
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
  const [naamAfzender, setNaamAfzender] = useState(afzender);
  // null: volgt het sjabloon en de velden; een tekst: door de collega aangepast.
  const [eigenOnderwerp, setEigenOnderwerp] = useState<string | null>(null);
  const [eigenTekst, setEigenTekst] = useState<string | null>(null);
  const [state, action, pending] = useActionState(sendKandidaatMail.bind(null, appId), IDLE);
  const onderwerpRef = useRef<HTMLTextAreaElement>(null);
  const tekstRef = useRef<HTMLTextAreaElement>(null);

  const def = sjabloonDef(sjabloon);
  const waarde = (k: VeldKey) => veldWaarde(def, k, velden, taal);
  const brief = useMemo(
    () => stelOp(sjabloon, { naam, vacature, taal, retainLonger, afzender: naamAfzender, ...velden }),
    [sjabloon, naam, vacature, taal, retainLonger, naamAfzender, velden]
  );
  const onderwerp = eigenOnderwerp ?? brief.onderwerp;
  const tekst = eigenTekst ?? briefAlsTekst(brief);
  const aangepast = eigenOnderwerp !== null || eigenTekst !== null;
  const plek = openPlek(`${onderwerp}\n${tekst}`);
  const [groet, ondertekening, ...onder] = groetVoor(taal, naamAfzender);
  const faseLabel = def.fase ? FASE_LABEL[def.fase] : null;
  const voornaam = naam.trim().split(/\s+/)[0] || naam;

  // De hele mail in beeld, zonder scrollbalk in het tekstvak: op een telefoon is de tekst veel langer.
  useLayoutEffect(() => {
    if (!open) return;
    const pas = () => pasHoogteAan(onderwerpRef.current, tekstRef.current);
    pas();
    document.fonts?.ready.then(pas);
    window.addEventListener("resize", pas);
    return () => window.removeEventListener("resize", pas);
  }, [open, onderwerp, tekst]);

  const herstel = () => {
    setEigenOnderwerp(null);
    setEigenTekst(null);
  };
  const kies = (s: Sjabloon) => {
    if (s === sjabloon) return;
    if (aangepast && !window.confirm("Je hebt de tekst aangepast. Met een ander sjabloon begin je opnieuw. Doorgaan?")) return;
    setSjabloon(s);
    herstel();
  };

  return (
    <div className="mt-4 border-t border-black/[0.06] pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="abtn-ghost !py-1.5 text-[13px]">
          {open ? <LuX className="text-[13px]" /> : <LuMail className="text-[13px]" />}
          {open ? "Sluiten" : "Mail kandidaat"}
        </button>
        {herinnering && !open && state.status !== "ok" && (
          <button
            type="button" onClick={() => { kies(voorstel); setOpen(true); }}
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
        <form action={action} className="mt-4 rounded-[14px] border border-[#312e82]/12 bg-[#f7f7fc] p-5">
          <input type="hidden" name="sjabloon" value={sjabloon} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-4">
              <div>
                <p className="alabel mb-2">Sjabloon</p>
                <div className="flex flex-wrap gap-2">
                  {SJABLONEN.map((s) => (
                    <button
                      key={s.key} type="button" onClick={() => kies(s.key)} aria-pressed={sjabloon === s.key}
                      className={`apill !px-3 !py-1.5 text-[13px] transition ${sjabloon === s.key ? "bg-[#312e82] text-white" : "bg-white text-black/60 ring-1 ring-black/10 hover:bg-[#eef0ff]"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
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
                    value={waarde(v.key)} placeholder={v.hint} maxLength={300}
                    onChange={(e) => setVelden((x) => ({ ...x, [v.key]: e.target.value }))}
                    className="ainput mt-1 w-full text-[13.5px]"
                  />
                </label>
              ))}
              {aangepast && def.velden.length > 0 && (
                <p className="text-[12.5px] text-black/50">
                  Je hebt de tekst zelf aangepast: wat je hierboven verandert, komt niet meer vanzelf in de mail.
                </p>
              )}

              <label className="block">
                <span className="alabel">Je naam onder de mail</span>
                <input name="afzender" value={naamAfzender} maxLength={80} required onChange={(e) => setNaamAfzender(e.target.value)} className="ainput mt-1 w-full max-w-[260px] text-[13.5px]" />
              </label>

              {sjabloon.startsWith("afwijzing") && (
                <p className="rounded-xl bg-white px-4 py-3 text-[12.5px] leading-[1.55] text-black/55 ring-1 ring-black/[0.06]">
                  <strong className="font-semibold text-[#312e82]">Tip:</strong> een concrete reden maakt een afwijzing persoonlijk,
                  bijvoorbeeld &ldquo;voor deze rol zochten we vooral iemand met een medische achtergrond&rdquo;. Zet hem gerust in de tekst.
                </p>
              )}
            </div>

            <div
              className="overflow-hidden rounded-[12px] border border-black/[0.08] bg-white text-[#1c1a4e] transition focus-within:border-[#312e82]/35 focus-within:ring-4 focus-within:ring-[#312e82]/[0.07]"
              lang={taal}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-black/[0.06] px-5 py-2.5">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#312e82]/60">De mail aan {voornaam}</p>
                {aangepast ? (
                  <button type="button" onClick={herstel} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#312e82] hover:underline">
                    <LuRotateCcw className="text-[12px]" /> Terug naar het sjabloon
                  </button>
                ) : (
                  <span className="hidden items-center gap-1.5 text-[12.5px] text-black/40 sm:flex">
                    <LuPencil className="text-[11px]" /> Klik in de tekst om hem aan te passen
                  </span>
                )}
              </div>
              <label className="flex flex-col gap-0.5 border-b border-black/[0.06] px-5 py-3 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 text-[12.5px] text-black/40">Onderwerp</span>
                {/* Een tekstvak van één regel dat meegroeit; Enter maakt geen nieuwe regel. */}
                <textarea
                  ref={onderwerpRef} name="onderwerp" value={onderwerp} rows={1} maxLength={200} required
                  onChange={(e) => setEigenOnderwerp(e.target.value.replace(/\s*\n\s*/g, " "))}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  className="block w-full min-w-0 resize-none overflow-hidden bg-transparent font-heading text-[15.5px] leading-[1.4] font-bold text-[#312e82] outline-none"
                />
              </label>
              <textarea
                ref={tekstRef} name="tekst" value={tekst} rows={8} maxLength={8000} required aria-label="Tekst van de mail"
                onChange={(e) => setEigenTekst(e.target.value)}
                className="block w-full resize-none overflow-hidden bg-transparent px-5 pt-4 pb-2 text-[14px] leading-[1.6] outline-none"
              />
              <div className="px-5 pt-2 pb-5 text-[14px] leading-[1.6]" aria-label="Groet onder de mail">
                <p>{groet}</p>
                <p className="font-heading font-bold">{ondertekening}</p>
                {onder.map((r, i) => (
                  <p key={i} className="text-[13px] text-black/50">{r}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-black/[0.06] pt-4">
            {plek && (
              <p className="flex items-start gap-2.5 rounded-xl bg-[#fff4e5] px-4 py-3 text-[13.5px] text-[#8a5000]">
                <LuCircleAlert className="mt-0.5 shrink-0 text-[15px]" />
                <span>
                  Er staat nog <strong className="font-semibold">{plek}</strong> in de mail. Vul het veld in, of pas de tekst zelf aan.
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button className="abtn !py-2 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || Boolean(plek)}>
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
        </form>
      )}
    </div>
  );
}
