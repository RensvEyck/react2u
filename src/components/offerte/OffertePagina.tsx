"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/site/Logo";
import Handtekening from "./Handtekening";
import { bewaarKeuze, ondertekenOfferte, wijsOfferteAf } from "@/app/(offerte)/offerte/actions";
import {
  berekenTotalen, datumLang, euro, eenheidVan, herstelKeuze, isNaam, momentLang, normaliseerRegels, prijsLabel,
  secties, wissel, aantalVoor, bedragVoor, type OffertePubliek, type Regel,
} from "@/lib/offertes";

/*
 * De offerte zoals de klant hem ziet (/offerte/<token>), en hetzelfde scherm
 * als voorbeeld in het beheer. De klant klikt onderdelen aan, ziet het totaal
 * meerekenen en ondertekent in een venster. Vormgeving in de taal van de site:
 * zand en wit, indigo, roze alleen voor de hoofdactie.
 *
 * Modus:
 *  - klant      de echte link: keuze wordt bewaard, tekenen kan;
 *  - collega    een beheerder opent de echte link: niets telt, tekenen niet;
 *  - voorbeeld  vanuit het beheer, ook voor een concept.
 */

const NAVY = "#322E83";
const PINK = "#E61674";
const BODY = "#5E5C78";
const MUTE = "#77758F";
const ZAND = "#F6F2EC";

export type Modus = "klant" | "collega" | "voorbeeld";

const veld =
  "h-[50px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

function Vink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function initialen(naam: string | null) {
  return (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";
}

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);

/** Het bedrag van een regel in de lopende tekst: "€962,50 per jaar voor 25 medewerkers". */
function bedragZin(r: Regel, medewerkers: number | null) {
  const b = bedragVoor(r, medewerkers);
  if (!b) return null;
  const n = aantalVoor(r, medewerkers);
  const voor = r.eenheid === "medewerker_jaar" && n > 1 ? ` voor ${n.toLocaleString("nl-NL")} medewerkers` : r.aantal && r.aantal > 1 ? ` (${r.aantal.toLocaleString("nl-NL")}×)` : "";
  return `${euro(b.bedrag)}${b.periode === "jaar" ? " per jaar" : " eenmalig"}${voor}`;
}

export default function OffertePagina({
  offerte, token, modus, voorwaarden,
}: {
  offerte: OffertePubliek;
  token?: string;
  modus: Modus;
  voorwaarden: string;
}) {
  const getekend = offerte.status === "getekend" && offerte.getekend_inhoud;
  if (getekend) return <Getekend offerte={offerte} voorwaarden={voorwaarden} modus={modus} />;
  return <Kiezen offerte={offerte} token={token} modus={modus} voorwaarden={voorwaarden} />;
}

/* ---------- kop en voet ---------- */

function Kopbalk({ offerte }: { offerte: OffertePubliek }) {
  const tel = telLink(offerte.afzender_telefoon);
  return (
    <header className="border-b border-[#E6E0D6] bg-white print:border-0">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-4 px-5 md:px-8">
        <Logo className="h-9 w-auto" />
        <div className="flex items-center gap-2 text-[14px]">
          <span className="hidden rounded-full bg-[#F1EFF7] px-3 py-1.5 font-semibold sm:inline" style={{ color: NAVY }}>
            Offerte {offerte.nummer}
          </span>
          {tel && (
            <a href={tel} className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3 font-semibold hover:bg-[#F6F5FB] print:hidden" style={{ color: NAVY }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="hidden md:inline">{offerte.afzender_telefoon}</span>
              <span className="md:hidden">Bellen</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function Voet({ offerte, voorwaarden }: { offerte: OffertePubliek; voorwaarden: string }) {
  return (
    <footer className="mt-16 border-t border-[#E6E0D6] bg-white pb-28 pt-8 text-[14px] lg:pb-10 print:mt-8 print:pb-0" style={{ color: MUTE }}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="m-0">
          React2u · gecertificeerde arbodienst · offerte {offerte.nummer}
          {offerte.geldig_tot ? `, geldig tot en met ${datumLang(offerte.geldig_tot)}` : ""}
        </p>
        <p className="m-0">
          Alle bedragen exclusief btw. Op deze offerte zijn de{" "}
          <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>
            algemene voorwaarden
          </a>{" "}
          van toepassing.
        </p>
      </div>
    </footer>
  );
}

function Melding({ modus }: { modus: Modus }) {
  if (modus === "klant") return null;
  return (
    <div className="bg-[#FFF4E5] text-[14px] text-[#7A4A06] print:hidden">
      <p className="mx-auto m-0 max-w-[1200px] px-5 py-2.5 md:px-8">
        {modus === "voorbeeld"
          ? "Voorbeeld: zo ziet de klant de offerte. Je keuzes hier worden niet bewaard en tekenen kan niet."
          : "Je bekijkt deze offerte als collega. Dit bezoek telt niet mee en ondertekenen kan alleen de klant."}
      </p>
    </div>
  );
}

function Afzender({ offerte, compact = false }: { offerte: OffertePubliek; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${compact ? "h-10 w-10 text-[14px]" : "h-12 w-12 text-[16px]"}`}
        style={{ background: NAVY }}
        aria-hidden="true"
      >
        {initialen(offerte.afzender_naam)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-semibold" style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</span>
        <span className="block truncate text-[14px]" style={{ color: MUTE }}>
          {[offerte.afzender_functie, "React2u"].filter(Boolean).join(", ")}
        </span>
      </span>
    </div>
  );
}

/* ---------- kiezen en tekenen ---------- */

function Kiezen({ offerte, token, modus, voorwaarden }: { offerte: OffertePubliek; token?: string; modus: Modus; voorwaarden: string }) {
  const regels = useMemo(() => normaliseerRegels(offerte.regels), [offerte.regels]);
  const [keuze, setKeuze] = useState<string[]>(() => herstelKeuze(regels, offerte.keuze));
  const totalen = useMemo(() => berekenTotalen(regels, keuze, offerte.medewerkers), [regels, keuze, offerte.medewerkers]);
  // De knop staat er ook in het voorbeeld van een concept: zo zie je wat de klant ziet. Tekenen kan dan niet.
  const open = (offerte.status === "verstuurd" && !offerte.verlopen) || (modus === "voorbeeld" && offerte.status === "concept");
  const kanTekenen = offerte.status === "verstuurd" && !offerte.verlopen && modus === "klant" && Boolean(token);
  const kanKiezen = offerte.status === "verstuurd" || modus === "voorbeeld";
  const [teken, setTeken] = useState(false);
  const [afwijzen, setAfwijzen] = useState(false);

  // De tussenstand bewaren, een moment nadat de klant stopt met klikken.
  const eerste = useRef(true);
  useEffect(() => {
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    if (!kanTekenen || !token) return;
    const t = setTimeout(() => void bewaarKeuze(token, keuze).catch(() => {}), 900);
    return () => clearTimeout(t);
  }, [keuze, kanTekenen, token]);

  const klik = (id: string) => kanKiezen && setKeuze((k) => wissel(regels, k, id));
  const groepen = secties(regels);
  const heeftKeuze = regels.some((r) => r.soort === "optie" || r.soort === "keuze");

  return (
    <div className="min-h-screen" style={{ background: ZAND }}>
      <Kopbalk offerte={offerte} />
      <Melding modus={modus} />
      {offerte.verlopen && offerte.status === "verstuurd" && (
        <Band kleur="#FFF4E5" tekst="#7A4A06">
          Deze offerte was geldig tot en met {datumLang(offerte.geldig_tot)}. Wil je toch verder? Neem contact op met {offerte.afzender_naam || "ons"}, dan
          sturen we je een nieuwe.
        </Band>
      )}
      {offerte.status === "afgewezen" && (
        <Band kleur="#FDECEA" tekst="#8A1C12">
          Je hebt laten weten niet akkoord te gaan met deze offerte. Toch interesse, of wil je iets aanpassen? Neem gerust contact op.
        </Band>
      )}

      {/* Kop */}
      <section className="mx-auto max-w-[1200px] px-5 pb-8 pt-10 md:px-8 md:pt-14">
        <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: PINK }}>
          <span className="h-2 w-2 rounded-full" style={{ background: PINK }} />
          Offerte voor {offerte.bedrijf}
        </span>
        <h1 className="font-heading mt-4 max-w-[820px] text-[34px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[48px]" style={{ color: NAVY }}>
          {offerte.titel}
        </h1>
        <ul className="mt-5 flex flex-wrap gap-2 text-[14px]" style={{ color: BODY }}>
          {offerte.medewerkers ? <Chip>{offerte.medewerkers.toLocaleString("nl-NL")} medewerkers</Chip> : null}
          {offerte.geldig_tot ? <Chip>Geldig tot en met {datumLang(offerte.geldig_tot)}</Chip> : null}
          <Chip>Nummer {offerte.nummer}</Chip>
          <Chip>Bedragen exclusief btw</Chip>
        </ul>
        {offerte.intro && (
          <div className="mt-8 max-w-[820px] rounded-[20px] bg-white p-6 md:p-8">
            <p className="m-0 whitespace-pre-line text-[16.5px] leading-[1.7]" style={{ color: BODY }}>
              {offerte.intro}
            </p>
            <div className="mt-6">
              <Afzender offerte={offerte} />
            </div>
          </div>
        )}
      </section>

      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* Onderdelen */}
        <div className="flex flex-col gap-6">
          {heeftKeuze && kanKiezen && (
            <p className="m-0 text-[15px]" style={{ color: BODY }}>
              <strong style={{ color: NAVY }}>Stel je offerte samen.</strong> Klik aan wat je wilt; het totaal rekent meteen mee.
            </p>
          )}
          {groepen.map((s) => (
            <Sectie key={s.naam} sectie={s} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} />
          ))}
          <Vervolg />
        </div>

        {/* Samenvatting */}
        <aside className="lg:sticky lg:top-6">
          <Samenvatting
            totalen={totalen}
            actie={
              open ? (
                <>
                  <button
                    type="button"
                    onClick={() => setTeken(true)}
                    className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[12px] text-[16px] font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
                    style={{ background: PINK }}
                  >
                    Akkoord en ondertekenen
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                  {kanTekenen && (
                    <button type="button" onClick={() => setAfwijzen(true)} className="mt-3 w-full text-center text-[14px] font-semibold underline-offset-4 hover:underline print:hidden" style={{ color: MUTE }}>
                      Niet akkoord? Laat het ons weten
                    </button>
                  )}
                </>
              ) : null
            }
          />
          <div className="mt-4 rounded-[20px] bg-white p-5 print:hidden">
            <p className="m-0 text-[14px] font-semibold" style={{ color: NAVY }}>Vragen over deze offerte?</p>
            <div className="mt-3">
              <Afzender offerte={offerte} compact />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {offerte.afzender_telefoon && (
                <a href={telLink(offerte.afzender_telefoon)!} className="inline-flex h-10 items-center rounded-[10px] border border-[#DCDBEA] px-3.5 text-[14px] font-semibold hover:border-[#322E83]" style={{ color: NAVY }}>
                  Bel {offerte.afzender_telefoon}
                </a>
              )}
              {offerte.afzender_email && (
                <a href={`mailto:${offerte.afzender_email}?subject=${encodeURIComponent(`Vraag over offerte ${offerte.nummer}`)}`} className="inline-flex h-10 items-center rounded-[10px] border border-[#DCDBEA] px-3.5 text-[14px] font-semibold hover:border-[#322E83]" style={{ color: NAVY }}>
                  Mail
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Voet offerte={offerte} voorwaarden={voorwaarden} />

      {/* Telefoon: het totaal en de knop altijd in beeld */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E0D6] bg-white/95 px-5 py-3 backdrop-blur lg:hidden print:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-[640px] items-center gap-4">
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12.5px]" style={{ color: MUTE }}>{totalen.perJaar ? "Per jaar, excl. btw" : "Eenmalig, excl. btw"}</span>
              <span className="block text-[20px] font-bold tabular-nums" style={{ color: NAVY }}>{euro(totalen.perJaar || totalen.eenmalig)}</span>
            </div>
            <button type="button" onClick={() => setTeken(true)} className="h-[48px] shrink-0 rounded-[12px] px-5 text-[15px] font-semibold text-white" style={{ background: PINK }}>
              Ondertekenen
            </button>
          </div>
        </div>
      )}

      {teken && (
        <TekenVenster
          offerte={offerte}
          token={token}
          keuze={keuze}
          totalen={totalen}
          kanTekenen={kanTekenen}
          modus={modus}
          voorwaarden={voorwaarden}
          sluit={() => setTeken(false)}
        />
      )}
      {afwijzen && token && <AfwijsVenster offerte={offerte} token={token} sluit={() => setAfwijzen(false)} />}
    </div>
  );
}

function Band({ kleur, tekst, children }: { kleur: string; tekst: string; children: React.ReactNode }) {
  return (
    <div style={{ background: kleur, color: tekst }}>
      <p className="mx-auto m-0 max-w-[1200px] px-5 py-3 text-[15px] md:px-8">{children}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <li className="rounded-full bg-white px-3 py-1 text-[13px] sm:px-3.5 sm:py-1.5 sm:text-[14px]">{children}</li>;
}

function Sectie({
  sectie, keuze, klik, medewerkers, kanKiezen,
}: {
  sectie: ReturnType<typeof secties>[number];
  keuze: string[];
  klik: (id: string) => void;
  medewerkers: number | null;
  kanKiezen: boolean;
}) {
  const kleur = sectie.kleur || NAVY;
  const keuzes = new Map<string, Regel[]>();
  for (const r of sectie.regels.filter((r) => r.soort === "keuze")) keuzes.set(r.groep || "keuze", [...(keuzes.get(r.groep || "keuze") || []), r]);
  const vast = sectie.regels.filter((r) => r.soort === "vast");
  const opties = sectie.regels.filter((r) => r.soort === "optie");
  const tarieven = sectie.regels.filter((r) => r.soort === "tarief");
  const alleenTarieven = tarieven.length === sectie.regels.length;

  return (
    <section className="rounded-[22px] bg-white p-5 md:p-7 print:break-inside-avoid">
      {sectie.label && (
        <span className="inline-flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: kleur }}>
          <span className="h-2 w-2 rounded-full" style={{ background: kleur }} />
          {sectie.label}
        </span>
      )}
      <h2 className={`font-heading m-0 text-[22px] font-bold tracking-[-0.01em] md:text-[24px] ${sectie.label ? "mt-2" : ""}`} style={{ color: NAVY }}>
        {sectie.naam}
      </h2>
      {alleenTarieven && (
        <p className="m-0 mt-1.5 text-[14.5px]" style={{ color: MUTE }}>
          Je betaalt deze tarieven alleen als je er gebruik van maakt. Verrichtingen op uurbasis per begonnen kwartier.
        </p>
      )}

      {[...keuzes.values()].map((lijst, gi) => (
        <div key={gi} role="radiogroup" aria-label={`Kies een ${sectie.naam.toLowerCase()}`} className={`mt-5 grid gap-3 ${lijst.length >= 2 ? "md:grid-cols-2" : ""} ${lijst.length >= 3 ? "xl:grid-cols-3" : ""}`}>
          {lijst.map((r) => {
            const aan = keuze.includes(r.id);
            const zin = bedragZin(r, medewerkers);
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={aan}
                disabled={!kanKiezen}
                onClick={() => klik(r.id)}
                className={`group relative flex flex-col rounded-[16px] border-2 p-5 text-left transition-[border-color,background-color,box-shadow] disabled:cursor-default ${
                  aan ? "border-[#322E83] bg-[#F7F6FD] shadow-[0_6px_20px_-12px_rgba(50,46,131,0.45)]" : "border-[#E6E5EF] bg-white hover:border-[#BDBBD3]"
                } ${aan ? "" : "print:hidden"}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    {r.badge && (
                      <span className="mb-2 inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.8px]" style={{ background: "#FCE9F0", color: "#C40F60" }}>
                        {r.badge}
                      </span>
                    )}
                    <span className="block text-[18px] font-bold leading-snug" style={{ color: NAVY }}>{r.naam}</span>
                  </span>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${aan ? "border-[#322E83] bg-[#322E83] text-white" : "border-[#BDBBD3] text-transparent"}`}
                    aria-hidden="true"
                  >
                    <Vink size={12} />
                  </span>
                </span>
                <span className="mt-3 block text-[22px] font-bold tabular-nums tracking-[-0.01em]" style={{ color: NAVY }}>
                  {r.prijs === null ? prijsLabel(r) : euro(r.prijs)}
                  {r.prijs !== null && eenheidVan(r.eenheid).achter && (
                    <span className="ml-1.5 text-[14px] font-medium tracking-normal" style={{ color: MUTE }}>{eenheidVan(r.eenheid).achter}</span>
                  )}
                </span>
                {zin && r.eenheid !== "eenmalig" && <span className="mt-1 block text-[14px] font-semibold" style={{ color: PINK }}>{zin}</span>}
                {r.omschrijving && <span className="mt-3 block whitespace-pre-line text-[14.5px] leading-[1.6]" style={{ color: BODY }}>{r.omschrijving}</span>}
                {r.punten && (
                  <span className="mt-3 flex flex-col gap-1.5">
                    {r.punten.map((p) => (
                      <span key={p} className="flex items-start gap-2 text-[14.5px] leading-[1.5]" style={{ color: BODY }}>
                        <span className="mt-[3px] shrink-0" style={{ color: "#00A098" }}><Vink /></span>
                        {p}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {vast.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col divide-y divide-[#EEEDF5] p-0">
          {vast.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "#00A098" }} aria-hidden="true">
                <Vink size={12} />
              </span>
              <Regeltekst r={r} medewerkers={medewerkers} />
              {r.prijs === 0 && <span className="shrink-0 text-right text-[13px] font-semibold uppercase tracking-[0.6px]" style={{ color: "#00A098" }}>Inbegrepen</span>}
            </li>
          ))}
        </ul>
      )}

      {opties.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
          {opties.map((r) => {
            const aan = keuze.includes(r.id);
            return (
              <li key={r.id} className={aan ? "" : "print:hidden"}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aan}
                  disabled={!kanKiezen}
                  onClick={() => klik(r.id)}
                  className={`flex w-full items-start gap-4 rounded-[14px] border-2 p-4 text-left transition-colors disabled:cursor-default ${aan ? "border-[#322E83] bg-[#F7F6FD]" : "border-[#E6E5EF] hover:border-[#BDBBD3]"}`}
                >
                  <span className={`relative mt-0.5 inline-flex h-[26px] w-[44px] shrink-0 rounded-full transition-colors print:hidden ${aan ? "bg-[#322E83]" : "bg-[#D6D4E6]"}`} aria-hidden="true">
                    <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-[left] ${aan ? "left-[21px]" : "left-[3px]"}`} />
                  </span>
                  <Regeltekst r={r} medewerkers={medewerkers} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tarieven.length > 0 && (
        <div className={alleenTarieven ? "mt-4" : "mt-6"}>
          {!alleenTarieven && <p className="m-0 mb-1 text-[13px] font-bold uppercase tracking-[1px]" style={{ color: MUTE }}>Tarieven bij gebruik</p>}
          <dl className="m-0 grid gap-x-10 sm:grid-cols-2">
            {tarieven.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between gap-4 border-b border-[#EEEDF5] py-2.5">
                <dt className="min-w-0 text-[15px]" style={{ color: BODY }}>
                  {r.naam}
                  {r.omschrijving && <span className="block text-[13px]" style={{ color: MUTE }}>{r.omschrijving}</span>}
                </dt>
                <dd className="m-0 shrink-0 text-right text-[15px] font-semibold tabular-nums" style={{ color: NAVY }}>{prijsLabel(r)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

function Regeltekst({ r, medewerkers }: { r: Regel; medewerkers: number | null }) {
  const zin = bedragZin(r, medewerkers);
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[16px] font-semibold" style={{ color: NAVY }}>{r.naam}</span>
        <span className="text-[15px] font-semibold tabular-nums" style={{ color: NAVY }}>{prijsLabel(r)}</span>
      </span>
      {(r.omschrijving || (zin && r.eenheid === "medewerker_jaar")) && (
        <span className="mt-1 block whitespace-pre-line text-[14.5px] leading-[1.55]" style={{ color: BODY }}>
          {[r.omschrijving, zin && r.eenheid === "medewerker_jaar" ? zin : ""].filter(Boolean).join(" · ")}
        </span>
      )}
    </span>
  );
}

function Samenvatting({ totalen, actie }: { totalen: ReturnType<typeof berekenTotalen>; actie: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-white p-6 shadow-[0_18px_50px_-30px_rgba(28,26,78,0.35)] print:shadow-none">
      <h2 className="font-heading m-0 text-[19px] font-bold" style={{ color: NAVY }}>Jouw keuze</h2>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
        {totalen.regels.map(({ regel, bedrag, periode }) => (
          <li key={regel.id} className="flex items-baseline justify-between gap-4 text-[14.5px]">
            <span className="min-w-0" style={{ color: BODY }}>{regel.naam}</span>
            <span className="shrink-0 tabular-nums font-semibold" style={{ color: NAVY }}>
              {bedrag === null ? "Op aanvraag" : bedrag === 0 ? "Inbegrepen" : euro(bedrag)}
              {bedrag ? <span className="ml-1 text-[12.5px] font-normal" style={{ color: MUTE }}>{periode === "jaar" ? "/jaar" : "eenmalig"}</span> : null}
            </span>
          </li>
        ))}
        {totalen.regels.length === 0 && <li className="text-[14.5px]" style={{ color: MUTE }}>Nog niets gekozen.</li>}
      </ul>
      <div className="mt-5 border-t border-[#EEEDF5] pt-4">
        {(totalen.perJaar > 0 || totalen.eenmalig === 0) && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[15px] font-semibold" style={{ color: NAVY }}>Per jaar</span>
            <span className="text-[30px] font-bold tabular-nums tracking-[-0.02em]" style={{ color: NAVY }} aria-live="polite">{euro(totalen.perJaar)}</span>
          </div>
        )}
        {totalen.perJaar > 0 && (
          <p className="m-0 text-right text-[13.5px]" style={{ color: MUTE }}>
            ongeveer {euro(Math.round(totalen.perJaar / 12))} per maand
          </p>
        )}
        {totalen.eenmalig > 0 && (
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <span className="text-[15px] font-semibold" style={{ color: NAVY }}>Eenmalig</span>
            <span className="text-[20px] font-bold tabular-nums" style={{ color: NAVY }} aria-live="polite">{euro(totalen.eenmalig)}</span>
          </div>
        )}
        <p className="m-0 mt-3 text-[13px]" style={{ color: MUTE }}>Exclusief btw. Tarieven bij gebruik komen erbij als je ze afneemt.</p>
      </div>
      {actie}
    </div>
  );
}

function Vervolg() {
  const stappen = [
    ["Je ondertekent online", "Kies wat je wilt, zet je handtekening en je krijgt direct een bevestiging per mail."],
    ["We plannen de start", "We nemen contact met je op om de aansluiting en de eerste afspraken door te nemen."],
    ["Je vaste aanspreekpunt", "Je krijgt een vaste casemanager die je organisatie en je mensen leert kennen."],
  ];
  return (
    <section className="rounded-[22px] p-5 md:p-7 print:hidden" style={{ background: "#ECEBF5" }}>
      <h2 className="font-heading m-0 text-[22px] font-bold" style={{ color: NAVY }}>Zo gaat het verder</h2>
      <ol className="m-0 mt-5 grid list-none gap-5 p-0 md:grid-cols-3">
        {stappen.map(([kop, tekst], i) => (
          <li key={kop} className="flex gap-3 md:flex-col">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-bold" style={{ color: NAVY }}>{i + 1}</span>
            <span>
              <span className="block text-[16px] font-semibold" style={{ color: NAVY }}>{kop}</span>
              <span className="mt-1 block text-[14.5px] leading-[1.55]" style={{ color: BODY }}>{tekst}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- vensters ---------- */

function Venster({ titel, sluit, children, breed = false }: { titel: string; sluit: () => void; children: React.ReactNode; breed?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        sluit();
      }}
      onClick={(e) => e.target === e.currentTarget && sluit()}
      aria-label={titel}
      className={`m-auto w-full max-w-none overflow-y-auto bg-white p-0 backdrop:bg-[#1c1a4e]/55 backdrop:backdrop-blur-[2px] max-sm:h-full max-sm:max-h-none sm:max-h-[92vh] sm:rounded-[22px] ${breed ? "sm:max-w-[640px]" : "sm:max-w-[520px]"}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#EEEDF5] bg-white px-6 py-4">
        <h2 className="font-heading m-0 text-[20px] font-bold" style={{ color: NAVY }}>{titel}</h2>
        <button type="button" onClick={sluit} aria-label="Sluiten" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F6F5FB]" style={{ color: NAVY }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="px-6 pb-6 pt-5">{children}</div>
    </dialog>
  );
}

function TekenVenster({
  offerte, token, keuze, totalen, kanTekenen, modus, voorwaarden, sluit,
}: {
  offerte: OffertePubliek;
  token?: string;
  keuze: string[];
  totalen: ReturnType<typeof berekenTotalen>;
  kanTekenen: boolean;
  modus: Modus;
  voorwaarden: string;
  sluit: () => void;
}) {
  const router = useRouter();
  const [naam, setNaam] = useState(offerte.contactpersoon || "");
  const [functie, setFunctie] = useState("");
  const [email, setEmail] = useState(offerte.email || "");
  const [png, setPng] = useState<string | null>(null);
  const [akkoord, setAkkoord] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();

  function onderteken(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!kanTekenen || !token) {
      setFout(modus === "klant" ? "Deze offerte kan niet meer worden ondertekend." : "In het voorbeeld en als collega kan er niet worden getekend.");
      return;
    }
    if (!isNaam(naam)) return setFout("Vul je volledige naam in.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setFout("Vul een geldig e-mailadres in, dan sturen we je de bevestiging.");
    if (!png) return setFout("Zet je handtekening in het vak, of kies Typen.");
    if (!akkoord) return setFout("Vink aan dat je akkoord gaat en bevoegd bent om te tekenen.");
    start(async () => {
      const uit = await ondertekenOfferte(token, { keuze, naam: naam.trim(), functie: functie.trim(), email: email.trim(), handtekening: png, akkoord });
      if (!uit.ok) {
        setFout(uit.fout || "Ondertekenen lukte niet.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Venster titel="Offerte ondertekenen" sluit={sluit} breed>
      <form onSubmit={onderteken} className="flex flex-col gap-5" noValidate>
        <div className="rounded-[16px] p-4 text-[14.5px]" style={{ background: "#F6F5FB", color: BODY }}>
          <p className="m-0">
            Je tekent voor <strong style={{ color: NAVY }}>{offerte.bedrijf}</strong>:{" "}
            {totalen.regels.map((r) => r.regel.naam).join(", ") || "de offerte"}.
          </p>
          <p className="m-0 mt-2 font-semibold" style={{ color: NAVY }}>
            {totalen.perJaar > 0 && <>{euro(totalen.perJaar)} per jaar</>}
            {totalen.perJaar > 0 && totalen.eenmalig > 0 && " + "}
            {totalen.eenmalig > 0 && <>{euro(totalen.eenmalig)} eenmalig</>}
            <span className="font-normal" style={{ color: MUTE }}> · exclusief btw</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Volledige naam *</span>
            <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Functie</span>
            <input className={veld} value={functie} onChange={(e) => setFunctie(e.target.value)} autoComplete="organization-title" placeholder="Bijvoorbeeld directeur" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold" style={{ color: NAVY }}>E-mail voor de bevestiging *</span>
            <input className={veld} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
        </div>

        <div>
          <span className="mb-2 block text-[14px] font-semibold" style={{ color: NAVY }}>Handtekening *</span>
          <Handtekening
            naam={naam}
            onChange={(p) => {
              setPng(p);
              if (p) setFout(null);
            }}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[14.5px] leading-[1.55]" style={{ color: BODY }}>
          <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#322E83]" />
          <span>
            Ik ga akkoord met deze offerte en de{" "}
            <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
            van React2u, en ik ben bevoegd om namens {offerte.bedrijf} te tekenen.
          </span>
        </label>

        {fout && (
          <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEA] px-4 py-3 text-[14.5px] text-[#8A1C12]">{fout}</p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={sluit} className="h-[50px] rounded-[12px] px-4 text-[15px] font-semibold hover:bg-[#F6F5FB]" style={{ color: NAVY }}>
            Terug naar de offerte
          </button>
          <button type="submit" disabled={bezig} className="flex h-[54px] items-center justify-center gap-2 rounded-[12px] px-6 text-[16px] font-semibold text-white disabled:opacity-60" style={{ background: PINK }}>
            {bezig ? "Bezig met ondertekenen…" : "Onderteken offerte"}
          </button>
        </div>
        <p className="m-0 text-[12.5px] leading-[1.5]" style={{ color: MUTE }}>
          We leggen je naam, e-mailadres, het tijdstip, je IP-adres en de getekende versie vast als bewijs van de ondertekening.
        </p>
      </form>
    </Venster>
  );
}

function AfwijsVenster({ offerte, token, sluit }: { offerte: OffertePubliek; token: string; sluit: () => void }) {
  const router = useRouter();
  const [reden, setReden] = useState("");
  const [naam, setNaam] = useState(offerte.contactpersoon || "");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  return (
    <Venster titel="Niet akkoord" sluit={sluit}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const uit = await wijsOfferteAf(token, { reden, naam });
            if (!uit.ok) return setFout(uit.fout || "Versturen lukte niet.");
            router.refresh();
          });
        }}
      >
        <p className="m-0 text-[15px] leading-[1.6]" style={{ color: BODY }}>
          Jammer! Wil je kort laten weten waarom? Dan kijkt {offerte.afzender_naam || "onze adviseur"} of we iets kunnen aanpassen. Bellen mag natuurlijk ook.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Wat kunnen we beter doen? (mag leeg)</span>
          <textarea className={`${veld} h-auto min-h-[120px] py-3`} value={reden} onChange={(e) => setReden(e.target.value)} maxLength={2000} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Je naam</span>
          <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" />
        </label>
        {fout && <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEA] px-4 py-3 text-[14.5px] text-[#8A1C12]">{fout}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={sluit} className="h-[48px] rounded-[12px] px-4 text-[15px] font-semibold hover:bg-[#F6F5FB]" style={{ color: NAVY }}>
            Annuleren
          </button>
          <button type="submit" disabled={bezig} className="h-[48px] rounded-[12px] px-5 text-[15px] font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>
            {bezig ? "Versturen…" : "Laat het weten"}
          </button>
        </div>
      </form>
    </Venster>
  );
}

/* ---------- na ondertekening ---------- */

function Getekend({ offerte, voorwaarden, modus }: { offerte: OffertePubliek; voorwaarden: string; modus: Modus }) {
  const inhoud = offerte.getekend_inhoud!;
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  const tarieven = regels.filter((r) => r.soort === "tarief");
  const voornaam = inhoud.getekend_naam.split(" ")[0];
  return (
    <div className="min-h-screen" style={{ background: ZAND }}>
      <Kopbalk offerte={offerte} />
      <Melding modus={modus} />
      <section className="mx-auto max-w-[920px] px-5 pb-6 pt-10 md:px-8 md:pt-14">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white print:hidden" style={{ background: "#00A098" }}>
            <Vink size={26} />
          </span>
          <div>
            <span className="text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "#00A098" }}>Ondertekend</span>
            <h1 className="font-heading m-0 mt-1 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[40px]" style={{ color: NAVY }}>
              <span className="print:hidden">Bedankt, {voornaam}!</span>
              <span className="hidden print:inline">{inhoud.titel}</span>
            </h1>
          </div>
        </div>
        <p className="m-0 mt-5 max-w-[680px] text-[16.5px] leading-[1.7]" style={{ color: BODY }}>
          Offerte {inhoud.nummer} voor {inhoud.bedrijf} is ondertekend op {momentLang(inhoud.getekend_at)}. Je krijgt een bevestiging op{" "}
          {inhoud.getekend_email}, en {offerte.afzender_naam || "we"} {offerte.afzender_naam ? "neemt" : "nemen"} contact met je op om de start te plannen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button type="button" onClick={() => window.print()} className="inline-flex h-[48px] items-center gap-2 rounded-[12px] px-5 text-[15px] font-semibold text-white" style={{ background: NAVY }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>
            Bewaar als pdf
          </button>
          {offerte.afzender_telefoon && (
            <a href={telLink(offerte.afzender_telefoon)!} className="inline-flex h-[48px] items-center rounded-[12px] border border-[#DCDBEA] bg-white px-5 text-[15px] font-semibold" style={{ color: NAVY }}>
              Bel {offerte.afzender_telefoon}
            </a>
          )}
        </div>
      </section>

      <div className="mx-auto flex max-w-[920px] flex-col gap-5 px-5 md:px-8">
        <section className="rounded-[22px] bg-white p-6 md:p-8 print:break-inside-avoid">
          <h2 className="font-heading m-0 text-[20px] font-bold" style={{ color: NAVY }}>Wat je hebt afgenomen</h2>
          <table className="mt-4 w-full border-collapse text-[15px]">
            <tbody>
              {t.regels.map(({ regel, bedrag, periode }) => (
                <tr key={regel.id} className="border-b border-[#EEEDF5]">
                  <td className="py-3 pr-4 align-top" style={{ color: BODY }}>
                    <span className="font-semibold" style={{ color: NAVY }}>{regel.naam}</span>
                    <span className="block text-[13.5px]" style={{ color: MUTE }}>{prijsLabel(regel)}{regel.eenheid === "medewerker_jaar" && inhoud.medewerkers ? ` × ${aantalVoor(regel, inhoud.medewerkers)}` : ""}</span>
                  </td>
                  <td className="whitespace-nowrap py-3 text-right align-top font-semibold tabular-nums" style={{ color: NAVY }}>
                    {bedrag === null ? "Op aanvraag" : bedrag === 0 ? "Inbegrepen" : `${euro(bedrag)}${periode === "jaar" ? " per jaar" : " eenmalig"}`}
                  </td>
                </tr>
              ))}
              {t.perJaar > 0 && (
                <tr>
                  <td className="pt-4 text-[16px] font-bold" style={{ color: NAVY }}>Totaal per jaar</td>
                  <td className="pt-4 text-right text-[20px] font-bold tabular-nums" style={{ color: NAVY }}>{euro(t.perJaar)}</td>
                </tr>
              )}
              {t.eenmalig > 0 && (
                <tr>
                  <td className="pt-2 text-[16px] font-bold" style={{ color: NAVY }}>Eenmalig</td>
                  <td className="pt-2 text-right text-[18px] font-bold tabular-nums" style={{ color: NAVY }}>{euro(t.eenmalig)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="m-0 mt-3 text-[13px]" style={{ color: MUTE }}>Alle bedragen exclusief btw.</p>
          {tarieven.length > 0 && (
            <>
              <h3 className="m-0 mt-7 text-[13px] font-bold uppercase tracking-[1px]" style={{ color: MUTE }}>Tarieven bij gebruik</h3>
              <dl className="m-0 mt-1 grid gap-x-10 sm:grid-cols-2">
                {tarieven.map((r) => (
                  <div key={r.id} className="flex items-baseline justify-between gap-4 border-b border-[#EEEDF5] py-2">
                    <dt className="text-[14.5px]" style={{ color: BODY }}>{r.naam}</dt>
                    <dd className="m-0 text-[14.5px] font-semibold tabular-nums" style={{ color: NAVY }}>{prijsLabel(r)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>

        <section className="rounded-[22px] bg-white p-6 md:p-8 print:break-inside-avoid">
          <h2 className="font-heading m-0 text-[20px] font-bold" style={{ color: NAVY }}>Ondertekening</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:items-end">
            {offerte.handtekening && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={offerte.handtekening} alt={`Handtekening van ${inhoud.getekend_naam}`} className="w-full max-w-[420px] border-b border-[#D8D6E6]" />
            )}
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14.5px]">
              <dt style={{ color: MUTE }}>Naam</dt><dd className="m-0 font-semibold" style={{ color: NAVY }}>{inhoud.getekend_naam}</dd>
              {inhoud.getekend_functie && (<><dt style={{ color: MUTE }}>Functie</dt><dd className="m-0" style={{ color: NAVY }}>{inhoud.getekend_functie}</dd></>)}
              <dt style={{ color: MUTE }}>Namens</dt><dd className="m-0" style={{ color: NAVY }}>{inhoud.bedrijf}</dd>
              <dt style={{ color: MUTE }}>Datum</dt><dd className="m-0" style={{ color: NAVY }}>{momentLang(inhoud.getekend_at)}</dd>
            </dl>
          </div>
          {offerte.getekend_hash && (
            <p className="m-0 mt-5 break-all text-[12px]" style={{ color: MUTE }}>
              Kenmerk van de ondertekende versie: <span className="font-mono">{offerte.getekend_hash}</span>
            </p>
          )}
        </section>
      </div>
      <Voet offerte={offerte} voorwaarden={voorwaarden} />
    </div>
  );
}
