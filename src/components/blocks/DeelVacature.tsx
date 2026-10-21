"use client";
import { useState } from "react";
import { NAVY, BODY, MUTE, LINE, kop } from "./Gedeeld";

/**
 * Een vacature delen via LinkedIn, WhatsApp of een link. Een medewerker vult
 * zijn naam in en krijgt een persoonlijke link met ?ref=naam; een sollicitatie
 * via die link krijgt in de admin de bron "aanbrenger: naam" (BronOnthouden),
 * zodat de aanbrengpremie klopt. Intern: staat alleen in de admin bij een
 * gepubliceerde vacature, niet op de publieke vacaturepagina.
 */
export default function DeelVacature({ url, titel, t }: {
  url: string;
  titel: string;
  t: { kop: string; tekst: string; naam: string; kopieer: string; gekopieerd: string; premie: string };
}) {
  const [naam, setNaam] = useState("");
  const [klaar, setKlaar] = useState(false);
  const metBron = (bron: string) => {
    const u = new URL(url);
    if (naam.trim()) u.searchParams.set("ref", naam.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40));
    else u.searchParams.set("utm_source", bron);
    return u.toString();
  };
  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(metBron("link"));
      setKlaar(true);
      setTimeout(() => setKlaar(false), 2500);
    } catch {
      // Geen klembord: de knoppen hieronder werken nog wel.
    }
  };
  const knop = "inline-flex h-11 items-center justify-center rounded-full border px-5 text-[14.5px] font-bold";
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border p-6 md:p-7" style={{ borderColor: LINE }}>
      <span className={`${kop} text-[22px]`} style={{ color: NAVY }}>{t.kop}</span>
      <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{t.tekst}</p>
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold" style={{ color: NAVY }}>
        {t.naam}
        <input value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={40}
          className="h-11 rounded-[12px] border border-[#DCDBEA] px-4 text-[15px] font-normal outline-none focus:border-[#322E83]" />
      </label>
      <div className="flex flex-wrap gap-2">
        <a className={knop} style={{ color: NAVY, borderColor: "#D9D8E6" }} target="_blank" rel="noopener"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(metBron("linkedin"))}`}>LinkedIn</a>
        <a className={knop} style={{ color: NAVY, borderColor: "#D9D8E6" }} target="_blank" rel="noopener"
          href={`https://wa.me/?text=${encodeURIComponent(`${titel} bij React2u: ${metBron("whatsapp")}`)}`}>WhatsApp</a>
        <button type="button" onClick={kopieer} className={knop} style={{ color: NAVY, borderColor: "#D9D8E6" }}>
          {klaar ? t.gekopieerd : t.kopieer}
        </button>
      </div>
      <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>{t.premie}</p>
    </div>
  );
}
