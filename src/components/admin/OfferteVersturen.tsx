"use client";
import { useActionState, useState } from "react";
import { verstuurOfferte, type VersturenState } from "@/app/admin/offerteActions";
import KopieerLink from "./KopieerLink";
import { LuSend, LuBellRing, LuCircleCheck, LuMessageCircle } from "react-icons/lu";

/**
 * Versturen of een herinnering sturen, met een persoonlijke boodschap. De
 * standaardtekst is een begin; wat je hier typt komt boven de knop in de mail.
 * Bij een concept werkt de link pas na versturen (of "zelf versturen").
 */
export default function OfferteVersturen({
  id, link, email, aanhef, bedrijf, verstuurd, afzenderNaam, zelfVersturen,
}: {
  id: string;
  link: string;
  email: string | null;
  aanhef: string | null;
  bedrijf: string;
  verstuurd: boolean;
  afzenderNaam: string | null;
  /** Server action om zonder mail open te zetten (alleen bij een concept). */
  zelfVersturen?: () => Promise<void>;
}) {
  const [state, action, bezig] = useActionState<VersturenState, FormData>(verstuurOfferte.bind(null, id), null);
  const [toonLink, setToonLink] = useState(verstuurd);
  const standaard = verstuurd
    ? `Ik wilde even checken of je de offerte voor ${bedrijf} hebt kunnen bekijken. Heb je nog vragen, of wil je iets anders zien? Laat het gerust weten, dan pas ik hem aan.`
    : `Bedankt voor het prettige gesprek. Zoals besproken stuur ik je hierbij onze offerte voor ${bedrijf}.`;
  const [bericht, setBericht] = useState(standaard);
  // Na een geslaagde verzending een nieuwe standaardtekst (van "hierbij de offerte" naar een herinnering).
  const [gezien, setGezien] = useState(state);
  if (state !== gezien) {
    setGezien(state);
    if (state?.ok) setBericht(standaard);
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Hoi${aanhef ? ` ${aanhef.split(" ")[0]}` : ""}, hierbij de offerte van React2u voor ${bedrijf}: ${link}`)}`;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="vs-aan">Aan</label>
            <input id="vs-aan" className="ainput" name="aan" type="email" defaultValue={email || ""} required />
          </div>
          <div>
            <label className="alabel" htmlFor="vs-aanhef">Aanhef</label>
            <input id="vs-aanhef" className="ainput" name="aanhef" defaultValue={aanhef?.split(" ")[0] || ""} placeholder="Voornaam, of bijvoorbeeld heer Jansen" />
          </div>
        </div>
        <div>
          <label className="alabel" htmlFor="vs-bericht">Je bericht</label>
          <textarea id="vs-bericht" className="ainput min-h-[110px]" name="bericht" value={bericht} onChange={(e) => setBericht(e.target.value)} maxLength={5000} />
          <p className="mt-1.5 text-[12.5px] text-black/45">
            Daaronder zet het systeem de knop naar de offerte, de geldigheid en je ondertekening{afzenderNaam ? ` (${afzenderNaam})` : ""}. Antwoorden komt bij jou uit.
          </p>
        </div>
        {state?.fout && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{state.fout}</p>}
        {state?.ok && (
          <p role="status" className="flex items-center gap-2 rounded-[10px] bg-[#e3f6ed] px-3 py-2 text-[13.5px] text-[#0a7a4b]">
            <LuCircleCheck /> {verstuurd ? "Verstuurd. De tijdlijn is bijgewerkt." : "Verstuurd."}
          </p>
        )}
        <button className="abtn" disabled={bezig}>
          {verstuurd ? <LuBellRing /> : <LuSend />} {bezig ? "Versturen…" : verstuurd ? "Herinnering sturen" : "Verstuur offerte"}
        </button>
      </form>

      <div className="border-t border-black/[0.06] pt-4">
        {toonLink ? (
          <div className="space-y-2.5">
            <p className="text-[13px] font-semibold text-black/60">Of stuur de link zelf</p>
            <KopieerLink link={link} label={`Link naar de offerte voor ${bedrijf}`} />
            <div className="flex flex-wrap gap-2">
              {verstuurd ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="abtn-ghost !py-1.5 text-[13px]"><LuMessageCircle /> Via WhatsApp</a>
              ) : (
                zelfVersturen && (
                  <form action={zelfVersturen}>
                    <button className="abtn-ghost !py-1.5 text-[13px]">Zet de link open, ik stuur hem zelf</button>
                  </form>
                )
              )}
            </div>
            {!verstuurd && <p className="text-[12.5px] text-black/45">Een concept is nog dicht: de link werkt pas als je hem openzet of de offerte verstuurt.</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setToonLink(true)} className="text-[13px] font-semibold text-[#312e82] hover:underline">
            Liever zelf versturen (eigen mail of WhatsApp)?
          </button>
        )}
      </div>
    </div>
  );
}
