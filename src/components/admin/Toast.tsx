"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuCircleCheck, LuCircleAlert } from "react-icons/lu";

// Elke `redirect(...?fout=x)` in de server actions hoort hier een tekst te
// hebben. Ontbreekt er één, dan krijgt de gebruiker "Er ging iets mis" en moet
// hij raden — precies het geval waarin je juist wilt weten wát er scheelt.
const FOUT_TEKST: Record<string, string> = {
  json: "Opslaan mislukt — ongeldige invoer.",
  "titel-of-slug": "Vul een titel en URL-slug in.",
  "slug-bestaat-al": "Dit adres (URL-slug) is al in gebruik — kies een ander.",
  naam: "Vul een naam in.",
  onvolledig: "Vul een e-mailadres in en kies een rol.",
  "geen-sleutel":
    "Uitnodigen staat uit: SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel.",
  uitnodigen:
    "Uitnodigen mislukt. Controleer of /admin/uitnodiging bij de Redirect URLs in Supabase staat.",
  "laatste-beheerder":
    "Geweigerd: er moet minstens één gebruiker overblijven die rollen mag beheren.",
  jezelf: "Je kunt je eigen toegang niet intrekken.",
  "mfa-jezelf": "Je eigen tweestapsverificatie stel je opnieuw in op Account.",
  "mfa-eerst-zelf":
    "Stel eerst zelf tweestapsverificatie in (Account) en log opnieuw in met een code. Pas dan kun je die van een collega herstellen.",
  "mfa-herstellen": "Herstellen mislukt bij Supabase. Probeer het opnieuw; blijft het misgaan, kijk dan in de Vercel-logs.",
  systeemrol: "De vaste rol kan niet verwijderd worden.",
  "rol-in-gebruik": "Deze rol is nog aan iemand gekoppeld — verplaats die eerst.",
  "rol-bestaat-al": "Er bestaat al een rol met deze naam.",
  "geen-rechten": "Je hebt geen toegang tot dat onderdeel.",
  "cv-verwijderen": "Het cv kon niet verwijderd worden, dus de sollicitatie staat er nog. Mogelijk ontbreekt het verwijderrecht op de opslag (migratie 0009).",
  opslaan: "Opslaan mislukt.",
  // Doorverwijzingen
  "bron-leeg": "Vul het oude adres in.",
  "bron-home": "De homepage (en de hele site met /*) kun je niet doorsturen.",
  "bron-gereserveerd": "Adressen onder /admin en /api kun je niet doorsturen.",
  "bron-extensie": "Adressen met een bestandsextensie (zoals .html of .pdf) kan de site niet doorsturen.",
  "bron-ander-domein": "Het oude adres moet op react2u.nl staan.",
  "bron-te-lang": "Dat adres is te lang.",
  "bron-sterretje": "Een * mag alleen aan het eind staan, als /oud-pad/* — dan gaat alles eronder mee.",
  "bron-bestaat": "Op dat adres staat een bestaande pagina — een doorverwijzing zou hem onbereikbaar maken.",
  "bron-vast": "Dat adres wordt al doorgestuurd door de vaste lijst van de oude site.",
  "bron-dubbel": "Voor dat adres bestaat al een doorverwijzing.",
  "doel-leeg": "Vul in waar het naartoe moet.",
  "doel-geen-https": "Een adres op een andere site moet met https:// beginnen.",
  "doel-ongeldig": "Dat is geen geldig adres.",
  zelfde: "Het oude en het nieuwe adres zijn hetzelfde.",
  lus: "Dat zou een lus maken: het nieuwe adres stuurt zelf weer terug.",
  migratie: "Doorverwijzingen staan nog niet aan: migratie 0007 moet eerst in Supabase worden uitgevoerd.",
  // Versies
  "versie-weg": "Die versie bestaat niet meer.",
  "pagina-eerst": "De pagina van dit blok is ook verwijderd — zet eerst de pagina terug.",
  terugzetten: "Terugzetten mislukt.",
  // Bedrijfsbezoek
  "bedrijf-weg": "Dat bedrijf staat niet (meer) in het bezoek van de afgelopen 90 dagen.",
  "migratie-0010": "Hiervoor moet migratie 0010 eerst in Supabase worden uitgevoerd.",
};

// Bij `?opgeslagen=<sleutel>` een specifiekere bevestiging dan de standaard.
const OK_TEKST: Record<string, string> = {
  notitie: "Notitie opgeslagen.",
  "mfa-hersteld": "Tweestapsverificatie gewist. Bij de volgende inlog stelt je collega een nieuwe telefoon in.",
  doorverwijzing: "Doorverwijzing staat — binnen een halve minuut overal actief.",
  verwijderd: "Verwijderd — terug te halen uit de prullenbak.",
  "definitief-weg": "Verwijderd.",
  teruggezet: "Teruggezet — de site is bijgewerkt.",
  definitief: "Verwijderd, cv's inbegrepen.",
  gelezen: "Gemarkeerd als gelezen.",
  "op-bellijst": "Op de bellijst gezet, met wat ze bekeken in de notitie.",
  "niet-volgen": "Niet meer volgen — nieuwe bezoeken worden zonder bedrijfsnaam opgeslagen.",
  "weer-volgen": "Wordt weer gevolgd.",
  vergeten: "Vergeten — de bedrijfsnaam is uit alle eerdere bezoeken gehaald.",
};

export default function Toast() {
  const params = useSearchParams();
  const ok = params.get("opgeslagen");
  const fout = params.get("fout");
  const key = ok || fout ? `${ok ?? ""}|${fout ?? ""}` : null;

  // De melding wordt overgenomen zodra hij in de URL verschijnt, en daarna
  // haalt het effect hieronder hem uit de URL. Zo werkt een tweede keer opslaan
  // op hetzelfde scherm ook: eerder bleef ?opgeslagen=1 staan, gaf de volgende
  // opslag precies dezelfde URL, en verscheen er geen bevestiging meer. En een
  // herlaadde pagina meldt niet opnieuw "opgeslagen".
  // Afgeleid tijdens het renderen in plaats van in een effect: dat scheelt een
  // render en het flikkeren bij terugkomen op dezelfde pagina.
  const [seen, setSeen] = useState<string | null>(null);
  const [shown, setShown] = useState<{ isOk: boolean; text: string; n: number } | null>(null);
  if (key !== seen) {
    setSeen(key);
    if (key) {
      const isOk = !!ok && !fout;
      setShown({
        isOk,
        text: isOk ? OK_TEKST[ok || ""] || "Opgeslagen — de site is bijgewerkt." : FOUT_TEKST[fout || ""] || "Er ging iets mis.",
        n: (shown?.n ?? 0) + 1,
      });
    }
  }

  useEffect(() => {
    if (!key) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("opgeslagen");
    url.searchParams.delete("fout");
    // `null` als state, niet history.state: Next herkent zijn eigen state en
    // werkt dan useSearchParams niet bij, waardoor de volgende opslag weer naar
    // dezelfde URL ging en de melding uitbleef.
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [key]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 3800);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  return (
    <div key={shown.n} role="status" className="pointer-events-none fixed bottom-6 right-6 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-xl ${shown.isOk ? "bg-[#0e9f8a]" : "bg-[#e0356b]"}`}>
        {shown.isOk ? <LuCircleCheck className="text-lg" /> : <LuCircleAlert className="text-lg" />}
        {shown.text}
      </div>
    </div>
  );
}
