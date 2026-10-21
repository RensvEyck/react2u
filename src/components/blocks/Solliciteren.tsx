"use client";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { leesBron } from "@/components/site/BronOnthouden";
import { leesCv, submitApplication, type FormState } from "@/app/(site)/actions";
import { NAVY, PINK, BODY, MUTE, SOFT, TEAL, kop, Pijl } from "./Gedeeld";
import { DOCUMENTEN } from "@/lib/documenten";
import TurnstileField from "@/components/site/TurnstileField";
import { useTaal } from "@/components/site/Taal";
import { LuChevronDown } from "react-icons/lu";
import { NAMEN, PROFIEL_COOKIE, actieveAanbieders, leesProfiel, type Aanbieder } from "@/lib/inloggen";
import type { CvSamenvatting } from "@/lib/cvSamenvatting";

const geenAbonnement = () => () => {};
const cookieNu = () => document.cookie;
const geenCookie = () => "";

const LOGO: Record<Aanbieder, React.ReactNode> = {
  linkedin: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>,
  google: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z"/></svg>,
  apple: <svg aria-hidden="true" width="17" height="18" viewBox="0 0 17 20" fill="currentColor"><path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.3c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-4.2ZM11.6 3c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z"/></svg>,
};

const KNOP_STIJL: Record<Aanbieder, React.CSSProperties> = {
  linkedin: { background: "#0A66C2", color: "#ffffff" },
  google: { background: "#ffffff", color: "#1F1F1F", border: "1.5px solid #DADCE0" },
  apple: { background: "#000000", color: "#ffffff" },
};

/** Zet een waarde in een leeg veld van het formulier (cv-uitlezing vult niets over wat de kandidaat al typte). */
function vulAan(form: HTMLFormElement | null, naam: string, waarde?: string) {
  const el = form?.elements.namedItem(naam);
  if (waarde && el instanceof HTMLInputElement && !el.value.trim()) el.value = waarde;
}

/*
 * Snel solliciteren (canvas: Werken bij en Vacature). Kort formulier:
 * functie kiezen, naam, e-mail, telefoon en optioneel een cv. Gaat via
 * submitApplication naar Sollicitaties in de admin. De teksten komen uit het
 * woordenboek; het veld `taal` gaat mee, zodat de foutmeldingen in dezelfde
 * taal terugkomen en het Postvak IN ziet uit welke taal de sollicitatie kwam.
 */

const veld =
  "h-[52px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]";

export type Keuze = {
  id: string;
  title: string;
  /** Vakgebied in de taal van de pagina; leeg als de functie er geen heeft. */
  groep?: string;
  /** De open sollicitatie uit de admin: die staat los onder de vakgebieden. */
  open?: boolean;
};

/** Tot zoveel functies staan ze als knoppen naast elkaar; daarboven wordt het een keuzelijst per vakgebied. */
const KNOPPEN_TOT = 6;

const sleutel = (o: Keuze) => o.id || `open:${o.title}`;

/** De functies per vakgebied, in de volgorde waarin ze binnenkomen; zonder vakgebied achteraan, zonder kopje. */
function groepeer(opties: Keuze[]): [string, Keuze[]][] {
  const groepen: [string, Keuze[]][] = [];
  for (const o of opties) {
    const naam = o.groep || "";
    const laatste = groepen[groepen.length - 1];
    if (laatste && laatste[0] === naam) laatste[1].push(o);
    else groepen.push([naam, [o]]);
  }
  const los = groepen.filter(([naam]) => !naam).flatMap(([, lijst]) => lijst);
  return [...groepen.filter(([naam]) => naam), ...(los.length ? [["", los] as [string, Keuze[]]] : [])];
}

export default function Solliciteren({ keuzes, vast, kopTekst, duur }: {
  keuzes: Keuze[];
  /** Op een vacaturepagina ligt de functie vast. */
  vast?: Keuze;
  kopTekst?: string;
  duur?: string;
}) {
  const { taal, t } = useTaal();
  const f = t.formulier;
  const s = f.sollicitatie;
  // De open sollicitatie staat altijd als laatste: de vacature uit de admin als die er is, anders zonder id.
  const openKeuze: Keuze = keuzes.find((k) => k.open) || { id: "", title: s.open };
  const opties: Keuze[] = vast ? [vast] : [...keuzes.filter((k) => !k.open), openKeuze];
  // Een handvol functies: knoppen, de eerste staat aan. Meer: een keuzelijst, en de kandidaat kiest zelf.
  const lijst = !vast && opties.length > KNOPPEN_TOT;
  const [keuze, setKeuze] = useState<Keuze | null>(lijst ? null : opties[0]);
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null);
  const pad = usePathname();
  // Na inloggen met LinkedIn, Google of Apple staan naam en e-mail tien minuten in een cookie.
  const profiel = leesProfiel(useSyncExternalStore(geenAbonnement, cookieNu, geenCookie));
  const aanbieders = actieveAanbieders();
  const [cvStatus, setCvStatus] = useState<"" | "bezig" | "klaar" | "teGroot">("");
  const [samenvatting, setSamenvatting] = useState<CvSamenvatting | null>(null);
  useEffect(() => {
    if (state?.ok) document.cookie = `${PROFIEL_COOKIE}=; Max-Age=0; path=/`;
  }, [state?.ok]);

  async function cvGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.currentTarget.files?.[0];
    const form = e.currentTarget.form;
    setSamenvatting(null);
    // Vercel neemt verzoeken tot 4,5 MB aan; een groter cv laten we niet eens versturen.
    if (bestand && bestand.size > 4 * 1024 * 1024) {
      e.currentTarget.value = "";
      return setCvStatus("teGroot");
    }
    if (!bestand || !/\.(pdf|docx)$/i.test(bestand.name)) return setCvStatus("");
    setCvStatus("bezig");
    const fd = new FormData();
    fd.set("cv", bestand);
    const uit = await leesCv(fd).catch(() => ({ ok: false as const }));
    if (!uit.ok || !("gegevens" in uit) || !uit.gegevens) return setCvStatus("");
    const g = uit.gegevens;
    vulAan(form, "name", g.naam);
    vulAan(form, "email", g.email);
    vulAan(form, "phone", g.telefoon);
    if (g.linkedin && /linkedin\.com\//i.test(g.linkedin)) vulAan(form, "linkedin", g.linkedin);
    setSamenvatting(g);
    setCvStatus("klaar");
  }

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h3 className={`${kop} m-0 text-[26px] leading-[1.2]`} style={{ color: NAVY }}>{s.bedankt}</h3>
        <p className="m-0 text-[17px] leading-[1.65]" style={{ color: BODY }}>{s.bedanktTekst}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" onSubmit={(e) => {
      // De bron (BronOnthouden) pas bij het versturen invullen.
      const bronVeld = e.currentTarget.elements.namedItem("bron");
      if (bronVeld instanceof HTMLInputElement) bronVeld.value = leesBron();
    }}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${kop} m-0 text-[24px]`} style={{ color: NAVY }}>{kopTekst || s.kop}</h3>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold" style={{ background: "#E5F5F4", color: TEAL }}>{duur || s.duur2}</span>
      </div>
      <input type="hidden" name="taal" value={taal} />
      <input type="hidden" name="vacancy_id" value={keuze?.id ?? ""} />
      <input type="hidden" name="vacancy_title" value={keuze?.title ?? ""} />
      <input type="hidden" name="bron" defaultValue="" />
      <input type="hidden" name="via" value={profiel?.via || ""} />
      <input type="hidden" name="foto" value={profiel?.foto || ""} />
      <input type="hidden" name="cv_samenvatting" value={samenvatting ? JSON.stringify(samenvatting) : ""} />
      {profiel ? (
        <p className="m-0 flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14.5px] font-semibold" style={{ background: SOFT, color: NAVY }}>
          {profiel.foto
            ? <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${profiel.foto})` }} />
            : <span className="shrink-0">{LOGO[profiel.via]}</span>}
          {s.inlogIngevuld.replace("{aanbieder}", NAMEN[profiel.via])}
        </p>
      ) : aanbieders.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className={`grid gap-2 ${aanbieders.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {aanbieders.map((a, i) => (
              <a key={a} href={`/api/inloggen/${a}/start?terug=${encodeURIComponent(pad || "/vacatures")}`}
                className={`inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-bold transition-opacity hover:opacity-90 ${i === 0 && aanbieders.length !== 2 ? "sm:col-span-2" : ""}`}
                style={KNOP_STIJL[a]}>
                {LOGO[a]} {s.inlogKnop.replace("{aanbieder}", NAMEN[a])}
              </a>
            ))}
          </div>
          <span className="text-center text-[13px]" style={{ color: MUTE }}>{s.inlogOf}</span>
        </div>
      )}
      {!vast && lijst && (
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{s.ikSolliciteerOp}</span>
          <span className="relative flex items-center">
            <select required value={keuze ? sleutel(keuze) : ""} onChange={(e) => setKeuze(opties.find((o) => sleutel(o) === e.target.value) || null)}
              className={`${veld} cursor-pointer appearance-none truncate pr-12 font-semibold`} style={{ color: keuze ? NAVY : "#9C9AB5" }}>
              <option value="" disabled>{s.kiesFunctie}</option>
              {groepeer(opties).map(([naam, functies]) => naam ? (
                <optgroup key={naam} label={naam}>
                  {functies.map((o) => <option key={sleutel(o)} value={sleutel(o)}>{o.title}</option>)}
                </optgroup>
              ) : functies.map((o) => <option key={sleutel(o)} value={sleutel(o)}>{o.title}</option>))}
            </select>
            <LuChevronDown aria-hidden className="pointer-events-none absolute right-4 text-[18px]" style={{ color: NAVY }} />
          </span>
        </label>
      )}
      {!vast && !lijst && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-[14px] font-semibold" style={{ color: NAVY }}>{s.ikSolliciteerOp}</legend>
          <div className="flex flex-wrap gap-2">
            {opties.map((o) => {
              const aan = keuze !== null && sleutel(o) === sleutel(keuze);
              return (
                <button key={sleutel(o)} type="button" onClick={() => setKeuze(o)} aria-pressed={aan}
                  className="inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-left text-[14.5px] font-semibold leading-[1.3] transition-colors"
                  style={{ borderColor: aan ? PINK : "#D9D8E6", background: aan ? "#FDECF4" : "#ffffff", color: NAVY }}>
                  {o.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.naam}</span>
          <input key={profiel ? "profiel" : "leeg"} defaultValue={profiel?.naam} className={veld} name="name" autoComplete="name" required maxLength={200} placeholder={f.naamPlaceholder} /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.email}</span>
          <input key={profiel ? "profiel" : "leeg"} defaultValue={profiel?.email} className={veld} name="email" type="email" autoComplete="email" required maxLength={200} placeholder={f.emailPlaceholder} /></label>
        <label className="flex flex-col gap-2"><span className="text-[14px] font-semibold" style={{ color: NAVY }}>{f.telefoon}</span>
          <input className={veld} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder={f.telefoonPlaceholder} /></label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{s.linkedin} <span className="font-normal" style={{ color: MUTE }}>{s.linkedinOptioneel}</span></span>
          <input className={veld} name="linkedin" type="url" inputMode="url" autoComplete="url" maxLength={300} placeholder="https://www.linkedin.com/in/..." />
          <span className="text-[13px]" style={{ color: MUTE }}>{s.linkedinHint}</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{s.cv} <span className="font-normal" style={{ color: MUTE }}>{s.cvOptioneel}</span></span>
          <input name="cv" type="file" accept=".pdf,.doc,.docx" onChange={cvGekozen}
            className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#CFCDE2] px-4 py-3.5 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-[#322E83]"
            style={{ background: SOFT, color: BODY }} />
          <span className="text-[13px]" style={{ color: cvStatus === "klaar" ? TEAL : cvStatus === "teGroot" ? PINK : MUTE }} aria-live="polite">
            {cvStatus === "bezig" ? s.cvLezen : cvStatus === "klaar" ? s.cvGelezen : cvStatus === "teGroot" ? f.fouten.cvTeGroot : s.cvHint}
          </span>
        </label>
      </div>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="flex items-start gap-3 text-[14.5px] leading-[1.5]" style={{ color: BODY }}>
        <input type="checkbox" name="retain_longer" className="mt-1 h-4 w-4 shrink-0 accent-[#322E83]" />
        <span>
          {s.bewaren}{" "}
          <span style={{ color: MUTE }}>{s.bewarenUitleg}</span>
        </span>
      </label>
      <TurnstileField resetKey={state?.error} />
      {state?.error && <p role="alert" className="m-0 text-[15px] font-medium" style={{ color: PINK }}>{state.error}</p>}
      <button disabled={pending}
        className="hv-btn hv-btn-roze mt-1 inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full px-7 text-[16px] font-bold disabled:opacity-60">
        {pending ? f.bezig : <>{s.verstuur}<Pijl size={18} /></>}
      </button>
      <span className="text-center text-[13px] leading-[1.5]" style={{ color: MUTE }}>
        {s.privacyVoor}<a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>{s.privacyLink}</a>{s.privacyNa}
      </span>
    </form>
  );
}
