import { BODY, BREED, Eyebrow, kop, LAV, NAVY, PINK } from "@/components/blocks/Gedeeld";

/*
 * De bouwstenen van de evaluatiepagina die de serverpagina (EvaluatiePagina.tsx)
 * en het formulier in de browser (EvaluatieFormulier.tsx) delen. Dezelfde
 * maten als de onboarding (OnboardingDelen.tsx), maar zonder de lettertypen
 * en beelden van de site, zodat het formulier ze ook in de browser kan laden.
 */

export const MUTE = "#6B6985";
export const GROEN = "#0A7A4B";
export const ROOD = "#B42318";

export const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
export const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP} disabled:opacity-60`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
  wit: `hv-btn border-[1.5px] border-white bg-white text-[#322E83] ${KNOP}`,
};

/** De onderdelen van de evaluatie, in de volgorde van het document, met het anker op de pagina. */
export const ONDERDELEN = [
  { id: "checklist", label: "Checklist", eyebrow: "Deel 1 · Checklist", titel: "Is dit bij jullie geregeld?", tekst: "Negen punten over arbo en verzuim, uit het formulier van onze accountmanager. Kies per punt: geregeld, nog niet, of niet van toepassing. Een toelichting is welkom, maar niet verplicht." },
  { id: "dienstverlening", label: "Dienstverlening", eyebrow: "Deel 2 · Onze dienstverlening", titel: "Hoe gaat het, en wat heb je komend jaar nodig?", tekst: "Hier mag alles: wat goed ging, wat beter kan, en waar je komend jaar aandacht voor wilt. Kort of lang, in je eigen woorden." },
  { id: "afspraken", label: "Afspraken", eyebrow: "Deel 3 · Afspraken", titel: "Wat spreken we af?", tekst: "Afspraken die je nu al wilt vastleggen, en wanneer we elkaar weer zien. Wij vullen dit na ons gesprek aan." },
  { id: "acties", label: "Acties", eyebrow: "Deel 4 · Acties", titel: "Wie pakt wat op?", tekst: "Per actie wie hem oppakt en wat de stand is. Mag leeg blijven; dan vullen we het samen in." },
] as const;

export type OnderdeelId = (typeof ONDERDELEN)[number]["id"];

/** Een band van rand tot rand, wit of in de lila tint, met de maten van de site. */
export function Band({ id, tint, label, children }: { id: string; tint: boolean; label: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-[96px]" style={{ background: tint ? LAV : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-14 md:py-[96px]`}>{children}</div>
    </section>
  );
}

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
export function SectieKop({ eyebrow, titel, tekst, kleur = PINK, licht = false }: { eyebrow: string; titel: string; tekst?: React.ReactNode; kleur?: string; licht?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6" data-reveal>
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={licht ? "rgba(255,255,255,0.85)" : kleur}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(30px, 4vw, 44px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: licht ? "rgba(255,255,255,0.8)" : BODY }}>{tekst}</div>}
    </div>
  );
}

export function Label({ children, kleur = MUTE }: { children: React.ReactNode; kleur?: string }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: kleur }}>{children}</span>;
}

export const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
export const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
export const initialen = (naam: string | null) =>
  (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";
