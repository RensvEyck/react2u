import type { Post } from "@/lib/types";
import ImageField from "./ImageField";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-black/[0.06] px-6 py-6 last:border-0">
      <h2 className="mb-4 font-heading text-[15px] font-bold text-[#312e82]">{title}</h2>
      {children}
    </div>
  );
}

export default function PostFields({ p }: { p?: Post | null }) {
  return (
    <>
      <Section title="Basis">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="alabel">Titel *</label>
            <input className="ainput" name="title" defaultValue={p?.title || ""} required />
          </div>
          <div>
            <label className="alabel">URL-slug * (bijv. verzuim-voorkomen-in-5-stappen)</label>
            <input className="ainput" name="slug" defaultValue={p?.slug || ""} required />
          </div>
          <div>
            <label className="alabel">Auteur</label>
            <input className="ainput" name="author" defaultValue={p?.author || ""} placeholder="React2u" />
          </div>
          <div className="md:col-span-2">
            <ImageField
              name="cover_image"
              label="Uitgelichte afbeelding (bovenaan het artikel én in het overzicht)"
              defaultValue={p?.cover_image || ""}
              placeholder="https://…/afbeelding.jpg"
            />
          </div>
        </div>
      </Section>

      <Section title="Inhoud">
        <div className="space-y-4">
          <div>
            <label className="alabel">Samenvatting (1-2 zinnen — zichtbaar in het overzicht en in Google)</label>
            <textarea className="ainput" name="excerpt" rows={2} defaultValue={p?.excerpt || ""} />
          </div>
          <div>
            <label className="alabel">Artikel — &quot;### &quot; voor tussenkoppen, &quot;- &quot; voor bullets, **vet**</label>
            <textarea
              className="ainput font-mono text-[13.5px] leading-relaxed"
              name="body_md"
              rows={20}
              defaultValue={p?.body_md || ""}
            />
          </div>
        </div>
      </Section>

      <Section title="SEO">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="alabel">SEO-titel (leeg = de titel hierboven)</label>
              <input className="ainput" name="seo_title" defaultValue={p?.seo_title || ""} />
            </div>
            <div>
              <label className="alabel">SEO-omschrijving (leeg = de samenvatting)</label>
              <input className="ainput" name="seo_description" defaultValue={p?.seo_description || ""} />
            </div>
          </div>
          <ImageField
            name="og_image"
            label="Deelafbeelding (leeg = de uitgelichte afbeelding)"
            defaultValue={p?.og_image || ""}
          />
        </div>
      </Section>

      <Section title="Status">
        <select className="ainput max-w-[320px]" name="status" defaultValue={p?.status || "draft"}>
          <option value="draft">Concept (niet zichtbaar)</option>
          <option value="published">Gepubliceerd (live)</option>
        </select>
        <p className="mt-2 text-[13px] text-black/45">
          De publicatiedatum wordt automatisch gezet zodra je voor het eerst publiceert.
        </p>
      </Section>
    </>
  );
}
