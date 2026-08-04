import type { Vacancy } from "@/lib/types";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

export default function VacancyFields({ v }: { v?: Vacancy | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-black/60">Functietitel *</span>
        <input className={input} name="title" defaultValue={v?.title || ""} required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">URL-slug * (bijv. casemanager-verzuim-eindhoven)</span>
        <input className={input} name="slug" defaultValue={v?.slug || ""} required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Locatie</span>
        <input className={input} name="location" defaultValue={v?.location || "Eindhoven"} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Dienstverband</span>
        <select className={input} name="employment_type" defaultValue={v?.employment_type || "FULL_TIME"}>
          <option value="FULL_TIME">Fulltime</option>
          <option value="PART_TIME">Parttime</option>
          <option value="FULL_TIME,PART_TIME">Fulltime of parttime</option>
          <option value="TEMPORARY">Tijdelijk</option>
          <option value="INTERN">Stage</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Uren (bijv. 32-40 uur)</span>
        <input className={input} name="hours" defaultValue={v?.hours || ""} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Salaris (optioneel, bijv. €3.500 - €4.500 p/m)</span>
        <input className={input} name="salary" defaultValue={v?.salary || ""} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Sluitingsdatum (voor Google for Jobs)</span>
        <input className={input} name="valid_through" type="date" defaultValue={v?.valid_through || ""} />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-black/60">Korte intro (1-2 zinnen, ook zichtbaar in het overzicht)</span>
        <textarea className={input} name="intro" rows={2} defaultValue={v?.intro || ""} />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-black/60">
          Omschrijving — gebruik &quot;### &quot; voor tussenkoppen, &quot;- &quot; voor bullets, **vet**
        </span>
        <textarea className={input} name="description_md" rows={14} defaultValue={v?.description_md || ""} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">SEO-titel</span>
        <input className={input} name="seo_title" defaultValue={v?.seo_title || ""} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">SEO-omschrijving</span>
        <input className={input} name="seo_description" defaultValue={v?.seo_description || ""} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/60">Status</span>
        <select className={input} name="status" defaultValue={v?.status || "draft"}>
          <option value="draft">Concept (niet zichtbaar)</option>
          <option value="published">Gepubliceerd (live)</option>
          <option value="closed">Gesloten</option>
        </select>
      </label>
    </div>
  );
}
