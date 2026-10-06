import { Space_Grotesk } from "next/font/google";
import { Kruimels } from "./Gedeeld";
import { PrintKnop } from "./PrintKnop";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Prijslijst in het ontwerp van het canvas-artifact "Prijslijst 2026":
 * twee indigo aansluitingskaarten, getinte blokken met een gekleurde
 * bovenrand en prijsregels, een kader "Op aanvraag" en een voetregel.
 * Alle tekst en bedragen staan in `data` (src/content/tarieven.json).
 * Printvriendelijk: "Download als pdf" print alleen het blad.
 */

const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

const INK = "#191726";
const INK2 = "#403D57";
const SOFT = "#7B7894";
const HAIR = "rgba(25,23,38,.11)";
const SPECTRUM = ["#00A098", "#3AA5DD", "#312D82", "#F19001", "#E61674", "#CB152B"];

const TINT: Record<string, { c: string; bg: string }> = {
  indigo: { c: "#312D82", bg: "#EEEEF6" },
  blauw: { c: "#3AA5DD", bg: "#E9F3FA" },
  grijs: { c: "#8D8BA3", bg: "#F2F2F5" },
  teal: { c: "#00A098", bg: "#E4F3F1" },
  oranje: { c: "#F19001", bg: "#FCF2E4" },
  magenta: { c: "#E61674", bg: "#FBECF2" },
};

function Spectrum({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex h-[5px] gap-[2px] overflow-hidden rounded-full ${className}`}>
      {SPECTRUM.map((k) => <i key={k} className="block flex-1" style={{ background: k }} />)}
    </div>
  );
}

function Regel({ r }: { r: any }) {
  const tekst = typeof r.prijs === "string" && !/€/.test(r.prijs);
  return (
    <li className="pb-regel flex items-baseline gap-2 py-[6px] text-[14.5px] leading-[1.35]">
      <span className="font-medium">
        {r.naam}
        {r.sub && <em className="mt-0.5 block text-[12px] font-normal not-italic leading-[1.4]" style={{ color: SOFT }}>{r.sub}</em>}
      </span>
      <span className="min-w-2 flex-1" />
      <span className={`shrink-0 whitespace-nowrap ${tekst ? "text-[13px] font-medium" : "font-bold tracking-[-0.02em]"}`} style={{ color: tekst ? SOFT : INK }}>{r.prijs}</span>
    </li>
  );
}

function Blok({ b }: { b: any }) {
  const t = TINT[b.kleur] || TINT.grijs;
  const kolommen: any[][] = b.kolommen || [b.regels || []];
  return (
    <div className="pb-blok relative flex flex-col overflow-hidden rounded-[12px] px-6 pb-5 pt-8" style={{ background: t.bg, flex: b.breed || 1 }}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[7px]" style={{ background: t.c }} />
      <h3 className="m-0 mb-1.5 flex flex-wrap items-baseline gap-x-2 border-b pb-2.5 text-[15px] font-bold tracking-[-0.018em]" style={{ borderColor: HAIR, color: INK }}>
        {b.titel}
        {b.per && <em className="ml-auto whitespace-nowrap text-[12px] font-medium not-italic tracking-normal max-sm:ml-0 max-sm:basis-full" style={{ color: SOFT }}>{b.per}</em>}
      </h3>
      <div className="flex flex-col gap-x-8 sm:flex-row">
        {kolommen.map((k, i) => (
          <ul key={i} className="m-0 min-w-0 flex-1 list-none p-0">
            {k.map((r: any, j: number) => <Regel key={j} r={r} />)}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function Prijsblad({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const plannen: any[] = d.aansluitingen || [];
  const banden: any[][] = d.banden || [];
  const aanvraag = d.opAanvraag;
  return (
    <div className={`${grotesk.className} prijsblad-pagina`} style={{ background: "#F1F0F6", color: INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
      <style>{`
        .pb-regel + .pb-regel { border-top: 1px solid rgba(25,23,38,.07); }
        .pb-plan::before { content:""; position:absolute; inset:0; pointer-events:none;
          background-image:
            radial-gradient(circle at 87% 16%, rgba(255,255,255,.10) 0 32px, transparent 33px),
            radial-gradient(circle at 101% 44%, rgba(255,255,255,.085) 0 23px, transparent 24px),
            radial-gradient(circle at 74% 44%, rgba(255,255,255,.06) 0 15px, transparent 16px); }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .prijsblad, .prijsblad * { visibility: visible; }
          .prijsblad { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
          .pb-geen-print { display: none !important; }
          .prijsblad * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="mx-auto max-w-[1040px] px-4 pb-20 pt-8 md:pb-28 md:pt-12">
        <div className="pb-geen-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Tarieven" }]} />
          <PrintKnop label={d.printLabel || "Download als pdf"} />
        </div>

        <article className="prijsblad rounded-[16px] bg-white px-5 pb-7 pt-8 shadow-[0_14px_44px_rgba(25,23,38,.12)] sm:px-10 sm:pb-9 sm:pt-11">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2">
              {d.eyebrow && <span className="text-[12px] font-semibold uppercase tracking-[.13em]" style={{ color: SOFT }}>{d.eyebrow}</span>}
              <H className="m-0 text-[34px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[44px]" style={{ color: INK }}>{d.heading}</H>
            </div>
            {d.meta && <p className="m-0 whitespace-pre-line text-[13px] leading-[1.5] sm:text-right" style={{ color: SOFT }}>{d.meta}</p>}
          </header>

          <Spectrum className="mb-6 mt-5" />

          <section aria-label="Aansluiting" className="flex flex-col gap-4 md:flex-row">
            {plannen.map((p, i) => (
              <div key={i} className="pb-plan relative flex-1 overflow-hidden rounded-[12px] p-7 text-white" style={{ background: i === 0 ? "#312D82" : "#4A45A5" }}>
                <div className="relative z-[1]">
                  <div className="text-[11px] font-semibold uppercase tracking-[.13em] opacity-60">{p.kicker || "Aansluiting"}</div>
                  <div className="mt-5 text-[46px] font-bold leading-none tracking-[-0.05em]">{p.prijs}</div>
                  <div className="mt-1 text-[13px] opacity-70">{p.per}</div>
                  <div className="mt-6 text-[19px] font-semibold tracking-[-0.02em]">{p.naam}</div>
                  <p className="m-0 mt-1.5 max-w-[34em] text-[14px] leading-[1.6] opacity-[.86]">
                    {p.text}
                    {p.uitgesloten && <> <b className="font-semibold opacity-100">Niet inbegrepen:</b> {p.uitgesloten}</>}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {banden.map((band, i) => (
            <div key={i} className="mt-4 flex flex-col gap-4 md:flex-row md:items-stretch">
              {band.map((b, j) => <Blok key={j} b={b} />)}
            </div>
          ))}

          {aanvraag && (
            <section aria-label={aanvraag.titel} className="mt-4 rounded-[12px] border px-6 py-5" style={{ borderColor: HAIR }}>
              <h3 className="m-0 mb-2 text-[15px] font-bold tracking-[-0.018em]">{aanvraag.titel}</h3>
              {(aanvraag.alineas || []).map((a: any, k: number) => (
                <p key={k} className="m-0 mt-1.5 text-[14px] leading-[1.62]" style={{ color: INK2 }}>
                  {a.kop && <b className="font-semibold" style={{ color: INK }}>{a.kop} </b>}
                  {a.tekst}
                </p>
              ))}
            </section>
          )}

          <footer className="mt-6 flex flex-col justify-between gap-3 border-t pt-4 text-[12.5px] leading-[1.7] sm:flex-row" style={{ borderColor: HAIR, color: SOFT }}>
            <div className="whitespace-pre-line">{d.voetnoot}</div>
            {d.adres && (
              <div className="sm:text-right">
                <div className="whitespace-pre-line">{d.adres}</div>
                <div aria-hidden className="mt-1.5 flex gap-1 sm:justify-end">
                  {SPECTRUM.map((k) => <i key={k} className="block h-[6px] w-[6px] rounded-full" style={{ background: k }} />)}
                </div>
              </div>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
