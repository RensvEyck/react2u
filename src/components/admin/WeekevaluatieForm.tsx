"use client";
import { useState } from "react";
import { LuLock, LuMegaphone, LuMessageSquareText, LuPhone, LuSend } from "react-icons/lu";
import { weekevaluatieOpslaan } from "@/app/admin/weekevaluatieActions";
import {
  ENKELE_KEUZE, KEUZES, keuzeLabel, kwartaalLabel, kwartaalVanWeek, momenten, SCHALEN, sluitOp, TEKSTVRAGEN, THEMA_LABEL, vraag, weekBereikDag,
  wordtGevraagd, type Antwoorden, type Blok, type Doel, type KeuzeVeld, type SchaalVraag, type TekstVraag, type Thema,
} from "@/lib/weekevaluatie";
import { urenTekst } from "@/lib/uren";

/**
 * Het formulier van één week, in lagen: elke week zeven cijfers met ruimte
 * voor een toelichting, de voortgang op de doelen uit de kwartaalmeeting,
 * zes open vragen in eigen woorden en een veld om iets te melden of te delen
 * (met de keuze om het meteen naar Rens te sturen); in de laatste week van de
 * maand zes maandvragen en in de laatste week van het kwartaal de terugblik.
 * "Welke kennis miste je?" verschijnt pas bij een 6 of lager voor kennis.
 * Elk open antwoord kan mee naar de kwartaalmeeting. Gesloten weken
 * tonen hetzelfde, maar dan alleen om te lezen. Bewaren gaat via de server
 * action; die controleert alles opnieuw (lib/weekevaluatie.ts, leesAntwoorden).
 */

export type UrenVanWeek = { declarabel: number; afwezig: number; beschikbaar: number; procent: number | null; norm: number } | null;
export type FormDoel = Pick<Doel, "id" | "titel" | "toelichting">;

const WEEK_GROEPEN: Thema[] = ["werkgeluk", "druk", "kennis", "totaal"];

export default function WeekevaluatieForm({
  week, antwoorden, open, bijgewerkt, uren, doelen,
}: {
  week: string;
  antwoorden: Antwoorden | null;
  /** Nog te wijzigen (deze of vorige week). */
  open: boolean;
  /** Wanneer de collega hem het laatst bewaarde, als tekst. */
  bijgewerkt: string | null;
  uren: UrenVanWeek;
  /** De doelen uit de kwartaalmeeting voor het kwartaal van deze week. */
  doelen: FormDoel[];
}) {
  const a = antwoorden || {};
  const lagen = momenten(week);
  const [kennis, setKennis] = useState<number | undefined>(a.kennis);
  let nummer = 0;
  const volgende = () => ++nummer;

  const weekSchalen = SCHALEN.filter((s) => s.moment === "week");
  const inBlok = (blok: Blok) => TEKSTVRAGEN.filter((t) => t.blok === blok);

  return (
    <form action={weekevaluatieOpslaan} className="space-y-9">
      <input type="hidden" name="week" value={week} />

      <Laag titel="Deze week" uitleg="Een cijfer van 1 tot 10; hoger is altijd beter.">
        {WEEK_GROEPEN.map((thema) => (
          <div key={thema} className="space-y-5">
            {thema !== "totaal" && <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-black/40">{THEMA_LABEL[thema]}</p>}
            {weekSchalen.filter((s) => s.thema === thema).map((s) => (
              <SchaalRij
                key={s.sleutel}
                nummer={volgende()}
                naam={s.sleutel}
                vraag={s}
                waarde={a[s.sleutel]}
                open={open}
                onKies={s.sleutel === "kennis" ? setKennis : undefined}
              />
            ))}
          </div>
        ))}
        {inBlok("cijfers").map((t) => <TekstRij key={t.sleutel} nummer={volgende()} vraag={t} a={a} open={open} />)}
      </Laag>

      {doelen.length > 0 && (
        <Laag titel={`Je doelen voor ${kwartaalLabel(kwartaalVanWeek(week))}`} uitleg="Afgesproken in de kwartaalmeeting. Hoeveel kwam je deze week verder?">
          {doelen.map((d) => {
            const v = a.doelen?.[d.id];
            return (
              <div key={d.id} className="space-y-2.5">
                <SchaalRij
                  nummer={volgende()}
                  naam={`doel_${d.id}`}
                  vraag={{ label: d.titel, hint: d.toelichting || "", laag: "niet verder", hoog: "flink verder", kort: d.titel }}
                  waarde={v?.cijfer}
                  open={open}
                />
                <div className="sm:pl-[34px]">
                  {open ? (
                    <input
                      name={`doel_${d.id}_tekst`}
                      maxLength={500}
                      defaultValue={v?.tekst || ""}
                      placeholder="Wat deed je eraan? Eén regel is genoeg."
                      aria-label={`Wat deed je aan: ${d.titel}`}
                      className="ainput !py-2 text-[14px] placeholder:text-black/30"
                    />
                  ) : v?.tekst ? (
                    <p className="rounded-xl bg-[#fafafd] px-4 py-2.5 text-[14px] text-[#1c1a4e]">{v.tekst}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Laag>
      )}

      {lagen.includes("maand") && (
        <Laag
          titel="Maandvragen"
          uitleg="De laatste week van de maand: zes stellingen over toewijding en wat je werkgeluk voedt. 1 is helemaal niet mee eens, 10 helemaal mee eens."
          accent
        >
          {SCHALEN.filter((s) => s.moment === "maand").map((s) => (
            <SchaalRij key={s.sleutel} nummer={volgende()} naam={s.sleutel} vraag={s} waarde={a[s.sleutel]} open={open} />
          ))}
          {inBlok("maand").map((t) => <TekstRij key={t.sleutel} nummer={volgende()} vraag={t} a={a} open={open} />)}
        </Laag>
      )}

      <Laag titel="In je eigen woorden" uitleg="Niets in te vullen? Laat het leeg. Vink aan wat je mee wilt nemen naar de kwartaalmeeting.">
        {inBlok("woorden").map((t) =>
          wordtGevraagd(t, { kennis }) ? (
            <TekstRij key={t.sleutel} nummer={volgende()} vraag={t} a={a} open={open} />
          ) : null,
        )}
      </Laag>

      {(open || a.melding) && (
        <Laag titel="Iets melden of delen" uitleg="Voor alles wat niet in de vragen past. Het komt op het ideeënbord voor je collega's en in je kwartaalmeeting; vink 'Stuur dit meteen door' aan als het alleen voor het beheer is." accent>
          <MeldRij nummer={volgende()} a={a} open={open} />
        </Laag>
      )}

      {lagen.includes("kwartaal") && (
        <Laag titel={`Terugblik op ${kwartaalLabel(kwartaalVanWeek(week))}`} uitleg="De laatste week van het kwartaal. Dit is het begin van je kwartaalmeeting." accent>
          {SCHALEN.filter((s) => s.moment === "kwartaal").map((s) => (
            <SchaalRij key={s.sleutel} nummer={volgende()} naam={s.sleutel} vraag={s} waarde={a[s.sleutel]} open={open} />
          ))}
          {inBlok("terugblik").map((t) => (
            <TekstRij key={t.sleutel} nummer={volgende()} vraag={t} a={a} open={open} />
          ))}
        </Laag>
      )}

      {uren && (
        <div className="rounded-2xl bg-[#f6f2ec] px-5 py-4 text-[13.5px] text-black/60">
          <p className="font-semibold text-[#1c1a4e]">Jouw uren deze week, uit de urenregistratie</p>
          <p className="mt-0.5">
            {urenTekst(uren.declarabel)} declarabel{uren.afwezig ? `, ${urenTekst(uren.afwezig)} afwezig` : ""} van {urenTekst(uren.beschikbaar)} beschikbare uren
            {uren.procent !== null ? ` · ${uren.procent}% declarabel bij een norm van ${uren.norm}%` : ""}. Ter info, dit vul je niet zelf in.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
        <p className="text-[13px] text-black/45">
          {open ? (
            <>
              {bijgewerkt ? `Bewaard op ${bijgewerkt}. ` : ""}
              Nog aan te passen tot en met zondag {weekBereikDag(sluitOp(week))}.
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5"><LuLock className="text-[12px]" /> Deze week is gesloten{bijgewerkt ? `; bewaard op ${bijgewerkt}` : ""}.</span>
          )}
        </p>
        {open && <button className="abtn">{antwoorden ? "Wijzigingen bewaren" : "Weekevaluatie bewaren"}</button>}
      </div>
    </form>
  );
}

function Laag({ titel, uitleg, accent, children }: { titel: string; uitleg: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={accent ? "rounded-2xl bg-[#f6f2ec] px-4 py-5 sm:px-6" : ""}>
      <div className="mb-5 border-b border-black/[0.06] pb-3">
        <h3 className="font-heading text-[17px] font-bold text-[#312e82]">{titel}</h3>
        <p className="mt-0.5 text-[12.5px] text-black/45">{uitleg}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Nummer({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[12px] font-bold text-[#312e82]">{n}</span>;
}

function SchaalRij({
  nummer, naam, vraag, waarde, open, onKies,
}: {
  nummer: number;
  naam: string;
  vraag: Pick<SchaalVraag, "label" | "hint" | "laag" | "hoog" | "kort">;
  waarde: number | undefined;
  open: boolean;
  onKies?: (n: number) => void;
}) {
  return (
    <fieldset disabled={!open} className="min-w-0">
      <legend className="flex items-baseline gap-2.5">
        <Nummer n={nummer} />
        <span>
          <span className="block text-[15px] font-semibold text-[#1c1a4e]">{vraag.label}</span>
          {vraag.hint && <span className="block text-[12.5px] text-black/45">{vraag.hint}</span>}
        </span>
      </legend>
      <div className="mt-3 sm:pl-[34px]">
        <div className="grid grid-cols-10 gap-1 sm:gap-1.5" role="radiogroup" aria-label={vraag.label}>
          {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
            <label key={n} className="relative block cursor-pointer">
              <input
                type="radio"
                name={naam}
                value={n}
                defaultChecked={waarde === n}
                required
                onChange={onKies ? () => onKies(n) : undefined}
                className="peer sr-only"
                aria-label={`${vraag.kort} ${n}`}
              />
              <span
                className={`flex h-10 items-center justify-center rounded-lg border text-[14px] font-semibold tabular-nums transition sm:h-11 sm:rounded-xl sm:text-[15px] ${
                  open ? "border-black/[0.1] bg-white text-[#1c1a4e] hover:border-[#312e82]/50 hover:bg-[#f7f7fc]" : "border-black/[0.06] bg-[#fafafd] text-black/35"
                } peer-checked:border-[#312e82] peer-checked:bg-[#312e82] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#e75387]/50 peer-focus-visible:ring-offset-1`}
              >
                {n}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between gap-3 text-[11.5px] text-black/40">
          <span>1 · {vraag.laag}</span>
          <span className="text-right">10 · {vraag.hoog}</span>
        </div>
      </div>
    </fieldset>
  );
}

function TekstRij({ nummer, vraag: t, a, open }: { nummer: number; vraag: TekstVraag; a: Antwoorden; open: boolean }) {
  const id = `we-${t.sleutel}`;
  const gekozen = t.keuzes ? a[t.keuzes] ?? [] : [];
  const besproken = Boolean(a.bespreken?.includes(t.sleutel));
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline gap-2.5">
        <Nummer n={nummer} />
        <span>
          <span className="block text-[15px] font-semibold text-[#1c1a4e]">{t.label}</span>
          <span className="block text-[12.5px] text-black/45">{t.hint}</span>
        </span>
      </label>
      <div className="mt-2.5 space-y-2.5 sm:pl-[34px]">
        {t.keuzes && <Keuzes veld={t.keuzes} gekozen={gekozen} open={open} vraag={t.kort} />}
        {open ? (
          <textarea
            id={id}
            name={t.sleutel}
            rows={2}
            maxLength={2000}
            defaultValue={a[t.sleutel] || ""}
            placeholder={t.voorbeeld}
            className="ainput min-h-[72px] resize-y text-[14.5px] leading-relaxed placeholder:text-black/30"
          />
        ) : (
          <p id={id} className={`whitespace-pre-line rounded-xl px-4 py-3 text-[14.5px] leading-relaxed ${a[t.sleutel] ? "bg-[#fafafd] text-[#1c1a4e]" : "text-black/35"}`}>
            {a[t.sleutel] || "Niet ingevuld."}
          </p>
        )}
        {t.bespreekbaar && (open || besproken) && (
          <label className={`inline-flex items-center gap-2 text-[13px] ${open ? "cursor-pointer text-black/55 hover:text-[#312e82]" : "text-[#312e82]"}`}>
            <input type="checkbox" name="bespreken" value={t.sleutel} defaultChecked={besproken} disabled={!open} className="h-4 w-4 accent-[#312e82]" />
            <LuMessageSquareText className="text-[13px]" /> Meenemen naar de kwartaalmeeting
          </label>
        )}
      </div>
    </div>
  );
}

function Keuzes({ veld, gekozen, open, vraag }: { veld: KeuzeVeld; gekozen: string[]; open: boolean; vraag: string }) {
  const enkel = ENKELE_KEUZE.includes(veld);
  return (
    <div className="flex flex-wrap gap-1.5" role={enkel ? "radiogroup" : "group"} aria-label={`${vraag}: ${enkel ? "soort" : "thema's"}`}>
      {KEUZES[veld].map((k) => (
        <label key={k.sleutel} className={`relative ${open ? "cursor-pointer" : ""}`}>
          <input type={enkel ? "radio" : "checkbox"} name={veld} value={k.sleutel} defaultChecked={gekozen.includes(k.sleutel)} disabled={!open} className="peer sr-only" />
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
              open ? "border-black/[0.12] bg-white text-black/60 hover:border-[#312e82]/50" : "border-black/[0.06] bg-[#fafafd] text-black/35"
            } peer-checked:border-[#312e82] peer-checked:bg-[#eef0ff] peer-checked:text-[#312e82] peer-focus-visible:ring-2 peer-focus-visible:ring-[#e75387]/50`}
          >
            {k.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Iets melden of delen: de soort, de tekst, en of het meteen naar Rens moet. */
function MeldRij({ nummer, a, open }: { nummer: number; a: Antwoorden; open: boolean }) {
  const t = vraag("melding");
  return (
    <div>
      <label htmlFor="we-melding" className="flex items-baseline gap-2.5">
        <Nummer n={nummer} />
        <span>
          <span className="block text-[15px] font-semibold text-[#1c1a4e]">{t.label}</span>
          <span className="block text-[12.5px] text-black/45">{t.hint}</span>
        </span>
      </label>
      <div className="mt-2.5 space-y-2.5 sm:pl-[34px]">
        {open ? (
          <>
            <Keuzes veld="melding_soort" gekozen={a.melding_soort ?? []} open={open} vraag={t.kort} />
            <textarea
              id="we-melding"
              name="melding"
              rows={3}
              maxLength={2000}
              defaultValue={a.melding || ""}
              placeholder={t.voorbeeld}
              className="ainput min-h-[88px] resize-y bg-white text-[14.5px] leading-relaxed placeholder:text-black/30"
            />
            <label className="flex cursor-pointer items-start gap-2 text-[13.5px] text-[#1c1a4e]">
              <input type="checkbox" name="melding_nu" value="aan" defaultChecked={Boolean(a.melding_nu)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#e75387]" />
              <span>
                <span className="inline-flex items-center gap-1.5 font-semibold"><LuSend className="text-[13px] text-[#e75387]" /> Stuur dit meteen door</span>
                <span className="block text-[12.5px] text-black/50">Alleen voor het beheer, niet op het ideeënbord voor je collega&apos;s, en niet pas in de kwartaalmeeting. Je mail kan rechtstreeks beantwoord worden.</span>
              </span>
            </label>
            <p className="flex items-start gap-1.5 text-[12.5px] text-black/45">
              <LuPhone className="mt-0.5 shrink-0 text-[12px]" /> Is het dringend, zoals agressie of een ongeval? Bel dan meteen; een mail kan blijven liggen.
            </p>
          </>
        ) : (
          <div id="we-melding" className="rounded-xl bg-white px-4 py-3">
            <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#312e82]">
              <LuMegaphone className="text-[13px]" /> {a.melding_soort?.[0] ? keuzeLabel("melding_soort", a.melding_soort[0]) : "Gemeld of gedeeld"}
              {a.melding_verstuurd ? <span className="apill !py-0 !text-[11px] bg-[#e6f7f4] text-[#0e9f8a]">meteen doorgestuurd</span> : a.melding_nu ? <span className="apill !py-0 !text-[11px] bg-[#fff4e5] text-[#c77700]">doorsturen gevraagd</span> : null}
            </p>
            <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-[#1c1a4e]">{a.melding}</p>
          </div>
        )}
        {open && a.melding_verstuurd && (
          <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0e9f8a]"><LuSend className="text-[12px]" /> Deze melding is al doorgestuurd. Pas je de tekst aan, dan gaat de nieuwe versie ook door.</p>
        )}
      </div>
    </div>
  );
}
