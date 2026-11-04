import Link from "next/link";
import {
  LuArrowRight, LuBookOpen, LuChevronDown, LuChevronRight, LuCircleCheck, LuFilePenLine, LuGlobe,
  LuPhoneCall, LuPlus, LuScrollText, LuTrendingUp,
} from "react-icons/lu";
import { euro } from "@/lib/offertes";
import type { Signaal, Toon, Verkoopcijfers } from "@/lib/opvolgen";

/**
 * Het Verkoopblok op het dashboard: vier cijfers en wat er vandaag opgevolgd
 * moet worden (regels in lib/opvolgen.ts). Alleen voor wie het salesrecht
 * (bellijst) heeft; de pagina beslist dat.
 */

const ZICHTBAAR = 6;

const TOON: Record<Toon, string> = {
  warm: "bg-[#fdeef4] text-[#e0356b]",
  "let-op": "bg-[#fff4e5] text-[#c77700]",
  info: "bg-[#eef0ff] text-[#312e82]",
  goed: "bg-[#e6f7f4] text-[#0e9f8a]",
};

function Icoon({ s }: { s: Signaal }) {
  if (s.reden === "zonder-contract" || s.soort === "contract") return <LuScrollText />;
  return s.soort === "brochure" ? <LuBookOpen /> : <LuFilePenLine />;
}

export default function VerkoopBlok({ signalen, cijfers, leeg }: { signalen: Signaal[]; cijfers: Verkoopcijfers; leeg: boolean }) {
  const aandacht = signalen.filter((s) => s.toon !== "info").length;
  const eerst = signalen.slice(0, ZICHTBAAR);
  const rest = signalen.slice(ZICHTBAAR);
  const { open, getekend30, hitrate, contracten } = cijfers;

  return (
    <section className="acard overflow-hidden" aria-labelledby="verkoop-kop" id="verkoop">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
        <h2 id="verkoop-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
          <LuTrendingUp className="text-[16px] text-black/35" /> Verkoop
          {aandacht > 0 && (
            <span className="apill bg-[#fdeef4] !px-2 !py-0 font-sans !text-[11.5px] text-[#e0356b]">
              {aandacht} op te volgen
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4">
          <Link href="/admin/brochures" className="hidden text-[13px] font-semibold text-black/45 hover:text-[#312e82] sm:inline">Brochures</Link>
          <Link href="/admin/contracten" className="hidden text-[13px] font-semibold text-black/45 hover:text-[#312e82] sm:inline">Contracten</Link>
          <Link href="/admin/offertes" className="hidden text-[13px] font-semibold text-black/45 hover:text-[#312e82] sm:inline">Offertes</Link>
          <Link href="/admin/verkoop" className="flex items-center gap-1 text-[13px] font-semibold text-[#e75387] hover:underline">
            Salesdashboard <LuArrowRight className="text-[13px]" />
          </Link>
        </div>
      </div>

      {leeg ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <LuFilePenLine className="text-[26px] text-black/25" />
          <p className="text-[14px] text-black/45">Geen lopende offertes, brochures of contracten.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <Link href="/admin/brochures/nieuw" className="abtn-ghost !py-2 text-[13.5px]"><LuBookOpen /> Brochure sturen</Link>
            <Link href="/admin/offertes/nieuw" className="abtn !py-2 text-[13.5px]"><LuPlus /> Nieuwe offerte</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 border-b border-black/[0.06] lg:grid-cols-4">
            <Cijfer
              i={0}
              href="/admin/offertes?filter=open"
              label="Open offertes"
              waarde={euro(open.perMaand)}
              achter="per maand"
              sub={open.aantal === 0 ? "niets open" : `${open.aantal} open · ${open.bekeken} bekeken${open.eenmalig ? ` · ${euro(open.eenmalig)} eenmalig` : ""}`}
            />
            <Cijfer
              i={1}
              href="/admin/offertes?filter=getekend"
              label="Getekend, 30 dagen"
              waarde={euro(getekend30.perMaand)}
              achter="per maand"
              sub={getekend30.aantal === 0 ? "nog niets deze periode" : `${getekend30.aantal} offerte${getekend30.aantal === 1 ? "" : "s"}${getekend30.eenmalig ? ` · ${euro(getekend30.eenmalig)} eenmalig` : ""}`}
              goed={getekend30.aantal > 0}
            />
            <Cijfer
              i={2}
              href="/admin/offertes"
              label="Hitrate, 90 dagen"
              waarde={hitrate.procent === null ? "–" : `${hitrate.procent}%`}
              sub={hitrate.afgerond ? `${hitrate.getekend} van ${hitrate.afgerond} afgerond` : "nog niets afgerond"}
            />
            <Cijfer
              i={3}
              href="/admin/contracten"
              label="Basiscontracten"
              waarde={String(contracten.getekend)}
              achter="getekend"
              sub={contracten.wacht ? `${contracten.wacht} wacht${contracten.wacht === 1 ? "" : "en"} op handtekening` : "niets wacht op handtekening"}
            />
          </div>

          {signalen.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-9 text-center">
              <LuCircleCheck className="text-[26px] text-[#0e9f8a]/70" />
              <p className="text-[14px] text-black/45">Niets op te volgen: elke offerte, brochure en contract is bij.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-black/[0.05]">
                {eerst.map((s) => <OpvolgRij key={s.key} s={s} />)}
              </div>
              {rest.length > 0 && (
                <details className="group/meer border-t border-black/[0.05]">
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 px-6 py-3 text-[13px] font-semibold text-[#e75387] transition hover:bg-[#fafafd] [&::-webkit-details-marker]:hidden">
                    <span className="group-open/meer:hidden">Nog {rest.length} tonen</span>
                    <span className="hidden group-open/meer:inline">Minder tonen</span>
                    <LuChevronDown className="text-[14px] transition group-open/meer:rotate-180" />
                  </summary>
                  <div className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
                    {rest.map((s) => <OpvolgRij key={s.key} s={s} />)}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function Cijfer({
  i, href, label, waarde, achter, sub, goed,
}: {
  i: number;
  href: string;
  label: string;
  waarde: string;
  achter?: string;
  sub: string;
  goed?: boolean;
}) {
  // Lijnen tussen de vakjes: twee bij twee op een telefoon, vier naast elkaar vanaf lg.
  const lijnen = [
    i % 2 === 0 ? "border-r" : "",
    i < 2 ? "border-b lg:border-b-0" : "",
    i === 1 ? "lg:border-r" : "",
  ].join(" ");
  return (
    <Link href={href} className={`group border-black/[0.06] px-5 py-4 transition hover:bg-[#fafafd] sm:px-6 ${lijnen}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-black/35 sm:text-[11.5px]">{label}</p>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
        <span className={`font-heading text-[21px] font-bold leading-none tabular-nums sm:text-[23px] ${goed ? "text-[#0e9f8a]" : "text-[#1c1a4e]"}`}>{waarde}</span>
        {achter && <span className="text-[12.5px] text-black/40">{achter}</span>}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-black/45 sm:text-[12.5px]">{sub}</p>
    </Link>
  );
}

/** Eén signaal: wie, wat er aan de hand is, en bellen. Ook op /admin/verkoop. */
export function OpvolgRij({ s }: { s: Signaal }) {
  const wie = s.contactpersoon || s.bedrijf;
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:px-6">
      {/* Op een telefoon zonder rondje: de tekst heeft die ruimte harder nodig. */}
      <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] sm:flex ${TOON[s.toon]}`} aria-hidden>
        <Icoon s={s} />
      </span>
      <Link href={s.href} className="group min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-[14.5px] font-semibold text-[#1c1a4e] group-hover:text-[#e75387]">{s.bedrijf}</span>
          <span className={`apill shrink-0 !px-2 !py-0 !text-[11px] ${TOON[s.toon]}`}>{s.label}</span>
          {s.termijn && <span className="shrink-0 text-[12px] font-semibold text-[#c77700]">{s.termijn}</span>}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-black/45 sm:truncate">{s.details.join(" · ")}</span>
        {/* Een eigen regel: achter de details zou juist dit warmste stukje worden afgekapt. */}
        {s.opSite && (
          <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium leading-snug text-[#0e9f8a]">
            <LuGlobe className="shrink-0 text-[12px]" aria-hidden /> {s.opSite}
          </span>
        )}
      </Link>
      {s.telefoon ? (
        <a
          href={`tel:${s.telefoon.replace(/[^\d+]/g, "")}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
            s.toon === "warm"
              ? "bg-[#e75387] text-white hover:bg-[#d43d73]"
              : "border border-black/[0.09] text-[#312e82] hover:border-[#312e82] hover:bg-[#f7f7fc]"
          }`}
          aria-label={`Bel ${wie}`}
          title={`Bel ${wie}, ${s.telefoon}`}
        >
          <LuPhoneCall className="text-[13px]" /> <span className="hidden sm:inline">Bel</span>
        </a>
      ) : (
        <LuChevronRight className="shrink-0 text-black/20" aria-hidden />
      )}
    </div>
  );
}
