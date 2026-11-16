"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { slaOnboardingOp, vinkOnboardingAf, type OnboardingState } from "@/app/(offerte)/onboarding/actions";
import { WERKNEMER_KOLOMMEN, type VeldGroep, type Werknemer } from "@/lib/onboarding";

/*
 * Wat de klant op zijn onboardingpagina doet: een document afvinken, een
 * formulier invullen, of zijn medewerkers invoeren. Na opslaan ververst de
 * pagina, zodat de voortgang bovenaan meteen klopt.
 */

const NAVY = "#322E83";
// Dezelfde knop- en veldstijl als de contractpagina (ContractPagina.tsx).
const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold disabled:opacity-60";
const knoppen = { roze: `hv-btn hv-btn-roze ${KNOP}`, rand: `hv-btn hv-btn-rand ${KNOP}` };
const veld =
  "h-[52px] w-full rounded-[14px] border bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F6F5FB] disabled:text-[#A9A7BC]";
const rand = (fout?: string) => (fout ? "border-[#D92D20] bg-[#FFF8F7]" : "border-[#DCDAE8]");
const veldLabel = "text-[14.5px] font-bold";

/**
 * klant: de echte link; collega: een beheerder opent de link (het bezoek telt
 * niet, invullen mag wel, bijvoorbeeld samen aan de telefoon); voorbeeld: vanuit
 * het beheer of een concept, dan kan er niets worden opgeslagen.
 */
export type Modus = "klant" | "collega" | "voorbeeld";

function Vink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Melding({ state, klaar }: { state: OnboardingState | null; klaar: string }) {
  if (!state) return null;
  return state.ok ? (
    <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {klaar}</p>
  ) : (
    <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>
  );
}

const CONCEPT = "Dit is een voorbeeld. De klant vult dit in via zijn eigen link, zodra de onboarding verstuurd is.";

/** Afvinken: gelezen, of gedownload en geregeld. */
export function AfvinkKnop({ token, document, klaar, tekst, modus }: { token: string; document: string; klaar: boolean; tekst: string; modus: Modus }) {
  const [bezig, start] = useTransition();
  const [state, setState] = useState<OnboardingState | null>(null);
  const router = useRouter();
  if (klaar) {
    return (
      <span className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#E3F6ED] px-5 text-[15px] font-bold text-[#0A7A4B]">
        <Vink /> Afgevinkt
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-2">
      <button
        type="button"
        className={knoppen.roze}
        disabled={bezig || modus === "voorbeeld"}
        title={modus === "voorbeeld" ? CONCEPT : undefined}
        onClick={() =>
          start(async () => {
            const r = await vinkOnboardingAf(token, document);
            setState(r);
            if (r.ok) router.refresh();
          })
        }
      >
        <Vink /> {bezig ? "Even geduld…" : tekst}
      </button>
      {state && !state.ok && <Melding state={state} klaar="" />}
    </span>
  );
}

/** Een formulier met vaste velden: de inrichting, of de gegevens van de vorige arbodienst. */
export function VeldenFormulier({
  token, document, groepen, begin, ingevuld, modus, knopTekst,
}: {
  token: string; document: string; groepen: VeldGroep[]; begin: Record<string, string>; ingevuld: boolean; modus: Modus; knopTekst: string;
}) {
  const [waarden, setWaarden] = useState<Record<string, string>>(begin);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.velden || {};

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // Ook met Enter in een veld: in het voorbeeld wordt niets opgeslagen.
        if (modus === "voorbeeld") return setState({ ok: false, fout: CONCEPT });
        start(async () => {
          const r = await slaOnboardingOp(token, document, waarden, waarden.contact_naam);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {groepen.map((g) => (
        <fieldset key={g.titel} className="m-0 flex flex-col gap-4 border-0 p-0">
          <legend className="mb-1 p-0">
            <span className="hv-kop block text-[20px] font-semibold tracking-[-0.3px]" style={{ color: NAVY }}>{g.titel}</span>
            {g.tekst && <span className="mt-1 block text-[15px] text-[#77758F]">{g.tekst}</span>}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.velden.map((v) => {
              const id = `ob-${document}-${v.naam}`;
              const fout = fouten[v.naam];
              const lang = v.naam === "afdelingen";
              return (
                <label key={v.naam} htmlFor={id} className={`flex flex-col gap-1.5 ${v.half ? "" : "sm:col-span-2"}`}>
                  <span className={veldLabel} style={{ color: NAVY }}>{v.label}{v.verplicht && <span className="text-[#E61674]"> *</span>}</span>
                  {lang ? (
                    <textarea
                      id={id}
                      className={`${veld} ${rand(fout)} h-auto min-h-[90px] py-3`}
                      value={waarden[v.naam] || ""}
                      onChange={(e) => setWaarden({ ...waarden, [v.naam]: e.target.value })}
                      maxLength={v.max ?? 200}
                      aria-invalid={Boolean(fout)}
                    />
                  ) : (
                    <input
                      id={id}
                      className={`${veld} ${rand(fout)}`}
                      type={v.type || "text"}
                      value={waarden[v.naam] || ""}
                      onChange={(e) => setWaarden({ ...waarden, [v.naam]: e.target.value })}
                      maxLength={v.max ?? 200}
                      autoComplete={v.autocomplete}
                      aria-invalid={Boolean(fout)}
                      aria-describedby={fout || v.hint ? `${id}-uitleg` : undefined}
                    />
                  )}
                  {(fout || v.hint) && (
                    <span id={`${id}-uitleg`} className={`text-[13.5px] ${fout ? "font-semibold text-[#B42318]" : "text-[#77758F]"}`}>{fout || v.hint}</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-col gap-3">
        <Melding state={state} klaar="Opgeslagen. Dank je wel!" />
        <div className="flex flex-wrap items-center gap-4">
          <button className={knoppen.roze} disabled={bezig || modus === "voorbeeld"} title={modus === "voorbeeld" ? CONCEPT : undefined}>
            <Vink /> {bezig ? "Opslaan…" : ingevuld ? "Wijzigingen opslaan" : knopTekst}
          </button>
          {modus === "voorbeeld" && <span className="text-[14px] text-[#77758F]">{CONCEPT}</span>}
        </div>
      </div>
    </form>
  );
}

const leeg = (): Werknemer => ({});
const naamVan = (w: Werknemer) => [w.roepnaam || w.voorletters, w.tussenvoegsels, w.achternaam].filter(Boolean).join(" ");

/** Het werknemersbestand: per medewerker een kaart, met toevoegen en verwijderen. */
export function WerknemersFormulier({ token, begin, ingevuld, modus, excelHref }: { token: string; begin: Werknemer[]; ingevuld: boolean; modus: Modus; excelHref: string }) {
  const [rijen, setRijen] = useState<Werknemer[]>(begin.length ? begin : [leeg()]);
  const [open, setOpen] = useState<number>(begin.length ? -1 : 0);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.rijen || {};

  const zet = (i: number, k: string, w: string) => setRijen(rijen.map((r, n) => (n === i ? { ...r, [k]: w } : r)));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (modus === "voorbeeld") return setState({ ok: false, fout: CONCEPT });
        start(async () => {
          const r = await slaOnboardingOp(token, "werknemers", { rijen });
          setState(r);
          if (r.rijen) {
            const eerste = Number(Object.keys(r.rijen)[0]);
            if (!Number.isNaN(eerste)) setOpen(eerste);
          }
          if (r.ok) {
            setOpen(-1);
            router.refresh();
          }
        });
      }}
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rijen.map((r, i) => {
          const f = fouten[i] || {};
          const heeftFout = Object.keys(f).length > 0;
          const isOpen = open === i;
          return (
            <li key={i} className={`overflow-hidden rounded-[18px] border bg-white ${heeftFout ? "border-[#F4B9B2]" : "border-[#E6E5EF]"}`}>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="hv-kop grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-semibold" style={{ background: "#E5F6F4", color: "#00786F" }}>{i + 1}</span>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="min-w-0 flex-1 text-left" aria-expanded={isOpen}>
                  <span className="block truncate text-[16px] font-bold" style={{ color: NAVY }}>{naamVan(r) || "Nieuwe medewerker"}</span>
                  <span className={`block text-[13.5px] ${heeftFout ? "font-semibold text-[#B42318]" : "text-[#77758F]"}`}>
                    {heeftFout ? `${Object.keys(f).length} ${Object.keys(f).length === 1 ? "veld vraagt" : "velden vragen"} aandacht` : [r.functie, r.plaats].filter(Boolean).join(" · ") || (isOpen ? "Vul de gegevens in" : "Tik om in te vullen")}
                  </span>
                </button>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="hidden text-[14px] font-bold sm:block" style={{ color: NAVY }}>{isOpen ? "Inklappen" : "Bewerken"}</button>
                {rijen.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Verwijder ${naamVan(r) || `medewerker ${i + 1}`}`}
                    onClick={() => {
                      setRijen(rijen.filter((_, n) => n !== i));
                      setOpen(-1);
                      setState(null);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full text-[#77758F] hover:bg-[#FDECEA] hover:text-[#B42318]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="grid gap-4 border-t border-[#E6E5EF] bg-[#FBFAFE] px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  {WERKNEMER_KOLOMMEN.map((k) => {
                    const id = `wn-${i}-${k.naam}`;
                    return (
                      <label key={k.naam} htmlFor={id} className={`flex flex-col gap-1.5 ${k.breed ? "sm:col-span-2" : ""}`}>
                        <span className="text-[13.5px] font-semibold" style={{ color: NAVY }}>{k.label}{k.verplicht && <span className="text-[#E61674]"> *</span>}</span>
                        {k.type === "geslacht" ? (
                          <select id={id} className={`${veld} ${rand(f[k.naam])}`} value={r[k.naam] || ""} onChange={(e) => zet(i, k.naam, e.target.value)}>
                            <option value="">Kies</option><option value="M">Man</option><option value="V">Vrouw</option><option value="X">Anders / onbekend</option>
                          </select>
                        ) : (
                          <input
                            id={id}
                            className={`${veld} ${rand(f[k.naam])}`}
                            type={k.type === "date" ? "date" : k.type === "email" ? "email" : k.type === "tel" ? "tel" : "text"}
                            inputMode={k.naam === "bsn" || k.type === "number" ? "numeric" : undefined}
                            value={r[k.naam] || ""}
                            onChange={(e) => zet(i, k.naam, e.target.value)}
                            maxLength={120}
                            aria-invalid={Boolean(f[k.naam])}
                          />
                        )}
                        {f[k.naam] && <span className="text-[12.5px] font-semibold text-[#B42318]">{f[k.naam]}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={knoppen.rand}
          style={{ background: "transparent" }}
          onClick={() => {
            setRijen([...rijen, leeg()]);
            setOpen(rijen.length);
          }}
        >
          <span aria-hidden className="text-[20px] leading-none">+</span> Medewerker toevoegen
        </button>
        <a href={excelHref} className="text-[14.5px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>Liever in Excel? Download het lege bestand</a>
      </div>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[#77758F]">
        Deze gegevens, ook het burgerservicenummer, gebruiken we alleen om jullie medewerkers in ons beveiligde verzuimsysteem te zetten. Daarna wissen we ze hier.
      </p>
      <Melding state={state} klaar={`Opgeslagen: ${rijen.length} ${rijen.length === 1 ? "medewerker" : "medewerkers"}. Dank je wel!`} />
      <div className="flex flex-wrap items-center gap-4">
        <button className={knoppen.roze} disabled={bezig || modus === "voorbeeld"} title={modus === "voorbeeld" ? CONCEPT : undefined}>
          <Vink /> {bezig ? "Opslaan…" : ingevuld ? "Wijzigingen opslaan" : `${rijen.length} ${rijen.length === 1 ? "medewerker" : "medewerkers"} opslaan`}
        </button>
        {modus === "voorbeeld" && <span className="text-[14px] text-[#77758F]">{CONCEPT}</span>}
      </div>
    </form>
  );
}
