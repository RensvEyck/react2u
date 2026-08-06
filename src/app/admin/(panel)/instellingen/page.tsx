import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { saveContactSettings, saveDocumentsSettings, saveCertificatesSettings } from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import ListEditor from "@/components/admin/ListEditor";

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
  const { sb } = await requirePerm("instellingen");
  const [{ data }, { data: docsData }, { data: certsData }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "documents").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "certificates").maybeSingle(),
  ]);
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  const docs = normalizeDocs(docsData?.value);
  const certificates = normalizeCertificates(certsData?.value);
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
          Verschijnen als links onderaan elke pagina. Nieuw PDF? Upload het via{" "}
          <Link href="/admin/media" className="font-semibold text-[#e75387] hover:underline">Media</Link> en kies de URL hier.
        </p>
        <ListEditor
          initial={docs}
          fields={[
            { name: "label", label: "Naam", placeholder: "Algemene voorwaarden" },
            { name: "href", label: "Link naar het document", placeholder: "https://…/document.pdf", media: true },
          ]}
          addLabel="Document toevoegen"
          emptyLabel="Nog geen documenten."
        />
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveCertificatesSettings} className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Certificaten &amp; keurmerken (footer)</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Logo&apos;s die als rij onderaan elke pagina staan. Upload het logo eerst via{" "}
          <Link href="/admin/media" className="font-semibold text-[#e75387] hover:underline">Media</Link>.
          Een link is optioneel — zonder link toont het logo zich zonder doorklik.
        </p>
        <ListEditor
          initial={certificates}
          fields={[
            { name: "image", label: "Logo", placeholder: "https://…/logo.png", media: true, preview: true },
            { name: "alt", label: "Omschrijving (voor schermlezers)", placeholder: "ISO 9001 gecertificeerd" },
            { name: "href", label: "Link (optioneel)", placeholder: "https://…" },
          ]}
          addLabel="Certificaat toevoegen"
          emptyLabel="Nog geen certificaten."
        />
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}
