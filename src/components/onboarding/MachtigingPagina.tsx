"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/site/Logo";
import Handtekening from "@/components/offerte/Handtekening";
import { tekenMachtiging, type MachtigingState } from "@/app/(offerte)/machtiging/actions";
import type { ContactInfo } from "@/lib/content";
import { BREED, kop, LAV, LINE, NAVY, PINK } from "@/components/blocks/Gedeeld";
import { MACHTIGING_TEKST, MACHTIGING_WERKNEMER, ONBOARDING_EMAIL, REACT2U, type MachtigingPubliek } from "@/lib/onboarding";
import { datumLang, momentLang } from "@/lib/offertes";
import { DOWNLOAD, GROEN, Icoon, IVOOR, knop, MUTE, outfit, PAGINA_CSS, TELEFOON, telLink, voornaam } from "./OnboardingDelen";

/*
 * De pagina van de werknemer (/machtiging/<token>, 0038): hij leest waar hij
 * toestemming voor geeft, vult zijn gegevens in, zet zijn handtekening en
 * tekent. Gemaakt voor de telefoon, want daar leest een zieke medewerker zijn
 * mail. Na het tekenen: dank je wel, wat er nu gebeurt, en de pdf.
 */

const BODY = "#55536F";
const veld =
  "h-[52px] w-full rounded-[14px] border bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";
const rand = (fout?: string) => (fout ? "border-[#D92D20] bg-[#FFF8F7]" : "border-[#DCDAE8]");

function Vink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Rij({ label, waarde }: { label: string; waarde?: string | null }) {
  if (!waarde) return null;
  return (
    <div className="flex flex-col gap-0.5 border-t py-2.5 first:border-t-0 first:pt-0 sm:flex-row sm:gap-4" style={{ borderColor: LINE }}>
      <dt className="shrink-0 text-[13.5px] font-semibold sm:w-[150px]" style={{ color: MUTE }}>{label}</dt>
      <dd className="m-0 text-[15.5px]" style={{ color: "#1C1A4E" }}>{waarde}</dd>
    </div>
  );
}

export default function MachtigingPagina({ m, token, contact, collega = false }: { m: MachtigingPubliek; token: string; contact: ContactInfo; collega?: boolean }) {
  const [waarden, setWaarden] = useState<Record<string, string>>({ naam: m.naam });
  const [png, setPng] = useState<string | null>(null);
  const [akkoord, setAkkoord] = useState(false);
  const [state, setState] = useState<MachtigingState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.velden || {};
  const getekend = m.status === "getekend";
  const a = m.arbodienst || {};
  const tel = telLink(m.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = m.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = m.afzender_email || ONBOARDING_EMAIL;
  const naam = voornaam(getekend ? m.getekend_naam || m.naam : waarden.naam || m.naam) || m.naam;
  const verplicht = MACHTIGING_WERKNEMER.flatMap((g) => g.velden).filter((v) => v.verplicht);
  const verplichtKlaar = verplicht.filter((v) => (waarden[v.naam] || "").trim()).length;

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
        <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
          <div className="flex min-w-0 items-center gap-4">
            <Logo className="h-9 w-auto shrink-0 md:h-11" />
            <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
            <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Machtiging · {m.bedrijf}</span>
          </div>
          <a href={tel} className="hv-btn hv-btn-roze inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[14.5px] font-bold">
            <Icoon d={TELEFOON} size={15} /> Bel React2u
          </a>
        </div>
      </header>
      {collega && (
        <p className="m-0 border-b px-5 py-2 text-center text-[13.5px] font-semibold" style={{ background: "#FEF3E2", color: "#7A4A06", borderColor: "#F7D8A8" }}>
          Je bekijkt de pagina van de werknemer als collega van React2u.
        </p>
      )}

      <main>
        <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto max-w-[1360px] overflow-clip rounded-[28px] px-6 py-10 md:rounded-[36px] md:px-14 md:py-16" style={{ background: getekend ? "#E3F6ED" : LAV }}>
            <span aria-hidden className="absolute right-[-140px] top-[-180px] h-[420px] w-[420px] rounded-full" style={{ background: getekend ? GROEN : NAVY, opacity: 0.08 }} />
            <div className="relative flex max-w-[760px] flex-col gap-5">
              <p className="m-0 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: getekend ? GROEN : PINK }}>
                {getekend ? "Getekend" : "Machtiging overdracht verzuimdossier"}
              </p>
              <h1 className={`${kop} m-0 text-[32px] leading-[1.08] tracking-[-0.9px] sm:text-[42px]`} style={{ color: NAVY }}>
                {getekend ? <>Dank je wel, {naam}.</> : <>Hallo {naam}, even tekenen op je telefoon.</>}
              </h1>
              <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>
                {getekend ? (
                  <>Je hebt op {momentLang(m.getekend_at)} de machtiging getekend. Een kopie is gemaild naar {m.email}.</>
                ) : (
                  <>
                    {m.bedrijf} werkt voortaan samen met arbodienst React2u. Omdat je een lopend verzuimdossier hebt{a.arbodienst ? ` bij ${a.arbodienst}` : " bij je vorige arbodienst"}, mag dat dossier alleen met jouw toestemming naar onze bedrijfsarts. Zo loopt je begeleiding door, zonder dubbele onderzoeken.
                  </>
                )}
              </p>
              {getekend ? (
                <div className="flex flex-wrap gap-3">
                  <a href={`/machtiging/${token}/pdf?download=1`} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download je getekende machtiging</a>
                </div>
              ) : (
                <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[14.5px] font-semibold" style={{ color: NAVY }}>
                  <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: NAVY }}><Vink /></span> Twee minuten</li>
                  <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: NAVY }}><Vink /></span> Alleen jouw toestemming telt</li>
                  <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: NAVY }}><Vink /></span> Je krijgt een kopie per mail</li>
                </ul>
              )}
            </div>
          </div>
        </section>

        {getekend ? (
          <section className={`${BREED} py-12 md:py-16`} aria-label="Zo gaat het verder">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { kop: "Wij sturen de machtiging door", tekst: `Namens je werkgever, met de opdracht tot overdracht naar ${a.arbodienst || "je vorige arbodienst"}. Je hoeft zelf niets te doen.` },
                { kop: "Je dossier gaat naar onze bedrijfsarts", tekst: `${REACT2U.bedrijfsarts.naam} neemt je begeleiding over. Je werkgever ziet geen medische gegevens; dat is wettelijk zo geregeld.` },
                { kop: "React2u neemt contact met je op", tekst: "Zodra je dossier binnen is, bellen we je om kennis te maken en de vervolgstappen door te nemen." },
              ].map((x, i) => (
                <div key={x.kop} className="flex flex-col gap-3 rounded-[22px] p-6" style={{ background: "#F6F5FB" }}>
                  <span className={`${kop} grid h-11 w-11 place-items-center rounded-full bg-white text-[18px]`} style={{ color: NAVY }}>{i + 1}</span>
                  <p className={`${kop} m-0 text-[19px] leading-[1.3]`} style={{ color: NAVY }}>{x.kop}</p>
                  <p className="m-0 text-[15px] leading-[1.65]" style={{ color: BODY }}>{x.tekst}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className={`${BREED} py-12 md:py-16`} aria-labelledby="kop-waarvoor">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
                <div className="flex flex-col gap-4">
                  <p className="m-0 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: PINK }}>Waar je toestemming voor geeft</p>
                  <h2 id="kop-waarvoor" className={`${kop} m-0 text-[26px] leading-[1.15] tracking-[-0.5px] md:text-[32px]`} style={{ color: NAVY }}>Je verzuimdossier gaat van je vorige arbodienst naar React2u.</h2>
                  <p className="m-0 text-[16px] leading-[1.7]" style={{ color: BODY }}>{MACHTIGING_TEKST.alinea}</p>
                  <p className="m-0 text-[15px] leading-[1.7]" style={{ color: MUTE }}>{MACHTIGING_TEKST.daarna} {MACHTIGING_TEKST.facturen}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <dl className="m-0 rounded-[22px] border p-5" style={{ borderColor: LINE }}>
                    <p className="m-0 mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: "#CA152A" }}><span className="h-2 w-2 rounded-full" style={{ background: "#CA152A" }} /> Van</p>
                    <Rij label="Arbodienst" waarde={a.arbodienst || "Je vorige arbodienst"} />
                    <Rij label="Vestigingsplaats" waarde={a.plaats} />
                    <Rij label="Bedrijfsarts" waarde={a.bedrijfsarts} />
                    <Rij label="BIG-nummer" waarde={a.big} />
                  </dl>
                  <dl className="m-0 rounded-[22px] p-5" style={{ background: "#F6F5FB" }}>
                    <p className="m-0 mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: NAVY }}><span className="h-2 w-2 rounded-full" style={{ background: NAVY }} /> Naar</p>
                    <Rij label="Arbodienst" waarde="React2u" />
                    <Rij label="Bedrijfsarts" waarde={REACT2U.bedrijfsarts.naam} />
                    <Rij label="BIG-nummer" waarde={REACT2U.bedrijfsarts.big} />
                    <Rij label="Adres" waarde={REACT2U.adres} />
                    <Rij label="E-mail" waarde={REACT2U.medisch} />
                  </dl>
                </div>
              </div>
            </section>

            <section className="px-[6px] pb-12 md:px-6 md:pb-16 xl:px-10" aria-labelledby="kop-tekenen">
              <form
                noValidate
                className="mx-auto flex max-w-[1360px] flex-col gap-8 rounded-[28px] px-6 py-8 md:rounded-[36px] md:px-14 md:py-12"
                style={{ background: "#F6F5FB" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (collega) return setState({ ok: false, fout: "Als collega van React2u kun je niet namens de werknemer tekenen." });
                  if (!png) return setState({ ok: false, fout: "Zet je handtekening in het vak, of kies Typen." });
                  if (!akkoord) return setState({ ok: false, fout: "Vink aan dat je toestemming geeft voor de overdracht." });
                  start(async () => {
                    const r = await tekenMachtiging(token, { gegevens: waarden, handtekening: png, akkoord });
                    setState(r);
                    if (r.ok) {
                      window.scrollTo({ top: 0 });
                      router.refresh();
                    }
                  });
                }}
              >
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: PINK }}>Stap 1 van 2</p>
                  <h2 id="kop-tekenen" className={`${kop} m-0 text-[26px] leading-[1.15] tracking-[-0.5px] md:text-[32px]`} style={{ color: NAVY }}>Je gegevens</h2>
                  <p className="m-0 text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{MACHTIGING_WERKNEMER[0].tekst}</p>
                  <p className="m-0 mt-1 flex items-center gap-3 text-[13.5px] font-semibold" style={{ color: MUTE }} aria-live="polite">
                    <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white">
                      <span className="block h-full rounded-full transition-[width]" style={{ width: `${Math.round((verplichtKlaar / verplicht.length) * 100)}%`, background: NAVY }} />
                    </span>
                    Verplichte velden: {verplichtKlaar} van {verplicht.length}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {MACHTIGING_WERKNEMER[0].velden.map((v) => {
                    const id = `mw-${v.naam}`;
                    const fout = fouten[v.naam];
                    return (
                      <label key={v.naam} htmlFor={id} className={`flex flex-col gap-1.5 ${v.half ? "" : "sm:col-span-2"}`}>
                        <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{v.label}{v.verplicht && <span className="text-[#E61674]"> *</span>}</span>
                        <input
                          id={id}
                          className={`${veld} ${rand(fout)}`}
                          type={v.type || "text"}
                          inputMode={v.naam === "bsn" ? "numeric" : undefined}
                          value={waarden[v.naam] || ""}
                          onChange={(e) => setWaarden({ ...waarden, [v.naam]: e.target.value })}
                          maxLength={v.max ?? 200}
                          autoComplete={v.autocomplete}
                          aria-invalid={Boolean(fout)}
                          aria-describedby={fout || v.hint ? `${id}-uitleg` : undefined}
                        />
                        {(fout || v.hint) && <span id={`${id}-uitleg`} className={`text-[13.5px] ${fout ? "font-semibold text-[#B42318]" : "text-[#77758F]"}`}>{fout || v.hint}</span>}
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 border-t pt-8" style={{ borderColor: "#E0DEEE" }}>
                  <p className="m-0 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: PINK }}>Stap 2 van 2</p>
                  <h2 className={`${kop} m-0 text-[26px] leading-[1.15] tracking-[-0.5px] md:text-[32px]`} style={{ color: NAVY }}>Je handtekening</h2>
                  <p className="m-0 text-[15.5px] leading-[1.65]" style={{ color: BODY }}>Teken met je vinger of muis in het vak, of typ je naam.</p>
                </div>
                <div id="handtekening" className="rounded-[22px] bg-white p-4 md:p-6">
                  <Handtekening naam={waarden.naam || m.naam} onChange={setPng} id="mw-handtekening" />
                </div>
                <label className="flex items-start gap-3 text-[15.5px] leading-[1.6]" style={{ color: BODY }}>
                  <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0 accent-[#322E83]" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} />
                  <span>
                    Ik geef toestemming om mijn lopende verzuimdossier over te dragen aan de bedrijfsarts van React2u. Ik begrijp dat React2u vertrouwelijk met mijn medische gegevens omgaat en dat mijn werkgever die niet te zien krijgt.
                  </span>
                </label>
                <div className="flex flex-col gap-3">
                  {state && !state.ok && <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>}
                  <div className="flex flex-wrap items-center gap-4">
                    <button className={knop.roze} disabled={bezig}><Vink /> {bezig ? "Even geduld…" : "Machtiging ondertekenen"}</button>
                    <span className="text-[14px]" style={{ color: MUTE }}>Liever op papier? Vraag je werkgever om de machtiging te printen.</span>
                  </div>
                </div>
              </form>
            </section>
          </>
        )}
      </main>

      <footer className="pb-12 pt-10" style={{ background: IVOOR }}>
        <div className={`${BREED} flex flex-col gap-6`}>
          <div className="grid gap-6 rounded-[22px] bg-white px-6 py-8 sm:grid-cols-3 md:px-10">
            <div className="flex flex-col gap-3">
              <Logo className="h-11 w-auto self-start" />
              <p className="m-0 text-[15px]" style={{ color: BODY }}>Jouw mensen, <span className="font-bold" style={{ color: NAVY }}>onze aandacht.</span></p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Vragen over deze machtiging?</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                {m.afzender_naam || "Team React2u"}<br />
                <a href={tel} className="font-bold hover:underline" style={{ color: NAVY }}>{telTekst}</a><br />
                <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Je privacy</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                Je gegevens gebruiken we alleen voor deze overdracht. Uitgenodigd op {datumLang(m.uitgenodigd_at)} door {m.bedrijf}.
              </p>
            </div>
          </div>
          <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} React2u. KvK {contact.kvk}, btw {contact.btw}.</p>
        </div>
      </footer>
    </div>
  );
}
