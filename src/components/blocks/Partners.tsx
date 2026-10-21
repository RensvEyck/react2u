import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, SKY, ORANGE, BODY, SOFT, kop, BREED } from "./Gedeeld";
import { telefoonInTaal, type Taal } from "@/lib/taal";
import type { TarievenSettings } from "@/lib/tarieven";
import PartnerRekenhulp from "./PartnerRekenhulp";
import PartnerFormulier from "./PartnerFormulier";

type Ctx = { lang?: Taal; tarieven?: TarievenSettings };

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Blokken voor /partners, het partnerprogramma voor accountants,
 * salariskantoren en HR- en verzekeringsadviseurs (ontwerp "React2u
 * partnerpagina" op het canvas). Alle tekst staat in `data`; de vragen
 * gebruiken het gewone blok dgVragen.
 */

const IVOOR = "#F8F5F1";
/** Accent op indigo, uit het ontwerp: het enige groen van de site, alleen op donker. */
const LIMOEN = "#8AD936";
const LIJN = "#E6E2DA";
const KLEUR: Record<string, string> = { roze: PINK, teal: TEAL, oranje: ORANGE, blauw: SKY, navy: NAVY };

function anker(d: any) {
  return d.anchor ? { id: d.anchor, className: "scroll-mt-28" } : {};
}

/** De regels van de kop: `heading` met een regeleinde per regel. */
function kopRegels(d: any): string[] {
  return String(d.heading || "").split("\n").map((r) => r.trim()).filter(Boolean);
}

/** Een kop van meerdere regels; de laatste in het accent, zoals in het ontwerp. */
function Regels({ regels, accent = TEAL }: { regels: string[]; accent?: string }) {
  return <>{regels.map((r, i) => <span key={i} className="block" style={i > 0 && i === regels.length - 1 ? { color: accent } : undefined}>{r}</span>)}</>;
}

function Vink({ kleur }: { kleur: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={kleur} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const H2 = `${kop} m-0 text-[32px] leading-[1.12] tracking-[-0.8px] md:text-[44px] xl:text-[52px] xl:tracking-[-1.2px]`;

/* ---------- Kop met rekenvoorbeeld ---------- */

export function PtKop({ d, asH1, ctx }: { d: any; asH1?: boolean; ctx?: Ctx }) {
  const H = asH1 ? "h1" : "h2";
  const regels = kopRegels(d);
  const jaar = ctx?.tarieven?.jaar ?? String(new Date().getFullYear());
  return (
    <section aria-label={regels.join(" ")} className={`hv ${outfit.variable} relative overflow-hidden`} style={{ background: IVOOR }}>
      {/* De stippen tussen de kolommen, uit het ontwerp; alleen waar ze ruimte hebben. */}
      <span aria-hidden className="absolute hidden lg:block" style={{ left: "46%", top: 64, width: 14, height: 14, borderRadius: 999, background: PINK }} />
      <span aria-hidden className="absolute hidden lg:block" style={{ left: "49%", top: 120, width: 9, height: 9, borderRadius: 999, background: TEAL }} />
      <span aria-hidden className="absolute hidden lg:block" style={{ left: "44%", top: 150, width: 7, height: 7, borderRadius: 999, background: ORANGE }} />
      <span aria-hidden className="absolute hidden lg:block" style={{ left: "51%", top: 40, width: 6, height: 6, borderRadius: 999, background: SKY }} />
      <span aria-hidden className="absolute hidden lg:block" style={{ left: "47.5%", top: 200, width: 11, height: 11, borderRadius: 999, background: NAVY }} />
      <div className={`${BREED} relative grid gap-12 py-14 md:py-[88px] lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-[104px]`}>
        <div className="flex min-w-0 flex-col gap-7 lg:col-span-6">
          <H className={`${kop} m-0 text-[40px] leading-[1.04] tracking-[-1.2px] sm:text-[52px] xl:text-[68px] xl:tracking-[-2px]`} style={{ color: NAVY }}>
            <Regels regels={regels} />
          </H>
          {d.text && <p className="m-0 max-w-[27em] text-[18px] leading-[1.55] md:text-[20px]" style={{ color: BODY }}>{d.text}</p>}
          <div className="flex flex-wrap items-center gap-3.5">
            {d.knop?.label && (
              <a href={d.knop.href} className="hv-btn hv-btn-roze inline-flex h-[56px] items-center rounded-full px-8 text-[17px] font-bold md:h-[60px] md:px-9">{d.knop.label}</a>
            )}
            {d.tweedeKnop?.label && (
              <a href={d.tweedeKnop.href} className="inline-flex h-[56px] items-center gap-2.5 px-3 text-[17px] font-bold md:h-[60px]" style={{ color: NAVY }}>
                {d.tweedeKnop.label}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
              </a>
            )}
          </div>
        </div>
        <div className="min-w-0 lg:col-span-6 xl:col-span-5 xl:col-start-8">
          <PartnerRekenhulp r={d.rekenhulp || {}} jaar={jaar} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Voor wie ---------- */

export function PtDoelgroepen({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:pb-24 md:pt-[104px]`}>
        <h2 className={`${H2} max-w-[16em]`} style={{ color: NAVY }}>{d.heading}</h2>
        <div className="grid gap-8 border-t pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10" style={{ borderColor: LIJN }}>
          {items.map((it, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-3">
              <span aria-hidden className="block h-3.5 w-3.5 rounded-full" style={{ background: KLEUR[it.kleur] || PINK }} />
              <h3 className={`${kop} m-0 text-[22px] md:text-[24px]`} style={{ color: NAVY }}>{it.titel}</h3>
              <p className="m-0 text-[16px] leading-[1.6] md:text-[17px]" style={{ color: BODY }}>{it.tekst}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Zo werkt het: één lijn, drie momenten ---------- */

const STAP_KLEUR = [NAVY, TEAL, PINK];

export function PtStappen({ d }: { d: any }) {
  const stappen: any[] = d.stappen || [];
  const regels = kopRegels(d);
  return (
    <section aria-label={regels.join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-12 py-14 md:gap-16 md:py-[104px]`}>
        <div className="flex flex-wrap items-end justify-between gap-6 lg:gap-10">
          <h2 className={`${H2} max-w-[12em]`} style={{ color: NAVY }}><Regels regels={regels} /></h2>
          {d.text && <p className="m-0 max-w-[26em] text-[17px] leading-[1.6] md:text-[18px]" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-0">
          {stappen.map((s, i) => (
            <li key={i} className="flex min-w-0 flex-col gap-5 md:gap-6 md:pr-10 md:last:pr-0">
              <div className="flex items-center">
                <span className={`${kop} grid h-14 w-14 shrink-0 place-items-center rounded-full text-[22px] font-bold text-white`} style={{ background: STAP_KLEUR[i % STAP_KLEUR.length] }}>{i + 1}</span>
                {i < stappen.length - 1 && <span aria-hidden className="hidden h-[2px] flex-1 md:block" style={{ background: "#C9C1EA" }} />}
              </div>
              <h3 className={`${kop} m-0 text-[23px] leading-[1.2] md:text-[26px]`} style={{ color: NAVY }}>{s.titel}</h3>
              <p className="m-0 max-w-[22em] text-[16px] leading-[1.6] md:text-[17px]" style={{ color: BODY }}>{s.tekst}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Twee manieren om samen te werken ---------- */

export function PtModellen({ d }: { d: any }) {
  const kaarten: any[] = d.kaarten || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:py-[104px]`}>
        <div className="flex max-w-[34em] flex-col gap-4">
          <h2 className={H2} style={{ color: NAVY }}>{d.heading}</h2>
          {d.text && <p className="m-0 text-[17px] leading-[1.6] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {kaarten.map((k, i) => {
            const donker = k.stijl === "navy";
            const accent = donker ? LIMOEN : TEAL;
            return (
              <div key={i} className="relative flex min-w-0 flex-col gap-7 overflow-hidden rounded-[28px] px-6 py-9 md:rounded-[40px] md:p-14"
                style={donker ? { background: NAVY, color: "#ffffff" } : { background: IVOOR }}>
                {donker && <span aria-hidden className="absolute bottom-[-120px] right-[-100px] h-[320px] w-[320px] rounded-full" style={{ background: "rgba(255,255,255,.07)" }} />}
                <div className="relative flex flex-col gap-2">
                  <span className="text-[16px] font-bold" style={{ color: accent }}>{k.label}</span>
                  <h3 className={`${kop} m-0 text-[26px] leading-[1.15] md:text-[32px]`} style={{ color: donker ? "#ffffff" : NAVY }}>{k.titel}</h3>
                </div>
                <div className="relative flex flex-wrap gap-x-10 gap-y-5">
                  {(k.cijfers || []).map((c: any, j: number) => (
                    <div key={j} className="flex flex-col">
                      <span className={`${kop} text-[48px] font-bold leading-none tracking-[-1.5px] md:text-[72px] md:tracking-[-2px]`}
                        style={{ color: donker ? "#ffffff" : NAVY, opacity: donker && j > 0 ? 0.7 : 1 }}>{c.waarde}</span>
                      <span className="mt-1.5 max-w-[14em] text-[15px] leading-[1.45]" style={{ color: donker ? "rgba(255,255,255,.8)" : BODY }}>{c.tekst}</span>
                    </div>
                  ))}
                </div>
                <ul className="relative m-0 flex list-none flex-col gap-3 p-0 text-[16px] leading-[1.5] md:text-[17px]" style={{ color: donker ? "#ffffff" : NAVY }}>
                  {(k.punten || []).map((p: string, j: number) => <li key={j} className="flex gap-3"><Vink kleur={accent} />{p}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        {d.voetnoot && <p className="m-0 max-w-[62em] text-[15px] leading-[1.6]" style={{ color: BODY }}>{d.voetnoot}</p>}
      </div>
    </section>
  );
}

/* ---------- Wat je klant krijgt ---------- */

export function PtKlant({ d }: { d: any }) {
  const regels = kopRegels(d);
  const labels: any[] = d.labels || [];
  return (
    <section aria-label={regels.join(" ")} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: IVOOR }}>
      <div className={`${BREED} grid gap-10 py-14 md:py-[104px] lg:grid-cols-12 lg:items-center lg:gap-8`}>
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <h2 className={H2} style={{ color: NAVY }}><Regels regels={regels} /></h2>
          {d.text && <p className="m-0 max-w-[28em] text-[17px] leading-[1.6] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
          {d.keurmerken?.length > 0 && (
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] font-bold" style={{ color: NAVY }}>
              {d.keurmerken.map((k: string) => <li key={k}>{k}</li>)}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-[28px] bg-white px-6 py-4 md:rounded-[40px] md:px-12 md:py-8 lg:col-span-6 lg:col-start-7">
          {labels.map((l, i) => (
            <a key={i} href={l.href} className="group flex flex-col gap-1 border-b py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-5 md:py-[18px]" style={{ borderColor: "#EFEDF5" }}>
              <span className="flex items-center gap-3 sm:w-[150px] sm:shrink-0">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: KLEUR[l.kleur] || NAVY }} />
                <strong className={`${kop} text-[21px] group-hover:underline group-hover:underline-offset-4 md:text-[22px]`} style={{ color: NAVY }}>{l.naam}</strong>
              </span>
              <span className="text-[15.5px] leading-[1.5] md:text-[16px]" style={{ color: BODY }}>{l.tekst}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Aanmelden ---------- */

/** "Bel {telefoon} of mail naar {email}." met beide als link. */
function Direct({ tekst, telefoon, email, taal }: { tekst: string; telefoon: string; email: string; taal: Taal }) {
  return (
    <>
      {tekst.split(/(\{telefoon\}|\{email\})/).map((deel, i) =>
        deel === "{telefoon}" ? <a key={i} href={`tel:+31${telefoon.replace(/\D/g, "").replace(/^0/, "")}`} className="font-bold text-white underline underline-offset-4">{telefoonInTaal(telefoon, taal)}</a>
        : deel === "{email}" ? <a key={i} href={`mailto:${email}`} className="font-bold text-white underline underline-offset-4">{email}</a>
        : deel
      )}
    </>
  );
}

export function PtAanmelden({ d, ctx }: { d: any; ctx?: Ctx }) {
  const regels = kopRegels(d);
  const ontvang: string[] = d.ontvang || [];
  return (
    <section aria-label={regels.join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: "#ffffff" }}>
      <div className={`${BREED} pb-16 md:pb-32`}>
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-4 py-9 text-white sm:px-5 md:rounded-[40px] md:p-14 lg:grid-cols-12 lg:gap-8 xl:p-[72px]" style={{ background: NAVY }}>
          <span aria-hidden className="absolute bottom-[-180px] left-[-140px] h-[460px] w-[460px] rounded-full" style={{ background: "rgba(255,255,255,.06)" }} />
          <div className="relative flex min-w-0 flex-col gap-5 lg:col-span-5">
            <h2 className={H2} style={{ color: "#ffffff" }}><Regels regels={regels} accent={LIMOEN} /></h2>
            {d.text && (
              <p className="m-0 max-w-[26em] text-[17px] leading-[1.6] text-white/90 md:text-[18px]">
                {d.text}{" "}
                {d.direct && <Direct tekst={d.direct} telefoon={d.telefoon || "085 620 58 00"} email={d.email || "sales@react2u.nl"} taal={ctx?.lang ?? "nl"} />}
              </p>
            )}
            {ontvang.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-t pt-6 text-[16px] text-white/90" style={{ borderColor: "rgba(255,255,255,.2)" }}>
                <strong className="text-white">{d.ontvangKop}</strong>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {ontvang.map((o, i) => <li key={i} className="flex gap-3"><Vink kleur={LIMOEN} />{o}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="relative min-w-0 rounded-[22px] bg-white px-4 py-7 sm:px-5 md:rounded-[28px] md:p-10 lg:col-span-7">
            <PartnerFormulier f={d.form || {}} />
          </div>
        </div>
      </div>
    </section>
  );
}
