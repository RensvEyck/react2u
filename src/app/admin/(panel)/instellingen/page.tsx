import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { saveContactSettings, saveDocumentsSettings } from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { FOOTER_DOCS_FALLBACK, FOOTER_DOC_LABELS, type FooterDocs } from "@/lib/nav";

const FIELDS: { name: keyof ContactInfo; label: string }[] = [
  { name: "phoneDisplay", label: "Telefoonnummer (weergave)" },
  { name: "phone", label: "Telefoonnummer (tel:-links, zonder spaties)" },
  { name: "email", label: "E-mailadres" },
  { name: "addressLine1", label: "Adresregel 1" },
  { name: "addressLine2", label: "Adresregel 2" },
  { name: "kvk", label: "KVK-nummer" },
  { name: "btw", label: "BTW-nummer" },
  { name: "iban", label: "IBAN" },
];

export default async function SettingsAdmin() {
  const { sb } = await requireAdmin();
  const [{ data }, { data: docsData }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "documents").maybeSingle(),
  ]);
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  const docs = { ...FOOTER_DOCS_FALLBACK, ...((docsData?.value as Partial<FooterDocs>) || {}) };
  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Instellingen</h1>
        <p className="text-[14.5px] text-black/50">Deze gegevens worden site-breed gebruikt in de header en footer.</p>
      </div>

      <form action={saveContactSettings} className="acard p-6">
        <h2 className="mb-4 font-heading text-[16px] font-bold text-[#312e82]">Contactgegevens</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="alabel">{f.label}</label>
              <input className="ainput" name={f.name} defaultValue={contact[f.name]} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveDocumentsSettings} className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Documenten (footer)</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Nieuw PDF? Upload het via <Link href="/admin/media" className="font-semibold text-[#e75387] hover:underline">Media</Link> en plak de URL hier.
        </p>
        <div className="space-y-4">
          {FOOTER_DOC_LABELS.map((d) => (
            <div key={d.key}>
              <label className="alabel">{d.label}</label>
              <input className="ainput" name={d.key} defaultValue={docs[d.key]} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}
