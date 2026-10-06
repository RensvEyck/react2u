import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, kop, BREED, Eyebrow, Kruimels, Knop, Vink, Pijl } from "./Gedeeld";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Bouwstenen voor de werknemerspagina's uit het ontwerp: Ziek, wat nu?,
 * Je rechten en privacy en Je casemanager. Elk blok is los te gebruiken;
 * kleuren en tekst komen uit `data`. Ook de pagina's Inloggen en
 * Juridische documenten staan hier, omdat ze dezelfde kop gebruiken.
 */

const ICONEN: Record<string, React.ReactNode> = {
  hart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  chat: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1Z" />,
  koffer: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></>,
  document: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  mensen: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
  klembord: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  diploma: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11v5c3 2 7 2 10 0v-5" /></>,
  slot: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  telefoon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
};

function Icoon({ naam, size = 20 }: { naam: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONEN[naam] ?? ICONEN.document}</svg>
  );
}

/** Ankernaam voor een sectie: uit `data.anchor`. */
function anker(d: any) {
  return d.anchor ? { id: d.anchor, className: "scroll-mt-28" } : {};
}

/* ---------- Kop met kruimelpad, knoppen en optioneel een kaart ---------- */

export function WnKop({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const knoppen: any[] = d.buttons || [];
  const kaart: any[] = d.card || [];
  const crumbs = d.crumbs || [{ label: "Werknemers", href: "/werknemers" }, { label: d.heading }];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]`}>
      <div className={`relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:items-center lg:gap-16 lg:p-[72px] ${kaart.length ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}
        style={{ background: d.tint || "#FDECF4" }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: d.orb || PINK, opacity: 0.12 }} />
        <div className="relative flex max-w-[640px] flex-col gap-6">
          <Kruimels items={crumbs} />
          <H className={`${kop} m-0 text-[44px] leading-[1] tracking-[-1.4px] md:text-[68px] md:tracking-[-1.8px]`} style={{ color: NAVY }}>{d.heading}</H>
          {d.text && <p className="m-0 text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
          {knoppen.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              {knoppen.map((b, i) => <Knop key={i} href={b.href} rand={i > 0}>{b.label}</Knop>)}
            </div>
          )}
        </div>
        {kaart.length > 0 && (
          <div className="relative flex flex-col rounded-[24px] bg-white p-7">
            {d.cardTitle && <span className="pb-3 text-[15px] font-bold" style={{ color: NAVY }}>{d.cardTitle}</span>}
            {kaart.map((r, i) => (
              <a key={i} href={r.href} className="flex items-center gap-3 border-t py-4 text-[18px] font-bold" style={{ borderColor: LINE, color: NAVY }}>
                <span style={{ color: PINK }}><Icoon naam={r.icon} size={18} /></span>{r.label}
              </a>
            ))}
            {d.cardNote && <p className="m-0 border-t pt-4 text-[14.5px] leading-[1.55]" style={{ borderColor: LINE, color: BODY }}>{d.cardNote}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Kopje boven een sectie ---------- */

function SectieKop({ d }: { d: any }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
        <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`} style={{ color: NAVY }}>{d.heading}</h2>
      </div>
      {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
    </div>
  );
}

/* ---------- Tijdlijn in een rij ---------- */

export function WnStappen({ d }: { d: any }) {
  const stappen: any[] = d.steps || [];
  return (
    <section aria-label={d.heading} {...anker(d)} style={{ background: d.bg || "#ffffff" }}>
      <div className={`hv ${outfit.variable} ${BREED} flex flex-col gap-12 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <ol className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {stappen.map((s, i) => (
            <li key={i} className={`flex flex-col gap-2.5 ${d.numbered ? "" : "border-t-[3px] pt-[18px]"}`} style={{ borderColor: i === 0 ? PINK : LINE }}>
              {d.numbered && (
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: i === 0 ? PINK : NAVY }}>{i + 1}</span>
                  {i < stappen.length - 1 && <span className="hidden h-0.5 flex-1 lg:block" style={{ background: LINE }} />}
                </span>
              )}
              <span className={d.numbered ? "self-start rounded-full px-2.5 py-1 text-[12.5px] font-bold" : "text-[14px] font-bold"} style={{ color: PINK, background: d.numbered ? "#FDECF4" : undefined }}>{s.when}</span>
              <span className={`${kop} text-[19px] leading-[1.25]`} style={{ color: NAVY }}>{s.title}</span>
              <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{s.text}</span>
            </li>
          ))}
        </ol>
        {d.cta && (
          <div className="flex flex-col gap-4 rounded-[20px] border bg-white px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8" style={{ borderColor: LINE }}>
            <span className="flex flex-col gap-1">
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>{d.cta.heading}</span>
              <span className="text-[15px]" style={{ color: BODY }}>{d.cta.text}</span>
            </span>
            <a href={d.cta.href} className="hv-btn hv-btn-roze inline-flex h-[50px] items-center gap-2.5 self-start rounded-full px-6 text-[15px] font-bold md:self-auto">{d.cta.label}<Pijl /></a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Kaarten met een letter of icoon ---------- */

export function WnKaarten({ d }: { d: any }) {
  const kaarten: any[] = d.cards || [];
  const kolommen = d.columns === 4 ? "lg:grid-cols-4" : d.columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";
  const naast = d.layout === "naast";
  return (
    <section aria-label={d.heading} {...anker(d)} style={{ background: d.bg || SOFT }}>
      <div className={`hv ${outfit.variable} ${BREED} flex flex-col gap-10 py-20 md:gap-12 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className={`grid gap-4 md:gap-5 ${kolommen}`}>
          {kaarten.map((c, i) => {
            const inner = (
              <>
                <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] ${c.letter ? `${kop} text-[20px]` : ""}`}
                  style={{ background: c.tint || "#FDECF4", color: c.kleur || PINK }}>
                  {c.letter ? c.letter : <Icoon naam={c.icon} size={22} />}
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className={`${kop} text-[19px] md:text-[20px]`} style={{ color: NAVY }}>{c.title}</span>
                  <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{c.text}</span>
                </span>
              </>
            );
            const cls = `flex ${naast ? "flex-row gap-[18px]" : "flex-col gap-4"} rounded-[22px] border bg-white p-7`;
            return c.href
              ? <a key={i} href={c.href} target={c.href.endsWith(".pdf") ? "_blank" : undefined} rel="noopener" className={`${cls} hv-btn`} style={{ borderColor: LINE }}>{inner}</a>
              : <div key={i} className={cls} style={{ borderColor: LINE }}>{inner}</div>;
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Tekst links, kaart met wel/niet rechts ---------- */

export function WnTekstKaart({ d }: { d: any }) {
  const rijen: any[] = d.rows || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className="bg-white">
      <div className={`hv ${outfit.variable} ${BREED} grid gap-10 py-20 md:py-[104px] lg:grid-cols-12 lg:items-center lg:gap-6`}>
        <div className="flex flex-col gap-5 lg:col-span-6">
          {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
          <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`} style={{ color: NAVY }}>{d.heading}</h2>
          {d.text && <p className="m-0 text-[17px] leading-[1.75]" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <div className="flex flex-col rounded-[24px] px-7 py-3 lg:col-span-5 lg:col-start-8" style={{ background: SOFT }}>
          {rijen.map((r, i) => (
            <div key={i} className={`flex flex-col gap-2 py-5 ${i ? "border-t" : ""}`} style={{ borderColor: LINE }}>
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>{r.title}</span>
              <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Checklist in twee kolommen ---------- */

export function WnChecklist({ d }: { d: any }) {
  const items: string[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className="bg-white">
      <div className={`hv ${outfit.variable} ${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <ul className="m-0 grid list-none gap-x-8 gap-y-4 p-0 md:grid-cols-2">
          {items.map((t, i) => (
            <li key={i} className="flex gap-3 text-[16px] leading-[1.55]" style={{ color: BODY }}>
              <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: "#E5F5F4", color: TEAL }}><Vink size={13} /></span>{t}
            </li>
          ))}
        </ul>
        {d.link?.href && (
          <a href={d.link.href} target={d.link.href.endsWith(".pdf") ? "_blank" : undefined} rel="noopener"
            className="inline-flex items-center gap-2 self-start text-[16px] font-bold underline underline-offset-4" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
            {d.link.label}<Pijl />
          </a>
        )}
      </div>
    </section>
  );
}

/* ---------- Veelgestelde vragen (uitklapbaar) ---------- */

export function WnVragenLijst({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className="bg-white">
      <div className={`hv ${outfit.variable} ${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="flex flex-col border-t" style={{ borderColor: LINE }}>
          {items.map((q, i) => (
            <details key={i} className="group border-b py-6" style={{ borderColor: LINE }} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[17px] font-bold md:text-[18px]" style={{ color: NAVY }}>
                {q.question}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <p className="m-0 mt-3 max-w-[860px] text-[16px] leading-[1.7]" style={{ color: BODY }}>{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Drie waarden ---------- */

export function WnWaarden({ d }: { d: any }) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className="bg-white">
      <div className={`hv ${outfit.variable} ${BREED} flex flex-col gap-12 py-20 md:py-[104px]`}>
        <SectieKop d={d} />
        <div className="grid gap-10 md:grid-cols-3">
          {items.map((w, i) => (
            <div key={i} className="flex flex-col gap-[18px] border-t-[3px] pt-7" style={{ borderColor: w.kleur || PINK }}>
              <span className={`${kop} text-[40px] leading-none tracking-[-1.4px] md:text-[48px]`} style={{ color: NAVY }}>{w.title}</span>
              <span className="text-[16.5px] leading-[1.7]" style={{ color: BODY }}>{w.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Contactstrook op indigo ---------- */

export function WnContactStrook({ d }: { d: any }) {
  return (
    <section aria-label="Contact" className="bg-white">
      <div className={`hv ${outfit.variable} ${BREED} pb-20 md:pb-[112px]`}>
        <div className="flex flex-col gap-8 rounded-[28px] p-8 md:flex-row md:items-center md:justify-between md:rounded-[32px] md:px-14 md:py-12" style={{ background: NAVY }}>
          <div className="flex flex-col gap-2.5">
            <span className={`${kop} text-[28px] leading-[1.15] md:text-[32px]`} style={{ color: "#ffffff" }}>{d.heading}</span>
            {d.text && <span className="text-[17px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.75)" }}>{d.text}</span>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <a href="tel:+31856205800" className="inline-flex h-[54px] items-center gap-2.5 rounded-full bg-white px-6 text-[15px] font-bold" style={{ color: NAVY }}>
              <Icoon naam="telefoon" size={17} />085 620 58 00
            </a>
            <a href="mailto:info@react2u.nl" className="inline-flex h-[54px] items-center gap-2.5 rounded-full border px-6 text-[15px] font-bold" style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.4)" }}>
              <Icoon naam="mail" size={17} />info@react2u.nl
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Inloggen: twee portalen ---------- */

export function Inloggen({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const portalen: any[] = d.portals || [];
  const hulp: any[] = d.help || [];
  return (
    <div className={`hv ${outfit.variable}`}>
      <section aria-label="Inloggen" className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative flex flex-col gap-12 overflow-hidden rounded-[28px] px-5 py-10 md:rounded-[36px] md:p-14 lg:p-[72px]" style={{ background: "#ECEBF5" }}>
          <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex max-w-[640px] flex-col gap-[18px]">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Inloggen" }]} />
            <H className={`${kop} m-0 text-[48px] leading-[1] tracking-[-1.6px] md:text-[64px] md:tracking-[-1.8px]`} style={{ color: NAVY }}>{d.heading || "Inloggen"}</H>
            {d.text && <p className="m-0 text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
          </div>
          <div className="relative grid gap-5 md:grid-cols-2 md:gap-6">
            {portalen.map((p, i) => (
              <div key={i} id={p.anchor} className="flex flex-col gap-5 rounded-[28px] border bg-white p-7 shadow-[0_24px_48px_-32px_rgba(50,46,131,0.30)] md:p-10" style={{ borderColor: LINE }}>
                <span className="grid h-14 w-14 place-items-center rounded-[16px]" style={{ background: p.tint, color: p.kleur }}><Icoon naam={p.icon} size={26} /></span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-[14px] font-bold" style={{ color: p.kleur }}>{p.for}</span>
                  <span className={`${kop} text-[28px] md:text-[30px]`} style={{ color: NAVY }}>{p.title}</span>
                </span>
                <span className="text-[16.5px] leading-[1.65]" style={{ color: BODY }}>{p.text}</span>
                <div className="flex flex-col gap-2.5">
                  {(p.points || []).map((x: string, j: number) => (
                    <span key={j} className="flex gap-2.5 text-[15.5px] leading-[1.55]" style={{ color: BODY }}><span className="mt-0.5" style={{ color: TEAL }}><Vink size={16} /></span>{x}</span>
                  ))}
                </div>
                <a href={p.href} target="_blank" rel="noopener noreferrer"
                  className="hv-btn hv-btn-roze mt-auto flex h-14 items-center justify-center gap-2.5 rounded-full text-[16px] font-bold">Inloggen<Pijl size={17} /></a>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section aria-label="Hulp bij inloggen" className="bg-white">
        <div className={`${BREED} grid gap-5 py-16 md:grid-cols-3 md:py-[88px]`}>
          {hulp.map((h, i) => (
            <div key={i} className="flex flex-col gap-3.5 rounded-[24px] border p-8" style={{ borderColor: LINE }}>
              <span className="grid h-12 w-12 place-items-center rounded-[14px]" style={{ background: "#ECEBF5", color: NAVY }}><Icoon naam={h.icon} size={22} /></span>
              <span className={`${kop} text-[21px]`} style={{ color: NAVY }}>{h.title}</span>
              <span className="text-[16px] leading-[1.65]" style={{ color: BODY }}>{h.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- Juridische documenten als PDF ---------- */

export function JuridischeDocumenten({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const docs: any[] = d.documents || [];
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <section aria-label="Juridische documenten" className={`${BREED} flex flex-col gap-5 pt-12 md:pt-16`}>
        <Kruimels items={[{ label: "Home", href: "/" }, { label: "Juridisch" }]} />
        <H className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[60px]`} style={{ color: NAVY }}>{d.heading || "Juridische documenten"}</H>
        {d.text && <p className="m-0 max-w-[640px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
      </section>
      <section aria-label="Documenten" className={`${BREED} flex flex-col gap-8 pb-20 pt-10 md:pb-[112px] md:pt-12`}>
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {docs.map((doc, i) => (
            <a key={i} href={doc.href} target="_blank" rel="noopener" className="hv-btn group flex gap-5 rounded-[24px] border p-7 md:p-8" style={{ borderColor: LINE }}>
              <span className="grid h-14 w-12 shrink-0 place-items-center rounded-[10px] text-[12px] font-bold" style={{ background: "#FDECF4", color: PINK }}>PDF</span>
              <span className="flex flex-1 flex-col gap-2">
                <span className={`${kop} text-[22px]`} style={{ color: NAVY }}>{doc.title}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{doc.text}</span>
                {doc.meta && <span className="text-[14px]" style={{ color: MUTE }}>{doc.meta}</span>}
                <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>Open PDF<Pijl /></span>
              </span>
            </a>
          ))}
        </div>
        <p className="m-0 text-[16px]" style={{ color: BODY }}>
          Vragen? Mail <a href="mailto:info@react2u.nl" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>info@react2u.nl</a> of bel{" "}
          <a href="tel:+31856205800" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>085 620 58 00</a>.
        </p>
      </section>
    </div>
  );
}
