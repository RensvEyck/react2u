import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, SKY, ORANGE, BODY, MUTE, LINE, SOFT, kop, BREED, Eyebrow, Pijl, KEURMERKEN } from "./Gedeeld";
import Beeld from "@/components/site/Beeld";
import { telefoonInTaal, type Taal } from "@/lib/taal";
import type { TarievenSettings } from "@/lib/tarieven";
import {
  LuBriefcase, LuCalculator, LuFileText, LuHandshake, LuReceipt, LuSend, LuShieldCheck, LuUsers, LuWallet,
} from "react-icons/lu";
import PartnerRekenhulp from "./PartnerRekenhulp";
import PartnerFormulier from "./PartnerFormulier";

type Ctx = { lang?: Taal; tarieven?: TarievenSettings };

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Blokken voor /partners, het partnerprogramma voor accountants,
 * salariskantoren en HR- en verzekeringsadviseurs. De kop is indigo met de
 * rekenhulp als witte kaart erop, zoals een partnerportaal; daarna de
 * klantlogo's (klantenStrook), wie het is, hoe het werkt, de vergoeding, wat
 * de klant krijgt, de citaten van klanten (klantenAanHetWoord), vragen
 * (dgVragen) en aanmelden. Alle tekst staat in `data`.
 */

const IVOOR = "#F8F5F1";
/** Accent op indigo, uit het ontwerp: het enige groen van de site, alleen op donker. */
const LIMOEN = "#8AD936";
const KLEUR: Record<string, string> = { roze: PINK, teal: TEAL, oranje: ORANGE, blauw: SKY, navy: NAVY };
const ICOON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  rekenmachine: LuCalculator, loonstrook: LuReceipt, mensen: LuUsers, schild: LuShieldCheck,
  handdruk: LuHandshake, verstuur: LuSend, document: LuFileText, portemonnee: LuWallet, koffer: LuBriefcase,
};

function anker(d: any) {
  return d.anchor ? { id: d.anchor } : {};
}

/** De regels van de kop: `heading` met een regeleinde per regel. */
function kopRegels(d: any): string[] {
  return String(d.heading || "").split("\n").map((r) => r.trim()).filter(Boolean);
}

/** Een kop van meerdere regels; de laatste in het accent. */
function Regels({ regels, accent = TEAL }: { regels: string[]; accent?: string }) {
  return <>{regels.map((r, i) => <span key={i} className="block" style={i > 0 && i === regels.length - 1 ? { color: accent } : undefined}>{r}</span>)}</>;
}

function Vink({ kleur, size = 20 }: { kleur: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={kleur} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Een kleur als zachte achtergrond (hex met alfa). */
function zacht(hex: string, alfa = "1A") {
  return `${hex}${alfa}`;
}

const H2 = `${kop} m-0 text-[32px] leading-[1.1] tracking-[-0.8px] md:text-[44px] xl:text-[48px] xl:tracking-[-1.1px]`;

/** Eyebrow, kop en een korte toelichting rechts; zoals de andere secties van de site. */
function SectieKop({ d, accent = TEAL }: { d: any; accent?: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      {/* Zonder toelichting mag de kop breder, anders wordt een lange zin vier regels. */}
      <div className={`flex flex-col gap-4 ${d.text ? "lg:col-span-7" : "lg:col-span-10"}`}>
        {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
        <h2 className={H2} style={{ color: NAVY }}><Regels regels={kopRegels(d)} accent={accent} /></h2>
      </div>
      {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
    </div>
  );
}

/* ---------- Kop: indigo, met de rekenhulp als kaart ---------- */

export function PtKop({ d, asH1, ctx }: { d: any; asH1?: boolean; ctx?: Ctx }) {
  const H = asH1 ? "h1" : "h2";
  const regels = kopRegels(d);
  const jaar = ctx?.tarieven?.jaar ?? String(new Date().getFullYear());
  const vertrouwen: string[] = d.vertrouwen || [];
  return (
    <section aria-label={regels.join(" ")} className={`hv ${outfit.variable} relative overflow-hidden`} style={{ background: NAVY }}>
      {/* Twee zachte cirkels; decoratie. */}
      <span aria-hidden className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full" style={{ background: "rgba(255,255,255,.05)" }} />
      <span aria-hidden className="absolute -bottom-56 -left-32 h-[480px] w-[480px] rounded-full" style={{ background: "rgba(255,255,255,.04)" }} />
      <div className={`${BREED} relative grid gap-12 pb-16 pt-12 md:pb-24 md:pt-20 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-28`}>
        <div className="flex min-w-0 flex-col gap-7 lg:col-span-6">
          {d.eyebrow && <Eyebrow kleur={LIMOEN}>{d.eyebrow}</Eyebrow>}
          <H className={`${kop} m-0 text-[42px] leading-[1.02] tracking-[-1.3px] sm:text-[54px] xl:text-[68px] xl:tracking-[-2.2px]`} style={{ color: "#ffffff" }}>
            <Regels regels={regels} accent={LIMOEN} />
          </H>
          {d.text && <p className="m-0 max-w-[30em] text-[18px] leading-[1.6] text-white/80 md:text-[19px]">{d.text}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {d.knop?.label && (
              <a href={d.knop.href} className="hv-btn hv-btn-roze inline-flex h-[56px] items-center gap-2.5 rounded-full px-8 text-[16.5px] font-bold">{d.knop.label}<Pijl /></a>
            )}
            {d.tweedeKnop?.label && (
              <a href={d.tweedeKnop.href} className="hv-btn inline-flex h-[56px] items-center gap-2.5 rounded-full border-[1.5px] border-white/40 px-7 text-[16.5px] font-bold text-white hover:bg-white/10">
                {d.tweedeKnop.label}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
              </a>
            )}
          </div>
          {vertrouwen.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 border-t border-white/15 p-0 pt-6 text-[14.5px] text-white/80">
              {vertrouwen.map((v) => <li key={v} className="flex items-center gap-2"><Vink kleur={LIMOEN} size={17} />{v}</li>)}
            </ul>
          )}
        </div>
        <div className="min-w-0 lg:col-span-6 xl:col-span-5 xl:col-start-8">
          <PartnerRekenhulp r={d.rekenhulp || {}} jaar={jaar} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Voor wie: vier kaarten met een icoon ---------- */

export function PtDoelgroepen({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={kopRegels(d).join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:py-[104px]`}>
        <SectieKop d={d} />
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {items.map((it, i) => {
            const kleur = KLEUR[it.kleur] || PINK;
            const Icoon = ICOON[it.icoon] || LuBriefcase;
            return (
              <li key={i} className="flex min-w-0 flex-col gap-5 rounded-[26px] p-6 md:p-7" style={{ background: SOFT }}>
                <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: zacht(kleur) }}>
                  <Icoon className="text-[26px]" style={{ color: kleur }} />
                </span>
                <span className="flex flex-col gap-2">
                  <h3 className={`${kop} m-0 text-[21px] md:text-[22px]`} style={{ color: NAVY }}>{it.titel}</h3>
                  <p className="m-0 text-[15.5px] leading-[1.6] md:text-[16px]" style={{ color: BODY }}>{it.tekst}</p>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Zo werkt het: drie kaarten, met wie aan zet is ---------- */

export function PtStappen({ d }: { d: any }) {
  const stappen: any[] = d.stappen || [];
  return (
    <section aria-label={kopRegels(d).join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:py-[104px]`}>
        <SectieKop d={d} />
        <ol className="relative m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          {/* De lijn achter de kaarten, van stap naar stap. */}
          <span aria-hidden className="absolute left-[16%] right-[16%] top-[58px] hidden border-t-2 border-dashed md:block" style={{ borderColor: "#C9C1EA" }} />
          {stappen.map((s, i) => {
            const jij = /^jij/i.test(s.wie || "");
            const Icoon = ICOON[s.icoon] || LuSend;
            return (
              <li key={i} className="relative flex min-w-0 flex-col gap-5 rounded-[26px] bg-white p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-[60px] w-[60px] place-items-center rounded-full text-white" style={{ background: jij ? PINK : NAVY }}>
                    <Icoon className="text-[26px]" />
                  </span>
                  {s.wie && (
                    <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: zacht(jij ? PINK : TEAL), color: jij ? "#B0105A" : "#007A74" }}>{s.wie}</span>
                  )}
                </div>
                <span className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>{d.stapLabel || "Stap"} {i + 1}</span>
                  <h3 className={`${kop} m-0 text-[22px] leading-[1.2] md:text-[24px]`} style={{ color: NAVY }}>{s.titel}</h3>
                  <p className="m-0 text-[15.5px] leading-[1.65] md:text-[16px]" style={{ color: BODY }}>{s.tekst}</p>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Twee manieren om samen te werken ---------- */

export function PtModellen({ d }: { d: any }) {
  const kaarten: any[] = d.kaarten || [];
  return (
    <section aria-label={kopRegels(d).join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          {kaarten.map((k, i) => {
            const donker = k.stijl === "navy";
            const accent = donker ? LIMOEN : TEAL;
            return (
              <div key={i} className="relative flex min-w-0 flex-col overflow-hidden rounded-[28px] md:rounded-[36px]"
                style={donker ? { background: NAVY, color: "#ffffff" } : { background: IVOOR }}>
                {donker && <span aria-hidden className="absolute -bottom-32 -right-24 h-[320px] w-[320px] rounded-full" style={{ background: "rgba(255,255,255,.06)" }} />}
                <div className="relative flex flex-col gap-2 px-6 pt-8 md:px-12 md:pt-12">
                  <span className="self-start rounded-full px-3 py-1 text-[13px] font-bold" style={donker ? { background: "rgba(138,217,54,.16)", color: LIMOEN } : { background: zacht(TEAL), color: "#007A74" }}>{k.label}</span>
                  <h3 className={`${kop} m-0 mt-2 text-[26px] leading-[1.15] md:text-[30px]`} style={{ color: donker ? "#ffffff" : NAVY }}>{k.titel}</h3>
                </div>
                <div className="relative mx-6 mt-7 flex flex-wrap gap-x-10 gap-y-5 border-y py-6 md:mx-12" style={{ borderColor: donker ? "rgba(255,255,255,.15)" : "#E6E2DA" }}>
                  {(k.cijfers || []).map((c: any, j: number) => (
                    <div key={j} className="flex flex-col">
                      <span className={`${kop} text-[48px] font-bold leading-none tracking-[-1.5px] md:text-[64px] md:tracking-[-2px]`}
                        style={{ color: donker ? (j === 0 ? LIMOEN : "#ffffff") : NAVY }}>{c.waarde}</span>
                      <span className="mt-2 max-w-[14em] text-[14.5px] leading-[1.45]" style={{ color: donker ? "rgba(255,255,255,.8)" : BODY }}>{c.tekst}</span>
                    </div>
                  ))}
                </div>
                <ul className="relative m-0 flex flex-1 list-none flex-col gap-3 px-6 py-7 text-[15.5px] leading-[1.55] md:px-12 md:text-[16.5px]" style={{ color: donker ? "#ffffff" : NAVY }}>
                  {(k.punten || []).map((p: string, j: number) => <li key={j} className="flex gap-3"><Vink kleur={accent} />{p}</li>)}
                </ul>
                {k.knop?.label && (
                  <div className="relative px-6 pb-8 md:px-12 md:pb-12">
                    <a href={k.knop.href}
                      className={`hv-btn inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15.5px] font-bold ${donker ? "bg-white text-[#322E83] hover:bg-[#ECEBF5]" : "border-[1.5px] border-[#322E83] text-[#322E83] hover:bg-[#322E83] hover:text-white"}`}>
                      {k.knop.label}<Pijl />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {d.voetnoot && <p className="m-0 max-w-[62em] text-[14.5px] leading-[1.6]" style={{ color: MUTE }}>{d.voetnoot}</p>}
      </div>
    </section>
  );
}

/* ---------- Wat je klant krijgt ---------- */

export function PtKlant({ d }: { d: any }) {
  const labels: any[] = d.labels || [];
  return (
    <section aria-label={kopRegels(d).join(" ")} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: IVOOR }}>
      <div className={`${BREED} grid gap-10 py-14 md:py-[104px] lg:grid-cols-12 lg:items-center lg:gap-8`}>
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
          <h2 className={H2} style={{ color: NAVY }}><Regels regels={kopRegels(d)} /></h2>
          {d.text && <p className="m-0 text-[16.5px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>{d.text}</p>}
          <ul className="m-0 mt-3 grid list-none grid-cols-5 gap-2 p-0 sm:gap-3">
            {KEURMERKEN.map((k) => (
              <li key={k.src} className="flex aspect-square items-center justify-center rounded-[16px] bg-white p-2.5 sm:p-3" title={`${k.naam}: ${k.wat}`}>
                <Beeld src={k.src} alt={k.alt} sizes="80px" className="max-h-full w-auto max-w-full object-contain" />
              </li>
            ))}
          </ul>
        </div>
        <ul className="m-0 flex min-w-0 list-none flex-col rounded-[28px] bg-white px-5 py-3 md:rounded-[36px] md:px-10 md:py-6 lg:col-span-6 lg:col-start-7">
          {labels.map((l, i) => (
            <li key={i} className="border-b last:border-b-0" style={{ borderColor: LINE }}>
              <a href={l.href} className="group flex items-center gap-4 py-4 md:py-5">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: KLEUR[l.kleur] || NAVY }} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-5">
                  <strong className={`${kop} text-[20px] sm:w-[110px] sm:shrink-0 md:text-[21px]`} style={{ color: NAVY }}>{l.naam}</strong>
                  <span className="text-[15px] leading-[1.5] md:text-[15.5px]" style={{ color: BODY }}>{l.tekst}</span>
                </span>
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors group-hover:border-[#322E83] group-hover:bg-[#322E83] group-hover:text-white" style={{ borderColor: LINE, color: NAVY }}>
                  <Pijl size={14} />
                </span>
              </a>
            </li>
          ))}
        </ul>
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
            {d.eyebrow && <Eyebrow kleur={LIMOEN}>{d.eyebrow}</Eyebrow>}
            <h2 className={H2} style={{ color: "#ffffff" }}><Regels regels={regels} accent={LIMOEN} /></h2>
            {d.text && (
              <p className="m-0 max-w-[26em] text-[17px] leading-[1.6] text-white/90 md:text-[18px]">
                {d.text}{" "}
                {d.direct && <Direct tekst={d.direct} telefoon={d.telefoon || "085 620 58 00"} email={d.email || "sales@react2u.nl"} taal={ctx?.lang ?? "nl"} />}
              </p>
            )}
            {ontvang.length > 0 && (
              <div className="mt-3 flex flex-col gap-3 border-t pt-6 text-[16px] text-white/90" style={{ borderColor: "rgba(255,255,255,.2)" }}>
                <strong className="text-white">{d.ontvangKop}</strong>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
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
