"use client";
import { useActionState } from "react";
import { submitOfferte, type FormState } from "@/app/(site)/actions";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, BODY, MUTE, LAV, kop, Eyebrow, Kruimels, Pijl } from "./Gedeeld";
import { DOCUMENTEN } from "@/lib/documenten";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Kennismaken (ontwerp "Kennismaken" op het canvas): links in drie stappen
 * wat er gebeurt, rechts het offerteformulier. De aanvraag gaat via
 * submitOfferte naar het Postvak IN en per mail naar sales@react2u.nl.
 * Klanten en citaten staan als losse blokken eronder.
 */

const veld =
  "h-[52px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

const AANTALLEN = [
  { v: "10", l: "1 tot 10" },
  { v: "50", l: "11 tot 50" },
  { v: "100", l: "51 tot 100" },
  { v: "250", l: "101 tot 250" },
  { v: "500", l: "Meer dan 250" },
];

function Label({ children, verplicht }: { children: React.ReactNode; verplicht?: boolean }) {
  return <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{children}{verplicht && " *"}</span>;
}

async function verstuur(prev: FormState, fd: FormData): Promise<FormState> {
  // submitOfferte kent geen functie, bandbreedte of interesse: die gaan mee in de toelichting.
  const aantal = AANTALLEN.find((a) => a.v === String(fd.get("employees") || ""));
  const regels = [
    fd.get("functie") ? `Functie: ${fd.get("functie")}` : "",
    aantal ? `Aantal medewerkers: ${aantal.l}` : "",
    fd.get("pakket") ? `Interesse: ${fd.get("pakket")}` : "",
    String(fd.get("toelichting") || ""),
  ].filter(Boolean);
  fd.set("message", regels.join("\n"));
  if (!fd.get("pakket")) fd.set("pakket", "Kennismaking");
  return submitOfferte(prev, fd);
}

function Formulier({ d }: { d: any }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verstuur, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h2 className={`${kop} m-0 text-[28px] leading-[1.2]`} style={{ color: NAVY }}>Bedankt voor je aanvraag</h2>
        <p className="m-0 text-[17px] leading-[1.65]" style={{ color: BODY }}>We nemen binnen twee werkdagen contact met je op om kennis te maken.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className={`${kop} m-0 text-[26px] leading-[1.2] md:text-[28px]`} style={{ color: NAVY }}>{d.formKop || "Vraag een offerte aan"}</h2>
        <span className="text-[14px]" style={{ color: MUTE }}>Velden met een * zijn verplicht.</span>
      </div>
      <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2"><Label verplicht>Bedrijfsnaam</Label>
          <input className={veld} name="company" autoComplete="organization" required maxLength={200} placeholder="Naam van je organisatie" /></label>
        <label className="flex flex-col gap-2"><Label verplicht>Naam</Label>
          <input className={veld} name="name" autoComplete="name" required maxLength={200} placeholder="Voor- en achternaam" /></label>
        <label className="flex flex-col gap-2"><Label>Functie</Label>
          <input className={veld} name="functie" autoComplete="organization-title" maxLength={120} placeholder="Bijvoorbeeld HR-manager" /></label>
        <label className="flex flex-col gap-2"><Label verplicht>E-mailadres</Label>
          <input className={veld} name="email" type="email" autoComplete="email" required maxLength={200} placeholder="naam@bedrijf.nl" /></label>
        <label className="flex flex-col gap-2"><Label verplicht>Telefoonnummer</Label>
          <input className={veld} name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="06 12 34 56 78" /></label>
        <label className="flex flex-col gap-2"><Label verplicht>Aantal medewerkers</Label>
          <select className={`${veld} appearance-none`} name="employees" required defaultValue="">
            <option value="" disabled>Maak een keuze</option>
            {AANTALLEN.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
          </select></label>
        <label className="flex flex-col gap-2"><Label>Interesse</Label>
          <input className={veld} name="pakket" maxLength={80} placeholder="Bijvoorbeeld verzuimbegeleiding" /></label>
        <label className="flex flex-col gap-2 sm:col-span-2"><Label>Toelichting</Label>
          <textarea className={`${veld} h-[120px] resize-none py-3.5 leading-[1.6]`} name="toelichting" maxLength={3000} placeholder="Waar kunnen we je mee helpen?" /></label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <button disabled={pending}
        className="hv-btn hv-btn-roze inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full px-7 text-[16px] font-bold disabled:opacity-60">
        {pending ? "Versturen…" : <>Verstuur aanvraag<Pijl /></>}
      </button>
      <p className="m-0 text-center text-[13.5px] leading-[1.55]" style={{ color: MUTE }}>
        Je aanvraag gaat naar ons salesteam via sales@react2u.nl. We gebruiken je gegevens alleen om contact met je op te nemen.{" "}
        <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2">Privacy</a>
      </p>
    </form>
  );
}

export function Kennismaken({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const stappen: any[] = d.stappen || [];
  return (
    <section aria-label="Kennismaken" className={`hv ${outfit.variable} px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]`}>
      {/* Tussen 1024 en 1280px minder rand en een kleinere kop: met 72px rand en
          60px brak "kennismaken?" naast het formulier midden in het woord. */}
      <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-5 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:gap-6 lg:p-12 xl:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
        <div className="relative flex flex-col gap-6 lg:col-span-5">
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennismaken" }]} />
          <Eyebrow>{d.eyebrow || "Kennismaken en offerte"}</Eyebrow>
          <H className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[52px] md:tracking-[-1.6px] xl:text-[60px] xl:tracking-[-1.8px]`} style={{ color: NAVY }}>{d.heading || "Zullen we kennismaken?"}</H>
          {d.text && <p className="m-0 text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
          <ol className="m-0 flex list-none flex-col gap-5 p-0 pt-2">
            {stappen.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold" style={{ color: NAVY }}>{i + 1}</span>
                <span className="flex flex-col gap-1 pt-1">
                  <span className="text-[17px] font-bold" style={{ color: NAVY }}>{s.titel}</span>
                  <span className="text-[15.5px] leading-[1.55]" style={{ color: BODY }}>{s.tekst}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="m-0 pt-2 text-[16px]" style={{ color: BODY }}>
            Liever direct bellen?{" "}
            <a href="tel:+31856205800" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>085 620 58 00</a>
          </p>
        </div>
        <div className="relative rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.35)] md:p-10 lg:col-span-6 lg:col-start-7">
          <Formulier d={d} />
        </div>
      </div>
    </section>
  );
}
