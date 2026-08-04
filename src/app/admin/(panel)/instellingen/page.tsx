import { requireAdmin } from "@/lib/admin";
import { saveContactSettings, saveDocumentsSettings } from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { FOOTER_DOCS_FALLBACK, FOOTER_DOC_LABELS, type FooterDocs } from "@/lib/nav";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

const FIELDS: { name: keyof ContactInfo; label: string }[] = [
  { name: "phoneDisplay", label: "Telefoonnummer (weergave)" },
  { name: "phone", label: "Telefoonnummer (voor tel:-links, zonder spaties)" },
  { name: "email", label: "E-mailadres" },
  { name: "addressLine1", label: "Adresregel 1" },
  { name: "addressLine2", label: "Adresregel 2" },
  { name: "kvk", label: "KVK-nummer" },
  { name: "btw", label: "BTW-nummer" },
  { name: "iban", label: "IBAN" },
];

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const { opgeslagen } = await searchParams;
  const { sb } = await requireAdmin();
  const [{ data }, { data: docsData }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "documents").maybeSingle(),
  ]);
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  const docs = { ...FOOTER_DOCS_FALLBACK, ...((docsData?.value as Partial<FooterDocs>) || {}) };
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Instellingen</h1>
      {opgeslagen && (
        <div className="mb-6 rounded-xl bg-[#00aa98]/10 border border-[#00aa98]/30 px-4 py-3 text-[#00806f]">
          Instellingen opgeslagen — de site is bijgewerkt.
        </div>
      )}
      <form action={saveContactSettings} className="rounded-2xl bg-white p-6 shadow-sm max-w-[640px]">
        <h2 className="text-xl font-bold text-[#312e82] mb-4">Contactgegevens (header &amp; footer)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1 block text-sm font-medium text-black/60">{f.label}</span>
              <input className={input} name={f.name} defaultValue={contact[f.name]} />
            </label>
          ))}
        </div>
        <button className="btn mt-6 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>

      <form action={saveDocumentsSettings} className="mt-8 rounded-2xl bg-white p-6 shadow-sm max-w-[640px]">
        <h2 className="text-xl font-bold text-[#312e82] mb-1">Documenten (footer)</h2>
        <p className="mb-4 text-sm text-black/50">
          Upload een nieuw PDF via <a href="/admin/media" className="text-[#e75387] hover:underline">Media</a> en plak de URL hier.
        </p>
        <div className="space-y-4">
          {FOOTER_DOC_LABELS.map((d) => (
            <label key={d.key} className="block">
              <span className="mb-1 block text-sm font-medium text-black/60">{d.label}</span>
              <input className={input} name={d.key} defaultValue={docs[d.key]} />
            </label>
          ))}
        </div>
        <button className="btn mt-6 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>
    </div>
  );
}
