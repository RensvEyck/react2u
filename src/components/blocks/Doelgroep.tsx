import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Vink, Pijl, KEURMERKEN } from "./Gedeeld";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * Blokken voor de doelgroeppagina's in het ontwerp van het canvas
 * (Werkgevers, Werknemers, Tarieven, Certificeringen). Koppen in Outfit,
 * tekst in DM Sans, alle tekst in `data`.
 */

function anker(d: any) {
  return d.anchor ? { id: d.anchor, className: "scroll-mt-28" } : {};
}

function Knop2({ href, children, stijl = "roze" }: { href: string; children: React.ReactNode; stijl?: "roze" | "rand" | "wit" | "witrand" | "navy" }) {
  const kleur = {
    roze: "hv-btn hv-btn-roze",
    rand: "hv-btn hv-btn-rand",
    wit: "hv-btn bg-white text-[#322E83] border-[1.5px] border-white",
    witrand: "hv-btn border-[1.5px] border-white/50 text-white hover:bg-white/10",
    navy: "hv-btn bg-[#322E83] text-white border-[1.5px] border-[#322E83] hover:bg-[#262268]",
  }[stijl];
  const cls = `${kleur} inline-flex h-[52px] items-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold`;
  const extern = /^(tel:|mailto:|#|https?:)/.test(href);
  return extern ? <a href={href} className={cls}>{children}<Pijl /></a> : <Link href={href} className={cls}>{children}<Pijl /></Link>;
}

function SectieKop({ d, size = 44 }: { d: any; size?: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
        <h2 className={`${kop} m-0 whitespace-pre-line leading-[1.1] tracking-[-0.9px]`} style={{ color: NAVY, fontSize: `clamp(32px, 4vw, ${size}px)` }}>{d.heading}</h2>
      </div>
      {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
    </div>
  );
}

/* ---------- Kop: grote foto met een gekleurd vlak ---------- */

export function DgKop({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const vlak = d.panel || NAVY;
  const knoppen: any[] = d.buttons || [];
  return (
    <section aria-label={d.eyebrow || d.heading} className={`hv ${outfit.variable} px-[6px] pt-2 md:px-2`}>
      <div className="relative overflow-hidden rounded-[24px] md:rounded-[28px]">
        <img src={d.image} alt={d.alt || ""} className="h-[300px] w-full object-cover md:h-[640px]" style={{ objectPosition: d.focus || "50% 35%" }} />
        {/* Op een tablet is het vlak breder en de kop kleiner: in 46% met een rand
            van 72px brak "re-integratie" in drieën. Vanaf 1280px de maten van het ontwerp. */}
        <div className="relative -mt-10 flex flex-col gap-5 rounded-t-[28px] px-6 pb-9 pt-9 md:absolute md:bottom-0 md:left-0 md:mt-0 md:w-[58%] md:max-w-[640px] md:rounded-none md:rounded-tr-[300px] md:px-12 md:pb-12 md:pt-12 lg:w-[54%] lg:px-14 lg:pb-14 lg:pt-14 xl:w-[46%] xl:px-[72px] xl:pb-[72px] xl:pt-[72px]"
          style={{ background: vlak }}>
          {d.eyebrow && <span className="text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "rgba(255,255,255,0.8)" }}>{d.eyebrow}</span>}
          <H className={`${kop} m-0 whitespace-pre-line text-[38px] leading-[1.02] tracking-[-1.2px] md:text-[44px] md:tracking-[-1.3px] lg:text-[50px] lg:tracking-[-1.5px] xl:text-[54px] xl:tracking-[-1.6px]`} style={{ color: "#ffffff" }}>{d.heading}</H>
          {d.text && <p className="m-0 max-w-[460px] text-[16px] leading-[1.6] md:text-[17px]" style={{ color: "rgba(255,255,255,0.85)" }}>{d.text}</p>}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {knoppen.map((b, i) => <Knop2 key={i} href={b.href} stijl={i ? "witrand" : "wit"}>{b.label}</Knop2>)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Specialismen als vijf gekleurde kaarten ---------- */

export function DgLabels({ d }: { d: any }) {
  const kaarten: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} bg-white`}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          {kaarten.map((c, i) => (
            <div key={i} className="relative flex flex-col gap-4 overflow-hidden rounded-[26px] px-6 pb-7 pt-7" style={{ background: c.tint }}>
              <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: c.kleur, opacity: 0.16 }} />
              <span className={`${kop} relative flex flex-col text-[19px] leading-[1.1]`} style={{ color: NAVY }}>
                React2u<span className="text-[30px] tracking-[-0.6px]" style={{ color: c.kleur === NAVY ? NAVY : c.kleur }}>{c.naam}<sup className="text-[13px]" style={{ color: NAVY }}>®</sup></span>
              </span>
              {c.label && (
                <span className="text-[15px] leading-[1.45]" style={{ color: NAVY }}>
                  <strong>{c.label}</strong>{c.tagline && <><br /><em>{c.tagline}</em></>}
                </span>
              )}
              {c.title && <span className={`${kop} text-[19px] leading-[1.25]`} style={{ color: NAVY }}>{c.title}</span>}
              {c.text && <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{c.text}</span>}
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {(c.points || []).map((p: string, j: number) => (
                  <li key={j} className="flex gap-2.5 text-[14.5px] leading-[1.45]" style={{ color: NAVY }}>
                    <span className="mt-0.5 shrink-0" style={{ color: c.kleur }}><Vink size={14} /></span>{p}
                  </li>
                ))}
              </ul>
              {c.href && (
                <Link href={c.href} className="hv-btn hv-btn-rand mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full px-5 text-[14.5px] font-bold" style={{ background: "transparent" }}>
                  {c.link || "Lees meer"}<Pijl size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
        {d.strook && (
          <div className="flex flex-col gap-5 rounded-[24px] px-7 py-7 md:flex-row md:items-center md:justify-between md:px-9" style={{ background: NAVY }}>
            <span className={`${kop} text-[24px]`} style={{ color: "#ffffff" }}>{d.strook.heading}</span>
            <span className="text-[16px] leading-[1.6] md:max-w-[440px]" style={{ color: "rgba(255,255,255,0.8)" }}>{d.strook.text}</span>
            <Knop2 href={d.strook.href} stijl="wit">{d.strook.label}</Knop2>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Foto met een genummerde lijst ---------- */

export function DgFotoLijst({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-6">
          <div className="relative h-[300px] overflow-hidden rounded-[24px] md:h-[440px] lg:col-span-6">
            <img src={d.image} alt={d.alt || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "50% 50%" }} loading="lazy" />
          </div>
          <ol className="m-0 flex list-none flex-col p-0 lg:col-span-5 lg:col-start-8">
            {items.map((it, i) => (
              <li key={i} className="flex gap-5 border-t py-6 last:border-b" style={{ borderColor: LINE }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold" style={{ background: SOFT, color: NAVY }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-col gap-1.5">
                  <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>{it.title}</span>
                  <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{it.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {d.link?.href && (
          <Link href={d.link.href} className="inline-flex items-center gap-2 self-start text-[16px] font-bold underline underline-offset-[5px]" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
            {d.link.label}<Pijl />
          </Link>
        )}
      </div>
    </section>
  );
}

/* ---------- Poortwachter: wat jij doet, wat wij doen ---------- */

export function DgPoortwachter({ d }: { d: any }) {
  const rijen: any[] = d.rows || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="overflow-hidden rounded-[24px] bg-white">
          <div className="hidden grid-cols-[220px_1fr_1fr] gap-6 px-8 py-4 text-[12.5px] font-bold uppercase tracking-[1.2px] md:grid" style={{ background: NAVY, color: "rgba(255,255,255,0.85)" }}>
            <span>Moment</span><span>Jij als werkgever</span><span>React2u</span>
          </div>
          {rijen.map((r, i) => (
            <div key={i} className="grid gap-2 border-t px-6 py-5 md:grid-cols-[220px_1fr_1fr] md:gap-6 md:px-8" style={{ borderColor: LINE }}>
              <span className="flex flex-col gap-1">
                <span className="self-start rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: "#FDECF4", color: PINK }}>{r.when}</span>
                <span className="text-[16px] font-bold" style={{ color: NAVY }}>{r.title}</span>
              </span>
              <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{r.jij}</span>
              <span className="flex gap-2.5 text-[15px] leading-[1.6]" style={{ color: NAVY }}>
                <span className="mt-1 shrink-0" style={{ color: TEAL }}><Vink size={14} /></span>{r.wij}
              </span>
            </div>
          ))}
        </div>
        {d.alert && (
          <div className="flex flex-col gap-4 rounded-[20px] border px-6 py-5 md:flex-row md:items-center md:justify-between" style={{ background: "#FDECF4", borderColor: "#F6C6DC" }}>
            <span className="flex flex-col gap-1">
              <span className="text-[16px] font-bold" style={{ color: PINK }}>{d.alert.title}</span>
              <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{d.alert.text}</span>
            </span>
            {d.alert.href && <Knop2 href={d.alert.href} stijl="rand">{d.alert.label}</Knop2>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Drie prijskaarten ---------- */

export function DgPrijzen({ d }: { d: any }) {
  const kaarten: any[] = d.cards || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="grid gap-5 lg:grid-cols-3">
          {kaarten.map((c, i) => {
            const donker = Boolean(c.featured);
            const tekst = donker ? "#ffffff" : NAVY;
            return (
              <div key={i} className="flex flex-col gap-5 rounded-[26px] border p-7 md:p-8" style={{ background: donker ? NAVY : "#ffffff", borderColor: donker ? NAVY : LINE }}>
                <span className="self-start rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ background: donker ? "rgba(255,255,255,0.12)" : SOFT, color: donker ? "#ffffff" : MUTE }}>{c.badge}</span>
                <span className={`${kop} text-[21px]`} style={{ color: tekst }}>{c.naam}</span>
                <span className="flex flex-col gap-1 border-b pb-5" style={{ borderColor: donker ? "rgba(255,255,255,0.15)" : LINE }}>
                  <span className={`${kop} text-[44px] leading-none tracking-[-1.2px]`} style={{ color: tekst }}>{c.prijs}</span>
                  <span className="text-[14px]" style={{ color: donker ? "rgba(255,255,255,0.7)" : MUTE }}>{c.per}</span>
                </span>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {(c.points || []).map((p: string, j: number) => (
                    <li key={j} className="flex gap-2.5 text-[15px]" style={{ color: tekst }}>
                      <span className="mt-0.5" style={{ color: donker ? "#F7A8CB" : TEAL }}><Vink size={14} /></span>{p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2"><Knop2 href={c.href} stijl={donker ? "roze" : "rand"}>{c.label}</Knop2></div>
              </div>
            );
          })}
        </div>
        {(d.note || d.link) && (
          <div className="flex flex-wrap items-center justify-between gap-4 text-[14.5px]" style={{ color: MUTE }}>
            <span>{d.note}</span>
            {d.link && <Link href={d.link.href} className="inline-flex items-center gap-2 font-bold" style={{ color: NAVY }}>{d.link.label}<Pijl size={14} /></Link>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Stappen in een rij, met knop ---------- */

export function DgStarten({ d }: { d: any }) {
  const stappen: any[] = d.steps || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} bg-white`}>
      <div className={`${BREED} flex flex-col gap-12 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <ol className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {stappen.map((s, i) => (
            <li key={i} className="flex flex-col gap-3">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: NAVY }}>{i + 1}</span>
                {i < stappen.length - 1 && <span className="hidden h-0.5 flex-1 lg:block" style={{ background: LINE }} />}
              </span>
              <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>{s.title}</span>
              <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{s.text}</span>
            </li>
          ))}
        </ol>
        {d.button && (
          <div className="flex flex-wrap items-center gap-5">
            <Knop2 href={d.button.href}>{d.button.label}</Knop2>
            {d.call && (
              <a href={d.call.href} className="flex flex-col text-[13.5px]" style={{ color: MUTE }}>
                {d.call.label}<span className="text-[16px] font-bold" style={{ color: NAVY }}>{d.call.value}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Veelgestelde vragen: kop links, vragen rechts ---------- */

export function DgVragen({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable}`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} grid gap-10 py-20 md:py-[104px] lg:grid-cols-12 lg:gap-6`}>
        <div className="flex flex-col gap-4 lg:col-span-4">
          {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
          <h2 className={`${kop} m-0 whitespace-pre-line text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[44px]`} style={{ color: NAVY }}>{d.heading}</h2>
          {d.text && <p className="m-0 text-[16px] leading-[1.65]" style={{ color: BODY }}>{d.text}</p>}
          {d.phone && <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="text-[16px] font-bold" style={{ color: NAVY }}>{d.phone}</a>}
        </div>
        <div className="flex flex-col border-t lg:col-span-7 lg:col-start-6" style={{ borderColor: LINE }}>
          {items.map((q, i) => (
            <details key={i} className="group border-b py-5" style={{ borderColor: LINE }} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[16.5px] font-bold md:text-[17px]" style={{ color: NAVY }}>
                {q.question}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors group-open:border-[#322E83] group-open:bg-[#322E83] group-open:text-white" style={{ borderColor: LINE }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14" /><path d="M12 5v14" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <p className="m-0 mt-3 max-w-[640px] text-[15.5px] leading-[1.7]" style={{ color: BODY }}>{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Tarieven: kop, abonnementen en prijslijsten ---------- */

function Prijslijst({ titel, per, regels }: { titel: string; per: string; regels: any[] }) {
  return (
    <div className="flex flex-col rounded-[22px] bg-white px-6 pb-3 pt-6 shadow-[0_20px_40px_-32px_rgba(50,46,131,0.35)] md:px-7">
      <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: LINE }}>
        <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>{titel}</span>
        <span className="text-[13px]" style={{ color: MUTE }}>{per}</span>
      </div>
      {regels.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-4 border-b py-3.5 last:border-b-0" style={{ borderColor: LINE }}>
          <span className="flex flex-col">
            <span className="text-[15px] font-bold" style={{ color: NAVY }}>{r.naam}</span>
            {r.sub && <span className="text-[13.5px]" style={{ color: MUTE }}>{r.sub}</span>}
          </span>
          <span className="shrink-0 text-[15px] font-bold" style={{ color: NAVY }}>{r.prijs}</span>
        </div>
      ))}
    </div>
  );
}

export function DgTarieven({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const abonnementen: any[] = d.abonnementen || [];
  const groepen: any[] = d.groepen || [];
  return (
    <div className={`hv ${outfit.variable}`}>
      <section aria-label={d.eyebrow || "Tarieven"} className="bg-white">
        <div className={`${BREED} flex flex-col gap-5 pb-14 pt-10 md:pb-16 md:pt-14`}>
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Tarieven" }]} />
          {d.eyebrow && <Eyebrow kleur={TEAL}>{d.eyebrow}</Eyebrow>}
          <H className={`${kop} m-0 text-[42px] leading-[1.04] tracking-[-1.4px] md:text-[60px]`} style={{ color: NAVY }}>{d.heading}</H>
          {d.text && <p className="m-0 max-w-[640px] text-[17px] leading-[1.65]" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <div className={`${BREED} grid gap-5 pb-20 md:grid-cols-2 md:pb-24`}>
          {abonnementen.map((a, i) => {
            const donker = Boolean(a.featured);
            const tekst = donker ? "#ffffff" : NAVY;
            const zacht = donker ? "rgba(255,255,255,0.78)" : BODY;
            return (
              <div key={i} className="flex flex-col gap-5 rounded-[28px] border p-7 md:p-10" style={{ background: donker ? NAVY : "#ffffff", borderColor: donker ? NAVY : LINE, boxShadow: donker ? "none" : "0 24px 48px -36px rgba(50,46,131,0.35)" }}>
                <div className="flex items-center justify-between gap-4">
                  <span className={`${kop} text-[22px]`} style={{ color: tekst }}>{a.naam}</span>
                  <span className="rounded-md px-2.5 py-1 text-[12px] font-bold" style={{ background: donker ? PINK : SOFT, color: donker ? "#ffffff" : NAVY }}>{a.badge}</span>
                </div>
                <span className="flex items-end gap-2">
                  <span className={`${kop} text-[56px] leading-[0.9] tracking-[-1.6px] md:text-[64px]`} style={{ color: tekst }}>{a.prijs}</span>
                  <span className="pb-1 text-[14.5px]" style={{ color: zacht }}>{a.per}</span>
                </span>
                <p className="m-0 border-b pb-5 text-[16px] leading-[1.6]" style={{ color: zacht, borderColor: donker ? "rgba(255,255,255,0.15)" : LINE }}>{a.text}</p>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {(a.points || []).map((p: string, j: number) => (
                    <li key={j} className="flex gap-3 text-[15.5px]" style={{ color: tekst }}>
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: donker ? "rgba(255,255,255,0.12)" : "#E5F5F4", color: donker ? "#ffffff" : TEAL }}><Vink size={11} /></span>{p}
                    </li>
                  ))}
                </ul>
                {a.note && <p className="m-0 text-[14px]" style={{ color: zacht }}>{a.note}</p>}
                <div className="mt-auto pt-2"><Knop2 href={a.href || "/kennismaken"} stijl={donker ? "wit" : "navy"}>{a.label || "Offerte aanvragen"}</Knop2></div>
              </div>
            );
          })}
        </div>
      </section>
      {groepen.map((g, gi) => (
        <section key={gi} aria-label={g.eyebrow} style={{ background: gi % 2 === 0 ? SOFT : "#ffffff" }}>
          <div className={`${BREED} flex flex-col gap-10 py-20 md:py-24`}>
            <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
              <div className="flex flex-col gap-4 lg:col-span-6">
                <Eyebrow kleur={TEAL}>{g.eyebrow}</Eyebrow>
                <h2 className={`${kop} m-0 text-[32px] leading-[1.1] tracking-[-0.9px] md:text-[40px]`} style={{ color: NAVY }}>{g.heading}</h2>
              </div>
              {g.text && <p className="m-0 text-[16px] lg:col-span-5 lg:col-start-8" style={{ color: BODY }}>{g.text}</p>}
            </div>
            <div className="grid items-start gap-5 md:grid-cols-2">
              {[g.links || [], g.rechts || []].map((kolom: any[], k) => (
                <div key={k} className="flex flex-col gap-5">
                  {kolom.map((lijst, li) => lijst.regels ? (
                    <Prijslijst key={li} titel={lijst.titel} per={lijst.per} regels={lijst.regels} />
                  ) : (
                    <div key={li} className="flex flex-col gap-3 rounded-[22px] p-7" style={{ background: LAV }}>
                      <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>{lijst.titel}</span>
                      <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{lijst.text}</span>
                      {lijst.href && <Link href={lijst.href} className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>{lijst.label}<Pijl size={14} /></Link>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Certificeringen ---------- */

export function DgCertificeringen({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const items: any[] = d.items || [];
  return (
    <div className={`hv ${outfit.variable}`}>
      <section aria-label="Certificeringen" className="bg-white">
        <div className={`${BREED} grid gap-6 pb-14 pt-10 md:pb-16 md:pt-14 lg:grid-cols-12`}>
          <div className="flex flex-col gap-5 lg:col-span-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Over ons", href: "/over-react2u" }, { label: "Certificeringen" }]} />
            <Eyebrow kleur={TEAL}>{d.eyebrow || "Certificeringen"}</Eyebrow>
            <H className={`${kop} m-0 whitespace-pre-line text-[42px] leading-[1.04] tracking-[-1.4px] md:text-[58px]`} style={{ color: NAVY }}>{d.heading}</H>
          </div>
          {d.text && <p className="m-0 self-end text-[17px] leading-[1.7] lg:col-span-5 lg:col-start-8" style={{ color: BODY }}>{d.text}</p>}
        </div>
      </section>
      <section aria-label="Keurmerken" style={{ background: SOFT }}>
        <ul className={`${BREED} m-0 grid list-none grid-cols-2 gap-3 py-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4`}>
          {KEURMERKEN.map((k) => (
            <li key={k.src} className="grid h-[110px] place-items-center rounded-[20px] bg-white p-4 shadow-[0_20px_40px_-32px_rgba(50,46,131,0.35)]">
              <img src={k.src} alt={k.alt} className="max-h-[70px] w-auto object-contain" loading="lazy" />
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Onze certificeringen" className="bg-white">
        <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
          <SectieKop d={{ eyebrow: d.lijstEyebrow, heading: d.lijstKop, text: d.lijstTekst }} />
          <div className="flex flex-col border-t" style={{ borderColor: LINE }}>
            {items.map((it, i) => {
              const k = KEURMERKEN[i];
              return (
                <div key={i} className="grid gap-5 border-b py-8 md:grid-cols-12 md:gap-6" style={{ borderColor: LINE }}>
                  <span className="grid h-[76px] w-[76px] place-items-center rounded-[18px] border bg-white p-2 md:col-span-2" style={{ borderColor: LINE }}>
                    {k && <img src={k.src} alt="" className="max-h-full w-auto object-contain" loading="lazy" />}
                  </span>
                  <span className={`${kop} text-[21px] leading-[1.25] md:col-span-4`} style={{ color: NAVY }}>{it.title}</span>
                  <span className="text-[16px] leading-[1.7] md:col-span-6" style={{ color: BODY }}>{it.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
