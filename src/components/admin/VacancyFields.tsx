import type { Vacancy } from "@/lib/types";

const SECTIES: { key: "doen" | "samen" | "leuk" | "vragen" | "bieden" | "eerlijk" | "faq"; label: string; hulp: string; rows: number }[] = [
  { key: "doen", label: "Wat ga je doen", hulp: "Een korte alinea over de rol, daarna 4 tot 6 bullets met concrete taken.", rows: 8 },
  { key: "samen", label: "Met wie werk je samen", hulp: "Het team en de disciplines om je heen. Liefst met aantallen (bijv. een team van 6 casemanagers en 2 bedrijfsartsen).", rows: 4 },
  { key: "leuk", label: "Wat is echt leuk aan deze baan", hulp: "3 tot 5 bullets: wat maakt deze baan bij React2u anders dan elders? Concreet, geen clichés.", rows: 5 },
  { key: "vragen", label: "Wat wij vragen", hulp: "Harde eisen als bullets. Daarna eventueel **Mooi meegenomen:** met pre's.", rows: 8 },
  { key: "bieden", label: "Wat wij bieden (aanvulling)", hulp: "Bij loondienst staat het vaste pakket er al automatisch boven; zet hier alleen wat specifiek is voor deze functie. Bij ZZP: het hele aanbod (tarief, duur, vrijheid).", rows: 5 },
  { key: "eerlijk", label: "Eerlijk is eerlijk", hulp: "Eén of twee zinnen over wat minder leuk is aan de rol. Maakt de rest geloofwaardig.", rows: 3 },
  { key: "faq", label: "Veelgestelde vragen", hulp: "Per vraag: eerste regel **Vraag?**, daaronder het antwoord. Lege regel tussen de vragen.", rows: 8 },
];

function Opbouw({ v, taal, disabled }: { v?: Vacancy | null; taal: "nl" | "en"; disabled?: boolean }) {
  const waarden = v?.opbouw?.[taal] || {};
  return (
    <div className="space-y-4">
      {SECTIES.map((s) => (
        <div key={s.key}>
          <label className="alabel">{s.label}{taal === "en" ? " (Engels)" : ""}</label>
          {taal === "nl" && <p className="mb-1.5 text-[12.5px] text-black/45">{s.hulp}</p>}
          <textarea className="ainput font-mono text-[13.5px] leading-relaxed" name={`opbouw_${taal}_${s.key}`} rows={s.rows}
            defaultValue={waarden[s.key] || ""} disabled={disabled} lang={taal} />
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-black/[0.06] px-6 py-6 last:border-0">
      <h2 className="mb-4 font-heading text-[15px] font-bold text-[#312e82]">{title}</h2>
      {children}
    </div>
  );
}

/**
 * `engels` zegt of de Engelse kolommen (migratie 0015) in de database bestaan.
 * Zonder die kolommen zijn de velden uitgeschakeld (en gaan ze niet mee in het
 * formulier), met de uitleg erbij; anders zou opslaan mislukken.
 */
export default function VacancyFields({ v, engels = true }: { v?: Vacancy | null; engels?: boolean }) {
  return (
    <>
      <Section title="Basis">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="alabel">Functietitel *</label>
            <input className="ainput" name="title" defaultValue={v?.title || ""} required />
          </div>
          <div>
            <label className="alabel">URL-slug * (bijv. casemanager-verzuim-eindhoven)</label>
            <input className="ainput" name="slug" defaultValue={v?.slug || ""} required />
          </div>
          <div>
            <label className="alabel">Locatie</label>
            <input className="ainput" name="location" defaultValue={v?.location || "Eindhoven"} />
          </div>
          <div>
            <label className="alabel">Dienstverband</label>
            <select className="ainput" name="employment_type" defaultValue={v?.employment_type || "FULL_TIME"}>
              <option value="FULL_TIME">Fulltime</option>
              <option value="PART_TIME">Parttime</option>
              <option value="FULL_TIME,PART_TIME">Fulltime of parttime</option>
              <option value="CONTRACTOR">ZZP / freelance opdracht</option>
              <option value="TEMPORARY">Tijdelijk</option>
              <option value="INTERN">Stage</option>
            </select>
          </div>
          <div>
            <label className="alabel">Uren (bijv. 32-40 uur)</label>
            <input className="ainput" name="hours" defaultValue={v?.hours || ""} />
          </div>
          <div>
            <label className="alabel">Salaris (optioneel)</label>
            <input className="ainput" name="salary" defaultValue={v?.salary || ""} placeholder="bijv. €3.500 - €4.500 p/m" />
          </div>
          <div>
            <label className="alabel">Sluitingsdatum (voor Google for Jobs)</label>
            <input className="ainput" name="valid_through" type="date" defaultValue={v?.valid_through || ""} />
          </div>
        </div>
      </Section>

      <Section title="In het kort">
        <p className="mb-4 text-[13.5px] text-black/50">Verschijnt bovenaan de vacature naast de titel. Leeg laten = niet tonen.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="alabel">Vakgebied (bijv. Casemanagement)</label>
            <input className="ainput" name="vakgebied" defaultValue={v?.vakgebied || ""} />
          </div>
          <div>
            <label className="alabel">Contract (bijv. Vast contract)</label>
            <input className="ainput" name="contractvorm" defaultValue={v?.contractvorm || ""} />
          </div>
          <div>
            <label className="alabel">Ervaringsniveau (Starter, Medior, Senior)</label>
            <input className="ainput" name="ervaringsniveau" defaultValue={v?.ervaringsniveau || ""} />
          </div>
          <div>
            <label className="alabel">Opleiding (bijv. HBO)</label>
            <input className="ainput" name="opleidingsniveau" defaultValue={v?.opleidingsniveau || ""} />
          </div>
        </div>
      </Section>

      <Section title="Inhoud">
        <div className="space-y-4">
          <div>
            <label className="alabel">Korte intro (1-2 zinnen, ook zichtbaar in het overzicht)</label>
            <textarea className="ainput" name="intro" rows={2} defaultValue={v?.intro || ""} />
          </div>
          <p className="text-[13.5px] text-black/50">
            Opmaak: &quot;- &quot; voor bullets, **vet**. De vaste blokken (arbeidsvoorwaarden, Werken bij React2u, procedure en
            contact) staan automatisch op de pagina.
          </p>
          <Opbouw v={v} taal="nl" />
          <details className="rounded-xl bg-black/[0.03] px-4 py-3">
            <summary className="cursor-pointer text-[13.5px] font-semibold text-black/60">Oude omschrijving (alleen gebruikt als de secties hierboven leeg zijn)</summary>
            <textarea className="ainput mt-3 font-mono text-[13.5px] leading-relaxed" name="description_md" rows={10} defaultValue={v?.description_md || ""} />
          </details>
        </div>
      </Section>

      <Section title="Engelse versie (optioneel)">
        <p className="mb-4 text-[13.5px] text-black/50">
          Voor de Engelse site (/en/jobs). Laat je deze velden leeg, dan toont de Engelse site de Nederlandse vacature
          met bovenaan &quot;This vacancy is in Dutch&quot;. Locatie, uren en salaris zijn in beide talen hetzelfde.
        </p>
        {!engels && (
          <p className="mb-4 rounded-xl bg-[#fff8ec] px-4 py-3 text-[13.5px] text-[#7a4a00]">
            De Engelse velden bestaan nog niet in de database. Draai eerst migratie <code>0015_engels.sql</code>; tot die
            tijd zijn deze velden uitgeschakeld.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="alabel">Functietitel (Engels)</label>
            <input className="ainput" name="title_en" defaultValue={v?.title_en || ""} disabled={!engels} lang="en" />
          </div>
          <div>
            <label className="alabel">Korte intro (Engels)</label>
            <textarea className="ainput" name="intro_en" rows={2} defaultValue={v?.intro_en || ""} disabled={!engels} lang="en" />
          </div>
          <Opbouw v={v} taal="en" disabled={!engels} />
          <details className="rounded-xl bg-black/[0.03] px-4 py-3">
            <summary className="cursor-pointer text-[13.5px] font-semibold text-black/60">Oude omschrijving (Engels)</summary>
            <textarea className="ainput mt-3 font-mono text-[13.5px] leading-relaxed" name="description_en_md" rows={8} defaultValue={v?.description_en_md || ""} disabled={!engels} lang="en" />
          </details>
        </div>
      </Section>

      <Section title="SEO">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="alabel">SEO-titel</label>
            <input className="ainput" name="seo_title" defaultValue={v?.seo_title || ""} />
          </div>
          <div>
            <label className="alabel">SEO-omschrijving</label>
            <input className="ainput" name="seo_description" defaultValue={v?.seo_description || ""} />
          </div>
        </div>
      </Section>

      <Section title="Status">
        <select className="ainput max-w-[320px]" name="status" defaultValue={v?.status || "draft"}>
          <option value="draft">Concept (niet zichtbaar)</option>
          <option value="published">Gepubliceerd (live)</option>
          <option value="closed">Gesloten</option>
        </select>
      </Section>
    </>
  );
}
