import type { Vacancy } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-black/[0.06] px-6 py-6 last:border-0">
      <h2 className="mb-4 font-heading text-[15px] font-bold text-[#312e82]">{title}</h2>
      {children}
    </div>
  );
}

export default function VacancyFields({ v }: { v?: Vacancy | null }) {
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

      <Section title="Inhoud">
        <div className="space-y-4">
          <div>
            <label className="alabel">Korte intro (1-2 zinnen, ook zichtbaar in het overzicht)</label>
            <textarea className="ainput" name="intro" rows={2} defaultValue={v?.intro || ""} />
          </div>
          <div>
            <label className="alabel">Omschrijving — &quot;### &quot; voor tussenkoppen, &quot;- &quot; voor bullets, **vet**</label>
            <textarea className="ainput font-mono text-[13.5px] leading-relaxed" name="description_md" rows={16} defaultValue={v?.description_md || ""} />
          </div>
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
